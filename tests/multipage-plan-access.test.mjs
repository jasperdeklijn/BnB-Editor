import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { fixture, save, website, otherWebsite } from "./helpers/website-pages-fixture.mjs"

const owner = "00000000-0000-0000-0000-000000000001"
const migration = readFileSync("supabase/migrations/20261008184614_bronze_onepage_entitlement.sql", "utf8")

async function setPlan(db, plan) {
  await db.exec("reset role")
  await db.query("insert into subscriptions(user_id,plan_id) values($1,$2) on conflict(user_id) do update set plan_id=excluded.plan_id", [owner, plan])
  await db.exec("set role authenticated")
}

test("stored Bronze blocks page RPCs/direct inserts, preserves drafts and enforces publication", async () => {
  const db = await fixture()
  try {
    assert.ok(readFileSync("supabase/init.sql", "utf8").includes(migration))
    await db.exec("reset role")
    await db.exec(migration) // safe to apply again
    await db.exec("set role authenticated")
    await setPlan(db, "silver")
    const page = await save(db, "about")
    const home = (await db.query("select id from website_pages where website_id=$1 and is_home", [website])).rows[0].id
    await setPlan(db, "bronze")
    await assert.rejects(save(db, "extra"), /MULTIPAGE_REQUIRES_SILVER/)
    await assert.rejects(db.query("select duplicate_website_page($1,$2,'Copy','copy')", [website, home]), /MULTIPAGE_REQUIRES_SILVER/)
    await assert.rejects(db.query("insert into website_pages(website_id,title,slug,position) values($1,'Extra','extra',2)", [website]), /MULTIPAGE_REQUIRES_SILVER/)
    await save(db, "renamed", website, page.id) // existing draft remains editable
    const snapshot = { version: 3, pages: [{ id: home }, { id: page.id }] }
    await assert.rejects(db.query("update websites set published=true,live_snapshot=$1 where id=$2", [snapshot, website]), /MULTIPAGE_REQUIRES_SILVER/)
    assert.equal((await db.query("select published from websites where id=$1", [website])).rows[0].published, false)
    await db.query("update websites set published=true,live_snapshot=$1 where id=$2", [{ version: 3, pages: [{ id: home }] }, website])
    for (const plan of ["silver", "gold"]) {
      await setPlan(db, plan)
      await save(db, plan)
      await db.query("update websites set published=true,live_snapshot=$1 where id=$2", [snapshot, website])
    }
    await setPlan(db, "bronze")
    assert.equal((await db.query("select live_snapshot from websites where id=$1", [website])).rows[0].live_snapshot.pages.length, 2)
    await db.query("update websites set published=false where id=$1", [website])
    await assert.rejects(db.query("update websites set published=true where id=$1", [website]), /MULTIPAGE_REQUIRES_SILVER/)
    await assert.rejects(save(db, "foreign", otherWebsite), /Website niet gevonden/)
    await db.exec("reset role; set role anon")
    await assert.rejects(db.query("select enforce_website_page_plan()"), /permission denied/)
  } finally { await db.close() }
})

test("Bronze multipage import rolls back the entire new draft", async () => {
  const db = await fixture()
  try {
    await setPlan(db, "bronze")
    const id = "00000000-0000-0000-0000-000000000088"
    const home = "00000000-0000-0000-0000-000000000089"
    const about = "00000000-0000-0000-0000-000000000090"
    const section = "00000000-0000-0000-0000-000000000091"
    const pages = [{ id: home, title: "Home", slug: "", isHome: true }, { id: about, title: "About", slug: "about", isHome: false }]
    const sections = [{ id: section, pageId: about, scope: "page", type: "hero", data: { title: "About" }, styles: {} }]
    await assert.rejects(db.query("select create_multipage_imported_design($1,'Imported','{}',$2,'[]',$3)", [id, sections, pages]), /MULTIPAGE_REQUIRES_SILVER/)
    assert.equal((await db.query("select id from websites where id=$1", [id])).rows.length, 0)
  } finally { await db.close() }
})
