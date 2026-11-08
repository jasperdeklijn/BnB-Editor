import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { PGlite } from "@electric-sql/pglite"
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto"

const migration = readFileSync("supabase/migrations/20261108110511_secure_domain_provisioning.sql", "utf8")
const bootstrap = readFileSync("supabase/init.sql", "utf8")
const owner = "10000000-0000-4000-8000-000000000001"
const outsider = "10000000-0000-4000-8000-000000000002"
const website = "20000000-0000-4000-8000-000000000001"
const domain = "30000000-0000-4000-8000-000000000001"
const legacy = "30000000-0000-4000-8000-000000000002"

test("migration blocks direct domain forgery while preserving narrow owner operations", async () => {
  const db = new PGlite({ extensions: { pgcrypto } })
  try {
    await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
      alter default privileges in schema public grant all on tables to anon,authenticated,service_role;
      alter default privileges in schema public grant execute on functions to anon,authenticated,service_role;
      create schema auth; create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}');
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.user_id',true),'')::uuid $$;
      grant usage on schema auth to anon,authenticated,service_role;
      create schema storage; create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
      create table storage.objects(id uuid primary key,bucket_id text,name text);
      create function storage.foldername(text) returns text[] language sql immutable as $$ select string_to_array($1,'/') $$;`)
    // Exercise an upgrade with a pre-existing, customer-editable legacy row.
    await db.exec(bootstrap.split("-- Domain provisioning security (20261108110511)")[0])
    await db.query(`insert into auth.users(id,email,raw_user_meta_data) values
      ($1,'owner@example.invalid','{"terms_accepted":true,"terms_version":"2026-09-17"}'),
      ($2,'other@example.invalid','{"terms_accepted":true,"terms_version":"2026-09-17"}')`, [owner, outsider])
    await db.query("insert into public.websites(id,user_id,slug) values($1,$2,'security-domain-test')", [website, owner])
    await db.query("insert into public.website_domains(id,website_id,domain,status) values($1,$2,'legacy.example','active')", [legacy, website])
    await db.exec(migration)
    assert.equal((await db.query("select provider_domain from public.website_domains where id=$1", [legacy])).rows[0].provider_domain, null)
    await db.query("select set_config('test.user_id',$1,false)", [owner])
    await db.exec("set role authenticated")
    assert.equal((await db.query("select domain from public.website_domains")).rows.length, 1)
    await assert.rejects(db.query("insert into public.website_domains(website_id,domain,status) values($1,'flexpagina.nl','active')", [website]), /permission denied/)
    await assert.rejects(db.query("update public.website_domains set domain='flexpagina.nl',provider_domain='flexpagina.nl',provider_project_id='project' where id=$1", [legacy]), /permission denied/)
    await assert.rejects(db.query("delete from public.website_domains where id=$1", [legacy]), /permission denied/)
    assert.equal((await db.query("select public.set_website_primary_domain($1,$2) as ok", [website, legacy])).rows[0].ok, false)
    await db.exec("reset role; set role service_role")
    await db.query("insert into public.website_domains(id,website_id,domain,status,provider_domain,provider_project_id) values($1,$2,'trusted.example','active','trusted.example','project')", [domain, website])
    await db.exec("reset role; set role authenticated")
    assert.equal((await db.query("select public.set_website_primary_domain($1,$2) as ok", [website, domain])).rows[0].ok, true)
    assert.equal((await db.query("select public.finalize_website_domain_removal($1,$2) as result", [website, domain])).rows[0].result, "not_found")
    await db.exec("reset role; set role service_role")
    await db.query("update public.website_domains set status='removal_pending' where id=$1", [domain])
    await db.exec("reset role; set role authenticated")
    await db.query("select set_config('test.user_id',$1,false)", [outsider])
    assert.equal((await db.query("select public.set_website_primary_domain($1,$2) as ok", [website, domain])).rows[0].ok, false)
    assert.equal((await db.query("select public.finalize_website_domain_removal($1,$2) as result", [website, domain])).rows[0].result, "unauthorized")
    await db.query("select set_config('test.user_id',$1,false)", [owner])
    assert.equal((await db.query("select public.finalize_website_domain_removal($1,$2) as result", [website, domain])).rows[0].result, "removed")
    await db.exec("reset role; set role anon")
    await assert.rejects(db.query("select public.set_website_primary_domain($1,$2)", [website, domain]), /permission denied/)
    await db.exec("reset role")
    // Also exercise a fresh installation, not only the additive upgrade.
    await db.exec(bootstrap)
    assert.equal((await db.query("select has_table_privilege('authenticated','public.website_domains','UPDATE') as allowed")).rows[0].allowed, false)
  } finally { await db.close() }
})
