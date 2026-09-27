# Push-to-test CI/CD plan

Date: 2026-09-22  
Status: planned; no environments, workflows, domains, or secrets have been configured by this task.

## Goal and chosen direction

Pushing to a permanent `staging` branch should run automated checks, update an isolated test database, and deploy the application to one stable test URL. Test accounts and test data should survive normal deployments. Production remains a separate release path.

Recommended starting setup:

| Component | Staging | Production |
| --- | --- | --- |
| Git branch | `staging` (proposed; create during implementation) | Verify the existing production branch before changing anything |
| Deployment trigger | GitHub Actions on push to `staging` | Preserve the existing trigger during the staging rollout |
| Vercel environment | Preview with staging-specific configuration; no custom environment required | Existing production environment |
| Website URL | Fixed Vercel URL first; confirm a stable alias supported by the chosen deployment method | Existing production domains |
| Supabase | Dedicated persistent test project | Existing application project |
| Accounts and content | Fictional businesses, test users, sample websites and bookings | Existing customer data |
| External integrations | Test mailboxes, sandbox credentials, isolated calendars | Existing production integrations |

A separate Supabase project is the recommended starting point because this environment needs persistent test data and independent configuration. Supabase branching is not included in Free and is outside the initial setup. Per-pull-request databases are deferred until simultaneous isolated feature testing is needed.

## Free-plan constraints and options

The user confirmed they do not currently have Supabase Pro or Vercel Pro. No upgrade is assumed or authorized.

- Vercel supports a persistent Preview branch for staging on Hobby, with branch-specific environment variables. A named custom environment is unnecessary for this workflow.
- Vercel Hobby is restricted to personal, non-commercial use. Preview capability does not establish eligibility for hosting this business project on Hobby. Confirm an appropriate plan or hosting option for commercial use; calling a deployment staging does not automatically make it non-commercial.
- Supabase Free allows two active free projects across organizations where the user is an Owner or Administrator. Creating another organization does not create an extra allowance. Paused projects do not count toward the limit.
- The current connector inventory shows two active projects: `jk-bnb-editor-db` and `fleursetebeilles-db`. A third free hosted test project cannot be assumed available.
- If the other project is genuinely unused, the user can explicitly authorize pausing it to free a slot for staging. Pausing takes that project's services offline; do not do it as an automatic setup step.
- If both projects are needed, use local Supabase and disposable CI databases for free migration/integration testing while deciding on hosted database capacity. These databases do not provide a persistent backend reachable by a Vercel test website.
- Do not point staging at production or use a second schema in the production project as a substitute for full environment isolation.
- Free Supabase projects can pause after one week of inactivity. Document manual restoration and its effect on staging availability rather than promising an always-on environment.
- GitHub Actions includes free usage subject to repository visibility, runner type, and account quotas. Check available minutes/storage and configure spending controls before enabling frequent builds.

Additional decisions before hosted staging can be provisioned:

- [ ] Confirm whether either existing Supabase project can be paused, or choose another supported capacity option. Do not pause, delete, or repurpose a project without explicit authorization.
- [ ] Confirm that the chosen Vercel plan permits this project's use, separately from whether it supports Preview deployments.
- [ ] If hosted capacity remains unavailable, implement local/CI checks first and leave hosted staging clearly marked incomplete.

Sources: [Vercel staging environments](https://vercel.com/docs/deployments/environments), [Vercel Hobby eligibility](https://vercel.com/docs/plans/hobby), [Supabase Free project limits](https://supabase.com/docs/guides/platform/billing-on-supabase), [Supabase pricing and branching availability](https://supabase.com/pricing), [GitHub Actions billing](https://docs.github.com/en/billing/concepts/product-billing/github-actions).

## Findings already verified

These checks establish the starting point, not completion of the implementation.

- [x] The repository remote is `jasperdeklijn/BnB-Editor` on GitHub.
- [x] `package.json` provides `lint`, `typecheck`, `test`, and `build` scripts.
- [x] There is currently no `.github/workflows` directory or `supabase/config.toml`.
- [x] `tests/sql-bootstrap.test.mjs` uses PGlite to check application SQL and bootstrap repeatability. It does not establish hosted Auth/Storage or complete migration replay correctness.
- [x] `app/api/health/route.ts` checks core environment readiness and a database query. It does not verify complete business flows or all integrations.
- [x] `supabase/init.sql` intentionally drops application tables. It must never run as a normal deployment step.
- [x] The earliest migration references existing `websites` data structures; the current migration folder cannot simply be assumed to initialize an empty database.
- [x] Two migration filenames share the version prefix `20260115`. Their history needs reconciliation before a CLI-based migration rollout.
- [x] With production configuration, `lib/supabase/middleware.ts` treats `test.flexpagina.nl` as `/site/test`.
- [x] `test` and `staging` are absent from the reserved onboarding slugs in `lib/onboarding/slug.ts` and the corresponding check in `supabase/init.sql`.
- [x] `.env.example` and `lib/environment-readiness.ts` identify core secrets and optional integration settings.

Account observations from the research on 2026-09-22, to recheck before implementation:

- The Supabase connector exposed `jk-bnb-editor-db` and one other active project; their organization reported the Free plan.
- The application's default Supabase branch reported `MIGRATIONS_FAILED` with an older timestamp, while the project reported `ACTIVE_HEALTHY`. The cause is unverified; this is not proof that the live application is broken.
- The Vercel connector returned no teams. The active project, plan, deployment settings, and DNS configuration remain unverified.

## 1. Confirm resources and deployment ownership

- [ ] Identify the actual Vercel project/team, production branch, domains, current Git deployment rules, and subscription plan.
- [ ] Match the application's Supabase URL to the intended project without logging secret values.
- [ ] Recheck Supabase organization billing and eligibility for another project. Free pricing lists a two-active-project limit; do not assume another hosted environment is free.
- [ ] Record the proposed test project, region, expected recurring cost, and selected Vercel environment before provisioning.
- [ ] Confirm any paid resource creation with the user after the exact cost is known. Creating this plan does not authorize purchases or production changes.
- [ ] Create the `staging` branch and define how local changes will reach it. Pushes to it should be sufficient; a pull request should not be required just to update the test site.
- [ ] Decide which system owns staging deployment: GitHub Actions should own checks, migration ordering, deployment, and stable URL assignment.
- [ ] Prevent duplicate native Vercel deployments for `staging` without globally disabling the current production deployment path.
- [ ] Verify GitHub Actions availability, environment secrets, and any applicable repository/plan limitations.

## 2. Prepare a reliable database migration path

- [ ] Compare committed migration versions with the remote applied migration history, including any manually applied SQL.
- [ ] Investigate the recorded `MIGRATIONS_FAILED` status and record the actual failing operation if available.
- [ ] Resolve duplicate migration versions against the real history. Do not blindly rename applied migrations or mark unapplied SQL as applied.
- [ ] Choose and document a reproducible baseline for a fresh database. Reconcile historical migrations against that baseline before enabling automatic deployment.
- [ ] Add the Supabase CLI configuration needed for local/CI use, using a pinned CLI version and its current command help.
- [ ] Prove clean database initialization and an upgrade from the agreed baseline in a disposable database.
- [ ] Test RLS/tenant isolation, required grants, security-definer RPC access, and the production-style shared rate limiter against a Supabase-compatible test environment.
- [ ] Keep relevant application schema changes consistent with `supabase/init.sql` for fresh-install support; deployment uses incremental migrations only.
- [ ] Provision the isolated test project after resource approval, and apply the verified baseline once.
- [ ] Configure Auth, Storage buckets/policies, and other required service settings explicitly; application SQL alone may not reproduce them.
- [ ] Add repeatable fictional seed data and test users. Seed setup should not wipe or duplicate data on every push.
- [ ] Keep any destructive test-data reset as a separate manual operation with a check of the exact target project.

Watch out: a successful `init.sql` test is not evidence that the historical migration chain can be replayed. Database migrations also remain applied if a later application deployment fails. Use backward-compatible changes so the previous staging build can continue working.

## 3. Isolate domains, authentication, and integrations

- [ ] Select a stable Vercel test URL and configure its assignment explicitly. Do not assume CLI deployments automatically produce native Git branch URLs.
- [ ] Set staging's `NEXT_PUBLIC_PLATFORM_DOMAIN` to the chosen stable hostname, with no scheme or path, and rebuild after changing it.
- [ ] Configure Supabase Auth Site URL and redirect allowlist for that hostname; verify login, logout, signup confirmation, and password recovery remain in staging.
- [ ] Configure separate staging Supabase URL, public key, and service-role key. Verify all three target the same test project.
- [ ] Generate separate `BOOKING_LINK_SECRET`, `CALENDAR_SECRET_KEY`, and `CRON_SECRET`; set staging admin accounts explicitly.
- [ ] Use isolated SMTP and support mailbox credentials, sandbox integrations, and synthetic calendar feeds. Ensure test actions cannot send to real customers or modify production calendars.
- [ ] Verify review, booking, calendar, and email links use the test hostname where intended. Review `REVIEWS_BASE_URL` and the email addresses derived from `lib/platform.ts`.
- [ ] Keep production domain-management credentials out of staging. Enable domain-linking tests only against an isolated target with suitable scope.
- [ ] Audit `NODE_ENV`, Vercel environment detection, and feature flags. A hosted preview is a production build and must not depend on localhost-only behavior.
- [ ] Configure access protection and crawler exclusion for the test site; give automated checks an appropriate protection bypass if needed.
- [ ] Decide how scheduled mail, calendar, review, and agent jobs will be tested. Verify scheduler support for the chosen Vercel environment; use explicit test-only invocations or a separate scheduler if necessary.
- [ ] Confirm that production identifiers/credentials are absent from the staging build and runtime configuration.

### Optional later: `test.flexpagina.nl`

- [ ] Query whether any existing website uses the `test` or `staging` slug before reserving or assigning a hostname. Do not silently take an existing customer's name.
- [ ] Reserve the selected infrastructure names across creation, renaming, API validation, onboarding, and database validation through a non-destructive migration.
- [ ] Explicitly assign the test hostname to staging in Vercel and verify DNS/TLS behavior alongside the existing tenant wildcard.
- [ ] Set staging's platform hostname to `test.flexpagina.nl`; confirm `/`, `/editor`, and `/auth/*` reach the application rather than `/site/test`.
- [ ] Verify an existing customer hostname still routes to production and that the staging host cannot accidentally fall back into production tenant routing.
- [ ] For test customer subdomains such as `demo.test.flexpagina.nl`, separately configure and verify `*.test.flexpagina.nl` routing and TLS. Do not assume `*.flexpagina.nl` covers this extra level.
- [ ] Until nested subdomains are configured, test public websites through the existing `/site/<slug>` route and label that limitation in verification results.

## 4. Implement the push-to-staging workflow

Target order:

```text
Push to staging
  -> install locked dependencies
  -> lint + typecheck + unit/SQL checks
  -> build with staging environment variables
  -> apply pending migrations to the staging project
  -> deploy the staging artifact
  -> verify the deployment and assign the stable test URL
  -> smoke-test the stable URL and report the commit/result
```

- [ ] Add `.github/workflows/ci.yml` for pull-request validation and reusable checks.
- [ ] Add `.github/workflows/deploy-staging.yml`, triggered by push to `staging` and optional manual retry.
- [ ] Pin compatible Node, pnpm, Supabase CLI, Vercel CLI, and Action versions; use `pnpm install --frozen-lockfile`.
- [ ] Run `pnpm lint`, `pnpm typecheck`, and `pnpm test`; run build validation with the required test configuration.
- [ ] Build the deployable artifact once where feasible, using Vercel's staging configuration and `--prebuilt` deployment. Verify required Vercel build-time metadata instead of assuming it is present in Actions.
- [ ] Scope staging credentials to a GitHub `staging` environment. Keep tokens server-side and out of build logs/artifacts intended for public access.
- [ ] Run untrusted pull-request checks without deployment secrets; do not execute fork code in a privileged deployment job.
- [ ] Make deployment depend on successful checks and migrations. A failed migration must stop the workflow before deploying the new app.
- [ ] Add an explicit guard that the migration target is the expected staging project and differs from production.
- [ ] Serialize migrations and staging releases. Do not cancel an in-progress migration job; prevent an older run from overwriting a newer successful release.
- [ ] Decide stable URL activation behavior supported by the chosen Vercel environment. Where possible, verify the deployment before switching the stable alias; otherwise document the activation timing and rollback procedure.
- [ ] Publish a workflow summary containing commit SHA, environment, deployment URL, migration outcome, and smoke-test results. Do not include secrets.
- [ ] Retain useful failure logs and browser traces with appropriate access controls and expiry.

## 5. Verify the complete test environment

- [ ] A push to `staging` updates the fixed test URL without dashboard work.
- [ ] Failed lint, types, tests, or build prevents application deployment.
- [ ] A deliberately failing migration in a disposable verification run prevents the new app deployment.
- [ ] `/api/health` returns `200` and the app connects to the intended test database. Record separate evidence of project identity; the health response alone does not expose it.
- [ ] A staging user can log in, edit/save a website, reload, and see the saved content.
- [ ] A staged public website loads through the configured route and has the expected content.
- [ ] A synthetic enquiry reaches the correct tenant; enquiries remain distinct from confirmed calendar reservations.
- [ ] A synthetic booking follows availability -> hold -> confirmation and creates the expected calendar state.
- [ ] Two test businesses cannot read or mutate each other's protected data, including through direct API/database calls.
- [ ] Test email/password-reset/review links stay within the intended test flow, using approved test recipients.
- [ ] Scheduled-job test invocations use the test database and test integrations only.
- [ ] Test data survives a second deployment; normal deployment never runs `init.sql` or resets the database.
- [ ] A smoke-test failure marks the release failed and produces enough evidence to investigate.
- [ ] Reverting the staging app to the previous build works with the current database schema, or the documented recovery path explains why it cannot.
- [ ] Confirm no production domains, customer data, secrets, or deployment settings changed during the staging rollout.

## 6. Production release design, after staging works

This phase is separate from initial push-to-test delivery.

- [ ] Agree on a production release trigger and any approval requirements before changing the existing production flow.
- [ ] Release the tested source commit using a build configured for production. `NEXT_PUBLIC_*` values, including Supabase configuration, are embedded at build time.
- [ ] Apply reviewed, backward-compatible migrations before activating application code that requires them.
- [ ] Use additive changes first; remove old columns/functions only after deployed application versions no longer depend on them.
- [ ] Verify production backup/recovery arrangements before risky schema changes.
- [ ] Document application rollback separately from database recovery. Repointing a Vercel deployment does not undo migrations or restore lost data.
- [ ] Check production health and critical flows with an explicitly agreed verification scope; staging success is not live production proof.

## Completion criteria

- [ ] One push to `staging` reliably runs checks and updates one stable, isolated test environment.
- [ ] Database setup is reproducible, incremental deployments preserve data, and migration ordering is enforced.
- [ ] Auth, website editing, public rendering, and selected enquiry/booking flows have hosted verification evidence.
- [ ] Domain collision handling is verified for whichever hostname is used.
- [ ] A short operator runbook explains pushing, opening the test site, finding logs, retrying, restoring a prior app build, and intentionally resetting test data.
- [ ] Recurring costs, configured resource IDs, remaining limitations, and the owner of each deployment trigger are documented without secrets.

Only check implementation items after their evidence exists. Distinguish local test results, workflow runs, hosted application checks, and production verification.

## References

Research consulted on 2026-09-22; recheck plan availability, prices, and CLI details during implementation.

- [Vercel environments and staging options](https://vercel.com/docs/deployments/environments)
- [Vercel deployment through GitHub Actions](https://vercel.com/kb/guide/how-can-i-use-github-actions-with-vercel)
- [Assign a Vercel domain to a Git branch](https://vercel.com/docs/domains/working-with-domains/assign-domain-to-a-git-branch)
- [Supabase environment and migration management](https://supabase.com/docs/guides/deployment/managing-environments)
- [Supabase branching integration with Vercel](https://supabase.com/docs/guides/deployment/branching/integrations)
- [Supabase Auth redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls)
- [Supabase pricing](https://supabase.com/pricing)
- [Supabase branching usage and billing](https://supabase.com/docs/guides/platform/manage-your-usage/branching)
- [Next.js build-time environment variables](https://nextjs.org/docs/app/guides/environment-variables)
