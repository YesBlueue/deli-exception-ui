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
- Keep the look consistent through the design system below (Radix Themes, shared patterns, theme tokens). IBM Plex font files are locally served.
- Legacy browser-demo files remain for historical tests/reference; active routes must not import their storage adapters or invite-link flows.
- Applied Supabase migrations are tracked in supabase/migrations. The bootstrap SQL is only for empty projects. Keep generated types synchronized.

## Design system (Radix Themes)

Reference page: `/design-system` (development only; also linked in the dev sidebar). Check it before adding UI.

- **Foundation:** Radix Themes. Theme settings live in `src/shared/theme.ts` (`STAFF_THEME`, and `CUSTOMER_THEME` for `/customer/*`). Brand colors and app tokens live in `src/styles/globals.css`. In development, press **T** to open the ThemePanel and try settings; copy the chosen values into `theme.ts`.
- **Color rule 60-30-10:** 60% neutral surfaces (Radix gray); 30% brand navy (`text-primary`/`bg-primary`) for structure, links, focus, selected and active states; 10% brand orange (`bg-cta`) **only** for the main action. The default `Button` variant is that orange action — use one per screen or dialog, and secondary/outline/ghost for everything else. Selection uses navy or a segmented control, never orange.
- **Fixed status meanings:** critical red, high crimson, medium yellow, low gray, success green, info blue, simulated purple (`text-critical`, `bg-high-soft`, …). Never use these for decoration, and never use orange for a status.
- **Brand palette:** navy `#243e8a` and orange `#f4a124` replace Radix's `indigo` and `orange` scales, so `accentColor="indigo"` is navy. Light appearance only; the brand scales have no dark variants yet.
- **Build pages from patterns** (`@/shared/ui/patterns`): `PageHeader`, then `StatGrid`/`StatTile`, then `Panel`s. Use `DataTable`, `FilterBar`/`SearchField`, `LinkList`/`LinkRow`/`ButtonRow`, `StatList`, `Timeline`, `KeyValueList`, `EmptyState`, `Field`, `Notice`, `BackLink`, `PhotoThumb`; customer pages use `SiteShell` + `BrandMark`. Do not hand-write cards, headers, tables or message boxes.
- **Typography:** Radix `Heading`/`Text` sizes (Heading 7 page title, 5 dialog, 4 page section, 3 panel; Text 2 body, 1 gray metadata), IBM Plex Sans/Mono. Prefer them over Tailwind text sizes.
- **Messages:** `Notice` for in-page and form messages (`role="alert"` for errors, `role="status"` for confirmations); `toast` (Sonner, themed in `src/shared/ui/sonner.tsx`) for brief confirmation of an action; badges for record state.
- **Layout:** Tailwind breakpoints only (sm 640, lg 1024, xl 1280). `DataTable` switches from list to table at `xl`. Every page must have no horizontal scroll at 390px. Named layouts go in `globals.css` as `@utility` (e.g. `grid-cols-main-aside`).
- **Guardrail (ESLint, errors):** in `src/app`, `src/features` and `src/shared/ui/patterns`, class strings may not use arbitrary values (`text-[11px]`, `max-h-[90vh]`), Tailwind palette colors (`text-red-500`, `bg-white`) or hex colors in `style`. Use a token, a standard Tailwind step, a Radix prop (`maxHeight="90vh"`) or a new named utility. Arbitrary variants like `[&_svg]:size-4` are fine. The vendored shadcn primitives in `src/shared/ui` are exempt.

## Verification

Run relevant domain/component/API tests, typecheck, and production build. Database assertions in supabase/tests roll back their fixtures. Browser fixture tests are not proof of live Google authentication. Do not claim Phase 4 or external integration complete without verification.

Do not rewrite published Git history.
