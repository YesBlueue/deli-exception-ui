-- Extends the existing one-company schema; bootstrap schema is tracked separately.
create schema if not exists exception_private;
revoke all on schema exception_private from public, anon;
grant usage on schema exception_private to authenticated;
alter table public.sellers add column if not exists external_seller_id text unique;
alter table public.delivery_jobs add column if not exists external_delivery_id text;
alter table public.delivery_jobs add column if not exists provenance text not null default 'UNVERIFIED' check(provenance in ('DEMO','COMPANY_SYSTEM','UNVERIFIED'));
alter table public.delivery_jobs add column if not exists source_system text not null default 'unconfigured';
alter table public.delivery_jobs add column if not exists source_updated_at timestamptz;
alter table public.delivery_jobs add column if not exists received_at timestamptz not null default now();
alter table public.delivery_jobs add column if not exists confirmation_details text;
create unique index if not exists delivery_source_id on public.delivery_jobs(source_system,external_delivery_id);
alter table public.delivery_events add column if not exists processing_result text not null default 'APPLIED' check(processing_result in ('APPLIED','OUT_OF_ORDER','MISSING_TIME'));
create unique index if not exists source_event_identity on public.delivery_events(source,source_event_id) where source_event_id is not null;
alter table public.complaints add column if not exists exception_id uuid references public.delivery_exceptions;
alter table public.complaints add column if not exists refund_requested boolean not null default false;
alter table public.complaints add column if not exists needs_review boolean not null default false;
alter table public.complaints add column if not exists rule_version text not null default 'reports-v1';
alter table public.complaints add column if not exists original_classification jsonb not null default '{}';
alter table public.complaints drop constraint if exists complaints_category_check;
alter table public.complaints add constraint complaints_category_check check(category in ('DELAY','REFUND','DAMAGE','MISSING_ITEM','WRONG_ITEM','PACKAGE_MISSING','OTHER'));
alter table public.delivery_exceptions drop constraint if exists delivery_exceptions_status_check;
update public.delivery_exceptions set status='IN_PROGRESS' where status='AWAITING_CARRIER';
alter table public.delivery_exceptions add constraint delivery_exceptions_status_check check(status in ('NEW','ACTION_REQUIRED','AWAITING_CUSTOMER','AWAITING_SELLER','IN_PROGRESS','RESOLVED','REOPENED'));
alter table public.seller_portal_updates drop constraint if exists seller_portal_updates_update_type_check;
alter table public.seller_portal_updates add constraint seller_portal_updates_update_type_check check(update_type in ('REFUND_REPORT','EXCEPTION_UPDATE'));
create unique index if not exists refund_handoff_once on public.seller_portal_updates(complaint_id) where update_type='REFUND_REPORT';
create table public.exception_notes(id uuid primary key default gen_random_uuid(),exception_id uuid not null references public.delivery_exceptions on delete cascade,author_user_id uuid not null references public.staff_profiles,body text not null check(length(body) between 1 and 4000),created_at timestamptz not null default now());
create table public.report_history(id uuid primary key default gen_random_uuid(),complaint_id uuid not null references public.complaints on delete cascade,status text not null,description text not null,created_at timestamptz not null default now());
create table public.portal_reads(user_id uuid not null references auth.users on delete cascade,complaint_id uuid not null references public.complaints on delete cascade,seen_at timestamptz not null default now(),primary key(user_id,complaint_id));
create table public.apology_drafts(id uuid primary key default gen_random_uuid(),complaint_id uuid not null references public.complaints,author_user_id uuid not null references public.staff_profiles,body text not null,model text not null,created_at timestamptz not null default now());
create table exception_private.settings(singleton boolean primary key default true check(singleton),demo_enabled boolean not null default false);
insert into exception_private.settings values(true,true);
create sequence exception_private.report_reference;
create index if not exists access_by_delivery on public.customer_delivery_access(delivery_job_id,customer_user_id);
create index if not exists reports_by_customer on public.complaints(customer_user_id,submitted_at desc);
create index if not exists reports_by_exception on public.complaints(exception_id);
create index if not exists exceptions_by_delivery on public.delivery_exceptions(delivery_job_id,status);
create index if not exists events_by_delivery on public.delivery_events(delivery_job_id,event_at desc);
create index if not exists seller_updates_by_seller on public.seller_portal_updates(seller_id,created_at desc);
create index if not exists replies_by_report on public.complaint_replies(complaint_id,created_at);

create function exception_private.is_staff() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.staff_profiles where user_id=(select auth.uid()) and is_active and role in ('ADMIN','OPERATIONS'));
$$;
create function exception_private.owns_delivery(d uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.customer_delivery_access where delivery_job_id=d and customer_user_id=(select auth.uid()));
$$;
create function exception_private.is_seller(s uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.seller_users where seller_id=s and user_id=(select auth.uid()) and is_active);
$$;

-- Direct mutations are revoked. Guarded transactions below enforce all mutations.
do $$ declare t text; pol record; begin
 foreach t in array array['staff_profiles','seller_users','customer_profiles','sellers','delivery_jobs','customer_delivery_access','delivery_events','delivery_exceptions','complaints','complaint_replies','complaint_attachments','seller_portal_updates','activity_logs','exception_notes','report_history','portal_reads','apology_drafts'] loop
   execute format('alter table public.%I enable row level security',t);
   for pol in select policyname from pg_policies where schemaname='public' and tablename=t loop execute format('drop policy %I on public.%I',pol.policyname,t); end loop;
   execute format('revoke all on public.%I from anon, authenticated',t);
   execute format('grant select on public.%I to authenticated',t);
 end loop;
end $$;

-- Authenticate inside the privileged implementation; never trust caller-supplied identity.
create function exception_private.portal_command(command text, input jsonb default '{}') returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); staff boolean; d public.delivery_jobs; r public.complaints; ex public.delivery_exceptions;
 cls jsonb; rid uuid; eid uuid; sid uuid; st text; txt text; eventid uuid; occurred timestamptz; et text; result text;
 i integer; sale record; order_uuid uuid; sample_status text; category text;
begin
 if uid is null then raise exception 'Sign in required' using errcode='42501'; end if;
 staff:=exception_private.is_staff();
 if command='provision_demo' then
  if not (select demo_enabled from exception_private.settings where singleton) then raise exception 'Demo provisioning is disabled'; end if;
  if not exists(select 1 from auth.identities where user_id=uid and provider='google') then raise exception 'Use Google sign-in to provision demo orders' using errcode='42501'; end if;
  perform pg_advisory_xact_lock(hashtextextended(uid::text,0));
  insert into public.customer_profiles(user_id,full_name,email) select id,coalesce(raw_user_meta_data->>'full_name','Customer'),coalesce(email,'') from auth.users where id=uid on conflict(user_id) do nothing;
  if exists(select 1 from public.customer_delivery_access where customer_user_id=uid) then return jsonb_build_object('ok',true); end if;
  i:=0;
  for sale in select id,name from public.sellers where external_seller_id in ('demo-lotus','demo-river') order by external_seller_id loop
   for sample_status in select unnest(array['IN_TRANSIT','DELIVERED']) loop
    i:=i+1; order_uuid:=gen_random_uuid();
    insert into public.delivery_jobs(id,seller_id,seller_order_reference,tracking_number,recipient_name,recipient_email,delivery_address,status,external_delivery_id,provenance,source_system,source_updated_at,confirmation_details)
    select order_uuid,sale.id,'DEMO-'||lpad(i::text,3,'0'),'DEMO-'||order_uuid::text,coalesce(raw_user_meta_data->>'full_name','Customer'),email,'Demo recipient address',sample_status,'demo:'||order_uuid::text,'DEMO','hackathon-simulator',now()-interval '30 hours',case when sample_status='DELIVERED' then 'Demo confirmation: handed to recipient at reception.' else null end from auth.users where id=uid;
    insert into public.customer_delivery_access(customer_user_id,delivery_job_id) values(uid,order_uuid);
    insert into public.delivery_events(delivery_job_id,event_code,description,source_event_id,source,event_at) values(order_uuid,sample_status,'Fictional source-system context','seed:'||order_uuid::text,'SIMULATOR',now()-interval '30 hours');
   end loop;
  end loop;
  return jsonb_build_object('ok',true);
 end if;
 if command='submit_report' then
  select * into d from public.delivery_jobs where id=(input->>'deliveryId')::uuid for update;
  if not found or not exception_private.owns_delivery(d.id) then raise exception 'Order access denied' using errcode='42501'; end if;
  txt:=trim(input->>'description'); if txt is null or length(txt)<10 or length(txt)>4000 then raise exception 'Describe the issue using 10 to 4000 characters'; end if;
  cls:=exception_private.classify_report(txt); category:=cls->>'category';
  if category in ('DAMAGE','MISSING_ITEM','WRONG_ITEM') and d.status<>'DELIVERED' then raise exception 'This issue requires receipt of the order. Describe conflicting delivery information for manual review.'; end if;
  if d.status='CANCELLED' then raise exception 'Cancelled delivery context requires staff assistance'; end if;
  if d.source_updated_at is null or d.source_updated_at<now()-interval '48 hours' then cls:=cls||jsonb_build_object('needsReview',true,'reason',(cls->>'reason')||' Source context is missing or stale.'); end if;
  select id into eid from public.delivery_exceptions where delivery_job_id=d.id and exception_type=category and status<>'RESOLVED' order by detected_at limit 1;
  if eid is null then
   insert into public.delivery_exceptions(delivery_job_id,exception_type,priority,priority_reason) values(d.id,category,case when category in ('DAMAGE','PACKAGE_MISSING') then 'HIGH' else 'MEDIUM' end,'report-priority-v1: category '||category) returning id into eid;
  end if;
  rid:=gen_random_uuid();
  insert into public.complaints(id,delivery_job_id,customer_user_id,complaint_reference,customer_description,category,category_reason,exception_id,refund_requested,needs_review,rule_version,original_classification)
  values(rid,d.id,uid,'RPT-'||to_char(now(),'YYYY')||'-'||lpad(nextval('exception_private.report_reference')::text,6,'0'),txt,category,cls->>'reason',eid,(cls->>'refund')::boolean,(cls->>'needsReview')::boolean,'reports-v1',cls);
  insert into public.report_history(complaint_id,status,description) values(rid,'NEW','Report submitted and categorized using reports-v1.');
  if (cls->>'refund')::boolean then
   insert into public.seller_portal_updates(complaint_id,delivery_job_id,seller_id,update_type,title,body) values(rid,d.id,d.seller_id,'REFUND_REPORT','Refund information received','A customer requested refund review for order '||d.seller_order_reference||'. Issue category: '||category||'. Delivery findings are pending operations review. No refund has been approved or processed.');
  end if;
  insert into public.activity_logs(delivery_job_id,delivery_exception_id,complaint_id,actor_type,actor_user_id,action_type,description,metadata) values(d.id,eid,rid,'CUSTOMER',uid,'REPORT_CREATED','Report classified and routed',cls);
  return jsonb_build_object('ok',true,'reportId',rid,'exceptionId',eid,'classification',cls);
 end if;
 if command='seen' then
  select * into r from public.complaints where id=(input->>'reportId')::uuid;
  if not found or r.customer_user_id<>uid then raise exception 'Report access denied' using errcode='42501'; end if;
  insert into public.portal_reads values(uid,r.id,now()) on conflict(user_id,complaint_id) do update set seen_at=excluded.seen_at;
  return jsonb_build_object('ok',true);
 end if;
 if not staff then raise exception 'Operations access required' using errcode='42501'; end if;
 if command='ingest' then
  if not (select demo_enabled from exception_private.settings where singleton) then raise exception 'Simulator is disabled'; end if;
  select * into d from public.delivery_jobs where id=(input->>'deliveryId')::uuid for update;
  if not found or d.provenance<>'DEMO' then raise exception 'Simulator only accepts demo context'; end if;
  txt:=trim(input->>'sourceEventId'); if txt is null or length(txt)<1 or length(txt)>150 then raise exception 'Source event ID required'; end if;
  if exists(select 1 from public.delivery_events where source='SIMULATOR' and source_event_id=txt) then return jsonb_build_object('ok',true,'outcome','DUPLICATE'); end if;
  et:=input->>'eventCode'; if et is null or et not in ('DELAY','DAMAGE','PACKAGE_MISSING','IN_TRANSIT','DELIVERED') then raise exception 'Unsupported source event'; end if;
  occurred:=(input->>'occurredAt')::timestamptz;
  if occurred>now()+interval '5 minutes' then raise exception 'Future source time is unsupported'; end if;
  result:=case when occurred is null then 'MISSING_TIME' when occurred<=d.source_updated_at then 'OUT_OF_ORDER' else 'APPLIED' end;
  insert into public.delivery_events(delivery_job_id,event_code,description,source_event_id,source,event_at,processing_result) values(d.id,et,'Simulated update from the existing delivery system',txt,'SIMULATOR',occurred,result) returning id into eventid;
  if result='APPLIED' then
   update public.delivery_jobs set status=case when et in ('IN_TRANSIT','DELIVERED') then et else status end,source_updated_at=occurred,received_at=now() where id=d.id;
   if et in ('DELAY','DAMAGE','PACKAGE_MISSING') then
    select id into eid from public.delivery_exceptions where delivery_job_id=d.id and exception_type=et and status<>'RESOLVED' limit 1;
    if eid is null then insert into public.delivery_exceptions(delivery_job_id,trigger_event_id,exception_type,priority,priority_reason) values(d.id,eventid,et,case when et='DELAY' then 'MEDIUM' else 'HIGH' end,'source-priority-v1: relevant source exception') returning id into eid; end if;
   end if;
  end if;
  insert into public.activity_logs(delivery_job_id,delivery_exception_id,actor_type,actor_user_id,action_type,description) values(d.id,eid,'STAFF',uid,'SOURCE_UPDATE',result||': '||et);
  return jsonb_build_object('ok',true,'outcome',result);
 end if;
 if command in ('reply','report_status','correct_category','handoff','save_draft') then
  select * into r from public.complaints where id=(input->>'reportId')::uuid for update;
  if not found then raise exception 'Report not found'; end if;
  eid:=r.exception_id;
 else eid:=(input->>'exceptionId')::uuid; end if;
 select * into ex from public.delivery_exceptions where id=eid for update;
 if not found then raise exception 'Exception not found'; end if;
 select * into d from public.delivery_jobs where id=ex.delivery_job_id;
 txt:=trim(input->>'text');
 if command in ('note','reply','handoff','save_draft','report_status','exception_status','correct_category') and (txt is null or length(txt)<1 or length(txt)>4000) then raise exception 'A message or reason of 1 to 4000 characters is required'; end if;
 if command='note' then insert into public.exception_notes(exception_id,author_user_id,body) values(ex.id,uid,txt);
 elsif command='reply' then
  insert into public.complaint_replies(complaint_id,author_type,author_user_id,reply_type,body) values(r.id,'STAFF',uid,'GENERAL_UPDATE',txt);
  insert into public.report_history(complaint_id,status,description) values(r.id,r.status,'A staff reply was published in your portal.');
 elsif command='save_draft' then
  insert into public.apology_drafts(complaint_id,author_user_id,body,model) values(r.id,uid,txt,left(input->>'model',100));
 elsif command='report_status' then
  st:=input->>'status'; if st is null or st not in ('IN_REVIEW','WAITING_FOR_SELLER','RESOLVED') then raise exception 'Invalid report status'; end if;
  if st='RESOLVED' and not exists(select 1 from public.complaint_replies where complaint_id=r.id) then raise exception 'Publish a customer reply before resolving'; end if;
  update public.complaints set status=st,updated_at=now(),resolved_at=case when st='RESOLVED' then now() else null end where id=r.id;
  insert into public.report_history(complaint_id,status,description) values(r.id,st,'Report status changed to '||st||'.');
 elsif command='exception_status' then
  st:=input->>'status';
  if st is null or not (
    (ex.status in ('NEW','ACTION_REQUIRED','REOPENED') and st in ('IN_PROGRESS','AWAITING_CUSTOMER','AWAITING_SELLER','RESOLVED')) or
    (ex.status='IN_PROGRESS' and st in ('AWAITING_CUSTOMER','AWAITING_SELLER','RESOLVED')) or
    (ex.status in ('AWAITING_CUSTOMER','AWAITING_SELLER') and st in ('IN_PROGRESS','RESOLVED')) or
    (ex.status='RESOLVED' and st='REOPENED')) then raise exception 'Unsupported exception transition'; end if;
  update public.delivery_exceptions set status=st,updated_at=now(),resolved_at=case when st='RESOLVED' then now() else null end where id=ex.id;
 elsif command='assign' then
  sid:=nullif(input->>'assignee','')::uuid;
  if sid is not null and not exists(select 1 from public.staff_profiles where user_id=sid and is_active and role in ('ADMIN','OPERATIONS')) then raise exception 'Invalid operations assignee'; end if;
  update public.delivery_exceptions set assignee_user_id=sid,updated_at=now() where id=ex.id;
 elsif command='correct_category' then
  category:=input->>'category'; if category is null or category not in ('DELAY','DAMAGE','MISSING_ITEM','WRONG_ITEM','PACKAGE_MISSING','OTHER') then raise exception 'Unsupported category'; end if;
  update public.complaints set category=category,category_reason=txt,needs_review=false,updated_at=now() where id=r.id;
 elsif command='handoff' then
  if not r.refund_requested then raise exception 'This report has no refund request'; end if;
  insert into public.seller_portal_updates(complaint_id,delivery_job_id,seller_id,update_type,title,body) values(r.id,d.id,d.seller_id,'REFUND_REPORT','Delivery findings for refund review',txt)
  on conflict(complaint_id) where update_type='REFUND_REPORT' do update set body=excluded.body,title=excluded.title,created_at=now();
 else raise exception 'Unknown command'; end if;
 insert into public.activity_logs(delivery_job_id,delivery_exception_id,complaint_id,actor_type,actor_user_id,action_type,description,metadata) values(d.id,ex.id,r.id,'STAFF',uid,upper(command),case when command='save_draft' then 'Gemini apology draft saved; not published' else coalesce(txt,command) end,jsonb_build_object('status',input->>'status','category',input->>'category','assignee',input->>'assignee','previousCategory',r.category));
 return jsonb_build_object('ok',true);
end $$;
create policy staff_self on public.staff_profiles for select to authenticated using(user_id=(select auth.uid()) or exception_private.is_staff());
create policy seller_self on public.seller_users for select to authenticated using(user_id=(select auth.uid()));
create policy customer_self on public.customer_profiles for select to authenticated using(user_id=(select auth.uid()) or exception_private.is_staff());
create policy access_self on public.customer_delivery_access for select to authenticated using(customer_user_id=(select auth.uid()));
create policy seller_context on public.sellers for select to authenticated using(exception_private.is_staff() or exception_private.is_seller(id) or exists(select 1 from public.delivery_jobs d where d.seller_id=id and exception_private.owns_delivery(d.id)));
create policy order_context on public.delivery_jobs for select to authenticated using(exception_private.is_staff() or exception_private.is_seller(seller_id) or exception_private.owns_delivery(id));
create policy events_staff on public.delivery_events for select to authenticated using(exception_private.is_staff());
create policy exceptions_staff on public.delivery_exceptions for select to authenticated using(exception_private.is_staff());
create policy reports_owner_staff on public.complaints for select to authenticated using(customer_user_id=(select auth.uid()) or exception_private.is_staff());
create policy replies_owner_staff on public.complaint_replies for select to authenticated using(exception_private.is_staff() or exists(select 1 from public.complaints c where c.id=complaint_id and c.customer_user_id=(select auth.uid())));
create policy evidence_owner_staff on public.complaint_attachments for select to authenticated using(exception_private.is_staff() or exists(select 1 from public.complaints c where c.id=complaint_id and c.customer_user_id=(select auth.uid())));
create policy updates_seller_staff on public.seller_portal_updates for select to authenticated using(exception_private.is_staff() or exception_private.is_seller(seller_id));
create policy notes_staff on public.exception_notes for select to authenticated using(exception_private.is_staff());
create policy audit_staff on public.activity_logs for select to authenticated using(exception_private.is_staff());
create policy history_owner_staff on public.report_history for select to authenticated using(exception_private.is_staff() or exists(select 1 from public.complaints c where c.id=complaint_id and c.customer_user_id=(select auth.uid())));
create policy reads_self on public.portal_reads for select to authenticated using(user_id=(select auth.uid()));
create policy drafts_staff on public.apology_drafts for select to authenticated using(exception_private.is_staff());

create function exception_private.classify_report(description text) returns jsonb language plpgsql immutable set search_path='' as $$
declare s text:=lower(description); cats text[]:='{}'; category text; refund boolean; review boolean;
begin
 if s ~ '\m(delay|delayed|late|overdue)\M' then cats:=array_append(cats,'DELAY'); end if;
 if s ~ '\m(damage|damaged|broken|crushed|leaking)\M' then cats:=array_append(cats,'DAMAGE'); end if;
 if s ~ '(missing item|item missing|missing items|incomplete)' then cats:=array_append(cats,'MISSING_ITEM'); end if;
 if s ~ '(wrong item|incorrect item|different item)' then cats:=array_append(cats,'WRONG_ITEM'); end if;
 if s ~ '(not received|never arrived|package missing|parcel missing|not delivered)' then cats:=array_append(cats,'PACKAGE_MISSING'); end if;
 refund:=s ~ '\m(refund|reimburse|reimbursement)\M'; review:=cardinality(cats)<>1;
 category:=case when cardinality(cats)=1 then cats[1] else 'OTHER' end;
 return jsonb_build_object('category',category,'refund',refund,'needsReview',review,'version','reports-v1','reason',case when review then 'No single supported issue category; staff review required.' else 'Matched documented keyword rule for '||category||'.' end);
end $$;

create function public.portal_command(command text,input jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$ select exception_private.portal_command(command,input); $$;
create function exception_private.seller_exceptions() returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',e.id,'delivery_job_id',d.id,'order_reference',d.seller_order_reference,'exception_type',e.exception_type,'status',e.status,'detected_at',e.detected_at,'provenance',d.provenance)),'[]') from public.delivery_exceptions e join public.delivery_jobs d on d.id=e.delivery_job_id where auth.uid() is not null and exception_private.is_seller(d.seller_id);
$$;
create function public.seller_exception_context() returns jsonb language sql stable security invoker set search_path='' as $$ select exception_private.seller_exceptions(); $$;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('report-evidence','report-evidence',false,2097152,array['image/jpeg','image/png','image/webp']) on conflict(id) do nothing;
create policy evidence_upload on storage.objects for insert to authenticated with check(bucket_id='report-evidence' and (storage.foldername(name))[1]=(select auth.uid())::text and exists(select 1 from public.complaints c where c.id::text=(storage.foldername(name))[2] and c.customer_user_id=(select auth.uid())));
create policy evidence_download on storage.objects for select to authenticated using(bucket_id='report-evidence' and exists(select 1 from public.complaint_attachments a join public.complaints c on c.id=a.complaint_id where a.storage_path=name and (c.customer_user_id=(select auth.uid()) or exception_private.is_staff())));
create function exception_private.register_evidence(report_id uuid,path text,filename text,mime text,size_bytes integer) returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not exists(select 1 from public.complaints where id=report_id and customer_user_id=auth.uid()) then raise exception 'Report access denied' using errcode='42501'; end if;
 perform 1 from public.complaints where id=report_id for update;
 if size_bytes<=0 or size_bytes>2097152 or mime not in ('image/jpeg','image/png','image/webp') or length(filename)>200 then raise exception 'Invalid image'; end if;
 if (select count(*) from public.complaint_attachments where complaint_id=report_id)>=3 then raise exception 'Up to three attachments are allowed'; end if;
 if split_part(path,'/',1)<>auth.uid()::text or split_part(path,'/',2)<>report_id::text or not exists(select 1 from storage.objects where bucket_id='report-evidence' and name=path) then raise exception 'Uploaded evidence not found'; end if;
 insert into public.complaint_attachments(complaint_id,storage_path,original_filename,mime_type,file_size_bytes) values(report_id,path,filename,mime,size_bytes);
end $$;
create function public.register_evidence(report_id uuid,path text,filename text,mime text,size_bytes integer) returns void language sql security invoker set search_path='' as $$ select exception_private.register_evidence(report_id,path,filename,mime,size_bytes); $$;
revoke all on all functions in schema exception_private from public,anon;
grant execute on all functions in schema exception_private to authenticated;
revoke all on function public.portal_command(text,jsonb),public.seller_exception_context(),public.register_evidence(uuid,text,text,text,integer) from public,anon;
grant execute on function public.portal_command(text,jsonb),public.seller_exception_context(),public.register_evidence(uuid,text,text,text,integer) to authenticated;
insert into public.sellers(name,contact_name,contact_email,contact_phone,external_seller_id) values('Lotus Home','Demo seller','lotus@example.invalid','000000000','demo-lotus'),('River Books','Demo seller','river@example.invalid','000000001','demo-river') on conflict(external_seller_id) do nothing;
