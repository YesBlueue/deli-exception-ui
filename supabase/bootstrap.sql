-- Run ONLY on an empty project before applying supabase/migrations.
-- Snapshot of the pre-existing source schema; no application/user data included.
create table public.activity_logs (id uuid not null default gen_random_uuid(),
delivery_job_id uuid,
delivery_exception_id uuid,
complaint_id uuid,
actor_type text not null,
actor_user_id uuid,
action_type text not null,
description text not null,
metadata jsonb not null default '{}'::jsonb,
created_at timestamp with time zone not null default now());
create table public.company_profile (singleton boolean not null default true,
name text not null,
support_email text,
created_at timestamp with time zone not null default now(),
updated_at timestamp with time zone not null default now());
create table public.complaint_attachments (id uuid not null default gen_random_uuid(),
complaint_id uuid not null,
storage_path text not null,
original_filename text,
mime_type text not null,
file_size_bytes bigint not null,
created_at timestamp with time zone not null default now());
create table public.complaint_replies (id uuid not null default gen_random_uuid(),
complaint_id uuid not null,
author_type text not null,
author_user_id uuid,
reply_type text not null,
body text not null,
created_at timestamp with time zone not null default now());
create table public.complaints (id uuid not null default gen_random_uuid(),
delivery_job_id uuid not null,
customer_user_id uuid not null,
complaint_reference text not null,
customer_description text not null,
category text not null default 'OTHER'::text,
category_confidence numeric(4,3),
category_reason text,
status text not null default 'NEW'::text,
resolution_summary text,
submitted_at timestamp with time zone not null default now(),
resolved_at timestamp with time zone,
created_at timestamp with time zone not null default now(),
updated_at timestamp with time zone not null default now());
create table public.customer_delivery_access (id uuid not null default gen_random_uuid(),
customer_user_id uuid not null,
delivery_job_id uuid not null,
confirmed_at timestamp with time zone not null default now(),
created_at timestamp with time zone not null default now());
create table public.customer_profiles (user_id uuid not null,
full_name text,
email text not null,
created_at timestamp with time zone not null default now(),
updated_at timestamp with time zone not null default now());
create table public.delivery_events (id uuid not null default gen_random_uuid(),
delivery_job_id uuid not null,
event_code text not null,
description text,
source_event_id text,
source text not null,
event_at timestamp with time zone,
received_at timestamp with time zone not null default now(),
raw_payload jsonb,
created_at timestamp with time zone not null default now());
create table public.delivery_exceptions (id uuid not null default gen_random_uuid(),
delivery_job_id uuid not null,
trigger_event_id uuid,
exception_type text not null,
priority text not null,
priority_rule_id uuid,
priority_reason text not null,
status text not null default 'NEW'::text,
assignee_user_id uuid,
detected_at timestamp with time zone not null default now(),
resolved_at timestamp with time zone,
created_at timestamp with time zone not null default now(),
updated_at timestamp with time zone not null default now());
create table public.delivery_jobs (id uuid not null default gen_random_uuid(),
seller_id uuid not null,
seller_order_reference text,
tracking_number text not null,
recipient_name text,
recipient_email text not null,
recipient_phone text,
delivery_address text not null,
status text not null default 'CREATED'::text,
shipped_at timestamp with time zone,
delivered_at timestamp with time zone,
created_at timestamp with time zone not null default now(),
updated_at timestamp with time zone not null default now());
create table public.delivery_portal_links (id uuid not null default gen_random_uuid(),
delivery_job_id uuid not null,
token_hash text not null,
expires_at timestamp with time zone not null,
used_at timestamp with time zone,
created_at timestamp with time zone not null default now());
create table public.exception_priority_evaluations (id uuid not null default gen_random_uuid(),
exception_id uuid not null,
priority_rule_id uuid,
calculated_priority text not null,
relevant_inputs jsonb not null default '{}'::jsonb,
explanation text not null,
evaluated_at timestamp with time zone not null default now());
create table public.portal_link_emails (id uuid not null default gen_random_uuid(),
delivery_job_id uuid not null,
portal_link_id uuid not null,
recipient_email text not null,
delivery_status text not null default 'PENDING'::text,
provider_message_id text,
sent_at timestamp with time zone,
created_at timestamp with time zone not null default now());
create table public.priority_rules (id uuid not null default gen_random_uuid(),
name text not null,
exception_type text not null,
conditions jsonb not null default '{}'::jsonb,
priority text not null,
explanation_template text not null,
sort_order integer not null default 100,
is_active boolean not null default true,
created_at timestamp with time zone not null default now(),
updated_at timestamp with time zone not null default now());
create table public.seller_portal_updates (id uuid not null default gen_random_uuid(),
complaint_id uuid,
delivery_job_id uuid not null,
seller_id uuid not null,
update_type text not null,
title text not null,
body text not null,
created_at timestamp with time zone not null default now(),
read_at timestamp with time zone);
create table public.seller_users (user_id uuid not null,
seller_id uuid not null,
full_name text,
role text not null default 'SELLER_STAFF'::text,
is_active boolean not null default true,
created_at timestamp with time zone not null default now(),
updated_at timestamp with time zone not null default now());
create table public.sellers (id uuid not null default gen_random_uuid(),
name text not null,
contact_name text,
contact_email text not null,
contact_phone text,
is_active boolean not null default true,
created_at timestamp with time zone not null default now(),
updated_at timestamp with time zone not null default now());
create table public.staff_profiles (user_id uuid not null,
full_name text not null,
role text not null,
is_active boolean not null default true,
created_at timestamp with time zone not null default now(),
updated_at timestamp with time zone not null default now());
alter table public.company_profile add constraint company_profile_pkey PRIMARY KEY (singleton);
alter table public.company_profile add constraint company_profile_singleton_check CHECK (singleton);
alter table public.priority_rules add constraint priority_rules_pkey PRIMARY KEY (id);
alter table public.priority_rules add constraint priority_rules_priority_check CHECK ((priority = ANY (ARRAY['LOW'::text, 'MEDIUM'::text, 'HIGH'::text, 'CRITICAL'::text])));
alter table public.exception_priority_evaluations add constraint exception_priority_evaluations_calculated_priority_check CHECK ((calculated_priority = ANY (ARRAY['LOW'::text, 'MEDIUM'::text, 'HIGH'::text, 'CRITICAL'::text])));
alter table public.exception_priority_evaluations add constraint exception_priority_evaluations_pkey PRIMARY KEY (id);
alter table public.delivery_portal_links add constraint delivery_portal_links_pkey PRIMARY KEY (id);
alter table public.delivery_portal_links add constraint delivery_portal_links_token_hash_key UNIQUE (token_hash);
alter table public.portal_link_emails add constraint portal_link_emails_delivery_status_check CHECK ((delivery_status = ANY (ARRAY['PENDING'::text, 'SENT'::text, 'FAILED'::text])));
alter table public.portal_link_emails add constraint portal_link_emails_pkey PRIMARY KEY (id);
alter table public.activity_logs add constraint activity_log_has_subject CHECK (((delivery_job_id IS NOT NULL) OR (delivery_exception_id IS NOT NULL) OR (complaint_id IS NOT NULL)));
alter table public.activity_logs add constraint activity_logs_actor_type_check CHECK ((actor_type = ANY (ARRAY['STAFF'::text, 'SYSTEM'::text, 'CUSTOMER'::text, 'SELLER'::text])));
alter table public.activity_logs add constraint activity_logs_pkey PRIMARY KEY (id);
alter table public.staff_profiles add constraint staff_profiles_pkey PRIMARY KEY (user_id);
alter table public.staff_profiles add constraint staff_profiles_role_check CHECK ((role = ANY (ARRAY['ADMIN'::text, 'OPERATIONS'::text, 'DELIVERY_PERSON'::text])));
alter table public.seller_users add constraint seller_users_pkey PRIMARY KEY (user_id);
alter table public.seller_users add constraint seller_users_role_check CHECK ((role = ANY (ARRAY['SELLER_ADMIN'::text, 'SELLER_STAFF'::text])));
alter table public.customer_profiles add constraint customer_profiles_pkey PRIMARY KEY (user_id);
alter table public.sellers add constraint sellers_pkey PRIMARY KEY (id);
alter table public.delivery_jobs add constraint delivery_jobs_id_seller_unique UNIQUE (id, seller_id);
alter table public.delivery_jobs add constraint delivery_jobs_pkey PRIMARY KEY (id);
alter table public.delivery_jobs add constraint delivery_jobs_status_check CHECK ((status = ANY (ARRAY['CREATED'::text, 'PICKED_UP'::text, 'IN_TRANSIT'::text, 'OUT_FOR_DELIVERY'::text, 'DELIVERY_FAILED'::text, 'DELIVERED'::text, 'RETURNED'::text, 'CANCELLED'::text])));
alter table public.delivery_jobs add constraint delivery_jobs_tracking_number_key UNIQUE (tracking_number);
alter table public.customer_delivery_access add constraint customer_delivery_access_customer_user_id_delivery_job_id_key UNIQUE (customer_user_id, delivery_job_id);
alter table public.customer_delivery_access add constraint customer_delivery_access_pkey PRIMARY KEY (id);
alter table public.delivery_events add constraint delivery_events_pkey PRIMARY KEY (id);
alter table public.delivery_events add constraint delivery_events_source_check CHECK ((source = ANY (ARRAY['COMPANY_SYSTEM'::text, 'SIMULATOR'::text, 'MANUAL'::text])));
alter table public.delivery_exceptions add constraint delivery_exceptions_pkey PRIMARY KEY (id);
alter table public.delivery_exceptions add constraint delivery_exceptions_priority_check CHECK ((priority = ANY (ARRAY['LOW'::text, 'MEDIUM'::text, 'HIGH'::text, 'CRITICAL'::text])));
alter table public.delivery_exceptions add constraint delivery_exceptions_status_check CHECK ((status = ANY (ARRAY['NEW'::text, 'ACTION_REQUIRED'::text, 'AWAITING_CUSTOMER'::text, 'AWAITING_SELLER'::text, 'IN_PROGRESS'::text, 'RESOLVED'::text, 'REOPENED'::text])));
alter table public.complaints add constraint complaints_category_check CHECK ((category = ANY (ARRAY['DELAY'::text, 'REFUND'::text, 'DAMAGE'::text, 'MISSING_ITEM'::text, 'WRONG_ITEM'::text, 'PACKAGE_MISSING'::text, 'OTHER'::text])));
alter table public.complaints add constraint complaints_category_confidence_check CHECK (((category_confidence >= (0)::numeric) AND (category_confidence <= (1)::numeric)));
alter table public.complaints add constraint complaints_complaint_reference_key UNIQUE (complaint_reference);
alter table public.complaints add constraint complaints_pkey PRIMARY KEY (id);
alter table public.complaints add constraint complaints_status_check CHECK ((status = ANY (ARRAY['NEW'::text, 'IN_REVIEW'::text, 'WAITING_FOR_SELLER'::text, 'RESOLVED'::text])));
alter table public.complaint_replies add constraint complaint_replies_author_type_check CHECK ((author_type = ANY (ARRAY['SYSTEM'::text, 'STAFF'::text])));
alter table public.complaint_replies add constraint complaint_replies_pkey PRIMARY KEY (id);
alter table public.complaint_replies add constraint complaint_replies_reply_type_check CHECK ((reply_type = ANY (ARRAY['DELAY_UPDATE'::text, 'GENERAL_UPDATE'::text, 'RESOLUTION'::text])));
alter table public.complaint_attachments add constraint complaint_attachments_file_size_bytes_check CHECK ((file_size_bytes > 0));
alter table public.complaint_attachments add constraint complaint_attachments_mime_type_check CHECK ((mime_type = ANY (ARRAY['image/jpeg'::text, 'image/png'::text, 'image/webp'::text])));
alter table public.complaint_attachments add constraint complaint_attachments_pkey PRIMARY KEY (id);
alter table public.complaint_attachments add constraint complaint_attachments_storage_path_key UNIQUE (storage_path);
alter table public.seller_portal_updates add constraint seller_portal_updates_pkey PRIMARY KEY (id);
alter table public.seller_portal_updates add constraint seller_portal_updates_update_type_check CHECK ((update_type = ANY (ARRAY['REFUND_REPORT'::text, 'EXCEPTION_UPDATE'::text])));
alter table public.exception_priority_evaluations add constraint exception_priority_evaluations_exception_id_fkey FOREIGN KEY (exception_id) REFERENCES delivery_exceptions(id) ON DELETE CASCADE;
alter table public.exception_priority_evaluations add constraint exception_priority_evaluations_priority_rule_id_fkey FOREIGN KEY (priority_rule_id) REFERENCES priority_rules(id) ON DELETE SET NULL;
alter table public.delivery_portal_links add constraint delivery_portal_links_delivery_job_id_fkey FOREIGN KEY (delivery_job_id) REFERENCES delivery_jobs(id) ON DELETE CASCADE;
alter table public.portal_link_emails add constraint portal_link_emails_delivery_job_id_fkey FOREIGN KEY (delivery_job_id) REFERENCES delivery_jobs(id) ON DELETE CASCADE;
alter table public.portal_link_emails add constraint portal_link_emails_portal_link_id_fkey FOREIGN KEY (portal_link_id) REFERENCES delivery_portal_links(id) ON DELETE CASCADE;
alter table public.activity_logs add constraint activity_logs_actor_user_id_fkey FOREIGN KEY (actor_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
alter table public.activity_logs add constraint activity_logs_complaint_id_fkey FOREIGN KEY (complaint_id) REFERENCES complaints(id) ON DELETE CASCADE;
alter table public.activity_logs add constraint activity_logs_delivery_exception_id_fkey FOREIGN KEY (delivery_exception_id) REFERENCES delivery_exceptions(id) ON DELETE CASCADE;
alter table public.activity_logs add constraint activity_logs_delivery_job_id_fkey FOREIGN KEY (delivery_job_id) REFERENCES delivery_jobs(id) ON DELETE CASCADE;
alter table public.staff_profiles add constraint staff_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.seller_users add constraint seller_users_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES sellers(id) ON DELETE CASCADE;
alter table public.seller_users add constraint seller_users_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.customer_profiles add constraint customer_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.delivery_jobs add constraint delivery_jobs_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES sellers(id) ON DELETE RESTRICT;
alter table public.customer_delivery_access add constraint customer_delivery_access_customer_user_id_fkey FOREIGN KEY (customer_user_id) REFERENCES customer_profiles(user_id) ON DELETE CASCADE;
alter table public.customer_delivery_access add constraint customer_delivery_access_delivery_job_id_fkey FOREIGN KEY (delivery_job_id) REFERENCES delivery_jobs(id) ON DELETE CASCADE;
alter table public.delivery_events add constraint delivery_events_delivery_job_id_fkey FOREIGN KEY (delivery_job_id) REFERENCES delivery_jobs(id) ON DELETE CASCADE;
alter table public.delivery_exceptions add constraint delivery_exceptions_assignee_user_id_fkey FOREIGN KEY (assignee_user_id) REFERENCES staff_profiles(user_id) ON DELETE SET NULL;
alter table public.delivery_exceptions add constraint delivery_exceptions_delivery_job_id_fkey FOREIGN KEY (delivery_job_id) REFERENCES delivery_jobs(id) ON DELETE CASCADE;
alter table public.delivery_exceptions add constraint delivery_exceptions_priority_rule_id_fkey FOREIGN KEY (priority_rule_id) REFERENCES priority_rules(id) ON DELETE SET NULL;
alter table public.delivery_exceptions add constraint delivery_exceptions_trigger_event_id_fkey FOREIGN KEY (trigger_event_id) REFERENCES delivery_events(id) ON DELETE SET NULL;
alter table public.complaints add constraint complaints_customer_user_id_fkey FOREIGN KEY (customer_user_id) REFERENCES customer_profiles(user_id) ON DELETE RESTRICT;
alter table public.complaints add constraint complaints_delivery_job_id_fkey FOREIGN KEY (delivery_job_id) REFERENCES delivery_jobs(id) ON DELETE CASCADE;
alter table public.complaint_replies add constraint complaint_replies_author_user_id_fkey FOREIGN KEY (author_user_id) REFERENCES staff_profiles(user_id) ON DELETE SET NULL;
alter table public.complaint_replies add constraint complaint_replies_complaint_id_fkey FOREIGN KEY (complaint_id) REFERENCES complaints(id) ON DELETE CASCADE;
alter table public.complaint_attachments add constraint complaint_attachments_complaint_id_fkey FOREIGN KEY (complaint_id) REFERENCES complaints(id) ON DELETE CASCADE;
alter table public.seller_portal_updates add constraint seller_portal_updates_complaint_id_fkey FOREIGN KEY (complaint_id) REFERENCES complaints(id) ON DELETE CASCADE;
alter table public.seller_portal_updates add constraint seller_portal_updates_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES sellers(id) ON DELETE CASCADE;
alter table public.seller_portal_updates add constraint seller_updates_job_seller_fk FOREIGN KEY (delivery_job_id, seller_id) REFERENCES delivery_jobs(id, seller_id) ON DELETE CASCADE;
alter table public.company_profile enable row level security; revoke all on public.company_profile from anon, authenticated;
alter table public.priority_rules enable row level security; revoke all on public.priority_rules from anon, authenticated;
alter table public.exception_priority_evaluations enable row level security; revoke all on public.exception_priority_evaluations from anon, authenticated;
alter table public.delivery_portal_links enable row level security; revoke all on public.delivery_portal_links from anon, authenticated;
alter table public.portal_link_emails enable row level security; revoke all on public.portal_link_emails from anon, authenticated;
alter table public.activity_logs enable row level security; revoke all on public.activity_logs from anon, authenticated;
alter table public.staff_profiles enable row level security; revoke all on public.staff_profiles from anon, authenticated;
alter table public.seller_users enable row level security; revoke all on public.seller_users from anon, authenticated;
alter table public.customer_profiles enable row level security; revoke all on public.customer_profiles from anon, authenticated;
alter table public.sellers enable row level security; revoke all on public.sellers from anon, authenticated;
alter table public.delivery_jobs enable row level security; revoke all on public.delivery_jobs from anon, authenticated;
alter table public.customer_delivery_access enable row level security; revoke all on public.customer_delivery_access from anon, authenticated;
alter table public.delivery_events enable row level security; revoke all on public.delivery_events from anon, authenticated;
alter table public.delivery_exceptions enable row level security; revoke all on public.delivery_exceptions from anon, authenticated;
alter table public.complaints enable row level security; revoke all on public.complaints from anon, authenticated;
alter table public.complaint_replies enable row level security; revoke all on public.complaint_replies from anon, authenticated;
alter table public.complaint_attachments enable row level security; revoke all on public.complaint_attachments from anon, authenticated;
alter table public.seller_portal_updates enable row level security; revoke all on public.seller_portal_updates from anon, authenticated;


CREATE UNIQUE INDEX delivery_jobs_seller_reference_unique ON public.delivery_jobs (seller_id, seller_order_reference) WHERE seller_order_reference IS NOT NULL;

CREATE UNIQUE INDEX delivery_events_source_dedup_idx ON public.delivery_events(source,source_event_id) WHERE source_event_id IS NOT NULL;
CREATE INDEX delivery_events_job_time_idx ON public.delivery_events(delivery_job_id,event_at DESC);
CREATE INDEX complaints_customer_time_idx ON public.complaints(customer_user_id,submitted_at DESC);
CREATE INDEX complaint_replies_complaint_time_idx ON public.complaint_replies(complaint_id,created_at);
CREATE INDEX seller_portal_updates_seller_time_idx ON public.seller_portal_updates(seller_id,created_at DESC);
