import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import test from "node:test"
import ts from "typescript"

function loadTypeScriptModule(relativePath) {
  const sourcePath = path.resolve(relativePath)
  const source = fs.readFileSync(sourcePath, "utf8")
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    fileName: sourcePath,
  })
  const module = { exports: {} }
  Function("module", "exports", compiled.outputText)(module, module.exports)
  return module.exports
}

const availability = loadTypeScriptModule("lib/booking/availability.ts")
const bookingTypes = loadTypeScriptModule("lib/booking/types.ts")

const settings = (overrides = {}) => ({
  service_id: "service-1",
  business_id: "business-1",
  booking_enabled: true,
  booking_mode: "appointment",
  confirmation_mode: "request",
  timezone: "Europe/Amsterdam",
  duration_minutes: 60,
  slot_interval_minutes: 30,
  buffer_before_minutes: 0,
  buffer_after_minutes: 0,
  minimum_notice_minutes: 0,
  booking_horizon_days: 90,
  capacity: 1,
  minimum_nights: 1,
  maximum_nights: 30,
  check_in_time: "15:00",
  check_out_time: "11:00",
  cancellation_cutoff_minutes: 1440,
  ...overrides,
})

const mondayWindow = {
  service_id: null,
  weekday: 1,
  start_time: "09:00",
  end_time: "12:00",
  timezone: "Europe/Amsterdam",
  is_active: true,
}

test("zoned conversion rejects nonexistent DST times and preserves valid local times", () => {
  assert.equal(availability.zonedDateTimeToUtc("2026-03-29", "02:30", "Europe/Amsterdam"), null)
  assert.equal(
    availability.zonedDateTimeToUtc("2026-03-29", "03:30", "Europe/Amsterdam").toISOString(),
    "2026-03-29T01:30:00.000Z",
  )
})

test("appointment slots respect local windows, duration, and interval", () => {
  const slots = availability.getAppointmentAvailability({
    settings: settings(),
    windows: [mondayWindow],
    entries: [],
    date_from: "2026-08-03",
    date_to: "2026-08-03",
    now: new Date("2026-08-01T00:00:00.000Z"),
  })

  assert.equal(slots.length, 5)
  assert.equal(slots[0].start_at, "2026-08-03T07:00:00.000Z")
  assert.equal(slots.at(-1).start_at, "2026-08-03T09:00:00.000Z")
})

test("conflicts, buffers, and capacity are applied together", () => {
  const existing = {
    service_id: "service-1",
    entry_type: "appointment",
    status: "confirmed",
    start_at: "2026-08-03T07:30:00.000Z",
    end_at: "2026-08-03T08:30:00.000Z",
  }

  const capacityOne = availability.getAppointmentAvailability({
    settings: settings({ duration_minutes: 30, slot_interval_minutes: 30, buffer_before_minutes: 30, buffer_after_minutes: 30 }),
    windows: [mondayWindow],
    entries: [existing],
    date_from: "2026-08-03",
    date_to: "2026-08-03",
    now: new Date("2026-08-01T00:00:00.000Z"),
  })
  assert.deepEqual(capacityOne.map((slot) => slot.start_at), ["2026-08-03T09:00:00.000Z", "2026-08-03T09:30:00.000Z"])

  const capacityTwo = availability.getAppointmentAvailability({
    settings: settings({ duration_minutes: 60, slot_interval_minutes: 60, capacity: 2 }),
    windows: [mondayWindow],
    entries: [existing],
    date_from: "2026-08-03",
    date_to: "2026-08-03",
    now: new Date("2026-08-01T00:00:00.000Z"),
  })
  assert.equal(capacityTwo.length, 3)
})

test("an existing appointment keeps its after-buffer regardless of evaluation order", () => {
  const slots = availability.getAppointmentAvailability({
    settings: settings({ duration_minutes: 30, slot_interval_minutes: 10, buffer_after_minutes: 30 }),
    windows: [mondayWindow],
    entries: [{
      service_id: "service-1",
      entry_type: "appointment",
      status: "confirmed",
      start_at: "2026-08-03T07:00:00.000Z",
      end_at: "2026-08-03T07:30:00.000Z",
    }],
    date_from: "2026-08-03",
    date_to: "2026-08-03",
    now: new Date("2026-08-01T00:00:00.000Z"),
  })

  assert.equal(slots.some((slot) => slot.start_at === "2026-08-03T07:40:00.000Z"), false)
  assert.equal(slots.some((slot) => slot.start_at === "2026-08-03T08:00:00.000Z"), true)
})

test("minimum notice and booking horizon remove otherwise valid slots", () => {
  const slots = availability.getAppointmentAvailability({
    settings: settings({ minimum_notice_minutes: 120, booking_horizon_days: 1 }),
    windows: [mondayWindow],
    entries: [],
    date_from: "2026-08-03",
    date_to: "2026-08-10",
    now: new Date("2026-08-03T06:30:00.000Z"),
  })

  assert.deepEqual(slots.map((slot) => slot.start_at), ["2026-08-03T08:30:00.000Z", "2026-08-03T09:00:00.000Z"])
})

test("service-specific inactive windows override global availability", () => {
  const slots = availability.getAppointmentAvailability({
    settings: settings(),
    windows: [mondayWindow, { ...mondayWindow, service_id: "service-1", is_active: false }],
    entries: [],
    date_from: "2026-08-03",
    date_to: "2026-08-03",
    now: new Date("2026-08-01T00:00:00.000Z"),
  })
  assert.deepEqual(slots, [])
})

test("stay availability enforces minimum nights and overlapping blocks", () => {
  const dailyWindows = Array.from({ length: 7 }, (_, index) => ({
    ...mondayWindow,
    weekday: index + 1,
  }))
  const options = availability.getStayAvailability({
    settings: settings({ booking_mode: "stay", minimum_nights: 2 }),
    windows: dailyWindows,
    entries: [{
      service_id: "service-1",
      entry_type: "booking",
      status: "confirmed",
      start_at: "2026-08-03T13:00:00.000Z",
      end_at: "2026-08-05T09:00:00.000Z",
    }],
    date_from: "2026-08-03",
    date_to: "2026-08-10",
    now: new Date("2026-08-01T00:00:00.000Z"),
  })

  assert.equal(options[0].arrival_date, "2026-08-05")
  assert.equal(options[0].departure_date, "2026-08-07")
  assert.equal(options[0].nights, 2)
})

test("stay checks enforce minimum and maximum nights before public booking exists", () => {
  const dailyWindows = Array.from({ length: 7 }, (_, index) => ({ ...mondayWindow, weekday: index + 1 }))
  const base = {
    settings: settings({ booking_mode: "stay", minimum_nights: 2, maximum_nights: 5 }),
    windows: dailyWindows,
    entries: [],
    arrival_date: "2026-08-03",
    now: new Date("2026-08-01T00:00:00.000Z"),
  }

  assert.equal(availability.checkStayAvailability({ ...base, departure_date: "2026-08-04" }).reason, "minimum_nights")
  assert.equal(availability.checkStayAvailability({ ...base, departure_date: "2026-08-09" }).reason, "maximum_nights")
  assert.equal(availability.checkStayAvailability({ ...base, departure_date: "2026-08-05" }).available, true)
})

test("availability day summaries distinguish free, partly booked, occupied, and unavailable dates", () => {
  const weekdayWindows = [1, 2].map((weekday) => ({ ...mondayWindow, weekday }))
  const occupiedEntry = {
    service_id: "service-1",
    entry_type: "appointment",
    status: "confirmed",
    start_at: "2026-08-03T07:00:00.000Z",
    end_at: "2026-08-03T10:00:00.000Z",
  }

  const capacityOne = availability.getAvailabilityDaySummaries({
    settings: settings(),
    windows: weekdayWindows,
    entries: [occupiedEntry],
    date_from: "2026-08-03",
    date_to: "2026-08-05",
    now: new Date("2026-08-01T00:00:00.000Z"),
  })
  assert.deepEqual(capacityOne.map((day) => day.status), ["occupied", "available", "unavailable"])

  const capacityTwo = availability.getAvailabilityDaySummaries({
    settings: settings({ capacity: 2 }),
    windows: weekdayWindows,
    entries: [occupiedEntry],
    date_from: "2026-08-03",
    date_to: "2026-08-03",
    now: new Date("2026-08-01T00:00:00.000Z"),
  })
  assert.equal(capacityTwo[0].status, "limited")
})

test("the public Diensten popup exposes a color-coded monthly availability preview", () => {
  const route = fs.readFileSync(path.resolve("app/api/booking/availability/route.ts"), "utf8")
  const servicesSection = fs.readFileSync(path.resolve("components/sections/services-section.tsx"), "utf8")
  assert.match(route, /getAvailabilityDaySummaries/)
  assert.match(route, /availability_days/)
  assert.match(servicesSection, /AvailabilityMiniCalendar/)
  assert.match(servicesSection, /available: "bg-emerald-100/)
  assert.match(servicesSection, /occupied: "bg-rose-100/)
  assert.match(servicesSection, /limitedDay: "Deels bezet"/)
})

test("phase 1 schema exists in migration and destructive bootstrap with owner RLS", () => {
  const migration = fs.readFileSync(path.resolve("supabase/migrations/20260801120000_add_service_booking_settings.sql"), "utf8")
  const init = fs.readFileSync(path.resolve("supabase/init.sql"), "utf8")
  for (const source of [migration, init]) {
    assert.match(source, /create table (?:if not exists )?public\.service_booking_settings/)
    assert.match(source, /booking_mode in \('appointment', 'stay'\)/)
    assert.match(source, /maximum_nights >= minimum_nights/)
    assert.match(source, /foreign key \(service_id, business_id\)/)
    assert.match(source, /Users can update own service booking settings/)
    assert.match(source, /s\.business_id = service_booking_settings\.business_id/)
  }
})

test("booking settings defaults and validation keep unsafe values out of persistence", () => {
  const defaults = bookingTypes.createDefaultServiceBookingSettings("service-1", "business-1", "stay")
  assert.equal(defaults.booking_mode, "stay")
  assert.equal(defaults.confirmation_mode, "request")
  assert.equal(defaults.booking_enabled, false)
  assert.throws(() => bookingTypes.validateServiceBookingSettingsInput({ ...defaults, maximum_nights: 0 }))
  assert.throws(() => bookingTypes.validateServiceBookingSettingsInput({ ...defaults, timezone: "Mars/Olympus" }))
})

test("the services editor exposes a read-only phase 1 availability preview", () => {
  const page = fs.readFileSync(path.resolve("app/editor/services/page.tsx"), "utf8")
  const client = fs.readFileSync(path.resolve("components/business/services-client.tsx"), "utf8")
  assert.match(page, /getServiceAvailabilityPreview/)
  assert.match(client, /Beschikbaarheidsvoorbeeld/)
  assert.match(client, /Alleen-lezen voorbeeld/)
  assert.match(client, /publiek boeken blijft Gold/)
})
