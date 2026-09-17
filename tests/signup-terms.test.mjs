import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import ts from "typescript"
import { PGlite } from "@electric-sql/pglite"

const read = (path) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const migration = read("supabase/migrations/20260917120000_signup_terms_acceptance.sql")
function load(file, dependencies = {}) {
  const { outputText } = ts.transpileModule(read(file), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  })
  const module = { exports: {} }
  Function("module", "exports", "require", outputText)(module, module.exports, (key) => {
    if (!(key in dependencies)) throw new Error(`Unexpected import: ${key}`)
    return dependencies[key]
  })
  return module.exports
}
const { TERMS_VERSION, TERMS_DOWNLOAD_PATH } = load("lib/legal/terms-version.ts")
const owner = "00000000-0000-0000-0000-000000000001"
const other = "00000000-0000-0000-0000-000000000002"
const legacy = "00000000-0000-0000-0000-000000000003"
const valid = { terms_accepted: true, terms_version: TERMS_VERSION }

test("signup records server-timed consent atomically and protects it from metadata edits and other users", async () => {
  const db = new PGlite()
  try {
    await db.exec(`
      create role anon; create role authenticated; create role service_role bypassrls;
      create schema auth;
      create table auth.users(id uuid primary key, raw_user_meta_data jsonb default '{}');
      create function auth.uid() returns uuid language sql stable as $$
        select nullif(current_setting('test.user_id', true), '')::uuid
      $$;
      grant usage on schema public, auth to anon, authenticated, service_role;
      insert into auth.users(id) values ('${legacy}');
    `)
    await db.exec(migration)
    await db.exec(migration)
    assert.deepEqual((await db.query("select * from public.user_terms_acceptances")).rows, [])
    for (const metadata of [null, {}, { ...valid, terms_accepted: false }, { ...valid, terms_accepted: "true" }, { ...valid, terms_version: "old" }]) {
      await assert.rejects(db.query("insert into auth.users values ($1, $2)", [owner, metadata]), /terms_acceptance_required/)
      assert.equal((await db.query("select count(*)::int as n from auth.users where id = $1", [owner])).rows[0].n, 0)
    }
    const before = Date.now()
    await db.query("insert into auth.users values ($1, $2)", [owner, { ...valid, terms_accepted_at: "2000-01-01" }])
    const record = (await db.query("select * from public.user_terms_acceptances where user_id = $1", [owner])).rows[0]
    assert.equal(record.terms_version, TERMS_VERSION)
    assert.equal(record.source, "signup")
    assert.ok(new Date(record.accepted_at).getTime() >= before)
    assert.ok(new Date(record.accepted_at).getTime() <= Date.now())
    await db.query("update auth.users set raw_user_meta_data = '{}' where id = $1", [owner])
    await db.exec(migration)
    assert.deepEqual((await db.query("select * from public.user_terms_acceptances where user_id = $1", [owner])).rows[0], record)
    await db.query("insert into auth.users values ($1, $2)", [other, valid])

    await db.exec(`set role authenticated; set test.user_id = '${owner}';`)
    assert.deepEqual((await db.query("select user_id from public.user_terms_acceptances")).rows, [{ user_id: owner }])
    await assert.rejects(db.query("update public.user_terms_acceptances set terms_version = 'fake'"), /permission denied/)
    await assert.rejects(db.query("delete from public.user_terms_acceptances"), /permission denied/)
    await assert.rejects(db.query("insert into public.user_terms_acceptances(user_id, terms_version) values ($1, 'fake')", [legacy]), /permission denied/)
    await db.exec("reset role; set role anon;")
    await assert.rejects(db.query("select * from public.user_terms_acceptances"), /permission denied/)
    await db.exec("reset role;")
    await db.query("delete from auth.users where id = $1", [owner])
    assert.equal((await db.query("select count(*)::int as n from public.user_terms_acceptances where user_id = $1", [owner])).rows[0].n, 0)
  } finally {
    await db.close()
  }
})

test("published download exactly matches displayed terms and bootstrap matches the migration", () => {
  const platform = load("lib/platform.ts")
  const { termsDocument } = load("lib/legal/terms.ts", { "@/lib/platform": platform })
  const { renderTermsDownload } = load("lib/legal/terms-download.ts")
  assert.equal(read(`public${TERMS_DOWNLOAD_PATH}`), renderTermsDownload(termsDocument, TERMS_VERSION))
  assert.ok(read("supabase/init.sql").includes(migration))
})
