import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import test from "node:test"

function read(file) {
  return fs.readFileSync(path.resolve(file), "utf8")
}

test("enquiry inbox migration adds tenant workflow, messages, activities, and owner RLS", () => {
  const migration = read("supabase/migrations/20260829120000_add_enquiry_inbox.sql")
  for (const field of ["status", "last_activity_at", "follow_up_at", "owner_notes"]) {
    assert.match(migration, new RegExp(`add column if not exists ${field}`))
  }
  assert.match(migration, /create table if not exists public\.contact_request_messages/)
  assert.match(migration, /create table if not exists public\.contact_request_activities/)
  assert.match(migration, /create table if not exists public\.contact_request_reply_templates/)
  assert.match(migration, /Users can update own contact requests/)
  assert.match(migration, /Users can insert own outbound contact request messages/)
  assert.match(migration, /Users can view own contact request activities/)
})

test("reset schema stays in parity with the enquiry inbox migration", () => {
  const init = read("supabase/init.sql")
  assert.match(init, /create table public\.contact_request_messages/)
  assert.match(init, /create table public\.contact_request_activities/)
  assert.match(init, /create table public\.contact_request_reply_templates/)
  assert.match(init, /idx_contact_requests_business_inbox/)
  assert.match(init, /Users can update own contact requests/)
})

test("public requests create inbox history and label preferred-date calendar entries as unverified", () => {
  const route = read("app/api/requests/route.ts")
  assert.match(route, /from\("contact_request_messages"\)\.insert/)
  assert.match(route, /availability_checked: false/)
  assert.match(route, /request_intent: "preferred_date"/)
  assert.match(route, /Nieuwe voorkeursboeking/)
})

test("availability-checked public bookings enter the inbox and confirmed bookings close the enquiry as won", () => {
  const confirmRoute = read("app/api/booking/confirm/route.ts")
  const lifecycle = read("lib/booking/lifecycle.ts")
  assert.match(confirmRoute, /from\("contact_request_messages"\)\.insert/)
  assert.match(confirmRoute, /status: "won"/)
  assert.match(lifecycle, /status: "won"/)
  assert.match(lifecycle, /Boeking bevestigd/)
})

test("owner inbox and booking setup guidance are available without WhatsApp integration", () => {
  const page = read("app/editor/requests/page.tsx")
  const nav = read("components/editor/editor-header.tsx")
  const bookingEditor = read("components/sections/services-section.editor.tsx")
  assert.match(page, /title="Aanvragen"/)
  assert.match(nav, /href="\/editor\/requests"/)
  assert.match(bookingEditor, /Gebruik Beschikbaarheid voor tijden of verblijven die direct server-side worden gecontroleerd/)
  assert.match(bookingEditor, /We controleren je gewenste periode voordat we deze bevestigen/)
  assert.match(read("components/requests/requests-client.tsx"), /Alle bronnen/)
  assert.match(read("lib/inquiries.ts"), /filters\.dateFrom/)
  assert.doesNotMatch(page, /WhatsApp Business API|Meta\/WhatsApp|webhook/i)
  assert.match(read("components/requests/requests-client.tsx"), /Gebruik een opgeslagen template/)
})
