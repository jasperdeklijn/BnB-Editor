import assert from "node:assert/strict"
import test from "node:test"
import { fixture, save, website, otherWebsite } from "./helpers/website-pages-fixture.mjs"

test("page overlays and redirects track revisions, reject foreign ownership and deny anonymous access", async () => {
  const db=await fixture()
  try {
    const page=await save(db,"about")
    const locale=(await db.query("select locale from website_locales where website_id=$1 limit 1",[website])).rows[0].locale
    const before=(await db.query("select draft_version from websites where id=$1",[website])).rows[0].draft_version
    await db.query("insert into website_page_translations(website_id,page_id,locale,title) values($1,$2,$3,'About')",[website,page.id,locale])
    await db.query("insert into website_page_redirects(website_id,from_slug,to_page_id) values($1,'old-about',$2)",[website,page.id])
    await db.query("update websites set live_snapshot=$1 where id=$2",[{version:3,pages:[{id:page.id,slug:"about"}]},website])
    await save(db,"team",website,page.id)
    assert.equal((await db.query("select to_page_id from website_page_redirects where website_id=$1 and from_slug='about'",[website])).rows[0].to_page_id,page.id)
    assert.equal((await db.query("select live_snapshot from websites where id=$1",[website])).rows[0].live_snapshot.pages[0].slug,"about")
    assert.notEqual((await db.query("select draft_version from websites where id=$1",[website])).rows[0].draft_version,before)
    await assert.rejects(db.query("insert into website_page_redirects(website_id,from_slug,to_page_id) values($1,'foreign',$2)",[otherWebsite,page.id]),/row-level security|foreign key/)
    await db.query("select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',false)")
    assert.equal((await db.query("select * from website_page_translations where website_id=$1",[website])).rows.length,0)
    assert.equal((await db.query("select * from website_page_redirects where website_id=$1",[website])).rows.length,0)
    await db.exec("reset role; set role anon")
    await assert.rejects(db.query("select * from website_page_translations"),/permission denied/)
    await assert.rejects(db.query("select move_website_section($1,$2,$3)",[website,page.id,page.id]),/permission denied/)
  } finally { await db.close() }
})

test("shared replacement is atomic and old page revisions cannot be promoted", async () => {
  const db=await fixture()
  try {
    const page=await save(db,"about")
    const old=(await db.query("insert into website_sections(website_id,type,scope,position) values($1,'nav','site_header',0) returning id",[website])).rows[0].id
    await assert.rejects(db.query("insert into website_sections(website_id,page_id,type,position) values($1,$2,'nav',1)",[website,page.id]),/gedeelde header/)
    await assert.rejects(db.query("select create_shared_website_section($1,'hero','{}')",[website]),/Ongeldig/)
    assert.equal((await db.query("select id from website_sections where id=$1",[old])).rows.length,1)
    const revision=(await db.query("select draft_version from websites where id=$1",[website])).rows[0].draft_version
    const candidate=(await db.query("select create_shared_website_section($1,'nav','{}') id",[website])).rows[0].id
    assert.equal((await db.query("select id from website_sections where id=$1",[old])).rows.length,0)
    assert.equal((await db.query("select scope from website_sections where id=$1",[candidate])).rows[0].scope,"site_header")
    const expectedSubscription=(await db.query("select updated_at from subscriptions where user_id=auth.uid()")).rows[0]?.updated_at ?? null
    const result=(await db.query("select promote_website_live_snapshot($1,$2,$3,'{}',now()) result",[website,revision,expectedSubscription])).rows[0].result
    assert.equal(result,"draft_changed")
  } finally { await db.close() }
})

test("page copies remap links, transitions, translations and form identities; moves retain identity", async () => {
  const db = await fixture()
  try {
    const page = await save(db,"about")
    const a = (await db.query("insert into website_sections(website_id,page_id,type,position,content) values($1,$2,'hero',1,'{}') returning id",[website,page.id])).rows[0].id
    const b = (await db.query("insert into website_sections(website_id,page_id,type,position,content) values($1,$2,'contact',2,'{}') returning id",[website,page.id])).rows[0].id
    await db.query("update website_sections set content=$1 where id=$2",[{ctaHref:`section:${page.id}:${b}`,formDestinationKey:a},a])
    await db.query("insert into section_transitions(website_id,from_section_id,to_section_id,transition) values($1,$2,$3,'{}')",[website,a,b])
    const copy = (await db.query("select duplicate_website_page($1,$2,'Copy','copy') page",[website,page.id])).rows[0].page
    assert.equal(copy.include_in_publication,false)
    const rows = (await db.query("select * from website_sections where page_id=$1 order by position",[copy.id])).rows
    assert.notEqual(rows[0].id,a)
    assert.equal(rows[0].content.ctaHref,`section:${copy.id}:${rows[1].id}`)
    assert.equal(rows[0].content.formDestinationKey,rows[0].id)
    await db.query("select move_website_section($1,$2,$3)",[website,b,copy.id])
    assert.equal((await db.query("select content from website_sections where id=$1",[a])).rows[0].content.ctaHref,`section:${copy.id}:${b}`)
    assert.equal((await db.query("select count(*)::int n from section_transitions where from_section_id=$1",[a])).rows[0].n,0)
    await assert.rejects(db.query("select duplicate_website_page($1,$2,'Foreign','foreign')",[otherWebsite,page.id]),/Website niet gevonden/)
  } finally { await db.close() }
})

test("Home replacement is atomic and preserves pages; malformed swaps roll back", async () => {
  const db = await fixture()
  try {
    const page = await save(db,"about")
    const home = (await db.query("select id from website_pages where website_id=$1 and is_home",[website])).rows[0].id
    await assert.rejects(db.query("select replace_website_home($1,$2,'en')",[website,page.id]))
    assert.equal((await db.query("select id from website_pages where website_id=$1 and is_home",[website])).rows[0].id,home)
    await db.query("select replace_website_home($1,$2,'previous-home')",[website,page.id])
    assert.equal((await db.query("select id from website_pages where website_id=$1 and is_home",[website])).rows[0].id,page.id)
    assert.equal((await db.query("select slug from website_pages where id=$1",[home])).rows[0].slug,"previous-home")
    await assert.rejects(db.query("delete from website_pages where id=$1",[page.id]),/startpagina/)
  } finally { await db.close() }
})

test("shared slots enforce section type and survive page deletion; scoped template restore preserves other pages", async () => {
  const db = await fixture()
  try {
    const page = await save(db,"about")
    await assert.rejects(db.query("insert into website_sections(website_id,scope,type,position) values($1,'site_header','hero',0)",[website]),/check constraint/)
    const header = (await db.query("insert into website_sections(website_id,scope,type,position) values($1,'site_header','nav',0) returning id",[website])).rows[0].id
    const section = (await db.query("insert into website_sections(website_id,page_id,type,position) values($1,$2,'hero',1) returning id",[website,page.id])).rows[0].id
    const checkpoint = (await db.query("select apply_page_template($1,$2,$3) checkpoint",[website,page.id,[{id:"section-template",type:"about",data:{title:"Template"}}]])).rows[0].checkpoint
    const bad={...checkpoint,sectionTranslations:[{section_id:header,locale:"nl-NL",values:{brandName:"Foreign"}}]}
    await assert.rejects(db.query("select restore_page_checkpoint($1,$2,$3)",[website,page.id,bad]),/buiten deze pagina/)
    assert.equal((await db.query("select content from website_sections where page_id=$1",[page.id])).rows[0].content.title,"Template")
    assert.equal((await db.query("select id from website_sections where id=$1",[header])).rows.length,1)
    await db.query("select restore_page_checkpoint($1,$2,$3)",[website,page.id,checkpoint])
    assert.equal((await db.query("select id from website_sections where page_id=$1",[page.id])).rows[0].id,section)
    await db.query("select delete_website_page($1,$2)",[website,page.id])
    assert.equal((await db.query("select id from website_sections where id=$1",[header])).rows.length,1)
  } finally { await db.close() }
})

test("multipage import is atomic and remaps the generated Home link without flattening", async () => {
  const db=await fixture()
  try {
    const id="00000000-0000-0000-0000-000000000081", home="00000000-0000-0000-0000-000000000082", about="00000000-0000-0000-0000-000000000083", section="00000000-0000-0000-0000-000000000084"
    const sections=[{id:section,pageId:about,scope:"page",type:"hero",data:{title:"About",ctaHref:`page:${home}`},styles:{}}]
    const pages=[{id:home,title:"Home",slug:"",isHome:true},{id:about,title:"About",slug:"about",isHome:false}]
    await db.query("select create_multipage_imported_design($1,'Imported','{}',$2,'[]',$3)",[id,sections,pages])
    const savedHome=(await db.query("select id from website_pages where website_id=$1 and is_home",[id])).rows[0].id
    const saved=(await db.query("select page_id,content from website_sections where id=$1",[section])).rows[0]
    assert.equal(saved.page_id,about); assert.equal(saved.content.ctaHref,`page:${savedHome}`)
    assert.equal((await db.query("select count(*)::int n from website_pages where website_id=$1",[id])).rows[0].n,2)
  } finally { await db.close() }
})
