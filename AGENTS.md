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

- Delivery exception app is a UI prototype: all business logic lives in pure functions in src/lib/demo (engine, priority, lifecycle, carriers) over a browser-stored demo DB, so it can later move server-side unchanged. Tests in src/lib/demo/engine.test.ts.
- UI data access goes through src/lib/services/platform.ts; replace this subscription/mutation adapter with hosted queries without changing presentational components.
- Customer access and complaint rules live in src/lib/demo/customer.ts; getCustomerOrder explicitly projects customer-visible fields and never staff notes, tracking events or raw carrier payloads.
- Dedicated customer pages (/customer/$access support portal, /customer/complaint standalone app) are complaints-only — no package tracking or address changes — and do not inherit the operations shell; customer preview links are simulated, not authentication.
- Keep complaint workflow and shipment status independent; validate delivery gates again inside submit services, not only by disabling UI controls.
