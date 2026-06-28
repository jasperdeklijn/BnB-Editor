"use server"

import { revalidatePath } from "next/cache"
import {
  createCalendarAvailabilityWindow,
  createCalendarEntry,
  deleteCalendarAvailabilityWindow,
  updateCalendarEntry,
  type CalendarAvailabilityWindow,
  type CalendarAvailabilityWindowInput,
  type CalendarEntry,
  type CalendarEntryInput,
  type CalendarEntryUpdate,
} from "@/lib/supabase/calendar"

type CalendarActionResult =
  | { success: true; entry: CalendarEntry }
  | { success: false; error: string }

type AvailabilityActionResult =
  | { success: true; window: CalendarAvailabilityWindow }
  | { success: false; error: string }

type DeleteAvailabilityActionResult =
  | { success: true; id: string }
  | { success: false; error: string }

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Kalenderitem kon niet worden opgeslagen."
}

export async function createCalendarEntryAction(
  businessId: string,
  input: CalendarEntryInput,
): Promise<CalendarActionResult> {
  try {
    const entry = await createCalendarEntry(businessId, input)
    revalidatePath("/editor/calendar")
    return { success: true, entry }
  } catch (error) {
    return { success: false, error: getErrorMessage(error) }
  }
}

export async function updateCalendarEntryAction(
  entryId: string,
  updates: CalendarEntryUpdate,
): Promise<CalendarActionResult> {
  try {
    const entry = await updateCalendarEntry(entryId, updates)
    revalidatePath("/editor/calendar")
    return { success: true, entry }
  } catch (error) {
    return { success: false, error: getErrorMessage(error) }
  }
}

export async function createAvailabilityWindowAction(
  businessId: string,
  input: CalendarAvailabilityWindowInput,
): Promise<AvailabilityActionResult> {
  try {
    const window = await createCalendarAvailabilityWindow(businessId, input)
    revalidatePath("/editor/calendar")
    return { success: true, window }
  } catch (error) {
    return { success: false, error: getErrorMessage(error) }
  }
}

export async function deleteAvailabilityWindowAction(
  windowId: string,
): Promise<DeleteAvailabilityActionResult> {
  try {
    await deleteCalendarAvailabilityWindow(windowId)
    revalidatePath("/editor/calendar")
    return { success: true, id: windowId }
  } catch (error) {
    return { success: false, error: getErrorMessage(error) }
  }
}
