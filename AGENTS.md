# Project guidance

This is a Next.js and Supabase exception-handling layer for one delivery company. Its existing delivery system owns delivery creation and the full lifecycle. The customer portal is the existing responsive Next.js website, never a separate native app.

Before continuing work in a new session or checkout, read `PLAN_IMPLEMENTATION_STATUS.md`, `README.md`, `MIGRATION.md`, `roadmap.md`, and `TEAM_HANDOFF.md`. Confirm the Git baseline and separate pending configuration, unfinished implementation, and unverified workflows. Follow only the task or phase authorized in the current conversation.

## Active architecture

- Routes and role gates: src/app. Connected views: src/features/portal/components.
- Data adapter: src/infrastructure/portal. Server sessions: src/infrastructure/supabase/session.server.ts. Browser sessions use @supabase/ssr cookies and the Next.js OAuth callback.
- Business rules: src/core/domain/exception-rules.ts and guarded database functions in supabase/migrations. Keep guidance pure and test SQL/TypeScript classification parity.
- Database writes go through authenticated, audited transactions. Do not replace RLS with client filtering or expose service-role credentials.
- Source delivery status, report status, exception status, and seller handoff state are independent.
- Customer reads/writes require an account-to-delivery association. Google metadata and order references do not establish authorization.
- Staff roles and seller memberships are backend-controlled. Only ADMIN/OPERATIONS memberships access operations workflows.
- Customer messages, private notes, seller updates, and evidence have distinct audience boundaries.
- Gemini is permitted only for server-side apology drafts reviewed by staff. Never use it for categorization, routing, next-action suggestions, or automatic workflow actions. No Lovable services.
- Next-action suggestions are deterministic explanations only; rendering them never triggers mutations.
- Demo source context is explicitly labeled and provisioned in the database. Never fall back to browser fixtures after a failed real request.
- Preserve existing colors, typography, spacing, shared components, and responsive layout. IBM Plex font files are locally served.
- Legacy browser-demo files remain for historical tests/reference; active routes must not import their storage adapters or invite-link flows.
- Applied Supabase migrations are tracked in supabase/migrations. The bootstrap SQL is only for empty projects. Keep generated types synchronized.

## Verification

Run relevant domain/component/API tests, typecheck, and production build. Database assertions in supabase/tests roll back their fixtures. Browser fixture tests are not proof of live Google authentication. Do not claim Phase 4 or external integration complete without verification.

Do not rewrite published Git history.
