# Delivery Exception Operations

An exception-handling layer for **one delivery company** serving many sellers and customers. The existing delivery management system owns delivery creation and execution. This Next.js application handles exceptions, reports, portal replies, and seller refund-information handoffs.

See [Plan Changes and Implementation Status](PLAN_IMPLEMENTATION_STATUS.md) for the revised plan, implemented features, remaining work, and verification limits.

The driver/proactive extension adds `/driver` for assigned-delivery exception/condition reporting and `/conditions` for operations review. Historical assignments determine affected packages; staff explicitly publishes reviewed updates to authorized customer portals with unread state. It uses five new tables and the existing design system. See [Driver workflow](DRIVER_WORKFLOW.md) for setup, demo reassignment scenarios, safeguards, provisional policy, and acceptance limits. Driver roles must be assigned by trusted administration; none are granted automatically.

For local driver testing, the owner-approved synthetic accounts can sign in at `/driver-test-login` while running `npm run dev`. Credentials live only in ignored `artifacts/driver-test-accounts.json`. That page returns 404 in production; normal customer sign-in remains Google.

For another laptop or a new coding-agent session, start with [Teammate and Agent Handoff](TEAM_HANDOFF.md).

The customer portal is part of this same responsive Next.js website. There is no separate native mobile application.

The combined backend/Groq and Radix Themes UI work is on `backend/groq-phase4-integration`, based on the UI already merged into shared `nextjs-migration` at `c37c6a8`. Use that review branch to continue the combined implementation. Its 125 tests, typecheck, production build, resolved/backend-file lint, and explicit fixture browser checks passed; remaining live acceptance gates are documented in the implementation status.

## Run locally

```sh
npm install
npm run dev
```

Copy `.env.example` to `.env.local` or `.env` and set:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

Restart Next.js after changing environment variables. Public values are embedded at build time; rebuild deployed applications after changing them. Never use a service-role or secret key in `NEXT_PUBLIC_*` variables.

### Google authentication

Enable Google in Supabase Auth. Configure Google's authorized redirect URI to the Supabase provider callback shown in the dashboard. Add your application's `/auth/callback` URL (for example `http://localhost:3000/auth/callback`) to Supabase's redirect allowlist, and configure the site URL for the environment.

The first Google sign-in creates an account. Next.js exchanges the OAuth code using cookie-based PKCE sessions. Staff and seller permissions come from database memberships, not Google profile metadata. All users can sign in through `/login`.

### Optional Groq apology drafts

Set server-only `GROQ_API_KEY` to your Groq key and `GROQ_MODEL=openai/gpt-oss-120b`. Groq replaces Gemini and only drafts apology or cautious proactive delay wording. Staff reviews/edits it and explicitly publishes the reviewed portal message. It cannot classify, select affected packages/recipients, route, assign, suggest next actions, or change statuses. Missing configuration or provider failure leaves template/manual composition available. Requests use Groq Chat Completions without tools, disable returned reasoning for GPT-OSS, and accept only a complete text response.

The real Groq adapter passed a generation check using fictional context. This does not establish the staff browser draft/edit/publish gate; verify that generating a draft creates no customer reply before explicitly publishing the edited text. `supabase/tests/apology_drafts.sql` separately verifies private draft persistence, model/audit metadata, and unchanged operational state with rolled-back fixtures. Earlier Gemini setup/checkpoints below are historical and no longer configure active drafting.

## Workflows

- **Operations `/analytics`:** daily, Monday-start weekly and calendar-month complaint statistics in `Asia/Rangoon`. Includes intake/comparison counts, explicit resolution events, current open workload, median first published response for answered intake-cohort complaints, charts, calculated insights, seller/category filters and paginated complaint links. Filters are bookmarkable. Optional **Generate summary** uses existing server-only Groq settings and aggregate statistics only; it cannot recommend or execute workflow actions. Calculated insights remain available without Groq. See [analytics implementation notes](MIGRATION.md#complaint-analytics).

- **Customer `/customer/complaint`:** Google sign-in, authorized order selection, report submission with optional private evidence, report/status history, replies, unread indicators.
- **Operations `/overview`, `/dashboard`, `/exceptions/[id]`, `/requests`:** exception metrics, filters, dedicated investigation page, rule explanations, assignment, audited transitions, private notes, report correction, customer replies, and seller updates.
- **Seller `/seller`:** seller-scoped exception context and refund handoffs. Sellers cannot create deliveries. Customer conversations, staff notes, and attachments are not shared by default.
- **Source simulator `/demo/events`:** operations-only simulated incoming source updates. Duplicate IDs, older timestamps, and missing timestamps are handled explicitly.
- Old customer preview links redirect to the authenticated customer app and do not grant access.

Updates appear in portals. There is no product email sender, refund/payment processing, dispatch interface, or complete tracking timeline.

## Hackathon demo data

After Google sign-in, a customer explicitly chooses **Load my demo orders**. A guarded database transaction provisions four fictional order contexts from Lotus Home and River Books, associated only with that account. Repeated provisioning is idempotent. Data provenance is `DEMO`; source IDs and receipt timestamps are recorded.

Orders, reports, messages, notes, and seller updates are shared Supabase records, not browser-local business data. Failed requests show errors and never fall back to demo records. The actual company's data interface remains unconfirmed; the simulator is its stand-in.

Demo provisioning and simulation are controlled by `exception_private.settings.demo_enabled`. Disable that flag before integrating real source data. An administrator must establish real customer-to-order associations; this app never proves ownership from an order reference or editable email metadata.

## Database and memberships

The configured existing project has the Phase 3 migrations applied. `supabase/migrations/` tracks the changes. For a **fresh, empty** Supabase project, first run `supabase/bootstrap.sql` in its SQL editor, then apply the migrations in filename order. Do not run the bootstrap over an existing database. Historical `drizzle/` files are not the active migration path.

### Account and membership confirmation checklist

Complete this checklist for the agreed demo environment before real-user portal verification:

1. Ask each participant to sign in through `/login` with the Google account they will use. Record whether the account is a customer, operations staff member, or seller user, and confirm the intended seller for seller users.
2. In Supabase Dashboard → Authentication → Users, find each signed-in account and confirm its email with that participant. Copy the Auth user UUID from the same row. Do not use a UUID, email, role, or seller association supplied only by browser metadata.
3. Review the account-to-role mapping with the project owner. Operations accounts need `ADMIN` or `OPERATIONS`; seller accounts need membership for the correct seller. Customer accounts need no staff or seller membership.
4. Using a trusted administrator connection, create the approved memberships below. Do not run these inserts from the application or expose administrator credentials to the browser.
5. Have each participant sign out and back in, then verify the expected portal access: customer accounts see only associated orders, operations accounts can enter operations pages, and seller accounts see only their seller's data. Also test that an unassigned account is denied staff and seller access.
6. Record which environment and accounts were checked, the resulting access outcome, and any unresolved account or membership issue before starting Phase 4 verification.

If an account cannot be matched confidently to its owner or intended seller, leave it unassigned until the project owner resolves the mismatch.

Example membership SQL with confirmed UUID placeholders:

```sql
insert into public.staff_profiles(user_id, full_name, role)
values ('<confirmed-user-uuid>'::uuid, 'Operations member', 'OPERATIONS');

insert into public.seller_users(user_id, seller_id, full_name)
select '<confirmed-seller-user-uuid>'::uuid, id, 'Seller member'
from public.sellers where external_seller_id = 'demo-lotus';
```

The application does not need a service-role key for normal workflows. User-scoped server clients and RLS enforce reads; private guarded transaction functions validate mutations. Evidence uses the private `report-evidence` Storage bucket and short-lived authorized downloads.

## Structure and rules

### Shared visual system

The portals use Radix Themes with shared layout/form/table patterns in `src/shared/ui/patterns`. Theme settings are in `src/shared/theme.ts`; navy/orange brand and status tokens are in `src/styles/globals.css`. The development-only `/design-system` page shows the components and patterns. Follow the design rules in `AGENTS.md` when extending UI; keep the connected Supabase adapters and explicit staff actions intact.

- `src/app/`: Next.js routes, OAuth callback, API handlers, staff layout gate.
- `src/features/portal/components/`: connected customer, seller, operations, detail, and simulator views.
- `src/core/domain/exception-rules.ts`: deterministic classification preview, explainable guidance, summaries, SLA, and transition definitions.
- `src/infrastructure/portal/`: typed shared data adapter; no local-data fallback.
- `src/infrastructure/supabase/`: generated types, browser/server cookie clients.
- `src/infrastructure/ai/apology.server.ts`: server-only direct Groq text drafting.
- `src/shared/` and `src/styles/globals.css`: preserved design system. IBM Plex fonts are self-hosted.

Legacy browser-demo modules remain for historical tests/reference. Active portal routes no longer use them. See `MIGRATION.md` for boundaries, rule definitions, and verification limits.

## Verification

```sh
npm test
npm run typecheck
npm run lint
npm run build
npm start -- --port 3004
node scripts/verify-portals.mjs
```

The browser script uses installed Google Chrome. It checks the real unauthenticated API boundary, then explicitly mocked authenticated UI fixtures at 390px and desktop widths; it does not claim live Google sign-in. Screenshots are written to ignored `artifacts/phase3/`.

For participant-driven live Google verification in the confirmed shared demo project, start the app at `http://localhost:3000`, then run in PowerShell:

```powershell
$env:PORTAL_LIVE_PROJECT = 'gvutlnfsiytnayvdxqyb'
node scripts/verify-google-live.mjs
```

The script checks that local Supabase configuration matches that project before opening a dedicated Chrome window. Complete Google sign-in yourself with a customer account that has no staff or seller membership. Choose **Load my demo orders** if offered; this explicitly creates account-owned fictional records. After the script reports that order-access checks passed, click **Sign out** to finish. The run waits up to 15 minutes for participant actions. Google may reject an automated browser; record that as a blocker rather than bypassing its checks.

This script uses real requests without fixtures. It checks the OAuth callback, verified Google identity, reload persistence, backend order associations, selectable demo orders, denial of a fresh unassociated order ID, and sign-out. It writes a sanitized result to ignored `artifacts/phase4/google-live.json`; it does not save credentials, callback URLs, browser storage, or screenshots. Its denial probe uses a nonexistent UUID, so it does not prove cross-customer isolation. That requires a separate two-account acceptance run. Successful execution does not establish Phase 4 completion.

Run `supabase/tests/portal_workflows.sql` through a trusted SQL connection for transaction/RLS assertions. Its temporary users and test records are rolled back. `supabase/tests/evidence_access.sql` checks evidence metadata and storage visibility. Google browser acceptance uses participant-controlled accounts; live Groq requires confirmed server credentials/model. Phase 4 is not marked complete.

For bounded backend customer authorization checks, use `supabase/tests/customer_isolation.sql` against the confirmed demo project. It tests two synthetic authenticated identities against real RLS and guarded commands, including owned submissions, cross-customer read/submission/read-state denial, direct ownership-claim/update denial, and editable-metadata isolation. Its fixture rows roll back; PostgreSQL reference sequences may still advance. It does not verify Google tokens or replace real-session HTTP acceptance checks.

`supabase/tests/operations_customer_reply.sql` checks operations private notes, report status, explicit reply publication, audit records, customer audience boundaries, denied customer staff commands, and independent source status. Run through a trusted SQL connection against the agreed demo project. Synthetic fixture rows roll back; reference sequences may advance. Real staff/customer browser journeys remain separate acceptance checks.

### Verification stop checkpoint: 21 October 2026

**Later continuation:** the owner resumed Phase 4 at cross-seller isolation. `supabase/tests/seller_isolation.sql` passed against the confirmed shared demo project using synthetic identities with rolled-back records and memberships. It checks both sellers' positive controls, cross-seller tables/projections, private audiences, denied commands/direct writes, inactive membership, and metadata isolation. Separately, a real River Books seller and additional operations participant were verified and assigned approved memberships. Customer report `RPT-2026-000017` / `DEMO-000080` and audited seller findings persisted. The participant confirmed both seller refresh checks: each sees its own findings and excludes the other's records. Evidence upload/reopen, operations access, both seller denials, and unread reply clearing/persistence also passed as participant-reported local checks on `RPT-2026-000018`, with supporting metadata/reply/read-state read-backs. Live Gemini, deployed OAuth, and final acceptance remain pending. See the resumed checkpoint in [implementation status](PLAN_IMPLEMENTATION_STATUS.md#resumed-seller-isolation-verification-21-october-2026); the stopped state below is historical. Phase 4 remains incomplete.

The owner stopped verification after participant-confirmed local customer Google login/report/persistence/sign-out, customer UI isolation, operations-to-customer notes/status/manual replies and privacy/access checks, and Lotus Home seller handoff visibility/privacy/access checks. Customer-isolation and operations/customer-reply SQL assertions passed separately against confirmed demo project `gvutlnfsiytnayvdxqyb`. Automated Chrome Google sign-in was blocked; the live script did not complete its authenticated checks.

Approved active operations and Lotus Home seller memberships remain in that shared project, along with participant-created demo records. No schema change was made. Cross-seller isolation, real browser evidence/unread checks, deployed OAuth configuration, live Gemini, and final acceptance remain outstanding. Do not resume testing or membership/database changes without new task authorization. See [implementation status](PLAN_IMPLEMENTATION_STATUS.md) for evidence limits and [team handoff](TEAM_HANDOFF.md) for uncommitted artifacts. Phase 4 remains incomplete.
