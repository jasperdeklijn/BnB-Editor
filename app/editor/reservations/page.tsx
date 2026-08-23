import { redirect } from "next/navigation"
import { ReservationsClient, type ReservationDetailData } from "@/components/booking/reservations-client"
import { EditorPageShell } from "@/components/editor/editor-page-shell"
import { getBookingFinanceData, type BookingFinanceData } from "@/lib/booking/invoicing"
import { getBookingLifecycleData, type BookingLifecycleData } from "@/lib/booking/lifecycle"
import {
  getOwnedReservation,
  getReservationsOverview,
  parseReservationOverviewFilters,
  type ReservationOverviewResult,
} from "@/lib/booking/reservations"
import { getOfferingCopy } from "@/lib/business/categories"
import { getUserRuntimeEntitlement } from "@/lib/runtime-entitlements"
import { getOrCreateBusiness } from "@/lib/supabase/business"
import { createClient } from "@/lib/supabase/server"
import { getServices } from "@/lib/supabase/services"

export const metadata = {
  title: "Reserveringen | Website Maker",
  description: "Bekijk en beheer alle reserveringen en hun actuele status.",
}

type SearchParams = Record<string, string | string[] | undefined>

function emptyOverview(page: number): ReservationOverviewResult {
  return {
    items: [],
    total: 0,
    page,
    pageSize: 25,
    pageCount: 1,
    statusCounts: { pending: 0, confirmed: 0, cancelled: 0, completed: 0, blocked: 0 },
    financeUnavailable: false,
  }
}

function defaultFinanceData(business: Awaited<ReturnType<typeof getOrCreateBusiness>>): BookingFinanceData {
  return {
    financials: [],
    invoices: [],
    profile: {
      business_id: business.id,
      legal_name: business.name,
      address_line1: business.street || "",
      address_line2: "",
      postal_code: business.postal || "",
      city: business.city || "",
      country_code: (business.country || "NL").slice(0, 2).toUpperCase(),
      email: business.contact_email || "",
      vat_id: business.vat_number || "",
      kvk_number: business.chamber_of_commerce_number || "",
      iban: "",
      default_vat_basis_points: 2100,
      invoice_prefix: "F",
      credit_note_prefix: "CR",
      payment_term_days: 14,
      accent_color: "#385344",
    },
  }
}

export default async function ReservationsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) redirect("/auth/login")

  const business = await getOrCreateBusiness()
  const offeringCopy = getOfferingCopy(business.category)
  const filters = parseReservationOverviewFilters(params)
  const services = await getServices(business.id)
  const entitlement = await getUserRuntimeEntitlement(supabase, data.user.id, "booking_management")

  let overview = emptyOverview(filters.page)
  let schemaError: string | null = null
  try {
    overview = await getReservationsOverview(business.id, filters)
  } catch (overviewError) {
    console.error("[reservations] Failed to load overview", overviewError)
    schemaError = "Reserveringen konden niet worden geladen. Controleer of de boekingsmigraties zijn toegepast."
  }

  const selectedParam = Array.isArray(params.reservation) ? params.reservation[0] : params.reservation
  let detail: ReservationDetailData | null = null
  let detailError: string | null = null
  if (selectedParam) {
    try {
      const entry = await getOwnedReservation(business.id, selectedParam)
      if (!entry) {
        detailError = "Deze reservering bestaat niet of hoort niet bij uw bedrijf."
      } else {
        let lifecycle: BookingLifecycleData = { history: [], changeRequests: [] }
        let lifecycleUnavailable = false
        let finance = defaultFinanceData(business)
        let financeUnavailable = false

        if (entry.metadata?.source === "booking_engine") {
          const [lifecycleResult, financeResult] = await Promise.allSettled([
            getBookingLifecycleData(business.id, entry.id),
            getBookingFinanceData(business.id, entry.id),
          ])
          if (lifecycleResult.status === "fulfilled") lifecycle = lifecycleResult.value
          else lifecycleUnavailable = true
          if (financeResult.status === "fulfilled") finance = financeResult.value
          else financeUnavailable = true
        }

        detail = {
          entry,
          lifecycle,
          lifecycleUnavailable,
          financial: finance.financials[0] ?? null,
          invoices: finance.invoices,
          invoiceProfile: finance.profile,
          financeUnavailable,
        }
      }
    } catch (selectedError) {
      console.error("[reservations] Failed to load detail", selectedError)
      detailError = "De reserveringsdetails konden niet worden geladen."
    }
  }

  return (
    <EditorPageShell
      title="Reserveringen"
      description="Bekijk aanvragen, bevestigde reserveringen en afgeronde of geannuleerde historie op één plek."
      maxWidth="full"
    >
      <ReservationsClient
        businessId={business.id}
        overview={overview}
        filters={filters}
        services={services}
        offeringCopy={offeringCopy}
        detail={detail}
        detailError={detailError}
        schemaError={schemaError}
        canManage={entitlement.allowed}
      />
    </EditorPageShell>
  )
}

