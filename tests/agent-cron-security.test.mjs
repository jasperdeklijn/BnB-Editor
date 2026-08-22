import assert from "node:assert/strict"
import fs from "node:fs"
import test from "node:test"

const routes = [
  "app/api/cron/agents/dispatch/route.ts",
  "app/api/cron/agents/reconcile/route.ts",
  "app/api/cron/agents/daily-summary/route.ts",
  "app/api/cron/leads/route.ts",
]

test("all agent cron routes require the exact bearer secret", () => {
  for (const route of routes) {
    const source = fs.readFileSync(route, "utf8")
    assert.match(source, /process\.env\.CRON_SECRET/)
    assert.match(source, /authorization/)
    assert.match(source, /Bearer \$\{secret\}|Bearer \$\{cronSecret\}/)
    assert.match(source, /status: 401/)
    assert.doesNotMatch(source, /export async function POST/)
  }
})

test("cron configuration schedules dispatch, recovery and local-time summary", () => {
  const vercel = JSON.parse(fs.readFileSync("vercel.json", "utf8"))
  for (const path of ["/api/cron/agents/dispatch", "/api/cron/agents/reconcile", "/api/cron/agents/daily-summary"]) {
    assert.ok(vercel.crons.some((cron) => cron.path === path))
  }
  assert.match(fs.readFileSync(routes[2], "utf8"), /Europe\/Amsterdam/)
})
