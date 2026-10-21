# Delivery exception platform

- [x] Combine backend/Groq continuation with teammate Radix Themes UI on `backend/groq-phase4-integration` (`9b0369e` plus shared `nextjs-migration` at `c37c6a8`). All 125 tests, typecheck, build, resolved/backend-file lint, and production browser fixtures passed. Review this branch before merging into the shared branch; live Phase 4 gates remain separate.

- [x] Phase 1: repository assessment.
- [x] Phase 2: confirmed one-company exception scope and architecture.
- [x] Phase 3: connected Next.js customer, operations, and seller portals; Google OAuth path; shared Supabase demo data; rule-based categorization/routing/guidance; staff-reviewed apology integration (now Groq, replacing Gemini).
- [x] Local domain, component, API, database transaction/RLS, production build, and fixture-based browser checks.
- [x] Bounded local customer verification: participant reports Google login, eligible report submission, persistence/details, sign-out protection, restoration after signing in again, and two-customer UI isolation. Backend customer-isolation assertions passed separately with synthetic authenticated identities and rolled-back fixtures.
- [x] Groq replacement and real adapter smoke check: `openai/gpt-oss-120b` generated an apology from fictional context; no database draft/reply created. Private persistence/audit/no-publication SQL assertions passed; all 125 tests passed.
- [x] Staff browser Groq draft/private-state check: participant confirms generation and draft-only notice; backend verifies one Groq draft/audit, unchanged one customer reply and unchanged report/source state.
- [ ] Staff review/edit/explicit-publication and customer refresh persistence for the Groq apology; final local acceptance remains pending.
- [x] Bounded operations-to-customer verification: approved staff membership established; participant confirms inbox access, private-note persistence, report `IN_REVIEW` persistence, explicit manual reply publication/persistence, customer status/reply visibility, private note/reason exclusion, and customer operations-page denial. Backend assertions passed separately. Overall Phase 4 remains incomplete.
- [ ] Phase 4: final security, integration, and end-to-end acceptance verification.
- [x] Bounded Lotus Home seller journey: approved `SELLER_STAFF` membership established; participant confirms report/handoff publication, correct seller/order visibility, no-refund-approval wording, absence of private customer/staff content, and seller denial of operations access.
- [x] Real River Books participant: replacement Google identity verified, approved active `SELLER_STAFF` membership created/read back, no staff role or customer order associations at assignment.
- [x] River Books browser access/negative checks: participant confirms correct seller heading, no Lotus Home records, and operations dashboard denial.
- [x] River Books customer positive control: participant submission and backend persistence confirmed for `RPT-2026-000017` / `DEMO-000080`, deterministic `DAMAGE` category, refund intent, one handoff, and unchanged delivered source status.
- [x] River Books operations publication: participant confirms access/publication/refresh; backend read-back confirms saved findings, one refund handoff, one handoff audit, unchanged delivered source status, and no customer reply.
- [x] Bounded local cross-seller browser isolation: participant confirms both seller refresh checks, each sees its own findings and excludes the other's records, including River Books order `DEMO-000080`. Separate backend SQL assertions passed; no independent real-session HTTP attack capture is claimed.
- [x] Resumed Phase 4 backend seller isolation: both sellers' positive controls and cross-seller/audience/command/membership boundaries passed with rolled-back synthetic identities. Full 110-test suite, typecheck, and build passed locally. Real browser acceptance remains separate.
- [ ] Final responsive/accessibility/security acceptance: owner selected local-only target. Deployed OAuth is deferred and not verified.
- [x] Customer evidence upload/reopen: participant confirms initial image opening and reopening after refresh; backend verifies attachment metadata and object in the private bucket for `RPT-2026-000018` / `DEMO-000078`.
- [x] Real-session operations evidence opening and River Books seller denial via the application endpoint, participant-reported.
- [x] Own-seller Lotus Home direct evidence denial: participant explicitly confirms **Evidence unavailable**.
- [x] Unread reply indicator/clearing/refresh for `RPT-2026-000018`: all participant steps passed; backend verifies one reply, one reply audit, and customer read marker after the reply. Report/source statuses remain unchanged.
- [ ] Future source-system integration after its interface and ownership mapping are confirmed.

The earlier checkpoint stopped at the owner's request on 21 October 2026. The owner subsequently authorized resuming at cross-seller isolation, as recorded above. Automated Chrome Google sign-in was blocked; completed browser checks above are participant-reported regular-browser results. Database assertions are separate synthetic-identity evidence. Phase 4 remains incomplete. See [implementation status](PLAN_IMPLEMENTATION_STATUS.md) for both checkpoints.
