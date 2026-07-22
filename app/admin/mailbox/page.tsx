import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { MailboxDashboard } from "@/components/admin/mailbox-dashboard"
import { SharedHeader } from "@/components/layout/shared-header"
import { getMailConfigurationState } from "@/lib/mail/config"
import type { MailDraftRecord, MailKnowledgeAnswer, MailMessageRecord, MailThreadRecord } from "@/lib/mail/types"
import { isAdmin } from "@/lib/security"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export const metadata = { title: "AI mailbox | Beheer", description: "Controleer nieuwe supportmail en AI-antwoordvoorstellen." }

export default async function AdminMailboxPage() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) redirect("/auth/login")
  if (!isAdmin(user)) notFound()

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
    const [threadResult, knowledgeResult, runResult] = await Promise.all([
      admin.from("mail_threads").select("*").order("last_message_at", { ascending: false }).limit(250),
      admin.from("mail_knowledge_answers").select("*").order("priority", { ascending: false }).limit(250),
      admin.from("mail_sync_runs").select("*").order("started_at", { ascending: false }).limit(1).maybeSingle(),
    ])
    if (threadResult.error) {
      loadError = "De mailbox kon niet worden geladen. Voer eerst de mail-agentmigratie uit."
    } else {
      threads = (threadResult.data ?? []) as MailThreadRecord[]
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
      }
    }
  }

  return (
    <main className="min-h-screen bg-[var(--hero-bg)] text-white">
      <SharedHeader title="AI mailbox" />
      <div className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-[var(--brand-blue)]">Alleen beheerders</p>
            <h1 className="mt-2 text-3xl font-bold">Supportmailbox</h1>
            <p className="mt-2 max-w-2xl text-sm text-white/60">Nieuwe TransIP-mail, brononderbouwde antwoordvoorstellen en handmatig gecontroleerde verzending.</p>
          </div>
          <div className="flex gap-4 text-sm font-medium">
            <Link href="/admin/mailbox/knowledge" className="text-[var(--brand-blue)] hover:text-white">Standaardantwoorden</Link>
            <Link href="/admin" className="text-[var(--brand-blue)] hover:text-white">Adminoverzicht</Link>
          </div>
        </div>
        {loadError ? <div role="alert" className="rounded-xl border border-red-300/30 bg-red-300/10 p-5 text-red-100">{loadError}</div> : (
          <MailboxDashboard initialThreads={threads} initialMessages={messages} initialDrafts={drafts} knowledge={knowledge} configuration={getMailConfigurationState()} latestRun={latestRun} />
        )}
      </div>
    </main>
  )
}
