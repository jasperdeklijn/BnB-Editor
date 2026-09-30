import assert from "node:assert/strict"
import {readFileSync} from "node:fs"
import {randomUUID} from "node:crypto"
import test from "node:test"
import {PGlite} from "@electric-sql/pglite"
import {pgcrypto} from "@electric-sql/pglite/contrib/pgcrypto"

const read=p=>readFileSync(new URL(`../${p}`,import.meta.url),"utf8")
const migration=read("supabase/migrations/20260929120000_quotes_customer_portal.sql")
async function fixture() {
  const db=new PGlite({extensions:{pgcrypto}})
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}');
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid',true),'')::uuid $$;
    create schema storage; create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid primary key,bucket_id text,name text);
    create function storage.foldername(text) returns text[] language sql immutable as $$ select string_to_array($1,'/') $$;`)
  // Validate additive installation on the existing schema, not just fresh bootstrap.
  const init=read("supabase/init.sql").split("-- Owner writes and customer decisions")[0]
  await db.exec(init)
  // Supabase grants on existing tables are platform-owned in a hosted project.
  await db.exec("grant usage on schema auth to authenticated; grant select on businesses,contact_requests to authenticated; grant all on all tables in schema public to service_role; grant usage,select on all sequences in schema public to service_role;")
  await db.exec(migration)
  const owner=randomUUID(),other=randomUUID(),business=randomUUID(),otherBusiness=randomUUID(),request=randomUUID(),entry=randomUUID()
  await db.query(`insert into auth.users(id,email,raw_user_meta_data) values($1,'owner@example.com','{"terms_accepted":true,"terms_version":"2026-09-17"}'),($2,'other@example.com','{"terms_accepted":true,"terms_version":"2026-09-17"}')`,[owner,other])
  await db.query("insert into businesses(id,user_id,name) values($1,$2,'Owner'),($3,$4,'Other')",[business,owner,otherBusiness,other])
  await db.query("insert into contact_requests(id,business_id,user_id,name,email,request_type) values($1,$2,$3,'Customer','customer@example.com','quote')",[request,business,owner])
  await db.query("insert into calendar_entries(id,business_id,title,customer_name,customer_email,start_at,end_at,status) values($1,$2,'Consult','Customer','customer@example.com',now()+interval '2 days',now()+interval '2 days 1 hour','confirmed')",[entry,business])
  const start=async(r=request,e=null)=> (await db.query("select start_quote($1,$2,$3) id",[owner,r,e])).rows[0].id
  const version=async(q)=>(await db.query("select * from quote_versions where quote_id=$1 order by version desc limit 1",[q])).rows[0]
  const snapshot={title:"Consult",seller:{legal_name:"Owner"},customer:{name:"Customer",email:"customer@example.com"},terms:"Terms",lines:[{description:"Consult",quantity_milli:1000,unit_price_minor:10000,discount_minor:0,vat_rate_basis_points:2100,subtotal_minor:10000,vat_minor:2100,total_minor:12100}],subtotalMinor:10000,vatTotalMinor:2100,totalMinor:12100}
  const offer=async(q)=>{let v=await version(q);await db.query("select transition_quote($1,$2,'save',$3,now()+interval '30 days')",[v.id,v.revision,JSON.stringify(snapshot)]);v=await version(q);await db.query("select transition_quote($1,$2,'offer',null,null,'cGRm','hash')",[v.id,v.revision]);return version(q)}
  return {db,owner,other,business,otherBusiness,request,entry,start,version,offer}
}

test("quotes isolate tenants and make immutable offers; conversion preserves the appointment",async()=>{
  const f=await fixture(),{db}=f
  try {
    const q=await f.start(null,f.entry)
    assert.equal(await f.start(null,f.entry),q)
    assert.equal((await db.query("select count(*)::int n from quotes")).rows[0].n,1)
    assert.equal((await db.query("select status from calendar_entries where id=$1",[f.entry])).rows[0].status,"confirmed")
    await assert.rejects(db.query("select start_quote($1,null,$2)",[f.other,f.entry]),/niet gevonden/)
    await assert.rejects(db.query("insert into quotes(business_id,request_id) values($1,$2)",[f.otherBusiness,f.request]),/Invalid dossier/)
    const v=await f.offer(q)
    await assert.rejects(db.query("update quote_versions set snapshot='{}' where id=$1",[v.id]),/immutable/)
    await assert.rejects(db.query("select transition_quote($1,1,'withdraw')",[v.id]),/gewijzigd/)
    await db.query("select set_config('test.uid',$1,false)",[f.other])
    await db.exec("set role authenticated")
    assert.equal((await db.query("select * from quotes")).rows.length,0)
    assert.equal((await db.query("select * from quote_versions")).rows.length,0)
    assert.equal((await db.query("select * from quote_overview")).rows.length,0)
    await assert.rejects(db.query("select start_quote($1,$2,null)",[f.owner,f.request]),/permission denied/)
    await assert.rejects(db.query("select * from customer_request_access"),/permission denied/)
    await db.exec("reset role")
    await db.query("select set_config('test.uid',$1,false)",[f.owner])
    await db.exec("set role authenticated")
    assert.equal((await db.query("select * from quotes")).rows.length,1)
    assert.equal((await db.query("select * from quote_overview")).rows.length,1)
    await assert.rejects(db.query("update quote_versions set status='accepted'"),/permission denied/)
    await db.exec("reset role;set role anon")
    await assert.rejects(db.query("select * from quote_versions"),/permission denied/)
  }finally{await db.close()}
})

test("customer decisions validate scope, consume codes, limit attempts and create one linked invoice",async()=>{
  const f=await fixture(),{db}=f
  try {
    const q=await f.start(null,f.entry),v=await f.offer(q)
    const r=(await db.query("select request_id from quotes where id=$1",[q])).rows[0].request_id
    const access=randomUUID(),code=randomUUID()
    await db.query("insert into customer_request_access(id,request_id,email,token_hash,expires_at) values($1,$2,'customer@example.com','token',now()+interval '1 day')",[access,r])
    await db.query("insert into customer_request_sessions values('session',$1,now()+interval '1 hour')",[access])
    await db.query("insert into quote_decision_codes(id,access_id,version_id,decision,code_hash,expires_at) values($1,$2,$3,'accepted','correct',now()+interval '10 minutes')",[code,access,v.id])
    const decide=async(hash="correct")=>(await db.query("select decide_quote('session',$1,$2,'Customer','Agreed') result",[code,hash])).rows[0].result
    assert.equal(await decide("wrong"),"Code ongeldig of verlopen")
    assert.equal((await db.query("select attempts from quote_decision_codes where id=$1",[code])).rows[0].attempts,1)
    assert.equal(await decide(),"ok")
    assert.equal(await decide(),"Code ongeldig of verlopen")
    const invoice=(await db.query("select invoice_from_quote($1,$2) id",[v.id,f.owner])).rows[0].id
    assert.equal((await db.query("select invoice_from_quote($1,$2) id",[v.id,f.owner])).rows[0].id,invoice)
    assert.equal((await db.query("select total_minor::int n from booking_invoices where id=$1",[invoice])).rows[0].n,12100)
    assert.equal((await db.query("select status from calendar_entries where id=$1",[f.entry])).rows[0].status,"confirmed")
    await assert.rejects(db.query("select invoice_from_quote($1,$2)",[v.id,f.other]),/niet gevonden/)
  }finally{await db.close()}
})

test("bootstrap contains identical quote migration and resets every new table",()=>{
  const init=read("supabase/init.sql")
  assert.ok(init.replaceAll('\r\n','\n').includes(migration.replaceAll('\r\n','\n')))
  for(const table of ['quotes','quote_versions','quote_events','quote_deliveries','customer_request_access','customer_request_sessions','quote_decision_codes']) assert.ok(init.includes(`drop table if exists public.${table} cascade;`))
})

test("revoked access, cross-dossier codes, withdrawn offers and exhausted codes cannot decide",async()=>{
  const f=await fixture(),{db}=f
  try {
    const q=await f.start(),v=await f.offer(q),access=randomUUID()
    await db.query("insert into customer_request_access(id,request_id,email,token_hash,expires_at) values($1,$2,'customer@example.com','token2',now()+interval '1 day')",[access,f.request])
    await db.query("insert into customer_request_sessions values('s2',$1,now()+interval '1 hour')",[access])
    async function newCode(version=v.id){const id=randomUUID();await db.query("insert into quote_decision_codes(id,access_id,version_id,decision,code_hash,expires_at) values($1,$2,$3,'accepted','right',now()+interval '10 minutes')",[id,access,version]);return id}
    const decide=async(id,hash='right')=>(await db.query("select decide_quote('s2',$1,$2,'Customer','') result",[id,hash])).rows[0].result
    const attempts=await newCode()
    for(let i=0;i<5;i++)assert.equal(await decide(attempts,'wrong'),'Code ongeldig of verlopen')
    assert.equal(await decide(attempts),'Code ongeldig of verlopen')
    const otherQuote=await f.start(null,f.entry),otherVersion=await f.offer(otherQuote),cross=await newCode(otherVersion.id)
    assert.equal(await decide(cross),'Offerte niet beschikbaar')
    const revoked=await newCode()
    await db.query("update customer_request_access set revoked_at=now() where id=$1",[access])
    assert.equal(await decide(revoked),'Toegang verlopen')
    await db.query("update customer_request_access set revoked_at=null where id=$1",[access])
    await db.query("select transition_quote($1,$2,'withdraw')",[v.id,v.revision])
    assert.equal(await decide(revoked),'Offerte niet meer beschikbaar')
    await db.query("select start_quote($1,$2,null,true)",[f.owner,f.request])
    const next=await f.offer(q)
    const old=await newCode(v.id)
    assert.equal(await decide(old),'Offerte niet meer beschikbaar')
    assert.equal((await f.version(q)).version,2)
    await db.query("update contact_requests set email='changed@example.com' where id=$1",[f.request])
    assert.equal(await decide(await newCode(next.id)),'Toegang verlopen')
  } finally {await db.close()}
})

test("expired quotes reject decisions without a cron, and service-role conversions retain grants",async()=>{
  const f=await fixture(),{db}=f
  try {
    const q=await f.start(),v=await f.version(q),access=randomUUID(),code=randomUUID()
    await db.query("update quote_versions set status='offered',valid_until=now()-interval '1 second' where id=$1",[v.id])
    await db.query("insert into customer_request_access(id,request_id,email,token_hash,expires_at) values($1,$2,'customer@example.com','token3',now()+interval '1 day')",[access,f.request])
    await db.query("insert into customer_request_sessions values('s3',$1,now()+interval '1 hour')",[access])
    await db.query("insert into quote_decision_codes(id,access_id,version_id,decision,code_hash,expires_at) values($1,$2,$3,'accepted','right',now()+interval '1 minute')",[code,access,v.id])
    await db.exec("set role service_role")
    assert.equal((await db.query("select decide_quote('s3',$1,'right','Customer','') result",[code])).rows[0].result,'Offerte niet meer beschikbaar')
    assert.ok((await db.query("select start_quote($1,null,$2) id",[f.owner,f.entry])).rows[0].id)
  } finally {await db.close()}
})
