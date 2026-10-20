# ResolveIQ migration inventory

## Current scope
Cloud email/password accounts are real; complaint records, orders, staff actions, and carrier calls remain explicitly simulated and browser-local. Local demo sign-in is separate, user-editable simulated state, not authorization. Never reuse a real password in demo mode.

## Portable business rules
`src/lib/demo/` contains framework-independent TypeScript models, carrier normalization, priority evaluation, workflow transitions, SLA evaluation, customer projections, complaint validation, and reference allocation. Functions accept records and explicit times where relevant. Move them into server-side domain modules without changing the UI contracts. Salted SHA-256 demo credentials must be discarded, never migrated as production credentials.

## Adapters to replace
`src/lib/services/platform.ts` is the complaint/operations data boundary; `demo-store.ts` handles browser subscriptions and versioned persistence. Replace these with owner-scoped hosted queries/mutations. Replace `demo-auth.ts` with production sessions; preserve Cloud Auth or migrate identities through a supported identity migration process. Presentational UI must not access storage directly.

## Production requirements
- Enforce authentication and order ownership on the server with owner-only database access. Current per-identity fictional order provisioning is a demo convenience, not proof of ownership.
- Use one database transaction to validate delivery, insert a complaint, and allocate its reference. Current same-origin Web Locks serialize browser complaint saves; older unsupported browsers refuse saves. Never rely on localStorage or Web Locks for production authorization or durability.
- Store photos in private object storage, validate decoded content and limits server-side, and authorize downloads. Data URLs currently consume browser quota; quota failures are reported without partial counter writes.
- Preserve public-response/private-note separation and customer projections. Store seen versions per customer; do not send audit records or internal notes to customers.
- Replace simulated carrier messages/inquiries with authorized integrations and durable idempotency keys. Mingala datetimes use Myanmar UTC+06:30.
- SLA defaults are configurable (2/8/24/48 hours by priority). Deadline uses original opening plus current priority; closed/ignored exceptions are excluded. Confirm this operational policy before production.
- Apply profile migrations and verify signup triggers. Email confirmation remains required; no automatic confirmation was enabled.

## Framework adaptation
The existing app remains TanStack Start. A future Next.js migration would replace route definitions, head metadata, route error handling, and query/session integration—not the business rules. Browser storage stays behind client-only adapters; server secrets remain within server execution boundaries.

## Checks
Run `bunx vitest run`. Exercise cloud and local sign-in separately, submit a complaint, read it in staff review, publish a public reply/private note, verify customer unread state, refresh, and check 390px screens. Reset Demo Data clears records and legacy complaint storage while retaining separately managed demo accounts.