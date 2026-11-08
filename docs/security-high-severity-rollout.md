# High-severity security fixes — 8 November 2026

The three high-priority findings from `security-audit-2026-11-08.md` have local fixes:

- Customer business JSON-LD is serialized with HTML-safe escaping, preventing a saved closing script delimiter from creating executable HTML.
- Domain metadata is server-owned. Provider deletion requires a matching domain/project binding recorded from a successful Vercel create response. The binding is checked for individual domain deletion, website deletion, and account deletion. An existing Vercel domain is no longer silently adopted after a failed create request.
- Next.js is pinned to 16.4.5 in the manifest and both lockfiles; the installed version has been updated as well.
- The separate high-rated Zod dependency alert is also addressed by upgrading to 4.6.7. The import/export validators use the compatible Zod 4 APIs while preserving theme defaults and redacting invalid option values. A regression verifies oversized bounded arrays are rejected before walking their elements.

Use Node.js 22 for installation, tests, and builds, as declared by `package.json` and `.nvmrc`. The system's Node.js 20.9 failed to load current locked dependencies; validation uses Node.js 22 without replacing the system installation.

## Coordinated rollout

Deploy the application changes together with the additive migration
`supabase/migrations/20261108110511_secure_domain_provisioning.sql`. The fresh-install bootstrap contains the same SQL. **Do not run `supabase/init.sql` on an existing database.**

The migration revokes direct domain INSERT/UPDATE/DELETE access from public API roles, retains owner-scoped SELECT, and provides two narrow owner-authorized RPCs for primary selection and removal finalization. The new application performs domain provisioning/state writes through a privileged client only after authenticating the owner and checking the website. Old application domain mutations stop working after the migration, so do not apply it as an unrelated deployment.

No hosted migration, application deployment, or real provider domain mutation was performed while preparing this patch.

## Existing domains and interrupted provisioning

Existing mappings continue to serve under their current routing settings. They receive no automatic provider binding: the previous schema allowed customers to edit these values, so copying them into a trusted field would preserve the vulnerability.

Until reconciled, these mappings cannot be made primary, removed from the provider, or included in website/account deletion through self-service. The API returns a message asking for support verification. A provider create response lost in transit, or a failure to persist its binding, also requires reconciliation; retrying must not treat an unrelated existing project domain as proof of customer ownership.

Before attesting a legacy row, support must independently verify the customer/domain assignment and the exact Vercel project. Use trustworthy provisioning history plus customer domain-control evidence, such as a fresh unique DNS challenge, and verify that the domain is not a platform domain or an unrelated project alias. Merely finding it on the Vercel project, seeing an `active` database value, or observing generic Vercel DNS records is insufficient. Record the reviewed domain and project ID in the server-only `provider_domain` and `provider_project_id` fields using a trusted administrative operation. Never bulk-backfill from existing domain rows.

## Verification

Regression tests cover hostile JSON-LD through React's real server renderer and an HTML parser; attempted direct domain forgery under Supabase-style default grants; owner and cross-tenant RPC behavior; provider evidence validation; and the individual/domain/website/account deletion gates. Both additive migration and fresh bootstrap are exercised with an isolated database.

Local validation results:

- Security/domain/bootstrap suite: 15 passed.
- Zod compatibility and affected-flow suite: 29 passed.
- TypeScript and lint checks passed.
- Production build passed on Node.js 22 with Next.js 16.4.5 and Zod 4.6.7.
- Final full suite on Node.js 22: 366 passed, 3 failed, 1 skipped. All three failures reference the already-missing `docs/import/examples/bnb.json` fixture; `import-schema.test.mjs` also expects a missing `studio.json` fixture. These fixtures were not replaced with invented test data.
- `npm audit --omit=dev`: 0 high, 0 critical; 2 moderate package alerts remain (Nodemailer and Mailparser).

Before calling the fixes live, verify effective hosted grants, run an authenticated add/primary/remove flow using a disposable customer-controlled domain, and check the deployed Next.js version. Provider responses are mocked in local tests; no customer domain was used for destructive testing.

The five medium-priority application findings remain outside this patch. Production dependency auditing no longer reports Next.js or Zod; the existing Nodemailer/Mailparser alerts remain.
