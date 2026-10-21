<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

> [!NOTE]
> On the `nextjs-migration` branch the app runs on Next.js (App Router), which the Lovable editor cannot edit. Keep that branch off the Lovable-connected branch until you decide to leave Lovable.

## Architecture (Next.js)

- `src/app/` — routing only: thin `page.tsx` files export `metadata` and render a feature view. `(operations)/layout.tsx` wraps staff pages in the ops shell; `customer/*` pages sit outside it.
- `src/features/<feature>/` — client UI per feature (`components/`), plus Server Actions (`actions.ts`).
- `src/core/domain/` — framework-free business rules and their tests. No React, Next.js or storage imports.
- `src/infrastructure/` — adapters: `demo-platform` (browser persistence, demo auth, UI data boundary), `supabase`, `ai`, `monitoring`. `*.server.ts` modules import `server-only`.
- `src/shared/` — UI primitives (`ui/`, rebuilt on Radix Themes), page layout patterns (`ui/patterns/`), hooks, utilities, metadata helper, theme settings.
- Dependency direction: app → features → infrastructure → core/domain. Domain never imports outward.

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

- Delivery exception app is a UI prototype: all business logic lives in pure functions in src/core/domain (engine, priority, lifecycle, carriers) over a browser-stored demo DB, so it can later move server-side unchanged. Tests in src/core/domain/engine.test.ts.
- UI data access goes through src/infrastructure/demo-platform/platform.ts; replace this subscription/mutation adapter with hosted queries without changing presentational components.
- Customer access and complaint rules live in src/core/domain/customer.ts; getCustomerOrder explicitly projects customer-visible fields and never staff notes, tracking events or raw carrier payloads.
- Dedicated customer pages (/customer/$access support portal, /customer/complaint standalone app) are complaints-only — no package tracking or address changes — and do not inherit the operations shell; customer preview links are simulated, not authentication.
- Keep complaint workflow and shipment status independent; validate delivery gates again inside submit services, not only by disabling UI controls.
- Customer accounts use managed email/password Auth and owner-only profiles created by a signup trigger; the standalone public complaint page offers inline authentication before its simulated reporting action, while operations and access-link demos remain unchanged.
- The root CustomerAuthProvider owns the single auth-state subscriber and revalidates initial identity through getUser; cloud passwords never enter application storage; explicitly simulated demo accounts store only salted hashes in a separate adapter and real complaint persistence remains outside the prototype.
- Customer account forms call the managed Auth client directly without a raw settings preflight; session-bearing responses reset reporting to order entry, while sessionless signup requires email confirmation before access.
- Stale dynamic-module failures recover through a guarded document reload, not router invalidation, because removed hashed assets require a fresh document; repeated failures fall back to manual retry.

- Browser persistence and React subscriptions live in service adapters, not portable domain modules, so future hosted adapters preserve domain contracts.
- All complaint entry points share validation, owner projections and one persisted reference counter; same-origin Web Locks serialize browser submissions to avoid cross-tab duplicate references.
- Public complaint responses and private staff notes use independent mutations so private investigation content never leaks through history projections.
- SLA deadlines use original opening plus current priority configuration and exclude resolved/ignored cases; one pure helper keeps overview and countdowns consistent.
- Staff AI reply drafts run server-side via the Server Action in src/features/complaints/actions.ts, backed by src/infrastructure/ai/reply-drafter.server.ts (server-only); AI only fills the draft and staff must press Send, so nothing AI-written reaches customers unreviewed.
