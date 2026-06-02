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

type ServiceRow = {
  id: string
  business_id: string
  title: string
  description: string
  price: string
  duration: string | null
  capacity: number | null
  image_urls: unknown
  position: number
  created_at: string
  updated_at: string
}

function parseService(row: ServiceRow): Service {
  return {
    id: row.id,
    business_id: row.business_id,
    title: row.title,
    description: row.description,
    price: row.price,
    duration: row.duration,
    capacity: row.capacity,
    image_urls: Array.isArray(row.image_urls) ? row.image_urls : [],
    position: row.position,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

function toServicePayload(service: Partial<ServiceInput>): Record<string, unknown> {
  const payload: Record<string, unknown> = {}

  if (service.title !== undefined) payload.title = service.title
  if (service.description !== undefined) payload.description = service.description
  if (service.price !== undefined) payload.price = service.price
  if (service.duration !== undefined) payload.duration = service.duration
  if (service.capacity !== undefined) payload.capacity = service.capacity
  if (service.image_urls !== undefined) payload.image_urls = service.image_urls
  if (service.position !== undefined) payload.position = service.position

  return payload
}

export async function getServices(businessId: string): Promise<Service[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("services")
    .select("*")
    .eq("business_id", businessId)
    .order("position", { ascending: true })

  if (error) throw error
  return ((data ?? []) as ServiceRow[]).map(parseService)
}

export async function createService(
  businessId: string,
  service: ServiceInput,
): Promise<Service> {
  const supabase = await createClient()

  const payload = {
    business_id: businessId,
    title: service.title,
    description: service.description ?? "",
    price: service.price ?? "",
    duration: service.duration ?? "",
    capacity: service.capacity,
    image_urls: service.image_urls ?? [],
    position: service.position ?? 0,
  }

  const { data, error } = await supabase
    .from("services")
    .insert(payload)
    .select("*")
    .single()

  if (error) throw error
  return parseService(data as ServiceRow)
}

export async function updateService(
  serviceId: string,
  updates: Partial<ServiceInput>,
): Promise<Service> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("services")
    .update(toServicePayload(updates))
    .eq("id", serviceId)
    .select("*")
    .single()

  if (error) throw error
  return parseService(data as ServiceRow)
}

export async function deleteService(serviceId: string): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase.from("services").delete().eq("id", serviceId)
  if (error) throw error
}

export async function reorderServices(
  serviceOrders: { id: string; position: number }[],
): Promise<void> {
  const supabase = await createClient()

  for (const { id, position } of serviceOrders) {
    const { error } = await supabase
      .from("services")
      .update({ position })
      .eq("id", id)

    if (error) throw error
  }
}
