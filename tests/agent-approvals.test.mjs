import assert from "node:assert/strict"
import fs from "node:fs"
import test from "node:test"

const sql = fs.readFileSync("supabase/migrations/20260822120000_agent_team_platform.sql", "utf8")
const approve = fs.readFileSync("app/api/admin/agents/approvals/[approvalId]/approve/route.ts", "utf8")
const executor = fs.readFileSync("lib/agents/executor.ts", "utf8")

test("approvals bind one execution to the immutable artifact hash", () => {
  assert.match(sql, /artifact_content_hash text not null/)
  assert.match(sql, /approval_id uuid not null unique/)
  assert.match(sql, /if artifact_hash is distinct from approval_row\.artifact_content_hash/)
  assert.match(sql, /prevent_agent_artifact_update/)
})

test("observe-only and kill switch block external execution", () => {
  assert.match(sql, /if coalesce\(settings_row\.observe_only, true\) then/)
  assert.match(sql, /Agent kill switch is active/)
  assert.match(sql, /s\.agents_enabled and not s\.observe_only/)
  assert.match(approve, /confirm: z\.literal\(true\)/)
})

test("uncertain SMTP outcomes reconcile without blind retry", () => {
  assert.match(executor, /status = draft\?\.status === "sent" \? "unknown" : "failed"/)
  assert.match(executor, /eq\("status", "unknown"\)/)
  assert.match(executor, /draft\?\.status !== "sent"/)
})
