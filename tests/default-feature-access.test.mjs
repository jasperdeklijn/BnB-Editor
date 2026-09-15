import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { PGlite } from "@electric-sql/pglite"

const read = (file) => readFileSync(file, "utf8").replace(/\r\n/g, "\n")
const migration = read("supabase/migrations/20260915140000_default_all_features.sql")

test("temporary access migration preserves billing and service ownership restrictions", async () => {
  const db = new PGlite()
  const owner = "00000000-0000-0000-0000-000000000001"
  const other = "00000000-0000-0000-0000-000000000002"
  try {
    assert.ok(read("supabase/init.sql").includes(migration))
    await db.exec(`
      create role anon; create role authenticated; create role service_role bypassrls;
      create schema auth;
      create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$
        select nullif(current_setting('test.user_id', true), '')::uuid
      $$;
      create table subscriptions(user_id uuid, plan_id text, booking_addon_active boolean, current_price numeric);
      create table services(id int primary key, user_id uuid, title text);
      alter table services enable row level security;
      grant usage on schema auth, public to authenticated;
      grant select, insert, update, delete on services to authenticated;
      create policy owner_only on services to authenticated
        using (user_id = auth.uid()) with check (user_id = auth.uid());
      insert into auth.users values ('${owner}'), ('${other}');
      insert into subscriptions values ('${owner}', 'bronze', false, 7.95);
      insert into services values (1, '${owner}', 'Own'), (2, '${other}', 'Other');
    `)
    const before = (await db.query("select * from subscriptions")).rows
    await db.exec(migration)
    await db.exec(migration)
    assert.deepEqual((await db.query("select * from subscriptions")).rows, before)
    await db.exec(`create policy entitled on services as restrictive to authenticated
      using (public.can_manage_services()) with check (public.can_manage_services());`)
    assert.equal((await db.query("select review_gold_access($1) as ok", [owner])).rows[0].ok, true)
    assert.equal((await db.query("select review_gold_access($1) as ok", [other])).rows[0].ok, true)
    assert.equal((await db.query("select review_gold_access(null) as ok")).rows[0].ok, false)
    assert.equal((await db.query("select review_gold_access('00000000-0000-0000-0000-000000000099') as ok")).rows[0].ok, false)
    await db.exec("set role authenticated")
    assert.equal((await db.query("select can_manage_services() as ok")).rows[0].ok, false)
    await db.exec(`set test.user_id='${owner}'`)
    assert.equal((await db.query("select can_manage_services() as ok")).rows[0].ok, true)
    assert.deepEqual((await db.query("update services set title='Edited' returning id")).rows, [{ id: 1 }])
    await assert.rejects(db.query("insert into services values (3, $1, 'Foreign')", [other]), /row-level security/)
    await assert.rejects(db.query("select review_gold_access($1)", [owner]), /permission denied/)
  } finally {
    await db.close()
  }
})
