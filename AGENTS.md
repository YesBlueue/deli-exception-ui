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
