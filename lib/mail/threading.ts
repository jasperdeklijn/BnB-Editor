import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"
import type { MailAccountRecord, MailDirection, ParsedMailboxMessage } from "@/lib/mail/types"

export function normalizeSubject(subject: string) {
  return subject
    .replace(/^\s*((re|fw|fwd|antw|antwoord)\s*:\s*)+/i, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase("nl-NL")
    .slice(0, 500)
}

function getContact(message: ParsedMailboxMessage, account: MailAccountRecord, direction: MailDirection) {
  if (direction === "inbound") return { email: message.fromAddress, name: message.fromName }
  const email = [...message.toAddresses, ...message.ccAddresses].find((value) => value !== account.email_address) ?? ""
  return { email, name: null }
}

export async function resolveMailThread(
  supabase: SupabaseClient,
  account: MailAccountRecord,
  message: ParsedMailboxMessage,
  direction: MailDirection,
) {
  const referenceIds = [message.inReplyTo, ...message.references].filter((value): value is string => Boolean(value))
  if (referenceIds.length > 0) {
    const { data } = await supabase
      .from("mail_messages")
      .select("thread_id")
      .eq("mail_account_id", account.id)
      .in("internet_message_id", referenceIds)
      .limit(1)
      .maybeSingle()
    if (data?.thread_id) return data.thread_id as string
  }

  const contact = getContact(message, account, direction)
  const subject = normalizeSubject(message.subject)
  if (contact.email) {
    const { data } = await supabase
      .from("mail_threads")
      .select("id")
      .eq("mail_account_id", account.id)
      .eq("contact_email", contact.email)
      .eq("subject_normalized", subject)
      .order("last_message_at", { ascending: false })
      .limit(1)
      .maybeSingle()
    if (data?.id) return data.id as string
  }

  const date = message.date.toISOString()
  const { data, error } = await supabase.from("mail_threads").insert({
    mail_account_id: account.id,
    subject_normalized: subject,
    contact_email: contact.email,
    contact_name: contact.name,
    status: direction === "inbound" ? "new" : "replied",
    last_message_at: date,
    last_inbound_at: direction === "inbound" ? date : null,
    last_outbound_at: direction === "outbound" ? date : null,
    unread_count: 0,
  }).select("id").single()
  if (error || !data) throw new Error("Mailthread kon niet worden aangemaakt.")
  return data.id as string
}
