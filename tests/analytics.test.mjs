import assert from "node:assert/strict"
import test from "node:test"
import { createRequire } from "node:module"
import { fixture,website,otherWebsite } from "./helpers/website-pages-fixture.mjs"
const load=createRequire(import.meta.url)("../scripts/load-import-module.cjs")
const {referrerCategory,deviceCategory,isAnalyticsBot}=load("lib/analytics/shared.ts")
const {createTrackingToken,verifyTrackingToken,analyticsRequestMatches,dailyAnalyticsHash}=load("lib/analytics/server.ts")
const owner="00000000-0000-0000-0000-000000000001"
const outsider="00000000-0000-0000-0000-000000000002"
async function admin(db){await db.exec("reset role")}
async function asOwner(db){await db.exec("set role authenticated")}
async function plan(db,value,booking=false){await admin(db);await db.query("insert into subscriptions(user_id,plan_id,booking_addon_active) values($1,$2,$3) on conflict(user_id) do update set plan_id=excluded.plan_id,booking_addon_active=excluded.booking_addon_active",[owner,value,booking]);await asOwner(db)}
async function report(db,site=website){return(await db.query("select website_analytics_report($1) as report",[site])).rows[0].report}
test("signed public-page requests reject tampering, bots, wrong tenant/domain/path, DNT and GPC",()=>{
  process.env.ANALYTICS_SIGNING_SECRET="test-secret-with-more-than-thirty-two-characters"
  const token=createTrackingToken({websiteId:website,pageId:otherWebsite,host:"customer.example",path:"/about"})
  assert.ok(verifyTrackingToken(token));assert.equal(verifyTrackingToken(token+'x'),null)
  const request=(changes={})=>new Request('https://customer.example/api/analytics/visit',{headers:{origin:'https://customer.example',referer:'https://customer.example/about', 'user-agent':'Mozilla/5.0',...changes}})
  assert.equal(analyticsRequestMatches(request(),verifyTrackingToken(token)),true)
  for(const headers of [{origin:'https://other.example'},{referer:'https://customer.example/editor'},{'user-agent':'Googlebot'},{dnt:'1'},{'sec-gpc':'1'}]) assert.equal(analyticsRequestMatches(request(headers),verifyTrackingToken(token)),false)
  assert.notEqual(dailyAnalyticsHash(website,'session','2026-10-13'),dailyAnalyticsHash(otherWebsite,'session','2026-10-13'))
  assert.notEqual(dailyAnalyticsHash(website,'session','2026-10-13'),dailyAnalyticsHash(website,'session','2026-10-14'))
  assert.equal(referrerCategory('https://google.nl/search?q=sensitive','customer.example'),'search')
  assert.equal(referrerCategory('https://notgoogle.com/?private=x','customer.example'),'referral')
  assert.equal(referrerCategory('https://m.facebook.com/private?token=x','customer.example'),'social')
  assert.equal(referrerCategory('https://customer.example/private','customer.example'),'direct')
  assert.equal(deviceCategory('Mozilla iPad'),'tablet');assert.equal(deviceCategory('Mozilla iPhone Mobile'),'mobile');assert.equal(deviceCategory('Mozilla desktop'),'desktop')
  assert.equal(isAnalyticsBot('Mozilla HeadlessChrome'),true);assert.equal(isAnalyticsBot('Mozilla Chrome'),false)
})
test("daily aggregates deduplicate batches, enforce plan reporting, RLS and deletion",async()=>{
  const db=await fixture({temporaryGoldAccess:false})
  try{
    const home=(await db.query("select id from website_pages where website_id=$1 and is_home",[website])).rows[0].id
    await plan(db,'bronze')
    await db.query("update websites set published=true,analytics='{\"firstPartyEnabled\":true}',live_snapshot=$1 where id=$2",[{pages:[{id:home}]},website])
    const event=[{id:'a'.repeat(64),source:'search'}],visitor='b'.repeat(64)
    await assert.rejects(db.query("select ingest_website_analytics($1,$2,$3,'mobile',$4)",[website,home,visitor,event]),/permission denied/)
    await admin(db)
    for(let i=0;i<2;i++) await db.query("select ingest_website_analytics($1,$2,$3,'mobile',$4)",[website,home,visitor,event])
    await db.query("select ingest_website_analytics($1,$2,$3,'mobile',$4)",[website,home,visitor,[{id:'c'.repeat(64),source:'social'}]])
    await db.query("select ingest_website_analytics($1,$2,$3,'desktop',$4)",[website,home,'d'.repeat(64),[{id:'e'.repeat(64),source:'referral'}]])
    await db.query("select ingest_website_analytics($1,$2,$3,'mobile',$4)",[website,otherWebsite,visitor,event]) // not a public page
    await asOwner(db)
    const basic=await report(db);assert.equal(basic.views,2);assert.equal(basic.visitors,2);assert.equal(basic.pages,undefined);assert.equal(basic.conversions,undefined)
    await assert.rejects(db.query("select * from website_analytics_daily"),/permission denied/)
    await assert.rejects(report(db,otherWebsite),/Website niet gevonden/)
    await plan(db,'silver')
    const detailed=await report(db);assert.equal(detailed.pages[0].views,2);assert.equal(detailed.sources.length,2);assert.equal(detailed.devices.length,2);assert.equal(detailed.trend[0].visitors,2);assert.equal(detailed.conversions,undefined)
    const bounded=(await db.query("select website_analytics_report($1,current_date-365,current_date) as r",[website])).rows[0].r
    assert.equal((Date.parse(bounded.to)-Date.parse(bounded.from))/86400000,89)
    await db.query("update websites set analytics='{\"firstPartyEnabled\":false}' where id=$1",[website])
    await admin(db)
    await db.query("select ingest_website_analytics($1,$2,$3,'mobile',$4)",[website,home,'f'.repeat(64),[{id:'f'.repeat(64),source:'direct'}]])
    await db.query("select set_config('request.jwt.claim.sub',$1,false)",[outsider]);await asOwner(db)
    await assert.rejects(report(db),/Website niet gevonden/)
    await admin(db)
    await db.exec("grant select on website_analytics_daily to authenticated") // policy remains protective after accidental future grants
    await asOwner(db)
    assert.equal((await db.query("select * from website_analytics_daily where website_id=$1",[website])).rows.length,0)
    await admin(db)
    await db.exec("set role anon")
    await assert.rejects(report(db),/permission denied/)
    await assert.rejects(db.query("select record_website_conversion($1,'contact',$2)",[website,home]),/permission denied/)
    await admin(db)
    await db.query("delete from websites where id=$1",[website])
    assert.equal((await db.query("select count(*) as n from website_analytics_daily where website_id=$1",[website])).rows[0].n,0)
    assert.equal((await db.query("select count(*) as n from analytics_private.seen where website_id=$1",[website])).rows[0].n,0)
  }finally{await db.close()}
})
test("conversion successes validate backend rows, count once and require an active Booking add-on",async()=>{
  const db=await fixture({temporaryGoldAccess:false})
  try{
    await plan(db,'gold',false)
    await db.query("update websites set published=true,analytics='{\"firstPartyEnabled\":true}' where id=$1",[website])
    await admin(db)
    const business=(await db.query("insert into businesses(user_id,name) values($1,'Test') returning id",[owner])).rows[0].id
    const contact=(await db.query("insert into contact_requests(website_id,business_id,user_id,request_type,name,email) values($1,$2,$3,'contact','Test','test@example.test') returning id",[website,business,owner])).rows[0].id
    await db.query("select record_website_conversion($1,'contact',$2)",[website,otherWebsite]) // fabricated success
    for(let i=0;i<2;i++) await db.query("select record_website_conversion($1,'contact',$2)",[website,contact])
    const entry=(await db.query("insert into calendar_entries(business_id,contact_request_id,entry_type,status,source,title,start_at,end_at) values($1,$2,'booking','pending','website_form','Test',now()+interval '1 day',now()+interval '2 days') returning id",[business,contact])).rows[0].id
    await db.query("select record_website_conversion($1,'booking',$2)",[website,entry])
    await asOwner(db)
    let r=await report(db);assert.equal(r.conversions.contact,1);assert.equal(r.conversions.booking,null)
    await plan(db,'gold',true)
    await admin(db)
    await db.query("select record_website_conversion($1,'booking',$2)",[website,entry])
    await asOwner(db)
    assert.equal((await report(db)).conversions.booking,0)
    await admin(db)
    await db.query("update calendar_entries set status='confirmed' where id=$1",[entry])
    await db.query("select record_website_conversion($1,'booking',$2)",[website,entry])
    await asOwner(db)
    r=await report(db);assert.equal(r.conversions.booking,1)
    await plan(db,'silver',true);assert.equal((await report(db)).conversions,undefined)
    await plan(db,'bronze',true)
    assert.equal((await db.query("select can_manage_services() as ok")).rows[0].ok,true)
    await plan(db,'bronze',false)
    assert.equal((await db.query("select can_manage_services() as ok")).rows[0].ok,false)
    await admin(db)
    assert.equal((await db.query("select review_gold_access($1) as ok",[owner])).rows[0].ok,false)
    await db.query("update subscriptions set plan_id='gold',status='expired',booking_addon_active=true where user_id=$1",[owner])
    await asOwner(db)
    assert.equal((await report(db)).plan,'bronze')
    assert.equal((await db.query("select can_manage_services() as ok")).rows[0].ok,false)
    await plan(db,'bronze',false)
    // restore active status for the SEO enforcement checks
    await admin(db);await db.query("update subscriptions set status='active' where user_id=$1",[owner]);await asOwner(db)
    await db.query("update websites set seo='{\"title\":\"Basic\",\"description\":\"All plans\"}' where id=$1",[website])
    await assert.rejects(db.query("update websites set seo='{\"ogImage\":\"https://example.test/og.png\"}' where id=$1",[website]),/vereisen Silver/)
    await assert.rejects(db.query("update websites set analytics='{\"measurementId\":\"G-TESTING\"}' where id=$1",[website]),/vereisen Silver/)
  }finally{await db.close()}
})
