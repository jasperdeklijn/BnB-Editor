import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"
import type { WebsiteAnalysis } from "@/lib/leads/types"

export type SaveLeadInput = {
  companyName: string
  category: string
  city: string
  website: string | null
  phone: string | null
  email?: string | null
  googlePlaceId: string | null
  googleRating: number | null
  googleReviewsCount: number | null
  analysis: WebsiteAnalysis
  pagespeedScore: number | null
  leadScore: number
  reason: string
  outreachDraft: string
}

function toRow(input: SaveLeadInput) {
  return {
    company_name: input.companyName,
    category: input.category,
    city: input.city,
    website: input.website,
    phone: input.phone,
    email: input.email ?? null,
    google_place_id: input.googlePlaceId,
    google_rating: input.googleRating,
    google_reviews_count: input.googleReviewsCount,
    has_website: input.analysis.hasWebsite,
    has_https: input.analysis.hasHttps,
    has_mobile_meta: input.analysis.hasMobileMeta,
    has_contact_form: input.analysis.hasContactForm,
    has_clear_cta: input.analysis.hasClearCta,
    pagespeed_score: input.pagespeedScore,
    seo_title: input.analysis.seoTitle,
    seo_description: input.analysis.seoDescription,
    lead_score: input.leadScore,
    reason: input.reason,
    outreach_draft: input.outreachDraft,
  }
}

export async function saveLead(supabase: SupabaseClient, input: SaveLeadInput) {
  const row = toRow(input)
  let existingId: string | null = null

  if (input.googlePlaceId) {
    const { data } = await supabase
      .from("leads")
      .select("id")
      .eq("google_place_id", input.googlePlaceId)
      .maybeSingle()
    existingId = data?.id ?? null
  }

  if (!existingId && input.website) {
    const { data } = await supabase
      .from("leads")
      .select("id")
      .eq("website", input.website)
      .maybeSingle()
    existingId = data?.id ?? null
  }

  if (existingId) {
    const { data, error } = await supabase
      .from("leads")
      .update(row)
      .eq("id", existingId)
      .select("id")
      .single()
    if (error) throw error
    return { id: data.id as string, action: "updated" as const }
  }

  const { data, error } = await supabase
    .from("leads")
    .insert({ ...row, status: "new" })
    .select("id")
    .single()

  if (error) throw error
  return { id: data.id as string, action: "created" as const }
}
