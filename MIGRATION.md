# Phase 3 implementation inventory

The 22 October 2026 driver/proactive extension is additive: five tables, private role-checked RPCs/RLS, protected driver and operations condition views, existing exception detail integration, and complaint-independent customer publications/read state. Three tracked migrations are applied to the confirmed shared demo project and generated types are synchronized. See [Driver workflow](DRIVER_WORKFLOW.md) for exact migration versions, historical assignment semantics, publication integrity, and unverified live journeys. No authoritative source-system adapter or account-role provisioning is implied.

Current integration combines the backend Groq/Phase 4 continuation (`9b0369e`) with the teammate's Radix Themes UI already merged into shared `nextjs-migration` (`c37c6a8`). The integration branch is `backend/groq-phase4-integration`. Radix theme tokens/shared patterns replace the older UI presentation while preserving Supabase data paths, role gates, rule-based guidance, evidence boundaries, and staff-reviewed Groq drafting. Combined-check results are recorded in implementation status; prior UI acceptance is not automatically proof of the merged UI.

## Product boundary

One delivery company, many sellers and customers. The same Next.js app hosts all portals. This application consumes minimal source context for exception handling; it does not create deliveries, dispatch couriers, execute refunds, or expose full tracking history.

## Complaint analytics

The owner authorized `/analytics` and an expansion of Groq to read-only explanations of verified aggregate complaint statistics. Daily/weekly/monthly reporting uses `Asia/Rangoon`, Monday-start weeks, and exclusive end boundaries. Ongoing periods compare equal elapsed time capped at the previous period's length; completed periods compare whole calendar periods. Category/seller filters apply to all metrics; status/interval filters narrow only the complaint table.

Intake uses `submitted_at`. Resolution counts distinct complaints with the existing explicit `Report status changed to RESOLVED.` history event, including older/reopened complaints; reply-history rows carrying a resolved status do not count. This relies on the current guarded command's stable event description because history has no event-type column. Open workload is a current snapshot. Median first response includes only answered intake-cohort reports and the earliest published reply available now, including replies after the selected period; private drafts and notes never count. Status/category breakdowns use current values, so historical views can change after corrections/transitions. Seller counts have no delivery-volume denominator.

No schema migration is needed. `/api/analytics` uses authenticated user-scoped clients, checks active ADMIN/OPERATIONS membership before reading, and retains existing RLS. The server scans minimal metadata with keyset pagination, returns only a 20-row complaint page plus aggregates, and fails visibly above 20,000 rows per source table rather than truncating results. These multi-request reads are not an atomic database snapshot; database aggregation is required for larger production datasets. No privileged key or browser-local business data is used.

`POST /api/analytics/summary` checks same origin/staff access, reloads its own facts instead of trusting a client-supplied payload, and sends only aggregates/fixed-category findings to Groq. Summaries are not saved or published; there are no operational commands. Provider failure leaves deterministic insights available. A one-request-per-minute per-user throttle is process-local, not a distributed production quota. Model prose is labeled and requires human interpretation; no claim of factual verification of every generated sentence is made. No live provider call or database write is implied by automated tests.

## What changed

Active routes now use Supabase persistence with RLS and guarded transaction functions. Customer access uses Google OAuth with cookie-based sessions. Customers explicitly provision fictional account-owned orders for the hackathon, select an order, submit a report, and read history/status/replies. Operations has backend membership checks, a connected inbox/detail page, assignment, audited statuses, private notes, customer replies, and seller updates. Sellers see their own minimal exception projection and refund handoffs.

Order ownership is stored in customer_delivery_access. Source IDs, provenance, receipt/source timestamps, and ingestion results live with delivery context/events. The simulator rejects non-demo contexts, deduplicates event IDs, and records out-of-order or missing-time updates without overwriting current state.

## Deterministic rules

`reports-v1` matches documented English keywords: delay/delayed/late/overdue; damage/damaged/broken/crushed/leaking; missing item/item missing/incomplete; wrong/incorrect/different item; not received/never arrived/package missing/parcel missing/not delivered. No single matching issue, or multiple issues, enters OTHER/manual review. Refund/reimburse/reimbursement is a separate intent. Refund intent creates one seller handoff without copying customer conversations or approving a payment.

Damage/missing-item/wrong-item reports require DELIVERED source context. Delays can be reported before delivery. Cancelled orders require staff assistance. Missing or >48-hour-old source timestamps and delay/delivered conflicts are marked for review. These are hackathon policy defaults, not externally confirmed operational policies.

`guidance-v1` checks missing/stale/future/ambiguous/unsupported context first, then refund handoff, then delivered-but-not-received confirmation when details exist, then delay/evidence review. Suggestions and summaries are pure functions. Staff must explicitly execute a permitted action. SLA defaults remain critical/high/medium/low = 2/8/24/48 hours from opening; resolved cases are excluded.

Groq (`openai/gpt-oss-120b`) replaces Gemini and only drafts apologies using minimal report text/category/status. Credentials stay server-side, drafts are saved separately from published replies, and staff must review/edit and explicitly publish. The LLM never influences rules, suggestions, routing, priority, or transitions.

## Migration artifacts

- `supabase/bootstrap.sql`: pre-existing schema snapshot for empty projects only.
- `supabase/migrations/`: applied schema, access-policy, and transaction changes, including verification-driven corrections.
- `src/infrastructure/supabase/types.ts`: generated from the configured project.
- `supabase/tests/portal_workflows.sql`: rollback-only role/ownership/workflow/ingestion assertions.
- `supabase/tests/evidence_access.sql`: rollback-only evidence policy assertions.
- `scripts/verify-portals.mjs`: explicit authenticated UI fixtures plus real unauthenticated API check.
- `scripts/verify-google-live.mjs`: participant-driven live Google/customer checks; automated Chrome sign-in was blocked in the recorded run, so its authenticated checks did not complete.
- `supabase/tests/customer_isolation.sql`: bounded two-customer RLS/RPC assertions with rolled-back synthetic identities and records.
- `supabase/tests/operations_customer_reply.sql`: bounded operations note/status/reply/audience assertions with rolled-back synthetic identities and records.
- `supabase/tests/seller_isolation.sql`: resumed Phase 4 assertions for both sellers' positive controls, cross-seller table/projection isolation, private audiences, denied commands/direct writes, inactive membership, and metadata isolation. Passed against the confirmed shared demo project; synthetic rows/memberships rolled back. Two-seller Google/browser acceptance remains separate.

Historical Drizzle migrations and legacy browser-demo modules are not the active data path. No existing business records were migrated; the connected project's business tables were empty before Phase 3 implementation. Phase 3 persistently seeded labeled demo sellers. Subsequent authorized participant verification created persistent demo business records and approved memberships; these differ from synthetic SQL fixtures, which roll back. Reference sequences may advance despite rollback. No schema migrations were added during this bounded verification continuation.

## Remaining external setup and verification

The 21 October 2026 checkpoint records participant-reported regular-browser Google login/sign-out and customer reports, operations notes/status/manual replies with customer audience checks, and Lotus Home seller refund-handoff visibility/privacy checks. An active operations membership and Lotus Home `SELLER_STAFF` membership were explicitly approved, created, and verified against confirmed project `gvutlnfsiytnayvdxqyb`. The new bounded customer-isolation and operations/customer-reply SQL tests passed separately with synthetic identities. These are distinct evidence sources; neither establishes overall Phase 4 completion.

The owner stopped verification before cross-seller isolation. No second River Books participant account was nominated or assigned. Real browser evidence upload/download, unread clearing, deployed Google redirects, live Gemini with confirmed GEMINI_API_KEY/GEMINI_MODEL, and final acceptance remain pending. Actual source-system transport, identity mapping, retention policies, SLA policy, and seller acknowledgment requirements remain unconfirmed. Resume only after new task authorization; see [implementation status](PLAN_IMPLEMENTATION_STATUS.md) and [handoff](TEAM_HANDOFF.md).

The browser fixture checks do not verify real Google sessions or live Gemini. Source-system simulation is not a production integration. Phase 4 remains separate; do not represent it as completed.

Subsequent authorized continuation completed bounded local cross-seller browser acceptance based on participant reports: River Books and Lotus Home each retain their own findings and exclude the other's records after refresh. River Books positive control is `RPT-2026-000017` / `DEMO-000080`, with persisted operations findings and an audit event. Separate rollback-only `seller_isolation.sql` assertions passed. Approved additional River Books seller and operations memberships persist. The local server's sandbox network restriction was identified as an OAuth exchange blocker and resolved by running Next.js with approved network access; the participant then confirmed Google login. Customer evidence upload/reopen and audience verification is the current next check; unread, Gemini, deployed OAuth, and final acceptance remain pending. See the resumed checkpoint in implementation status for evidence limits. Phase 4 is incomplete.

The participant subsequently confirmed customer evidence upload/reopen after refresh, operations image access, and denied evidence access for both sellers on `RPT-2026-000018` / `DEMO-000078`. Backend checks confirmed attachment metadata/object in a private bucket. The participant also confirmed manual-reply unread indicator, opening/clearing, and persistence after refresh; backend read-back confirms one reply, one reply audit, and read marker after the reply with unchanged report/source statuses. Live Gemini remains unconfigured locally; the intended final acceptance environment is being confirmed. Deployed OAuth and final responsive/accessibility/security acceptance remain outstanding.

The owner subsequently selected local-only acceptance and replaced location-blocked Gemini with Groq `openai/gpt-oss-120b`. Active server variables are `GROQ_API_KEY` and `GROQ_MODEL`. The direct Chat Completions adapter supplies no tools, omits reasoning from returned GPT-OSS output, and rejects incomplete/non-text responses. A real generation with fictional context passed; staff browser review/edit/explicit-publication acceptance remains separate. Migration `20261021134148_provider_neutral_apology_audit.sql` changes future draft audit wording without rewriting applied history. Rollback-only `supabase/tests/apology_drafts.sql` passed; generated database types require no change because no public schema/signature changed. All 125 tests passed. Deployed OAuth is deferred; local final acceptance and the staff-reviewed live Groq workflow remain pending.
