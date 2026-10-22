-- Integration assertions use temporary identities and roll back every row.
begin;
do $$ declare example record; actual jsonb; begin
 for example in select * from (values
  ('My order is delayed, please investigate','DELAY',false,false),
  ('The box arrived damaged. I request a refund.','DAMAGE',true,false),
  ('The package was not received at my address','PACKAGE_MISSING',false,false),
  ('I received the wrong item in my package','WRONG_ITEM',false,false),
  ('There is a missing item in this order','MISSING_ITEM',false,false),
  ('My order is late and the box is broken','OTHER',false,true),
  ('Please investigate this unusual situation','OTHER',false,true),
  ('I would like a refund','OTHER',true,true)
 ) as cases(description,category,refund,review) loop
  actual:=exception_private.classify_report(example.description);
  if actual->>'category'<>example.category or (actual->>'refund')::boolean<>example.refund or (actual->>'needsReview')::boolean<>example.review then raise exception 'SQL/TypeScript classification fixture mismatch: %',example.description; end if;
 end loop;
end $$;
create temporary table portal_test_ids(key text primary key,value uuid not null);
insert into portal_test_ids select key,gen_random_uuid() from unnest(array['customer_a','customer_b','operations','seller_a','seller_b']) key;
grant all on portal_test_ids to authenticated;
insert into auth.users(id,aud,role,email,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
select value,'authenticated','authenticated',value::text||'@example.invalid','{"provider":"google","providers":["google"]}',jsonb_build_object('full_name','Temporary test identity'),now(),now() from portal_test_ids;
insert into auth.identities(user_id,provider_id,provider,identity_data) select value,value::text,'google',jsonb_build_object('sub',value::text,'email',value::text||'@example.invalid') from portal_test_ids;
insert into public.staff_profiles(user_id,full_name,role) select value,'Temporary operations','OPERATIONS' from portal_test_ids where key='operations';
insert into public.seller_users(user_id,seller_id,full_name) select i.value,s.id,'Temporary seller' from portal_test_ids i cross join public.sellers s where (i.key='seller_a' and s.external_seller_id='demo-lotus') or (i.key='seller_b' and s.external_seller_id='demo-river');

set local role authenticated;
select set_config('request.jwt.claim.sub',(select value::text from portal_test_ids where key='customer_a'),true);
select public.portal_command('provision_demo');
select public.portal_command('provision_demo'); -- idempotent
do $$ begin
 if (select count(*) from public.delivery_jobs)<>4 then raise exception 'Customer A must see exactly four own demo orders'; end if;
 if (select count(*) from public.staff_profiles)>0 then raise exception 'Customer cannot acquire staff membership'; end if;
end $$;
insert into portal_test_ids select 'order_a',d.id from public.delivery_jobs d join public.sellers s on s.id=d.seller_id where s.external_seller_id='demo-lotus' and d.status='IN_TRANSIT' limit 1;
insert into portal_test_ids select 'report',(public.portal_command('submit_report',jsonb_build_object('deliveryId',(select value from portal_test_ids where key='order_a'),'description','My order is delayed and I request a refund.'))->>'reportId')::uuid;
insert into portal_test_ids select 'exception',exception_id from public.complaints where id=(select value from portal_test_ids where key='report');
do $$ begin
 if not exists(select 1 from public.complaints where category='DELAY' and refund_requested and not needs_review and rule_version='reports-v1') then raise exception 'Rule categorization/refund intent failed'; end if;
 begin
  insert into public.staff_profiles(user_id,full_name,role) values(auth.uid(),'Escalation','ADMIN');
  raise exception 'Direct role mutation unexpectedly succeeded';
 exception when insufficient_privilege then null; end;
end $$;

select set_config('request.jwt.claim.sub',(select value::text from portal_test_ids where key='customer_b'),true);
select public.portal_command('provision_demo');
do $$ begin
 if (select count(*) from public.delivery_jobs)<>4 or (select count(*) from public.complaints)<>0 then raise exception 'Cross-customer data leak'; end if;
 begin
  perform public.portal_command('submit_report',jsonb_build_object('deliveryId',(select value from portal_test_ids where key='order_a'),'description','My delivery is delayed and needs review.'));
  raise exception 'Cross-customer submission unexpectedly succeeded';
 exception when insufficient_privilege then null; end;
end $$;

select set_config('request.jwt.claim.sub',(select value::text from portal_test_ids where key='operations'),true);
select public.portal_command('note',jsonb_build_object('exceptionId',(select value from portal_test_ids where key='exception'),'text','PRIVATE TEST NOTE'));
select public.portal_command('reply',jsonb_build_object('reportId',(select value from portal_test_ids where key='report'),'text','We are sorry for the delay. Please check this portal for updates.'));
select public.portal_command('correct_category',jsonb_build_object('reportId',(select value from portal_test_ids where key='report'),'category','DELAY','text','PRIVATE CORRECTION REASON'));
select public.portal_command('correct_category',jsonb_build_object('reportId',(select value from portal_test_ids where key='report'),'category','DAMAGE','text','Staff evidence review override'));
do $$ begin
 if not exists(select 1 from public.delivery_exceptions where id=(select value from portal_test_ids where key='exception') and exception_type='DAMAGE' and priority='HIGH') then raise exception 'Category correction left exception summary/priority inconsistent'; end if;
 if not exists(select 1 from public.complaints where id=(select value from portal_test_ids where key='report') and original_classification->>'category'='DELAY') then raise exception 'Original classification was overwritten'; end if;
end $$;
select public.portal_command('correct_category',jsonb_build_object('reportId',(select value from portal_test_ids where key='report'),'category','DELAY','text','Staff review confirms original delay'));
select public.portal_command('handoff',jsonb_build_object('reportId',(select value from portal_test_ids where key='report'),'text','Customer requested refund review. Delivery investigation remains open.'));
select public.portal_command('handoff',jsonb_build_object('reportId',(select value from portal_test_ids where key='report'),'text','Updated delivery findings for seller review; no refund approved.'));
select public.portal_command('seller_update',jsonb_build_object('exceptionId',(select value from portal_test_ids where key='exception'),'text','Operations is reviewing this delivery exception.'));
select public.portal_command('assign',jsonb_build_object('exceptionId',(select value from portal_test_ids where key='exception'),'assignee',(select value from portal_test_ids where key='operations')));
select public.portal_command('exception_status',jsonb_build_object('exceptionId',(select value from portal_test_ids where key='exception'),'status','IN_PROGRESS','text','Investigation started'));
select public.portal_command('report_status',jsonb_build_object('reportId',(select value from portal_test_ids where key='report'),'status','IN_REVIEW','text','Reviewing source evidence'));
do $$ declare r jsonb; old_status text; begin
 if (select count(*) from public.seller_portal_updates where update_type='REFUND_REPORT' and complaint_id=(select value from portal_test_ids where key='report'))<>1 then raise exception 'Duplicate refund handoff'; end if;
 if (select status from public.delivery_jobs where id=(select value from portal_test_ids where key='order_a'))<>'IN_TRANSIT' then raise exception 'Workflow changed source delivery status'; end if;
 r:=public.portal_command('ingest',jsonb_build_object('deliveryId',(select value from portal_test_ids where key='order_a'),'sourceEventId','integration-test-update','eventCode','DELAY','occurredAt',now()));
 if r->>'outcome'<>'APPLIED' then raise exception 'Source update failed'; end if;
 r:=public.portal_command('ingest',jsonb_build_object('deliveryId',(select value from portal_test_ids where key='order_a'),'sourceEventId','integration-test-update','eventCode','DELAY','occurredAt',now()));
 if r->>'outcome'<>'DUPLICATE' then raise exception 'Source duplicate not ignored'; end if;
 r:=public.portal_command('ingest',jsonb_build_object('deliveryId',(select value from portal_test_ids where key='order_a'),'sourceEventId','integration-test-older','eventCode','DELIVERED','occurredAt',now()-interval '1 hour'));
 if r->>'outcome'<>'OUT_OF_ORDER' or (select status from public.delivery_jobs where id=(select value from portal_test_ids where key='order_a'))<>'IN_TRANSIT' then raise exception 'Out-of-order event overwrote source context'; end if;
 r:=public.portal_command('ingest',jsonb_build_object('deliveryId',(select value from portal_test_ids where key='order_a'),'sourceEventId','integration-test-missing-time','eventCode','DELIVERED'));
 if r->>'outcome'<>'MISSING_TIME' then raise exception 'Missing source time must remain explicit'; end if;
end $$;

select set_config('request.jwt.claim.sub',(select value::text from portal_test_ids where key='customer_a'),true);
do $$ begin
 if (select count(*) from public.exception_notes)<>0 or (select count(*) from public.activity_logs)<>0 then raise exception 'Private staff content leaked'; end if;
 if (select count(*) from public.complaint_replies)<>1 then raise exception 'Customer reply unavailable'; end if;
 if exists(select 1 from public.complaints where category_reason like '%PRIVATE%') then raise exception 'Private correction reason leaked'; end if;
 if not exists(select 1 from public.report_history where status='IN_REVIEW') then raise exception 'Report status history unavailable'; end if;
end $$;
select public.portal_command('seen',jsonb_build_object('reportId',(select value from portal_test_ids where key='report')));

select set_config('request.jwt.claim.sub',(select value::text from portal_test_ids where key='seller_a'),true);
do $$ begin
 if (select count(*) from public.complaints)<>0 or (select count(*) from public.exception_notes)<>0 or (select count(*) from public.complaint_replies)<>0 or (select count(*) from public.complaint_attachments)<>0 then raise exception 'Seller received private customer/staff content'; end if;
 -- Shared demo projects may already contain legitimate findings for this seller.
 if (select count(*) from public.seller_portal_updates where delivery_job_id=(select value from portal_test_ids where key='order_a'))<>2 then raise exception 'Seller updates missing'; end if;
 if not exists(select 1 from jsonb_array_elements(public.seller_exception_context()) e where e->>'delivery_job_id'=(select value::text from portal_test_ids where key='order_a')) then raise exception 'Seller exception projection missing'; end if;
end $$;
select set_config('request.jwt.claim.sub',(select value::text from portal_test_ids where key='seller_b'),true);
do $$ begin
 if exists(select 1 from public.seller_portal_updates where delivery_job_id=(select value from portal_test_ids where key='order_a')) or exists(select 1 from jsonb_array_elements(public.seller_exception_context()) e where e->>'delivery_job_id'=(select value::text from portal_test_ids where key='order_a')) then raise exception 'Cross-seller exception/update leak'; end if;
end $$;
reset role;
select 'PASS: account provisioning, RLS, reports, notes, replies, handoffs, assignment, transitions, ingestion ordering, and read state' as result;
rollback;
