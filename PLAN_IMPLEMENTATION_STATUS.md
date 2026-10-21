# Plan Changes and Implementation Status

Last updated: 21 October 2026

Branch: `nextjs-migration`

This document connects the revised product plan to the current implementation. It separates unfinished code from external configuration and verification work. It records the status after Phase 3; it does not declare Phase 4 or production readiness complete.

## 1. Current product scope

The application is an exception-handling layer for **one delivery company**, serving many e-commerce sellers and their customers.

The company's existing delivery management system owns delivery creation, routing, dispatch, execution, and authoritative delivery status. This application uses the relevant order/delivery context to investigate exceptions and customer reports.

All three portals are part of the existing responsive Next.js website:

- Customers sign in with Google, choose an authorized order, submit a report, and view status/history/replies.
- Operations staff triage, assign, investigate, and resolve exceptions; publish customer replies and seller updates.
- Sellers view their own relevant exceptions and refund-information handoffs.

For the hackathon, delivery context is explicitly labeled demo data. Shared records are stored in Supabase. Simulation represents data that would eventually come from the existing delivery system; it is not a live integration.

## 2. What changed in the plan

| Earlier direction or assumption                                  | Confirmed replacement                                           | Why it changed                                                                           |
| ---------------------------------------------------------------- | --------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| One shop coordinating several carriers                           | One delivery company serving multiple sellers                   | The product is not a multi-carrier aggregator.                                           |
| Sellers submit deliveries through this application               | Sellers view relevant exceptions, updates, and refund handoffs  | Delivery creation belongs to the existing delivery system.                               |
| Our app owns delivery records and their full lifecycle           | Local records are minimal received/simulated source projections | Exception handling must not become a replacement delivery-management system.             |
| Invitation/access links are central to customer entry            | Google sign-in followed by authorized order selection           | Customer account ownership is the core access model.                                     |
| Email/password forms and separate local demo accounts            | Google authentication through Supabase                          | The confirmed customer experience uses Google accounts.                                  |
| A potentially separate customer mobile app                       | Customer pages in the same responsive Next.js website           | No native mobile application is required.                                                |
| All complaints require completed delivery                        | Category-specific eligibility                                   | Delays and non-receipt can occur before a delivery is marked complete.                   |
| AI-assisted classification, routing, or broad support generation | Deterministic rules; Gemini only drafts apology letters         | Operational decisions must be explainable and independent of AI output.                  |
| Suggested actions may resemble automatic operations              | Read-only rule guidance; staff explicitly executes an action    | Showing a suggestion must not contact anyone or mutate a workflow.                       |
| Refund templates promise approval/payment timing                 | Delivery findings are relayed to the seller portal              | Refund decisions, payment execution, and seller/customer negotiations are outside scope. |
| Replies or operational updates sent by email/SMS                 | Replies and updates appear in the appropriate portal            | Optional emails may direct customers to the app, not deliver case updates.               |
| Business records stored in browser-local demo state              | Shared Supabase persistence with authenticated access           | Customer, staff, and seller workflows need shared records and backend access controls.   |
| Lovable runtime services and AI gateway                          | Next.js, Supabase, and a direct server-side Gemini integration  | The project no longer uses Lovable services.                                             |
| General delivery/carrier dashboard                               | Exception-focused metrics and investigation context             | Staff needs exception workload information, not a complete tracking dashboard.           |

The design-system requirement did not change: preserve colors, typography, spacing, shared components, layout conventions, and responsive behavior.

## 3. Implemented according to the revised plan

“Implemented” means code and supporting database changes exist. It does **not** mean the external Google/Gemini flows or every real-user journey have passed acceptance testing.

### Customer portal

| Requirement                     | Current implementation                                                                                                                                                                             |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Google signup/sign-in           | Google OAuth button, cookie-based Supabase sessions, and Next.js `/auth/callback` code exchange.                                                                                                   |
| Authorized order selection      | The portal lists orders associated through `customer_delivery_access`; submission rechecks ownership inside the database transaction.                                                              |
| Controlled hackathon fixtures   | An explicit **Load my demo orders** action provisions four fictional orders from two demo sellers for the signed-in Google account. Provisioning is idempotent and does not claim existing orders. |
| Report submission               | Order-scoped description and optional private image evidence; report persistence and reference allocation occur in a guarded transaction.                                                          |
| Categorization and routing      | Server/database rules classify reports, retain original classification metadata, flag ambiguous cases, and independently detect refund intent.                                                     |
| History, status, and replies    | The portal displays previous reports, status history, published staff replies, and per-user unread state.                                                                                          |
| Retire link-based authorization | Old customer access-link and preview entry points redirect to the authenticated customer app.                                                                                                      |

Main implementation: [CustomerWorkspace.tsx](src/features/portal/components/CustomerWorkspace.tsx), [CustomerAccountForm.tsx](src/features/customer-auth/components/CustomerAccountForm.tsx), and [OAuth callback](src/app/auth/callback/route.ts).

### Operations portal

| Requirement                          | Current implementation                                                                                                                                                                                                             |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Staff access                         | Server layout membership checks, RLS, and guarded mutation functions require active `ADMIN` or `OPERATIONS` membership.                                                                                                            |
| Overview and inbox                   | Open/high-or-critical/SLA-breach/unassigned metrics; search and priority, seller, status, category, assignment, and age filters.                                                                                                   |
| Dedicated exception detail           | Category, priority, status, age, assignment, SLA, order/seller/customer context, linked reports, evidence, relevant source updates, notes, replies, seller updates, and audit history.                                             |
| Consistent summaries and suggestions | Shared deterministic functions produce summaries and explainable next actions. Missing, stale, conflicting, or unsupported context produces manual-review guidance.                                                                |
| Staff actions                        | Explicit assignment, permitted status transitions, private notes, report status changes, and audited category corrections.                                                                                                         |
| Correction consistency               | A report-derived exception's category and initial priority are updated when a correction is consistent with its linked reports. Conflicting linked/source context remains marked for review. Original classification is preserved. |
| Customer communication               | Staff writes a reply, inserts a template, or requests an apology draft, then explicitly publishes to the customer portal.                                                                                                          |

Main implementation: [OperationsWorkspace.tsx](src/features/portal/components/OperationsWorkspace.tsx), [ExceptionWorkspace.tsx](src/features/portal/components/ExceptionWorkspace.tsx), and [exception-rules.ts](src/core/domain/exception-rules.ts).

### Seller portal and refund handoffs

- `/seller` requires a backend-controlled seller membership to show seller data.
- Sellers receive a minimal projection of their relevant exceptions and explicitly seller-visible updates.
- Refund intent creates one linked refund-information handoff. Operations can publish updated findings without creating duplicate handoffs for the same report.
- Operations can also publish general seller-visible exception updates.
- Customer conversations, private staff notes, and report attachments are not exposed to sellers by default.
- A handoff does not approve or process a refund. A separate acknowledgment/decision lifecycle for handoffs is not implemented.

Main implementation: [SellerWorkspace.tsx](src/features/portal/components/SellerWorkspace.tsx) and the guarded functions in [Supabase migrations](supabase/migrations/).

### Source context and simulation

- Delivery context records contain external IDs, source-system identifiers, provenance, and source/receipt timestamps.
- The operations simulator accepts only demo contexts and supported normalized event types.
- Duplicate event IDs do not repeat processing.
- Out-of-order and missing-time updates are recorded without overwriting the current source state.
- Relevant updates can create exceptions; staff exception/report actions do not change source delivery status.
- Failed requests display errors instead of silently switching to browser fixtures.

Main implementation: [SourceSimulator.tsx](src/features/portal/components/SourceSimulator.tsx) and the `ingest` database command. There is no live source-system transport adapter.

### Data, access, and evidence

- Active portals use shared Supabase records instead of the old localStorage business database.
- RLS separates customer-owned data, seller-visible data, and operations records.
- Writes use authenticated, guarded transactions with audit records.
- Customer messages, staff notes, seller updates, and apology drafts are stored separately.
- Evidence is stored in a private bucket. The application upload route validates, decodes, and re-encodes supported images; downloads require authorized access.
- Normal workflows use user-scoped clients and do not require browser access to service-role credentials.
- Schema migrations were applied to the configured Supabase project. Generated TypeScript types, an empty-project bootstrap, and rollback-only database tests are included.

Main implementation: [portal API](src/app/api/portal/route.ts), [session client](src/infrastructure/supabase/session.server.ts), [evidence API](src/app/api/evidence/route.ts), and [Supabase migration files](supabase/migrations/).

### Gemini and the preserved UI

- The direct server-side Gemini integration receives minimal report text/category/status and returns apology text only.
- Generated drafts are saved separately from published replies. Draft generation does not classify, route, assign, suggest operational actions, or change statuses.
- Staff can edit the draft and must explicitly publish the reviewed reply. Manual composition remains available if Gemini is unavailable.
- Existing theme tokens, shared controls, and IBM Plex typography are retained. The fonts are now served locally, removing the previous build-time Google Fonts download dependency.
- Lovable gateway, preview session sharing, telemetry integration, and project configuration were removed.

Main implementation: [apology.server.ts](src/infrastructure/ai/apology.server.ts), [apology API](src/app/api/apology/route.ts), and [global styles](src/styles/globals.css).

## 4. What is still left

### A. External setup, not missing feature code

| Pending item                             | What is needed                                                                                                                                                                                        |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Staff and seller account assignments     | Confirm Google account/user UUIDs and assign the appropriate backend memberships. There is no automatic role escalation.                                                                              |
| Deployment-specific Google configuration | Confirm Google consent settings, Supabase site URL, and the allowed `/auth/callback` URL for each deployed environment. Google was enabled in the connected project at the last implementation check. |
| Live Gemini configuration                | Set server-only `GEMINI_API_KEY` and `GEMINI_MODEL` to credentials and a model available to the project. Do not place these secrets in public environment variables.                                  |

Role assignment SQL and environment setup are documented in [README.md](README.md).

### B. Remaining implementation or future integration

| Item                                         | Current boundary / remaining work                                                                                                                                                                                                |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Live delivery-system integration             | Implement the adapter only after the source interface, authentication, identifiers, available events, ordering guarantees, and freshness expectations are confirmed. The current normalized simulator is not that adapter.       |
| Real customer-to-order authorization mapping | Replace fictional provisioning with an authoritative association/import process. Do not establish ownership from an order reference or editable user metadata.                                                                   |
| Live-data rollout controls                   | Disable demo provisioning/simulation and establish the live import and operational procedures before accepting real source data. Current pages explicitly identify the hackathon dataset.                                        |
| Seller acknowledgment or handoff progression | A handoff/update exists today, but separate seller acknowledgment and handoff status transitions need requirements before implementation. Do not confuse this with refund execution.                                             |
| Optional report-direction email              | No product email sender is implemented. If later required, it may direct customers to the authenticated app; it must not send replies or operational updates. This is not required for the core reporting flow.                  |
| Evidence failure recovery                    | Reports remain saved when an attachment fails, and the UI reports the failure. A dedicated post-submission attachment retry interface and orphan-upload cleanup are not implemented.                                             |
| Production hardening                         | Define retention, operational monitoring, integration retries/reconciliation, and dataset pagination as appropriate for real usage. The hackathon implementation does not establish production readiness.                        |
| Legacy code cleanup                          | Old browser-demo modules and historical Drizzle artifacts remain for reference/tests. Active portal routes no longer use that data path. Removing these leftovers is separate cleanup, not an unfinished active portal workflow. |

The last four implementation areas beyond the confirmed core workflow require their relevant scope decisions; this document does not authorize adding them automatically.

### C. Remaining verification: Phase 4

- Complete a real Google consent/callback/sign-in/sign-out journey in the intended environment.
- Exercise the customer order/report flow with a real signed-in account.
- Exercise operations and seller pages with their confirmed memberships, including unauthorized-account attempts.
- Generate a real Gemini apology, edit it, and verify that only an explicit publication creates a customer reply.
- Run a real authenticated browser journey covering customer report, operations investigation/reply, seller handoff, refresh persistence, and unread clearing.
- Exercise evidence upload/download through real authenticated browser sessions, in addition to the existing decoder and database policy tests.
- Review final policies and deployment configuration, and perform final responsive/accessibility acceptance checks across all portals.
- Rerun relevant checks against the final configured deployment and document any unresolved failures.

**Phase 4 has not been declared complete.** Database-policy tests and mocked authenticated UI tests do not replace these real-user acceptance checks.

## 5. Verification already recorded

The following results were recorded during Phase 3. They were not rerun merely to create this documentation file.

| Check               | Recorded outcome and limit                                                                                                                                                                               |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Automated tests     | 110 tests passed across domain, component, API, configuration, and evidence-decoding checks.                                                                                                             |
| TypeScript          | Passed; the production build also completed its type check.                                                                                                                                              |
| Production build    | Passed after self-hosting the existing fonts.                                                                                                                                                            |
| Changed-file lint   | Passed. This is not a claim that all legacy repository formatting issues were fixed.                                                                                                                     |
| Database workflows  | Rollback-only assertions passed for account provisioning, ownership, role isolation, classification, corrections, replies, notes, handoffs, assignment, transitions, ingestion ordering, and read state. |
| Evidence policies   | Rollback-only assertions passed for customer/staff access and cross-customer/seller denial.                                                                                                              |
| Fresh schema replay | Bootstrap and tracked migrations were replayed successfully in isolated schemas and rolled back.                                                                                                         |
| Browser checks      | Real unauthenticated API denial; authenticated UI fixtures checked order selection, report submission, replies, unread clearing, seller handoffs, and 390px overflow. Screenshots were also captured.    |
| External services   | Google provider enabled was checked. Real Google consent/session journeys and live Gemini generation were not verified.                                                                                  |

Evidence: [workflow SQL tests](supabase/tests/portal_workflows.sql), [evidence SQL tests](supabase/tests/evidence_access.sql), and [browser verification script](scripts/verify-portals.mjs). Database test identities and business records were rolled back; two labeled demo sellers were seeded persistently.

## 6. Current policy limits and unresolved decisions

These are important implementation limits, not claims of a complete operational policy:

- Classification uses documented English keyword rules, not general language understanding. Ambiguous or unsupported descriptions enter manual review.
- New report/source exceptions use simple category-based initial priority. The legacy multi-carrier/high-value priority engine is not the active portal rule path.
- SLA defaults are 2/8/24/48 hours for critical/high/medium/low priority; the source-staleness threshold is 48 hours. These defaults need operational confirmation.
- Damage, missing-item, and wrong-item reports currently require delivered source context; cancelled orders require staff assistance. Broader exception cases need policy decisions.
- Staff and seller memberships are assigned through trusted database administration; there is no membership-management UI.
- The actual source interface, ownership mapping, retention requirements, and seller acknowledgment behavior remain unconfirmed.

## 7. Explicitly outside scope

Do not count the following as missing features to build under the current plan:

- Multiple delivery-company selection or carrier coordination.
- Seller delivery creation or full delivery lifecycle management.
- A full shipment-tracking product.
- A separate native customer mobile application.
- AI categorization, AI routing, AI next-action selection, or AI-triggered workflow actions.
- Automatic execution of suggested actions.
- Refund/payment processing, refund guarantees, or seller-to-customer negotiation.
- Email/SMS delivery of complaint replies or operational updates.
- Invitation links as the required reporting entry point or core order-authorization mechanism.
- A broad visual redesign or reintroduction of Lovable services.

## 8. Recommended next step

Finish account memberships and external configuration, then authorize Phase 4 for real-user acceptance and final security/integration verification. Live source-system integration remains a future task dependent on a confirmed source contract.

For setup, use [README.md](README.md). For technical migration details, use [MIGRATION.md](MIGRATION.md). For the short phase checklist, use [roadmap.md](roadmap.md).
