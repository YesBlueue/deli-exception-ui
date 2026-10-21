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

Historical Drizzle migrations and legacy browser-demo modules are not the active data path. No existing business records were migrated; the connected project's business tables were empty before implementation. Only labeled demo seller fixtures are persistently seeded by this work; verification users/reports are rolled back.

## Remaining external setup and verification

Google is enabled in the connected project's Auth settings. Real consent/callback/login remains a manual account interaction; verify the deployed redirect allowlist and Google consent configuration. Staff/seller memberships require confirmed user UUIDs. Supply GEMINI_API_KEY and GEMINI_MODEL for live drafting. Actual source-system transport, identity mapping, retention policies, SLA policy, and seller acknowledgment requirements remain unconfirmed.

The browser fixture checks do not verify real Google sessions or live Gemini. Source-system simulation is not a production integration. Phase 4 remains separate; do not represent it as completed.
