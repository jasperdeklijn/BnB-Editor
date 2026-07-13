import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"
import { analyzeWebsite } from "@/lib/leads/analyzeWebsite"
import { calculateLeadScore } from "@/lib/leads/calculateLeadScore"
import { generateLeadInsight } from "@/lib/leads/generateLeadInsight"
import { getPageSpeedScore } from "@/lib/leads/getPageSpeedScore"
import { saveLead } from "@/lib/leads/saveLead"

type GooglePlace = {
  id?: string
  displayName?: { text?: string }
  formattedAddress?: string
  nationalPhoneNumber?: string
  websiteUri?: string
  rating?: number
  userRatingCount?: number
}

type PlacesResponse = {
  places?: GooglePlace[]
  nextPageToken?: string
  error?: { message?: string }
}

export type LeadSearchResult = {
  found: number
  saved: number
  created: number
  updated: number
  failed: number
}

function normalizeWebsite(value: string | undefined) {
  if (!value) return null
  try {
    const url = new URL(value)
    url.hash = ""
    if (url.pathname === "/") url.pathname = ""
    return url.toString().replace(/\/$/, "")
  } catch {
    return null
  }
}

async function searchGooglePlaces(input: { city: string; category: string; limit: number }, apiKey: string) {
  const places: GooglePlace[] = []
  let pageToken: string | undefined

  while (places.length < input.limit) {
    const pageSize = Math.min(20, input.limit - places.length)
    const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.websiteUri,places.rating,places.userRatingCount,nextPageToken",
      },
      body: JSON.stringify({
        textQuery: `${input.category} in ${input.city}, Nederland`,
        pageSize,
        pageToken,
        languageCode: "nl",
        regionCode: "NL",
      }),
      cache: "no-store",
    })

    const data = (await response.json().catch(() => null)) as PlacesResponse | null
    if (!response.ok) {
      console.error("[lead-search] Google Places request failed", { status: response.status })
      throw new Error(data?.error?.message || "Google Places kon geen resultaten ophalen.")
    }

    places.push(...(data?.places ?? []))
    if (!data?.nextPageToken || (data.places?.length ?? 0) === 0) break
    pageToken = data.nextPageToken
  }

  const unique = new Map<string, GooglePlace>()
  for (const place of places) {
    const website = normalizeWebsite(place.websiteUri)
    const key = place.id || website || `${place.displayName?.text ?? ""}:${place.formattedAddress ?? ""}`.toLowerCase()
    if (key && !unique.has(key)) unique.set(key, place)
  }

  return [...unique.values()].slice(0, input.limit)
}

async function processInBatches<T, R>(items: T[], batchSize: number, process: (item: T) => Promise<R>) {
  const results: PromiseSettledResult<R>[] = []
  for (let index = 0; index < items.length; index += batchSize) {
    results.push(...await Promise.allSettled(items.slice(index, index + batchSize).map(process)))
  }
  return results
}

export async function runLeadSearch(input: {
  supabase: SupabaseClient
  city: string
  category: string
  limit: number
}): Promise<LeadSearchResult> {
  const placesApiKey = process.env.GOOGLE_PLACES_API_KEY?.trim()
  if (!placesApiKey) throw new Error("GOOGLE_PLACES_API_KEY is niet ingesteld op de server.")

  const places = await searchGooglePlaces(input, placesApiKey)
  const results = await processInBatches(places, 3, async (place) => {
    const companyName = place.displayName?.text?.trim()
    if (!companyName) throw new Error("Bedrijfsnaam ontbreekt")

    const website = normalizeWebsite(place.websiteUri)
    const [analysis, pageSpeed] = await Promise.all([
      analyzeWebsite(website),
      getPageSpeedScore(website),
    ])
    const leadScore = calculateLeadScore({ analysis, pagespeedScore: pageSpeed.score })
    const insight = await generateLeadInsight({
      companyName,
      category: input.category,
      city: input.city,
      website: website ?? undefined,
      analysis,
      pagespeedScore: pageSpeed.score,
      leadScore,
    })

    return saveLead(input.supabase, {
      companyName,
      category: input.category,
      city: input.city,
      website,
      phone: place.nationalPhoneNumber?.trim() || null,
      googlePlaceId: place.id?.trim() || null,
      googleRating: typeof place.rating === "number" ? place.rating : null,
      googleReviewsCount: typeof place.userRatingCount === "number" ? place.userRatingCount : null,
      analysis,
      pagespeedScore: pageSpeed.score,
      leadScore,
      reason: insight.reason,
      outreachDraft: insight.outreachDraft,
    })
  })

  const successful = results.filter((result): result is PromiseFulfilledResult<Awaited<ReturnType<typeof saveLead>>> => result.status === "fulfilled")
  const created = successful.filter((result) => result.value.action === "created").length
  const updated = successful.length - created
  const failed = results.length - successful.length

  if (failed > 0) console.warn("[lead-search] Some leads could not be processed", { failed, total: results.length })

  return {
    found: places.length,
    saved: successful.length,
    created,
    updated,
    failed,
  }
}
