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
import {
  createCalendarImportSource,
  deleteCalendarImportSource,
  manuallySynchronizeCalendarSource,
  rotateCalendarExportFeed,
  setCalendarExportEnabled,
  setCalendarImportSourceEnabled,
} from "@/lib/calendar/sync"
import {
  createBookingInvoiceDraft,
  createFullCreditNote,
  emailIssuedInvoice,
  issueBookingInvoice,
  saveBookingInvoiceDraft,
  saveReservationPricing,
  setReservationSettlementStatus,
  voidUndeliveredInvoice,
  type BookingInvoiceProfile,
  type SettlementStatus,
} from "@/lib/booking/invoicing"
import type { BookingFinancialLine, InvoiceParty } from "@/lib/booking/pricing"

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

export async function rotateCalendarExportFeedAction(businessId: string) {
  try {
    const data = await rotateCalendarExportFeed(businessId)
    revalidatePath("/editor/calendar")
    return { success: true as const, data }
  } catch (error) {
    return { success: false as const, error: getErrorMessage(error) }
  }
}

export async function setCalendarExportEnabledAction(businessId: string, enabled: boolean) {
  try {
    const data = await setCalendarExportEnabled(businessId, enabled)
    revalidatePath("/editor/calendar")
    return { success: true as const, data }
  } catch (error) {
    return { success: false as const, error: getErrorMessage(error) }
  }
}

export async function createCalendarImportSourceAction(
  businessId: string,
  input: { name: string; feedUrl: string },
) {
  try {
    const result = await createCalendarImportSource(businessId, input)
    revalidatePath("/editor/calendar")
    return { success: true as const, ...result }
  } catch (error) {
    return { success: false as const, error: getErrorMessage(error) }
  }
}

export async function setCalendarImportSourceEnabledAction(sourceId: string, enabled: boolean) {
  try {
    const data = await setCalendarImportSourceEnabled(sourceId, enabled)
    revalidatePath("/editor/calendar")
    return { success: true as const, data }
  } catch (error) {
    return { success: false as const, error: getErrorMessage(error) }
  }
}

export async function synchronizeCalendarSourceAction(sourceId: string) {
  try {
    const result = await manuallySynchronizeCalendarSource(sourceId)
    revalidatePath("/editor/calendar")
    return { success: true as const, ...result }
  } catch (error) {
    return { success: false as const, error: getErrorMessage(error) }
  }
}

export async function deleteCalendarImportSourceAction(sourceId: string) {
  try {
    const data = await deleteCalendarImportSource(sourceId)
    revalidatePath("/editor/calendar")
    return { success: true as const, data }
  } catch (error) {
    return { success: false as const, error: getErrorMessage(error) }
  }
}

export async function saveReservationPricingAction(entryId: string, lines: Array<Partial<BookingFinancialLine>>) {
  try {
    const financial = await saveReservationPricing(entryId, lines)
    revalidatePath("/editor/calendar")
    return { success: true as const, financial }
  } catch (error) {
    return { success: false as const, error: getErrorMessage(error) }
  }
}

export async function setReservationSettlementStatusAction(entryId: string, status: SettlementStatus) {
  try {
    const financial = await setReservationSettlementStatus(entryId, status)
    revalidatePath("/editor/calendar")
    return { success: true as const, financial }
  } catch (error) {
    return { success: false as const, error: getErrorMessage(error) }
  }
}

export async function createBookingInvoiceDraftAction(entryId: string) {
  try {
    const invoice = await createBookingInvoiceDraft(entryId)
    revalidatePath("/editor/calendar")
    return { success: true as const, invoice }
  } catch (error) {
    return { success: false as const, error: getErrorMessage(error) }
  }
}

export async function saveBookingInvoiceDraftAction(invoiceId: string, input: {
  seller: InvoiceParty
  customer: InvoiceParty
  lines: Array<Partial<BookingFinancialLine>>
  serviceDate: string
  dueDate: string
  profile: Partial<BookingInvoiceProfile>
}) {
  try {
    const invoice = await saveBookingInvoiceDraft(invoiceId, input)
    revalidatePath("/editor/calendar")
    return { success: true as const, invoice }
  } catch (error) {
    return { success: false as const, error: getErrorMessage(error) }
  }
}

export async function issueBookingInvoiceAction(invoiceId: string) {
  try {
    const invoice = await issueBookingInvoice(invoiceId)
    revalidatePath("/editor/calendar")
    return { success: true as const, invoice }
  } catch (error) {
    return { success: false as const, error: getErrorMessage(error) }
  }
}

export async function voidBookingInvoiceAction(invoiceId: string, reason: string) {
  try {
    const invoice = await voidUndeliveredInvoice(invoiceId, reason)
    revalidatePath("/editor/calendar")
    return { success: true as const, invoice }
  } catch (error) {
    return { success: false as const, error: getErrorMessage(error) }
  }
}

export async function createFullCreditNoteAction(invoiceId: string) {
  try {
    const invoice = await createFullCreditNote(invoiceId)
    revalidatePath("/editor/calendar")
    return { success: true as const, invoice }
  } catch (error) {
    return { success: false as const, error: getErrorMessage(error) }
  }
}

export async function emailBookingInvoiceAction(invoiceId: string) {
  try {
    const delivery = await emailIssuedInvoice(invoiceId)
    revalidatePath("/editor/calendar")
    return { success: true as const, delivery }
  } catch (error) {
    return { success: false as const, error: getErrorMessage(error) }
  }
}
