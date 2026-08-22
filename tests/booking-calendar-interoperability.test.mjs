import assert from "node:assert/strict"
import { createRequire } from "node:module"
import fs from "node:fs"
import path from "node:path"
import test from "node:test"
import ts from "typescript"

const read = (relativePath) => fs.readFileSync(path.resolve(relativePath), "utf8")
const nodeRequire = createRequire(import.meta.url)

function compileCommonJs(relativePath, requireOverrides = {}) {
  const sourcePath = path.resolve(relativePath)
  const compiled = ts.transpileModule(read(relativePath), {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
    fileName: sourcePath,
  })
  const module = { exports: {} }
  const localRequire = (specifier) => specifier in requireOverrides ? requireOverrides[specifier] : nodeRequire(specifier)
  Function("module", "exports", "require", compiled.outputText)(module, module.exports, localRequire)
  return module.exports
}

const availability = compileCommonJs("lib/booking/availability.ts")
const icalJs = nodeRequire(path.resolve("node_modules/ical.js/dist/ical.es5.cjs"))
const ical = compileCommonJs("lib/calendar/ical.ts", {
  "ical.js": { __esModule: true, default: icalJs },
  "@/lib/booking/availability": availability,
})

test("service calendar schema is mirrored, provider-scoped, and owner-scoped", () => {
  const phase4 = read("supabase/migrations/20260802120000_add_calendar_interoperability.sql")
  const serviceMigration = read("supabase/migrations/20260822130000_service_calendar_connections.sql")
  const init = read("supabase/init.sql")

  assert.match(phase4, /create table if not exists public\.calendar_export_feeds/)
  for (const source of [serviceMigration, init]) {
    assert.match(source, /service_id uuid/)
    assert.match(source, /provider in \('booking_com', 'google_calendar', 'other'\)/)
    assert.match(source, /target_provider in \('overview', 'booking_com', 'google_calendar'\)/)
    assert.match(source, /calendar_import_sources_service_business_fkey/)
    assert.match(source, /calendar_export_feeds_service_business_fkey/)
    assert.match(source, /calendar_import_sources_service_provider_key/)
    assert.match(source, /calendar_export_feeds_service_provider_key/)
    assert.match(source, /token_hash text/)
  }
  assert.match(init, /Users can manage own calendar export feed/)
  assert.match(init, /Users can manage own calendar import sources/)
})

test("source replacement is transactional, service-scoped, privacy-safe, and idempotent", () => {
  const migration = read("supabase/migrations/20260822130000_service_calendar_connections.sql")
  const sync = read("lib/calendar/sync.ts")
  assert.match(migration, /selected_source\.service_id/)
  assert.match(migration, /when 'booking_com' then 'Geboekt via Booking\.com'/)
  assert.match(migration, /on conflict \(external_source_id, external_uid, external_occurrence_key\)/)
  assert.match(migration, /delete from public\.calendar_entries existing/)
  assert.match(sync, /rpc\("replace_calendar_import_events"/)
  assert.match(sync, /sync_lock_expires_at/)
})

test("calendar secrets are encrypted, fingerprinted, and export tokens are hashed", () => {
  const secrets = read("lib/calendar/secrets.ts")
  const sync = read("lib/calendar/sync.ts")
  assert.match(secrets, /aes-256-gcm/)
  assert.match(secrets, /CALENDAR_SECRET_KEY/)
  assert.match(secrets, /createHmac\("sha256"/)
  assert.match(secrets, /randomBytes\(32\)\.toString\("base64url"\)/)
  assert.match(sync, /feed_url: encryptCalendarSecret\(feedUrl\)/)
  assert.match(sync, /token_hash: hashCalendarAccessToken\(token\)/)
  assert.match(sync, /access_token: null/)
})

test("iCal import pins validated public DNS, limits responses, redirects, and conditional requests", () => {
  const sync = read("lib/calendar/sync.ts")
  assert.match(sync, /lookup\(host, \{ all: true, verbatim: true \}\)/)
  assert.match(sync, /lookup: \(_hostname, _options, callback\) => callback\(null, destination\.address, destination\.family\)/)
  assert.match(sync, /Privénetwerkadressen zijn niet toegestaan/)
  assert.match(sync, /MAX_FEED_BYTES = 2 \* 1024 \* 1024/)
  assert.match(sync, /MAX_REDIRECTS = 3/)
  assert.match(sync, /If-None-Match/)
  assert.match(sync, /response\.status === 304/)
  assert.match(sync, /toegestaan iCal-contenttype/)
})

test("maintained ICAL.js parser handles all-day dates, recurrence, cancellation, and missing UID", () => {
  const parsed = ical.parseIcalBusyEvents([
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "X-WR-TIMEZONE:Europe/Amsterdam",
    "BEGIN:VEVENT",
    "DTSTART;VALUE=DATE:20260824",
    "DTEND;VALUE=DATE:20260826",
    "SUMMARY:Booking without UID",
    "END:VEVENT",
    "BEGIN:VEVENT",
    "UID:weekly",
    "DTSTART:20260824T090000Z",
    "DTEND:20260824T100000Z",
    "RRULE:FREQ=WEEKLY;COUNT=2",
    "END:VEVENT",
    "BEGIN:VEVENT",
    "UID:weekly",
    "RECURRENCE-ID:20260831T090000Z",
    "DTSTART:20260831T110000Z",
    "DTEND:20260831T120000Z",
    "SUMMARY:Moved occurrence",
    "END:VEVENT",
    "BEGIN:VEVENT",
    "UID:cancelled",
    "DTSTART:20260825T090000Z",
    "DTEND:20260825T100000Z",
    "STATUS:CANCELLED",
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n"), { now: new Date("2026-08-22T00:00:00.000Z"), pastDays: 1, futureDays: 30 })

  assert.equal(parsed.events.length, 3)
  const stay = parsed.events.find((event) => event.allDay)
  assert.ok(stay)
  assert.match(stay.uid, /^fallback-[a-f0-9]{64}$/)
  assert.equal(stay.startAt, "2026-08-23T22:00:00.000Z")
  assert.equal(stay.endAt, "2026-08-25T22:00:00.000Z")
  assert.equal(parsed.events.filter((event) => event.uid === "weekly").length, 2)
  assert.equal(parsed.events.some((event) => event.uid === "weekly" && event.startAt === "2026-08-31T11:00:00.000Z"), true)
  assert.equal(parsed.events.some((event) => event.uid === "cancelled"), false)
})

test("ICAL.js normalization handles TZID, numeric offsets, folded text, and invalid feeds", () => {
  const parsed = ical.parseIcalBusyEvents([
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "BEGIN:VEVENT",
    "UID:local-time",
    "DTSTART;TZID=Europe/Amsterdam:20260824T150000",
    "DTEND;TZID=Europe/Amsterdam:20260824T160000",
    "SUMMARY:Lang samengevouwen",
    " onderwerp",
    "END:VEVENT",
    "BEGIN:VEVENT",
    "UID:offset-time",
    "DTSTART:20260825T150000+0200",
    "DTEND:20260825T160000+0200",
    "SUMMARY:Komma\\, puntkomma\\; en tekst",
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n"), { now: new Date("2026-08-22T00:00:00.000Z"), futureDays: 30 })

  assert.equal(parsed.events.length, 2)
  assert.equal(parsed.events.find((event) => event.uid === "local-time").startAt, "2026-08-24T13:00:00.000Z")
  assert.equal(parsed.events.find((event) => event.uid === "offset-time").startAt, "2026-08-25T13:00:00.000Z")
  assert.match(parsed.events.find((event) => event.uid === "local-time").summary, /samengevouwenonderwerp/)
  assert.throws(() => ical.parseIcalBusyEvents("geen kalender"), /geen geldige iCal-kalender/)
})

test("provider export uses private summaries, date-only stays, stable UIDs, and CRLF", () => {
  const feed = ical.createIcalFeed({
    businessId: "business-1",
    calendarId: "feed-1",
    calendarName: "Kamer één",
    genericSummary: "Bezet",
    forceDateOnly: true,
    entries: [{
      id: "entry-1",
      title: "Kamer - Gastnaam",
      source: "website_form",
      status: "confirmed",
      start_at: "2026-08-24T13:00:00.000Z",
      end_at: "2026-08-26T09:00:00.000Z",
      updated_at: "2026-08-22T10:00:00.000Z",
      all_day: true,
      timezone: "Europe/Amsterdam",
    }],
  })

  assert.match(feed, /UID:entry-1@flexpagina\.nl\r\n/)
  assert.match(feed, /DTSTART;VALUE=DATE:20260824\r\n/)
  assert.match(feed, /DTEND;VALUE=DATE:20260826\r\n/)
  assert.match(feed, /SUMMARY:Bezet\r\n/)
  assert.doesNotMatch(feed, /Gastnaam/)
  assert.match(feed, /X-FLEXPAGINA-BUSINESS-ID:business-1/)
  assert.equal(feed.endsWith("\r\n"), true)
})

test("provider export filters service scope, inactive entries, and same-provider imports", () => {
  const sync = read("lib/calendar/sync.ts")
  assert.match(sync, /entry\.service_id !== null && entry\.service_id !== feed\.service_id/)
  assert.match(sync, /entry\.status === "cancelled" \|\| entry\.status === "completed"/)
  assert.match(sync, /providers\.get\(entry\.external_source_id\) !== feed\.target_provider/)
  assert.match(sync, /genericSummary: feed\.target_provider === "overview" \? null : "Bezet"/)
  assert.match(sync, /forceDateOnly: feed\.service_id !== null/)
})

test("calendar UI is active and exposes accommodation-specific wizards and non-realtime warning", () => {
  const panel = read("components/calendar/calendar-sync-panel.tsx")
  const client = read("components/calendar/calendar-client.tsx")
  const page = read("app/editor/calendar/page.tsx")
  assert.match(panel, /Booking\.com-agenda koppelen/)
  assert.match(panel, /Stappen voor Booking\.com/)
  assert.match(panel, /Stappen voor Google Agenda/)
  assert.match(panel, /iCal is niet realtime/)
  assert.match(panel, /Nu synchroniseren/)
  assert.match(panel, /accommodations/)
  assert.match(client, /<CalendarSyncPanel/)
  assert.doesNotMatch(client, /External-calendar controls are intentionally hidden/)
  assert.match(page, /booking_mode === "stay"/)
})

test("calendar cron is authenticated, daily Hobby-compatible, and database intervals are configurable", () => {
  const route = read("app/api/cron/calendar-sync/route.ts")
  const vercel = read("vercel.json")
  const sync = read("lib/calendar/sync.ts")
  assert.match(route, /CRON_SECRET/)
  assert.match(route, /synchronizeDueCalendarSources/)
  assert.match(vercel, /"path": "\/api\/cron\/calendar-sync",\s*"schedule": "15 2 \* \* \*"/)
  assert.match(sync, /CALENDAR_SYNC_INTERVAL_MINUTES/)
  assert.match(sync, /CALENDAR_SYNC_RETRY_MINUTES/)
})
