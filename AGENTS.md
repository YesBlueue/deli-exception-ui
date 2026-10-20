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
- `src/shared/` — shadcn UI primitives (`ui/`), hooks, utilities, metadata helper.
- Dependency direction: app → features → infrastructure → core/domain. Domain never imports outward.

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
