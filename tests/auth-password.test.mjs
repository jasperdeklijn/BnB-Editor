import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import test from "node:test"

const read = (file) => fs.readFileSync(path.resolve(file), "utf8")

test("login exposes the password recovery flow", () => {
  const login = read("app/auth/login/page.tsx")
  const forgotPassword = read("app/auth/forgot-password/page.tsx")
  const resetRoute = read("app/api/auth/password-reset/route.ts")

  assert.match(login, /href="\/auth\/forgot-password"/)
  assert.match(forgotPassword, /fetch\("\/api\/auth\/password-reset"/)
  assert.match(resetRoute, /resetPasswordForEmail/)
  assert.match(resetRoute, /\/auth\/callback\?next=\/auth\/update-password/)
})

test("recovery callback exchanges the one-time code before password update", () => {
  const callback = read("app/auth/callback/route.ts")
  const updatePassword = read("app/auth/update-password/page.tsx")
  const middleware = read("lib/supabase/middleware.ts")

  assert.match(callback, /exchangeCodeForSession\(code\)/)
  assert.match(callback, /requestedPath === PASSWORD_UPDATE_PATH/)
  assert.match(updatePassword, /supabase\.auth\.updateUser\(\{ password \}\)/)
  assert.match(middleware, /requiresRecoverySession = request\.nextUrl\.pathname === "\/auth\/update-password"/)
  assert.match(middleware, /requiresRecoverySession \? "\/auth\/forgot-password" : "\/auth\/login"/)
})

test("account settings verifies the current password before changing it", () => {
  const profile = read("components/profile/profile-client.tsx")
  const changeRoute = read("app/api/auth/change-password/route.ts")

  assert.match(profile, /Wachtwoord wijzigen/)
  assert.match(profile, /autoComplete="current-password"/)
  assert.match(profile, /fetch\("\/api\/auth\/change-password"/)
  assert.match(changeRoute, /supabase\.auth\.getUser\(\)/)
  assert.match(changeRoute, /updateUser\(\{[\s\S]*current_password: currentPassword,[\s\S]*password: newPassword/)
})
