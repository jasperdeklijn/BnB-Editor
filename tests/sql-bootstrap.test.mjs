import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { PGlite } from "@electric-sql/pglite"
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto"

const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8")
const repair = read("supabase/migrations/20260909130000_repair_rate_limit.sql")
const roles = "create role anon; create role authenticated; create role service_role bypassrls;"

// Minimal Supabase-owned objects: this validates application SQL, not live Auth/Storage behavior.
const supabaseFixture = `
  create schema auth;
  create table auth.users(id uuid primary key, email text, raw_user_meta_data jsonb default '{}');
  create function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;
  create schema storage;
  create table storage.buckets(id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
  create table storage.objects(id uuid primary key, bucket_id text, name text);
  create function storage.foldername(text) returns text[] language sql immutable as $$ select string_to_array($1, '/') $$;
`

async function checkWindow(db) {
  const key = "a".repeat(64)
  const call = async () => (await db.query("select * from public.check_rate_limit($1, 8, 900)", [key])).rows[0]
  await db.exec("set role service_role")
  let resetAt
  for (let attempt = 1; attempt <= 9; attempt++) {
    const result = await call()
    assert.equal(result.allowed, attempt <= 8)
    assert.equal(result.remaining, Math.max(0, 8 - attempt))
    if (attempt === 1) resetAt = result.reset_at
    assert.deepEqual(result.reset_at, resetAt)
  }
  await db.exec("reset role")
  await db.query("update public.rate_limit_buckets set reset_at = now() - interval '1 second' where key_hash = $1", [key])
  assert.equal((await call()).remaining, 7)
  for (const role of ["anon", "authenticated"]) {
    await db.exec(`set role ${role}`)
    await assert.rejects(call, /permission denied/)
    await assert.rejects(db.query("select * from public.rate_limit_buckets"), /permission denied/)
    await db.exec("reset role")
  }
}

test("full init.sql can rebuild an existing schema and the shared limiter works", async () => {
  const db = new PGlite({ extensions: { pgcrypto } })
  try {
    await db.exec(roles + supabaseFixture)
    await db.exec(read("supabase/init.sql"))
    const foreignKeys = async () => (await db.query(`
      select conrelid::regclass::text as table_name, conname, pg_get_constraintdef(oid) as definition
      from pg_constraint
      where contype = 'f' and connamespace = 'public'::regnamespace
      order by table_name, conname
    `)).rows
    const initialForeignKeys = await foreignKeys()
    await db.exec(read("supabase/init.sql"))
    assert.deepEqual(await foreignKeys(), initialForeignKeys, "rebuild must restore all foreign keys")
    await checkWindow(db)
    const before = (await db.query("select * from public.rate_limit_buckets")).rows
    await db.exec(repair)
    await db.exec(repair)
    assert.deepEqual((await db.query("select * from public.rate_limit_buckets")).rows, before)
    for (const file of ["supabase/init.sql", "supabase/migrations/20260908120000_pre_administration_readiness.sql"]) {
      const extract = (sql) => sql.match(/create or replace function public\.check_rate_limit\([\s\S]*?\$\$;/)[0]
      assert.equal(extract(read(file)), extract(repair))
    }
  } finally {
    await db.close()
  }
})

test("repair migration also installs a missing limiter without rebuilding application tables", async () => {
  const db = new PGlite()
  try {
    await db.exec(roles + "create table public.existing_data (value text); insert into public.existing_data values ('preserved');")
    await db.exec(repair)
    assert.deepEqual((await db.query("select value from public.existing_data")).rows, [{ value: "preserved" }])
    await checkWindow(db)
  } finally {
    await db.close()
  }
})
