"use server"

import { z } from "zod"
import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import {
  assertCurrentUserRuntimeEntitlement,
  getUserRuntimeEntitlement,
} from "@/lib/runtime-entitlements"
import { shouldEnforcePlanEntitlements } from "@/lib/plan-enforcement"
import { bookingCatalogSchema } from "@/lib/booking/cart"
import { isValidTimeZone } from "@/lib/booking/types"

const time = z.string().regex(/^([01][0-9]|2[0-3]):[0-5][0-9]$/)
const windowSchema = z
  .object({ start_time: time, end_time: time })
  .refine(
    (value) => value.end_time > value.start_time,
    "Eindtijd moet na starttijd liggen.",
  )
const weekly = z
  .array(
    z
      .object({
        weekday: z.number().int().min(1).max(7),
        start_time: time,
        end_time: time,
      })
      .refine((value) => value.end_time > value.start_time),
  )
  .max(50)
const saveSchema = z.object({
  expectedRevision: z.string().regex(/^[a-f0-9]{32}$/),
  catalog: bookingCatalogSchema.nullable(),
  useBusinessSchedule: z.boolean(),
  windows: weekly,
  exceptions: z
    .array(
      z.object({
        date: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .refine((value) => {
            const date = new Date(`${value}T12:00:00Z`)
            return (
              !isNaN(date.getTime()) &&
              date.toISOString().slice(0, 10) === value
            )
          }),
        windows: z.array(windowSchema).max(10),
      }),
    )
    .max(366),
  resourceId: z.string().uuid().nullable(),
  timezone: z.string().refine(isValidTimeZone),
})

async function ownedService(serviceId: string) {
  z.string().uuid().parse(serviceId)
  const db = await createClient()
  const {
    data: { user },
  } = await db.auth.getUser()
  if (!user) throw new Error("Niet ingelogd.")
  const { data: service, error } = await db
    .from("services")
    .select("id,business_id,title,booking_catalog")
    .eq("id", serviceId)
    .maybeSingle()
  if (error || !service) throw new Error("Dienst niet gevonden.")
  const { data: business } = await db
    .from("businesses")
    .select("id")
    .eq("id", service.business_id)
    .eq("user_id", user.id)
    .maybeSingle()
  if (!business) throw new Error("Dienst niet gevonden.")
  return { db, user, service }
}

export async function getServicePlanning(serviceId: string) {
  const { db, user } = await ownedService(serviceId)
  const access = await getUserRuntimeEntitlement(
    db,
    user.id,
    "booking_management",
  )
  if (!access.allowed && shouldEnforcePlanEntitlements())
    return { allowed: false as const }
  const { data, error } = await db.rpc("get_service_booking_planning", {
    p_service: serviceId,
  })
  if (error || !data)
    throw new Error(
      "De dienstenplanning kan momenteel niet worden geladen. Probeer het later opnieuw.",
    )
  const snapshot = data as {
    revision: string
    catalog: unknown
    resourceId: string | null
    timezone: string
    windows: Array<{
      weekday: number
      start_time: string
      end_time: string
      is_active: boolean
    }>
    exceptions: Array<{
      date: string
      windows: Array<{ start_time: string; end_time: string }>
    }>
    resources: Array<{
      id: string
      name: string
      capacity: number
      timezone: string
      windows: Array<{ weekday: number; start_time: string; end_time: string }>
    }>
  }
  return {
    allowed: true as const,
    ...snapshot,
  }
}

export async function saveServicePlanning(
  serviceId: string,
  input: z.input<typeof saveSchema>,
) {
  const { db } = await ownedService(serviceId)
  await assertCurrentUserRuntimeEntitlement(db, "booking_management")
  const parsed = saveSchema.parse(input)
  if (
    new Set(parsed.exceptions.map((row) => row.date)).size !==
    parsed.exceptions.length
  )
    throw new Error("Gebruik per datum één uitzondering.")
  const { error } = await db.rpc("save_service_booking_planning", {
    p_service: serviceId,
    p_config: parsed,
  })
  if (error) throw new Error(error.message)
  revalidatePath("/editor/services")
  revalidatePath("/editor/calendar")
}

export async function saveBookingResource(
  serviceId: string,
  input: {
    id?: string
    name: string
    capacity: number
    timezone: string
    windows: z.input<typeof weekly>
  },
) {
  const { db, service } = await ownedService(serviceId)
  await assertCurrentUserRuntimeEntitlement(db, "booking_management")
  const parsed = z
    .object({
      id: z.string().uuid().optional(),
      name: z.string().trim().min(1).max(120),
      capacity: z.number().int().min(1).max(10000),
      timezone: z.string().refine(isValidTimeZone),
      windows: weekly,
    })
    .parse(input)
  const { id, ...payload } = parsed
  const result = id
    ? await db
        .from("booking_resources")
        .update(payload)
        .eq("id", id)
        .eq("business_id", service.business_id)
        .select("*")
        .single()
    : await db
        .from("booking_resources")
        .insert({ ...payload, business_id: service.business_id })
        .select("*")
        .single()
  if (result.error)
    throw new Error("De gedeelde agenda kon niet worden opgeslagen.")
  return result.data
}
