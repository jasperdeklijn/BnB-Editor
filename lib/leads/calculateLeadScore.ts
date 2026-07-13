import type { WebsiteAnalysis } from "@/lib/leads/types"

export const LEAD_SCORE_WEIGHTS = {
  missingWebsite: 40,
  slowWebsite: 25,
  missingHttps: 10,
  missingMobileMeta: 10,
  missingContactForm: 10,
  missingClearCta: 10,
  missingSeoTitle: 5,
  missingSeoDescription: 5,
} as const

export function calculateLeadScore(input: {
  analysis: WebsiteAnalysis
  pagespeedScore: number | null
}) {
  const { analysis, pagespeedScore } = input
  let score = 0

  if (!analysis.hasWebsite) score += LEAD_SCORE_WEIGHTS.missingWebsite
  if (pagespeedScore !== null && pagespeedScore < 50) score += LEAD_SCORE_WEIGHTS.slowWebsite
  if (!analysis.hasHttps) score += LEAD_SCORE_WEIGHTS.missingHttps
  if (!analysis.hasMobileMeta) score += LEAD_SCORE_WEIGHTS.missingMobileMeta
  if (!analysis.hasContactForm) score += LEAD_SCORE_WEIGHTS.missingContactForm
  if (!analysis.hasClearCta) score += LEAD_SCORE_WEIGHTS.missingClearCta
  if (!analysis.seoTitle) score += LEAD_SCORE_WEIGHTS.missingSeoTitle
  if (!analysis.seoDescription) score += LEAD_SCORE_WEIGHTS.missingSeoDescription

  return Math.min(score, 100)
}
