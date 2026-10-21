alter table public.delivery_events alter column event_at drop not null;
alter table public.seller_portal_updates alter column complaint_id drop not null;
-- The delivery system is represented by source context; unknown source timestamps are explicit.
