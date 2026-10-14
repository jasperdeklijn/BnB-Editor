import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"
import { generateReplyDraft } from "@/lib/mail/generate-reply"
import { isAutomatedMail } from "@/lib/mail/risk-policy"

type Candidate = {
  id: string
  thread_id: string
  from_address: string
  raw_headers: Record<string, string>
  drafts: Array<{ status: string }>
}

export async function generatePendingMailDrafts(supabase: SupabaseClient, accountId: string) {
  const targets: Candidate[] = []
  const seenThreads = new Set<string>()
  const pageSize = 100
  // Stored messages are the backlog: messages beyond this run's limit are picked
  // up during the next sync, including messages queued by the former agentteam.
  for (let from = 0; targets.length < 10; from += pageSize) {
    const { data, error } = await supabase.from("mail_messages")
      .select("id,thread_id,from_address,raw_headers,mail_threads!inner(status),drafts:mail_drafts!mail_drafts_in_reply_to_message_id_fkey(status)")
      .eq("mail_account_id", accountId)
      .eq("direction", "inbound")
      .in("mail_threads.status", ["new", "draft_ready", "needs_review"])
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(from, from + pageSize - 1)
    if (error) throw new Error("Wachtende supportberichten konden niet worden geladen.")
    const candidates = (data ?? []) as unknown as Candidate[]
    for (const message of candidates) {
      // Only the latest inbound message per conversation needs a reply.
      if (seenThreads.has(message.thread_id)) continue
      seenThreads.add(message.thread_id)
      if (isAutomatedMail(message.raw_headers ?? {}, message.from_address)) continue
      if (message.drafts.some((draft) => draft.status !== "failed")) continue
      targets.push(message)
      if (targets.length === 10) break
    }
    if (candidates.length < pageSize) break
  }

  let drafts = 0
  let failed = 0
  // Bounded parallelism keeps generation within the sync route's time budget.
  for (let index = 0; index < targets.length; index += 3) {
    const results = await Promise.allSettled(targets.slice(index, index + 3).map((message) =>
      generateReplyDraft(supabase, { threadId: message.thread_id, messageId: message.id }),
    ))
    drafts += results.filter((result) => result.status === "fulfilled").length
    failed += results.filter((result) => result.status === "rejected").length
  }
  return { drafts, failed }
}
