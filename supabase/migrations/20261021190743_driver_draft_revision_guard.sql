-- A provider request can finish after another operator changes the review.
-- Check its exact base review inside the guarded transaction, not via an API
-- read followed by a separate write. Preserve the already-applied definition.
do $$ declare definition text; marker text:='if command=''prepare'' then'; begin
 definition:=pg_get_functiondef('exception_private.driver_command(text,jsonb)'::regprocedure);
 if position(marker in definition)=0 then raise exception 'Driver command definition differs from expected baseline'; end if;
 definition:=replace(definition,marker,marker||$guard$
  if input ? 'expectedReviewId' and not exists(select 1 from public.notification_reviews v where v.id=(input->>'expectedReviewId')::uuid and v.report_id=r.id and v.report_revision=r.revision and v.state='PREPARED') then
   raise exception 'Draft review changed. Refresh before generating or saving again.';
  end if;
$guard$);
 execute definition;
end $$;
