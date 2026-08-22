import assert from "node:assert/strict"
import fs from "node:fs"
import test from "node:test"

const sql = fs.readFileSync("supabase/migrations/20260822120000_agent_team_platform.sql", "utf8")

test("jobs use the canonical business scope without parallel tenant columns", () => {
  assert.match(sql, /business_id uuid references public\.businesses\(id\)/)
  assert.match(sql, /\(scope = 'platform' and business_id is null\)/)
  assert.match(sql, /\(scope = 'business' and business_id is not null\)/)
  assert.doesNotMatch(sql, /company_id|tenant_id/)
})

test("agent tables deny browser access and grant only service-role RPCs", () => {
  for (const table of ["agent_settings", "agent_jobs", "agent_runs", "agent_artifacts", "agent_approvals", "agent_executions", "agent_audit_logs"]) {
    assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`))
  }
  assert.match(sql, /revoke all on function public\.enqueue_agent_job[\s\S]+from public, anon, authenticated/)
  assert.match(sql, /grant execute on function public\.enqueue_agent_job[\s\S]+to service_role/)
})
