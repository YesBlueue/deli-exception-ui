-- Five entities: historical assignments, reports/conditions, immutable reviews,
-- recipient publications/read state, and private evidence. No delivery lifecycle writes.
create table public.driver_assignments (
 id uuid primary key default gen_random_uuid(), delivery_id uuid not null references public.delivery_jobs,
 driver_id uuid not null references public.staff_profiles, valid_from timestamptz not null,
 valid_to timestamptz, source_id text not null unique, source_system text not null,
 provenance text not null check(provenance in ('DEMO','COMPANY_SYSTEM')), received_at timestamptz not null default now(),
 check(valid_to is null or valid_to>valid_from)
);
create index driver_assignment_time on public.driver_assignments(driver_id,valid_from,valid_to);
create index driver_assignment_delivery on public.driver_assignments(delivery_id);
create table public.driver_reports (
 id uuid primary key default gen_random_uuid(), driver_id uuid not null references public.staff_profiles,
 kind text not null check(kind in ('ATTEMPT','CONDITION')), category text not null,
 delivery_id uuid references public.delivery_jobs, exception_id uuid references public.delivery_exceptions,
 occurred_at timestamptz not null, received_at timestamptz not null default now(), details text not null check(length(details) between 10 and 4000),
 scope_ids uuid[] not null default '{}', state text not null default 'RECEIVED' check(state in ('RECEIVED','NEEDS_CORRECTION','CLOSED')),
 correction_reason text, revision integer not null default 1, source text not null default 'DRIVER_REPORTED' check(source='DRIVER_REPORTED'),
 check((kind='ATTEMPT' and delivery_id is not null and category in ('CUSTOMER_UNAVAILABLE','ADDRESS_PROBLEM','PACKAGE_REFUSED','OTHER_ATTEMPT')) or
       (kind='CONDITION' and delivery_id is null and category in ('CONGESTION','ROAD_CLOSURE','VEHICLE_TROUBLE','SEVERE_WEATHER')))
);
create index driver_reports_owner on public.driver_reports(driver_id,received_at);
create index driver_reports_exception on public.driver_reports(exception_id);
create table public.notification_reviews (
 id uuid primary key default gen_random_uuid(), report_id uuid not null references public.driver_reports,
 report_revision integer not null, assessment jsonb not null, body text not null check(length(body) between 1 and 4000),
 origin text not null check(origin in ('TEMPLATE','MANUAL','GROQ')), model text,
 state text not null default 'PREPARED' check(state in ('PREPARED','SUPERSEDED','PUBLISHED')),
 created_by uuid not null references public.staff_profiles, created_at timestamptz not null default now(),
 approved_by uuid references public.staff_profiles, approved_at timestamptz, published_at timestamptz,
 check((state='PUBLISHED')=(approved_by is not null and approved_at is not null and published_at is not null))
);
create index notification_review_report on public.notification_reviews(report_id,created_at);
create unique index one_prepared_review on public.notification_reviews(report_id) where state='PREPARED';
create table public.customer_delivery_updates (
 id uuid primary key default gen_random_uuid(), review_id uuid not null references public.notification_reviews,
 report_id uuid not null references public.driver_reports, report_revision integer not null,
 delivery_id uuid not null references public.delivery_jobs, customer_id uuid not null references auth.users,
 body text not null, published_at timestamptz not null default now(), read_at timestamptz,
 unique(report_id,report_revision,delivery_id,customer_id)
);
create index customer_update_owner on public.customer_delivery_updates(customer_id,published_at);
create index customer_update_delivery on public.customer_delivery_updates(delivery_id);
create index customer_update_review on public.customer_delivery_updates(review_id);
create table public.driver_evidence (
 id uuid primary key default gen_random_uuid(), report_id uuid not null references public.driver_reports,
 storage_path text not null unique, original_filename text not null, created_at timestamptz not null default now()
);
create index driver_evidence_report on public.driver_evidence(report_id);
alter table public.activity_logs add column driver_report_id uuid references public.driver_reports;
alter table public.activity_logs drop constraint activity_log_has_subject;
alter table public.activity_logs add constraint activity_log_has_subject check(delivery_job_id is not null or delivery_exception_id is not null or complaint_id is not null or driver_report_id is not null);
create index activity_driver_report on public.activity_logs(driver_report_id);

create function exception_private.is_driver() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.staff_profiles where user_id=auth.uid() and is_active and role='DELIVERY_PERSON');
$$;
-- Match driver-rules.ts. Conservative hackathon defaults; not a carrier policy.
create function exception_private.impact_reason(assignment_count integer,source_time timestamptz,source_status text,customer_count integer)
 returns text language sql stable set search_path='' as $$
 select case when assignment_count<>1 then 'PENDING_ASSIGNMENT'
 when source_time is null or source_time>now() or source_time<now()-interval '48 hours' then 'PENDING_SOURCE'
 when source_status in ('DELIVERED','CANCELLED','RETURNED') then 'EXCLUDED_COMPLETE'
 when source_status not in ('IN_TRANSIT','OUT_FOR_DELIVERY') then 'PENDING_SOURCE'
 when customer_count=0 then 'PENDING_CUSTOMER' when customer_count<>1 then 'MANUAL_RECIPIENT_REVIEW' else 'ELIGIBLE' end;
$$;
create function exception_private.condition_assessment(report_id uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare r public.driver_reports; decisions jsonb;
begin
 select * into r from public.driver_reports where id=report_id;
 if not found or not (exception_private.is_staff() or (exception_private.is_driver() and r.driver_id=auth.uid())) then raise exception 'Report access required' using errcode='42501'; end if;
 select coalesce(jsonb_agg(item order by item->>'deliveryId'),'[]'::jsonb) into decisions from (
 select jsonb_build_object('deliveryId',d.id,'orderReference',d.seller_order_reference,'provenance',d.provenance,
  'reason',case when exists(select 1 from public.customer_delivery_updates u where u.report_id=r.id and u.report_revision=r.revision and u.delivery_id=d.id) then 'ALREADY_PUBLISHED' else exception_private.impact_reason(
   (select count(*)::integer from public.driver_assignments a where a.delivery_id=d.id and a.valid_from<=r.occurred_at and (a.valid_to is null or r.occurred_at<a.valid_to)), d.source_updated_at,d.status,
   (select count(*)::integer from public.customer_delivery_access c where c.delivery_job_id=d.id)) end,
  'sourceStatus',d.status,'sourceUpdatedAt',d.source_updated_at,'receivedAt',d.received_at,
  'assignments',(select coalesce(jsonb_agg(to_jsonb(a) order by a.id),'[]'::jsonb) from public.driver_assignments a where a.delivery_id=d.id),
  'recipients',(select coalesce(jsonb_agg(jsonb_build_object('userId',c.customer_user_id,'associationId',c.id,'confirmedAt',c.confirmed_at) order by c.customer_user_id),'[]'::jsonb) from public.customer_delivery_access c where c.delivery_job_id=d.id)
 ) as item from public.delivery_jobs d where exists(
  select 1 from public.driver_assignments a where a.delivery_id=d.id and a.driver_id=r.driver_id and a.valid_from<=r.occurred_at and (a.valid_to is null or r.occurred_at<a.valid_to))
 and (cardinality(r.scope_ids)=0 or d.id=any(r.scope_ids))
 ) items;
 return jsonb_build_object('rule','driver-impact-v1','reportRevision',r.revision,'category',r.category,'occurredAt',r.occurred_at,'details',r.details,
  'state',r.state,'driverActive',exists(select 1 from public.staff_profiles where user_id=r.driver_id and role='DELIVERY_PERSON' and is_active),'decisions',decisions);
end $$;
create function exception_private.prepare_condition(report_id uuid,body text default null,origin text default 'TEMPLATE',model text default null) returns uuid language plpgsql security definer set search_path='' as $$
declare r public.driver_reports; a jsonb; old public.notification_reviews; review_id uuid; msg text;
begin
 select * into r from public.driver_reports where id=report_id for update;
 if not (exception_private.is_staff() or (exception_private.is_driver() and r.driver_id=auth.uid())) then raise exception 'Report access required' using errcode='42501'; end if;
 if not found or r.kind<>'CONDITION' or r.state<>'RECEIVED' then raise exception 'Condition is not open for review'; end if;
 a:=exception_private.condition_assessment(r.id);
 msg:=coalesce(nullif(trim(body),''),'Your delivery may be delayed. We’re sorry for the inconvenience. We’ll share an update here when more information is available.');
 select * into old from public.notification_reviews n where n.report_id=r.id and state='PREPARED';
 if old.id is not null and old.assessment=a and old.body=msg and old.origin=prepare_condition.origin and old.model is not distinct from prepare_condition.model then return old.id; end if;
 update public.notification_reviews n set state='SUPERSEDED' where n.report_id=r.id and state='PREPARED';
 insert into public.notification_reviews(report_id,report_revision,assessment,body,origin,model,created_by)
 values(r.id,r.revision,a,msg,prepare_condition.origin,left(prepare_condition.model,120),auth.uid()) returning id into review_id;
 insert into public.activity_logs(driver_report_id,actor_type,actor_user_id,action_type,description,metadata)
 values(r.id,'STAFF',auth.uid(),'NOTICE_PREPARED','Private review prepared; not published',jsonb_build_object('reviewId',review_id));
 return review_id;
end $$;

do $$ declare t text; begin
 foreach t in array array['driver_assignments','driver_reports','notification_reviews','customer_delivery_updates','driver_evidence'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from public,anon,authenticated',t);
 execute format('grant select on public.%I to authenticated',t);
 end loop;
end $$;
create policy driver_assignment_read on public.driver_assignments for select to authenticated using(exception_private.is_staff() or (exception_private.is_driver() and driver_id=auth.uid()));
create policy driver_report_read on public.driver_reports for select to authenticated using(exception_private.is_staff() or (exception_private.is_driver() and driver_id=auth.uid()));
create policy notice_staff on public.notification_reviews for select to authenticated using(exception_private.is_staff());
create policy notice_recipient on public.customer_delivery_updates for select to authenticated using(exception_private.is_staff() or (customer_id=auth.uid() and exception_private.owns_delivery(delivery_id)));
create policy driver_evidence_read on public.driver_evidence for select to authenticated using(exception_private.is_staff() or (exception_private.is_driver() and exists(select 1 from public.driver_reports r where r.id=report_id and r.driver_id=auth.uid())));

-- A minimal historical projection; never grants driver access to full delivery_jobs rows.
create function exception_private.driver_workspace() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare ops boolean:=exception_private.is_staff(); drv boolean:=exception_private.is_driver();
begin
 if auth.uid() is null then raise exception 'Sign in required' using errcode='42501'; end if;
 return jsonb_build_object('isDriver',drv,'isStaff',ops,
 'assignments',(select coalesce(jsonb_agg(jsonb_build_object('id',a.id,'delivery_id',a.delivery_id,'driver_id',a.driver_id,'valid_from',a.valid_from,'valid_to',a.valid_to,'provenance',a.provenance,'order_reference',d.seller_order_reference) order by a.valid_from),'[]'::jsonb)
 from public.driver_assignments a join public.delivery_jobs d on d.id=a.delivery_id where ops or (drv and a.driver_id=auth.uid())),
 'reports',(select coalesce(jsonb_agg(to_jsonb(r) order by r.received_at desc),'[]'::jsonb) from public.driver_reports r where ops or (drv and r.driver_id=auth.uid())),
 'reviews',(select coalesce(jsonb_agg(to_jsonb(n)||jsonb_build_object('fingerprint',md5(n.assessment::text)) order by n.created_at desc),'[]'::jsonb) from public.notification_reviews n where ops),
 'evidence',(select coalesce(jsonb_agg(to_jsonb(e)),'[]'::jsonb) from public.driver_evidence e join public.driver_reports r on r.id=e.report_id where ops or (drv and r.driver_id=auth.uid())),
 'drivers',(select coalesce(jsonb_agg(jsonb_build_object('id',user_id,'name',full_name)),'[]'::jsonb) from public.staff_profiles where ops and role='DELIVERY_PERSON' and is_active));
end $$;

create function exception_private.driver_command(command text,input jsonb default '{}') returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); ops boolean:=exception_private.is_staff(); drv boolean:=exception_private.is_driver();
 r public.driver_reports; n public.notification_reviews; a jsonb; item jsonb; recipient jsonb;
 rid uuid; eid uuid; did uuid; occurred timestamptz; txt text; cat text; k text; scope uuid[]; result_count integer:=0;
 d public.delivery_jobs; first_driver uuid; second_driver uuid; demo_count integer:=0;
begin
 if uid is null then raise exception 'Sign in required' using errcode='42501'; end if;
 -- Serialize this small hackathon workflow. Locks also protect publication from
 -- external assignment/source/association writers until the transaction commits.
 perform pg_advisory_xact_lock(728441002);
 if command='seen_update' then
  update public.customer_delivery_updates u set read_at=coalesce(read_at,now()) where u.id=(input->>'id')::uuid and u.customer_id=uid and exception_private.owns_delivery(u.delivery_id);
  if not found then raise exception 'Update access denied' using errcode='42501'; end if;
  return jsonb_build_object('ok',true);
 end if;
 if command in ('submit','correct') then
  if not drv then raise exception 'Driver access required' using errcode='42501'; end if;
  lock table public.driver_assignments, public.delivery_jobs, public.customer_delivery_access, public.staff_profiles in share mode;
  if not exception_private.is_driver() then raise exception 'Driver access required' using errcode='42501'; end if;
  occurred:=(input->>'occurredAt')::timestamptz;
  if occurred is null or occurred>now() or occurred<now()-interval '7 days' then raise exception 'Use an occurrence time within the last seven days'; end if;
  txt:=trim(input->>'details'); cat:=input->>'category'; k:=input->>'kind'; did:=nullif(input->>'deliveryId','')::uuid;
  select coalesce(array_agg(value::uuid),'{}'::uuid[]) into scope from jsonb_array_elements_text(coalesce(input->'scopeIds','[]'::jsonb));
  if command='correct' then
   select * into r from public.driver_reports where id=(input->>'reportId')::uuid for update;
   if not found or r.driver_id<>uid or r.state<>'NEEDS_CORRECTION' or r.kind<>k or r.delivery_id is distinct from did then raise exception 'Report correction denied' using errcode='42501'; end if;
   rid:=r.id; eid:=r.exception_id;
  end if;
  if k='ATTEMPT' then scope:=array[did]; end if;
  if not exists(select 1 from public.driver_assignments where driver_id=uid and valid_from<=occurred and (valid_to is null or occurred<valid_to)) then raise exception 'No historical assignment at that time'; end if;
  if exists(select 1 from unnest(scope) s where s is null or not exists(select 1 from public.driver_assignments where driver_id=uid and delivery_id=s and valid_from<=occurred and (valid_to is null or occurred<valid_to))) then raise exception 'Delivery was not assigned to you at occurrence' using errcode='42501'; end if;
  if k='CONDITION' and exists(select 1 from public.driver_reports where driver_id=uid and kind='CONDITION' and category=cat and state<>'CLOSED' and id is distinct from rid and (cardinality(scope_ids)=0 or cardinality(scope)=0 or scope_ids && scope)) then raise exception 'An ongoing condition already exists. Ask operations to revise or close it.'; end if;
  if k='ATTEMPT' then
   if (select count(*) from public.driver_assignments where delivery_id=did and valid_from<=occurred and (valid_to is null or occurred<valid_to))<>1 then raise exception 'Conflicting assignment history requires correction by the source administrator'; end if;
   if eid is null then insert into public.delivery_exceptions(delivery_job_id,exception_type,priority,priority_reason) values(did,cat,'MEDIUM','driver-attempt-v1: structured driver report; operations review required') returning id into eid;
   else update public.delivery_exceptions set exception_type=cat where id=eid; end if;
  end if;
  if rid is null then
   insert into public.driver_reports(driver_id,kind,category,delivery_id,exception_id,occurred_at,details,scope_ids) values(uid,k,cat,case when k='ATTEMPT' then did end,eid,occurred,txt,scope) returning * into r;
  else
   insert into public.activity_logs(driver_report_id,actor_type,actor_user_id,action_type,description,metadata) values(rid,'STAFF',uid,'DRIVER_CORRECTION','Driver corrected report',to_jsonb(r));
   update public.driver_reports set category=cat,occurred_at=occurred,details=txt,scope_ids=scope,state='RECEIVED',correction_reason=null,revision=revision+1 where id=rid returning * into r;
  end if;
  insert into public.activity_logs(delivery_job_id,delivery_exception_id,driver_report_id,actor_type,actor_user_id,action_type,description,metadata) values(r.delivery_id,eid,r.id,'STAFF',uid,'DRIVER_REPORT','Driver report received',to_jsonb(r));
  if k='CONDITION' then perform exception_private.prepare_condition(r.id); end if;
  return jsonb_build_object('ok',true,'reportId',r.id);
 end if;
 if not ops then raise exception 'Operations access required' using errcode='42501'; end if;
 if command='demo_assignments' then
  if not (select demo_enabled from exception_private.settings where singleton) then raise exception 'Demo provisioning disabled'; end if;
  first_driver:=(input->>'firstDriver')::uuid; second_driver:=(input->>'secondDriver')::uuid;
  if first_driver=second_driver or first_driver is null or second_driver is null or (select count(*) from public.staff_profiles where user_id in (first_driver,second_driver) and role='DELIVERY_PERSON' and is_active)<>2 then raise exception 'Choose two distinct active drivers'; end if;
  if exists(select 1 from public.driver_assignments where source_id like 'driver-demo:%') then return jsonb_build_object('ok',true,'created',0); end if;
  -- Idempotent; uses existing explicitly provisioned demo contexts. Does not change
  -- delivery status, customer ownership, memberships, or existing assignments.
  for d in select * from public.delivery_jobs j where provenance='DEMO' and not exists(select 1 from public.driver_assignments where delivery_id=j.id) order by created_at limit 3 loop
   demo_count:=demo_count+1;
   insert into public.driver_assignments(delivery_id,driver_id,valid_from,valid_to,source_id,source_system,provenance) values(d.id,first_driver,now()-interval '2 days',case when demo_count=1 then now()-interval '1 hour' else null end,'driver-demo:'||d.id||':first','hackathon-simulator','DEMO');
   if demo_count=1 then insert into public.driver_assignments(delivery_id,driver_id,valid_from,source_id,source_system,provenance) values(d.id,second_driver,now()-interval '1 hour','driver-demo:'||d.id||':second','hackathon-simulator','DEMO'); end if;
  end loop;
  insert into public.activity_logs(delivery_job_id,actor_type,actor_user_id,action_type,description) select delivery_id,'STAFF',uid,'DEMO_ASSIGNMENTS','Explicit fictional assignment history provisioned' from public.driver_assignments where source_id like 'driver-demo:%' order by received_at desc limit 1;
  return jsonb_build_object('ok',true,'created',demo_count);
 end if;
 if command='publish' then
  lock table public.driver_assignments, public.delivery_jobs, public.customer_delivery_access, public.staff_profiles in share mode;
  select * into n from public.notification_reviews where id=(input->>'reviewId')::uuid for update;
  if not found then raise exception 'Review not found'; end if;
  if n.state='PUBLISHED' then return jsonb_build_object('ok',true,'alreadyPublished',true); end if;
  select * into r from public.driver_reports where id=n.report_id for update;
  a:=exception_private.condition_assessment(r.id);
  if n.state<>'PREPARED' or r.state<>'RECEIVED' or n.assessment<>a or n.body is distinct from input->>'body' or md5(n.assessment::text) is distinct from input->>'fingerprint' or not (a->>'driverActive')::boolean then raise exception 'Review changed or data expired. Refresh and review again.'; end if;
  for item in select value from jsonb_array_elements(a->'decisions') loop
   if item->>'reason'<>'ELIGIBLE' then continue; end if;
   for recipient in select value from jsonb_array_elements(item->'recipients') loop
    insert into public.customer_delivery_updates(review_id,report_id,report_revision,delivery_id,customer_id,body) values(n.id,r.id,r.revision,(item->>'deliveryId')::uuid,(recipient->>'userId')::uuid,n.body);
    result_count:=result_count+1;
   end loop;
  end loop;
  if result_count=0 then raise exception 'No eligible verified recipients'; end if;
  update public.notification_reviews set state='PUBLISHED',approved_by=uid,approved_at=now(),published_at=now() where id=n.id;
  insert into public.activity_logs(driver_report_id,actor_type,actor_user_id,action_type,description,metadata) values(r.id,'STAFF',uid,'NOTICE_PUBLISHED','Reviewed portal updates published',jsonb_build_object('reviewId',n.id,'approvedBody',n.body,'assessment',a,'recipientCount',result_count,'result','PUBLISHED'));
  return jsonb_build_object('ok',true,'published',result_count);
 end if;
 select * into r from public.driver_reports where id=(input->>'reportId')::uuid for update;
 if not found then raise exception 'Report not found'; end if;
 if command='prepare' then
  rid:=exception_private.prepare_condition(r.id,input->>'body',coalesce(input->>'origin','MANUAL'),input->>'model');
  return jsonb_build_object('ok',true,'reviewId',rid);
 elsif command in ('close','request_correction','revise') then
  txt:=trim(input->>'text');
  if txt is null or length(txt)<10 or length(txt)>4000 then raise exception 'Provide 10 to 4000 characters of verified detail or correction reason'; end if;
  if command='revise' and txt=r.details then raise exception 'Record materially changed verified facts before creating a revised notice'; end if;
  insert into public.activity_logs(driver_report_id,delivery_exception_id,actor_type,actor_user_id,action_type,description,metadata) values(r.id,r.exception_id,'STAFF',uid,upper(command),txt,jsonb_build_object('previous',to_jsonb(r)));
  update public.driver_reports set state=case when command='close' then 'CLOSED' when command='request_correction' then 'NEEDS_CORRECTION' else 'RECEIVED' end, details=case when command='revise' then txt else details end,correction_reason=case when command='request_correction' then txt end,revision=revision+1 where id=r.id;
  update public.notification_reviews set state='SUPERSEDED' where report_id=r.id and state='PREPARED';
  if command='revise' and r.kind='CONDITION' then perform exception_private.prepare_condition(r.id); end if;
  return jsonb_build_object('ok',true);
 end if;
 raise exception 'Unknown driver command';
end $$;

create function public.driver_workspace() returns jsonb language sql security invoker set search_path='' as $$ select exception_private.driver_workspace(); $$;
create function public.driver_command(command text,input jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$ select exception_private.driver_command(command,input); $$;
-- Fingerprint is computed in SQL so clients need not reproduce jsonb serialization.
create function public.notification_fingerprint(review_id uuid) returns text language sql stable security invoker set search_path='' as $$ select md5(assessment::text) from public.notification_reviews where id=review_id; $$;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('driver-evidence','driver-evidence',false,2097152,array['image/webp']);
create policy driver_image_upload on storage.objects for insert to authenticated with check(bucket_id='driver-evidence' and exception_private.is_driver() and (storage.foldername(name))[1]=auth.uid()::text and exists(select 1 from public.driver_reports r where r.id::text=(storage.foldername(name))[2] and r.driver_id=auth.uid()));
create policy driver_image_download on storage.objects for select to authenticated using(bucket_id='driver-evidence' and exists(select 1 from public.driver_evidence e join public.driver_reports r on r.id=e.report_id where e.storage_path=name and (exception_private.is_staff() or (exception_private.is_driver() and r.driver_id=auth.uid()))));
create function exception_private.register_driver_evidence(report_id uuid,path text,filename text) returns void language plpgsql security definer set search_path='' as $$
begin
 if not exception_private.is_driver() or not exists(select 1 from public.driver_reports r where r.id=report_id and r.driver_id=auth.uid()) or split_part(path,'/',1)<>auth.uid()::text or split_part(path,'/',2)<>report_id::text or not exists(select 1 from storage.objects where bucket_id='driver-evidence' and name=path) then raise exception 'Evidence access denied' using errcode='42501'; end if;
 insert into public.driver_evidence(report_id,storage_path,original_filename) values(report_id,path,left(filename,200));
 insert into public.activity_logs(driver_report_id,actor_type,actor_user_id,action_type,description) values(report_id,'STAFF',auth.uid(),'DRIVER_EVIDENCE','Private driver evidence registered');
end $$;
create function public.register_driver_evidence(report_id uuid,path text,filename text) returns void language sql security invoker set search_path='' as $$ select exception_private.register_driver_evidence(report_id,path,filename); $$;
-- Every new function is denied to PUBLIC/anon. Private definer bodies enforce roles.
revoke all on function exception_private.is_driver(),exception_private.impact_reason(integer,timestamptz,text,integer),exception_private.condition_assessment(uuid),exception_private.prepare_condition(uuid,text,text,text),exception_private.driver_workspace(),exception_private.driver_command(text,jsonb),exception_private.register_driver_evidence(uuid,text,text) from public,anon,authenticated;
grant execute on function exception_private.is_driver(),exception_private.driver_workspace(),exception_private.driver_command(text,jsonb),exception_private.register_driver_evidence(uuid,text,text) to authenticated;
revoke all on function public.driver_workspace(),public.driver_command(text,jsonb),public.notification_fingerprint(uuid),public.register_driver_evidence(uuid,text,text) from public,anon;
grant execute on function public.driver_workspace(),public.driver_command(text,jsonb),public.notification_fingerprint(uuid),public.register_driver_evidence(uuid,text,text) to authenticated;
