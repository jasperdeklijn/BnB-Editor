import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"
import type { LeadAgentSettings } from "@/lib/leads/types"

export const DEFAULT_LEAD_AGENT_SETTINGS: LeadAgentSettings = {
  singleton_key: true,
  enabled: false,
  cities: ["Uden"],
  categories: ["kapper"],
  weekly_limit: 25,
  email_notifications_enabled: true,
  created_at: "",
  updated_at: "",
}

export async function getLeadAgentSettings(supabase: SupabaseClient): Promise<LeadAgentSettings> {
  const { data, error } = await supabase
    .from("lead_agent_settings")
    .select("*")
    .eq("singleton_key", true)
    .maybeSingle()

  if (error) throw error
  return data ? data as LeadAgentSettings : DEFAULT_LEAD_AGENT_SETTINGS
}
