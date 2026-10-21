# Teammate and Agent Handoff

Last updated: 21 October 2026

This guide transfers the project context to a teammate working on another laptop. Their agent should use the repository documents as the shared record; it will not automatically inherit the original chat.

Current continuation: the LLM provider is **Groq**, model `openai/gpt-oss-120b`; earlier Gemini references in checkpoint history are historical. The review branch is `backend/groq-phase4-integration`, combining backend commit `9b0369e` and the teammate's Radix Themes UI already merged into shared `nextjs-migration` at `c37c6a8`. All 125 tests, typecheck, production build, lint on resolved/backend files, and the fixture-based production browser checks passed on the combined code. Local cross-seller/evidence/unread participant checks, real Groq fictional-context generation, private draft persistence, and browser draft generation were recorded before integration. Next live gate is review/edit/explicit publication on `RPT-2026-000018` (latest baseline: one draft, one customer reply). Phase 4 and final local acceptance remain incomplete. Earlier uncommitted descriptions below are historical; inspect current Git status before continuing.

Latest Groq checkpoint: participant confirms browser generation and draft-only notice, with no new customer reply. Backend verifies one `openai/gpt-oss-120b` draft, one provider-neutral `SAVE_DRAFT` audit, unchanged one reply, and unchanged report/source state. Next is staff editing and explicit publication, then customer verification of the edited reply appearing once and persisting after refresh. Do not regenerate unnecessarily or claim this final publication gate already passed.

## 1. Share the actual current code first

Integration targets `backend/groq-phase4-integration`: the owner's backend continuation was saved as `9b0369e` and combined with `origin/nextjs-migration` at `c37c6a8`, which already includes `radix-themes` (`8d87a6e`, PR #1). Conflicts retain the Radix visual system and Groq-reviewed-draft behavior. All combined checks listed above passed. Share this review branch and coordinate its merge into `nextjs-migration`; do not cherry-pick the UI a second time or rewrite published history. Local `.env`/`.env.local` and browser artifacts are ignored and do not transfer with the branch.

Current continuation baseline: `2b7c47e` includes the teammate's verification script, SQL tests, and documentation. The uncommitted-artifact description below is historical. The owner has since authorized resuming Phase 4 at cross-seller isolation; see the resumed checkpoint in [implementation status](PLAN_IMPLEMENTATION_STATUS.md#resumed-seller-isolation-verification-21-october-2026). Check Git status for this continuation's new changes before sharing.

At this handoff checkpoint, the Phase 3 implementation and handoff documentation are committed on `nextjs-migration` at `45f9f93582ba14c70b54ea098bcac32156cedd75` (`Implement single-company exception portals and team handoff`). The working tree was clean when this baseline was recorded. Confirm the teammate's clone includes this commit before continuing; the earlier `35df8fb` commit does not contain the Phase 3 implementation.

At the 21 October 2026 stop checkpoint, HEAD is still that baseline, but the working tree now contains uncommitted continuation documentation and three untracked verification artifacts: `scripts/verify-google-live.mjs`, `supabase/tests/customer_isolation.sql`, and `supabase/tests/operations_customer_reply.sql`. Preserve these along with the pre-existing documentation edits. Cloning the baseline alone will not include them. No commit or push was performed during this continuation.

If additional changes are made before sharing the checkout, review and publish them before handing it off:

```sh
git status
git diff
# Review new/untracked files too; git diff does not display their contents.
# After reviewing the intended changes and confirming credentials are excluded:
git add -A
git diff --cached --stat
git commit -m "Implement single-company exception portals and document handoff"
git push origin nextjs-migration
git rev-parse HEAD
```

Share the resulting commit hash with the teammate. Do not commit `.env`, `.env.local`, credentials, `node_modules`, build output, or local screenshots. The repository's ignore rules exclude those local artifacts.

## 2. Set up the teammate's laptop

Use Node.js 22 and npm. The original implementation was checked using Node.js 22.20.0. Install Google Chrome if running the included browser verification script.

```sh
git clone --branch nextjs-migration --single-branch https://github.com/YesBlueue/deli-exception-ui.git
cd deli-exception-ui
git rev-parse HEAD
git switch -c teammate/phase4-validation
npm ci
```

Compare the checked-out commit with the owner's handoff hash. If the owner has pushed additional changes, fetch and coordinate the intended baseline before starting work.

Copy `.env.example` to `.env.local` and obtain the team's Supabase URL and publishable key through the agreed team channel:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key

# Needed only to exercise live apology drafting:
GROQ_API_KEY=
GROQ_MODEL=openai/gpt-oss-120b
```

Keep the Groq key server-side. Normal application workflows do not need a service-role key. Never copy privileged credentials into `NEXT_PUBLIC_*` variables or source control.

```sh
npm run dev
```

On Windows PowerShell, use `npm.cmd` if execution policy blocks `npm.ps1`. Restart the dev server after changing environment variables.

When an agent starts Next.js inside a network-restricted sandbox, the browser can reach Google while the server's Supabase session exchange fails. During resumed verification this produced the generic OAuth error; a server-side Auth health probe reported `EACCES`. Run the dev server from a normal terminal or with approved network access. After restarting, begin a fresh Google sign-in rather than reusing an old callback. Auth health HTTP 200 confirms connectivity, not successful Google authentication.

## 3. Choose the database environment deliberately

### Using the existing team Supabase project

The project configured during Phase 3 was `gvutlnfsiytnayvdxqyb`. Its application migrations were applied, and two labeled demo sellers were seeded.

- Use that project only if the team intends to share its demo data and has granted the teammate the appropriate access.
- **Do not run `supabase/bootstrap.sql` against it.** That script is for an empty project.
- Do not replay applied migrations manually. Inspect migration history before proposing additional schema changes.
- Treat role assignment as a trusted administrator task. Signing in does not automatically grant staff or seller access.
- If the teammate's agent has database tools, confirm the target project ID before any query that changes data.

### Using a separate empty Supabase project

- Explicitly agree to use a separate project; do not create a paid project or branch implicitly.
- Run `supabase/bootstrap.sql` first, then apply `supabase/migrations/` in filename order.
- Configure Google OAuth, application redirect URLs, and environment values for that project.
- Sign in, confirm the user UUIDs, and assign staff/seller memberships as needed.
- Regenerate database types after intentional schema changes.

The shared-project migrations, OAuth configuration, memberships, and data do not automatically transfer to a different Supabase project.

## 4. Documents the teammate's agent must read

| Order | File                                                           | Purpose                                                                                       |
| ----- | -------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| 1     | [AGENTS.md](AGENTS.md)                                         | Product boundaries, architecture, access rules, AI restrictions, and development constraints. |
| 2     | [PLAN_IMPLEMENTATION_STATUS.md](PLAN_IMPLEMENTATION_STATUS.md) | How the plan changed, what exists, what remains, verification limits, and excluded features.  |
| 3     | [README.md](README.md)                                         | Local setup, routes, Google/Groq configuration, memberships, and verification commands.     |
| 4     | [MIGRATION.md](MIGRATION.md)                                   | Active data path, deterministic rules, migrations, and known external dependencies.           |
| 5     | [roadmap.md](roadmap.md)                                       | Short phase-status checklist.                                                                 |
| 6     | [TEAM_HANDOFF.md](TEAM_HANDOFF.md)                             | Git baseline, environment transfer, and continuation procedure.                               |

Then inspect the code relevant to the assigned task. Do not replace these documents with assumptions based on the old multi-carrier files.

## 5. Product context to preserve

- One delivery company serves multiple sellers and customers.
- The existing delivery system owns delivery creation and the full delivery lifecycle. Our app handles exceptions using limited received or simulated context.
- The customer portal is the existing responsive Next.js website, not a native app.
- Main customer flow: Google sign-in, authorized order selection, report submission, report history/status, and portal replies.
- Categorization, eligibility, routing, priority, and suggested actions use deterministic rules.
- Groq only drafts apology letters. Staff reviews and explicitly publishes them; the LLM cannot make operational decisions or execute actions.
- Sellers see their relevant exceptions, seller-visible updates, and refund-information handoffs. They do not create deliveries or process refunds through this app.
- Private notes, customer messages, seller updates, and evidence have separate audiences enforced on the backend and through RLS.
- Demo data must be labeled. Never replace failed production requests with silent demo fallback.
- Preserve the current design system. Do not restore Lovable services or the multi-carrier product model.

## 6. What to continue with

**Resumed continuation:** the owner authorized cross-seller verification. New rollback-only [seller-isolation assertions](supabase/tests/seller_isolation.sql) passed with positive controls for both sellers, audience separation, denied staff/direct-write commands, and inactive-membership/metadata checks. All 110 tests, typecheck, and production build passed locally. After replacing the initially fictional account, the owner nominated their real Google account for River Books. Trusted administration verified its Google identity, no staff/existing seller role, and zero customer order associations; approved active River Books `SELLER_STAFF` membership was created and read back. This membership persists. Two-seller browser acceptance remains pending; River Books has no published findings yet, so a positive control must be created through the participant customer/operations workflow. The stop instructions below describe the earlier checkpoint, superseded only for the newly authorized continuation.

The participant subsequently confirmed the River Books heading, no Lotus Home records, and denied operations dashboard access. Record these as participant-reported access/negative checks. The next pending step is customer submission on a delivered River Books demo order, followed by operations publication of seller findings and checks that River Books sees them while Lotus Home does not. River Books had zero exceptions/updates at the last read-only check; do not treat an empty portal alone as complete cross-seller acceptance.

Latest positive-control progress: participant customer submission succeeded; a read-only backend check confirmed `RPT-2026-000017` / `DEMO-000080` for River Books, `DAMAGE`, refund intent, one handoff, `NEW` report, unchanged `DELIVERED` source, and zero customer replies. Next, the participant operations account must publish seller-visible findings with **Update seller refund handoff**; then check both seller portals after refresh. This creates persistent demo records, unlike rollback-only SQL fixtures.

The owner nominated another newly signed-in Google account to perform that operations step and explicitly authorized its access. Its Google identity and lack of conflicting memberships were verified, then active `OPERATIONS` membership was created/read back with no active seller membership. This new membership persists alongside the earlier operations account; no existing role was replaced. Operations browser access/publication is pending. Confirm personal account mappings through trusted administration rather than adding them to this repository.

Latest checkpoint: participant confirms the new operations journey works. Backend read-back confirms the River Books finding persisted for `RPT-2026-000017` / `DEMO-000080`, one refund handoff, one `HANDOFF` audit event, unchanged delivered source status, and no customer reply. Next is final paired seller refresh verification: River Books sees this finding and excludes Lotus Home records; Lotus Home retains its own findings and excludes this River Books order/finding. Neither the paired browser gate nor Phase 4 is marked complete yet.

The participant then confirmed both paired seller refresh checks passed. The bounded local cross-seller browser gate is now complete based on participant reports; separate seller-isolation SQL tests supply backend evidence, not captured real-session HTTP attacks. Next: authenticated customer image upload/reopen/persistence, operations evidence access, seller evidence denial, then unread clearing. Gemini configuration, deployed OAuth, and final acceptance remain pending; Phase 4 is incomplete.

Evidence continuation: participant confirms customer image upload, initial opening, and reopening after refresh. Backend read-back confirms `RPT-2026-000018` / `DEMO-000078` (Lotus Home) with a 25,190-byte WebP attachment, its Storage object, and a private bucket. Operations attachment opening and direct seller denial at `/api/evidence?id=<attachment-id>` are pending. Use the application endpoint for denial checks, never a copied temporary signed Storage URL. Do not store image content or signed URLs in the repository.

Subsequently, participant confirms operations image access and direct River Books seller denial. The own-seller Lotus Home evidence-endpoint denial check is pending. Unread checking is in progress for `RPT-2026-000018`: baseline read-back had zero replies/no read marker; requested participant operations publication of a manual reply, customer closed-report New update indicator, opening/clearing, and persistence after refresh. Await reported results and backend reply/read-state read-back before marking it passed.

Latest evidence/unread checkpoint: participant confirms all unread steps passed and explicitly reports **Evidence unavailable** as Lotus Home seller for its own order's attachment. Backend read-back confirms one reply, one `REPLY` audit, read marker later than the reply, unchanged report `NEW` and source `DELIVERED`. Bounded local evidence/unread gates are complete with these participant-report limits. Remaining: server-only Gemini configuration (key/model currently unset), live draft/edit/explicit publish checks, deployment-specific OAuth and final responsive/accessibility/security acceptance. Requested the owner's intended final environment; no deployment or live Gemini call performed.

Current environment decision: owner selected **local-only acceptance**. A server-only Gemini key was added locally and `GEMINI_MODEL=gemini-3.8-flash` was set in ignored `.env.local`, matching official Google documentation. The read-only model metadata check returned HTTP 400 `FAILED_PRECONDITION`, **User location is not supported for the API use.** Live Gemini generation/review/publication remains blocked by provider availability; no generation occurred. Continue local responsive/accessibility/security checks. Deployed OAuth is deferred, not verified. Never commit the local key or assume this local configuration transfers to another laptop.

**Current provider: Groq.** The owner replaced Gemini with `openai/gpt-oss-120b`. Active setup is server-only `GROQ_API_KEY` / `GROQ_MODEL`; local values are in ignored `.env.local`. No active fallback to Gemini exists. The server adapter passed a real Groq generation using fictional context; no database draft or reply was created by that smoke check. UI says **Draft apology with Groq** and preserves staff editing/explicit publication. Migration `20261021134148_provider_neutral_apology_audit.sql` was applied to the confirmed shared project and matches its migration-history version; it changes only future draft audit wording to **AI apology draft saved; not published**. Applied historical migrations/logs were preserved. Rollback-only `supabase/tests/apology_drafts.sql` passed for staff-only persistence, correct model/audit, no automatic publication or status change, and customer draft privacy. All 125 tests passed; staff browser generation/edit/publication still needs participant acceptance. Rotate the chat-shared Groq key before wider use; never record it here.

Phases 1 and 2 are complete. Phase 3's core implementation exists. The owner authorized bounded customer, operations-to-customer, and Lotus Home seller verification during this continuation, then explicitly stopped verification on 21 October 2026. **Do not resume work or database/account changes without new task authorization. Phase 4 remains incomplete.**

The checkpoint in [PLAN_IMPLEMENTATION_STATUS.md](PLAN_IMPLEMENTATION_STATUS.md) records participant-reported regular-browser customer login/report/persistence/sign-out, two-customer UI isolation, operations notes/status/manual reply and customer privacy/access checks, and Lotus Home handoff visibility/privacy/access checks. Real database customer-isolation and operations/customer-reply assertions passed separately using synthetic authenticated identities with rolled-back rows. Automated Chrome Google sign-in was blocked and its live script did not complete; never describe that script as a successful Google journey.

Persistent changes in the confirmed shared demo project `gvutlnfsiytnayvdxqyb` include explicitly approved active `OPERATIONS` and Lotus Home `SELLER_STAFF` memberships, plus participant-created demo reports/notes/statuses/replies/seller findings. SQL test fixtures rolled back, but reference sequences may advance. Do not repeat membership inserts blindly or remove these records as test cleanup. Personal account emails/UUIDs are not recorded here; confirm mappings through trusted administration if authorized work resumes.

The proposed next bounded task, only after new authorization, is cross-seller isolation. No second River Books account was nominated or assigned. A second participant-controlled Google account and explicit membership approval are needed for real-browser acceptance. Existing Phase 3 synthetic cross-seller assertions are historical evidence and were not rerun during this continuation.

Other outstanding verification includes real browser evidence upload/download, unread clearing, deployment-specific Google redirects, live Gemini drafting/review/explicit publication with confirmed server configuration, and final responsive/accessibility/security acceptance. Do not infer current Gemini credentials or model availability from the code.

Live delivery-system integration is future work dependent on a confirmed source contract. Seller acknowledgment, optional report-direction email, evidence retry/cleanup, production hardening, and legacy cleanup have separate scope notes in [the implementation status document](PLAN_IMPLEMENTATION_STATUS.md). They are not automatic instructions to build extra features.

## 7. Starter prompt for the teammate's agent

Paste this into a new agent conversation opened in the repository:

```text
You are continuing an existing project, not starting a new application.

Read these files first, in order:
1. AGENTS.md
2. PLAN_IMPLEMENTATION_STATUS.md
3. README.md
4. MIGRATION.md
5. roadmap.md
6. TEAM_HANDOFF.md

Inspect git status, the current branch/commit, and the relevant active code.
Confirm this checkout includes baseline commit
45f9f93582ba14c70b54ea098bcac32156cedd75 or a later coordinated commit.
Preserve existing uncommitted work and do not rewrite published history.

This is a Next.js/Supabase exception-handling layer for one delivery company.
The company's existing delivery system owns the full delivery lifecycle.
All portals, including the customer portal, belong to the same Next.js website.
Google is the customer sign-in flow. Rules govern operational decisions;
Groq only drafts apologies that staff must review and explicitly publish.
Preserve the existing visual design and backend audience/ownership boundaries.

Legacy browser-demo modules are not the active portal data path. Do not restore
multi-carrier selection, seller delivery creation, invitation-based authorization,
Lovable services, or silent demo fallback.

Before editing files or the database, summarize:
- the confirmed product scope;
- the current implementation and verification evidence;
- missing setup versus unfinished code versus unverified workflows;
- the smallest appropriate next task and any required access/configuration.

Do not assume access to the original conversation, credentials, Google accounts,
Supabase project, or Groq configuration. Confirm the database target before writes.
Do not mark real Google/Groq workflows or Phase 4 complete based on mocked tests.
Wait for my explicit task/phase authorization after the summary.
```

After reviewing that summary, the teammate can explicitly authorize a bounded task. For example:

```text
I authorize Phase 4 verification against the agreed demo environment.
Start with Google sign-in, authorized order access, and customer report creation.
Use the confirmed accounts and project. Fix defects found in those workflows,
preserve the design system, and report actual evidence and remaining blockers.
Do not implement a live delivery-system adapter or unrelated features.
```

## 8. Re-establish verification on the new laptop

```sh
npm test
npm run typecheck
npm run build
```

The original implementation recorded 110 passing tests and a successful build. Recheck rather than assuming those results carry over to a new environment. Repository-wide lint has historical formatting issues; distinguish those from new failures in changed code.

For browser fixture checks, run the production server and the script in separate terminals:

```sh
npm start -- --port 3004
```

```sh
node scripts/verify-portals.mjs
```

This script uses installed Chrome, checks a real unauthenticated API boundary, and then uses explicit authenticated UI fixtures. It does not perform real Google consent or prove live authenticated workflows.

Database assertions are in [portal_workflows.sql](supabase/tests/portal_workflows.sql) and [evidence_access.sql](supabase/tests/evidence_access.sql). Use an agreed test environment and a trusted connection; their fixtures are rolled back. Do not treat them as seed scripts or replace the project with an empty database.

The continuation adds [customer_isolation.sql](supabase/tests/customer_isolation.sql) and [operations_customer_reply.sql](supabase/tests/operations_customer_reply.sql), both executed successfully against the confirmed shared demo project. Eleven focused auth/configuration/portal/routing tests, typecheck/build and script lint passed earlier; four portal API tests and seven operations/API tests passed in later focused runs. These test sets overlap. These results are separate from the historical 110-test suite; no full suite was rerun at the stop checkpoint. The documentation-only stop update requires no additional application or database test run.

## 9. Keep the shared record current

After authorized work, the teammate should update the implementation-status document and roadmap with what changed, what was actually verified, and what remains. Commit documentation together with the relevant code and migrations. Share the resulting commit hash and coordinate shared-database changes with the team.
