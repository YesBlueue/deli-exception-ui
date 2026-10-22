-- Confirm the shared demo project before execution through a trusted SQL connection.
-- Synthetic identities test database authorization, not Google or browser sessions.
-- All fixture rows and memberships roll back; reference sequences may advance.
begin;
set local statement_timeout = '30s';
create temporary table seller_isolation_ids(key text primary key,value uuid not null);
grant select,insert on seller_isolation_ids to authenticated;
insert into seller_isolation_ids
select key,gen_random_uuid() from unnest(array['customer','operations','lotus_user','river_user','unassigned']) key;
insert into auth.users(id,aud,role,email,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
select value,'authenticated','authenticated',value::text||'@example.invalid',
 '{"provider":"google","providers":["google"]}','{"full_name":"Temporary seller isolation verifier"}',now(),now()
from seller_isolation_ids;
insert into auth.identities(user_id,provider_id,provider,identity_data)
select value,value::text,'google',jsonb_build_object('sub',value::text) from seller_isolation_ids;
insert into public.staff_profiles(user_id,full_name,role,is_active)
select value,'Temporary operations verifier','OPERATIONS',true from seller_isolation_ids where key='operations';
insert into seller_isolation_ids select external_seller_id,id from public.sellers
where external_seller_id in ('demo-lotus','demo-river');
do $$ begin
 if (select count(*) from seller_isolation_ids where key in ('demo-lotus','demo-river'))<>2 then
  raise exception 'Both demo sellers must exist';
 end if;
end $$;
insert into public.seller_users(user_id,seller_id,full_name,role,is_active)
select u.value,s.value,'Temporary seller verifier','SELLER_STAFF',true
from seller_isolation_ids u join seller_isolation_ids s
on (u.key='lotus_user' and s.key='demo-lotus') or (u.key='river_user' and s.key='demo-river');

set local role authenticated;
do $$ begin
 if current_user<>'authenticated' or exists(select 1 from pg_roles where rolname=current_user and (rolsuper or rolbypassrls)) then
  raise exception 'Assertions must run without RLS bypass';
 end if;
end $$;
select set_config('request.jwt.claim.sub',(select value::text from seller_isolation_ids where key='customer'),true);
select public.portal_command('provision_demo');
insert into seller_isolation_ids
select case when seller_id=(select value from seller_isolation_ids where key='demo-lotus') then 'lotus_order' else 'river_order' end,id
from public.delivery_jobs where status='DELIVERED';
insert into seller_isolation_ids
select replace(key,'_order','_report'),(public.portal_command('submit_report',jsonb_build_object(
 'deliveryId',value,'description','My demo package is damaged. Please review a refund.'))->>'reportId')::uuid
from seller_isolation_ids where key in ('lotus_order','river_order');
insert into seller_isolation_ids
select replace(i.key,'_report','_exception'),c.exception_id
from public.complaints c join seller_isolation_ids i on c.id=i.value where i.key in ('lotus_report','river_report');

select set_config('request.jwt.claim.sub',(select value::text from seller_isolation_ids where key='operations'),true);
do $$ declare side text; begin
 foreach side in array array['lotus','river'] loop
  perform public.portal_command('note',jsonb_build_object('exceptionId',(select value from seller_isolation_ids where key=side||'_exception'),'text','PRIVATE SELLER ISOLATION NOTE'));
  perform public.portal_command('reply',jsonb_build_object('reportId',(select value from seller_isolation_ids where key=side||'_report'),'text','CUSTOMER ONLY SELLER ISOLATION REPLY'));
  perform public.portal_command('handoff',jsonb_build_object('reportId',(select value from seller_isolation_ids where key=side||'_report'),'text',upper(side)||' findings for seller review. No refund has been approved or processed.'));
  perform public.portal_command('seller_update',jsonb_build_object('exceptionId',(select value from seller_isolation_ids where key=side||'_exception'),'text',upper(side)||' seller-visible investigation update.'));
 end loop;
end $$;

-- Both sellers have positive controls; an empty result alone cannot prove isolation.
do $$ declare side text; own_seller uuid; own_order uuid; own_exception uuid; foreign_order uuid;
 ctx jsonb; cmd text; begin
 foreach side in array array['lotus','river'] loop
  perform set_config('request.jwt.claim.sub',(select value::text from seller_isolation_ids where key=side||'_user'),true);
  own_seller:=(select value from seller_isolation_ids where key='demo-'||side);
  own_order:=(select value from seller_isolation_ids where key=side||'_order');
  own_exception:=(select value from seller_isolation_ids where key=side||'_exception');
  foreign_order:=(select value from seller_isolation_ids where key=case when side='lotus' then 'river_order' else 'lotus_order' end);
  if (select count(*) from public.seller_users)<>1 or
     not exists(select 1 from public.seller_users where user_id=auth.uid() and seller_id=own_seller and is_active) or
     not exists(select 1 from public.delivery_jobs where id=own_order) or
     not exists(select 1 from public.sellers where id=own_seller) or
     exists(select 1 from public.delivery_jobs where seller_id<>own_seller) or
     exists(select 1 from public.sellers where id<>own_seller) or
     exists(select 1 from public.seller_portal_updates where seller_id<>own_seller) or
     (select count(*) from public.seller_portal_updates where delivery_job_id=own_order)<>2 then
   raise exception 'Seller positive control or cross-seller table isolation failed: %',side;
  end if;
  ctx:=public.seller_exception_context();
  if not exists(select 1 from jsonb_array_elements(ctx) e where e->>'id'=own_exception::text) or
     exists(select 1 from jsonb_array_elements(ctx) e where not exists(
       select 1 from public.delivery_jobs d where d.id=(e->>'delivery_job_id')::uuid and d.seller_id=own_seller)) or
     exists(select 1 from jsonb_array_elements(ctx) e cross join lateral jsonb_object_keys(e) k(key)
       where k.key not in ('id','delivery_job_id','order_reference','exception_type','status','detected_at','provenance')) then
   raise exception 'Seller exception projection leaked context or omitted own record: %',side;
  end if;
  if exists(select 1 from public.complaints) or exists(select 1 from public.complaint_replies) or
     exists(select 1 from public.complaint_attachments) or exists(select 1 from public.exception_notes) or
     exists(select 1 from public.activity_logs) or exists(select 1 from public.report_history) or
     exists(select 1 from public.apology_drafts) or exists(select 1 from public.delivery_events) or
     exists(select 1 from public.staff_profiles) or exists(select 1 from public.customer_delivery_access) then
   raise exception 'Seller received customer/staff-only records: %',side;
  end if;
  foreach cmd in array array['note','reply','report_status','exception_status','assign','correct_category','handoff','seller_update','save_draft','ingest'] loop
   begin
    perform public.portal_command(cmd,jsonb_build_object('deliveryId',foreign_order,'exceptionId',own_exception,
     'reportId',(select value from seller_isolation_ids where key=side||'_report'),'text','Unauthorized seller action','status','IN_REVIEW'));
    raise exception 'Seller executed staff command: %',cmd;
   exception when insufficient_privilege then
    if sqlerrm<>'Operations access required' then raise; end if;
   end;
  end loop;
  begin
   perform public.portal_command('submit_report',jsonb_build_object('deliveryId',own_order,'description','My order is damaged and needs review.'));
   raise exception 'Seller membership granted customer reporting ownership';
  exception when insufficient_privilege then
   if sqlerrm<>'Order access denied' then raise; end if;
  end;
  begin
   update public.seller_users set seller_id=(select value from seller_isolation_ids where key=case when side='lotus' then 'demo-river' else 'demo-lotus' end) where user_id=auth.uid();
   if found then raise exception 'Seller changed its own membership'; end if;
  exception when insufficient_privilege then null; end;
  begin
   update public.seller_portal_updates set body='Unauthorized modification' where delivery_job_id=own_order;
   if found then raise exception 'Seller directly changed operations findings'; end if;
  exception when insufficient_privilege then null; end;
 end loop;
end $$;

-- Membership removal must take effect without trusting editable metadata.
reset role;
update public.seller_users set is_active=false where user_id=(select value from seller_isolation_ids where key='river_user');
update auth.users set raw_user_meta_data=jsonb_build_object('role','SELLER_ADMIN','seller_id',(select value from seller_isolation_ids where key='demo-river'))
where id in (select value from seller_isolation_ids where key in ('river_user','unassigned'));
set local role authenticated;
do $$ declare person text; begin
 foreach person in array array['river_user','unassigned'] loop
  perform set_config('request.jwt.claim.sub',(select value::text from seller_isolation_ids where key=person),true);
  if exists(select 1 from public.delivery_jobs) or exists(select 1 from public.sellers) or
     exists(select 1 from public.seller_portal_updates) or jsonb_array_length(public.seller_exception_context())<>0 then
   raise exception 'Inactive/unassigned user acquired seller data: %',person;
  end if;
 end loop;
end $$;
reset role;
rollback;
select 'PASS: two-seller positive controls, cross-seller table/projection isolation, private audiences, staff-command denial, reporting ownership, direct-write denial, inactive membership and metadata isolation; fixture rows rolled back' as result;
