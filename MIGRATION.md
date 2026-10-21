# Phase 3 implementation inventory

## Product boundary

One delivery company, many sellers and customers. The same Next.js app hosts all portals. This application consumes minimal source context for exception handling; it does not create deliveries, dispatch couriers, execute refunds, or expose full tracking history.

## What changed

Active routes now use Supabase persistence with RLS and guarded transaction functions. Customer access uses Google OAuth with cookie-based sessions. Customers explicitly provision fictional account-owned orders for the hackathon, select an order, submit a report, and read history/status/replies. Operations has backend membership checks, a connected inbox/detail page, assignment, audited statuses, private notes, customer replies, and seller updates. Sellers see their own minimal exception projection and refund handoffs.

Order ownership is stored in customer_delivery_access. Source IDs, provenance, receipt/source timestamps, and ingestion results live with delivery context/events. The simulator rejects non-demo contexts, deduplicates event IDs, and records out-of-order or missing-time updates without overwriting current state.

## Deterministic rules

`reports-v1` matches documented English keywords: delay/delayed/late/overdue; damage/damaged/broken/crushed/leaking; missing item/item missing/incomplete; wrong/incorrect/different item; not received/never arrived/package missing/parcel missing/not delivered. No single matching issue, or multiple issues, enters OTHER/manual review. Refund/reimburse/reimbursement is a separate intent. Refund intent creates one seller handoff without copying customer conversations or approving a payment.

Damage/missing-item/wrong-item reports require DELIVERED source context. Delays can be reported before delivery. Cancelled orders require staff assistance. Missing or >48-hour-old source timestamps and delay/delivered conflicts are marked for review. These are hackathon policy defaults, not externally confirmed operational policies.

`guidance-v1` checks missing/stale/future/ambiguous/unsupported context first, then refund handoff, then delivered-but-not-received confirmation when details exist, then delay/evidence review. Suggestions and summaries are pure functions. Staff must explicitly execute a permitted action. SLA defaults remain critical/high/medium/low = 2/8/24/48 hours from opening; resolved cases are excluded.

Gemini only drafts apologies using minimal report text/category/status. Credentials stay server-side, drafts are saved separately from published replies, and staff must review/edit and explicitly publish. Gemini never influences rules, suggestions, routing, priority, or transitions.

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

Historical Drizzle migrations and legacy browser-demo modules are not the active data path. No existing business records were migrated; the connected project's business tables were empty before Phase 3 implementation. Phase 3 persistently seeded labeled demo sellers. Subsequent authorized participant verification created persistent demo business records and approved memberships; these differ from synthetic SQL fixtures, which roll back. Reference sequences may advance despite rollback. No schema migrations were added during this bounded verification continuation.

## Remaining external setup and verification

The 21 October 2026 checkpoint records participant-reported regular-browser Google login/sign-out and customer reports, operations notes/status/manual replies with customer audience checks, and Lotus Home seller refund-handoff visibility/privacy checks. An active operations membership and Lotus Home `SELLER_STAFF` membership were explicitly approved, created, and verified against confirmed project `gvutlnfsiytnayvdxqyb`. The new bounded customer-isolation and operations/customer-reply SQL tests passed separately with synthetic identities. These are distinct evidence sources; neither establishes overall Phase 4 completion.

The owner stopped verification before cross-seller isolation. No second River Books participant account was nominated or assigned. Real browser evidence upload/download, unread clearing, deployed Google redirects, live Gemini with confirmed GEMINI_API_KEY/GEMINI_MODEL, and final acceptance remain pending. Actual source-system transport, identity mapping, retention policies, SLA policy, and seller acknowledgment requirements remain unconfirmed. Resume only after new task authorization; see [implementation status](PLAN_IMPLEMENTATION_STATUS.md) and [handoff](TEAM_HANDOFF.md).

The browser fixture checks do not verify real Google sessions or live Gemini. Source-system simulation is not a production integration. Phase 4 remains separate; do not represent it as completed.
