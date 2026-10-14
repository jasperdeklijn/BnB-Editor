import assert from "node:assert/strict"
import { readFileSync, readdirSync } from "node:fs"
import test from "node:test"
import { PGlite } from "@electric-sql/pglite"
import { fixture } from "./helpers/website-pages-fixture.mjs"

const init = readFileSync("supabase/init.sql", "utf8")
const retainedMigrations = [
  "20260708201000_ai_leads.sql",
  "20260713130000_lead_agent_automation.sql",
  "20260718120000_ai_mail_agent.sql",
]
const retainedTables = ["leads", "lead_agent_settings", "lead_agent_runs", "mail_accounts", "mail_threads", "mail_messages", "mail_drafts", "mail_knowledge_answers", "mail_feedback", "mail_sync_runs"]

async function verifyRetainedSchema(db) {
  const tables = (await db.query("select relname, relrowsecurity from pg_class where relnamespace = 'public'::regnamespace and relkind = 'r'")).rows
  for (const name of retainedTables) assert.equal(tables.find((table) => table.relname === name)?.relrowsecurity, true, `${name} retains RLS`)
  assert.ok(tables.every((table) => !table.relname.startsWith("agent_")))
  const functions = (await db.query("select proname from pg_proc where pronamespace = 'public'::regnamespace")).rows
  assert.ok(functions.every((fn) => !fn.proname.includes("agent")))
  for (const table of ["lead_agent_runs", "mail_sync_runs"]) {
    const columns = (await db.query("select column_name from information_schema.columns where table_schema = 'public' and table_name = $1", [table])).rows
    assert.ok(columns.every((column) => column.column_name !== "agent_job_id"))
  }
  const account = (await db.query("insert into mail_accounts(email_address) values ('support@example.test') returning id")).rows[0].id
  const thread = (await db.query("insert into mail_threads(mail_account_id,subject_normalized,contact_email) values ($1,'Help','customer@example.test') returning id", [account])).rows[0].id
  const message = (await db.query("insert into mail_messages(thread_id,mail_account_id,direction,imap_folder,from_address,subject,text_body) values ($1,$2,'inbound','INBOX','customer@example.test','Help','Question') returning id", [thread, account])).rows[0].id
  const draft = (await db.query("insert into mail_drafts(thread_id,in_reply_to_message_id,provider_response_id,input_tokens,output_tokens,total_tokens) values ($1,$2,'response-fixture',5,7,12) returning id", [thread, message])).rows[0].id
  await db.query("update mail_drafts set status='ready',suggested_body='Reply' where id=$1", [draft])
  assert.equal((await db.query("select total_tokens from mail_drafts where id=$1", [draft])).rows[0].total_tokens, 12)
  await assert.rejects(db.query("update mail_drafts set input_tokens=-1 where id=$1", [draft]), /check constraint/)
  await db.query("insert into leads(company_name) values ('Company')")
  await db.query("insert into lead_agent_runs(run_key,trigger,requested_limit) values ('lead-cron:fixture','cron',5)")
  await assert.rejects(db.query("insert into lead_agent_runs(run_key,trigger,requested_limit) values ('lead-cron:fixture','cron',5)"), /unique constraint/)
}

test("init rebuilds the retained AI schema and its reset removes legacy agentteam objects", async () => {
  const db = await fixture()
  try {
    await db.exec("reset role")
    await verifyRetainedSchema(db)
    // Simulate legacy tables/RPCs so reset cleanup is tested against real objects.
    const tables = [...init.matchAll(/^drop table if exists public\.(agent_\w+) cascade;/gm)].map((match) => match[1])
    assert.equal(tables.length, 8)
    for (const name of tables) await db.exec(`create table public.${name}(id uuid primary key)`)
    const signatures = [...init.matchAll(/^drop function if exists (public\.[^;]+);/gm)].map((match) => match[1]).filter((signature) => signature.includes("agent"))
    assert.equal(signatures.length, 15)
    for (const signature of signatures) await db.exec(`create function ${signature} returns boolean language sql as $$ select true $$`)
    await db.exec(init.slice(0, init.indexOf("create or replace function public.set_updated_at()")) + "\ncommit;")
    const legacyTables = (await db.query("select relname from pg_class where relnamespace='public'::regnamespace and relname like 'agent_%'")).rows
    const legacyFunctions = (await db.query("select proname from pg_proc where pronamespace='public'::regnamespace and proname like '%agent%'")).rows
    assert.deepEqual(legacyTables, [])
    assert.deepEqual(legacyFunctions, [])
  } finally { await db.close() }
})

test("lead and mailbox migrations replay without the retired agentteam migration", async () => {
  assert.ok(!readdirSync("supabase/migrations").includes("20260822120000_agent_team_platform.sql"))
  const db = new PGlite()
  try {
    await db.exec(`
      create schema auth;
      create table auth.users(id uuid primary key);
      create function public.set_updated_at() returns trigger language plpgsql as $$ begin new.updated_at=now(); return new; end $$;
    `)
    for (const file of retainedMigrations) await db.exec(readFileSync(`supabase/migrations/${file}`, "utf8"))
    await verifyRetainedSchema(db)
  } finally { await db.close() }
})
