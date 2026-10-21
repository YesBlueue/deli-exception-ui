create function exception_private.sync_corrected_report() returns trigger language plpgsql security invoker set search_path='' as $$
declare ex public.delivery_exceptions;
begin
 if new.category is distinct from old.category and new.exception_id is not null then
  if not exception_private.is_staff() then raise exception 'Operations access required' using errcode='42501'; end if;
  select * into ex from public.delivery_exceptions where id=new.exception_id for update;
  if ex.trigger_event_id is null and not exists(select 1 from public.complaints c where c.exception_id=ex.id and c.id<>new.id and c.category<>new.category) then
   update public.delivery_exceptions set exception_type=new.category,
    priority=case when new.category in ('DAMAGE','PACKAGE_MISSING') then 'HIGH' else 'MEDIUM' end,
    priority_reason='report-priority-v1: staff-corrected category '||new.category,updated_at=now() where id=ex.id;
  else
   new.needs_review:=true;
   new.category_reason:='Category corrected by operations; conflicting linked/source context requires review.';
  end if;
 end if;
 return new;
end $$;
revoke all on function exception_private.sync_corrected_report() from public,anon,authenticated;
create trigger report_category_consistency before update of category on public.complaints for each row execute function exception_private.sync_corrected_report();
