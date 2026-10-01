import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import vm from "node:vm"
import ts from "typescript"

const source = ts.transpileModule(readFileSync("lib/booking/date-display.ts", "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText

function load(literal, defaultTimeZone) {
  const exports = {}
  class DateTimeFormat extends Intl.DateTimeFormat {
    constructor(locale, options) {
      super(locale, { timeZone: defaultTimeZone, ...options })
    }
    formatToParts(date) {
      return super.formatToParts(date).map((part) => part.type === "literal" ? { ...part, value: literal } : part)
    }
  }
  vm.runInNewContext(source, { exports, Intl: { DateTimeFormat } })
  return exports.formatReservationUpdated
}

test("reservation update timestamps match across ICU punctuation and default time zones", () => {
  const server = load(" ", "UTC")
  const browser = load(", ", "America/New_York")
  const value = "2026-09-15T16:25:00Z"
  assert.equal(server(value), "15-09-2026, 18:25")
  assert.equal(browser(value), server(value))
})

test("reservation timestamps use Amsterdam daylight saving and a 24-hour clock", () => {
  const format = load(" ", "UTC")
  assert.equal(format("2026-01-15T17:25:00Z"), "15-01-2026, 18:25")
  assert.equal(format("2026-09-14T22:00:00Z"), "15-09-2026, 00:00")
})

test("invalid update timestamps have a stable empty display", () => {
  assert.equal(load(" ", "UTC")("invalid"), "—")
})
