# Delivery Exception Operations

An exception-handling layer for **one delivery company** serving many sellers and customers. The existing delivery management system owns delivery creation and execution. This Next.js application handles exceptions, reports, portal replies, and seller refund-information handoffs.

See [Plan Changes and Implementation Status](PLAN_IMPLEMENTATION_STATUS.md) for the revised plan, implemented features, remaining work, and verification limits.

For another laptop or a new coding-agent session, start with [Teammate and Agent Handoff](TEAM_HANDOFF.md).

The customer portal is part of this same responsive Next.js website. There is no separate native mobile application.

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

### Optional Gemini apology drafts

Set server-only `GEMINI_API_KEY` and `GEMINI_MODEL` to a model available to your Google AI project. Gemini only drafts apology text. Staff reviews/edits it and separately publishes a portal reply. It cannot classify, route, assign, suggest next actions, or change statuses. Missing configuration or provider failure leaves manual composition available.

## Workflows

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

After an account has signed in, assign roles using a trusted administrator connection. Confirm the user UUID in Supabase Auth; never accept a role assignment from the browser. Example SQL with placeholders:

```sql
insert into public.staff_profiles(user_id, full_name, role)
values ('<confirmed-user-uuid>'::uuid, 'Operations member', 'OPERATIONS');

insert into public.seller_users(user_id, seller_id, full_name)
select '<confirmed-seller-user-uuid>'::uuid, id, 'Seller member'
from public.sellers where external_seller_id = 'demo-lotus';
```

The application does not need a service-role key for normal workflows. User-scoped server clients and RLS enforce reads; private guarded transaction functions validate mutations. Evidence uses the private `report-evidence` Storage bucket and short-lived authorized downloads.

## Structure and rules

- `src/app/`: Next.js routes, OAuth callback, API handlers, staff layout gate.
- `src/features/portal/components/`: connected customer, seller, operations, detail, and simulator views.
- `src/core/domain/exception-rules.ts`: deterministic classification preview, explainable guidance, summaries, SLA, and transition definitions.
- `src/infrastructure/portal/`: typed shared data adapter; no local-data fallback.
- `src/infrastructure/supabase/`: generated types, browser/server cookie clients.
- `src/infrastructure/ai/apology.server.ts`: server-only direct Gemini text drafting.
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

Run `supabase/tests/portal_workflows.sql` through a trusted SQL connection for transaction/RLS assertions. Its temporary users and test records are rolled back. `supabase/tests/evidence_access.sql` checks evidence metadata and storage visibility. A real Google consent/login and live Gemini output require the user's account and configured credentials, and remain manual verification steps. Phase 4 is not marked complete.
