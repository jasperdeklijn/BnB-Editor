import "server-only"

type EnvironmentArea = "core" | "mail" | "mailbox" | "domains" | "agents"

export type EnvironmentReadiness = {
  ready: boolean
  missing: Record<EnvironmentArea, string[]>
  invalid: string[]
}

const groups: Record<EnvironmentArea, string[]> = {
  core: [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "NEXT_PUBLIC_PLATFORM_DOMAIN",
    "ADMIN_EMAILS",
    "BOOKING_LINK_SECRET",
    "CALENDAR_SECRET_KEY",
    "CRON_SECRET",
  ],
  mail: ["SMTP_HOST", "SMTP_USER", "SMTP_PASS", "SMTP_FROM"],
  mailbox: ["MAILBOX_USER", "MAILBOX_PASSWORD", "MAIL_IMAP_HOST", "MAIL_SMTP_HOST"],
  domains: ["VERCEL_ACCESS_TOKEN", "VERCEL_PROJECT_ID"],
  agents: ["AI_GATEWAY_API_KEY"],
}

function missing(names: string[]) {
  return names.filter((name) => !process.env[name]?.trim())
}

export function getEnvironmentReadiness(): EnvironmentReadiness {
  const missingByArea = Object.fromEntries(
    Object.entries(groups).map(([area, names]) => [area, missing(names)]),
  ) as Record<EnvironmentArea, string[]>
  const invalid: string[] = []

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  if (supabaseUrl) {
    try {
      if (new URL(supabaseUrl).protocol !== "https:") invalid.push("NEXT_PUBLIC_SUPABASE_URL")
    } catch { invalid.push("NEXT_PUBLIC_SUPABASE_URL") }
  }
  for (const name of ["BOOKING_LINK_SECRET", "CALENDAR_SECRET_KEY", "CRON_SECRET"] as const) {
    const value = process.env[name]?.trim()
    if (value && value.length < 32) invalid.push(name)
  }

  return { ready: missingByArea.core.length === 0 && invalid.length === 0, missing: missingByArea, invalid }
}
