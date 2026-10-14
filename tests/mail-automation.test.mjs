import assert from "node:assert/strict"
import test from "node:test"
import { load } from "./helpers/load-admin-ai.mjs"

function message(id, thread = id, drafts = []) {
  return { id, thread_id: thread, from_address: "customer@example.com", raw_headers: {}, drafts }
}
function fixture(messages, { queryError = false, failedMessage = null } = {}) {
  const generated = [], queries = []
  let active = 0, maxActive = 0
  const { isAutomatedMail } = load("lib/mail/risk-policy.ts")
  const { generatePendingMailDrafts } = load("lib/mail/generate-pending-drafts.ts", {
    "@/lib/mail/risk-policy": { isAutomatedMail },
    "@/lib/mail/generate-reply": { generateReplyDraft: async (_db, input) => {
      generated.push(input); active++; maxActive = Math.max(maxActive, active)
      await new Promise((resolve) => setImmediate(resolve)); active--
      if (input.messageId === failedMessage) throw new Error("model failed")
      return { id: input.messageId }
    } },
  })
  const db = { from(table) {
    assert.equal(table, "mail_messages")
    const query = []; queries.push(query)
    const chain = new Proxy({}, { get(_target, key) { return (...args) => {
      query.push([key, ...args])
      if (key === "range") return Promise.resolve({ data: messages.slice(args[0], args[1] + 1), error: queryError ? new Error("unavailable") : null })
      return chain
    } } })
    return chain
  } }
  return { run: () => generatePendingMailDrafts(db, "account"), generated, queries, maxActive: () => maxActive }
}

test("support sync drafts only the latest unanswered human message in an open conversation", async () => {
  const f = fixture([
    message("latest", "conversation"), message("older", "conversation"),
    { ...message("automated"), raw_headers: { "auto-submitted": "auto-replied" } },
    message("already-ready", "existing", [{ status: "ready" }]),
    message("older-undrafted", "existing"),
    message("discarded", "discarded", [{ status: "discarded" }]),
    message("retry", "retry", [{ status: "failed" }]),
  ])
  assert.deepEqual(await f.run(), { drafts: 2, failed: 0 })
  assert.deepEqual(f.generated.map((m) => m.messageId), ["latest", "retry"])
  assert.ok(f.queries[0].some(([key, column, value]) => key === "eq" && column === "mail_account_id" && value === "account"))
  assert.ok(f.queries[0].some(([key, column, value]) => key === "in" && column === "mail_threads.status" && !value.includes("closed") && !value.includes("ignored")))
})

test("draft backlog survives batching, pagination and a failed generation", async () => {
  const existing = Array.from({ length: 100 }, (_, i) => message(`old-${i}`, `old-${i}`, [{ status: "sent" }]))
  const pending = Array.from({ length: 12 }, (_, i) => message(`new-${i}`))
  const f = fixture([...existing, ...pending], { failedMessage: "new-0" })
  assert.deepEqual(await f.run(), { drafts: 9, failed: 1 })
  assert.equal(f.generated.length, 10)
  assert.equal(f.queries.length, 2)
  assert.equal(f.maxActive(), 3)
  const next = fixture(pending.map((m, i) => i < 10 && i !== 0 ? { ...m, drafts: [{ status: "ready" }] } : m))
  assert.deepEqual(await next.run(), { drafts: 3, failed: 0 })
  assert.deepEqual(next.generated.map((m) => m.messageId), ["new-0", "new-10", "new-11"])
})

test("a failed backlog query never starts draft generation", async () => {
  const f = fixture([message("new")], { queryError: true })
  await assert.rejects(f.run(), /geladen/)
  assert.equal(f.generated.length, 0)
})
