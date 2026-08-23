"use server"

import { revalidatePath } from "next/cache"
import { deliverBookingNotifications } from "@/lib/booking/notifications"
import { transitionOwnerBooking } from "@/lib/booking/lifecycle"
import { getOwnedReservation, isValidReservationTransition } from "@/lib/booking/reservations"
import { transitionCalendarEntryStatus, type CalendarEntry, type CalendarEntryStatus } from "@/lib/supabase/calendar"

type ReservationStatusActionResult =
  | { success: true; entry: CalendarEntry }
  | { success: false; error: string }

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "De reserveringsstatus kon niet worden bijgewerkt."
}

function revalidateReservationSurfaces() {
  revalidatePath("/editor/reservations")
  revalidatePath("/editor/calendar")
}

export async function transitionReservationStatusAction(
  businessId: string,
  entryId: string,
  targetStatus: CalendarEntryStatus,
  privateNote = "",
): Promise<ReservationStatusActionResult> {
  try {
    const entry = await getOwnedReservation(businessId, entryId)
    if (!entry) throw new Error("Reservering niet gevonden.")
    if (!isValidReservationTransition(entry.status, targetStatus)) {
      throw new Error("Deze statuswijziging is niet toegestaan.")
    }

    const isOnlineBooking = entry.metadata?.source === "booking_engine"
    let updated: CalendarEntry
    if (isOnlineBooking && entry.status === "pending" && (targetStatus === "confirmed" || targetStatus === "cancelled")) {
      updated = (await transitionOwnerBooking(entry.id, targetStatus, privateNote)).entry
    } else {
      updated = await transitionCalendarEntryStatus(
        entry.id,
        entry.status,
        targetStatus,
        isOnlineBooking ? {
            ...entry.metadata,
            lifecycle_actor: "owner",
            lifecycle_private_note: privateNote.slice(0, 2000),
          } : undefined,
      )
      if (isOnlineBooking) {
        try {
          await deliverBookingNotifications(updated.id)
        } catch (notificationError) {
          console.error("[reservations] Status saved but notification delivery failed", notificationError)
        }
      }
    }

    revalidateReservationSurfaces()
    return { success: true, entry: updated }
  } catch (error) {
    return { success: false, error: errorMessage(error) }
  }
}
