"use server"

import { revalidatePath } from "next/cache"
import {
  createCalendarEntry,
  updateCalendarEntry,
  type CalendarEntry,
  type CalendarEntryInput,
  type CalendarEntryUpdate,
} from "@/lib/supabase/calendar"

type CalendarActionResult =
  | { success: true; entry: CalendarEntry }
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
