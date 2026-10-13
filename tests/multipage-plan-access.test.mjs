import assert from "node:assert/strict"
import test from "node:test"
import { readFileSync } from "node:fs"
import { fixture, save, website, otherWebsite } from "./helpers/website-pages-fixture.mjs"
const owner = "00000000-0000-0000-0000-000000000001"
async function setPlan(db,plan) {
  await db.exec("reset role")
  await db.query("insert into subscriptions(user_id,plan_id) values($1,$2) on conflict(user_id) do update set plan_id=excluded.plan_id",[owner,plan])
  await db.exec("set role authenticated")
}
test("3/10/unlimited quotas guard publications and activations while drafts and downgrades are preserved",async()=>{
  const db=await fixture({temporaryGoldAccess:false})
  try {
    const migration=readFileSync("supabase/migrations/20261013131134_pricing_visitor_analytics.sql","utf8")
    assert.ok(readFileSync("supabase/init.sql","utf8").includes(migration))
    const home=(await db.query("select id from website_pages where website_id=$1 and is_home",[website])).rows[0].id
    await setPlan(db,"bronze")
    const page=await save(db,"about")
    await db.query("select duplicate_website_page($1,$2,'Copy','copy')",[website,home])
    await db.query("insert into website_pages(website_id,title,slug,position) values($1,'Extra','extra',3)",[website])
    assert.equal((await db.query("select count(*) from website_pages where website_id=$1",[website])).rows[0].count,4)
    const snapshot=n=>({version:3,pages:Array.from({length:n},(_,i)=>({id:i?`page-${i}`:home}))})
    for(const [plan,limit] of [["bronze",3],["silver",10]]){
      await setPlan(db,plan)
      await db.query("update websites set published=true,live_snapshot=$1 where id=$2",[snapshot(limit),website])
      await assert.rejects(db.query("update websites set live_snapshot=$1 where id=$2",[snapshot(limit+1),website]),/PUBLISHED_PAGE_LIMIT/)
      assert.equal((await db.query("select live_snapshot from websites where id=$1",[website])).rows[0].live_snapshot.pages.length,limit)
    }
    await setPlan(db,"gold")
    await db.query("update websites set live_snapshot=$1 where id=$2",[snapshot(1000),website])
    await setPlan(db,"bronze")
    assert.equal((await db.query("select live_snapshot from websites where id=$1",[website])).rows[0].live_snapshot.pages.length,1000)
    await save(db,"renamed",website,page.id)
    await db.query("update websites set title='After downgrade' where id=$1",[website])
    await db.query("update websites set published=false where id=$1",[website])
    await assert.rejects(db.query("update websites set published=true where id=$1",[website]),/PUBLISHED_PAGE_LIMIT/)
    await db.query("update websites set published=true,live_snapshot=$1 where id=$2",[snapshot(3),website])
    await assert.rejects(save(db,"foreign",otherWebsite),/Website niet gevonden/)
    await db.exec("reset role; set role anon")
    await assert.rejects(db.query("select enforce_website_page_plan()"),/permission denied/)
  } finally{await db.close()}
})
test("Bronze can import a multipage draft without consuming publication quota",async()=>{
  const db=await fixture()
  try{
    await setPlan(db,"bronze")
    const id="00000000-0000-0000-0000-000000000088",home="00000000-0000-0000-0000-000000000089",about="00000000-0000-0000-0000-000000000090",section="00000000-0000-0000-0000-000000000091"
    const pages=[{id:home,title:"Home",slug:"",isHome:true},{id:about,title:"About",slug:"about",isHome:false}]
    const sections=[{id:section,pageId:about,scope:"page",type:"hero",data:{title:"About"},styles:{}}]
    await db.query("select create_multipage_imported_design($1,'Imported','{}',$2,'[]',$3)",[id,sections,pages])
    assert.equal((await db.query("select published from websites where id=$1",[id])).rows[0].published,false)
  }finally{await db.close()}
})
