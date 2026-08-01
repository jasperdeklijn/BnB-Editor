import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import test from "node:test"

const read = (relativePath) => fs.readFileSync(path.resolve(relativePath), "utf8")

test("phase 3 lifecycle schema is mirrored in migration and destructive bootstrap", () => {
  const migration = read("supabase/migrations/20260801140000_add_booking_lifecycle.sql")
  const init = read("supabase/init.sql")
  for (const source of [migration, init]) {
    assert.match(source, /create table (?:if not exists )?public\.booking_customer_access/)
    assert.match(source, /create table (?:if not exists )?public\.booking_status_history/)
    assert.match(source, /create table (?:if not exists )?public\.booking_change_requests/)
    assert.match(source, /create table (?:if not exists )?public\.booking_notifications/)
    assert.match(source, /idempotency_key text not null unique/)
    assert.match(source, /private_note text not null default ''/)
    assert.match(source, /Users can view own booking history/)
    assert.match(source, /after insert or update of status, start_at, end_at, metadata/)
    assert.match(source, /apply_booking_change_request/)
    assert.match(source, /cancel_customer_booking/)
  }
})

test("lifecycle trigger strips transient private context and queues deterministic events", () => {
  const migration = read("supabase/migrations/20260801140000_add_booking_lifecycle.sql")
  assert.match(migration, /new\.metadata := new\.metadata - 'lifecycle_actor' - 'lifecycle_public_message' - 'lifecycle_private_note'/)
  assert.match(migration, /insert into public\.booking_status_history/)
  assert.match(migration, /on conflict \(idempotency_key\) do nothing/)
  assert.match(migration, /lifecycle_event_id::text \|\| ':customer:'/)
  assert.match(migration, /Idempotent Booking Engine notification outbox/)
})

test("customer links are signed, versioned, expiring, and compared in constant time", () => {
  const access = read("lib/booking/customer-access.ts")
  assert.match(access, /createHmac\("sha256"/)
  assert.match(access, /timingSafeEqual/)
  assert.match(access, /token_version/)
  assert.match(access, /revoked_at/)
  assert.match(access, /new Date\(parsed\.expiresAt\)\.getTime\(\) <= Date\.now\(\)/)
  assert.doesNotMatch(access, /select\([^\n]*private_note/)
})

test("customer management is rate limited and replacement times are revalidated before atomic apply", () => {
  const route = read("app/api/booking/manage/[token]/route.ts")
  const lifecycle = read("lib/booking/lifecycle.ts")
  const migration = read("supabase/migrations/20260801140000_add_booking_lifecycle.sql")
  assert.match(route, /booking_manage/)
  assert.match(route, /validateBookingReplacementById/)
  assert.match(route, /apply_booking_change_request/)
  assert.match(route, /cancel_customer_booking/)
  assert.match(lifecycle, /getAppointmentAvailability/)
  assert.match(lifecycle, /checkStayAvailability/)
  assert.match(migration, /pg_advisory_xact_lock/)
  assert.match(migration, /occupied_count >= booking_settings\.capacity/)
})

test("notification delivery claims outbox rows and uses stable message ids", () => {
  const notifications = read("lib/booking/notifications.ts")
  const cron = read("app/api/cron/booking-notifications/route.ts")
  const vercel = read("vercel.json")
  assert.match(notifications, /\.in\("status", \["pending", "failed"\]\)/)
  assert.match(notifications, /status: "sending"/)
  assert.match(notifications, /createHash\("sha256"\)\.update\(row\.idempotency_key\)/)
  assert.match(notifications, /messageId/)
  assert.match(notifications, /createCustomerBookingLink/)
  assert.match(notifications, /deliverPendingBookingNotifications/)
  assert.match(cron, /CRON_SECRET/)
  assert.match(vercel, /\/api\/cron\/booking-notifications/)
})

test("owner calendar exposes approve, decline, alternatives, requests, and owner-only history", () => {
  const calendar = read("components/calendar/calendar-client.tsx")
  const actions = read("app/editor/calendar/actions.ts")
  assert.match(calendar, /Accepteren/)
  assert.match(calendar, /Afwijzen/)
  assert.match(calendar, /Alternatief tijdstip voorstellen/)
  assert.match(calendar, /Klant vraagt een ander tijdstip/)
  assert.match(calendar, /Alleen zichtbaar voor de eigenaar/)
  assert.match(actions, /transitionBookingAction/)
  assert.match(actions, /proposeAlternativeAction/)
  assert.match(actions, /acceptRescheduleRequestAction/)
  assert.match(actions, /rejectRescheduleRequestAction/)
})

test("customer workspace does not render owner private notes or add payment behavior", () => {
  const customer = read("components/booking/customer-booking-client.tsx")
  const route = read("app/api/booking/manage/[token]/route.ts")
  assert.match(customer, /Verplaatsing aanvragen/)
  assert.match(customer, /Boeking annuleren/)
  assert.match(customer, /Voorstel accepteren/)
  assert.doesNotMatch(customer, /private_note|internal_notes/)
  assert.doesNotMatch(`${customer}\n${route}`, /stripe|payment_intent|checkout_session/i)
})
