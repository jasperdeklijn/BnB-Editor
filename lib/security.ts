import type { User } from "@supabase/supabase-js"

function getConfiguredAdminEmails() {
  return new Set(
    (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  )
}

/**
 * Server-side admin check. Supabase app_metadata can only be changed through a
 * trusted admin context; ADMIN_EMAILS is a server-only MVP fallback. With
 * neither configured, access is denied by default.
 */
export function isAdmin(user: Pick<User, "email" | "app_metadata"> | null | undefined) {
  if (!user) return false
  if (user.app_metadata?.role === "admin") return true

  const email = user.email?.trim().toLowerCase()
  return Boolean(email && getConfiguredAdminEmails().has(email))
}

