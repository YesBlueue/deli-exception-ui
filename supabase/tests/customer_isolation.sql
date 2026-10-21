-- Run only against the agreed demo environment through a trusted SQL connection.
-- Synthetic identities exercise real RLS/RPCs, not Google token verification.
-- Fixture rows roll back. PostgreSQL reference sequences may advance.
begin;
set local statement_timeout = '30s';
create temporary table customer_isolation_ids(key text primary key, value uuid not null);
grant select, insert on customer_isolation_ids to authenticated;
insert into customer_isolation_ids values ('a',gen_random_uuid()),('b',gen_random_uuid());
insert into auth.users(id,aud,role,email,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
select value,'authenticated','authenticated',value::text||'@example.invalid',
 '{"provider":"google","providers":["google"]}', '{"full_name":"Temporary isolation test"}',now(),now()
from customer_isolation_ids;
insert into auth.identities(user_id,provider_id,provider,identity_data)
select value,value::text,'google',jsonb_build_object('sub',value::text) from customer_isolation_ids;

set local role authenticated;
select set_config('request.jwt.claim.sub',(select value::text from customer_isolation_ids where key='a'),true);
select public.portal_command('provision_demo');
insert into customer_isolation_ids
select 'order_a',id from public.delivery_jobs where status='IN_TRANSIT' limit 1;
insert into customer_isolation_ids
select 'report_a',(public.portal_command('submit_report',jsonb_build_object(
 'deliveryId',(select value from customer_isolation_ids where key='order_a'),
 'description','My demo order is delayed. Please investigate.'))->>'reportId')::uuid;
do $$ begin
 if (select count(*) from public.delivery_jobs)<>4 or
    (select count(*) from public.customer_delivery_access)<>4 or
    (select count(*) from public.complaints)<>1 then
  raise exception 'Customer A positive control failed';
 end if;
end $$;

select set_config('request.jwt.claim.sub',(select value::text from customer_isolation_ids where key='b'),true);
-- Editable Google metadata must not grant ownership or staff access.
reset role;
update auth.users set raw_user_meta_data=jsonb_build_object('role','ADMIN','email',
 (select value::text||'@example.invalid' from customer_isolation_ids where key='a'))
where id=(select value from customer_isolation_ids where key='b');
set local role authenticated;
do $$ begin
 if exists(select 1 from public.delivery_jobs) or
    exists(select 1 from public.customer_delivery_access) or
    exists(select 1 from public.complaints) or
    exists(select 1 from public.report_history) or
    exists(select 1 from public.complaint_replies) or
    exists(select 1 from public.staff_profiles) then
  raise exception 'Customer B can read records without association';
 end if;
 begin
  perform public.portal_command('submit_report',jsonb_build_object(
   'deliveryId',(select value from customer_isolation_ids where key='order_a'),
   'description','My demo order is delayed. Please investigate.'));
  raise exception 'Cross-customer report submission succeeded';
 exception when insufficient_privilege then
  if sqlerrm<>'Order access denied' then raise; end if;
 end;
 begin
  perform public.portal_command('seen',jsonb_build_object(
   'reportId',(select value from customer_isolation_ids where key='report_a')));
  raise exception 'Cross-customer report mutation succeeded';
 exception when insufficient_privilege then
  if sqlerrm<>'Report access denied' then raise; end if;
 end;
 begin
  insert into public.customer_delivery_access(customer_user_id,delivery_job_id)
  values(auth.uid(),(select value from customer_isolation_ids where key='order_a'));
  raise exception 'Customer claimed another account order';
 exception when insufficient_privilege then null;
 end;
 begin
  update public.complaints set customer_description='Unauthorized change'
  where id=(select value from customer_isolation_ids where key='report_a');
  if found then raise exception 'Direct cross-customer report update succeeded'; end if;
 exception when insufficient_privilege then null;
 end;
end $$;
select public.portal_command('provision_demo');
insert into customer_isolation_ids
select 'order_b',id from public.delivery_jobs where status='IN_TRANSIT' limit 1;
insert into customer_isolation_ids
select 'report_b',(public.portal_command('submit_report',jsonb_build_object(
 'deliveryId',(select value from customer_isolation_ids where key='order_b'),
 'description','My demo order is delayed. Please investigate.'))->>'reportId')::uuid;
do $$ begin
 if (select count(*) from public.delivery_jobs)<>4 or
    (select count(*) from public.customer_delivery_access)<>4 or
    (select count(*) from public.complaints)<>1 or
    exists(select 1 from public.delivery_jobs where id=(select value from customer_isolation_ids where key='order_a')) or
    exists(select 1 from public.complaints where id=(select value from customer_isolation_ids where key='report_a')) then
  raise exception 'Customer B positive control or isolation failed';
 end if;
end $$;
select set_config('request.jwt.claim.sub',(select value::text from customer_isolation_ids where key='a'),true);
do $$ begin
 if (select count(*) from public.delivery_jobs)<>4 or
    (select count(*) from public.complaints)<>1 or
    exists(select 1 from public.delivery_jobs where id=(select value from customer_isolation_ids where key='order_b')) or
    exists(select 1 from public.complaints where id=(select value from customer_isolation_ids where key='report_b')) or
    not exists(select 1 from public.complaints where id=(select value from customer_isolation_ids where key='report_a') and customer_description='My demo order is delayed. Please investigate.') then
  raise exception 'Customer A isolation or report integrity failed';
 end if;
end $$;
reset role;
rollback;
select 'PASS: two-customer RLS reads, owned submissions, cross-customer submission/read-state denial, ownership-claim denial, direct-update denial, and editable-metadata isolation; fixture rows rolled back' as result;
