import assert from "node:assert/strict"
import fs from "node:fs"
import test from "node:test"
import ts from "typescript"
import { PGlite } from "@electric-sql/pglite"
const read = (file) => fs.readFileSync(file, "utf8")
function load(file) { const m = { exports: {} }; Function("module", "exports", ts.transpileModule(read(file), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText)(m, m.exports); return m.exports }
const shared = load("lib/reviews/shared.ts"), entitlements = load("lib/entitlements.ts")
test("Google links allow only supported HTTPS hosts and review routes", () => {
  for (const url of ["https://www.google.com/maps/place/Example", "https://maps.app.goo.gl/Abc123", "https://g.page/example/review", "https://search.google.com/local/reviews?placeid=abc", "https://google.nl/maps?cid=123"]) assert.ok(shared.googleReviewUrl(url), url)
  for (const url of ["javascript:alert(1)", "http://g.page/example", "https://g.page.evil.test/example", "https://g.page@evil.test/example", "https://evil.test/?url=https://g.page/example", "https://g.page:444/example", "https://www.google.com/search?q=test", "https://g.page/", "https://g.page/example/other"]) assert.equal(shared.googleReviewUrl(url), null, url)
})
test("collection follows the account's effective Gold plan", () => {
  assert.equal(shared.hasReviewCollectionAccess({ planId: "gold", source: "default_fallback", record: null }), true)
  for (const planId of ["bronze", "silver"]) assert.equal(shared.hasReviewCollectionAccess({ planId }), false)
  const sections = [{ id: "r", type: "testimonials", data: { reviewMode: "collection" } }]
  assert.equal(entitlements.inspectWebsiteEntitlements("silver", { sections }).allowed, false)
  assert.equal(entitlements.inspectWebsiteEntitlements("gold", { sections, hasReviewAccess: false }).allowed, false)
  assert.equal(entitlements.inspectWebsiteEntitlements("gold", { sections, hasReviewAccess: true }).allowed, true)
  assert.equal(entitlements.inspectWebsiteEntitlements("silver", { sections: [{ ...sections[0], data: { reviewMode: "google" } }] }).allowed, true)
})
test("submissions require consent, deliberate whole-star ratings, and bounded text", () => {
  const valid = { name: " Klant ", email: "A@EXAMPLE.COM", rating: 1, body: "Eerlijke ervaring met dit bedrijf.", consent: true }
  assert.deepEqual(shared.validateReview(valid), { display_name: "Klant", email: "a@example.com", rating: 1, body: valid.body })
  for (const override of [{ consent: false }, { rating: 0 }, { rating: 3.5 }, { rating: "5" }, { rating: 6 }, { email: "invalid" }, { body: "kort" }, { body: "x".repeat(3001) }, { name: "" }]) assert.throws(() => shared.validateReview({ ...valid, ...override }))
})

const owner = "00000000-0000-0000-0000-000000000001", other = "00000000-0000-0000-0000-000000000002"
const business = "10000000-0000-0000-0000-000000000001", business2 = "10000000-0000-0000-0000-000000000002"
const website = "20000000-0000-0000-0000-000000000001", website2 = "20000000-0000-0000-0000-000000000002"
const sectionId = "30000000-0000-0000-0000-000000000001"
test("review migration and database lifecycle enforce source, scope, consent and access", async (t) => {
  const db = new PGlite()
  const one = async (sql, params = []) => (await db.query(sql, params)).rows[0]
  const setMode = (mode) => db.query("update websites set live_snapshot = jsonb_build_object('sections', jsonb_build_array(jsonb_build_object('type','testimonials','data',jsonb_build_object('reviewMode',$1::text)))) where id=$2", [mode, website])
  let id
  try {
    await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
      create schema auth; create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.user_id',true),'')::uuid $$;
      create table businesses(id uuid primary key, user_id uuid);
      create table websites(id uuid primary key, business_id uuid, user_id uuid, title text, published boolean, live_snapshot jsonb);
      create table subscriptions(user_id uuid primary key, plan_id text, status text, current_period_end timestamptz);
      create table website_sections(id uuid primary key, website_id uuid, type text, content jsonb);
      create table website_section_translations(section_id uuid, website_id uuid, values jsonb);
      grant usage on schema public, auth to authenticated, anon, service_role;
      grant select,update,insert on websites,website_sections to authenticated;
      grant select on subscriptions to authenticated;
      insert into auth.users values('${owner}'),('${other}');
      insert into businesses values('${business}','${owner}'),('${business2}','${other}');
      insert into websites values('${website}','${business}','${owner}','Site',true,'{"sections":[{"type":"testimonials","data":{"items":[{"name":"Real customer","quote":"Preserve my words"}]}}],"locales":[{"sections":[{"type":"testimonials","data":{"items":[{"quote":"Translation"}]}}]}]}'),('${website2}','${business2}','${other}','Other',true,'{"sections":[]}');
      insert into subscriptions values('${owner}','gold','active',now()+interval '30 days'),('${other}','silver','active',now()+interval '30 days');
      insert into website_sections values('${sectionId}','${website}','testimonials','{"items":[{"name":"Real customer","quote":"Preserve my words"}]}');
      insert into website_section_translations values('${sectionId}','${website}','{"items":[{"quote":"Translation"}]}');`)
    const preflight = (await db.query(read("supabase/operations/reviews-preflight.sql"))).rows
    assert.equal(preflight.length,4)
    for (const report of preflight) { assert.equal(Number(report.total_items),1); assert.equal(Number(report.exact_known_examples),0); assert.equal(Number(report.other_items_to_preserve_privately),1) }
    await db.exec(read("supabase/migrations/20260910120000_review_collection.sql"))
    const repair = read("supabase/migrations/20260915120000_align_review_gold_access.sql")
    assert.ok(read("supabase/init.sql").replace(/\r\n/g, "\n").includes(repair.replace(/\r\n/g, "\n")))
    await db.exec(repair)
    await t.test("SQL Gold access matches the effective plan for every subscription state", async () => {
      for (const plan of ["bronze", "silver", "gold"]) {
        for (const status of ["active", "trial", "canceled", "past_due", "expired"]) {
          for (const period of [null, "2000-01-01", "2100-01-01"]) {
            await db.query("update subscriptions set plan_id=$1,status=$2,current_period_end=$3 where user_id=$4", [plan,status,period,other])
            const storedApplies = status === "active" || status === "trial" || (status === "canceled" && period === "2100-01-01")
            assert.equal((await one("select review_gold_access($1) as ok", [other])).ok, !storedApplies || plan === "gold", `${plan}/${status}/${period}`)
          }
        }
      }
      await db.query("delete from subscriptions where user_id=$1", [other])
      assert.equal((await one("select review_gold_access($1) as ok", [other])).ok, true)
      assert.equal((await one("select review_gold_access(null) as ok")).ok, false)
      assert.equal((await one("select review_gold_access('00000000-0000-0000-0000-000000000099') as ok")).ok, false)
      await db.query("insert into subscriptions values($1,'silver','active',now()+interval '30 days')", [other])
    })
    await t.test("archives originals and removes old items from drafts, translations and live locales", async () => {
      assert.equal((await one("select count(*)::int as count from review_legacy_archive")).count, 1)
      assert.match(JSON.stringify((await one("select sections from review_legacy_archive")).sections), /Preserve my words/)
      assert.equal((await one("select content ? 'items' as items from website_sections")).items, false)
      assert.equal((await one("select values ? 'items' as items from website_section_translations")).items, false)
      assert.doesNotMatch(JSON.stringify((await one("select live_snapshot from websites where id=$1", [website])).live_snapshot), /Preserve my words|Translation/)
    })
    await setMode("collection")
    await t.test("accepts only website/business matches and immutable original submissions", async () => {
      await assert.rejects(db.query("insert into customer_reviews(website_id,business_id,display_name,email,rating,body) values($1,$2,'A','a@x.test',5,'Original customer review')", [website,business2]), /Invalid review scope/)
      id = (await one("insert into customer_reviews(website_id,business_id,display_name,email,rating,body,confirmation_hash,confirmation_expires_at,withdrawal_hash,withdrawal_expires_at) values($1,$2,'Customer','a@x.test',1,'Original customer review','confirm',now()+interval '1 day','withdraw',now()+interval '1 year') returning id", [website,business])).id
      await assert.rejects(db.query("update customer_reviews set rating=5 where id=$1", [id]), /immutable/)
      await assert.rejects(db.query("insert into customer_reviews(website_id,business_id,display_name,email,rating,body) values($1,$2,'A','A@x.test',5,'Duplicate customer review')", [website,business]), /unique/)
    })
    await t.test("requires confirmation, prevents replay, and scopes owner moderation", async () => {
      assert.equal((await one("select moderate_customer_review($1,$2,$3,'published','Relevant review','unconfirmed') as ok",[id,website,owner])).ok,false)
      assert.equal((await one("select review_token_action('confirm','confirm') as ok")).ok,true)
      assert.equal((await one("select review_token_action('confirm','confirm') as ok")).ok,false)
      await assert.rejects(db.query("select moderate_customer_review($1,$2,$3,'published','Relevant review','pending')",[id,website,other]),/Website not found/)
      assert.equal((await one("select moderate_customer_review($1,$2,$3,'published','Relevant review','pending') as ok",[id,website2,other])).ok,false)
      assert.equal((await one("select moderate_customer_review($1,$2,$3,'published','Relevant review','pending') as ok",[id,website,owner])).ok,true)
      const rows = (await db.query("select * from public_customer_reviews($1,6)",[website])).rows
      assert.equal(rows.length,1); assert.equal(rows[0].rating,1)
      assert.deepEqual(Object.keys(rows[0]).sort(),["id","display_name","rating","body","created_at"].sort())
      assert.equal((await db.query("select * from public_customer_reviews($1,6)",[website2])).rows.length,0)
    })
    await t.test("effective downgrade and mode changes immediately suppress public reviews without changing stored content", async () => {
      await db.query("update subscriptions set plan_id='silver' where user_id=$1",[owner])
      assert.equal((await one("select review_collection_live($1) as ok",[website])).ok,false)
      assert.equal((await db.query("select * from public_customer_reviews($1,6)",[website])).rows.length,0)
      await assert.rejects(db.query("update website_sections set content='{\"reviewMode\":\"collection\"}' where id=$1",[sectionId]),/Gold/)
      await db.query("update websites set published=false where id=$1",[website])
      await assert.rejects(db.query("update websites set published=true where id=$1",[website]),/Gold/)
      await db.query("update subscriptions set plan_id='gold' where user_id=$1",[owner])
      await db.query("update websites set published=true where id=$1",[website])
      await setMode("google")
      assert.equal((await db.query("select * from public_customer_reviews($1,6)",[website])).rows.length,0)
      assert.equal((await one("select status from customer_reviews where id=$1",[id])).status,"published")
      await setMode("collection")
      assert.equal((await db.query("select * from public_customer_reviews($1,6)",[website])).rows.length,1)
    })
    await t.test("expired tokens and expired unconfirmed submissions never enter moderation", async () => {
      const expiredId = (await one("insert into customer_reviews(website_id,business_id,display_name,email,rating,body,confirmation_hash,confirmation_expires_at) values($1,$2,'Expired','expired@x.test',4,'An unconfirmed customer review','expired',now()-interval '1 second') returning id",[website,business])).id
      assert.equal((await one("select review_token_action('expired','confirm') as ok")).ok,false)
      await db.query("update customer_reviews set created_at=now()-interval '8 days',confirmation_expires_at=now()+interval '1 day' where id=$1",[expiredId])
      assert.equal((await one("select review_token_action('expired','confirm') as ok")).ok,false)
      await db.query("select expire_unconfirmed_reviews()")
      assert.equal((await one("select count(*)::int as n from customer_reviews where id=$1",[expiredId])).n,0)
    })
    await t.test("database guards reject Silver collection snapshots and unsafe Google URLs", async () => {
      await assert.rejects(db.query("insert into websites(id,business_id,user_id,published,live_snapshot) values('20000000-0000-0000-0000-000000000003',$1,$2,true,'{\"sections\":[{\"type\":\"testimonials\",\"data\":{\"reviewMode\":\"collection\"}}]}')",[business2,other]),/Gold/)
      await assert.rejects(db.query("update website_sections set content='{\"reviewMode\":\"google\",\"googleReviewUrl\":\"https://g.page.evil.test/x\"}' where id=$1",[sectionId]),/Google/)
      await assert.rejects(db.query("update website_sections set content='{\"items\":[{\"quote\":\"Forged review\"}]}' where id=$1",[sectionId]),/Manual/)
    })
    await t.test("withdrawal survives downgrade, immediately unpublishes, and cannot be replayed", async () => {
      await db.query("update subscriptions set plan_id='silver' where user_id=$1",[owner])
      assert.equal((await one("select review_token_action('withdraw','withdraw') as ok")).ok,true)
      assert.equal((await one("select review_token_action('withdraw','withdraw') as ok")).ok,false)
      assert.equal((await one("select status from customer_reviews where id=$1",[id])).status,"withdrawn")
      await assert.rejects(db.query("select moderate_customer_review($1,$2,$3,'published','Relevant review','withdrawn')",[id,website,owner]),/Gold/)
    })
    await t.test("authenticated clients cannot insert reviews, rewrite content, or invoke privileged RPCs", async () => {
      await db.exec(`set role authenticated; set test.user_id='${other}';`)
      assert.equal((await db.query("select id from customer_reviews")).rows.length,0)
      assert.equal((await db.query("select * from review_legacy_archive")).rows.length,0)
      await assert.rejects(db.query("update customer_reviews set rating=5"),/permission denied/)
      await assert.rejects(db.query("select review_token_action('withdraw','withdraw')"),/permission denied/)
      await db.exec("reset role; set role anon")
      await assert.rejects(db.query("select * from customer_reviews"),/permission denied/)
      await assert.rejects(db.query("select * from public_customer_reviews($1,6)",[website]),/permission denied/)
      await db.exec("reset role")
    })
    await t.test("owner deletion remains possible after downgrade and retains an audit event", async () => {
      assert.equal((await one("select moderate_customer_review($1,$2,$3,'delete','Customer removal request','withdrawn') as ok",[id,website,owner])).ok,true)
      assert.equal((await one("select count(*)::int as n from customer_reviews")).n,0)
      assert.equal((await one("select count(*)::int as n from review_events where action='delete'")).n,1)
    })
  } finally { await db.close() }
})
