import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import test from "node:test"

const read = (relativePath) => fs.readFileSync(path.resolve(relativePath), "utf8")

test("phase 2 schema provides expiring holds in migration and destructive bootstrap", () => {
  const migration = read("supabase/migrations/20260801130000_add_public_booking_holds.sql")
  const init = read("supabase/init.sql")

  for (const source of [migration, init]) {
    assert.match(source, /create table (?:if not exists )?public\.booking_holds/)
    assert.match(source, /status in \('active', 'consumed', 'expired', 'cancelled'\)/)
    assert.match(source, /token_hash text not null unique/)
    assert.match(source, /now\(\) \+ interval '10 minutes'/)
    assert.match(source, /create or replace function public\.create_public_booking_hold/)
    assert.match(source, /create or replace function public\.finalize_public_booking/)
    assert.match(source, /pg_advisory_xact_lock/)
    assert.match(source, /e\.status in \('pending', 'confirmed'\)/)
    assert.match(source, /booking_settings\.capacity/)
    assert.match(source, /grant execute on function public\.finalize_public_booking[\s\S]+to service_role/)
  }
})

test("finalization creates the request and calendar entry in one database function", () => {
  const migration = read("supabase/migrations/20260801130000_add_public_booking_holds.sql")
  assert.match(migration, /insert into public\.contact_requests[\s\S]+returning id into created_request_id/)
  assert.match(migration, /insert into public\.calendar_entries[\s\S]+created_request_id/)
  assert.match(migration, /confirmation_mode = 'instant' then 'confirmed' else 'pending'/)
  assert.match(migration, /update public\.booking_holds[\s\S]+status = 'consumed'/)
  assert.doesNotMatch(migration, /stripe|payment_intent|checkout_session/i)
})

test("public context requires a published calendar section, service membership, and runtime entitlement", () => {
  const context = read("lib/booking/public-context.ts")
  assert.match(context, /website\?\.published && isWebsiteLiveSnapshot/)
  assert.match(context, /bookingSpaceEnabled !== true \|\| data\.bookingSpaceMode !== "calendar"/)
  assert.match(context, /selected\.length === 0 \|\| selected\.includes\(serviceId\)/)
  assert.match(context, /getMinimumPlanForCapability\("booking_system"\)/)
  assert.match(context, /shouldEnforcePlanEntitlements\(\)/)
  assert.match(context, /booking_holds/)
})

test("availability, hold, and confirmation endpoints are rate limited and revalidate availability", () => {
  const availability = read("app/api/booking/availability/route.ts")
  const holds = read("app/api/booking/holds/route.ts")
  const confirm = read("app/api/booking/confirm/route.ts")

  assert.match(availability, /booking_availability/)
  assert.match(availability, /getAppointmentAvailability/)
  assert.match(availability, /checkStayAvailability/)
  assert.match(holds, /booking_hold/)
  assert.match(holds, /find\(\(slot\) => slot\.start_at === startAt && slot\.end_at === endAt\)/)
  assert.match(holds, /create_public_booking_hold/)
  assert.match(confirm, /booking_confirm/)
  assert.match(confirm, /tokenHash/)
  assert.match(confirm, /finalize_public_booking/)
})

test("calendar UI exposes clickable date selection and returns before any preview network call", () => {
  const component = read("components/sections/services-section.tsx")
  const previewBranch = component.indexOf("if (isPreview) {")
  const holdFetch = component.indexOf('fetch("/api/booking/holds"')

  assert.ok(previewBranch >= 0)
  assert.ok(holdFetch > previewBranch)
  assert.match(component, /handleCalendarDateSelect/)
  assert.match(component, /onSelectDate=\{handleCalendarDateSelect\}/)
  assert.match(component, /<fieldset>/)
  assert.match(component, /type="radio"/)
  assert.match(component, /services-selected-arrival/)
  assert.match(component, /services-selected-departure/)
  assert.match(component, /services-selected-appointment-date/)
  assert.match(component, /aria-selected=/)
  assert.match(component, /aria-live="polite"/)
  assert.match(component, /settings\.mode === "calendar"/)
})
