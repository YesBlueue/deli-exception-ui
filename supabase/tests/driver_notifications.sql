-- Rollback-only assertions. Run in the confirmed demo project, never as a seed.
begin;
set local statement_timeout='30s';
create temporary table driver_test_ids(key text primary key,id uuid not null);
grant all on driver_test_ids to authenticated;
insert into driver_test_ids select k,gen_random_uuid() from unnest(array['driver_a','driver_b','ops','customer','other_customer','seller','parcel_old','parcel_new','parcel_no_customer','parcel_stale','parcel_conflict']) k;
insert into auth.users(id,aud,role,email,raw_app_meta_data,created_at,updated_at)
 select id,'authenticated','authenticated',id::text||'@example.invalid','{"provider":"google","providers":["google"]}',now(),now() from driver_test_ids where key in ('driver_a','driver_b','ops','customer','other_customer');
insert into public.staff_profiles(user_id,full_name,role)
 select id,key,case when key='ops' then 'OPERATIONS' else 'DELIVERY_PERSON' end from driver_test_ids where key in ('driver_a','driver_b','ops');
insert into public.sellers(id,name,contact_email) select id,'Driver rollback fixture','fixture@example.invalid' from driver_test_ids where key='seller';
insert into public.customer_profiles(user_id,email) select id,id::text||'@example.invalid' from driver_test_ids where key in ('customer','other_customer');
insert into public.seller_users(user_id,seller_id,full_name) values((select id from driver_test_ids where key='other_customer'),(select id from driver_test_ids where key='seller'),'Temporary own-seller evidence verifier');
insert into public.delivery_jobs(id,seller_id,seller_order_reference,tracking_number,recipient_email,delivery_address,status,provenance,source_system,source_updated_at)
 select id,(select id from driver_test_ids where key='seller'),key,id::text,'unverified@example.invalid','Fictional','IN_TRANSIT','DEMO','rollback-fixture',case when key='parcel_stale' then now()-interval '3 days' else now()-interval '1 hour' end from driver_test_ids where key like 'parcel_%';
insert into public.customer_delivery_access(customer_user_id,delivery_job_id)
 select (select id from driver_test_ids where key='customer'),id from driver_test_ids where key like 'parcel_%' and key<>'parcel_no_customer';
insert into public.driver_assignments(delivery_id,driver_id,valid_from,valid_to,source_id,source_system,provenance)
 select id,(select id from driver_test_ids where key='driver_a'),now()-interval '1 day',case when key='parcel_old' then now()-interval '1 hour' else null end,'rollback:'||id,'rollback-fixture','DEMO' from driver_test_ids where key like 'parcel_%' and key<>'parcel_new';
insert into public.driver_assignments(delivery_id,driver_id,valid_from,source_id,source_system,provenance)
 select id,(select id from driver_test_ids where key='driver_b'),now()-interval '1 hour','rollback:second:'||id,'rollback-fixture','DEMO' from driver_test_ids where key in ('parcel_old','parcel_conflict');
-- Make the conflict historical, while the other package transferred after occurrence.
update public.driver_assignments set valid_from=now()-interval '1 day' where delivery_id=(select id from driver_test_ids where key='parcel_conflict') and driver_id=(select id from driver_test_ids where key='driver_b');
insert into public.driver_assignments(delivery_id,driver_id,valid_from,source_id,source_system,provenance)
 select id,(select id from driver_test_ids where key='driver_a'),now()-interval '30 minutes','rollback:new:'||id,'rollback-fixture','DEMO' from driver_test_ids where key='parcel_new';
set local role authenticated;
select set_config('request.jwt.claim.sub',(select id::text from driver_test_ids where key='driver_a'),true);
do $$ begin
 if not (public.driver_workspace()->>'isDriver')::boolean or (public.driver_workspace()->>'isStaff')::boolean then raise exception 'Driver role gate failed'; end if;
 if exists(select 1 from public.delivery_jobs) then raise exception 'Driver received full delivery context'; end if;
 begin
  perform public.driver_command('submit',jsonb_build_object('kind','ATTEMPT','category','ADDRESS_PROBLEM','deliveryId',(select id from driver_test_ids where key='parcel_new'),'occurredAt',now()-interval '2 hours','details','Incomplete address reported at the attempted stop.'));
  raise exception 'Expected unassigned historical delivery denial';
 exception when insufficient_privilege then null; end;
end $$;
insert into driver_test_ids select 'condition',(public.driver_command('submit',jsonb_build_object('kind','CONDITION','category','ROAD_CLOSURE','occurredAt',now()-interval '2 hours','details','Road closure affects the driver route.'))->>'reportId')::uuid;
do $$ begin
 if exists(select 1 from public.notification_reviews) or exists(select 1 from public.customer_delivery_updates) then raise exception 'Driver sees private review or customer publication'; end if;
 begin
  perform public.driver_command('publish','{}'); raise exception 'Expected driver publication denial';
 exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub',(select id::text from driver_test_ids where key='driver_b'),true);
do $$ begin
 if exists(select 1 from public.driver_reports) then raise exception 'Cross-driver report leak'; end if;
end $$;
select set_config('request.jwt.claim.sub',(select id::text from driver_test_ids where key='ops'),true);
insert into driver_test_ids select 'review',id from public.notification_reviews where report_id=(select id from driver_test_ids where key='condition');
do $$ declare a jsonb; v jsonb; begin
 select assessment into a from public.notification_reviews where id=(select id from driver_test_ids where key='review');
 if jsonb_array_length(a->'decisions')<>4 then raise exception 'Historical candidate set incorrect'; end if;
 for v in select value from jsonb_array_elements(a->'decisions') loop
  if v->>'orderReference'='parcel_new' then raise exception 'Current assignment leaked into past condition'; end if;
  if v->>'orderReference'='parcel_old' and v->>'reason'<>'ELIGIBLE' then raise exception 'Historical owner lost package after reassignment'; end if;
  if v->>'orderReference'='parcel_no_customer' and v->>'reason'<>'PENDING_CUSTOMER' then raise exception 'Guessed recipient'; end if;
  if v->>'orderReference'='parcel_stale' and v->>'reason'<>'PENDING_SOURCE' then raise exception 'Stale source accepted'; end if;
  if v->>'orderReference'='parcel_conflict' and v->>'reason'<>'PENDING_ASSIGNMENT' then raise exception 'Conflicting assignment accepted'; end if;
 end loop;
 if exists(select 1 from public.customer_delivery_updates where report_id=(select id from driver_test_ids where key='condition')) then raise exception 'Prepared review automatically published'; end if;
end $$;
-- A changed source fact invalidates the exact reviewed snapshot.
reset role;
update public.delivery_jobs set source_updated_at=now() where id=(select id from driver_test_ids where key='parcel_old');
set local role authenticated;
do $$ declare n public.notification_reviews; rejected boolean:=false; begin
 select * into n from public.notification_reviews where id=(select id from driver_test_ids where key='review');
 begin perform public.driver_command('publish',jsonb_build_object('reviewId',n.id,'body',n.body,'fingerprint',public.notification_fingerprint(n.id)));
 exception when others then if sqlerrm like 'Review changed%' then rejected:=true; else raise; end if; end;
 if not rejected then raise exception 'Changed facts did not invalidate review'; end if;
end $$;
insert into driver_test_ids select 'new_review',(public.driver_command('prepare',jsonb_build_object('reportId',(select id from driver_test_ids where key='condition'),'body','Your delivery may be delayed. Please check this portal for updates.'))->>'reviewId')::uuid;
do $$ declare n public.notification_reviews; result jsonb; begin
 select * into n from public.notification_reviews where id=(select id from driver_test_ids where key='new_review');
 result:=public.driver_command('publish',jsonb_build_object('reviewId',n.id,'body',n.body,'fingerprint',public.notification_fingerprint(n.id)));
 if (result->>'published')::integer<>1 then raise exception 'Wrong publication recipients'; end if;
 perform public.driver_command('publish',jsonb_build_object('reviewId',n.id,'body',n.body,'fingerprint',public.notification_fingerprint(n.id)));
 if (select count(*) from public.customer_delivery_updates where report_id=(select id from driver_test_ids where key='condition'))<>1 then raise exception 'Duplicate publication'; end if;
 if not exists(select 1 from public.notification_reviews where id=n.id and approved_by=auth.uid() and approved_at is not null and published_at is not null) then raise exception 'Approval audit missing'; end if;
 if not exists(select 1 from public.activity_logs where driver_report_id=n.report_id and action_type='NOTICE_PUBLISHED' and metadata->>'approvedBody'=n.body) then raise exception 'Content audit missing'; end if;
end $$;
select set_config('request.jwt.claim.sub',(select id::text from driver_test_ids where key='customer'),true);
do $$ begin
 if (select count(*) from public.customer_delivery_updates)<>1 or exists(select 1 from public.notification_reviews) or exists(select 1 from public.driver_reports) then raise exception 'Customer audience boundary failed'; end if;
 if exists(select 1 from public.customer_delivery_updates where read_at is not null) then raise exception 'New publication already read'; end if;
 perform public.driver_command('seen_update',jsonb_build_object('id',(select id from public.customer_delivery_updates limit 1)));
 if exists(select 1 from public.customer_delivery_updates where read_at is null) then raise exception 'Unread state did not clear'; end if;
end $$;
select set_config('request.jwt.claim.sub',(select id::text from driver_test_ids where key='other_customer'),true);
do $$ begin
 if exists(select 1 from public.customer_delivery_updates) then raise exception 'Cross-customer publication leak'; end if;
 begin update public.driver_assignments set valid_to=now(); raise exception 'Direct assignment mutation allowed'; exception when insufficient_privilege then null; end;
end $$;
reset role;
-- Revoking ownership hides previously published updates as well.
delete from public.customer_delivery_access where delivery_job_id=(select id from driver_test_ids where key='parcel_old');
set local role authenticated;
select set_config('request.jwt.claim.sub',(select id::text from driver_test_ids where key='customer'),true);
do $$ begin if exists(select 1 from public.customer_delivery_updates) then raise exception 'Revoked association retained access'; end if; end $$;
reset role;
-- SQL/TypeScript parity cases match driver-rules.test.ts.
-- Attempt reporting/correction preserves authoritative delivery status.
insert into public.customer_delivery_access(customer_user_id,delivery_job_id) values((select id from driver_test_ids where key='customer'),(select id from driver_test_ids where key='parcel_old'));
set local role authenticated;
select set_config('request.jwt.claim.sub',(select id::text from driver_test_ids where key='driver_a'),true);
insert into driver_test_ids select 'attempt',(public.driver_command('submit',jsonb_build_object('kind','ATTEMPT','category','ADDRESS_PROBLEM','deliveryId',(select id from driver_test_ids where key='parcel_old'),'occurredAt',now()-interval '2 hours','details','The building number was missing at the attempted stop.'))->>'reportId')::uuid;
insert into driver_test_ids select 'second_condition',(public.driver_command('submit',jsonb_build_object('kind','CONDITION','category','VEHICLE_TROUBLE','scopeIds',jsonb_build_array((select id from driver_test_ids where key='parcel_old')),'occurredAt',now()-interval '2 hours','details','Vehicle trouble may affect this historical assignment.'))->>'reportId')::uuid;
do $$ declare denied boolean:=false; begin
 begin perform public.driver_command('submit',jsonb_build_object('kind','CONDITION','category','VEHICLE_TROUBLE','occurredAt',now()-interval '2 hours','details','Duplicate ongoing route condition report.'));
 exception when others then if sqlerrm like 'An ongoing condition%' then denied:=true; else raise; end if; end;
 if not denied then raise exception 'Overlapping ongoing condition was duplicated'; end if;
end $$;
select set_config('request.jwt.claim.sub',(select id::text from driver_test_ids where key='ops'),true);
select public.driver_command('request_correction',jsonb_build_object('reportId',(select id from driver_test_ids where key='attempt'),'text','Please provide the exact attempted location details.'));
insert into driver_test_ids select 'second_review',id from public.notification_reviews where report_id=(select id from driver_test_ids where key='second_condition') and state='PREPARED';
select set_config('request.jwt.claim.sub',(select id::text from driver_test_ids where key='driver_a'),true);
select public.driver_command('correct',jsonb_build_object('reportId',(select id from driver_test_ids where key='attempt'),'kind','ATTEMPT','category','ADDRESS_PROBLEM','deliveryId',(select id from driver_test_ids where key='parcel_old'),'occurredAt',now()-interval '2 hours','details','The street and building number could not be confirmed.'));
reset role;
do $$ begin
 if (select status from public.delivery_jobs where id=(select id from driver_test_ids where key='parcel_old'))<>'IN_TRANSIT' then raise exception 'Driver report changed source status'; end if;
 if not exists(select 1 from public.driver_reports where id=(select id from driver_test_ids where key='attempt') and state='RECEIVED' and revision=3 and exception_id is not null) then raise exception 'Attempt correction or exception integration failed'; end if;
end $$;
-- A new account association must invalidate the reviewed recipient set.
insert into public.customer_delivery_access(customer_user_id,delivery_job_id) values((select id from driver_test_ids where key='other_customer'),(select id from driver_test_ids where key='parcel_old'));
set local role authenticated;
select set_config('request.jwt.claim.sub',(select id::text from driver_test_ids where key='ops'),true);
do $$ declare n public.notification_reviews; denied boolean:=false; begin
 select * into n from public.notification_reviews where id=(select id from driver_test_ids where key='second_review');
 begin perform public.driver_command('publish',jsonb_build_object('reviewId',n.id,'body',n.body,'fingerprint',public.notification_fingerprint(n.id)));
 exception when others then if sqlerrm like 'Review changed%' then denied:=true; else raise; end if; end;
 if not denied then raise exception 'Changed recipients did not invalidate approval'; end if;
 perform public.driver_command('prepare',jsonb_build_object('reportId',n.report_id));
 if not exists(select 1 from public.notification_reviews v, lateral jsonb_array_elements(v.assessment->'decisions') d where v.report_id=n.report_id and state='PREPARED' and d->>'reason'='MANUAL_RECIPIENT_REVIEW') then raise exception 'Multiple account ambiguity was not held'; end if;
end $$;
-- Editing a saved message supersedes its old version; it never publishes.
insert into driver_test_ids select 'edited_review',(public.driver_command('prepare',jsonb_build_object('reportId',(select id from driver_test_ids where key='second_condition'),'body','A reviewed cautious message with no ETA or delivery promise.'))->>'reviewId')::uuid;
do $$ declare n public.notification_reviews; denied boolean:=false; begin
 select * into n from public.notification_reviews where id=(select id from driver_test_ids where key='second_review');
 begin perform public.driver_command('publish',jsonb_build_object('reviewId',n.id,'body',n.body,'fingerprint',public.notification_fingerprint(n.id)));
 exception when others then if sqlerrm like 'Review changed%' then denied:=true; else raise; end if; end;
 if not denied then raise exception 'Superseded draft could be published'; end if;
 denied:=false;
 begin perform public.driver_command('prepare',jsonb_build_object('reportId',n.report_id,'expectedReviewId',n.id,'body','Late provider result from a superseded review.','origin','GROQ'));
 exception when others then if sqlerrm like 'Draft review changed%' then denied:=true; else raise; end if; end;
 if not denied then raise exception 'Late provider result overwrote a newer review'; end if;
 if exists(select 1 from public.customer_delivery_updates where report_id=(select id from driver_test_ids where key='second_condition')) then raise exception 'Editing a draft published an update'; end if;
end $$;
reset role;
-- Metadata/Storage RLS checks; these do not upload image bytes or prove browser downloads.
insert into public.driver_evidence(report_id,storage_path,original_filename)
 select id,(select id::text from driver_test_ids where key='driver_a')||'/'||id||'/fixture.webp','fixture.webp' from driver_test_ids where key='attempt';
insert into storage.objects(bucket_id,name,metadata)
 select 'driver-evidence',storage_path,'{"mimetype":"image/webp","size":20}'::jsonb from public.driver_evidence where report_id=(select id from driver_test_ids where key='attempt');
set local role authenticated;
select set_config('request.jwt.claim.sub',(select id::text from driver_test_ids where key='driver_a'),true);
do $$ begin
 if not exists(select 1 from public.driver_evidence where report_id=(select id from driver_test_ids where key='attempt')) or not exists(select 1 from storage.objects where bucket_id='driver-evidence') then raise exception 'Owner driver evidence positive control failed'; end if;
end $$;
select set_config('request.jwt.claim.sub',(select id::text from driver_test_ids where key='driver_b'),true);
do $$ begin if exists(select 1 from public.driver_evidence) or exists(select 1 from storage.objects where bucket_id='driver-evidence') then raise exception 'Other driver evidence leak'; end if; end $$;
select set_config('request.jwt.claim.sub',(select id::text from driver_test_ids where key='customer'),true);
do $$ begin if exists(select 1 from public.driver_evidence) or exists(select 1 from storage.objects where bucket_id='driver-evidence') then raise exception 'Customer evidence audience leak'; end if; end $$;
select set_config('request.jwt.claim.sub',(select id::text from driver_test_ids where key='other_customer'),true);
do $$ begin
 if not exists(select 1 from public.delivery_jobs where id=(select id from driver_test_ids where key='parcel_old')) then raise exception 'Own-seller positive control failed'; end if;
 if exists(select 1 from public.driver_evidence) or exists(select 1 from storage.objects where bucket_id='driver-evidence') then raise exception 'Own-seller driver evidence audience leak'; end if;
end $$;
select set_config('request.jwt.claim.sub',(select id::text from driver_test_ids where key='ops'),true);
do $$ begin if not exists(select 1 from public.driver_evidence where report_id=(select id from driver_test_ids where key='attempt')) or not exists(select 1 from storage.objects where bucket_id='driver-evidence' and (storage.foldername(name))[2]=(select id::text from driver_test_ids where key='attempt')) then raise exception 'Operations evidence positive control failed'; end if; end $$;
reset role;
update public.staff_profiles set is_active=false where user_id=(select id from driver_test_ids where key='driver_a');
set local role authenticated;
select set_config('request.jwt.claim.sub',(select id::text from driver_test_ids where key='driver_a'),true);
do $$ begin if exists(select 1 from public.driver_reports) or exists(select 1 from public.driver_assignments) or (public.driver_workspace()->>'isDriver')::boolean then raise exception 'Inactive driver retained access'; end if; end $$;
reset role;
do $$ begin
 if exception_private.impact_reason(1,now(),'IN_TRANSIT',1)<>'ELIGIBLE' or exception_private.impact_reason(2,now(),'IN_TRANSIT',1)<>'PENDING_ASSIGNMENT' or exception_private.impact_reason(1,null,'IN_TRANSIT',1)<>'PENDING_SOURCE' or exception_private.impact_reason(1,now(),'IN_TRANSIT',0)<>'PENDING_CUSTOMER' or exception_private.impact_reason(1,now(),'IN_TRANSIT',2)<>'MANUAL_RECIPIENT_REVIEW' then raise exception 'Impact parity failed'; end if;
end $$;
rollback;
