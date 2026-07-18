import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { KnowledgeAnswersManager } from "@/components/admin/knowledge-answers-manager"
import { SharedHeader } from "@/components/layout/shared-header"
import type { MailKnowledgeAnswer } from "@/lib/mail/types"
import { isAdmin } from "@/lib/security"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export const metadata = { title: "Standaardantwoorden | AI mailbox" }

export default async function MailKnowledgePage() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) redirect("/auth/login")
  if (!isAdmin(user)) notFound()
  let answers: MailKnowledgeAnswer[] = []
  let loadError = ""
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) loadError = "De serverconfiguratie ontbreekt."
  else {
    const admin = await createAdminClient()
    const result = await admin.from("mail_knowledge_answers").select("*").order("priority", { ascending: false }).order("updated_at", { ascending: false })
    if (result.error) loadError = "De kennisbank kon niet worden geladen."
    else answers = (result.data ?? []) as MailKnowledgeAnswer[]
  }
  return <main className="min-h-screen bg-[var(--hero-bg)] text-white"><SharedHeader title="Standaardantwoorden" /><div className="mx-auto max-w-6xl px-4 py-8 sm:px-6"><div className="mb-6 flex items-end justify-between gap-4"><div><p className="text-sm font-semibold uppercase tracking-wide text-[var(--brand-blue)]">AI mailbox</p><h1 className="mt-2 text-3xl font-bold">Goedgekeurde kennis</h1><p className="mt-2 text-sm text-white/55">Vaste antwoorden hebben voorrang boven oude voorbeeldmails.</p></div><Link href="/admin/mailbox" className="text-sm font-medium text-[var(--brand-blue)] hover:text-white">Terug naar mailbox</Link></div>{loadError ? <div role="alert" className="rounded-xl border border-red-300/30 bg-red-300/10 p-4">{loadError}</div> : <KnowledgeAnswersManager initialAnswers={answers} />}</div></main>
}
