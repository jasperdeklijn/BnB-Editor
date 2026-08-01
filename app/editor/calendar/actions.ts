"use server"

import { revalidatePath } from "next/cache"
import {
  createCalendarAvailabilityWindow,
  createCalendarEntry,
  deleteCalendarAvailabilityWindow,
  deleteCalendarEntry,
  updateCalendarEntry,
  type CalendarAvailabilityWindow,
  type CalendarAvailabilityWindowInput,
  type CalendarEntry,
  type CalendarEntryInput,
  type CalendarEntryUpdate,
} from "@/lib/supabase/calendar"
import {
  acceptCustomerRescheduleRequest,
  proposeOwnerAlternative,
  rejectCustomerRescheduleRequest,
  transitionOwnerBooking,
} from "@/lib/booking/lifecycle"
import { deliverBookingNotifications } from "@/lib/booking/notifications"

type CalendarActionResult =
  | { success: true; entry: CalendarEntry }
  | { success: false; error: string }

type AvailabilityActionResult =
  | { success: true; window: CalendarAvailabilityWindow }
  | { success: false; error: string }

type DeleteAvailabilityActionResult =
  | { success: true; id: string }
  | { success: false; error: string }

type DeleteCalendarEntryActionResult =
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
    if (entry.metadata?.source === "booking_engine") {
      try {
        await deliverBookingNotifications(entry.id)
      } catch (notificationError) {
        console.error("[calendar] Entry saved but booking notification failed", notificationError)
      }
    }
    revalidatePath("/editor/calendar")
    return { success: true, entry }
  } catch (error) {
    return { success: false, error: getErrorMessage(error) }
  }
}

export async function deleteCalendarEntryAction(
  entryId: string,
): Promise<DeleteCalendarEntryActionResult> {
  try {
    await deleteCalendarEntry(entryId)
    revalidatePath("/editor/calendar")
    return { success: true, id: entryId }
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

export async function transitionBookingAction(
  entryId: string,
  status: "confirmed" | "cancelled",
  privateNote = "",
): Promise<CalendarActionResult> {
  try {
    const result = await transitionOwnerBooking(entryId, status, privateNote)
    revalidatePath("/editor/calendar")
    return { success: true, entry: result.entry }
  } catch (error) {
    return { success: false, error: getErrorMessage(error) }
  }
}

export async function proposeAlternativeAction(
  entryId: string,
  input: { startAt: string; endAt: string; customerMessage: string; privateNote: string },
) {
  try {
    const result = await proposeOwnerAlternative(entryId, input)
    revalidatePath("/editor/calendar")
    return { success: true as const, request: result.request }
  } catch (error) {
    return { success: false as const, error: getErrorMessage(error) }
  }
}

export async function acceptRescheduleRequestAction(requestId: string): Promise<CalendarActionResult> {
  try {
    const result = await acceptCustomerRescheduleRequest(requestId)
    revalidatePath("/editor/calendar")
    return { success: true, entry: result.entry }
  } catch (error) {
    return { success: false, error: getErrorMessage(error) }
  }
}

export async function rejectRescheduleRequestAction(requestId: string, privateNote = "") {
  try {
    await rejectCustomerRescheduleRequest(requestId, privateNote)
    revalidatePath("/editor/calendar")
    return { success: true as const, requestId }
  } catch (error) {
    return { success: false as const, error: getErrorMessage(error) }
  }
}
