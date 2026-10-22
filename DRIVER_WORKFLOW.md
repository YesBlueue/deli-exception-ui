# Driver reporting and proactive portal updates

Phase 3 extension implemented on 22 October 2026. This extends the existing responsive Next.js website and its Radix design system. It does not integrate a live delivery system or complete Phase 4 acceptance.

Subsequent account setup: the owner explicitly authorized two synthetic test accounts. `driver.one@example.invalid` and `driver.two@example.invalid` now have active `DELIVERY_PERSON` memberships and email/password identities (not Google identities). Password sign-in and driver-only RPC access were verified. Both also passed real local Chrome sign-in, driver-page access, operations-page denial, sign-out, and 390px driver-page overflow checks. These bounded account checks do not establish reporting/publication/evidence acceptance. Credentials are stored only in ignored `artifacts/driver-test-accounts.json`, never in tracked source. The development-only `/driver-test-login` page provides cookie-based sign-in and returns 404 in production. Customer Google authentication is unchanged. Demo package assignments still require the explicit operations provisioning action below.

## Current local acceptance checkpoint

The owner subsequently authorized Phase 4 and historical demo provisioning. Real driver assignment-time reporting, evidence, reassignment and access/duplicate checks passed. Participant Google operations/customer checks passed private Groq drafting, saved manual review/explicit publication and exact message/unread refresh persistence for `DEMO-000077`. One approved proactive publication/audit persists. Automated accessibility checks and computed text contrast passed for populated driver/login views. The participant subsequently passed driver evidence audience checks, conditions layout/keyboard, customer/seller notice isolation and the separate complaint-apology edited publication/persistence gate. [Phase 4 verification](PHASE4_VERIFICATION.md) records completed local acceptance and its limits; production readiness and live delivery-system integration remain deferred. Setup and zero-record statements below describe the original implementation checkpoint, superseded by this authorized continuation.

## Compact schema

Five new tables represent the logical entities:

- `driver_assignments`: source-owned effective assignment intervals, source identifiers, receipt timestamps, and provenance. These are separate from operations exception assignees.
- `driver_reports`: structured attempt exceptions and route conditions, occurrence/receipt times, scope, correction state, revision, and links to existing exceptions.
- `notification_reviews`: immutable message/assessment versions, with supersession and approval/publication metadata. Package decisions and exact recipient-association evidence are JSON snapshots rather than separate tables.
- `customer_delivery_updates`: per-account published text, delivery association, publication result (the committed row), and read timestamp. No complaint is required.
- `driver_evidence`: private report/condition attachment metadata, backed by the private `driver-evidence` bucket.

Existing `delivery_exceptions` and `activity_logs` supply investigation and audit history. Audit records retain previous report revisions and the approved message, recipient assessment, approver, approval time, and result. Public RPC wrappers use authenticated, role-checked private implementations. Direct business-table mutations are denied to application users.

## Routes and usage

- `/driver`: active backend-controlled `DELIVERY_PERSON` accounts view assignment history and submit structured attempt/condition reports. Driver projections contain package references and assignment intervals, not full customer records. Reporting cannot change source delivery status, assignments, or operations ownership.
- `/dashboard` and `/exceptions/[id]`: attempt exceptions use the existing inbox/detail workflow. The detail page includes driver details, permitted evidence, and correction requests. Unsupported guidance categories deliberately produce manual-review guidance.
- `/conditions`: operations reviews route conditions, historical impact decisions, exact customer account recipients, and saved messages. Record changed reliable facts to prepare a revised notice, or request driver correction/close a condition.
- `/customer/complaint`: the new Delivery updates section shows authorized proactive publications independently of report history. Mark as read persists per recipient.

A driver may correct their own report only after operations requests correction. Corrections retain the original delivery/kind, recheck occurrence-time authorization, and preserve the previous submission in audit history. Drivers can add/retry private image evidence without resubmitting a report.

## Deterministic hackathon policy

`driver-impact-v1` considers only assignments where `valid_from <= occurred_at < valid_to`, with an open upper bound when `valid_to` is null. Later reassignment does not remove historical eligibility. Packages first assigned after occurrence are excluded. Overlapping assignment intervals at occurrence produce `PENDING_ASSIGNMENT`, including overlaps with another driver.

The initial scope choices are all historically assigned packages or one explicitly selected package. There is no geographical or free-text inference. No historical assignment means submission is rejected with an actionable error; insufficient candidate data is retained in the review rather than guessed.

Provisional defaults, pending confirmation from delivery operations:

- Occurrence must be supplied, cannot be in the future, and must be within seven days.
- Source context must have a timestamp no more than 48 hours old and not in the future.
- Only `IN_TRANSIT` and `OUT_FOR_DELIVERY` source states can receive a new delay notice. Completed/cancelled/returned contexts are excluded; other states remain pending.
- A delivery needs exactly one backend-controlled customer-account association. Zero produces `PENDING_CUSTOMER`; multiple associations produce `MANUAL_RECIPIENT_REVIEW`. Neither references nor unverified email establish ownership. After authoritative data is corrected, operations refreshes impact and reviews again.
- Attempt categories are customer unavailable, address problem, package refused, and other attempt problem. Initial exception priority is medium with an explicit operations-review explanation. Classification never reads free text or calls AI.
- Same-driver, same-category ongoing conditions with overlapping scope are rejected as duplicates. Operations revises/closes the existing condition. Cross-category incident reconciliation remains a human task.

These are conservative demo policies, not a claim that a live source contract, assignment-history coverage, or company SLA/priority policy has been confirmed.

## Review and publication integrity

Submission automatically prepares a private impact snapshot and cautious template. Assessment and rendering publish nothing.

Operations checks the displayed eligible packages, recipient account IDs, and saved message, then uses **Approve and publish reviewed updates**. Editing text clears the acknowledgement and requires saving/reviewing the new immutable version. Changed assignment evidence, source state/timestamps, customer associations, report revision/details/state, or driver activity invalidate stale publication. A late Groq result cannot overwrite a superseded review.

The database serializes this bounded workflow and locks relevant source/assignment/association tables during publication. It compares the submitted review identity, exact message, and snapshot fingerprint with a freshly computed assessment. Approval, recipient rows, and audit results commit atomically; failures roll back the whole publication. Pending packages shown in the review are explicitly excluded. There is no durable approved-but-unsent state and no email transport.

Retries return the existing publication. A database uniqueness constraint prevents duplicate recipient publications for a condition revision/delivery/account. Reassessing an already published package does not send it again. Materially changed reliable information requires an explicit condition revision and another staff review. The small shared transaction lock is a hackathon tradeoff, not a production throughput design.

## Groq boundary

`/api/driver/draft` sends only the server-loaded structured condition category and a cautious uncertainty statement to the existing server-only Groq adapter. It sends no raw driver description, private notes, evidence, addresses, customer identifiers, or recipient list. Groq supplies wording only; it cannot classify, select recipients, change state, suggest actions, or publish.

The saved template remains usable if Groq is absent/fails. Manual editing remains available. All wording needs staff review and must not invent an ETA, promise delivery, or claim unverified actions. Summarization/transcription are outside this implementation.

## Historical demo setup

No driver accounts or memberships were created by implementation. A trusted administrator must confirm and assign two participant-controlled driver accounts; signing in alone does not grant a role.

After customers explicitly provision demo orders, operations can use **Explicit demo assignment history** on `/conditions`, selecting those two approved drivers. Provisioning uses up to three existing, unassigned `DEMO` delivery contexts and does not change source status or customer ownership. It is idempotent across repeated calls.

The first package is assigned to driver A starting two days before provisioning, then transfers to driver B one hour before provisioning. Other chosen packages stay with A. Test a condition two hours before provisioning: A's affected set includes the transferred package. Test after the transfer: that package belongs only to B's candidate set. Stored intervals and provenance are visible in the driver portal.

Source context may be stale or complete; those packages intentionally remain pending/excluded. Use the existing explicit demo source simulator to supply a fresh supported source update when demonstrating a positive notification. Do not silently refresh source facts or change delivery status from the driver interface. No driver fixture data is substituted after failed real requests.

## Applied migrations and verification

Applied to the confirmed shared demo project `gvutlnfsiytnayvdxqyb`:

- `20261021190236_driver_reporting_notifications.sql`
- `20261021190743_driver_draft_revision_guard.sql`
- `20261021191153_driver_policy_indexes.sql`

The local filenames match database history. Generated database types are synchronized. No paid project/branch, membership, customer association, or persistent driver demo record was created. SQL fixtures roll back; reference sequences can advance.

Verification records and remaining acceptance gates are in `PLAN_IMPLEMENTATION_STATUS.md`. New SQL assertions are in `supabase/tests/driver_notifications.sql`. Existing portal/evidence assertions now scope their operations/seller counts to fixture records so they also work alongside legitimate saved demo data.

Remaining external/acceptance work: participant driver setup and actual driver/operations publication/evidence journeys, responsive/accessibility acceptance for the protected driver/conditions views, live early-notification Groq review/publication, and the still-unconfirmed live assignment/source/customer-association contracts. No live delivery integration or overall Phase 4 completion is claimed.
