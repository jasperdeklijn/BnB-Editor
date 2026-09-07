"use server"

import { revalidatePath } from "next/cache"

import {
  sendInquiryReply,
  saveInquiryReplyTemplate,
  updateInquiryWorkflow,
  type InquiryStatus,
} from "@/lib/inquiries"

function revalidateInquirySurfaces() {
  revalidatePath("/editor/requests")
  revalidatePath("/editor/calendar")
  revalidatePath("/editor/reservations")
}

export async function updateInquiryAction(input: {
  businessId: string
  inquiryId: string
  status?: InquiryStatus
  followUpAt?: string | null
  ownerNotes?: string
  closedReason?: string
}) {
  try {
    const inquiry = await updateInquiryWorkflow(input)
    revalidateInquirySurfaces()
    return { success: true as const, inquiry }
  } catch (error) {
    console.error("[inquiries] Failed to update enquiry", error)
    return { success: false as const, error: error instanceof Error ? error.message : "De aanvraag kon niet worden bijgewerkt." }
  }
}

export async function sendInquiryReplyAction(input: {
  businessId: string
  inquiryId: string
  subject: string
  body: string
  idempotencyKey: string
}) {
  try {
    const message = await sendInquiryReply(input)
    revalidateInquirySurfaces()
    return { success: true as const, message }
  } catch (error) {
    console.error("[inquiries] Failed to send reply", error)
    return { success: false as const, error: error instanceof Error ? error.message : "De e-mail kon niet worden verzonden." }
  }
}

export async function saveInquiryReplyTemplateAction(input: {
  businessId: string
  name: string
  subject: string
  body: string
}) {
  try {
    const template = await saveInquiryReplyTemplate(input)
    revalidatePath("/editor/requests")
    return { success: true as const, template }
  } catch (error) {
    console.error("[inquiries] Failed to save reply template", error)
    return { success: false as const, error: error instanceof Error ? error.message : "De template kon niet worden opgeslagen." }
  }
}
