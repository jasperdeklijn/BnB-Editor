import assert from "node:assert/strict"
import test from "node:test"
import { readFileSync } from "node:fs"
import { fixture, save, website, otherWebsite } from "./helpers/website-pages-fixture.mjs"

const owner = "00000000-0000-0000-0000-000000000001"
const outsider = "00000000-0000-0000-0000-000000000002"
const read = file => readFileSync(new URL(`../${file}`, import.meta.url), "utf8").replace(/\r\n/g, "\n")

test("temporary database Gold covers missing and inactive subscriptions without changing billing or ownership", async () => {
  const db = await fixture()
  try {
    assert.equal((await db.query("select temporary_gold_access_enabled() as enabled")).rows[0].enabled, true)
    const home = (await db.query("select id from website_pages where website_id=$1 and is_home", [website])).rows[0].id
    const pages = [home]
    for (let i = 1; i < 12; i++) pages.push((await save(db, `extra-${i}`)).id)
    const variants = [null, ...["bronze", "silver", "gold"].flatMap(plan => ["active", "trial", "canceled", "expired", "past_due"].map(status => ({plan, status})))]
    for (const variant of variants) {
      await db.exec("reset role")
      if (variant) await db.query(`insert into subscriptions(user_id,plan_id,status,booking_addon_active,multilingual_addon_active,current_price,current_period_end)
        values($1,$2,$3,false,false,14.95,'2020-01-01') on conflict(user_id) do update
        set plan_id=excluded.plan_id,status=excluded.status,current_period_end=excluded.current_period_end`, [owner, variant.plan, variant.status])
      const storedBefore = (await db.query("select * from subscriptions where user_id=$1", [owner])).rows
      await db.exec("set role authenticated")
      await db.query("update websites set published=true,live_snapshot=$1,seo=$2,analytics=$3 where id=$4", [
        {version:3, pages:pages.map(id=>({id}))}, {title:"SEO",ogImage:"https://example.test/photo.jpg"}, {firstPartyEnabled:false,measurementId:"G-TESTING"}, website,
      ])
      await db.query("update website_pages set seo=$1 where id=$2", [{canonicalUrl:"https://example.test/page"},home])
      const report = (await db.query("select website_analytics_report($1,current_date-365,current_date) as report", [website])).rows[0].report
      assert.equal(report.plan, "gold")
      assert.equal(report.booking, true)
      assert.equal(report.enabled, false) // Access does not enable tracking.
      assert.deepEqual(report.pages, [])
      assert.deepEqual(report.conversions, {contact:0,booking:0})
      assert.equal((Date.parse(report.to)-Date.parse(report.from))/86400000,365)
      assert.equal((await db.query("select can_manage_services() as allowed")).rows[0].allowed,true)
      await db.exec("reset role")
      assert.equal((await db.query("select review_gold_access($1) as allowed",[owner])).rows[0].allowed,true)
      assert.deepEqual((await db.query("select * from subscriptions where user_id=$1",[owner])).rows,storedBefore)
      assert.equal((await db.query("select live_snapshot from websites where id=$1",[website])).rows[0].live_snapshot.pages.length,12)
    }
    assert.equal((await db.query("select review_gold_access(null) as allowed")).rows[0].allowed,false)
    await db.exec("set role authenticated")
    const business = (await db.query("insert into businesses(user_id,name) values($1,'Owner') returning id",[owner])).rows[0].id
    await db.query("insert into services(business_id,title) values($1,'Temporary access')",[business])
    await assert.rejects(db.query("select review_gold_access($1)",[owner]),/permission denied/)
    await assert.rejects(db.query("select * from website_analytics_daily"),/permission denied/)
    await assert.rejects(db.query("select website_analytics_report($1)",[otherWebsite]),/Website niet gevonden/)
    await db.query("select set_config('request.jwt.claim.sub',$1,false)",[outsider])
    await assert.rejects(db.query("insert into services(business_id,title) values($1,'Foreign')",[business]),/row-level security/)
    await assert.rejects(db.query("select website_analytics_report($1)",[website]),/Website niet gevonden/)
    await db.exec("reset role; set role anon")
    await assert.rejects(db.query("select website_analytics_report($1)",[website]),/permission denied/)
    await assert.rejects(db.query("select can_manage_services()"),/permission denied/)
    assert.ok(read("supabase/init.sql").includes(read("supabase/migrations/20261013171556_restore_temporary_gold_access.sql").trim()))
  } finally { await db.close() }
})

test("temporary conversion access includes Booking while retaining consent and real backend-success checks", async () => {
  const db = await fixture()
  try {
    await db.query("update websites set published=true,analytics='{\"firstPartyEnabled\":true}' where id=$1",[website])
    const business = (await db.query("insert into businesses(user_id,name) values($1,'Owner') returning id",[owner])).rows[0].id
    const contact = (await db.query("insert into contact_requests(website_id,business_id,user_id,request_type,name,email) values($1,$2,$3,'contact','Test','test@example.test') returning id",[website,business,owner])).rows[0].id
    await db.exec("reset role")
    const entry = (await db.query("insert into calendar_entries(business_id,contact_request_id,entry_type,status,source,title,start_at,end_at) values($1,$2,'booking','confirmed','website_form','Test',now()+interval '1 day',now()+interval '2 days') returning id",[business,contact])).rows[0].id
    await db.query("select record_website_conversion($1,'contact',$2)",[website,otherWebsite]) // Not a real success.
    for (let i=0;i<2;i++) {
      await db.query("select record_website_conversion($1,'contact',$2)",[website,contact])
      await db.query("select record_website_conversion($1,'booking',$2)",[website,entry])
    }
    await db.exec("set role authenticated")
    const report = async () => (await db.query("select website_analytics_report($1) as report",[website])).rows[0].report
    assert.deepEqual((await report()).conversions,{contact:1,booking:1})
    await db.query("update websites set analytics='{\"firstPartyEnabled\":false}' where id=$1",[website])
    await db.exec("reset role")
    const next = (await db.query("insert into contact_requests(website_id,business_id,user_id,request_type,name,email) values($1,$2,$3,'contact','Test','test@example.test') returning id",[website,business,owner])).rows[0].id
    await db.query("select record_website_conversion($1,'contact',$2)",[website,next])
    await db.exec("set role authenticated")
    assert.deepEqual((await report()).conversions,{contact:1,booking:1})
    await assert.rejects(db.query("select record_website_conversion($1,'contact',$2)",[website,next]),/permission denied/)
  } finally { await db.close() }
})
