# Security review — 8 November 2026

**Remediation update:** Local fixes for findings 1–3 are prepared in this checkout. See [the rollout notes](security-high-severity-rollout.md) for migration, runtime, legacy-domain handling, and validation requirements. The findings below preserve the original audit evidence; a production rollout has not been performed.

This review found three high-priority issues and five medium-priority issues. It combines source review, isolated local reproductions, a production dependency audit, and read-only permission checks against the connected `jk-bnb-editor-db` Supabase project. No production records, provider domains, application code, or dependencies were changed.

The review focused on authentication, tenant boundaries, public forms and bookings, privileged database functions, domains, uploads, remote fetching, and HTML rendering. This is a targeted review, not a guarantee that the remaining code is vulnerability-free. Hosted application exploitability and deployed dependency versions were not tested.

## Findings

### 1. High — Stored XSS through business structured data

**Locations:** `components/page-loader.tsx:448` and `:475`; `lib/business/structured-data.ts:35`; `lib/supabase/business.ts:152`; `next.config.mjs:7`.

The public renderer inserts `JSON.stringify(jsonLd)` into a script element with `dangerouslySetInnerHTML`. Business name, description, and other text are copied into that object without escaping HTML delimiters. An owner can save those fields through the business editor/server action or the database API. JSON string escaping does not neutralize an HTML `</script>` delimiter.

**Evidence:** The real structured-data builder and React server renderer were given the inert name `</script><script>globalThis.auditProof=true</script>`. Parsing the rendered HTML produced two separate script elements, including an executable JavaScript element. The configured CSP permits inline scripts. The normal publication snapshot builder copies business text without HTML-delimiter escaping.

**Impact:** A malicious customer can execute JavaScript in a visitor's origin when that visitor opens the published site. The `/site/<slug>` route also serves customer content on the platform origin, making visits by signed-in owners or administrators particularly sensitive. Production browser execution was not attempted.

**Fix:** Serialize structured data with HTML-safe escaping, at minimum replacing every `<` with `\u003c`, before inserting it into a script element. Apply this consistently to all JSON-LD sinks. Add a regression case containing a closing script delimiter. Consider isolating customer content from the authenticated platform origin and tightening script CSP as additional protection.

### 2. High — Customer-controlled domain records reach privileged Vercel deletion

**Locations:** `supabase/migrations/20260717120000_add_multiple_website_domains.sql:59` and `:69`; `app/api/domain/[domainId]/route.ts:108` and `:124`; `app/api/account/route.ts:97`; `lib/vercel-domains.ts:142`.

Domain INSERT/UPDATE policies verify only that the linked website belongs to the caller. They allow the caller to choose the domain string and provisioning status. The domain API's validation and platform-domain exclusion can therefore be bypassed through Supabase's direct API.

The DELETE endpoint subsequently treats any such owned row as authority to call `removeDomainFromVercel(domain.domain)` using the server's project credentials. Account deletion has the same trust pattern. Neither deletion path independently validates the domain or proves that this customer provisioned it.

**Evidence:** Local execution under `authenticated` successfully inserted an owned row with `domain = 'flexpagina.nl'` and `status = 'active'`. Read-only hosted checks confirmed authenticated INSERT/UPDATE grants and matching ownership-only policies. No provider deletion was attempted.

**Impact:** A customer can cause a privileged deletion request for a domain they do not own, provided its value is not already reserved by the unique database constraint and it is attached to the configured Vercel project. The platform domain is a particularly serious candidate if it is configured in Vercel but absent from customer domain rows. Forged active records can also influence custom-domain routing for traffic already reaching this deployment. This does not transfer DNS ownership.

**Fix:** Make domain identity, verification, and provisioning state server-owned. Use a trusted server operation for domain mutations, validate reserved domains again before every provider operation, and bind provider removal to independently verified provisioning evidence. Ownership of a customer-editable row is insufficient authority for a provider deletion.

### 3. High — Vulnerable Next.js release with reachable Server Actions

**Locations:** `package.json:83`, both lockfiles, and Server Action entry points such as `app/editor/calendar/actions.ts:1`.

The manifest and lockfiles select Next.js **16.3.8**, while the current local installation is **16.3.2**. Both fall within the affected range of the published [Server Actions denial-of-service advisory](https://github.com/vercel/next.js/security/advisories/GHSA-p3m5-59mp-jv5r). This app uses App Router and Server Actions, satisfying the advisory's application requirements. Crafted requests can consume excessive CPU and block other requests in the same process.

**Evidence:** `npm audit --omit=dev --json`, package/lockfile inspection, and comparison with the maintainer's advisory. No denial-of-service traffic was sent. The advisory lists 16.4.1 as the first patched 16.x release; the audit currently suggests 16.4.5.

**Fix:** Upgrade to a currently patched compatible Next.js release, update both lockfiles consistently, reinstall from the chosen lockfile, and validate the build and authenticated workflows. Verify the actual deployment version separately.

The audit also flags two critical Next.js advisories. Their relevant features were not found enabled here: image optimization is disabled by `images.unoptimized`, and source search found no `use cache` functions or `cacheComponents` configuration. These are dependency alerts, not confirmed remote-code-execution findings for this application.

### 4. Medium — Anonymous callers can manipulate the shared rate limiter

**Locations:** `supabase/migrations/20260909130000_repair_rate_limit.sql:60`; equivalent statements in `supabase/init.sql`; key construction in `lib/rate-limit.ts`.

The migration revokes function execution from `PUBLIC` but does not revoke explicit grants from `anon` or `authenticated`. The connected project gives those roles EXECUTE on new public-schema functions through default privileges. Consequently, both retain permission to execute the `SECURITY DEFINER` function `check_rate_limit(text, integer, integer)`.

**Evidence:** Hosted `has_function_privilege` returned true for both roles; the function definition was inspected read-only. A local database reproducing the observed default privileges allowed an anonymous call to create a bucket with a one-day window.

**Impact:** An unauthenticated caller can create arbitrary limiter buckets or consume a target's bucket when its action/IP-derived hash is known. A caller who creates an expired/missing target bucket first can select its window up to 24 hours, potentially prolonging denial of login or form access. Arbitrary fresh keys also create database write/storage load. Hashing predictable action/IP strings does not make them secret.

**Fix:** Explicitly revoke EXECUTE from `PUBLIC`, `anon`, and `authenticated`, then grant it only to `service_role`. Check effective privileges after migration. Extend the database fixture to reproduce Supabase default function grants; the existing fixture misses this problem. Supabase documents [explicit role grants and default privileges](https://supabase.com/docs/guides/api/securing-your-api).

### 5. Medium — Direct anonymous inquiry insertion bypasses all form defenses

**Locations:** `supabase/migrations/20260604100000_contact_requests.sql:75`; `supabase/init.sql:2279`; defenses in `app/api/requests/route.ts:285` onward.

The `Anyone can insert public contact requests` policy uses `WITH CHECK (true)`. Anonymous users have INSERT permission on the hosted table. A caller can write directly through Supabase without passing through the application's rate limit, honeypot, spam checks, input limits, or published-website validation. The policy also exposes internal fields such as `owner_notes`, lifecycle status, and recipient/ownership references to the insert caller.

**Evidence:** A local anonymous role inserted a request for the synthetic owner's business, with forged internal notes and status `won`. Matching hosted privileges and policy were confirmed read-only.

**Impact:** Inbox/storage flooding and forged workflow state. This direct database write does not itself execute the application's notification-email flow, so this finding is not a demonstrated email relay.

**Fix:** Revoke direct public INSERT and remove the permissive policy. The existing server endpoint already uses a privileged client and can remain the validated insertion path. If direct insertion is required, expose a constrained, rate-limited operation that derives ownership and internal state server-side.

### 6. Medium — Upload metadata can be forged to bypass quota and completion checks

**Locations:** `supabase/migrations/20260719120000_add_user_image_derivatives.sql:35` and `:39`; `supabase/migrations/20261006185918_user_image_storage_500mb.sql`; `lib/media-upload.ts:69` onward.

Customers may UPDATE and DELETE their own `user_images` rows, including recorded byte sizes and `upload_status`. The quota trigger sums those mutable byte sizes rather than authoritative storage usage. The completion handler also returns immediately for a row already marked `ready`.

**Evidence:** An authenticated local owner changed a 50 MiB record to `original_size = 0` and `upload_status = 'ready'`. Hosted grants and policies allow the same class of metadata mutation. Deleting a metadata row does not invoke the separate application storage-cleanup flow.

**Impact:** A customer can under-report or remove accounting records while files remain in storage, regain quota, and repeat uploads. Setting `ready` directly also skips completion-time media checks for pending uploads. This can increase provider costs and invalidate the intended upload validation boundary.

**Fix:** Make byte counts, paths, reservation identity, status, and deletion server-controlled. Permit only necessary cosmetic column updates directly. Couple deletion/accounting to trusted storage operations, and derive usage from authoritative server-observed sizes.

### 7. Medium — Lead analyzer remains vulnerable to DNS rebinding

**Locations:** `lib/leads/analyzeWebsite.ts:82`, `:98`, and `:99`; caller in `lib/leads/runLeadSearch.ts`.

The lead analyzer resolves a hostname and checks its addresses, then calls ordinary `fetch` without pinning the validated address. The request can perform a separate DNS lookup. An attacker-controlled hostname can resolve publicly during validation and privately during connection, bypassing the intended network boundary. This source accepts HTTP as well as HTTPS.

**Evidence level:** Confirmed validation/connection separation in source; no live rebinding or internal-network request was attempted. Exploitation requires an attacker-controlled site to be analyzed, for example through a discovered business listing. This is not an arbitrary public URL endpoint. The separate source-site/image importer already pins DNS and does not share this particular flaw.

**Fix:** Use a shared fetcher that pins the validated destination on every connection and redirect, with comprehensive address-range checks and restrictions on protocols/ports. Also stream and cap response bytes: the current `response.arrayBuffer()` buffers the entire response before slicing to `MAX_HTML_BYTES`, allowing a hostile analyzed site to consume memory beyond the advertised 1 MB cap.

### 8. Medium — Vulnerable email-address parsing dependencies

**Locations:** `package.json:82` and `:85`; `lib/mail/parse-message.ts:46`; `lib/mail/send-reply.ts:86`.

The lockfiles select Nodemailer **10.1.2** and Mailparser **3.9.39**. The local installation is older still: Nodemailer **9.0.5** and Mailparser **3.9.15**. The audit flags address-parser vulnerabilities that can interpret comments or quoted address text as a different recipient or sender. The application uses Mailparser for attacker-controlled inbound email and uses the resulting sender address for replies.

**Evidence:** A local call to the installed Nodemailer parser reproduced the maintainer's nested-comment issue using `.invalid` addresses. No email was sent. End-to-end disclosure through the application's mail workflow was not tested. See the [maintainer advisory and fixed version 10.1.4](https://github.com/nodemailer/nodemailer/security/advisories/GHSA-8c8m-p3m8-cjg8).

**Fix:** Upgrade Nodemailer and Mailparser together to versions with patched transitive parsers, then reinstall consistently and verify actual dependency resolution. Add malformed-address cases to inbound parsing/reply tests. The audit suggests Mailparser 3.14.2; verify its resolved Nodemailer version rather than assuming the top-level upgrade covers the transitive dependency.

## Other observations and limits

- `npm audit --omit=dev` reported **4 affected production packages**: Next.js (critical aggregate rating), Zod (high), Nodemailer and Mailparser (moderate). Its raw result is in `tmp/security-npm-audit.json`. The Zod constrained-collection memory-exhaustion alert needs a separate reachability review; an end-to-end exploit was not established here. Its suggested fix crosses a major version boundary.
- The Supabase advisor reports disabled leaked-password protection and several mutable function search paths. These are additional hardening items. Advisor notices about RLS-enabled tables with no policies often reflect intentional service-only access; they were not counted as data exposures. Likewise, trigger-returning functions are not automatically usable as normal RPCs simply because an EXECUTE grant exists.
- Read-only hosted checks confirmed that the sampled booking creation/finalization/cart/invoice RPCs deny execution to `anon` and `authenticated`. The rate-limiter exposure is not evidence that every privileged RPC is exposed.
- All public tables created by the local bootstrap had RLS enabled. The findings above concern what policies and grants permit, not missing RLS flags.
- The targeted secret-pattern scan did not find a confirmed hardcoded credential in the searched application/source directories. Environment values were not printed, and this was not a full Git-history secret audit.
- Local installed modules differ from both committed lockfiles. Reproduction evidence identifies which versions were actually loaded. Deployed application versions remain unverified.

## Validation and evidence

The local proof script `tmp/security-db-audit.mjs` loads the full bootstrap into an isolated in-memory PGlite database, reproduces the connected project's default grants, uses synthetic identities, and asserts five vulnerable behaviors: JSON-LD script breakout, arbitrary active-domain insertion, anonymous inquiry insertion, byte/status tampering, and anonymous rate-limiter execution. Results are saved in `tmp/security-local-proofs.json`. No live exploit writes were performed.

The existing targeted tests passed **23/23**:

```text
node --test tests/production-readiness.test.mjs tests/rate-limit.test.mjs tests/auth-password.test.mjs tests/import-images.test.mjs tests/media-upload.test.mjs
```

These passing tests do not establish safety against the reproduced cases. In particular, the existing database test setup does not mirror all hosted default grants. Test output is retained in `tmp/security-existing-tests.log`. The `tmp` directory is intentionally ignored by Git; retain those local artifacts if the reproductions are needed later.

Recommended order: fix the JSON-LD sink and domain/provider trust boundary, upgrade Next.js, restrict rate-limiter execution, then close direct inquiry/upload metadata writes and harden remote fetching and mail parsing. Every database fix should include an additive migration and verification of effective hosted privileges.
