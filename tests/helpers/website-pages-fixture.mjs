import { readFileSync } from "node:fs"
import { PGlite } from "@electric-sql/pglite"
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto"
const read = (file) => readFileSync(new URL(`../../${file}`, import.meta.url), "utf8")
const owner = "00000000-0000-0000-0000-000000000001"
const outsider = "00000000-0000-0000-0000-000000000002"
export const website = "00000000-0000-0000-0000-000000000011"
export const otherWebsite = "00000000-0000-0000-0000-000000000012"

export async function fixture({ temporaryGoldAccess = true } = {}) {
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
  if (!temporaryGoldAccess) await db.exec("create or replace function public.temporary_gold_access_enabled() returns boolean language sql stable security invoker set search_path = '' as $$ select false $$;")
  await db.query(`insert into auth.users(id,email,raw_user_meta_data) values
    ($1,'owner@example.test','{"terms_accepted":true,"terms_version":"2026-09-17"}'),
    ($2,'other@example.test','{"terms_accepted":true,"terms_version":"2026-09-17"}')`, [owner, outsider])
  await db.query("insert into public.websites(id,user_id,slug) values ($1,$2,'owner-site'),($3,$4,'other-site')", [website,owner,otherWebsite,outsider])
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [owner])
  await db.exec("set role authenticated")
  return db
}

export async function save(db, slug, site = website, id = null) {
  return (await db.query("select public.save_website_page($1,$2,$3,$4,true,false) as page", [site,id,slug,slug])).rows[0].page
}

