import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import test from "node:test"
import ts from "typescript"

function loadRuntimeFreeModule(relativePath) {
  const sourcePath = path.resolve(relativePath)
  const source = fs.readFileSync(sourcePath, "utf8")
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
    fileName: sourcePath,
  })
  const loaded = { exports: {} }
  Function("module", "exports", "require", compiled.outputText)(loaded, loaded.exports, (specifier) => {
    if (specifier === "server-only") return {}
    throw new Error(`${relativePath} must remain runtime dependency-free: ${specifier}`)
  })
  return loaded.exports
}

const { normalizeSubject } = loadRuntimeFreeModule("lib/mail/threading.ts")
const { assessMailRisk, isAutomatedMail } = loadRuntimeFreeModule("lib/mail/risk-policy.ts")

test("normalizes reply and forward subject prefixes for stable threading", () => {
  assert.equal(normalizeSubject(" Re: FW:  Domeinnaam koppelen "), "domeinnaam koppelen")
  assert.equal(normalizeSubject("Antwoord: Factuurvraag"), "factuurvraag")
})

test("requires review for financial, legal, privacy and security mail", () => {
  assert.equal(assessMailRisk("Vraag", "Hoe koppel ik een domeinnaam?").requiresReview, false)
  assert.equal(assessMailRisk("Factuur", "Ik wil een terugbetaling").requiresReview, true)
  assert.equal(assessMailRisk("Help", "Mijn account is gehackt").requiresReview, true)
})

test("recognizes automated mail that must not receive a draft", () => {
  assert.equal(isAutomatedMail({ "auto-submitted": "auto-replied" }, "support@example.com"), true)
  assert.equal(isAutomatedMail({ precedence: "bulk" }, "updates@example.com"), true)
  assert.equal(isAutomatedMail({}, "no-reply@example.com"), true)
  assert.equal(isAutomatedMail({}, "customer@example.com"), false)
})

test("schema and cron keep the agent durable and scheduled", () => {
  const migration = fs.readFileSync(path.resolve("supabase/migrations/20260718120000_ai_mail_agent.sql"), "utf8")
  const init = fs.readFileSync(path.resolve("supabase/init.sql"), "utf8")
  const vercel = JSON.parse(fs.readFileSync(path.resolve("vercel.json"), "utf8"))
  for (const table of ["mail_accounts", "mail_threads", "mail_messages", "mail_drafts", "mail_knowledge_answers", "mail_feedback", "mail_sync_runs"]) {
    assert.match(migration, new RegExp(`create table if not exists public\\.${table}`))
    assert.match(init, new RegExp(`create table public\\.${table}`))
  }
  assert.ok(vercel.crons.some((cron) => cron.path === "/api/cron/mail-sync" && cron.schedule === "*/5 * * * *"))
})
