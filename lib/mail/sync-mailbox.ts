import "server-only"

import { ImapFlow } from "imapflow"
import type { SupabaseClient } from "@supabase/supabase-js"
import { requireMailServerConfig } from "@/lib/mail/config"
import { generateReplyDraft } from "@/lib/mail/generate-reply"
import { parseMailboxMessage } from "@/lib/mail/parse-message"
import { isAutomatedMail } from "@/lib/mail/risk-policy"
import { resolveMailThread } from "@/lib/mail/threading"
import type { MailAccountRecord, MailDirection, ParsedMailboxMessage } from "@/lib/mail/types"
import { createAdminClient } from "@/lib/supabase/admin"

const MAX_MESSAGES_PER_FOLDER = 25
const MAX_SOURCE_BYTES = 5_000_000

type SyncTotals = { fetched: number; created: number; drafts: number; failed: number }

async function ensureAccount(supabase: SupabaseClient) {
  const config = requireMailServerConfig()
  const { data, error } = await supabase.from("mail_accounts").upsert({
    email_address: config.user,
    display_name: config.fromName,
    imap_host: config.imap.host,
    imap_port: config.imap.port,
    imap_secure: config.imap.secure,
    smtp_host: config.smtp.host,
    smtp_port: config.smtp.port,
    smtp_secure: config.smtp.secure,
    inbox_folder: config.inboxFolder,
    sent_folder: config.sentFolder,
    enabled: true,
  }, { onConflict: "email_address" }).select("*").single()
  if (error || !data) throw new Error("Mailboxaccount kon niet worden opgeslagen.")
  return data as MailAccountRecord
}

async function updateThreadAfterMessage(supabase: SupabaseClient, threadId: string, direction: MailDirection, message: ParsedMailboxMessage) {
  const { data: thread } = await supabase.from("mail_threads").select("unread_count, status").eq("id", threadId).single()
  const date = message.date.toISOString()
  const update: Record<string, unknown> = { last_message_at: date }
  if (direction === "inbound") {
    update.last_inbound_at = date
    update.unread_count = (thread?.unread_count ?? 0) + (message.isRead ? 0 : 1)
    if (thread?.status !== "ignored") update.status = "new"
  } else {
    update.last_outbound_at = date
    if (!["closed", "ignored"].includes(thread?.status)) update.status = "replied"
  }
  await supabase.from("mail_threads").update(update).eq("id", threadId)
}

async function saveFetchedMessage(supabase: SupabaseClient, account: MailAccountRecord, folder: string, direction: MailDirection, uid: number, parsed: ParsedMailboxMessage) {
  if (parsed.messageId) {
    const { data: existing } = await supabase.from("mail_messages").select("id, thread_id").eq("mail_account_id", account.id).eq("internet_message_id", parsed.messageId).maybeSingle()
    if (existing) {
      await supabase.from("mail_messages").update({ imap_folder: folder, imap_uid: uid, is_read: parsed.isRead }).eq("id", existing.id)
      return { created: false, messageId: existing.id as string, threadId: existing.thread_id as string, automated: true }
    }
  }

  const threadId = await resolveMailThread(supabase, account, parsed, direction)
  const { data, error } = await supabase.from("mail_messages").insert({
    thread_id: threadId,
    mail_account_id: account.id,
    direction,
    internet_message_id: parsed.messageId,
    in_reply_to: parsed.inReplyTo,
    message_references: parsed.references,
    imap_folder: folder,
    imap_uid: uid,
    from_address: parsed.fromAddress,
    from_name: parsed.fromName,
    to_addresses: parsed.toAddresses,
    cc_addresses: parsed.ccAddresses,
    subject: parsed.subject,
    text_body: parsed.textBody,
    html_body: null,
    attachment_metadata: parsed.attachments,
    raw_headers: parsed.headers,
    received_at: direction === "inbound" ? parsed.date.toISOString() : null,
    sent_at: direction === "outbound" ? parsed.date.toISOString() : null,
    is_read: parsed.isRead,
  }).select("id").single()
  if (error || !data) throw new Error("Mailbericht kon niet worden opgeslagen.")
  await updateThreadAfterMessage(supabase, threadId, direction, parsed)
  return { created: true, messageId: data.id as string, threadId, automated: isAutomatedMail(parsed.headers, parsed.fromAddress) }
}

async function syncFolder(input: {
  client: ImapFlow
  supabase: SupabaseClient
  account: MailAccountRecord
  folder: string
  direction: MailDirection
  cursorField: "last_inbox_uid" | "last_sent_uid"
  validityField: "inbox_uid_validity" | "sent_uid_validity"
  totals: SyncTotals
  draftTargets: Array<{ threadId: string; messageId: string }>
}) {
  const mailbox = await input.client.mailboxOpen(input.folder, { readOnly: true })
  const validity = mailbox.uidValidity.toString()
  const storedValidity = input.account[input.validityField]
  const cursor = storedValidity && storedValidity !== validity ? 0 : Number(input.account[input.cursorField] || 0)
  if (mailbox.uidNext <= cursor + 1) {
    await input.supabase.from("mail_accounts").update({ [input.validityField]: validity }).eq("id", input.account.id)
    return
  }

  const found = await input.client.search({ uid: `${cursor + 1}:*` }, { uid: true })
  const uids = Array.isArray(found) ? found.sort((a, b) => a - b).slice(0, MAX_MESSAGES_PER_FOLDER) : []
  if (uids.length === 0) {
    await input.supabase.from("mail_accounts").update({ [input.validityField]: validity }).eq("id", input.account.id)
    return
  }
  let lastUid = cursor
  for await (const fetched of input.client.fetch(uids, { uid: true, flags: true, internalDate: true, source: { maxLength: MAX_SOURCE_BYTES } }, { uid: true })) {
    input.totals.fetched += 1
    lastUid = Math.max(lastUid, fetched.uid)
    try {
      if (!fetched.source) throw new Error("Mailbron ontbreekt.")
      const parsed = await parseMailboxMessage(fetched.source, fetched.internalDate, fetched.flags)
      const saved = await saveFetchedMessage(input.supabase, input.account, input.folder, input.direction, fetched.uid, parsed)
      if (saved.created) input.totals.created += 1
      if (saved.created && input.direction === "inbound" && !saved.automated) input.draftTargets.push({ threadId: saved.threadId, messageId: saved.messageId })
    } catch {
      input.totals.failed += 1
    }
  }
  await input.supabase.from("mail_accounts").update({
    [input.cursorField]: lastUid,
    [input.validityField]: validity,
  }).eq("id", input.account.id)
}

export async function syncMailbox(input: { trigger: "cron" | "manual"; runKey: string }) {
  const config = requireMailServerConfig()
  const supabase = await createAdminClient()
  const account = await ensureAccount(supabase)
  const totals: SyncTotals = { fetched: 0, created: 0, drafts: 0, failed: 0 }

  const staleThreshold = new Date(Date.now() - 10 * 60_000).toISOString()
  const { data: activeRun } = await supabase.from("mail_sync_runs").select("id").eq("mail_account_id", account.id).eq("status", "running").gte("started_at", staleThreshold).limit(1).maybeSingle()
  if (activeRun) return { skipped: true, reason: "sync_already_running", ...totals }

  const { data: run, error: runError } = await supabase.from("mail_sync_runs").insert({
    mail_account_id: account.id,
    run_key: input.runKey,
    trigger: input.trigger,
    status: "running",
  }).select("id").single()
  if (runError?.code === "23505") return { skipped: true, reason: "run_already_processed", ...totals }
  if (runError || !run) throw new Error("Mailsynchronisatie kon niet worden gestart.")

  const client = new ImapFlow({
    host: config.imap.host,
    port: config.imap.port,
    secure: config.imap.secure,
    auth: { user: config.user, pass: config.password },
    logger: false,
    connectionTimeout: 15_000,
    greetingTimeout: 15_000,
    socketTimeout: 45_000,
  })
  const draftTargets: Array<{ threadId: string; messageId: string }> = []

  try {
    await client.connect()
    const folders = await client.list()
    const sentFolder = folders.find((folder) => folder.specialUse === "\\Sent")?.path
      || folders.find((folder) => folder.path.toLocaleLowerCase("en-US") === account.sent_folder.toLocaleLowerCase("en-US"))?.path
      || null
    if (sentFolder && sentFolder !== account.sent_folder) {
      account.sent_folder = sentFolder
      await supabase.from("mail_accounts").update({ sent_folder: sentFolder }).eq("id", account.id)
    }

    await syncFolder({ client, supabase, account, folder: account.inbox_folder, direction: "inbound", cursorField: "last_inbox_uid", validityField: "inbox_uid_validity", totals, draftTargets })
    if (sentFolder) await syncFolder({ client, supabase, account, folder: sentFolder, direction: "outbound", cursorField: "last_sent_uid", validityField: "sent_uid_validity", totals, draftTargets })
    await client.logout()

    for (const target of draftTargets.slice(0, 10)) {
      try {
        await generateReplyDraft(supabase, target)
        totals.drafts += 1
      } catch {
        totals.failed += 1
      }
    }

    const status = totals.failed === 0 ? "succeeded" : totals.created > 0 ? "partial" : "failed"
    await Promise.all([
      supabase.from("mail_sync_runs").update({ status, fetched_count: totals.fetched, created_count: totals.created, draft_count: totals.drafts, failed_count: totals.failed, completed_at: new Date().toISOString() }).eq("id", run.id),
      supabase.from("mail_accounts").update({ last_synced_at: new Date().toISOString(), last_error: status === "failed" ? "De synchronisatie is mislukt." : null }).eq("id", account.id),
    ])
    return { skipped: false, status, ...totals }
  } catch {
    if (client.usable) await client.logout().catch(() => undefined)
    await Promise.all([
      supabase.from("mail_sync_runs").update({ status: "failed", failed_count: Math.max(1, totals.failed), error_message: "De verbinding of synchronisatie is mislukt.", completed_at: new Date().toISOString() }).eq("id", run.id),
      supabase.from("mail_accounts").update({ last_error: "De verbinding of synchronisatie is mislukt." }).eq("id", account.id),
    ])
    throw new Error("De TransIP-mailbox kon niet worden gesynchroniseerd.")
  }
}
