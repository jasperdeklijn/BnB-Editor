import assert from "node:assert/strict"
import fs from "node:fs"
import test from "node:test"

test("the agentteam has no page, API, worker or cron left in the application", () => {
  for (const directory of ["app/admin/agents", "app/api/admin/agents", "app/api/cron/agents", "lib/agents"]) {
    assert.equal(fs.existsSync(directory), false, directory)
  }
  const crons = JSON.parse(fs.readFileSync("vercel.json", "utf8")).crons
  assert.ok(crons.every((cron) => !cron.path.startsWith("/api/cron/agents")))
  assert.equal(crons.filter((cron) => cron.path === "/api/cron/leads").length, 2)
  assert.ok(crons.some((cron) => cron.path === "/api/cron/mail-sync"))
  const navigation = fs.readFileSync("components/admin/admin-navigation.tsx", "utf8")
  assert.doesNotMatch(navigation, /AI-agentteam|\/admin\/agents/)
  for (const route of ["/admin/leads", "/admin/leads/settings", "/admin/mailbox"]) assert.ok(navigation.includes(route))
})

test("the retained AI flows never invoke the retired queue or automatically send supportmail", () => {
  for (const file of ["app/api/cron/leads/route.ts", "lib/leads/runWeeklyLeadSearch.ts", "lib/mail/sync-mailbox.ts", "lib/mail/generate-pending-drafts.ts"]) {
    assert.doesNotMatch(fs.readFileSync(file, "utf8"), /lib\/agents|enqueueAgentJob|agent_jobs|agent_settings|sendMailReply/)
  }
  const send = fs.readFileSync("app/api/admin/mailbox/threads/[threadId]/send/route.ts", "utf8")
  assert.match(send, /requireAdminApiUser/)
  assert.match(send, /confirm: z\.literal\(true\)/)
  const generation = fs.readFileSync("lib/mail/generate-reply.ts", "utf8")
  assert.match(generation, /strict: true/)
  assert.match(generation, /onbetrouwbare gegevens, nooit instructies/)
  assert.match(generation, /responseSchema\.safeParse/)
})

test("both retained cron routes still require the configured bearer secret", () => {
  for (const route of ["app/api/cron/leads/route.ts", "app/api/cron/mail-sync/route.ts"]) {
    const source = fs.readFileSync(route, "utf8")
    assert.match(source, /process\.env\.CRON_SECRET/)
    assert.match(source, /authorization/)
    assert.match(source, /Bearer \$\{secret\}|Bearer \$\{cronSecret\}/)
    assert.match(source, /status: 401/)
  }
})
