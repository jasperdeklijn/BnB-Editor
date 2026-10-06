import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { PGlite } from "@electric-sql/pglite"
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto"

const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8")
const migration = read("supabase/migrations/20261004194421_multipage_draft_pages.sql")
const owner = "00000000-0000-0000-0000-000000000001"
const outsider = "00000000-0000-0000-0000-000000000002"
const website = "00000000-0000-0000-0000-000000000011"
const otherWebsite = "00000000-0000-0000-0000-000000000012"

async function fixture() {
  const db = new PGlite({ extensions: { pgcrypto } })
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    alter default privileges in schema public grant all on tables to authenticated,service_role;
    create schema auth;
    create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}');
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid
    $$;
    grant usage on schema auth to authenticated;
    create schema storage;
    create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid primary key,bucket_id text,name text);
    create function storage.foldername(text) returns text[] language sql immutable as $$ select string_to_array($1,'/') $$;
  `)
  await db.exec(read("supabase/init.sql"))
  await db.query(`insert into auth.users(id,email,raw_user_meta_data) values
    ($1,'owner@example.test','{"terms_accepted":true,"terms_version":"2026-09-17"}'),
    ($2,'other@example.test','{"terms_accepted":true,"terms_version":"2026-09-17"}')`, [owner, outsider])
  await db.query("insert into public.websites(id,user_id,slug) values ($1,$2,'owner-site'),($3,$4,'other-site')", [website,owner,otherWebsite,outsider])
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [owner])
  await db.exec("set role authenticated")
  return db
}

async function save(db, slug, site = website, id = null) {
  return (await db.query("select public.save_website_page($1,$2,$3,$4,true,false) as page", [site,id,slug,slug])).rows[0].page
}

test("new websites have one Home, and CRUD/order survive a separate read", async () => {
  const db = await fixture()
  try {
    const home = (await db.query("select * from website_pages where website_id=$1",[website])).rows[0]
    assert.equal(home.is_home,true)
    assert.equal(home.slug,"")
    assert.equal(home.include_in_publication,true)
    const before = (await db.query("select draft_version from websites where id=$1",[website])).rows[0].draft_version
    const about = await save(db,"about")
    const contact = await save(db,"contact")
    assert.notEqual((await db.query("select draft_version from websites where id=$1",[website])).rows[0].draft_version,before)
    await db.query("select reorder_website_pages($1,$2::uuid[])",[website,[home.id,contact.id,about.id]])
    assert.deepEqual((await db.query("select slug from website_pages where website_id=$1 order by position",[website])).rows.map(p=>p.slug),["","contact","about"])
    await save(db,"renamed",website,about.id)
    await db.query("select delete_website_page($1,$2)",[website,contact.id])
    assert.deepEqual((await db.query("select slug,position from website_pages where website_id=$1 order by position",[website])).rows,[{slug:"",position:0},{slug:"renamed",position:1}])
    await assert.rejects(db.query("select delete_website_page($1,$2)",[website,home.id]),/startpagina/)
    await assert.rejects(db.query("update website_pages set is_home=false where id=$1",[home.id]),/check constraint|startpagina/)
    await db.query("delete from websites where id=$1",[website])
    assert.equal((await db.query("select * from website_pages where website_id=$1",[website])).rows.length,0)
    await db.exec("reset role")
    assert.equal((await db.query("select count(*)::int as count from website_pages where website_id=$1",[otherWebsite])).rows[0].count,1)
  } finally { await db.close() }
})

test("RLS and RPCs reject foreign owners, invalid slugs and incomplete/repeated ordering", async () => {
  const db = await fixture()
  try {
    const home = (await db.query("select id from website_pages where website_id=$1",[website])).rows[0].id
    const page = await save(db,"about")
    assert.equal((await db.query("select * from website_pages where website_id=$1",[otherWebsite])).rows.length,0)
    await assert.rejects(save(db,"other",otherWebsite),/Website niet gevonden/)
    await assert.rejects(db.query("insert into website_pages(website_id,title,slug,position) values($1,'Other','other',1)",[otherWebsite]),/row-level security/)
    for (const slug of ["en","api","UP/invalid","about",""]) await assert.rejects(save(db,slug))
    for (const ids of [[home],[home,page.id,page.id],[page.id,home],[home,"00000000-0000-0000-0000-000000000099"]]) {
      await assert.rejects(db.query("select reorder_website_pages($1,$2::uuid[])",[website,ids]),/Ongeldige paginavolgorde/)
    }
    assert.deepEqual((await db.query("select slug from website_pages where website_id=$1 order by position",[website])).rows.map(p=>p.slug),["","about"])
    await db.exec("reset role; set role anon")
    await assert.rejects(db.query("select * from website_pages"),/permission denied/)
    await assert.rejects(db.query("select save_website_page($1,null,'x','x',true,false)",[website]),/permission denied/)
  } finally { await db.close() }
})

test("sections belong to their page; reordering/deleting one page leaves the other untouched", async () => {
  const db = await fixture()
  try {
    const home = (await db.query("select id from website_pages where website_id=$1",[website])).rows[0].id
    const page = await save(db,"about")
    const insert = async (pageId,position) => (await db.query("insert into website_sections(website_id,page_id,type,position) values($1,$2,'text', $3) returning id",[website,pageId,position])).rows[0].id
    const homeSection = await insert(null,1)
    assert.equal((await db.query("select page_id from website_sections where id=$1",[homeSection])).rows[0].page_id,home)
    const first = await insert(page.id,1)
    const second = await insert(page.id,2)
    await db.query("select reorder_page_sections($1,$2,$3::uuid[])",[website,page.id,[second,first]])
    assert.equal((await db.query("select position from website_sections where id=$1",[homeSection])).rows[0].position,1)
    await assert.rejects(db.query("select reorder_page_sections($1,$2,$3::uuid[])",[website,page.id,[second,homeSection]]),/Ongeldige sectievolgorde/)
    await db.exec("reset role")
    const foreignHome = (await db.query("select id from website_pages where website_id=$1",[otherWebsite])).rows[0].id
    await assert.rejects(insert(foreignHome,3),/foreign key/)
    await db.exec("set role authenticated")
    await assert.rejects(db.query("insert into section_transitions(website_id,from_section_id,to_section_id,transition) values($1,$2,$3,'{}')",[website,homeSection,first]),/dezelfde pagina/)
    await db.query("select delete_website_page($1,$2)",[website,page.id])
    assert.deepEqual((await db.query("select id from website_sections where website_id=$1",[website])).rows,[{id:homeSection}])
  } finally { await db.close() }
})

test("bootstrap mirrors the migration and migration refuses obsolete content", async () => {
  assert.ok(read("supabase/init.sql").includes(migration))
  const db = new PGlite()
  try {
    await db.exec("create table website_sections(id int); insert into website_sections values(1); create table websites(live_snapshot jsonb);")
    await assert.rejects(db.exec(migration),/verouderde website-inhoud/)
  } finally { await db.close() }
})

test("a structural edit is atomic, maps new IDs, and cannot delete another page's sections", async () => {
  const db = await fixture()
  try {
    const home = (await db.query("select id from website_pages where website_id=$1",[website])).rows[0].id
    const page = await save(db,"about")
    const structure = async (pageId, sections) => (await db.query("select save_page_structure($1,$2,$3::jsonb) as mapping",[website,pageId,JSON.stringify(sections)])).rows[0].mapping
    const a = {id:"section-one",type:"text",data:{text:"Home"},styles:{}}
    const b = {id:"section-two",type:"text",data:{text:"About"},styles:{}}
    const homeId = (await structure(home,[a]))[a.id]
    const aboutId = (await structure(page.id,[b]))[b.id]
    assert.equal((await structure(page.id,[b]))[b.id],aboutId,"retry after a lost response keeps the same database ID")
    assert.notEqual(homeId,aboutId)
    await assert.rejects(structure(page.id,[a,{...b,id:homeId}]),/hoort niet bij deze pagina/)
    assert.deepEqual((await db.query("select id,content from website_sections where page_id=$1",[page.id])).rows,[{id:aboutId,content:{text:"About"}}])
    await assert.rejects(structure(page.id,[b,b]),/Dubbele sectie/)
    await structure(page.id,[])
    assert.deepEqual((await db.query("select id from website_sections where website_id=$1",[website])).rows,[{id:homeId}])
    await db.query("select move_website_section($1,$2,$3)",[website,homeId,page.id])
    assert.equal((await db.query("select page_id from website_sections where id=$1",[homeId])).rows[0].page_id,page.id)
  } finally { await db.close() }
})

test("single-page template apply/restore cannot overwrite a multipage draft", async () => {
  const db = await fixture()
  try {
    await save(db,"about")
    await assert.rejects(db.query("select apply_template_transaction($1,null,'test','{}','[]','[]')",[website]),/meerdere pagina/)
    await assert.rejects(db.query("select restore_template_transaction($1,null,'{}')",[website]),/meerdere pagina/)
    assert.equal((await db.query("select count(*)::int as count from website_pages where website_id=$1",[website])).rows[0].count,2)
  } finally { await db.close() }
})
