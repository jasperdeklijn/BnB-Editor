import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import test from "node:test"

const read = (relativePath) => fs.readFileSync(path.resolve(relativePath), "utf8")

test("calendar range counts and day groups include overlapping multi-day bookings", () => {
  const calendar = read("components/calendar/calendar-client.tsx")
  assert.match(calendar, /function overlapsRange\(/)
  assert.match(calendar, /overlapsRange\(entry, calendarViewRange\.start, calendarViewRange\.end\)/)
  assert.match(calendar, /visibleEntries\.filter\(\(entry\) => overlapsRange\(entry, day, nextDay\)\)/)
  assert.match(calendar, /Aankomst/)
  assert.match(calendar, /Vertrek/)
  assert.match(calendar, /Hele dag en doorlopend/)
  assert.doesNotMatch(calendar, /function startsWithinRange\(/)
})

test("mobile month view uses compact indicators and a readable selected-day agenda", () => {
  const calendar = read("components/calendar/calendar-client.tsx")
  assert.match(calendar, /STATUS_DOT_STYLES/)
  assert.match(calendar, /setSelectedDayKey/)
  assert.match(calendar, /sm:min-h-28/)
  assert.match(calendar, /Planning voor/)
  assert.match(calendar, /selectedDayEntries\.map/)
  assert.match(calendar, /grid grid-cols-3 gap-2 md:gap-4/)
})

test("mobile calendar dialog has a name and unique form field ids", () => {
  const calendar = read("components/calendar/calendar-client.tsx")
  assert.match(calendar, /aria-labelledby="calendar-entry-mobile-title"/)
  assert.match(calendar, /idPrefix="calendar-entry-desktop"/)
  assert.match(calendar, /idPrefix="calendar-entry-mobile"/)
  assert.match(calendar, /idPrefix="calendar-finance-desktop"/)
  assert.match(calendar, /idPrefix="calendar-finance-mobile"/)
  assert.match(calendar, /const fieldId = \(name: string\) => `\$\{idPrefix\}-\$\{name\}`/)
  assert.match(calendar, /aria-hidden="true"/)
  assert.doesNotMatch(calendar, /absolute inset-0 cursor-default/)
})

test("booking detail uses progressive disclosure and protects destructive actions", () => {
  const calendar = read("components/calendar/calendar-client.tsx")
  const finance = read("components/calendar/booking-finance-panel.tsx")
  assert.match(calendar, /Boekingsverloop en historie/)
  assert.match(calendar, /Klantgegevens en notities/)
  assert.match(calendar, /Geavanceerde acties/)
  assert.match(calendar, /Dit kalenderitem definitief verwijderen/)
  assert.match(finance, /<details className="min-w-0 overflow-hidden rounded-lg border border-border bg-card shadow-sm">/)
})

test("editor navigation title no longer creates a duplicate page h1", () => {
  const header = read("components/editor/editor-header.tsx")
  assert.doesNotMatch(header, /<h1 className="inline-flex items-center justify-center/)
})
