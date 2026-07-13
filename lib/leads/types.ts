export const LEAD_STATUSES = [
  "new",
  "interesting",
  "contacted",
  "not_interested",
  "customer",
  "ignored",
] as const

export type LeadStatus = (typeof LEAD_STATUSES)[number]

export type WebsiteAnalysis = {
  hasWebsite: boolean
  hasHttps: boolean
  hasMobileMeta: boolean
  hasContactForm: boolean
  hasClearCta: boolean
  seoTitle: string | null
  seoDescription: string | null
}

export type LeadRecord = {
  id: string
  company_name: string
  category: string | null
  city: string | null
  website: string | null
  phone: string | null
  email: string | null
  google_place_id: string | null
  google_rating: number | null
  google_reviews_count: number | null
  has_website: boolean
  has_https: boolean
  has_mobile_meta: boolean
  has_contact_form: boolean
  has_clear_cta: boolean
  pagespeed_score: number | null
  seo_title: string | null
  seo_description: string | null
  lead_score: number
  reason: string | null
  outreach_draft: string | null
  status: LeadStatus
  notes: string | null
  created_at: string
  updated_at: string
}

export type LeadAgentSettings = {
  singleton_key: true
  enabled: boolean
  cities: string[]
  categories: string[]
  weekly_limit: number
  email_notifications_enabled: boolean
  created_at: string
  updated_at: string
}

export type LeadAgentRunStatus = "running" | "succeeded" | "partial" | "failed" | "skipped"

export type LeadAgentRun = {
  id: string
  run_key: string
  trigger: "cron" | "manual"
  status: LeadAgentRunStatus
  requested_limit: number
  found_count: number
  created_count: number
  updated_count: number
  failed_count: number
  error_message: string | null
  notification_sent: boolean
  started_at: string
  completed_at: string | null
}
