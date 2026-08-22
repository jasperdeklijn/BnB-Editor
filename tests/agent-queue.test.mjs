import assert from "node:assert/strict"
import fs from "node:fs"
import test from "node:test"

const migration = fs.readFileSync("supabase/migrations/20260822120000_agent_team_platform.sql", "utf8")
const init = fs.readFileSync("supabase/init.sql", "utf8")

test("agent platform schema is mirrored in init.sql", () => {
  for (const table of ["agent_settings", "agent_jobs", "agent_job_dependencies", "agent_runs", "agent_artifacts", "agent_approvals", "agent_executions", "agent_audit_logs"]) {
    assert.match(migration, new RegExp(`create table if not exists public\\.${table}`))
    assert.match(init, new RegExp(`create table if not exists public\\.${table}`))
  }
})

test("enqueue is idempotent and claims use a skip-locked lease", () => {
  assert.match(migration, /unique \(source, deduplication_key\)/)
  assert.match(migration, /on conflict \(source, deduplication_key\) do nothing/)
  assert.match(migration, /for update skip locked/)
  assert.match(migration, /lease_expires_at = now\(\) \+ make_interval/)
  assert.match(migration, /s\.agents_enabled/)
})

test("explicit checks do not collide with PostgreSQL column-check names", () => {
  assert.match(migration, /constraint agent_jobs_scope_business_check check/)
  assert.doesNotMatch(migration, /constraint agent_jobs_scope_check check/)
})
