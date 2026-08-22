import assert from "node:assert/strict"
import fs from "node:fs"
import test from "node:test"

const sql = fs.readFileSync("supabase/migrations/20260822120000_agent_team_platform.sql", "utf8")

test("status changes are validated and audited transactionally", () => {
  assert.match(sql, /Invalid agent job transition/)
  assert.match(sql, /'job\.status_changed'/)
  assert.match(sql, /old_status, p_new_status/)
  assert.match(sql, /when 'dead_letter' then p_new_status in \('queued', 'cancelled'\)/)
})

test("expired workers are recovered or dead-lettered", () => {
  assert.match(sql, /create or replace function public\.requeue_expired_agent_jobs/)
  assert.match(sql, /case when j\.attempt_count >= j\.max_attempts then 'dead_letter' else 'queued' end/)
  assert.match(sql, /error_code = 'lease_expired'/)
  assert.match(sql, /create or replace function public\.retry_agent_job/)
})
