# Pricing access and publish-control plan

## Goal

Users can see, add, configure, and preview every section and feature from Bronze, Silver, and Gold. Higher-tier functionality is never hidden or disabled inside the editor. Instead, the UI clearly labels which plan is required and explains the consequence before the user relies on it.

Publishing is the hard boundary: a user cannot put a new website version live while its draft uses sections, section counts, or functionality above the user's active plan. The currently published version must remain unchanged until the draft passes validation or the user upgrades/removes the restricted functionality.

## Progress checklist

- [x] Task 1 - Create a shared entitlement model
- [x] Task 2 - Establish a real subscription source
- [x] Task 3 - Separate draft content from the live version
- [x] Task 4 - Temporary development tier switch removed before rollout
- [x] Task 5 - Show tier ownership throughout the editor
- [x] Task 6 - Add immediate, non-blocking upgrade warnings
- [x] Task 7 - Build a publish preflight experience
- [x] Task 8 - Enforce entitlements in the publish API
- [x] Task 9 - Protect higher-tier runtime actions
- [x] Task 10 - Cover downgrade, templates, and race conditions
- [ ] Task 11 - Verification and rollout

## Product rules

- Keep all sections and feature controls visible and usable in edit and preview modes.
- Show the user's active plan consistently (`Bronze`, `Silver`, or `Gold`).
- Mark every higher-tier item with a visible plan badge such as `Silver` or `Gold`; do not rely on color alone.
- When a restricted item is added or enabled, allow it and immediately show a non-blocking warning with the required plan and an upgrade link.
- Saving a draft is always allowed, including drafts containing higher-tier functionality.
- Publishing, republishing, or switching a different website live is denied when the draft exceeds the active plan.
- Unpublishing is always allowed.
- A rejected publish attempt must return every blocking reason, not only the first one.
- Enforcement must happen on the server. Client-side warnings and disabled buttons are guidance, not security.
- Existing live content must not change while the user edits a non-compliant draft.

## Tier entitlement map

Use one typed entitlement source as the implementation truth. `docs/pricing.md` remains the product source, while application code resolves all rules from the shared entitlement map.

| Capability | Bronze | Silver | Gold |
|---|---:|---:|---:|
| Maximum published sections | 6 | 10 | Unlimited |
| Navigation, Hero, About, Services, Contact, Map, Footer | Yes | Yes | Yes |
| Gallery, Features, Testimonials, FAQ, Opening Hours, Pricing, CTA | No | Yes | Yes |
| Contact form | Yes | Yes | Yes |
| Email contact, quote, and appointment requests | No | Yes | Yes |
| WhatsApp contact button | No | Yes | Yes |
| Online appointment booking | No | No | Yes |
| Booking calendar and availability management | No | No | Yes |
| Automatic booking confirmations | No | No | Yes |
| Booking management dashboard | No | No | Yes |
| Priority support | No | No | Yes |

Notes to resolve during implementation:

- `request_form` is not named as a section in `docs/pricing.md`. Treat its basic contact mode as Bronze, its quote/appointment/email-delivery modes as Silver, and any real-time booking mode as Gold.
- The Services section is Bronze, but booking-related controls inside it are Gold capabilities.
- Navigation and Footer count toward the published section limit unless product requirements explicitly change this before implementation.
- Draft preview must not send real customer emails, create bookings, or trigger other production side effects. Interactive preview actions should use a clearly labeled simulation state.

## Task 1 - Create a shared entitlement model

Add a server-safe module, for example `lib/entitlements.ts`, that defines plan rank, section availability, section-count limits, and non-section capabilities. Reuse `PlanId` and `PLAN_ORDER` from the existing pricing model instead of creating another plan vocabulary.

The module should expose pure helpers such as:

- resolve the minimum required plan for a section type;
- resolve the minimum required plan for a configured feature;
- inspect an entire website draft and return structured violations;
- compare the user's active plan with the required plan;
- produce stable violation codes, labels, required plans, and affected section IDs.

Done when:

- All rules from the entitlement table are represented once in typed code.
- UI and API code can consume the same rule results.
- Unit tests cover every plan, every section type, section-count boundaries (6/7 and 10/11), and feature flags nested inside otherwise-allowed sections.

## Task 2 - Establish a real subscription source

Replace the current mock-only billing plan with a server-owned active-plan resolver. Define the default behavior for users without a paid subscription (recommended: Bronze or a separately defined trial policy) and handle inactive, expired, canceled, and past-due subscriptions explicitly.

Implemented policy:

- No subscription row: temporary Gold default with status `none`.
- Active or trial subscription: use the stored plan.
- Canceled subscription with a future paid-through date: retain the stored plan until that date.
- Canceled subscription after its paid-through date: temporary Gold default.
- Past-due or expired subscription: temporary Gold default.
- Subscription lookup/database errors: fail closed with an application error; do not silently grant a plan or misreport the account state.

Add the required Supabase schema through both a migration and `supabase/init.sql`, including appropriate row-level security. APIs must derive the user and plan from the authenticated session and database; they must never trust a plan sent by the browser.

Done when:

- Editor pages and publish APIs resolve the same current plan for the authenticated user.
- A user cannot change their effective plan by modifying a request payload.
- Missing and inactive subscriptions have documented, tested behavior.
- Billing UI no longer presents mock data as the user's real entitlement state.

## Task 3 - Separate draft content from the live version

Introduce website revisions or an equivalent immutable live snapshot. Editor saves update the current draft. A successful publish operation atomically promotes a compliant draft to the live version. Public routes render only the promoted live revision.

Implemented approach: editor tables and website settings remain the mutable draft. A successful publish builds a versioned `live_snapshot` containing the website presentation settings, business details, services, availability, sections, and transitions, then promotes it with one atomic website update. Public rendering, public metadata, and public form routing use that snapshot; authenticated preview continues to use draft data.

Keep the previous live revision available until promotion succeeds. Decide and document how business data referenced by sections (services, availability, forms, and booking settings) is snapshotted or safely resolved so draft edits cannot leak into the live site.

Done when:

- Editing an already-published website does not change its public output.
- A failed publish leaves the current live version untouched.
- A successful publish updates all public content atomically.
- New schema exists in both `supabase/migrations/` and `supabase/init.sql`.
- Existing websites receive a safe initial draft/live revision during migration.

## Task 4 - Temporary development tier switch (removed)

This temporary developer aid was removed from the repository before rollout. The editor, billing page, publish API, and audit metadata now always use the database-backed subscription plan. The original requirements below are retained only as implementation history.

Add a compact test control to the editor that lets a developer switch the effective tier between `Bronze`, `Silver`, and `Gold` without changing subscription records. The selected test tier should immediately refresh badges, warnings, section-count limits, publish preflight results, and preview behavior.

Implemented approach: development renders a `Testabonnement` selector backed by a signed, HTTP-only, eight-hour cookie. Selecting `Werkelijk abonnement` removes the override. Production rejects and hides the override even if a browser sends a forged cookie or the test environment flag is present.

Recommended UI:

- Place a small `Testabonnement` control in the editor header, developer panel, or account menu.
- Show the active simulated tier persistently while an override is enabled, for example `Testmodus: Bronze`.
- Provide `Bronze`, `Silver`, `Gold`, and `Werkelijk abonnement` options.
- Persist the selection locally for convenience, but make it easy to reset.
- Use an obvious warning color and test icon so the simulated tier cannot be mistaken for the real subscription.

Safety requirements:

- Render and accept the override only in development or an explicitly enabled test environment.
- Use a server-only environment flag such as `ENABLE_TIER_TEST_SWITCH=true`; never expose a general production override through a `NEXT_PUBLIC_*` secret or trust an arbitrary browser-supplied plan.
- If publish API testing needs the override, send only a short-lived signed test token or store the override in a server-owned development session. The server must reject overrides unless the test flag is enabled.
- Production builds must default to the real subscription and must not render the switch.
- Add a prominent watermark/banner to previews and publish dialogs while test mode is active.
- Audit test-mode publish attempts separately and include both the real and simulated plan.

Done when:

- A developer can switch among all three tiers without editing the database.
- Entitlement warnings and preflight results update immediately after switching.
- `Werkelijk abonnement` clears the override and returns to the database-backed plan.
- Refreshing the editor preserves the local test selection in development.
- The override cannot be activated in production by changing local storage, cookies, headers, or request payloads.
- Automated tests prove the server ignores/rejects simulated tiers when the server-side test flag is disabled.

## Task 5 - Show tier ownership throughout the editor

Pass the resolved current plan and entitlement metadata into the shared editor shell. Keep all section cards selectable and draggable, but add a persistent `Silver` or `Gold` badge to higher-tier cards. Show the same badge and a compact explanation in the selected section editor when the section exceeds the user's plan.

Implemented surfaces: active-plan badge and test banner in the shared editor header, plan badges in desktop/mobile section selectors, required-plan status in the selected-section editor, Silver labels on advanced request types, and a Gold label/warning on Services booking controls.

For mixed-tier sections, mark the individual controls instead of incorrectly marking the whole section. Examples include Silver request delivery and Gold booking controls inside Services or request forms.

Done when:

- Desktop and mobile section pickers show required-plan badges without hiding any item.
- Higher-tier controls remain editable and visibly identify their required plan.
- The editor header or account area shows the active plan.
- Badges have readable text, accessible labels, and do not depend only on color.

## Task 6 - Add immediate, non-blocking upgrade warnings

When a user adds a higher-tier section, exceeds the section-count limit, enables a higher-tier control, or applies a template containing restricted features, show a shared warning. The warning should name what was added, which plan is required, state that draft editing/preview remains available, and link to the billing upgrade surface.

Implemented approach: `EditorClient` validates the complete in-memory draft after every section or effective-plan change. Newly introduced violations produce one shared Silver/Gold toast with the affected items and an upgrade action. A persistent expandable summary lists every current blocker, its required plan, and a billing link while explicitly confirming that draft saving and preview remain available.

Also show a persistent summary banner while the draft has violations so a dismissed toast does not remove the only warning. The banner should show the number of blockers and open the full preflight list.

Suggested Dutch pattern:

> Deze functie hoort bij Silver. Je kunt haar nu instellen en bekijken, maar deze versie kan pas live nadat je upgrade of de functie verwijdert.

Done when:

- All entry paths (click, drag/drop, mobile insertion, template apply, and feature toggles) produce consistent feedback.
- The warning distinguishes Silver and Gold requirements.
- The persistent summary updates when blockers are added or resolved.
- Upgrade actions lead to the relevant billing/plan choice instead of a generic dead end.

## Task 7 - Build a publish preflight experience

Run the shared entitlement validator whenever the draft or current plan changes. Keep `Live zetten` visible. If blockers exist, present it as unavailable with nearby explanatory text and let the user open a detailed preflight dialog.

Implemented approach: every editor publish entry point checks the current in-memory entitlement result before making an API request. Blocked drafts open a grouped preflight dialog; compliant drafts open a final publish confirmation. The dialog links to affected sections, can safely disable supported nested features, opens the section list for count problems, and links to the billing comparison.

The dialog should group blockers into:

- section types requiring a higher plan;
- excess section count;
- higher-tier functionality enabled inside allowed sections;
- booking/calendar capabilities requiring Gold.

Each blocker should identify the affected section or setting and provide a direct action such as `Ga naar sectie`, `Functie uitschakelen`, or `Bekijk upgrade`. Do not automatically delete or disable the user's draft work.

Done when:

- Users can understand every reason publishing is blocked before attempting it.
- Blockers link back to the relevant editor location where practical.
- Resolving the final blocker immediately restores the normal publish path.
- Compliant Bronze, Silver, and Gold drafts can reach publish confirmation.

## Task 8 - Enforce entitlements in the publish API

Extend `app/api/websites/publish/route.ts` or introduce a dedicated publish service that loads the authenticated user's active plan and the complete server-side draft, validates it, and refuses promotion when violations exist. Return a machine-readable error payload and an appropriate conflict/validation status for the editor and domain dashboard to render.

Implemented approach: the authenticated publish route resolves the real/test-effective plan on the server, builds the complete draft snapshot from database records, and validates that snapshot before checking or changing live state. Entitlement failures return HTTP `422` with code `ENTITLEMENT_VIOLATIONS`, the current/required plan, and structured violations. Editor and domain-dashboard publish surfaces render this shared response. Unpublish remains unconditional for the website owner.

Apply this server-side preflight to every route that can make or replace live content, including the editor publish action and the `/editor/domains` live toggle. Keep unpublish behavior available regardless of draft compliance.

Record successful and rejected publish attempts in the existing audit log, including plan, required plan, and violation codes without storing sensitive form content.

Done when:

- Calling the API directly cannot bypass tier rules.
- Both editor and domain-dashboard publishing show the same structured blockers.
- A rejected attempt does not change `published`, live revision, or another site's live state.
- Successful and denied attempts have useful audit events.

## Task 9 - Protect higher-tier runtime actions

Publishing validation protects page versions, but feature endpoints must also enforce entitlements independently. Add server-side checks to email delivery, quote/appointment request handling, WhatsApp configuration where applicable, calendar/availability mutations, booking creation, confirmation delivery, and booking management routes.

Implemented policy: Bronze contact forms may store requests but require Silver for notification email. Quote, appointment, and WhatsApp request modes require Silver. Silver appointment requests do not create Gold calendar records. Booking requests, calendar-entry mutations, availability mutations, and booking management require Gold. Editor previews simulate success locally and never call runtime endpoints.

Clearly separate editor simulation from real public behavior. A preview must never become a back door for sending emails or creating appointments on a lower plan.

Done when:

- Direct API calls cannot use Silver or Gold functionality on a lower plan.
- Preview interactions are labeled and side-effect free.
- Downgrade behavior is defined: existing live content remains visible only according to the chosen grace policy, while new restricted actions are blocked predictably.
- Authorization and entitlement tests cover each protected endpoint family.

## Task 10 - Cover downgrade, templates, and race conditions

Define behavior for users who downgrade while a higher-tier version is live. Recommended approach: preserve the current live version during a communicated grace period, immediately prevent publishing new non-compliant drafts, and disable new paid runtime actions after the subscription entitlement ends. Show a persistent account/editor warning with the deadline and remediation choices.

Implemented policy and concurrency model: canceled subscriptions retain their stored tier through the paid-through date and then use the temporary Gold default; past-due and expired subscriptions also use that default for now. Existing live snapshots remain online. Editor and billing surfaces show persistent Dutch status guidance. Every draft-affecting website, section, transition, business, service, and availability mutation changes a database `draft_version`. Publishing validates the snapshot and plan, then calls one transactional RPC that locks the user publication flow and subscription row, rechecks both versions, prevents two simultaneous live websites, and atomically promotes the snapshot or changes nothing.

Validate templates before promotion, not before preview. Revalidate inside the publish transaction so a plan change, simultaneous edit, or stale browser preflight cannot race past enforcement.

Done when:

- Downgrade and expired-subscription policies are documented in product copy and code.
- Templates with higher-tier content remain previewable and are correctly reported by preflight.
- Publish uses the latest server-side draft and plan in a race-safe operation.
- No partial live update occurs if validation or promotion fails.

## Task 11 - Verification and rollout

Add automated tests for the entitlement engine, publish API, protected runtime endpoints, and draft/live isolation. Add end-to-end coverage for Bronze, Silver, and Gold on desktop and mobile, including direct API bypass attempts.

Implemented rollout foundation: `PLAN_ENFORCEMENT_MODE` supports `off`, `warn`, and fail-closed `enforce`; warning, upgrade-click, publish-denial, and publish-success audit events provide lightweight metrics; automated policy tests cover tier rules, runtime request mapping, subscription/downgrade behavior, snapshot isolation, and enforcement-mode rollback. The migration sequence, acceptance matrix, direct-bypass checks, metrics, and emergency rollback are maintained in `docs/pricing-entitlements-rollout.md`.

Current verification status:

- [x] Entitlement, runtime mapping, subscription, downgrade, snapshot, and enforcement-mode tests pass.
- [x] `npx tsc --noEmit` passes.
- [x] Full `npm run lint` passes.
- [x] Production `npm run build` passes.
- [x] Migration order, staged rollout, metrics, acceptance matrix, and emergency rollback are documented.
- [ ] Finish applying the entitlement/live-snapshot migrations to the target Supabase environment (`subscriptions` exists; live-snapshot columns and promotion RPC are still missing as of 2026-07-13).
- [ ] Complete the desktop/mobile tier matrix and direct API bypass checks against that migrated environment.
- [ ] Confirm editor/domain-dashboard parity and unchanged public output after a rejected publish in the live browser.

Latest rollout check (2026-07-13): the configured target exposes `subscriptions`, but rejects queries for the live-snapshot columns and does not expose `promote_website_live_snapshot`. The workspace has no linked Supabase CLI configuration or database/management credential with which to apply the remaining DDL. Localhost browser automation was also blocked by the browser URL policy, so no manual matrix result is claimed.

Roll out behind a feature flag if existing customers or websites need migration. Add lightweight metrics for warnings shown, preflight failures by violation code, upgrade clicks, successful publishes, and repeated blockers.

Done when:

- `npx tsc --noEmit` passes.
- Relevant lint and automated tests pass.
- Manual checks confirm every tier can view/edit all features, but only publish compliant drafts.
- An already-live site stays unchanged during editing and after a rejected publish.
- Editor and domain-dashboard publish paths behave consistently.
- Migration and rollback steps are documented before enabling enforcement for all users.

## Recommended implementation order

1. Task 1: shared entitlement model.
2. Task 2: real subscription source.
3. Task 3: draft/live version boundary.
4. Task 4: temporary development tier switch.
5. Tasks 5 and 6: tier badges and warnings.
6. Tasks 7 and 8: preflight UI and publish enforcement.
7. Task 9: runtime endpoint enforcement.
8. Task 10: downgrade and race-condition policies.
9. Task 11: full verification and rollout.

Do not enable hard publish enforcement before Tasks 1-3 are complete; without a real plan source and a draft/live boundary, the UI could claim a version is blocked while edits still leak onto the public website.

## Completed production cleanup for the temporary tier switch

The tier switch is already hard-disabled when `NODE_ENV === "production"`. Use this checklist only when the temporary testing feature should be removed from the repository entirely. Keep the normal `currentPlan` entitlement wiring and all Silver/Gold badges; those are production features, not test code.

### Delete these files completely

- [x] Delete `lib/tier-test-override.ts` (signed cookie creation, validation, and environment checks).
- [x] Delete `app/api/dev/tier-override/route.ts` (development-only override endpoint).
- [x] Delete `components/editor/tier-test-switch.tsx` (the `Testabonnement` selector).
- [x] Delete `tests/tier-test-override.test.mjs` (override security tests).

### Remove test-tier wiring from shared files

- [x] In `app/editor/page.tsx`, remove the `cookies` import and the import from `lib/tier-test-override.ts`.
- [x] In `app/editor/page.tsx`, remove `testPlan` and pass only `currentPlan={subscription.planId}` to `EditorClient`.
- [x] In `app/editor/page.tsx`, remove the `realPlan` and `isTierTestOverride` props.
- [x] In `components/editor/editor-client.tsx`, remove the `realPlan` and `isTierTestOverride` props and keep `currentPlan`.
- [x] In `components/editor/editor-client.tsx`, remove the yellow `Testmodus` banner.
- [x] In `app/editor/account/billing/page.tsx`, remove the cookie/test-override imports and the `tierTestSwitchEnabled`, `effectivePlan`, and `isTierTestOverride` props.
- [x] In `components/billing/billing-client.tsx`, remove the `TierTestSwitch` import, its three test props, and the `Abonnement testen` card.
- [x] In `app/api/websites/publish/route.ts`, remove the `cookies` and `readTierTestPlan` imports.
- [x] In `app/api/websites/publish/route.ts`, remove `testPlan` and `effectivePlan`; use `subscription.planId` directly for entitlement checks and audit metadata.
- [x] In `app/api/websites/publish/route.ts`, restore the audit actions to only `website.published` and `website.unpublished` and remove the `realPlan` and `testMode` metadata fields.
- [x] In `lib/audit-log.ts`, remove `website.published.test` and `website.unpublished.test` from `AuditAction`.
- [x] In `package.json`, remove the `test:tier-switch` script.

### Remove optional environment configuration

- [x] Confirm `ENABLE_TIER_TEST_SWITCH` is absent from the repository's local environment files.
- [x] Confirm `TIER_TEST_SWITCH_SECRET` is absent from the repository's local environment files.
- [x] Confirm both variables are absent from the configured Vercel project and repository CI configuration.
- [ ] Optionally expire the old `flexpagina-tier-test` cookie once during deployment. With all reader code removed, the cookie is inert browser data.

### Keep these production tier features

- [x] Keep `currentPlan` on `EditorClient`, `SectionsSelector`, `EditorInspector`, `SelectionEditor`, and section-specific editor props.
- [x] Keep `components/editor/tier-badge.tsx`.
- [x] Keep section-level Silver/Gold badges and explanations.
- [x] Keep Silver labels on advanced request-form modes.
- [x] Keep the Gold label and warning on Services booking controls.
- [x] Keep `lib/entitlements.ts`, the database subscription resolver, publish validation, and all non-test entitlement tests.

### Verify after removal

- [x] Search for leftovers with `rg -n "tier-test|TierTest|tierTest|testPlan|isTierTest|TIER_TEST|ENABLE_TIER|published\\.test|unpublished\\.test|Testabonnement|Testmodus" app components lib tests package.json`.
- [x] Run `npm run test:entitlements`.
- [x] Run `npm run test:subscriptions`.
- [x] Run `npm run test:snapshots`.
- [x] Run `npx tsc --noEmit`.
- [x] Run the relevant lint command and confirm the editor uses the database-backed subscription everywhere.
