import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { PGlite } from "@electric-sql/pglite"

const read = (file) => readFileSync(file, "utf8").replace(/\r\n/g, "\n")
const migration = read("supabase/migrations/20260915160000_link_published_website_business.sql")
const owner = "00000000-0000-0000-0000-000000000001"
const other = "00000000-0000-0000-0000-000000000002"
const business = "10000000-0000-0000-0000-000000000001"
const foreignBusiness = "10000000-0000-0000-0000-000000000002"
const website = "20000000-0000-0000-0000-000000000001"

test("published collection with a snapshot business is repaired without crossing owners", async () => {
  const db = new PGlite()
  const snapshot = (id) => ({ website: { businessId: id }, sections: [{ type: "testimonials", data: { reviewMode: "collection" } }] })
  const one = async (sql, args = []) => (await db.query(sql, args)).rows[0]
  try {
    assert.ok(read("supabase/init.sql").includes(migration))
    await db.exec(`
      create table businesses(id uuid primary key, user_id uuid);
      create table websites(id uuid primary key, user_id uuid, business_id uuid, published boolean, live_snapshot jsonb);
      create function public.review_gold_access(uuid) returns boolean language sql as $$ select true $$;
      insert into businesses values ('${business}', '${owner}'), ('${foreignBusiness}', '${other}');
    `)
    const collection = read("supabase/migrations/20260910120000_review_collection.sql")
      .match(/create or replace function public\.review_collection_live\([\s\S]*?\$\$;/)[0]
    await db.exec(collection)
    await db.query("insert into websites values ($1,$2,null,true,$3)", [website, owner, snapshot(business)])
    assert.equal((await one("select review_collection_live($1) as ok", [website])).ok, false, "reproduce live failure despite published collection mode")
    const before = (await one("select live_snapshot from websites where id=$1", [website])).live_snapshot
    await db.exec(migration)
    await db.exec(migration)
    assert.equal((await one("select review_collection_live($1) as ok", [website])).ok, true)
    assert.deepEqual((await one("select live_snapshot from websites where id=$1", [website])).live_snapshot, before)

    // Future publishing links the snapshot business, including authenticated writes.
    await db.exec(`create role authenticated; grant usage on schema public to authenticated;
      grant select on businesses to authenticated; grant select,update on websites to authenticated;`)
    await db.query("update websites set business_id=null where id=$1", [website])
    await db.exec("set role authenticated")
    await db.query("update websites set live_snapshot=$2 where id=$1", [website, snapshot(business)])
    assert.equal((await one("select business_id from websites where id=$1", [website])).business_id, business)
    await db.exec("reset role")

    for (const invalid of [foreignBusiness, "malformed", null]) {
      await db.query("update websites set business_id=null where id=$1", [website])
      await db.query("update websites set live_snapshot=$2 where id=$1", [website, snapshot(invalid)])
      await db.exec(migration)
      assert.equal((await one("select business_id from websites where id=$1", [website])).business_id, null)
      assert.equal((await one("select review_collection_live($1) as ok", [website])).ok, false)
    }
    await db.query("update websites set business_id=$2,live_snapshot=$3 where id=$1", [website, business, snapshot(foreignBusiness)])
    await db.exec(migration)
    assert.equal((await one("select business_id from websites where id=$1", [website])).business_id, business, "preserve explicit links")
  } finally { await db.close() }
})
