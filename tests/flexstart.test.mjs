import assert from "node:assert/strict"
import test from "node:test"
import { readFileSync } from "node:fs"
import { createRequire } from "node:module"
import { randomUUID } from "node:crypto"
import { PGlite } from "@electric-sql/pglite"
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto"
const require = createRequire(import.meta.url)
const load = require("../scripts/load-import-module.cjs")
const { runFlexCheck } = load("lib/flexstart/check.ts")
const { transferSchema, isSourceUrl } = load("lib/flexstart/shared.ts")
const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8")

test("intake requires permission and public web URL; rejects owner/status injection", () => {
  const input = { id: randomUUID(), source_url: "https://example.com", business_name: "Bedrijf", business_type: "coach", services: "Coaching", city: "Utrecht", service_area: "Utrecht", primary_goal: "requests", appearance: "", preferred_colors: "", preserve_notes: "", customer_notes: "", logo_image_id: null, permission: true }
  assert.ok(transferSchema.safeParse(input).success)
  for (const value of [{ ...input, permission: false }, { ...input, status: "approved" }, { ...input, user_id: randomUUID() }]) assert.equal(transferSchema.safeParse(value).success, false)
  for (const url of ["javascript:alert(1)", "https://user:pass@example.com", "http://127.0.0.1", "http://192.168.1.1", "http://10.0.0.1", "http://172.16.0.1", "http://foo.local"]) assert.equal(isSourceUrl(url), false)
})

test("FlexCheck has twelve evidence-based checks and stale tests cannot approve a new draft", () => {
  const input = { website: { id: "site", title: "Bedrijf", draft_version: "v1", seo: { title: "Bedrijf", description: "Coaching in Utrecht" } }, business: { name: "Bedrijf", city: "Utrecht" }, services: [{ title: "Coaching" }], hasDestination: true, domainActive: false, testedVersion: "v1", sections: [
    { id: "contact", type: "contact", data: { email: "info@example.com", address: "Utrecht" } },
    { id: "services", type: "services", data: {} },
    { id: "cta", type: "cta", data: { primaryCtaText: "Contact", primaryCtaEnabled: true, primaryCtaHref: "#section-contact" } },
    { id: "footer", type: "footer", data: { columns: [{ links: [{ label: "Privacyverklaring", href: "https://example.com/privacy" }] }] } },
    { id: "gallery", type: "gallery", data: { images: ["https://example.com/photo.webp"] } },
  ] }
  const result = runFlexCheck(input)
  assert.equal(result.total, 12); assert.equal(result.ready, 11); assert.equal(result.canPublish, true)
  const stale = runFlexCheck({ ...input, testedVersion: "v0" })
  assert.equal(stale.canPublish, false); assert.equal(stale.items.find((i) => i.id === "test").state, "required")
  assert.equal(runFlexCheck({ ...input, hasDestination: false }).canPublish, false)
  assert.equal(runFlexCheck({ ...input, sections: input.sections.filter((s) => s.type !== "footer") }).canPublish, false)
  assert.equal(runFlexCheck({ ...input, sections: input.sections.map((s) => s.type === "services" ? { ...s, data: { serviceIds: ["missing"] } } : s) }).items.find((i) => i.id === "services").state, "required")
  assert.equal(runFlexCheck({ ...input, sections: input.sections.map((s) => s.type === "footer" ? { ...s, data: { columns: [null, { links: {} }] } } : s) }).items.find((i) => i.id === "privacy").state, "required")
  assert.equal(runFlexCheck({ ...input, sections: [{ id: "bad", type: "cta", data: { primaryCtaEnabled: true, primaryCtaText: "Contact", primaryCtaHref: "#section-missing" } }] }).items.find((i) => i.id === "cta").state, "required")
})

test("FlexStart database enforces ownership, transitions, publication, import rollback and first 100 customers", async () => {
  const db = new PGlite({ extensions: { pgcrypto } })
  const owner = randomUUID(), other = randomUUID(), admin = randomUUID(), request = randomUUID(), design = randomUUID()
  try {
    await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
      create schema auth; create table auth.users(id uuid primary key, email text, raw_user_meta_data jsonb default '{"terms_accepted":true,"terms_version":"2026-09-17"}');
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid',true),'')::uuid $$;
      create schema storage; create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
      create table storage.objects(id uuid primary key,bucket_id text,name text);
      create function storage.foldername(text) returns text[] language sql immutable as $$ select string_to_array($1,'/') $$;`)
    await db.exec(read("supabase/init.sql").split("-- BEGIN FLEXSTART")[0])
    await db.exec(read("supabase/migrations/20260927181522_flexstart_managed_transfers.sql"))
    await db.exec("grant usage on schema auth, public to authenticated, service_role; grant all on all tables in schema public to service_role;")
    await db.query("insert into auth.users(id,email) values($1,'owner@example.com'),($2,'other@example.com'),($3,'admin@example.com')", [owner,other,admin])
    await db.query("insert into public.businesses(user_id,name,city,email) values($1,'Bedrijf','Utrecht','owner@example.com')",[owner])
    const insert = async (uid, rid = randomUUID()) => db.query(`insert into public.website_transfer_requests(id,user_id,source_url,business_name,business_type,services,city,service_area,primary_goal)
      values($1,$2,'https://example.com','Bedrijf','coach','Coaching','Utrecht','Utrecht','requests')`, [rid,uid])
    await db.exec("set role service_role")
    await insert(owner,request)
    const revision = async () => (await db.query("select revision from public.website_transfer_requests where id=$1",[request])).rows[0].revision
    const version = async () => (await db.query("select draft_version from public.websites where id=$1",[design])).rows[0].draft_version
    const action = async (name, actor=admin, isAdmin=true, message="", ver=null) => db.query("select public.transition_transfer_request($1,$2,$3,$4,$5,$6,$7)",[request,await revision(),name,message,ver,actor,isAdmin])
    await assert.rejects(action("approve",other,false), /Forbidden/)
    await action("start")
    const sections = [{ id: randomUUID(), type: "hero", data: { title: "Nieuw" }, styles: {} }]
    await assert.rejects(db.query("select public.create_transfer_design($1,'Draft','{}',$2,'[]',$3,$4)",[design,JSON.stringify([{...sections[0],type:"html"}]),request,await revision()]),/Invalid section/)
    assert.equal((await db.query("select id from public.websites where id=$1",[design])).rows.length,0)
    await db.query("select public.create_transfer_design($1,'Draft','{}',$2,'[]',$3,$4)",[design,JSON.stringify(sections),request,await revision()])
    assert.equal((await db.query("select user_id,published from public.websites where id=$1",[design])).rows[0].user_id, owner)
    await db.query("select public.prepare_transfer_design($1,$2,$3,$4)",[request,await revision(),await version(),JSON.stringify({ name:"Bedrijf",city:"Utrecht",phone:"",email:"owner@example.com",seoTitle:"Bedrijf",seoDescription:"Coaching",privacyUrl:"https://example.com/privacy",services:["Coaching"] })])
    assert.equal((await db.query("select id from public.website_sections where website_id=$1",[design])).rows.length,5)
    await action("ready",admin,true,"",await version())
    await action("correct",owner,false,"Pas de foto aan")
    await action("resolve",admin,true,"",await version())
    await assert.rejects(action("correct",owner,false,"Nogmaals"),/round already used/)
    await action("approve",owner,false,"",await version())
    await assert.rejects(db.query("select public.transition_transfer_request($1,0,'start','',null,$2,true)",[request,admin]),/STALE_REQUEST/)
    await assert.rejects(db.query("update public.websites set published=true,live_snapshot='{}' where id=$1",[design]),/FlexReview/)
    await assert.rejects(action("review",admin,true,"Mobiel en formulier gecontroleerd",await version()),/Form test required/)
    await db.query("insert into public.website_check_evidence(website_id,tested_version,tested_at) values($1,$2,now())",[design,await version()])
    await action("review",admin,true,"Mobiel en formulier gecontroleerd",await version())
    const reviewedVersion = await version()
    await db.query("update public.website_form_destinations set recipient_email='changed@example.com' where website_id=$1",[design])
    assert.notEqual(await version(),reviewedVersion)
    await assert.rejects(db.query("update public.websites set published=true,live_snapshot='{}' where id=$1",[design]),/FlexReview/)
    await action("ready",admin,true,"",await version())
    await action("approve",owner,false,"",await version())
    await db.query("update public.website_check_evidence set tested_version=$2 where website_id=$1",[design,await version()])
    await action("review",admin,true,"Opnieuw gecontroleerd",await version())
    await db.query("update public.websites set published=true,live_snapshot='{}' where id=$1",[design])
    assert.equal((await db.query("select status from public.website_transfer_requests where id=$1",[request])).rows[0].status,"published")
    await db.query("update public.website_sections set content='{" + '"title":"Gewijzigd"' + "}' where website_id=$1 and type='hero'",[design])
    const changed = (await db.query("select status,approved_version,reviewed_version from public.website_transfer_requests where id=$1",[request])).rows[0]
    assert.deepEqual(changed,{status:"checking",approved_version:null,reviewed_version:null})
    await assert.rejects(db.query("update public.websites set live_snapshot='{\"new\":true}' where id=$1",[design]),/FlexReview/)
    await action("notes",admin,true,"Alleen beheer")
    await db.exec("reset role; set role authenticated")
    await db.query("select set_config('test.uid',$1,false)",[other])
    assert.equal((await db.query("select * from public.website_transfer_requests")).rows.length,0)
    assert.equal((await db.query("select * from public.website_transfer_feedback")).rows.length,0)
    await db.query("select set_config('test.uid',$1,false)",[owner])
    assert.equal((await db.query("select * from public.website_transfer_requests")).rows.length,1)
    await assert.rejects(db.query("select * from public.website_transfer_private"),/permission denied/)
    await assert.rejects(db.query("update public.website_transfer_requests set status='approved'"),/permission denied/)
    await assert.rejects(db.query("select public.transition_transfer_request($1,0,'start','',null,$2,true)",[request,owner]),/permission denied/)
    await db.exec("reset role; set role anon")
    await assert.rejects(db.query("select * from public.website_transfer_requests"),/permission denied/)
    await db.exec("reset role")
    await db.query("delete from public.websites where id=$1",[design])
    const detached = (await db.query("select status,website_id,approved_version,reviewed_version from public.website_transfer_requests where id=$1",[request])).rows[0]
    assert.deepEqual(detached,{status:"processing",website_id:null,approved_version:null,reviewed_version:null})
    for(let i=1;i<100;i++) {
      const uid=randomUUID(); await db.query("insert into auth.users(id) values($1)",[uid]); await insert(uid)
    }
    await assert.rejects(insert(other),/FLEXSTART_FULL/)
    assert.equal((await db.query("select claimed from public.website_transfer_offer")).rows[0].claimed,100)
    await db.query("delete from auth.users where id=$1",[owner])
    await assert.rejects(insert(other),/FLEXSTART_FULL/)
    const migration = read("supabase/migrations/20260927181522_flexstart_managed_transfers.sql").trim()
    assert.equal(read("supabase/init.sql").split("-- BEGIN FLEXSTART\n")[1].split("-- END FLEXSTART")[0].trim(),migration)
  } finally { await db.close() }
})
