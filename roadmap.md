# Delivery exception platform

- [x] Phase 1: repository assessment.
- [x] Phase 2: confirmed one-company exception scope and architecture.
- [x] Phase 3: connected Next.js customer, operations, and seller portals; Google OAuth path; shared Supabase demo data; rule-based categorization/routing/guidance; staff-reviewed Gemini apology integration.
- [x] Local domain, component, API, database transaction/RLS, production build, and fixture-based browser checks.
- [x] Bounded local customer verification: participant reports Google login, eligible report submission, persistence/details, sign-out protection, restoration after signing in again, and two-customer UI isolation. Backend customer-isolation assertions passed separately with synthetic authenticated identities and rolled-back fixtures.
- [ ] Live Gemini verification after server credentials/model are supplied.
- [x] Bounded operations-to-customer verification: approved staff membership established; participant confirms inbox access, private-note persistence, report `IN_REVIEW` persistence, explicit manual reply publication/persistence, customer status/reply visibility, private note/reason exclusion, and customer operations-page denial. Backend assertions passed separately. Overall Phase 4 remains incomplete.
- [ ] Phase 4: final security, integration, and end-to-end acceptance verification.
- [x] Bounded Lotus Home seller journey: approved `SELLER_STAFF` membership established; participant confirms report/handoff publication, correct seller/order visibility, no-refund-approval wording, absence of private customer/staff content, and seller denial of operations access.
- [ ] Cross-seller isolation acceptance: no second seller account nominated or assigned during this continuation.
- [ ] Real browser evidence upload/download, unread clearing, deployed OAuth redirects, and final responsive/accessibility/security acceptance.
- [ ] Future source-system integration after its interface and ownership mapping are confirmed.

Stopped at the owner's request on 21 October 2026. Do not resume verification or membership/database changes without new task authorization. Automated Chrome Google sign-in was blocked; completed browser checks above are participant-reported regular-browser results. Database assertions are separate synthetic-identity evidence. Phase 4 remains incomplete. See [implementation status](PLAN_IMPLEMENTATION_STATUS.md) for the full checkpoint.
