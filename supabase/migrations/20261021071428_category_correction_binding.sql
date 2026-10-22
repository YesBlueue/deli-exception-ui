create or replace function exception_private.portal_command(command text, input jsonb default '{}') returns jsonb language plpgsql security definer set search_path='' as $$
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
    select order_uuid,sale.id,'DEMO-'||lpad(nextval('exception_private.demo_order_reference')::text,6,'0'),'DEMO-'||order_uuid::text,coalesce(raw_user_meta_data->>'full_name','Customer'),email,'Demo recipient address',sample_status,'demo:'||order_uuid::text,'DEMO','hackathon-simulator',now()-interval '30 hours',case when sample_status='DELIVERED' then 'Demo confirmation: handed to recipient at reception.' else null end from auth.users where id=uid;
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
 if command in ('note','reply','handoff','save_draft','report_status','exception_status','correct_category','seller_update') and (txt is null or length(txt)<1 or length(txt)>4000) then raise exception 'A message or reason of 1 to 4000 characters is required'; end if;
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
  update public.complaints set category=portal_command.category,category_reason='Category corrected by operations staff.',needs_review=false,updated_at=now() where id=r.id;
 elsif command='seller_update' then
  insert into public.seller_portal_updates(delivery_job_id,seller_id,update_type,title,body) values(d.id,d.seller_id,'EXCEPTION_UPDATE','Delivery exception update',txt);
 elsif command='handoff' then
  if not r.refund_requested then raise exception 'This report has no refund request'; end if;
  insert into public.seller_portal_updates(complaint_id,delivery_job_id,seller_id,update_type,title,body) values(r.id,d.id,d.seller_id,'REFUND_REPORT','Delivery findings for refund review',txt)
  on conflict(complaint_id) where update_type='REFUND_REPORT' do update set body=excluded.body,title=excluded.title,created_at=now();
 else raise exception 'Unknown command'; end if;
 insert into public.activity_logs(delivery_job_id,delivery_exception_id,complaint_id,actor_type,actor_user_id,action_type,description,metadata) values(d.id,ex.id,r.id,'STAFF',uid,upper(command),case when command='save_draft' then 'Gemini apology draft saved; not published' else coalesce(txt,command) end,jsonb_build_object('status',input->>'status','category',input->>'category','assignee',input->>'assignee','previousCategory',r.category));
 return jsonb_build_object('ok',true);
end $$;