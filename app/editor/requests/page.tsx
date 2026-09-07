import { redirect } from "next/navigation"

import { RequestsClient } from "@/components/requests/requests-client"
import { EditorPageShell } from "@/components/editor/editor-page-shell"
import { getInquiryDetail, getInquiryOverview, getInquiryReplyTemplates, parseInquiryFilters, type InquiryDetail, type InquiryOverview, type InquiryReplyTemplate } from "@/lib/inquiries"
import { getOrCreateBusiness } from "@/lib/supabase/business"
import { createClient } from "@/lib/supabase/server"

export const metadata = {
  title: "Aanvragen | Website Maker",
  description: "Volg website-aanvragen, reacties en opvolgmomenten.",
}

type SearchParams = Record<string, string | string[] | undefined>

function emptyOverview(): InquiryOverview {
  return {
    items: [],
    total: 0,
    page: 1,
    pageSize: 25,
    pageCount: 1,
    counts: { new: 0, in_progress: 0, awaiting_customer: 0, won: 0, lost: 0, spam: 0, archived: 0 },
    followUpDue: 0,
  }
}

export default async function RequestsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) redirect("/auth/login")

  const business = await getOrCreateBusiness()
  const filters = parseInquiryFilters(params)
  const selectedValue = Array.isArray(params.request) ? params.request[0] : params.request
  let overview = emptyOverview()
  let selected: InquiryDetail | null = null
  let replyTemplates: InquiryReplyTemplate[] = []
  let schemaError: string | null = null
  let detailError: string | null = null

  try {
    overview = await getInquiryOverview(business.id, filters)
    replyTemplates = await getInquiryReplyTemplates(business.id)
  } catch (inboxError) {
    console.error("[inquiries] Failed to load inbox", inboxError)
    schemaError = "Aanvragen konden niet worden geladen. Pas eerst de inbox-migratie toe."
  }

  if (selectedValue) {
    try {
      selected = await getInquiryDetail(business.id, selectedValue)
    } catch (inquiryError) {
      console.error("[inquiries] Failed to load enquiry detail", inquiryError)
      detailError = "Deze aanvraag bestaat niet, hoort niet bij uw bedrijf, of de inbox-migratie ontbreekt."
    }
  }

  return (
    <EditorPageShell
      title="Aanvragen"
      description="Volg nieuwe berichten, reacties en opvolgmomenten op één plek."
      maxWidth="full"
    >
      <RequestsClient
        businessId={business.id}
        overview={overview}
        filters={filters}
        selected={selected}
        replyTemplates={replyTemplates}
        schemaError={schemaError}
        detailError={detailError}
      />
    </EditorPageShell>
  )
}
