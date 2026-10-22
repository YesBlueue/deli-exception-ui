-- Confirm the demo project before execution. Synthetic auth identities only.
-- All fixture rows roll back; PostgreSQL reference sequences may advance.
begin;
set local statement_timeout = '30s';
create temporary table reply_test_ids(key text primary key,value uuid not null);
grant select,insert on reply_test_ids to authenticated;
insert into reply_test_ids values('customer',gen_random_uuid()),('operations',gen_random_uuid());
insert into auth.users(id,aud,role,email,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
select value,'authenticated','authenticated',value::text||'@example.invalid',
 '{"provider":"google","providers":["google"]}','{"full_name":"Temporary reply verification"}',now(),now()
from reply_test_ids;
insert into auth.identities(user_id,provider_id,provider,identity_data)
select value,value::text,'google',jsonb_build_object('sub',value::text) from reply_test_ids;
insert into public.staff_profiles(user_id,full_name,role,is_active)
select value,'Temporary operations verifier','OPERATIONS',true from reply_test_ids where key='operations';
set local role authenticated;
select set_config('request.jwt.claim.sub',(select value::text from reply_test_ids where key='customer'),true);
select public.portal_command('provision_demo');
insert into reply_test_ids select 'order',id from public.delivery_jobs where status='IN_TRANSIT' limit 1;
insert into reply_test_ids select 'report',(public.portal_command('submit_report',jsonb_build_object(
 'deliveryId',(select value from reply_test_ids where key='order'),
 'description','My demo delivery is delayed. Please investigate.'))->>'reportId')::uuid;
insert into reply_test_ids select 'exception',exception_id from public.complaints where id=(select value from reply_test_ids where key='report');
do $$ declare cmd text; begin
 foreach cmd in array array['note','reply','report_status'] loop
  begin
   perform public.portal_command(cmd,jsonb_build_object(
    'exceptionId',(select value from reply_test_ids where key='exception'),
    'reportId',(select value from reply_test_ids where key='report'),
    'text','Unauthorized staff action','status','IN_REVIEW'));
   raise exception 'Customer executed staff command: %',cmd;
  exception when insufficient_privilege then
   if sqlerrm<>'Operations access required' then raise; end if;
  end;
 end loop;
end $$;
select set_config('request.jwt.claim.sub',(select value::text from reply_test_ids where key='operations'),true);
select public.portal_command('note',jsonb_build_object('exceptionId',(select value from reply_test_ids where key='exception'),'text','PRIVATE REPLY VERIFICATION NOTE'));
select public.portal_command('report_status',jsonb_build_object('reportId',(select value from reply_test_ids where key='report'),'status','IN_REVIEW','text','PRIVATE REPLY VERIFICATION REASON'));
do $$ begin
 if not exists(select 1 from public.exception_notes where exception_id=(select value from reply_test_ids where key='exception') and body='PRIVATE REPLY VERIFICATION NOTE') then
  raise exception 'Operations cannot read its private note';
 end if;
 if exists(select 1 from public.complaint_replies where complaint_id=(select value from reply_test_ids where key='report')) then
  raise exception 'Note or status change implicitly published a reply';
 end if;
end $$;
select public.portal_command('reply',jsonb_build_object('reportId',(select value from reply_test_ids where key='report'),'text','Hello, we are reviewing your demo delivery report. Please check this portal for updates.'));
do $$ begin
 if (select count(distinct action_type) from public.activity_logs
     where complaint_id=(select value from reply_test_ids where key='report') and action_type in ('REPLY','REPORT_STATUS'))<>2 or
    not exists(select 1 from public.activity_logs where delivery_exception_id=(select value from reply_test_ids where key='exception') and action_type='NOTE') then
  raise exception 'Staff action audit records missing';
 end if;
 if (select status from public.delivery_jobs where id=(select value from reply_test_ids where key='order'))<>'IN_TRANSIT' then
  raise exception 'Staff workflow changed source delivery status';
 end if;
end $$;
select set_config('request.jwt.claim.sub',(select value::text from reply_test_ids where key='customer'),true);
do $$ begin
 if not exists(select 1 from public.complaints where id=(select value from reply_test_ids where key='report') and status='IN_REVIEW') or
    not exists(select 1 from public.report_history where complaint_id=(select value from reply_test_ids where key='report') and status='IN_REVIEW') then
  raise exception 'Customer cannot read updated report status/history';
 end if;
 if (select count(*) from public.complaint_replies where complaint_id=(select value from reply_test_ids where key='report') and body='Hello, we are reviewing your demo delivery report. Please check this portal for updates.')<>1 then
  raise exception 'Customer cannot read explicitly published reply';
 end if;
 if exists(select 1 from public.exception_notes) or exists(select 1 from public.activity_logs) or
    exists(select 1 from public.report_history where description like '%PRIVATE REPLY VERIFICATION%') then
  raise exception 'Private staff note/audit reason leaked to customer';
 end if;
end $$;
reset role;
rollback;
select 'PASS: operations note/status/explicit reply, audit records, customer status/reply visibility, private-note/reason denial, customer staff-command denial, and independent source status; fixture rows rolled back' as result;
