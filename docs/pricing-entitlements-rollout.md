# Pricing entitlements rollout and rollback

## Scope

This runbook enables the Bronze, Silver, and Gold entitlement system after the subscription, live-snapshot, and race-safe promotion migrations are installed. The default application behavior is fail-closed enforcement.

## Required migration order

- [x] Confirm `20260712190000_create_subscriptions.sql` is present on the configured target (`subscriptions` REST query succeeds).
- [ ] Apply `20260712200000_add_website_live_snapshots.sql`.
- [ ] Apply `20260712210000_race_safe_live_promotion.sql`.
- [ ] If the target was only partially migrated or reports a missing `websites.draft_version`, apply the idempotent repair migration `20260716120000_repair_live_snapshot_publishing.sql`.
- [ ] Confirm existing published websites have a non-null `live_snapshot`, `live_published_at`, and `draft_version`.
- [ ] Confirm `promote_website_live_snapshot` is executable by `authenticated`, but not `public`/anonymous users.
- [ ] Confirm each existing customer has the intended subscription row or intentionally receives the temporary Gold default.

## Enforcement modes

Set the server-only `PLAN_ENFORCEMENT_MODE` environment variable:

| Mode | Warnings and metrics | Blocks incompatible publishing/runtime actions | Use |
|---|---|---|---|
| `off` | Yes | No | Emergency rollback |
| `warn` | Yes | No | Migration observation period |
| `enforce` | Yes | Yes | Final production state |

Invalid or missing values default to `enforce`. This prevents a spelling mistake from silently disabling protection.

Recommended rollout:

1. Deploy migrations with `PLAN_ENFORCEMENT_MODE=off`.
2. Verify snapshot backfill and subscription assignments.
3. Change to `warn` and observe audit metrics for at least one normal publishing cycle.
4. Resolve unexpected blocker patterns or incorrect customer plans.
5. Change to `enforce`.
6. Confirm all plan decisions use the database-backed subscription resolver.

## Automated verification

- [x] `npm run test:entitlements`
- [x] `npm run test:subscriptions`
- [x] `npm run test:snapshots`
- [x] `npm run test:plan-enforcement`
- [x] `npx tsc --noEmit`
- [x] `npm run lint`
- [x] `npm run build`

## Desktop and mobile acceptance matrix

Run each row at desktop width and at approximately 390px mobile width.

| Plan | Draft | Expected editor result | Expected publish result |
|---|---|---|---|
| Bronze | 6 Bronze sections | All tools visible | Allowed |
| Bronze | 7 Bronze sections | Count warning and preflight | Blocked |
| Bronze | Gallery or FAQ | Silver badge; remains editable | Blocked |
| Bronze | Quote/appointment/WhatsApp request mode | Silver control warning | Blocked |
| Silver | 10 allowed sections | All tools visible | Allowed |
| Silver | 11 sections | Gold count warning | Blocked |
| Silver | Services booking space | Gold warning; remains editable | Blocked |
| Gold | More than 10 sections and booking | All tools visible | Allowed |

For every blocked row:

- [ ] The toast names the required tier.
- [ ] The persistent summary remains after dismissing the toast.
- [ ] `Ga naar sectie`, `Functie uitschakelen`, and billing links work where applicable.
- [ ] Editor publishing and the domain-dashboard toggle show equivalent structured blockers.
- [ ] The current public page remains byte-for-byte/functionally unchanged after editing and after rejected publishing.

## Runtime and bypass checks

- [ ] Submit a Bronze contact form: request is stored without Silver email delivery.
- [ ] Attempt quote, appointment, and WhatsApp request APIs on Bronze: server returns `RUNTIME_ENTITLEMENT_REQUIRED`.
- [ ] Submit a Silver appointment request: notification is allowed but no Gold calendar entry is created.
- [ ] Attempt a booking request on Silver: server returns `RUNTIME_ENTITLEMENT_REQUIRED`.
- [ ] Call calendar-entry and availability mutations directly on Bronze/Silver: server rejects them.
- [ ] Repeat booking and calendar mutations on Gold: server permits authorized operations.
- [ ] Submit contact/request/booking forms in editor preview: success is simulated and no database/email/calendar side effect occurs.
- [ ] Call `/api/websites/publish` directly with a forged `plan`, forged sections, or omitted client preflight: the server ignores them and validates authenticated database state.
- [ ] Change a section or subscription during publish: API returns `PUBLISH_STATE_CHANGED` and the previous live snapshot remains intact.
- [ ] Start simultaneous publishes for two websites: only one becomes live.

## Metrics

The audit log records:

- `entitlement.warning_shown` with violation count/codes and required plan;
- `entitlement.upgrade_clicked` with source and required plan;
- `website.publish_denied` with reason, plan, required plan, and violation codes;
- `website.published` for successful promotion.

Repeated blocker counts can be derived by grouping `website.publish_denied` and `entitlement.warning_shown` by `user_id`, violation code, and time window. Do not add form content or customer-submitted messages to entitlement metrics.

## Emergency rollback

1. Set `PLAN_ENFORCEMENT_MODE=off` and redeploy/restart the application.
2. Leave the schema and live snapshots in place; `off` permits runtime and publishing flows while preserving data compatibility.
3. Do not drop `live_snapshot` or revert public rendering to mutable draft tables.
4. Investigate audit events and correct subscription data or entitlement mappings.
5. Return to `warn`, repeat the acceptance matrix, then restore `enforce`.

Database rollback is only appropriate before any snapshot-based version has shipped. After rollout, prefer the application kill switch because dropping draft-version triggers or the promotion function can reintroduce draft leakage and partial-publication races.
