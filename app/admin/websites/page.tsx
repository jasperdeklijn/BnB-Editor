import Link from "next/link"
import { ExternalLink, Globe2, Search } from "lucide-react"
import { notFound, redirect } from "next/navigation"
import { SharedHeader } from "@/components/layout/shared-header"
import { PLATFORM_DOMAIN } from "@/lib/platform"
import { isAdmin } from "@/lib/security"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export const metadata = {
  title: "Gepubliceerde websites | Beheer",
  description: "Adminoverzicht van alle gepubliceerde websites en domeinnamen.",
}

type PublishedWebsite = {
  id: string
  user_id: string
  title: string
  slug: string
  custom_domain: string | null
  updated_at: string
}

type WebsiteDomain = {
  website_id: string
  domain: string
  is_primary: boolean
  status: string
}

type WebsiteOwner = {
  email: string | null
  name: string | null
}

const PAGE_SIZE = 1000

function normalizeSearchValue(value: string | string[] | undefined) {
  return (Array.isArray(value) ? value[0] : value)?.trim().slice(0, 200) ?? ""
}

function getOwnerName(metadata: Record<string, unknown> | undefined) {
  const fullName = metadata?.full_name
  if (typeof fullName === "string" && fullName.trim()) return fullName.trim()

  const name = metadata?.name
  return typeof name === "string" && name.trim() ? name.trim() : null
}

export default async function AdminWebsitesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>
}) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) redirect("/auth/login")
  if (!isAdmin(user)) notFound()

  const query = normalizeSearchValue((await searchParams).q)
  const websites: PublishedWebsite[] = []
  const domains: WebsiteDomain[] = []
  const owners = new Map<string, WebsiteOwner>()
  let loadError = ""

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    loadError = "SUPABASE_SERVICE_ROLE_KEY ontbreekt. Gepubliceerde websites kunnen niet veilig worden geladen."
  } else {
    const admin = await createAdminClient()

    for (let page = 0; ; page += 1) {
      const { data, error } = await admin
        .from("websites")
        .select("id, user_id, title, slug, custom_domain, updated_at")
        .eq("published", true)
        .order("updated_at", { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

      if (error) {
        loadError = "De gepubliceerde websites konden niet worden geladen."
        break
      }

      const pageRows = (data ?? []) as PublishedWebsite[]
      websites.push(...pageRows)
      if (pageRows.length < PAGE_SIZE) break
    }

    for (let page = 0; websites.length > 0; page += 1) {
      const { data, error } = await admin
        .from("website_domains")
        .select("website_id, domain, is_primary, status")
        .eq("status", "active")
        .order("is_primary", { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

      if (error) {
        loadError ||= "Domeinnamen konden niet volledig worden geladen; de compatibiliteitswaarde wordt getoond."
        break
      }

      const pageRows = (data ?? []) as WebsiteDomain[]
      domains.push(...pageRows)
      if (pageRows.length < PAGE_SIZE) break
    }

    for (let page = 1; ; page += 1) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: PAGE_SIZE })
      if (error) {
        loadError ||= "Gebruikersgegevens konden niet volledig worden geladen."
        break
      }

      for (const authUser of data.users) {
        owners.set(authUser.id, {
          email: authUser.email ?? null,
          name: getOwnerName(authUser.user_metadata as Record<string, unknown> | undefined),
        })
      }

      if (data.users.length < PAGE_SIZE || owners.size >= data.total) break
    }
  }

  const primaryDomains = new Map<string, string>()
  for (const domain of domains) {
    if (!primaryDomains.has(domain.website_id) || domain.is_primary) {
      primaryDomains.set(domain.website_id, domain.domain)
    }
  }

  const rows = websites
    .map((website) => {
      const owner = owners.get(website.user_id)
      const customDomain = primaryDomains.get(website.id) ?? website.custom_domain
      const publicUrl = customDomain
        ? `https://${customDomain}`
        : `https://${website.slug}.${PLATFORM_DOMAIN}`

      return {
        ...website,
        owner,
        customDomain,
        publicUrl,
      }
    })
    .filter((website) => {
      if (!query) return true
      const haystack = [
        website.owner?.name,
        website.owner?.email,
        website.user_id,
        website.title,
        website.slug,
        website.customDomain,
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("nl-NL")

      return haystack.includes(query.toLocaleLowerCase("nl-NL"))
    })

  return (
    <main className="min-h-screen bg-[var(--hero-bg)] text-white">
      <SharedHeader title="Gepubliceerde websites" />
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-[var(--brand-blue)]">Alleen beheerders</p>
            <h1 className="mt-2 text-3xl font-bold sm:text-4xl">Gepubliceerde websites</h1>
            <p className="mt-2 text-sm text-white/60">
              {rows.length.toLocaleString("nl-NL")} van {websites.length.toLocaleString("nl-NL")} live websites zichtbaar.
            </p>
          </div>
          <Link href="/admin" className="text-sm font-medium text-[var(--brand-blue)] hover:text-white">
            Terug naar adminoverzicht
          </Link>
        </div>

        {loadError ? (
          <div role="alert" className="mb-6 rounded-xl border border-yellow-300/25 bg-yellow-300/10 p-4 text-sm text-yellow-100">
            {loadError}
          </div>
        ) : null}

        <form method="get" className="mb-6 flex flex-col gap-3 sm:flex-row">
          <label className="relative block min-w-0 flex-1">
            <span className="sr-only">Zoek gepubliceerde websites</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/40" aria-hidden="true" />
            <input
              type="search"
              name="q"
              defaultValue={query}
              placeholder="Zoek op gebruiker, website of domein"
              className="h-11 w-full rounded-xl border border-white/15 bg-white/5 pl-10 pr-4 text-sm text-white outline-none placeholder:text-white/35 focus:border-[var(--brand-blue)]"
            />
          </label>
          <button type="submit" className="h-11 rounded-xl bg-[var(--brand-blue)] px-5 text-sm font-semibold text-[var(--hero-bg)] transition hover:brightness-110">
            Zoeken
          </button>
          {query ? (
            <Link href="/admin/websites" className="flex h-11 items-center justify-center rounded-xl border border-white/15 px-5 text-sm font-medium text-white/70 hover:bg-white/5 hover:text-white">
              Wissen
            </Link>
          ) : null}
        </form>

        {rows.length ? (
          <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/5">
            <table className="min-w-full divide-y divide-white/10 text-left text-sm">
              <thead className="bg-white/5 text-xs uppercase tracking-wide text-white/55">
                <tr>
                  <th className="px-4 py-3 sm:px-5">Gebruiker</th>
                  <th className="px-4 py-3 sm:px-5">Website</th>
                  <th className="px-4 py-3 sm:px-5">Domeinnaam</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {rows.map((website) => (
                  <tr key={website.id} className="transition-colors hover:bg-white/[0.04]">
                    <td className="px-4 py-4 sm:px-5">
                      <p className="font-medium">{website.owner?.name || website.owner?.email || "Onbekende gebruiker"}</p>
                      <p className="mt-1 break-all text-xs text-white/45">
                        {website.owner?.name && website.owner.email ? website.owner.email : website.user_id}
                      </p>
                    </td>
                    <td className="px-4 py-4 sm:px-5">
                      <a href={website.publicUrl} target="_blank" rel="noreferrer" className="group inline-flex items-center gap-2 font-medium text-[var(--brand-blue)] hover:text-white">
                        {website.title || website.slug}
                        <ExternalLink className="size-3.5 opacity-60" aria-hidden="true" />
                      </a>
                      <p className="mt-1 text-xs text-white/45">{website.slug}.{PLATFORM_DOMAIN}</p>
                    </td>
                    <td className="px-4 py-4 sm:px-5">
                      {website.customDomain ? (
                        <a href={`https://${website.customDomain}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 font-mono text-sm text-white/80 hover:text-[var(--brand-blue)]">
                          <Globe2 className="size-4 text-[var(--brand-blue)]" aria-hidden="true" />
                          {website.customDomain}
                        </a>
                      ) : (
                        <span className="text-white/35">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.03] p-10 text-center">
            <Globe2 className="mx-auto size-7 text-white/35" aria-hidden="true" />
            <p className="mt-3 font-medium">{query ? "Geen websites gevonden" : "Nog geen gepubliceerde websites"}</p>
            <p className="mt-1 text-sm text-white/45">
              {query ? "Pas de zoekopdracht aan of wis het filter." : "Zodra een website live staat, verschijnt die hier."}
            </p>
          </div>
        )}
      </div>
    </main>
  )
}
