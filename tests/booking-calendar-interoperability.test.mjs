import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import test from "node:test"

const read = (relativePath) => fs.readFileSync(path.resolve(relativePath), "utf8")

test("phase 4 schema is mirrored and owner-scoped", () => {
  const migration = read("supabase/migrations/20260802120000_add_calendar_interoperability.sql")
  const init = read("supabase/init.sql")
  for (const source of [migration, init]) {
    assert.match(source, /create table (?:if not exists )?public\.calendar_export_feeds/)
    assert.match(source, /access_token uuid not null unique default gen_random_uuid\(\)/)
    assert.match(source, /create table (?:if not exists )?public\.calendar_import_sources/)
    assert.match(source, /external_occurrence_key text/)
    assert.match(source, /calendar_entries_external_event_key/)
    assert.match(source, /Users can manage own calendar export feed/)
    assert.match(source, /Users can manage own calendar import sources/)
    assert.match(source, /replace_calendar_import_events/)
    assert.match(source, /grant execute on function public\.replace_calendar_import_events\(uuid, jsonb\) to service_role/)
  }
})

test("source replacement is transactional, validated, and idempotent", () => {
  const migration = read("supabase/migrations/20260802120000_add_calendar_interoperability.sql")
  const sync = read("lib/calendar/sync.ts")
  assert.match(sync, /url\.protocol !== "https:"/)
  assert.match(migration, /jsonb_array_length\(p_events\) > 5000/)
  assert.match(migration, /event\.end_at - event\.start_at > interval '366 days'/)
  assert.match(migration, /on conflict \(external_source_id, external_uid, external_occurrence_key\)/)
  assert.match(migration, /delete from public\.calendar_entries existing/)
  assert.match(sync, /rpc\("replace_calendar_import_events"/)
  assert.match(sync, /sync_lock_expires_at/)
})

test("iCal import validates destinations, limits responses, and retains conditional sync metadata", () => {
  const sync = read("lib/calendar/sync.ts")
  assert.match(sync, /lookup\(host, \{ all: true, verbatim: true \}\)/)
  assert.match(sync, /Privénetwerkadressen zijn niet toegestaan/)
  assert.match(sync, /MAX_FEED_BYTES = 2 \* 1024 \* 1024/)
  assert.match(sync, /redirect: "manual"/)
  assert.match(sync, /AbortSignal\.timeout\(FETCH_TIMEOUT_MS\)/)
  assert.match(sync, /If-None-Match/)
  assert.match(sync, /response\.status === 304/)
  assert.match(sync, /parsed\.calendarId === source\.business_id/)
})

test("iCal parsing handles busy semantics, recurrence identities, and safe failure", () => {
  const ical = read("lib/calendar/ical.ts")
  assert.match(ical, /TRANSP/)
  assert.match(ical, /STATUS/)
  assert.match(ical, /RRULE/)
  assert.match(ical, /EXDATE/)
  assert.match(ical, /RECURRENCE-ID/)
  assert.match(ical, /MAX_IMPORTED_EVENTS = 5_000/)
  assert.match(ical, /niet-ondersteunde regels/)
  assert.match(ical, /X-FLEXPAGINA-CALENDAR-ID/)
})

test("private export omits contact fields and supports immediate key rotation", () => {
  const sync = read("lib/calendar/sync.ts")
  const route = read("app/api/calendar/ical/[token]/route.ts")
  assert.match(sync, /access_token: nextToken/)
  assert.match(sync, /token_version:/)
  assert.match(sync, /neq\("entry_type", "note"\)/)
  assert.doesNotMatch(sync, /select\("[^"]*customer_email/)
  assert.match(route, /text\/calendar/)
  assert.match(route, /private, no-store/)
  assert.match(route, /X-Content-Type-Options/)
  assert.match(route, /calendar_ical_export/)
})

test("calendar UI exposes sync health, manual sync, rotation, and the OAuth deferment", () => {
  const panel = read("components/calendar/calendar-sync-panel.tsx")
  const page = read("app/editor/calendar/page.tsx")
  assert.match(panel, /Privé exportlink/)
  assert.match(panel, /Sleutel roteren/)
  assert.match(panel, /Nu synchroniseren/)
  assert.match(panel, /Actueel/)
  assert.match(panel, /Verouderd/)
  assert.match(panel, /Google Calendar- en Outlook-koppelingen via OAuth blijven bewust uitgeschakeld/)
  assert.match(page, /getCalendarSyncData/)
})

test("calendar import retry cron is authenticated and scheduled", () => {
  const route = read("app/api/cron/calendar-sync/route.ts")
  const vercel = read("vercel.json")
  assert.match(route, /CRON_SECRET/)
  assert.match(route, /synchronizeDueCalendarSources/)
  assert.match(vercel, /\/api\/cron\/calendar-sync/)
})
