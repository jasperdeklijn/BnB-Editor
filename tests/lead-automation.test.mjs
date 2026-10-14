import assert from "node:assert/strict"
import test from "node:test"
import { load } from "./helpers/load-admin-ai.mjs"

function fixture({ duplicate = false, failSearch = -1, updateError = false, notify = true } = {}) {
  const searches = [], updates = [], notifications = [], inserts = []
  const supabase = { from(table) {
    assert.equal(table, "lead_agent_runs")
    return {
      insert(value) { inserts.push(value); return { select: () => ({ single: async () => ({ data: duplicate ? null : { id: "run" }, error: duplicate ? { code: "23505" } : null }) }) } },
      update(value) { updates.push(value); return { eq: async () => ({ error: updateError ? new Error("unavailable") : null }) } },
    }
  } }
  const { runWeeklyLeadSearch } = load("lib/leads/runWeeklyLeadSearch.ts", {
    "@/lib/leads/runLeadSearch": { runLeadSearch: async (input) => {
      searches.push(input)
      if (searches.length - 1 === failSearch) throw new Error("Places failed")
      return { found: input.limit, saved: input.limit, created: input.limit - 1, updated: 1, failed: 0 }
    } },
    "@/lib/leads/sendLeadRunNotification": { sendLeadRunNotification: async (value) => { notifications.push(value); return { sent: true } } },
  })
  return { run: () => runWeeklyLeadSearch(supabase, { weekKey: "2026-W42", cities: ["Uden", "Veghel"], categories: ["kapper", "hovenier"], limit: 7, emailNotificationsEnabled: notify }), searches, updates, notifications, inserts }
}

test("weekly lead search allocates the remaining limit and records results without agent tables", async () => {
  const f = fixture()
  const result = await f.run()
  assert.equal(result.status, "succeeded")
  assert.equal(result.saved, 7)
  assert.deepEqual(f.searches.map((s) => s.limit), [2, 2, 2, 1])
  assert.equal(f.inserts[0].run_key, "lead-cron:2026-W42")
  assert.equal(f.updates[0].created_count, 3)
  assert.equal(f.updates[0].updated_count, 4)
  assert.equal(f.updates[1].notification_sent, true)
  assert.equal(f.notifications.length, 1)
})

test("a duplicate weekly run performs no search or notification", async () => {
  const f = fixture({ duplicate: true })
  assert.deepEqual(await f.run(), { skipped: true, reason: "run_already_processed" })
  assert.equal(f.searches.length, 0)
  assert.equal(f.notifications.length, 0)
})

test("partial lead searches stay visible and respect disabled email notifications", async () => {
  const f = fixture({ failSearch: 0, notify: false })
  const result = await f.run()
  assert.equal(result.status, "partial")
  assert.equal(result.saved, 5)
  assert.equal(f.updates[0].failed_count, 1)
  assert.equal(f.notifications.length, 0)
})

test("failed run-history updates are reported before any notification", async () => {
  const f = fixture({ updateError: true })
  await assert.rejects(f.run(), /afgerond/)
  assert.equal(f.notifications.length, 0)
})

test("lead cron still enforces its bearer secret, Amsterdam schedule and weekly cap", async () => {
  let runs = 0, clients = 0
  const schedule = { isMondayAtNine: true, weekStartedAt: "2026-10-12", weekKey: "2026-W42" }
  const settings = { enabled: true, weekly_limit: 7, cities: ["Uden"], categories: ["kapper"], email_notifications_enabled: false }
  const { GET } = load("app/api/cron/leads/route.ts", {
    "@/lib/leads/amsterdamSchedule": { getAmsterdamScheduleContext: () => schedule },
    "@/lib/leads/settings": { getLeadAgentSettings: async () => settings },
    "@/lib/supabase/admin": { createAdminClient: async () => { clients++; return { from: () => ({ select: () => ({ gte: async () => ({ count: 3, error: null }) }) }) } } },
    "@/lib/leads/runWeeklyLeadSearch": { runWeeklyLeadSearch: async (_db, input) => { runs++; assert.equal(input.limit, 4); return { status: "succeeded" } } },
  }, { CRON_SECRET: "fixture", SUPABASE_SERVICE_ROLE_KEY: "fixture" })
  const request = (secret) => new Request("http://localhost/api/cron/leads", { headers: { authorization: `Bearer ${secret}` } })
  assert.equal((await GET(request("wrong"))).status, 401)
  assert.equal(clients, 0)
  schedule.isMondayAtNine = false
  assert.equal((await (await GET(request("fixture"))).json()).reason, "outside_amsterdam_schedule")
  assert.equal(clients, 0)
  schedule.isMondayAtNine = true
  settings.enabled = false
  assert.equal((await (await GET(request("fixture"))).json()).reason, "automation_disabled")
  settings.enabled = true
  settings.weekly_limit = 3
  assert.equal((await (await GET(request("fixture"))).json()).reason, "weekly_limit_reached")
  settings.weekly_limit = 7
  assert.equal((await GET(request("fixture"))).status, 200)
  assert.equal(runs, 1)
})
