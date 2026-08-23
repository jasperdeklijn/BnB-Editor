import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import test from "node:test"

const read = (relativePath) => fs.readFileSync(path.resolve(relativePath), "utf8")

test("reservation overview is owner scoped and excludes planning-only records", () => {
  const source = read("lib/booking/reservations.ts")
  assert.match(source, /\.eq\("user_id", user\.id\)/)
  assert.match(source, /\.eq\("business_id", businessId\)/)
  assert.match(source, /\.in\("entry_type", \["appointment", "booking"\]\)/)
  assert.match(source, /\.neq\("source", "import"\)/)
  assert.doesNotMatch(source, /from\("reservations"\)/)
})

test("reservation query keeps search, filters, counts, sorting, and pagination server side", () => {
  const source = read("lib/booking/reservations.ts")
  assert.match(source, /parseReservationOverviewFilters/)
  assert.match(source, /reservation_number/)
  assert.match(source, /customer_name\.ilike/)
  assert.match(source, /filters\.settlement/)
  assert.match(source, /filters\.dateFrom/)
  assert.match(source, /filters\.dateTo/)
  assert.match(source, /STATUSES\.map\(\(status\) => applyFilters\(status\)\.limit\(0\)\)/)
  assert.match(source, /RESERVATION_PAGE_SIZE/)
  assert.match(source, /\.range\(/)
  assert.match(source, /pageCount/)
  assert.match(source, /financeUnavailable/)
})

test("reservation status transitions are validated and race safe", () => {
  const reservations = read("lib/booking/reservations.ts")
  const actions = read("app/editor/reservations/actions.ts")
  const calendar = read("lib/supabase/calendar.ts")
  assert.match(reservations, /from === "pending".*to === "confirmed" \|\| to === "cancelled"/s)
  assert.match(reservations, /from === "confirmed".*to === "completed" \|\| to === "cancelled"/s)
  assert.match(actions, /isValidReservationTransition/)
  assert.match(actions, /transitionOwnerBooking/)
  assert.match(actions, /transitionCalendarEntryStatus/)
  assert.match(actions, /deliverBookingNotifications/)
  assert.match(calendar, /assertCurrentUserRuntimeEntitlement\(supabase, "booking_management"\)/)
  assert.match(calendar, /\.eq\("status", expectedStatus\)/)
  assert.match(calendar, /De reserveringsstatus is intussen gewijzigd/)
})

test("reservations page uses shared editor UI and URL-backed responsive controls", () => {
  const page = read("app/editor/reservations/page.tsx")
  const client = read("components/booking/reservations-client.tsx")
  const taskfile = read("docs/reservations-overview-tasks.md")
  assert.match(page, /EditorPageShell/)
  assert.match(page, /getUserRuntimeEntitlement/)
  assert.match(client, /useSearchParams/)
  assert.match(client, /router\.replace/)
  assert.match(client, /hidden overflow-x-auto md:block/)
  assert.match(client, /divide-y divide-border md:hidden/)
  assert.match(client, /aria-pressed/)
  assert.match(client, /aria-modal="true"/)
  assert.match(client, /focus-visible:ring-\[3px\]/)
  assert.match(client, /bg-card/)
  assert.match(client, /border-border/)
  assert.match(taskfile, /docs\/style-guide\.md/)
  assert.doesNotMatch(client, /bg-(blue|purple|violet)-/)
})

test("calendar and reservations share status presentation", () => {
  const presentation = read("lib/booking/status-presentation.ts")
  const calendar = read("components/calendar/calendar-client.tsx")
  const reservations = read("components/booking/reservations-client.tsx")
  for (const status of ["pending", "confirmed", "cancelled", "completed", "blocked"]) {
    assert.match(presentation, new RegExp(`${status}:`))
  }
  assert.match(calendar, /BOOKING_STATUS_LABELS as STATUS_LABELS/)
  assert.match(reservations, /BookingStatusBadge/)
})

test("editor navigation exposes reservations separately from the calendar", () => {
  const header = read("components/editor/editor-header.tsx")
  const layout = read("components/editor/editor-layout-client.tsx")
  assert.match(header, /href="\/editor\/reservations"/)
  assert.match(header, />\s*Reserveringen\s*</)
  assert.match(header, /href="\/editor\/calendar"/)
  assert.match(layout, /"\/editor\/reservations": "Reserveringen"/)
  assert.match(layout, /"\/editor\/reservations": <ClipboardList/)
})

