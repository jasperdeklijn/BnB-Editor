import "server-only"

import type { WebsiteAnalysis } from "@/lib/leads/types"

type LeadInsightInput = {
  companyName: string
  category: string
  city: string
  website?: string
  analysis: WebsiteAnalysis
  pagespeedScore?: number | null
  leadScore: number
}

type LeadInsight = {
  reason: string
  outreachDraft: string
}

function getImprovementLabels(input: LeadInsightInput) {
  const labels: string[] = []
  if (!input.analysis.hasWebsite) labels.push("er geen werkende website is gevonden")
  if (input.pagespeedScore !== null && input.pagespeedScore !== undefined && input.pagespeedScore < 50) labels.push("de mobiele website traag scoort")
  if (input.analysis.hasWebsite && !input.analysis.hasHttps) labels.push("HTTPS ontbreekt")
  if (input.analysis.hasWebsite && !input.analysis.hasMobileMeta) labels.push("mobiele optimalisatie niet duidelijk is ingesteld")
  if (input.analysis.hasWebsite && !input.analysis.hasContactForm) labels.push("een contactformulier ontbreekt")
  if (input.analysis.hasWebsite && !input.analysis.hasClearCta) labels.push("een duidelijke oproep tot actie ontbreekt")
  if (input.analysis.hasWebsite && !input.analysis.seoTitle) labels.push("de SEO-titel ontbreekt")
  if (input.analysis.hasWebsite && !input.analysis.seoDescription) labels.push("de meta-omschrijving ontbreekt")
  return labels
}

function createFallback(input: LeadInsightInput): LeadInsight {
  const improvements = getImprovementLabels(input)
  const summary = improvements.length > 0
    ? improvements.slice(0, 3).join(", ")
    : "de online presentatie verder aangescherpt kan worden"

  return {
    reason: `${input.companyName} heeft een lead-score van ${input.leadScore}/100, omdat ${summary}.`,
    outreachDraft: `Onderwerp: Een idee voor de website van ${input.companyName}\n\nGoedendag,\n\nTijdens een openbare zoekopdracht naar ${input.category} in ${input.city} viel mij op dat ${summary}. Wij helpen kleine ondernemers met een duidelijke, moderne website die bezoekers makkelijk laat vinden wat ze zoeken.\n\nZou u het prettig vinden als ik vrijblijvend een kort voorbeeld deel van hoe dit verbeterd kan worden?\n\nMet vriendelijke groet,\nFlexpagina`,
  }
}

function getResponseText(data: unknown) {
  if (!data || typeof data !== "object" || !("output" in data) || !Array.isArray(data.output)) return null

  for (const item of data.output) {
    if (!item || typeof item !== "object" || !("content" in item) || !Array.isArray(item.content)) continue
    for (const content of item.content) {
      if (content && typeof content === "object" && "type" in content && content.type === "output_text" && "text" in content && typeof content.text === "string") {
        return content.text
      }
    }
  }

  return null
}

export async function generateLeadInsight(input: LeadInsightInput): Promise<LeadInsight> {
  const fallback = createFallback(input)
  const apiKey = process.env.AI_GATEWAY_API_KEY?.trim() || process.env.VERCEL_OIDC_TOKEN?.trim()
  if (!apiKey) return fallback

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 20_000)

  try {
    const response = await fetch("https://ai-gateway.vercel.sh/v1/responses", {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-5.4-mini",
        instructions: "Je bent een Nederlandse sales assistant voor een SaaS website builder voor kleine ondernemers en ZZP'ers. Geef uitsluitend geldige JSON met de sleutels reason en outreachDraft.",
        input: `Schrijf 1. een korte interne reden waarom deze lead interessant is en 2. een vriendelijke outreach-conceptmail.\n\nRegels:\n- Niet agressief verkopen.\n- Niet doen alsof we de ondernemer persoonlijk kennen.\n- Geen harde claims maken als die niet zeker zijn.\n- Maximaal 120 woorden voor de mail.\n- Schrijf in het Nederlands.\n- Noem concreet wat verbeterd kan worden.\n- Eindig met een laagdrempelige vraag.\n\nLeadgegevens:\n${JSON.stringify(input)}`,
        max_output_tokens: 500,
      }),
    })

    if (!response.ok) return fallback
    const text = getResponseText(await response.json())
    if (!text) return fallback

    const parsed = JSON.parse(text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "")) as Partial<LeadInsight>
    if (typeof parsed.reason !== "string" || typeof parsed.outreachDraft !== "string") return fallback

    return {
      reason: parsed.reason.trim().slice(0, 1_500) || fallback.reason,
      outreachDraft: parsed.outreachDraft.trim().slice(0, 4_000) || fallback.outreachDraft,
    }
  } catch {
    return fallback
  } finally {
    clearTimeout(timeout)
  }
}
