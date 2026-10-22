-- Integration assertions use temporary identities and roll back every row.
begin;
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


-- Storage metadata fixtures only; no real evidence file or identity persists.
insert into storage.objects(bucket_id,name,owner_id,metadata) select 'report-evidence',auth.uid()::text||'/'||value::text||'/proof.webp',auth.uid()::text,'{"mimetype":"image/webp","size":100}'::jsonb from portal_test_ids where key='report';
select public.register_evidence((select value from portal_test_ids where key='report'),auth.uid()::text||'/'||(select value::text from portal_test_ids where key='report')||'/proof.webp','proof.webp','image/webp',100);
do $$ begin
 if (select count(*) from public.complaint_attachments)<>1 then raise exception 'Owner cannot read evidence metadata'; end if;
 if (select count(*) from storage.objects where bucket_id='report-evidence')<>1 then raise exception 'Owner cannot authorize evidence download'; end if;
end $$;
select set_config('request.jwt.claim.sub',(select value::text from portal_test_ids where key='customer_b'),true);
do $$ begin
 if (select count(*) from public.complaint_attachments)<>0 or (select count(*) from storage.objects where bucket_id='report-evidence')<>0 then raise exception 'Cross-customer evidence leak'; end if;
 begin
  perform public.register_evidence((select value from portal_test_ids where key='report'),'unauthorized/path','proof.webp','image/webp',100);
  raise exception 'Cross-customer evidence registration succeeded';
 exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub',(select value::text from portal_test_ids where key='seller_a'),true);
do $$ begin
 if (select count(*) from public.complaint_attachments)<>0 or (select count(*) from storage.objects where bucket_id='report-evidence')<>0 then raise exception 'Seller evidence leak'; end if;
end $$;
select set_config('request.jwt.claim.sub',(select value::text from portal_test_ids where key='operations'),true);
do $$ begin
 -- Operations legitimately sees existing shared demo attachments too.
 if (select count(*) from public.complaint_attachments where complaint_id=(select value from portal_test_ids where key='report'))<>1 or (select count(*) from storage.objects where bucket_id='report-evidence' and (storage.foldername(name))[2]=(select value::text from portal_test_ids where key='report'))<>1 then raise exception 'Authorized operations cannot read evidence'; end if;
end $$;
reset role;
select 'PASS: evidence metadata and private Storage owner/staff visibility; cross-customer/seller denial' as result;
rollback;
