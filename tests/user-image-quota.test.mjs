import assert from "node:assert/strict"
import { randomUUID } from "node:crypto"
import { readFileSync } from "node:fs"
import test from "node:test"
import { PGlite } from "@electric-sql/pglite"

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8")
const quotaFunction = (sql) => sql.match(/create or replace function public\.enforce_user_image_quota\(\)[\s\S]*?\$\$;/)[0]

test("additive image quota migration preserves rows and enforces 500 MiB including previews per account", async () => {
  const db = new PGlite()
  try {
    await db.exec(`create table public.user_images(id uuid primary key, user_id uuid not null,
      original_size bigint not null check(original_size > 0 and original_size <= 5242880), thumbnail_size bigint not null);
      ${quotaFunction(read("supabase/migrations/20260908120000_pre_administration_readiness.sql"))}
      create trigger enforce_user_image_quota before insert or update of original_size, thumbnail_size, user_id
      on public.user_images for each row execute procedure public.enforce_user_image_quota();`)
    const owner = randomUUID(), other = randomUUID(), imageId = randomUUID()
    const insert = (id, userId, size, preview = 1024) => db.query(
      "insert into user_images values($1,$2,$3,$4)", [id, userId, size, preview])
    await insert(imageId, owner, 5242880 - 1024)
    const before = (await db.query("select * from user_images")).rows
    const migration = read("supabase/migrations/20261006185918_user_image_storage_500mb.sql")
    await db.exec(migration)
    await db.exec(migration)
    assert.deepEqual((await db.query("select * from user_images")).rows, before)
    assert.equal(quotaFunction(read("supabase/init.sql")).replace(/\r\n/g, "\n"), quotaFunction(migration).replace(/\r\n/g, "\n"))
    for (let i = 1; i < 100; i++) await insert(randomUUID(), owner, 5242880 - 1024)
    assert.equal(Number((await db.query("select sum(original_size + thumbnail_size) as size from user_images where user_id=$1", [owner])).rows[0].size), 524288000)
    await assert.rejects(insert(randomUUID(), owner, 1, 0), /USER_IMAGE_QUOTA_EXCEEDED/)
    await assert.rejects(db.query("update user_images set thumbnail_size=thumbnail_size+1 where id=$1", [imageId]), /USER_IMAGE_QUOTA_EXCEEDED/)
    await db.query("update user_images set original_size=original_size where id=$1", [imageId])
    await insert(randomUUID(), other, 5242880 - 1024)
    await db.query("delete from user_images where id=$1", [imageId])
    await insert(randomUUID(), owner, 5242880 - 1024)
  } finally {
    await db.close()
  }
})
