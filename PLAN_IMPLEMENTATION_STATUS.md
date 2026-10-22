# Plan Changes and Implementation Status

Last updated: 22 October 2026

## Complaint analytics continuation

AI summary presentation follow-up: the on-demand explanation now uses a briefing header/icon, period badge, navy-accented reading panel, readable paragraphs, explicit loading skeleton and a clearer empty state. Metadata and privacy/source details are expandable. Regeneration retains the previous briefing on failure, and summaries from another filter scope remain hidden. Provider prompts, aggregate-only payloads, access gates and database behavior are unchanged. All 29 focused domain/component/API/provider tests, typecheck, production build and scoped lint passed. Isolated fixture previews covered empty/loading/generated states, source details and paragraph rendering; 390px/desktop overflow checks passed and screenshots were inspected. No live Groq request or authenticated operations acceptance is claimed.

Presentation follow-up: calculated insights now show up to three prominent, navy-accented findings for volume change, leading category share, and first-response comparison. Each includes a headline, large figure, supporting sample/counts and a complaint drill-down link that preserves seller/period while clearing table restrictions. Sparse data produces fewer findings. Repeated caveats are consolidated; definitions and the original supporting observations are collapsed under **How these figures are calculated**. Previous-cohort response metrics are derived from the same published-reply metadata, with no new database reads or writes. All 27 focused domain/component/API/provider tests passed; typecheck, scoped lint and production build passed. Isolated browser fixtures passed prominent-figure/link/expandable-definition checks and 390px/desktop overflow; screenshots were visually inspected. This is presentation evidence, not a new live-account or provider acceptance claim.

The owner authorized operations daily/weekly/monthly complaint analytics and optional aggregate-only Groq explanations. `/analytics` adds company-time reporting/comparisons, intake/resolution/open/first-response metrics, volume/category charts, current-status/seller breakdowns, calculated findings, URL filters, and paginated links to existing exceptions. The server explicitly gates ADMIN/OPERATIONS access and pages minimal RLS-protected metadata; no migration or database write is required. See [metric definitions and limits](MIGRATION.md#complaint-analytics). Groq's expanded scope is explanatory only: no customer text/identifiers/private notes, causal claims, recommendations, classification or actions. Earlier statements limiting all Groq use to wording drafts describe the prior scope. This continuation does not extend historical local Phase 4 acceptance to the new analytics workflow; verification results are recorded after implementation checks.

Verification: all 167 tests across 31 files passed, including new calendar/metric, staff-access/API, aggregate-only provider and component tests. Typecheck and scoped lint passed. The final production build passed after the last presentation/error-handling adjustments. An isolated browser preview with explicit fixtures passed summary display, pagination, category filtering, runtime checks and 390px/desktop overflow; both screenshots were inspected. Its Next navigation/link imports were stubbed, so it is component evidence, not authenticated Next.js acceptance. Real local analytics API requests returned 401 without a session, and cross-origin summary generation returned 403. No database writes, live Groq call, account provisioning or authenticated operations analytics acceptance were performed. Server aggregation is capped at 20,000 metadata rows per source table; exceeding the cap fails visibly. Temporary preview source files were removed; screenshots remain in ignored `artifacts/analytics-preview/`. Existing repository-wide historical lint failures were not addressed.

## Driver/proactive Phase 4 local acceptance complete

The owner explicitly authorized Phase 4 local verification and participant Google-account checks. [Phase 4 verification](PHASE4_VERIFICATION.md) records completed local evidence and verification limits. Real driver reporting/evidence/reassignment/duplicate/privacy checks, five rollback-only SQL suites, 139 tests, typecheck/build, and production portal fixtures passed. Touch-target fixes passed automated accessibility checks and computed text contrast follow-up. All 33 changed/new code files pass lint; repository-wide lint still fails pre-existing formatting in unchanged files.

Dedicated demo assignment history and real reports persist. Operations confirmed pending-customer publication is disabled, then generated private Groq wording, edited/reviewed and explicitly published one proactive message for verified customer-owned `DEMO-000077`. Customer exact-text/unread/refresh checks passed. Backend confirms one publication/audit, exact saved content, approved operations actor, persisted read marker and unchanged source/complaint status. No customer association, membership or production-login change was made. Participant driver evidence checks passed operations opening and customer/Lotus Home seller denial. Conditions desktop/390px layout and keyboard checks passed. Existing complaint Groq private generation passed (one draft, zero replies). Other-customer/seller notice visibility and edited complaint-apology publication/customer persistence subsequently passed. Final backend read-back confirms exactly one edited reply and `REPLY` audit, one saved draft, and the single proactive update still marked read; source/report statuses are unchanged. **Phase 4 is complete for the agreed local hackathon acceptance scope.** Deployment/live delivery integration and company-policy confirmation remain deferred; repository-wide historical formatting lint remains failing. Earlier incomplete/setup statements below are historical checkpoints superseded by this completion record.

## Driver/proactive extension: Phase 3, 22 October 2026

Subsequent bounded account setup: the owner explicitly requested two test drivers. Two synthetic email/password identities were created through trusted administration and assigned active `DELIVERY_PERSON` memberships, with no operations/admin or seller role. Both real password sign-ins and driver-only RPC checks passed. A development-only `/driver-test-login` page was added; production returns 404. Credentials are in ignored `artifacts/driver-test-accounts.json` only. This supersedes the earlier pending-driver-account setup note; explicit demo package/history provisioning remains pending. No package assignments or workflow publications were created by account setup.

The owner authorized incremental driver reporting and proactive portal notifications with the smallest schema preserving assignment history, recipient accuracy, reviewed publication, and audit. Implementation uses five tables, existing exception/audit infrastructure, and the existing Radix design system. See [Driver workflow](DRIVER_WORKFLOW.md) for policies, routes, setup, and safeguards. This new extension's Phase 3 is distinct from the historical phases below.

- Added protected `/driver`, operations `/conditions`, driver attempt integration in the existing exception detail page, private driver evidence/corrections, and customer delivery updates/unread state independent of complaints.
- Historical effective assignment intervals determine candidates at condition occurrence. Current assignments cannot substitute for missing history. Automatic rules prepare private reviews; exact recipient/message/fact snapshots are rechecked inside atomic staff-approved publication. Repeated publications are idempotent. No operational notice is emailed.
- Groq remains server-only and wording-only, with minimal structured context and template/manual fallback. A stale provider request cannot overwrite a changed review. No live Groq request was made for this extension.
- Three additive migrations are applied to confirmed shared project `gvutlnfsiytnayvdxqyb`; local versions match history. Generated types are synchronized. No memberships, customer associations, or persistent driver assignments/reports/reviews/publications were created. Read-back confirmed zero rows in the new workflow tables before handoff.
- Implementation checks: all 137 tests across 25 files passed with two workers, including driver occurrence-time package selection and review/publish safeguards. Production build and typecheck passed. New rollback-only driver SQL passed for reassignment, stale/conflicting/missing data, corrections, review/source/recipient invalidation, duplicate prevention, inactive roles, private evidence (including own-seller denial), publication/read state, and revoked customer access. Existing portal, evidence, and seller-isolation SQL checks passed. Two historical scripts needed fixture-scoped counts to coexist with saved shared-demo records; no application authorization change was needed.
- Browser fixtures passed real unauthenticated portal/driver/updates API denial, existing customer/seller journeys, complaint-independent proactive updates and unread persistence, and 390px overflow checks. The new customer screenshot was visually inspected. These authenticated browser views used explicit fixtures, not real participant sessions.
- Scoped lint passed for the new domain/API/components, updated operations view, component tests, and browser script. This does not claim repository-wide historical formatting cleanup. The final 137-test run and production build passed after the last application changes.
- Security advisor found no new findings; its pre-existing password-protection warning remains. New foreign-key/RLS initialization findings were fixed; existing unrelated missing-index/unused-index information remains.

Pending configuration is two trusted-administrator-approved driver memberships and explicit demo history provisioning. Pending implementation/integration is the future authoritative source adapter/coverage/correction contract, not a hidden live assignment feed. Pending acceptance includes actual driver/operations/customer publication and evidence journeys, protected-page responsive/accessibility checks, and live notification drafting/review. Phase 4 remains incomplete; do not infer its authorization from implementation checks.

Current integration branch: `backend/groq-phase4-integration` (target: `nextjs-migration`)

This document connects the revised product plan to the current implementation. It separates unfinished code from external configuration and verification work. It includes the bounded verification stop checkpoint of 21 October 2026; it does not declare Phase 4 or production readiness complete.

## 1. Current product scope

The application is an exception-handling layer for **one delivery company**, serving many e-commerce sellers and their customers.

The company's existing delivery management system owns delivery creation, routing, dispatch, execution, and authoritative delivery status. This application uses the relevant order/delivery context to investigate exceptions and customer reports.

All portals are part of the existing responsive Next.js website:

- Customers sign in with Google, choose an authorized order, submit a report, and view status/history/replies.
- Operations staff triage, assign, investigate, and resolve exceptions; publish customer replies and seller updates.
- Sellers view their own relevant exceptions and refund-information handoffs.
- Drivers report assigned-delivery attempt exceptions and route conditions; operations reviews historically affected packages and explicitly publishes proactive customer portal updates.

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
| AI-assisted classification, routing, or broad support generation | Deterministic rules; Groq only drafts apology letters         | Operational decisions must be explainable and independent of AI output.                  |
| Suggested actions may resemble automatic operations              | Read-only rule guidance; staff explicitly executes an action    | Showing a suggestion must not contact anyone or mutate a workflow.                       |
| Refund templates promise approval/payment timing                 | Delivery findings are relayed to the seller portal              | Refund decisions, payment execution, and seller/customer negotiations are outside scope. |
| Replies or operational updates sent by email/SMS                 | Replies and updates appear in the appropriate portal            | Optional emails may direct customers to the app, not deliver case updates.               |
| Business records stored in browser-local demo state              | Shared Supabase persistence with authenticated access           | Customer, staff, and seller workflows need shared records and backend access controls.   |
| Lovable runtime services and AI gateway                          | Next.js, Supabase, and a direct server-side Groq integration  | The project no longer uses Lovable services.                                             |
| General delivery/carrier dashboard                               | Exception-focused metrics and investigation context             | Staff needs exception workload information, not a complete tracking dashboard.           |

The design-system requirement did not change: preserve colors, typography, spacing, shared components, layout conventions, and responsive behavior.

## 3. Implemented according to the revised plan

“Implemented” means code and supporting database changes exist. It does **not** mean the external Google/Groq flows or every real-user journey have passed acceptance testing.

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

### Groq and the preserved UI

- The direct server-side Groq integration receives minimal report text/category/status and returns apology text only.
- Generated drafts are saved separately from published replies. Draft generation does not classify, route, assign, suggest operational actions, or change statuses.
- Staff can edit the draft and must explicitly publish the reviewed reply. Manual composition remains available if Groq is unavailable.
- Existing theme tokens, shared controls, and IBM Plex typography are retained. The fonts are now served locally, removing the previous build-time Google Fonts download dependency.
- Lovable gateway, preview session sharing, telemetry integration, and project configuration were removed.

Main implementation: [apology.server.ts](src/infrastructure/ai/apology.server.ts), [apology API](src/app/api/apology/route.ts), and [global styles](src/styles/globals.css).

## 4. What is still left

### A. External setup, not missing feature code

| Pending item                             | What is needed                                                                                                                                                                                        |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Staff and seller account assignments     | Complete the account and membership confirmation checklist in [README.md](README.md#account-and-membership-confirmation-checklist), then assign approved memberships through a trusted administrator connection. There is no automatic role escalation. |
| Deployment-specific Google configuration | Confirm Google consent settings, Supabase site URL, and the allowed `/auth/callback` URL for each deployed environment. Google was enabled in the connected project at the last implementation check. |
| Live Groq configuration                | Set server-only `GROQ_API_KEY` and `GROQ_MODEL` to credentials and a model available to the project. Do not place these secrets in public environment variables.                                  |

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

- Local cross-seller, evidence, and unread gates now have bounded participant-reported passes and supporting backend evidence recorded below. Complete any additional real-session security checks required for final acceptance; these records do not claim independently captured HTTP attacks.
- Verify Google callbacks/redirect settings in each intended deployed environment; local regular-browser login/sign-out has participant-reported results.
- Generate a real Groq apology, edit it, and verify that only an explicit publication creates a customer reply.
- Complete final acceptance in the agreed environment. Do not repeat the recorded local report, operations, seller, evidence, and unread checks solely because historical Phase 3 notes lacked that evidence.
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

### Bounded verification checkpoint: 21 October 2026

Verification is stopped at the owner's request. Only documentation updates are authorized at this checkpoint. Do not continue testing, assign another account, or change the database without a new task authorization. Phase 4 is incomplete.

The owner confirmed shared demo project `gvutlnfsiytnayvdxqyb` (`ai_ocean_buildathon`). The Supabase connector verified that target before database writes. Browser checks used the local app at `http://localhost:3000`; they do not verify deployed redirects or production readiness.

| Area | Result and evidence boundary |
| --- | --- |
| Google entry point | Earlier preflight recorded Google enabled, `/login` HTTP 200, two OAuth initiation tests, and typecheck. The later automated Chrome run confirmed real unauthenticated API denial but Google blocked sign-in. `scripts/verify-google-live.mjs` did not complete its authenticated checks. |
| Customer browser journey | Participant confirms regular-browser Google login, authorized order selection, eligible report submission, saved report/details after refresh, sign-out protection, and restoration after signing in again. Two customer accounts could not see each other's data in the UI. These are participant-reported results, not independently captured browser assertions. |
| Report eligibility | The receipt-required error was resolved by choosing a delivered demo order for a damage report. This is consistent with the existing category policy; no application fix was made. |
| Customer backend isolation | `supabase/tests/customer_isolation.sql` passed against the agreed project using synthetic identities under the real `authenticated` database role. Own reads/submissions succeeded; cross-customer reads, report submissions/read-state changes, ownership claims, and direct report updates were denied. Editable profile metadata did not grant access. RLS was enabled on the six inspected tables, and the tested role had neither superuser nor RLS-bypass privileges. |
| Operations browser journey | Participant confirms operations inbox access; private-note persistence; report `IN_REVIEW` persistence; explicit manual reply publication/persistence; customer visibility of status/reply; absence of private notes/audit reasons; and customer denial of `/dashboard`. This bounded journey is complete based on participant reports. |
| Operations backend boundaries | `supabase/tests/operations_customer_reply.sql` passed with synthetic authenticated identities. It checks private notes, status changes, explicit replies, audit records, no reply publication from note/status alone, customer-visible history/replies, private note/reason denial, customer denial of staff commands, and unchanged source delivery status. |
| Lotus Home seller journey | Participant confirms seller portal access, a customer damage/refund-review report against a delivered Lotus Home demo order, operations publication/persistence of seller-visible findings, correct order/handoff visibility after refresh, no-refund-approval wording, absence of customer conversations/attachments/private notes, and seller denial of `/dashboard`. |
| Cross-seller isolation | Not performed during this continuation. No River Books participant account has been nominated or assigned. Earlier Phase 3 synthetic cross-seller assertions remain historical evidence, not a newly completed two-seller acceptance run. |
| Local code checks | Eleven focused auth/configuration/portal/routing tests, typecheck, production build, and live-script lint passed earlier in this continuation. Four portal API tests passed during customer backend verification; seven operations-component/API tests passed during operations verification. These runs overlap and are not additive counts. No full suite was rerun for this documentation checkpoint. |

Database assertions rolled back their synthetic users and business rows; PostgreSQL reference sequences may advance despite rollback. They verify real database policies and guarded functions, not Google-issued JWT validation or captured two-session HTTP attacks. Report/order identifiers for the participant browser journeys were not captured in this handoff record.

### Persistent configuration and demo records

With explicit owner approval, trusted administration created and verified one active `OPERATIONS` membership and one active Lotus Home (`demo-lotus`) `SELLER_STAFF` membership after confirming the Google identities and Auth UUIDs. These memberships remain in the shared demo project. No River Books membership was assigned in this continuation. Keep personal account identifiers outside this repository; confirm the mappings through trusted administration when resuming.

Participant-created demo reports, private notes, statuses, published customer replies, and seller findings also remain. They are separate from rollback-only SQL fixtures. No schema migration or active application behavior was changed by this continuation.

New local verification artifacts are `scripts/verify-google-live.mjs`, `supabase/tests/customer_isolation.sql`, and `supabase/tests/operations_customer_reply.sql`. The live script's sanitized local result is under ignored `artifacts/phase4/`; its automated run remains incomplete. Check Git status before sharing because these artifacts and documentation changes are not committed at this checkpoint.

### Resumed seller-isolation verification: 21 October 2026

The owner authorized continuation from the checkpoint above. The checkout was fast-forwarded from `45f9f93` to `2b7c47e`; the teammate's documentation and three verification artifacts are committed in that newer baseline. Earlier references to uncommitted artifacts describe the historical stop checkpoint.

- Confirmed shared project `gvutlnfsiytnayvdxqyb` and matching local application configuration before database tests. Started the local application at `http://localhost:3000`.
- Added and executed [seller_isolation.sql](supabase/tests/seller_isolation.sql). Both synthetic sellers had positive controls: their own order, exception projection, refund handoff, and seller-visible update. Cross-seller tables/projections and customer/staff-only records remained inaccessible. Seller staff commands, customer reporting without ownership, direct membership/update changes, inactive membership access, and editable-metadata escalation were denied.
- Assertions ran as the real `authenticated` PostgreSQL role without superuser/RLS bypass. All synthetic users, memberships, and business rows rolled back; a follow-up query confirmed zero remaining synthetic users and unchanged demo order/update and active-membership counts. Reference sequences may advance. This does not verify Google tokens, HTTP session isolation, or two-seller browser acceptance.
- Reran all 110 tests across 18 files, TypeScript, and the production build successfully in this checkout. No application behavior or schema change was needed.
- The owner replaced the initial fictional River Books account with their real participant-controlled Google account and authorized its seller access. Trusted administration verified the Google identity and absence of active staff/existing seller roles, then created and read back an active River Books `SELLER_STAFF` membership. This is a persistent shared-project change. The account had zero customer-to-order associations at assignment; preserve that clean seller-only control during isolation acceptance. Personal account identifiers remain outside the repository.
- The participant confirmed that the River Books seller portal displays the correct heading, shows no Lotus Home orders/findings/handoffs, and denies `/dashboard` access. These are participant-reported regular-browser results. A read-only backend check still showed zero River Books exceptions/updates, so this is the access/negative portion only; creating a customer report and publishing operations findings for a River Books positive control is the current next step. Two-seller acceptance is not complete.
- The participant subsequently confirmed customer submission. A read-only backend query verified River Books report `RPT-2026-000017` on demo order `DEMO-000080`: category `DAMAGE`, refund intent true, report status `NEW`, source status still `DELIVERED`, provenance `DEMO`, exactly one refund handoff, and no published customer replies. Operations publication of seller findings and both sellers' browser visibility checks are pending.
- The owner subsequently nominated a newly signed-in Google account for operations verification and explicitly authorized access. Trusted administration verified its Google identity and absence of existing staff/seller memberships, then created and read back active `OPERATIONS` access with no active seller membership. The earlier operations account remains unchanged. This additional membership persists; its browser verification and seller-findings publication are pending. Personal account identifiers are not stored here.
- The participant then reported successful operations access, handoff publication, and refresh verification. Read-only backend checks confirmed the River Books finding for `RPT-2026-000017` / `DEMO-000080`, exactly one refund handoff, one `HANDOFF` audit record, unchanged `DELIVERED` source status, and zero customer replies. Saved text: "Demo verification: River Books damage report received for seller review. No refund has been approved or processed". Final paired seller refresh checks remain pending: River Books must see this finding without Lotus Home records; Lotus Home must retain its own findings while excluding this River Books order/finding. Do not mark the cross-seller browser gate complete until both are confirmed.
- The participant subsequently confirmed both final seller refresh checks: River Books sees `DEMO-000080` and its finding without Lotus Home records; Lotus Home still sees its own findings and cannot see that River Books order/finding. The bounded cross-seller browser acceptance gate is complete based on participant reports, supported separately by the rollback-only seller-isolation SQL assertions. This is not independently captured two-session HTTP evidence, deployment acceptance, or overall Phase 4 completion.
- Local OAuth troubleshooting: Google returned codes, but the server exchange failed. A Node connectivity probe identified sandbox-denied outbound requests (`EACCES`). Restarted Next.js with approved network access and confirmed Supabase Auth health HTTP 200. The owner then reported successful fresh Google sign-in with their existing account; this verifies recovery for that participant, not the nominated River Books account. Added callback diagnostics restricted to error code/status and three callback tests covering success destination, private error logging, and provider cancellation. The three new tests and two existing OAuth initiation tests passed separately from the earlier 110-test run; typecheck and production build passed again after the callback change.
- Cross-seller local browser acceptance is complete within the participant-reported bounds above. Gemini is not configured in this local environment; real browser evidence/unread checks, deployed OAuth, and final acceptance remain outstanding. Phase 4 is incomplete.
- Evidence customer check: participant confirms submitting a damage report with an image, opening the attachment, refreshing, and opening it again successfully. A read-only backend check identified `RPT-2026-000018` / `DEMO-000078` (Lotus Home, `DEMO`, delivered source), one `image/webp` attachment of 25,190 bytes, a matching Storage object, and a non-public evidence bucket. No image content or signed download URL was read or stored in documentation. Operations image access and direct seller access denial through the application evidence endpoint are pending; unread verification remains next afterward.
- The participant then confirmed operations attachment opening and River Books direct evidence-endpoint denial. These are participant-reported real-session results; customer upload/reopen and staff access passed, and the other seller is denied. A direct check with the order's own Lotus Home seller is still pending to distinguish audience isolation from cross-seller isolation. Unread acceptance on `RPT-2026-000018` is now in progress: baseline backend query showed zero replies and no customer read marker, before the requested explicit manual reply and closed-report badge/open/refresh checks.
- The participant confirmed all five unread steps passed: explicit operations manual reply, customer closed-report **New update**, reply visibility on opening, badge clearing, and the cleared state after refresh. A read-only backend check confirms one reply, one `REPLY` audit, and the customer's read marker later than the latest reply; the report remains `NEW` and source remains `DELIVERED`. The participant also explicitly confirmed **Evidence unavailable** for the same attachment through the Lotus Home seller session, completing the own-seller audience denial check. Bounded local evidence and unread browser gates are complete based on participant reports plus the stated backend read-backs. No independent browser capture or cross-customer real-session attachment test is claimed.
- Remaining setup checked without exposing credentials: `GEMINI_API_KEY` and `GEMINI_MODEL` are unset locally. Requested local server-only configuration for live drafting and the intended final acceptance environment/deployed URL. No Gemini request or deployment was performed. Phase 4 remains incomplete.
- The owner selected **local-only final acceptance**, supplied a server-only Gemini key, and requested Gemini 3.8 Flash. Google's model documentation identifies `gemini-3.8-flash`; configured that ID in ignored `.env.local` without printing or changing the key. A read-only model metadata request with the configured key returned HTTP 400 `FAILED_PRECONDITION`: **User location is not supported for the API use.** No content generation was attempted and no apology draft/publication was created by this check. Live Gemini draft/edit/explicit-publication acceptance remains blocked by provider location availability. Deployment OAuth acceptance is deferred because no deployment is in the current acceptance target; do not declare it passed.

### Groq provider replacement: 21 October 2026

The owner replaced Gemini with Groq `openai/gpt-oss-120b`. This supersedes earlier Gemini configuration and its blocked verification gate; the LLM's role remains apology drafts only.

- Active adapter uses server-only `GROQ_API_KEY` / `GROQ_MODEL` and Groq Chat Completions. Requests contain minimal category/description/status, no tools or operational actions, low reasoning effort and excluded reasoning output for GPT-OSS. Only complete text is returned; provider errors, truncation, refusals, tool calls, and invalid output cannot become a draft. Manual reply composition remains available.
- Updated operations UI, active setup, environment example, project guidance, and staff-review component tests. Credentials were saved only in ignored local configuration. Historical Gemini migration files and checkpoint evidence remain historical.
- Applied `20261021134148_provider_neutral_apology_audit.sql` to the confirmed shared project. It changes only future draft audit wording to **AI apology draft saved; not published**, preserving existing behavior, grants, signatures, and old audit records. No generated public database type changes are needed.
- Real server-adapter generation passed using fictional context with Groq `openai/gpt-oss-120b`. Its sanitized result is in ignored `artifacts/phase4/groq-live.json`. This check created no database draft, customer reply, or operational action.
- Rollback-only [apology_drafts.sql](supabase/tests/apology_drafts.sql) passed: staff-only private draft persistence, Groq model recorded, provider-neutral audit, no automatic customer publication or report/source mutation, and customer draft privacy. API tests separately verify staff/origin gates, database-controlled context, private persistence only, and no save/publication on provider failure.
- All 125 tests across 20 files, TypeScript, production build, and changed-file lint passed. A tracked/unignored-file scan found zero Groq-key patterns; local environment and smoke-result files remain ignored. The live staff browser draft/edit/explicit-publication gate and final local acceptance remain pending; Phase 4 is incomplete. The chat-shared Groq key should be rotated before wider use, without recording its value in documentation.
- Restarted the local Next.js server with network access and Groq configuration. Before the requested staff browser check, `RPT-2026-000018` had zero apology drafts and one existing customer reply (`NEW`/`DAMAGE`, source `DELIVERED`). Requested draft generation without publication first; preserve that baseline when verifying no implicit reply or workflow action.
- The participant confirms **Draft apology with Groq** generates editable text with the draft-only review notice and that the customer still sees only the original reply before publication. Backend read-back confirms one draft with model `openai/gpt-oss-120b`, one provider-neutral `SAVE_DRAFT` audit entry, and the unchanged single customer reply, report `NEW`/`DAMAGE`, source `DELIVERED`. Staff review/edit/explicit publication and customer refresh persistence are now the pending final Groq gate.

### Radix UI and backend integration: 21 October 2026

The owner requested combining the unpushed backend continuation with the teammate's Radix Themes UI. Fetch confirmed the UI branch `radix-themes` (`8d87a6e`) was already merged into `origin/nextjs-migration` at `c37c6a8` through PR #1.

Saved local backend work on `backend/groq-phase4-integration` as `9b0369e`, then merged the updated shared branch. Resolved overlaps in `ExceptionWorkspace.tsx` and its test by retaining Radix `Heading`/`Text`/`Notice`, Theme-wrapped tests, and Groq labels/explicit reviewed publication. Project guidance retains both the new Radix design rules and Groq operational restrictions. Existing migrations, verification history, local credentials, and demo records are preserved. No shared branch history is rewritten; use this integration branch for review before merging it into the shared branch.

Combined verification passed: all 125 tests across 20 files, TypeScript, production build, and lint on resolved/backend files. The first parallel run timed out importing the login route under concurrent build/typecheck; a repeat after build completion passed the complete suite without test or timeout changes. Production browser verification passed real unauthenticated API denial and explicit authenticated fixtures for customer submission/replies/unread clearing and seller handoffs; 390px overflow assertions passed, and customer-mobile/seller-desktop screenshots were inspected. Fixture results do not establish new live Google or staff Groq-publication acceptance of the merged UI. No database changes or live business mutations were made for this integration.

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

Bounded local cross-seller, evidence upload/reopen/audience, and unread clearing/persistence gates are complete based on participant reports with separate backend read-backs/assertions. The owner selected local-only acceptance and replaced Gemini with Groq. Live Groq generation passed with fictional context; next verify staff browser generation, no customer publication before review, editing, and explicit publication of the reviewed text. Continue final local responsive/accessibility/security acceptance. Deployed OAuth remains deferred. Preserve existing approved memberships/demo records. Live source-system integration remains a future task dependent on a confirmed source contract.

For setup, use [README.md](README.md). For technical migration details, use [MIGRATION.md](MIGRATION.md). For the short phase checklist, use [roadmap.md](roadmap.md).
