"use server"

import { createClient } from "@/lib/supabase/server"

export interface Business {
  id: string
  user_id: string
  name: string
  category: string
  tagline: string | null
  description: string | null
  street: string | null
  city: string | null
  postal: string | null
  country: string | null
  contact_email: string | null
  phone: string | null
  whatsapp: string | null
  website_url: string | null
  opening_note: string | null
  appointment_start_time: string | null
  appointment_end_time: string | null
  capacity: number | null
  languages: string | null
  created_at: string
  updated_at: string
}

export type BusinessInput = Omit<Business, "id" | "user_id" | "created_at" | "updated_at">

type LegacyBusinessRow = {
  id: string
  user_id: string
  name: string
  tagline: string | null
  description: string | null
  street: string | null
  city: string | null
  postal: string | null
  country: string | null
  checkin_time: string | null
  checkout_time: string | null
  max_guests: number | null
  languages: string | null
  website_url: string | null
  created_at: string
  updated_at: string
}

function parseBusiness(row: LegacyBusinessRow, categoryHint?: string): Business {
  return {
    id: row.id,
    user_id: row.user_id,
    name: row.name,
    // category and contact fields are not yet in the bnbs table; preserved via categoryHint
    // until Milestone 8 adds the new columns.
    category: categoryHint ?? "general_service",
    tagline: row.tagline,
    description: row.description,
    street: row.street,
    city: row.city,
    postal: row.postal,
    country: row.country,
    contact_email: null,
    phone: null,
    whatsapp: null,
    website_url: row.website_url,
    // opening_note is stored in checkin_time until Milestone 8.
    opening_note: row.checkin_time ?? null,
    // appointment_start_time and appointment_end_time map to check-in/out for now.
    appointment_start_time: row.checkin_time ?? null,
    appointment_end_time: row.checkout_time ?? null,
    capacity: row.max_guests,
    languages: row.languages,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

function toLegacyBusinessUpdates(updates: Partial<BusinessInput>): Record<string, unknown> {
  const payload: Record<string, unknown> = {}

  if (updates.name !== undefined) payload.name = updates.name
  if (updates.tagline !== undefined) payload.tagline = updates.tagline
  if (updates.description !== undefined) payload.description = updates.description
  if (updates.street !== undefined) payload.street = updates.street
  if (updates.city !== undefined) payload.city = updates.city
  if (updates.postal !== undefined) payload.postal = updates.postal
  if (updates.country !== undefined) payload.country = updates.country
  if (updates.website_url !== undefined) payload.website_url = updates.website_url
  if (updates.languages !== undefined) payload.languages = updates.languages
  // opening_note is stored in checkin_time until the DB migration in Milestone 8.
  if (updates.opening_note !== undefined) payload.checkin_time = updates.opening_note
  if (updates.appointment_start_time !== undefined) payload.checkin_time = updates.appointment_start_time
  if (updates.appointment_end_time !== undefined) payload.checkout_time = updates.appointment_end_time
  if (updates.capacity !== undefined) payload.max_guests = updates.capacity
  // category, contact_email, phone, whatsapp are not yet columns in bnbs — skipped until M8.

  return payload
}

export async function getOrCreateBusiness(): Promise<Business> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error("Not authenticated")

  const { data: existing, error: fetchError } = await supabase
    .from("bnbs")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle()

  if (fetchError) throw fetchError
  if (existing) return parseBusiness(existing as LegacyBusinessRow)

  const { data: created, error: createError } = await supabase
    .from("bnbs")
    .insert({ user_id: user.id, name: "Mijn bedrijf" })
    .select("*")
    .single()

  if (createError) throw createError
  return parseBusiness(created as LegacyBusinessRow)
}

export async function updateBusiness(
  businessId: string,
  updates: Partial<BusinessInput>,
): Promise<Business> {
  const supabase = await createClient()
  const payload = toLegacyBusinessUpdates(updates)

  const { data, error } = await supabase
    .from("bnbs")
    .update(payload)
    .eq("id", businessId)
    .select("*")
    .single()

  if (error) throw error
  // Pass category back as a hint so it survives the round-trip until M8 adds the column.
  return parseBusiness(data as LegacyBusinessRow, updates.category)
}
