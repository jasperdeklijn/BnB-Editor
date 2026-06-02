"use server"

import { createClient } from "@/lib/supabase/server"

export interface Service {
  id: string
  business_id: string
  title: string
  description: string
  price: string
  duration: string | null
  capacity: number | null
  image_urls: string[]
  position: number
  created_at: string
  updated_at: string
}

export type ServiceInput = Omit<Service, "id" | "business_id" | "created_at" | "updated_at">

type LegacyServiceRow = {
  id: string
  bnb_id: string
  name: string
  description: string
  price: string
  max_guests: number | null
  images: unknown
  position: number
  created_at: string
  updated_at: string
}

function parseService(row: LegacyServiceRow): Service {
  return {
    id: row.id,
    business_id: row.bnb_id,
    title: row.name,
    description: row.description,
    price: row.price,
    duration: null,
    capacity: row.max_guests,
    image_urls: Array.isArray(row.images) ? row.images : [],
    position: row.position,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

function toLegacyServicePayload(service: Partial<ServiceInput>): Record<string, unknown> {
  const payload: Record<string, unknown> = {}

  if (service.title !== undefined) payload.name = service.title
  if (service.description !== undefined) payload.description = service.description
  if (service.price !== undefined) payload.price = service.price
  if (service.capacity !== undefined) payload.max_guests = service.capacity
  if (service.image_urls !== undefined) payload.images = service.image_urls
  if (service.position !== undefined) payload.position = service.position

  return payload
}

export async function getServices(businessId: string): Promise<Service[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("rooms")
    .select("*")
    .eq("bnb_id", businessId)
    .order("position", { ascending: true })

  if (error) throw error
  return ((data ?? []) as LegacyServiceRow[]).map(parseService)
}

export async function createService(
  businessId: string,
  service: ServiceInput,
): Promise<Service> {
  const supabase = await createClient()

  const payload = {
    bnb_id: businessId,
    name: service.title,
    description: service.description ?? "",
    price: service.price ?? "",
    max_guests: service.capacity,
    images: service.image_urls ?? [],
    position: service.position ?? 0,
  }

  const { data, error } = await supabase
    .from("rooms")
    .insert(payload)
    .select("*")
    .single()

  if (error) throw error
  return parseService(data as LegacyServiceRow)
}

export async function updateService(
  serviceId: string,
  updates: Partial<ServiceInput>,
): Promise<Service> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("rooms")
    .update(toLegacyServicePayload(updates))
    .eq("id", serviceId)
    .select("*")
    .single()

  if (error) throw error
  return parseService(data as LegacyServiceRow)
}

export async function deleteService(serviceId: string): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase.from("rooms").delete().eq("id", serviceId)
  if (error) throw error
}

export async function reorderServices(
  serviceOrders: { id: string; position: number }[],
): Promise<void> {
  const supabase = await createClient()

  for (const { id, position } of serviceOrders) {
    const { error } = await supabase
      .from("rooms")
      .update({ position })
      .eq("id", id)

    if (error) throw error
  }
}
