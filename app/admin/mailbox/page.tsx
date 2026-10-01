import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { MailboxDashboard } from "@/components/admin/mailbox-dashboard"
import { getMailConfigurationState } from "@/lib/mail/config"
import type { MailDraftRecord, MailKnowledgeAnswer, MailMessageRecord, MailThreadRecord } from "@/lib/mail/types"
import { isAdmin } from "@/lib/security"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { isUuid } from "@/lib/admin/model"

export const metadata = { title: "AI mailbox | Beheer", description: "Controleer nieuwe supportmail en AI-antwoordvoorstellen." }

export default async function AdminMailboxPage({ searchParams }: { searchParams: Promise<{ thread?: string; filter?: string }> }) {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) redirect("/auth/login")
  if (!isAdmin(user)) notFound()
  const params = await searchParams
  const threadId = params.thread && isUuid(params.thread) ? params.thread : undefined
  const initialFilter = params.filter === "open" || params.filter === "unread" ? params.filter : "all"

  let threads: MailThreadRecord[] = []
  let messages: MailMessageRecord[] = []
  let drafts: MailDraftRecord[] = []
  let knowledge: MailKnowledgeAnswer[] = []
  let latestRun = null
  let loadError = ""
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    loadError = "De server-side Supabase-configuratie ontbreekt."
  } else {
    const admin = await createAdminClient()
    let filteredThreadQuery = admin.from("mail_threads").select("*").order("last_message_at", { ascending: false }).limit(250)
    if (initialFilter === "open") filteredThreadQuery = filteredThreadQuery.in("status", ["new", "draft_ready", "needs_review"])
    if (initialFilter === "unread") filteredThreadQuery = filteredThreadQuery.gt("unread_count", 0)
    const [threadResult, knowledgeResult, runResult, selectedThreadResult, filteredThreadResult] = await Promise.all([
      admin.from("mail_threads").select("*").order("last_message_at", { ascending: false }).limit(250),
      admin.from("mail_knowledge_answers").select("*").order("priority", { ascending: false }).limit(250),
      admin.from("mail_sync_runs").select("*").order("started_at", { ascending: false }).limit(1).maybeSingle(),
      threadId ? admin.from("mail_threads").select("*").eq("id", threadId).maybeSingle() : Promise.resolve({ data: null, error: null }),
      initialFilter === "all" ? Promise.resolve({ data: [], error: null }) : filteredThreadQuery,
    ])
    if (threadResult.error) {
      loadError = "De mailbox kon niet worden geladen. Voer eerst de mail-agentmigratie uit."
    } else {
      threads = (threadResult.data ?? []) as MailThreadRecord[]
      if (selectedThreadResult.error || (threadId && !selectedThreadResult.data)) loadError = "Het geselecteerde supportgesprek kon niet worden geladen."
      if (selectedThreadResult.data && !threads.some((thread) => thread.id === threadId)) threads.unshift(selectedThreadResult.data as MailThreadRecord)
      if (filteredThreadResult.error) loadError = "De gefilterde supportgesprekken konden niet worden geladen."
      for (const thread of (filteredThreadResult.data ?? []) as MailThreadRecord[]) if (!threads.some((item) => item.id === thread.id)) threads.push(thread)
      threads.sort((a, b) => b.last_message_at.localeCompare(a.last_message_at))
      const threadIds = threads.map((thread) => thread.id)
      const [messageResult, draftResult] = threadIds.length > 0
        ? await Promise.all([
            admin.from("mail_messages").select("*").in("thread_id", threadIds).order("created_at", { ascending: false }).limit(5_000),
            admin.from("mail_drafts").select("*").in("thread_id", threadIds).order("created_at", { ascending: false }).limit(1_500),
          ])
        : [{ data: [], error: null }, { data: [], error: null }]

      if (messageResult.error || draftResult.error) {
        loadError = "De mailbox kon niet worden geladen. Voer eerst de mail-agentmigratie uit."
      } else {
        messages = ((messageResult.data ?? []) as MailMessageRecord[]).reverse()
        drafts = (draftResult.data ?? []) as MailDraftRecord[]
        knowledge = (knowledgeResult.data ?? []) as MailKnowledgeAnswer[]
        latestRun = runResult.data
        if (threadId) {
          const [selectedMessages, selectedDrafts] = await Promise.all([
            admin.from("mail_messages").select("*").eq("thread_id", threadId).order("created_at", { ascending: false }).limit(1000),
            admin.from("mail_drafts").select("*").eq("thread_id", threadId).order("created_at", { ascending: false }).limit(100),
          ])
          if (selectedMessages.error || selectedDrafts.error) loadError = "De inhoud van het geselecteerde gesprek kon niet worden geladen."
          else {
            messages = [...new Map([...messages, ...((selectedMessages.data ?? []) as MailMessageRecord[])].map((message) => [message.id, message])).values()].sort((a, b) => a.created_at.localeCompare(b.created_at))
            drafts = [...new Map([...drafts, ...((selectedDrafts.data ?? []) as MailDraftRecord[])].map((draft) => [draft.id, draft])).values()].sort((a, b) => b.created_at.localeCompare(a.created_at))
          }
        }
      }
    }
  }

  return (
    <main className="min-h-full bg-muted text-foreground">

      <div className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-primary">Alleen beheerders</p>
            <h1 className="mt-2 text-3xl font-bold">Supportmailbox</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Nieuwe TransIP-mail, brononderbouwde antwoordvoorstellen en handmatig gecontroleerde verzending.</p>
          </div>
          <div className="flex gap-4 text-sm font-medium">
            <Link href="/admin/mailbox/knowledge" className="text-primary hover:text-foreground">Standaardantwoorden</Link>
            <Link href="/admin" className="text-primary hover:text-foreground">Adminoverzicht</Link>
          </div>
        </div>
        {loadError ? <div role="alert" className="rounded-xl border border-red-300/30 bg-red-300/10 p-5 text-red-800">{loadError}</div> : (
          <MailboxDashboard key={`${threadId ?? "all"}-${initialFilter}`} initialThreadId={threadId} initialFilter={initialFilter} initialThreads={threads} initialMessages={messages} initialDrafts={drafts} knowledge={knowledge} configuration={getMailConfigurationState()} latestRun={latestRun} />
        )}
      </div>
    </main>
  )
}
