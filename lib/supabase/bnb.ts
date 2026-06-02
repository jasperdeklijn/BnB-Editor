"use server"

import {
  getOrCreateBusiness,
  updateBusiness,
  type Business,
  type BusinessInput,
} from "@/lib/supabase/business"
import {
  createService,
  deleteService,
  getServices,
  reorderServices,
  updateService,
  type Service,
  type ServiceInput,
} from "@/lib/supabase/services"

export interface BnbDetails {
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

export interface Room {
  id: string
  bnb_id: string
  name: string
  description: string
  price: string
  max_guests: number | null
  images: string[]
  position: number
  created_at: string
  updated_at: string
}

export type BnbDetailsInput = Omit<BnbDetails, "id" | "user_id" | "created_at" | "updated_at">
export type RoomInput = Omit<Room, "id" | "bnb_id" | "created_at" | "updated_at">

function businessToBnb(business: Business): BnbDetails {
  return {
    id: business.id,
    user_id: business.user_id,
    name: business.name,
    tagline: business.tagline,
    description: business.description,
    street: business.street,
    city: business.city,
    postal: business.postal,
    country: business.country,
    checkin_time: business.appointment_start_time,
    checkout_time: business.appointment_end_time,
    max_guests: business.capacity,
    languages: business.languages,
    website_url: business.website_url,
    created_at: business.created_at,
    updated_at: business.updated_at,
  }
}

function bnbUpdatesToBusiness(updates: Partial<BnbDetailsInput>): Partial<BusinessInput> {
  return {
    name: updates.name,
    tagline: updates.tagline,
    description: updates.description,
    street: updates.street,
    city: updates.city,
    postal: updates.postal,
    country: updates.country,
    appointment_start_time: updates.checkin_time,
    appointment_end_time: updates.checkout_time,
    capacity: updates.max_guests,
    languages: updates.languages,
    website_url: updates.website_url,
  }
}

function serviceToRoom(service: Service): Room {
  return {
    id: service.id,
    bnb_id: service.business_id,
    name: service.title,
    description: service.description,
    price: service.price,
    max_guests: service.capacity,
    images: service.image_urls,
    position: service.position,
    created_at: service.created_at,
    updated_at: service.updated_at,
  }
}

function roomInputToService(room: Partial<RoomInput>): Partial<ServiceInput> {
  return {
    title: room.name,
    description: room.description,
    price: room.price,
    capacity: room.max_guests,
    image_urls: room.images,
    position: room.position,
  }
}

export async function getOrCreateBnb(): Promise<BnbDetails> {
  return businessToBnb(await getOrCreateBusiness())
}

export async function updateBnb(
  bnbId: string,
  updates: Partial<BnbDetailsInput>,
): Promise<BnbDetails> {
  return businessToBnb(await updateBusiness(bnbId, bnbUpdatesToBusiness(updates)))
}

export async function getRooms(bnbId: string): Promise<Room[]> {
  return (await getServices(bnbId)).map(serviceToRoom)
}

export async function createRoom(bnbId: string, room: RoomInput): Promise<Room> {
  const serviceInput: ServiceInput = {
    title: room.name,
    description: room.description,
    price: room.price,
    duration: null,
    capacity: room.max_guests,
    image_urls: room.images ?? [],
    position: room.position ?? 0,
  }

  return serviceToRoom(await createService(bnbId, serviceInput))
}

export async function updateRoom(roomId: string, updates: Partial<RoomInput>): Promise<Room> {
  return serviceToRoom(await updateService(roomId, roomInputToService(updates)))
}

export async function deleteRoom(roomId: string): Promise<void> {
  await deleteService(roomId)
}

export async function reorderRooms(
  roomOrders: { id: string; position: number }[],
): Promise<void> {
  await reorderServices(roomOrders)
}
