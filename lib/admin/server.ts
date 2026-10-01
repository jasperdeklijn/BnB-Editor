import "server-only"
import { cache } from "react"
import { notFound, redirect } from "next/navigation"
import { isAdmin } from "@/lib/security"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import type { AdminDomain, AdminSubscription, AdminWebsite, Customer } from "./model"

export const requireAdmin = cache(async () => {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) redirect("/auth/login")
  if (!isAdmin(user)) notFound()
  return user
})

export const adminDatabase = cache(async () => {
  await requireAdmin()
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error("De serverconfiguratie voor beheer ontbreekt.")
  return createAdminClient()
})

type AdminClient = Awaited<ReturnType<typeof adminDatabase>>
export const websiteColumns = "id,user_id,title,slug,custom_domain,published,created_at,updated_at,applied_template_id"

// The Auth admin API has no name/email filter. Page through it server-side;
// never turn a failed page into a plausible but incomplete search/count.
export const allCustomers = cache(async (admin: AdminClient): Promise<Customer[]> => {
  const customers: Customer[] = []
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) throw error
    customers.push(...data.users)
    if (data.users.length === 0 || customers.length >= data.total) return customers
  }
})

export async function allRows<T>(page: (from: number, to: number) => PromiseLike<{ data: unknown[] | null; error: unknown }>): Promise<T[]> {
  const rows: T[] = []
  let offset = 0
  // Advance by received rows so even a hosted API cap below 500 is respected.
  for (;;) {
    const { data, error } = await page(offset, offset + 499)
    if (error) throw error
    if (!data?.length) return rows
    rows.push(...data as T[]); offset += data.length
  }
}

export const allWebsites = cache(async (admin: AdminClient) =>
  allRows<AdminWebsite>((from, to) => admin.from("websites").select(websiteColumns).order("id").range(from, to)),
)

export const customerDirectory = cache(async () => {
  const admin = await adminDatabase()
  const [customers, websites, domains, subscriptions] = await Promise.allSettled([
    allCustomers(admin),
    allWebsites(admin),
    allRows<AdminDomain>((from, to) => admin.from("website_domains").select("website_id,domain,status,is_primary").order("id").range(from, to)),
    allRows<AdminSubscription>((from, to) => admin.from("subscriptions").select("user_id,plan_id,status,current_price,currency,current_period_end").order("id").range(from, to)),
  ])
  return {
    customers: customers.status === "fulfilled" ? customers.value : [],
    websites: websites.status === "fulfilled" ? websites.value : [],
    domains: domains.status === "fulfilled" ? domains.value : [],
    subscriptions: subscriptions.status === "fulfilled" ? subscriptions.value : [],
    errors: [customers.status === "rejected" && "Klanten", websites.status === "rejected" && "Websites", domains.status === "rejected" && "Domeinen", subscriptions.status === "rejected" && "Abonnementen"].filter(Boolean) as string[],
  }
})
