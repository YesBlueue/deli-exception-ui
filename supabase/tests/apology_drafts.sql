-- Confirm the demo project before execution. All synthetic fixture rows roll back.
-- Reference sequences may advance. No provider call is made by this database test.
begin;
set local statement_timeout = '30s';
create temporary table apology_test_ids(key text primary key,value uuid not null);
grant select,insert on apology_test_ids to authenticated;
insert into apology_test_ids select key,gen_random_uuid() from unnest(array['customer','operations']) key;
insert into auth.users(id,aud,role,email,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
select value,'authenticated','authenticated',value::text||'@example.invalid',
 '{"provider":"google","providers":["google"]}','{"full_name":"Temporary apology verifier"}',now(),now()
from apology_test_ids;
insert into auth.identities(user_id,provider_id,provider,identity_data)
select value,value::text,'google',jsonb_build_object('sub',value::text) from apology_test_ids;
insert into public.staff_profiles(user_id,full_name,role,is_active)
select value,'Temporary operations verifier','OPERATIONS',true from apology_test_ids where key='operations';
set local role authenticated;
select set_config('request.jwt.claim.sub',(select value::text from apology_test_ids where key='customer'),true);
select public.portal_command('provision_demo');
insert into apology_test_ids select 'order',id from public.delivery_jobs where status='DELIVERED' limit 1;
insert into apology_test_ids select 'report',(public.portal_command('submit_report',jsonb_build_object(
 'deliveryId',(select value from apology_test_ids where key='order'),
 'description','My demo parcel arrived damaged.'))->>'reportId')::uuid;
do $$ begin
 begin
  perform public.portal_command('save_draft',jsonb_build_object('reportId',(select value from apology_test_ids where key='report'),'text','Unauthorized draft','model','openai/gpt-oss-120b'));
  raise exception 'Customer saved a staff draft';
 exception when insufficient_privilege then
  if sqlerrm<>'Operations access required' then raise; end if;
 end;
end $$;
select set_config('request.jwt.claim.sub',(select value::text from apology_test_ids where key='operations'),true);
select public.portal_command('save_draft',jsonb_build_object('reportId',(select value from apology_test_ids where key='report'),'text','Hello, we are sorry for the damaged package.','model','openai/gpt-oss-120b'));
do $$ begin
 if not exists(select 1 from public.apology_drafts where complaint_id=(select value from apology_test_ids where key='report') and model='openai/gpt-oss-120b') or
    not exists(select 1 from public.activity_logs where complaint_id=(select value from apology_test_ids where key='report') and action_type='SAVE_DRAFT' and description='AI apology draft saved; not published') then
  raise exception 'Draft/model or provider-neutral audit not persisted';
 end if;
 if exists(select 1 from public.complaint_replies where complaint_id=(select value from apology_test_ids where key='report')) or
    not exists(select 1 from public.complaints where id=(select value from apology_test_ids where key='report') and status='NEW' and category='DAMAGE') or
    not exists(select 1 from public.delivery_jobs where id=(select value from apology_test_ids where key='order') and status='DELIVERED') then
  raise exception 'Draft generation published or changed operational state';
 end if;
end $$;
select set_config('request.jwt.claim.sub',(select value::text from apology_test_ids where key='customer'),true);
do $$ begin
 if exists(select 1 from public.apology_drafts) or exists(select 1 from public.complaint_replies) then
  raise exception 'Customer received an unpublished draft';
 end if;
end $$;
reset role;
rollback;
select 'PASS: staff-only draft save, Groq model persistence, provider-neutral audit, no publication or operational mutation, and customer draft privacy; fixtures rolled back' as result;
