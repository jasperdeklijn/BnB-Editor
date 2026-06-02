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

type BusinessRow = {
  id: string
  user_id: string
  name: string
  category: string | null
  tagline: string | null
  description: string | null
  email: string | null
  phone: string | null
  whatsapp: string | null
  website_url: string | null
  street: string | null
  city: string | null
  postal: string | null
  country: string | null
  opening_note: string | null
  appointment_start_time: string | null
  appointment_end_time: string | null
  capacity: number | null
  languages: string | null
  created_at: string
  updated_at: string
}

function parseBusiness(row: BusinessRow): Business {
  return {
    id: row.id,
    user_id: row.user_id,
    name: row.name,
    category: row.category ?? "general_service",
    tagline: row.tagline,
    description: row.description,
    street: row.street,
    city: row.city,
    postal: row.postal,
    country: row.country,
    contact_email: row.email,
    phone: row.phone,
    whatsapp: row.whatsapp,
    website_url: row.website_url,
    opening_note: row.opening_note,
    appointment_start_time: row.appointment_start_time,
    appointment_end_time: row.appointment_end_time,
    capacity: row.capacity,
    languages: row.languages,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

function toBusinessPayload(updates: Partial<BusinessInput>): Record<string, unknown> {
  const payload: Record<string, unknown> = {}

  if (updates.name !== undefined) payload.name = updates.name
  if (updates.category !== undefined) payload.category = updates.category
  if (updates.tagline !== undefined) payload.tagline = updates.tagline
  if (updates.description !== undefined) payload.description = updates.description
  if (updates.contact_email !== undefined) payload.email = updates.contact_email
  if (updates.phone !== undefined) payload.phone = updates.phone
  if (updates.whatsapp !== undefined) payload.whatsapp = updates.whatsapp
  if (updates.street !== undefined) payload.street = updates.street
  if (updates.city !== undefined) payload.city = updates.city
  if (updates.postal !== undefined) payload.postal = updates.postal
  if (updates.country !== undefined) payload.country = updates.country
  if (updates.website_url !== undefined) payload.website_url = updates.website_url
  if (updates.languages !== undefined) payload.languages = updates.languages
  if (updates.opening_note !== undefined) payload.opening_note = updates.opening_note
  if (updates.appointment_start_time !== undefined) {
    payload.appointment_start_time = updates.appointment_start_time
  }
  if (updates.appointment_end_time !== undefined) {
    payload.appointment_end_time = updates.appointment_end_time
  }
  if (updates.capacity !== undefined) payload.capacity = updates.capacity

  return payload
}

export async function getOrCreateBusiness(): Promise<Business> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error("Not authenticated")

  const { data: existing, error: fetchError } = await supabase
    .from("businesses")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle()

  if (fetchError) throw fetchError
  if (existing) return parseBusiness(existing as BusinessRow)

  const { data: created, error: createError } = await supabase
    .from("businesses")
    .insert({ user_id: user.id, name: "Mijn bedrijf", category: "general_service" })
    .select("*")
    .single()

  if (createError) throw createError
  return parseBusiness(created as BusinessRow)
}

export async function updateBusiness(
  businessId: string,
  updates: Partial<BusinessInput>,
): Promise<Business> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("businesses")
    .update(toBusinessPayload(updates))
    .eq("id", businessId)
    .select("*")
    .single()

  if (error) throw error
  return parseBusiness(data as BusinessRow)
}
