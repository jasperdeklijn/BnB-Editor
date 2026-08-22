import "server-only"

import { cache } from "react"
import { createClient } from "@/lib/supabase/server"
import type { BusinessCategory } from "@/lib/business/categories"

export const getEditorBootstrap = cache(async () => {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getUser()
  const user = error ? null : data.user

  if (!user) {
    return {
      supabase,
      user: null,
      avatarUrl: null,
      displayName: null,
      businessId: null,
      businessCategory: null,
      onboardingCompleted: false,
    }
  }

  const authMetadata = (user.user_metadata as Record<string, unknown> | null) ?? {}
  const [{ data: profile }, { data: business }] = await Promise.all([
    supabase
      .from("profiles")
      .select("avatar_url, full_name, onboarding_completed_at")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("businesses")
      .select("id, category")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle(),
  ])

  return {
    supabase,
    user,
    avatarUrl:
      profile?.avatar_url ??
      (typeof authMetadata.avatar_url === "string" ? authMetadata.avatar_url : null),
    displayName:
      profile?.full_name ??
      (typeof authMetadata.full_name === "string" ? authMetadata.full_name : null),
    businessId: business?.id ?? null,
    businessCategory: (business?.category as BusinessCategory | null) ?? null,
    onboardingCompleted: Boolean(profile?.onboarding_completed_at),
  }
})
