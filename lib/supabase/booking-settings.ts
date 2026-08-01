"use server"

import { revalidatePath } from "next/cache"
import {
  validateServiceBookingSettingsInput,
  type BookingConfirmationMode,
  type BookingMode,
  type ServiceBookingSettings,
  type ServiceBookingSettingsInput,
} from "@/lib/booking/types"
import { createClient } from "@/lib/supabase/server"

type ServiceBookingSettingsRow = {
  service_id: string
  business_id: string
  booking_enabled: boolean
  booking_mode: BookingMode
  confirmation_mode: BookingConfirmationMode
  timezone: string
  duration_minutes: number
  slot_interval_minutes: number
  buffer_before_minutes: number
  buffer_after_minutes: number
  minimum_notice_minutes: number
  booking_horizon_days: number
  capacity: number
  minimum_nights: number
  maximum_nights: number
  check_in_time: string
  check_out_time: string
  cancellation_cutoff_minutes: number
  created_at: string
  updated_at: string
}

function parseSettings(row: ServiceBookingSettingsRow): ServiceBookingSettings {
  return {
    ...row,
    check_in_time: row.check_in_time.slice(0, 5),
    check_out_time: row.check_out_time.slice(0, 5),
  }
}

async function requireOwnedBusiness(
  businessId: string,
  supabase: Awaited<ReturnType<typeof createClient>>,
) {
  const { data: authData, error: authError } = await supabase.auth.getUser()
  if (authError || !authData.user) throw new Error("Not authenticated")

  const { data, error } = await supabase
    .from("businesses")
    .select("id")
    .eq("id", businessId)
    .eq("user_id", authData.user.id)
    .maybeSingle()

  if (error) throw error
  if (!data) throw new Error("Business not found")
}

export async function getServiceBookingSettings(
  businessId: string,
): Promise<ServiceBookingSettings[]> {
  const supabase = await createClient()
  await requireOwnedBusiness(businessId, supabase)

  const { data, error } = await supabase
    .from("service_booking_settings")
    .select("*")
    .eq("business_id", businessId)

  if (error) throw error
  return ((data ?? []) as ServiceBookingSettingsRow[]).map(parseSettings)
}

export async function upsertServiceBookingSettings(
  serviceId: string,
  input: ServiceBookingSettingsInput,
): Promise<ServiceBookingSettings> {
  const supabase = await createClient()
  const { data: service, error: serviceError } = await supabase
    .from("services")
    .select("id, business_id")
    .eq("id", serviceId)
    .maybeSingle()

  if (serviceError) throw serviceError
  if (!service) throw new Error("Offering not found")
  await requireOwnedBusiness((service as { business_id: string }).business_id, supabase)

  const settings = validateServiceBookingSettingsInput(input)
  const { data, error } = await supabase
    .from("service_booking_settings")
    .upsert({
      service_id: serviceId,
      business_id: (service as { business_id: string }).business_id,
      ...settings,
    }, { onConflict: "service_id" })
    .select("*")
    .single()

  if (error) throw error
  revalidatePath("/editor/services")
  revalidatePath("/editor/calendar")
  return parseSettings(data as ServiceBookingSettingsRow)
}
