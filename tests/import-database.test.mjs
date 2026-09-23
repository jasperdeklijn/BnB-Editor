import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import { randomUUID } from "node:crypto"
import { PGlite } from "@electric-sql/pglite"
import { createRequire } from "node:module"
const require = createRequire(import.meta.url)
const { parseImport, normalizeImport } = require("../scripts/load-import-module.cjs")("lib/import/schema.ts")

test("actual migration creates one additional editable private draft, rolls back failures and enforces owner RLS", async () => {
  const db = new PGlite()
  try {
    await db.exec(`
      create role authenticated;
      create role anon;
      create schema auth;
      create function auth.uid() returns uuid language sql stable as
        'select nullif(current_setting(''request.jwt.claim.sub'', true), '''')::uuid';
      grant usage on schema public, auth to authenticated, anon;
      create table public.businesses(id uuid primary key, user_id uuid not null, created_at timestamptz default now());
      create table public.websites(id uuid primary key, user_id uuid not null, business_id uuid,
        title text not null, slug text unique not null, theme_config jsonb, published boolean default false,
        live_snapshot jsonb, custom_domain text);
      create table public.website_sections(id uuid primary key, website_id uuid references websites(id) on delete cascade,
        position int not null, type text not null, content jsonb not null, styles jsonb not null);
      create table public.user_images(id uuid primary key, user_id uuid not null, display_name text not null,
        original_path text not null, thumbnail_path text, original_size bigint not null check(original_size <= 5242880),
        thumbnail_size bigint not null);
      alter table public.websites enable row level security;
      alter table public.website_sections enable row level security;
      alter table public.user_images enable row level security;
      alter table public.businesses enable row level security;
      create policy own_business on public.businesses for all to authenticated using (user_id=auth.uid()) with check(user_id=auth.uid());
      create policy own_design on public.websites for all to authenticated using (user_id=auth.uid()) with check(user_id=auth.uid());
      create policy own_section on public.website_sections for all to authenticated
        using (exists(select 1 from public.websites w where w.id=website_id and w.user_id=auth.uid()))
        with check (exists(select 1 from public.websites w where w.id=website_id and w.user_id=auth.uid()));
      create policy own_image on public.user_images for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
      grant select,insert,update,delete on all tables in schema public to authenticated;
    `)
    await db.exec(fs.readFileSync("supabase/migrations/20260923133210_create_imported_design.sql", "utf8"))
    const owner = randomUUID(), other = randomUUID(), old = randomUUID(), draft = randomUUID(), business = randomUUID()
    await db.query("insert into businesses(id,user_id) values($1,$2)", [business, owner])
    await db.query("insert into websites(id,user_id,title,slug,published,live_snapshot) values($1,$2,'Existing live site','existing',true,'{\"stable\":true}')", [old, owner])
    const oldDraft = randomUUID()
    await db.query("insert into websites(id,user_id,title,slug,published) values($1,$2,'Existing draft','existing-draft',false)", [oldDraft, owner])
    await db.exec("set role authenticated")
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [owner])
    const document = parseImport(fs.readFileSync("docs/import/examples/bnb.json", "utf8"))
    const native = normalizeImport(document, randomUUID)
    async function create(id, sections = native.sections, assets = []) {
      return db.query("select public.create_imported_design($1,$2,$3::jsonb,$4::jsonb,$5::jsonb)",
        [id,native.title,JSON.stringify(native.theme),JSON.stringify(sections),JSON.stringify(assets)])
    }
    await create(draft)
    const { rows } = await db.query("select * from websites order by title")
    assert.equal(rows.length, 3)
    assert.equal(rows.find((row) => row.id === oldDraft).title, "Existing draft")
    assert.equal(rows.find((row) => row.id === draft).published, false)
    assert.equal(rows.find((row) => row.id === draft).live_snapshot, null)
    assert.equal(rows.find((row) => row.id === draft).business_id, business)
    assert.deepEqual(rows.find((row) => row.id === old).live_snapshot, { stable: true })
    assert.equal((await db.query("select * from website_sections where website_id=$1", [draft])).rows.length, native.sections.length)
    await db.query("update website_sections set content=jsonb_set(content,'{title}','\"Edited title\"') where id=$1", [native.sections[1].id])
    assert.equal((await db.query("select content->>'title' as title from website_sections where id=$1", [native.sections[1].id])).rows[0].title, "Edited title")
    await assert.rejects(create(draft), /already exists/)
    const failId = randomUUID()
    await assert.rejects(create(failId, [{ id: randomUUID(), type: "unsupported", data: {}, styles: {} }]))
    assert.equal((await db.query("select * from websites where id=$1", [failId])).rows.length, 0)
    const badAsset = randomUUID()
    await assert.rejects(create(badAsset, normalizeImport(document, randomUUID).sections, [
      { id: randomUUID(), original_path: other + "/originals/file.webp", thumbnail_path: other + "/thumbnails/file.webp", original_size: 100, thumbnail_size: 50, display_name: "Bad" },
    ]), /Invalid owned asset/)
    assert.equal((await db.query("select * from websites where id=$1", [badAsset])).rows.length, 0)
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [other])
    assert.equal((await db.query("select * from websites")).rows.length, 0)
    assert.equal((await db.query("select * from website_sections")).rows.length, 0)
    await assert.rejects(db.query("insert into websites(id,user_id,title,slug) values($1,$2,'bad','bad')", [randomUUID(), owner]), /row-level security/)
    await db.exec("reset role; set role anon")
    await assert.rejects(create(randomUUID()), /permission denied/)
  } finally { await db.close() }
})

