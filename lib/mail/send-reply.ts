import "server-only"

import nodemailer from "nodemailer"
import type { SupabaseClient } from "@supabase/supabase-js"
import { requireMailServerConfig } from "@/lib/mail/config"

function bigrams(value: string) {
  const normalized = value.toLocaleLowerCase("nl-NL").replace(/\s+/g, " ").trim()
  const result = new Map<string, number>()
  for (let index = 0; index < normalized.length - 1; index += 1) {
    const gram = normalized.slice(index, index + 2)
    result.set(gram, (result.get(gram) ?? 0) + 1)
  }
  return result
}

function editRatio(original: string, final: string) {
  if (original === final) return 0
  const left = bigrams(original)
  const right = bigrams(final)
  let intersection = 0
  let total = 0
  for (const count of left.values()) total += count
  for (const [gram, count] of right) {
    total += count
    intersection += Math.min(count, left.get(gram) ?? 0)
  }
  return total === 0 ? 1 : Math.max(0, Math.min(1, 1 - (2 * intersection) / total))
}

export async function sendReply(supabase: SupabaseClient, input: {
  draftId: string
  subject: string
  body: string
  userId: string
}) {
  const config = requireMailServerConfig()
  const { data: draft } = await supabase.from("mail_drafts").select("*").eq("id", input.draftId).maybeSingle()
  if (!draft) throw new Error("Concept niet gevonden.")
  if (!["ready", "edited", "failed"].includes(draft.status)) {
    throw new Error(draft.status === "sent" ? "Dit concept is al verzonden." : "Dit concept kan nu niet worden verzonden.")
  }

  const { data: inbound } = await supabase.from("mail_messages").select("*").eq("id", draft.in_reply_to_message_id).eq("direction", "inbound").maybeSingle()
  if (!inbound?.from_address) throw new Error("Ontvanger niet gevonden.")
  const { data: account } = await supabase.from("mail_accounts").select("*").eq("id", inbound.mail_account_id).maybeSingle()
  if (!account) throw new Error("Mailboxconfiguratie niet gevonden.")

  const { data: locked } = await supabase.from("mail_drafts").update({
    status: "sending",
    final_body: input.body,
    edited_at: input.body === draft.suggested_body ? null : new Date().toISOString(),
  }).eq("id", input.draftId).in("status", ["ready", "edited", "failed"]).select("id").maybeSingle()
  if (!locked) throw new Error("Het concept wordt al verzonden of is al verzonden.")

  const transporter = nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.secure,
    auth: { user: config.user, pass: config.password },
    connectionTimeout: 15_000,
    socketTimeout: 30_000,
  })

  let smtpCompleted = false
  try {
    const messageDomain = config.user.split("@")[1] || "flexpagina.local"
    const stableMessageId = `<mail-${draft.send_key}@${messageDomain}>`
    const info = await transporter.sendMail({
      from: `${config.fromName} <${config.user}>`,
      to: inbound.from_address,
      subject: input.subject,
      text: input.body,
      replyTo: config.user,
      inReplyTo: inbound.internet_message_id || undefined,
      references: [...(inbound.message_references ?? []), inbound.internet_message_id].filter(Boolean) as string[],
      headers: { "X-FlexPagina-Draft-ID": draft.id },
      messageId: stableMessageId,
    })
    smtpCompleted = true
    const sentAt = new Date().toISOString()
    const { data: outbound, error } = await supabase.from("mail_messages").insert({
      thread_id: draft.thread_id,
      mail_account_id: inbound.mail_account_id,
      direction: "outbound",
      internet_message_id: info.messageId || null,
      in_reply_to: inbound.internet_message_id,
      message_references: [...(inbound.message_references ?? []), inbound.internet_message_id].filter(Boolean),
      imap_folder: "__sent_via_app__",
      imap_uid: null,
      from_address: config.user,
      from_name: config.fromName,
      to_addresses: [inbound.from_address],
      cc_addresses: [],
      subject: input.subject,
      text_body: input.body,
      attachment_metadata: [],
      raw_headers: {},
      sent_at: sentAt,
      is_read: true,
    }).select("id").single()
    if (error || !outbound) throw new Error("Verzonden mail kon niet worden geregistreerd.")

    const ratio = editRatio(draft.suggested_body, input.body)
    await Promise.all([
      supabase.from("mail_drafts").update({ status: "sent", subject: input.subject, final_body: input.body, outbound_message_id: outbound.id, sent_at: sentAt, sent_by: input.userId }).eq("id", draft.id),
      supabase.from("mail_threads").update({ status: "replied", unread_count: 0, last_message_at: sentAt, last_outbound_at: sentAt }).eq("id", draft.thread_id),
      supabase.from("mail_feedback").upsert({
        draft_id: draft.id,
        outcome: ratio === 0 ? "accepted_without_changes" : "edited_then_sent",
        edit_ratio: ratio,
        created_by: input.userId,
      }, { onConflict: "draft_id" }),
    ])
    return { messageId: info.messageId, sentAt }
  } catch (error) {
    await supabase.from("mail_drafts").update({
      status: smtpCompleted ? "sent" : "failed",
      generation_error: smtpCompleted
        ? "De mail is verzonden, maar kon niet volledig lokaal worden geregistreerd. Controleer de map Verzonden."
        : "Verzenden via SMTP is mislukt.",
      sent_at: smtpCompleted ? new Date().toISOString() : null,
      sent_by: smtpCompleted ? input.userId : null,
    }).eq("id", draft.id)
    throw error
  } finally {
    transporter.close()
  }
}
