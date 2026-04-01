"use server"

import { createClient } from "@/lib/supabase/server"

// ----- Types -----

export interface BnbDetails {
  id: string
  user_id: string
  name: string
  tagline: string | null
  address_line1: string | null
  address_line2: string | null
  city: string | null
  state: string | null
  postal_code: string | null
  country: string | null
  check_in_time: string | null
  check_out_time: string | null
  max_guests: number | null
  languages: string[]
  booking_url: string | null
  created_at: string
  updated_at: string
}

export interface Room {
  id: string
  bnb_id: string
  name: string
  description: string | null
  price_per_night: number | null
  max_guests: number | null
  images: string[]
  display_order: number
  created_at: string
  updated_at: string
}

export type BnbDetailsInput = Omit<BnbDetails, "id" | "user_id" | "created_at" | "updated_at">
export type RoomInput = Omit<Room, "id" | "bnb_id" | "created_at" | "updated_at">

// ----- BnB CRUD -----

/** Get the current user's BnB (creates one if it doesn't exist) */
export async function getOrCreateBnb(): Promise<BnbDetails> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error("Not authenticated")

  // Try to fetch existing
  const { data: existing, error: fetchError } = await supabase
    .from("bnbs")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle()

  if (fetchError) throw fetchError

  if (existing) return existing as BnbDetails

  // Create new bnb for the user
  const { data: created, error: createError } = await supabase
    .from("bnbs")
    .insert({ user_id: user.id, name: "My BnB" })
    .select("*")
    .single()

  if (createError) throw createError

  return created as BnbDetails
}

/** Update BnB details */
export async function updateBnb(
  bnbId: string,
  updates: Partial<BnbDetailsInput>
): Promise<BnbDetails> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("bnbs")
    .update(updates)
    .eq("id", bnbId)
    .select("*")
    .single()

  if (error) throw error
  return data as BnbDetails
}

// ----- Rooms CRUD -----

/** Get all rooms for a BnB */
export async function getRooms(bnbId: string): Promise<Room[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("rooms")
    .select("*")
    .eq("bnb_id", bnbId)
    .order("display_order", { ascending: true })

  if (error) throw error
  return (data ?? []) as Room[]
}

/** Create a new room */
export async function createRoom(bnbId: string, room: RoomInput): Promise<Room> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("rooms")
    .insert({ ...room, bnb_id: bnbId })
    .select("*")
    .single()

  if (error) throw error
  return data as Room
}

/** Update a room */
export async function updateRoom(roomId: string, updates: Partial<RoomInput>): Promise<Room> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("rooms")
    .update(updates)
    .eq("id", roomId)
    .select("*")
    .single()

  if (error) throw error
  return data as Room
}

/** Delete a room */
export async function deleteRoom(roomId: string): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase.from("rooms").delete().eq("id", roomId)

  if (error) throw error
}

/** Reorder rooms (bulk update display_order) */
export async function reorderRooms(
  roomOrders: { id: string; display_order: number }[]
): Promise<void> {
  const supabase = await createClient()

  // Update each room's display_order
  for (const { id, display_order } of roomOrders) {
    const { error } = await supabase
      .from("rooms")
      .update({ display_order })
      .eq("id", id)

    if (error) throw error
  }
}
