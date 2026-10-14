import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import { createRequire } from "node:module"
import { randomUUID } from "node:crypto"
import { PGlite } from "@electric-sql/pglite"

const require = createRequire(import.meta.url)
const load = require("../scripts/load-import-module.cjs")
const { parseImport } = load("lib/import/schema.ts")
const { demoSlugSchema, suggestDemoSlug, prepareDemo, demoPages, publicDemoDesign, demoUrl } = load("lib/demos/shared.ts")
const { resolveWebsiteRoute } = load("lib/website-routing.ts")
const migration = fs.readFileSync("supabase/migrations/20261014121210_admin_demo_websites.sql", "utf8")

test("the existing wildcard router preserves demo subdomains and page paths", async () => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co"
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-public-key"
  const { NextRequest } = require("next/server")
  const { updateSession } = load("lib/supabase/middleware.ts")
  const { PLATFORM_DOMAIN } = load("lib/platform.ts")
  const host = `demo-lindenhof.${PLATFORM_DOMAIN.toLowerCase()}`
  for (const path of ["/", "/over-ons", "/robots.txt"]) {
    const response = await updateSession(new NextRequest(`https://${host}${path}`, { headers: { host } }))
    assert.equal(new URL(response.headers.get("x-middleware-rewrite")).pathname, `/site/demo-lindenhof${path === "/" ? "" : path}`)
  }
})

test("demo subdomains are valid DNS labels, including accented and long titles", () => {
  for (const title of ["B&B De Lindenhof", "Café Één", "demo-restaurant", "🌿", "a".repeat(200)]) {
    const slug = suggestDemoSlug(title)
    assert.equal(demoSlugSchema.safeParse(slug).success, true, slug)
    assert.ok(slug.length <= 63)
    assert.ok(demoUrl(slug).startsWith(`https://${slug}.`))
  }
  for (const slug of ["lindenhof", "demo-", "demo--site", "Demo-site", "demo-site/evil", "demo-site.example.nl", `demo-${"a".repeat(59)}`]) {
    assert.equal(demoSlugSchema.safeParse(slug).success, false, slug)
  }
})

test("publication excludes draft-page content and routes only included pages", () => {
  const doc = parseImport(JSON.stringify({ format: "flexpagina", version: 2, title: "Demo", pages: [
    { key: "home", title: "Home", slug: "", isHome: true },
    { key: "about", title: "Over ons", slug: "over-ons", includeInPublication: true },
    { key: "private", title: "Verborgen", slug: "verborgen" },
  ], sections: [
    { key: "home-intro", type: "hero", pageKey: "home", content: { title: "Welkom" } },
    { key: "about-intro", type: "hero", pageKey: "about", content: { title: "Over ons" } },
    { key: "private-intro", type: "hero", pageKey: "private", content: { title: "PRIVATE CONTENT" } },
    { key: "nav", type: "nav", scope: "site_header", content: { brandName: "Demo" } },
  ] }))
  const design = prepareDemo(doc, randomUUID)
  const live = publicDemoDesign(design)
  assert.equal(design.pages.length, 3)
  assert.equal(live.pages.length, 2)
  assert.equal(live.sections.length, 3)
  assert.equal(JSON.stringify(live).includes("PRIVATE CONTENT"), false)
  const locales = [{ locale: "nl-NL", pathSegment: "nl", isDefault: true }]
  assert.ok(resolveWebsiteRoute(demoPages(live), locales, []))
  assert.ok(resolveWebsiteRoute(demoPages(live), locales, ["over-ons"]))
  assert.equal(resolveWebsiteRoute(demoPages(live), locales, ["verborgen"]), null)
  assert.equal(resolveWebsiteRoute(demoPages(live), locales, ["over-ons", "nested"]), null)
})

test("actual migration isolates admin writes, live content and legacy customer subdomains", async () => {
  const db = new PGlite()
  try {
    await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
      create schema auth; create table auth.users(id uuid primary key);
      create table public.websites(id uuid primary key, slug text unique not null, title text);
      grant usage on schema public to anon, authenticated, service_role;
      grant select,insert,update on public.websites to authenticated, service_role;
      insert into websites values (gen_random_uuid(),'demo-legacy','Legacy customer');`)
    await db.exec(migration)
    const id = randomUUID()
    async function create(slug, published = false) {
      return db.query(`insert into demo_websites(id,title,slug,source_filename,design,live_design,request_hash,published)
        values ($1,'Demo',$2,'website.json','{"private":"draft"}','{"title":"Public"}',$3,$4)`, [id, slug, "a".repeat(64), published])
    }
    await db.exec("set role service_role")
    await assert.rejects(create("demo-legacy"), /al in gebruik/)
    await create("demo-test")
    await assert.rejects(db.query("insert into demo_websites select * from demo_websites"), /duplicate key/)
    await db.exec("set role anon")
    assert.equal((await db.query("select title,slug,live_design,published from demo_websites")).rows.length, 0)
    await assert.rejects(db.query("select design from demo_websites"), /permission denied/)
    await assert.rejects(db.query("select source_filename from demo_websites"), /permission denied/)
    await assert.rejects(db.query("update demo_websites set published=true"), /permission denied/)
    await db.exec("set role authenticated")
    await assert.rejects(create("demo-hijack", true), /permission denied/)
    await assert.rejects(db.query("delete from demo_websites"), /permission denied/)
    await assert.rejects(db.query("insert into websites values (gen_random_uuid(),'demo-test','Hijack')"), /gereserveerd/)
    await assert.rejects(db.query("insert into websites values (gen_random_uuid(),'DEMO-new','Hijack')"), /gereserveerd/)
    await db.query("update websites set title='Updated',slug=slug where slug='demo-legacy'")
    await db.query("insert into websites values (gen_random_uuid(),'normal-customer','Customer')")
    await db.exec("set role service_role; update demo_websites set published=true; set role anon")
    const published = (await db.query("select title,slug,live_design,published from demo_websites")).rows
    assert.equal(published.length, 1)
    assert.deepEqual(published[0].live_design, { title: "Public" })
    await db.exec("set role service_role; update demo_websites set published=false; set role authenticated")
    assert.equal((await db.query("select title,slug,live_design,published from demo_websites")).rows.length, 0)
    await db.exec("set role service_role; delete from demo_websites")
    assert.equal((await db.query("select * from demo_websites")).rows.length, 0)
    // Equivalent local advisory checks: RLS and function execution grants.
    await db.exec("reset role")
    assert.equal((await db.query("select relrowsecurity from pg_class where relname='demo_websites'")).rows[0].relrowsecurity, true)
    assert.equal((await db.query("select has_function_privilege('anon','public.guard_demo_subdomain()','EXECUTE') as allowed")).rows[0].allowed, false)
  } finally { await db.close() }
})
