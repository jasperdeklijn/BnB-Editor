"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Archive, Bot, Check, Inbox, Loader2, Mail, MailOpen, RefreshCw, Send, ShieldAlert, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import type { MailDraftRecord, MailKnowledgeAnswer, MailMessageRecord, MailThreadRecord, MailThreadStatus } from "@/lib/mail/types"
import { cn } from "@/lib/utils"

const FILTERS: Array<{ value: "all" | MailThreadStatus; label: string }> = [
  { value: "all", label: "Alles" }, { value: "new", label: "Nieuw" }, { value: "draft_ready", label: "Concept klaar" },
  { value: "needs_review", label: "Controle nodig" }, { value: "replied", label: "Beantwoord" }, { value: "closed", label: "Gesloten" },
]

const STATUS_LABELS: Record<MailThreadStatus, string> = {
  new: "Nieuw", draft_ready: "Concept klaar", needs_review: "Controle nodig", replied: "Beantwoord", closed: "Gesloten", ignored: "Genegeerd",
}

type LatestRun = { status: string; started_at: string; created_count: number; draft_count: number; error_message: string | null } | null

export function MailboxDashboard({ initialThreads, initialMessages, initialDrafts, knowledge, configuration, latestRun }: {
  initialThreads: MailThreadRecord[]
  initialMessages: MailMessageRecord[]
  initialDrafts: MailDraftRecord[]
  knowledge: MailKnowledgeAnswer[]
  configuration: { configured: boolean; mailbox: string | null; imapHost: string; smtpHost: string }
  latestRun: LatestRun
}) {
  const router = useRouter()
  const [threads, setThreads] = useState(initialThreads)
  const [drafts, setDrafts] = useState(initialDrafts)
  const [selectedId, setSelectedId] = useState(initialThreads[0]?.id ?? "")
  const [filter, setFilter] = useState<"all" | MailThreadStatus>("all")
  const [search, setSearch] = useState("")
  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("")
  const [notice, setNotice] = useState<{ type: "error" | "success"; text: string } | null>(null)
  const [pending, startTransition] = useTransition()

  useEffect(() => { setThreads(initialThreads) }, [initialThreads])
  useEffect(() => { setDrafts(initialDrafts) }, [initialDrafts])

  const filtered = useMemo(() => threads.filter((thread) => {
    const matchesFilter = filter === "all" || thread.status === filter
    const term = search.trim().toLocaleLowerCase("nl-NL")
    return matchesFilter && (!term || `${thread.contact_name ?? ""} ${thread.contact_email} ${thread.subject_normalized}`.toLocaleLowerCase("nl-NL").includes(term))
  }), [filter, search, threads])
  const selected = threads.find((thread) => thread.id === selectedId) ?? filtered[0] ?? null
  const threadMessages = selected ? initialMessages.filter((message) => message.thread_id === selected.id) : []
  const latestInbound = [...threadMessages].reverse().find((message) => message.direction === "inbound")
  const activeDraft = selected ? drafts.find((draft) => draft.thread_id === selected.id && !["discarded", "sent"].includes(draft.status)) ?? null : null

  useEffect(() => {
    setSubject(activeDraft?.subject ?? (latestInbound ? (/^re\s*:/i.test(latestInbound.subject) ? latestInbound.subject : `Re: ${latestInbound.subject}`) : ""))
    setBody(activeDraft?.final_body ?? activeDraft?.suggested_body ?? "")
  }, [activeDraft, latestInbound])

  function apiAction(action: () => Promise<void>) {
    setNotice(null)
    startTransition(async () => {
      try { await action() } catch (error) { setNotice({ type: "error", text: error instanceof Error ? error.message : "Actie mislukt." }) }
    })
  }

  async function jsonRequest(url: string, init: RequestInit) {
    const response = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...init.headers } })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(data.error || "Actie mislukt.")
    return data
  }

  function selectThread(thread: MailThreadRecord) {
    setSelectedId(thread.id)
    if (thread.unread_count > 0) apiAction(async () => {
      await jsonRequest(`/api/admin/mailbox/threads/${thread.id}`, { method: "PATCH", body: JSON.stringify({ markRead: true }) })
      setThreads((items) => items.map((item) => item.id === thread.id ? { ...item, unread_count: 0 } : item))
    })
  }

  function updateStatus(status: MailThreadStatus) {
    if (!selected) return
    apiAction(async () => {
      await jsonRequest(`/api/admin/mailbox/threads/${selected.id}`, { method: "PATCH", body: JSON.stringify({ status }) })
      setThreads((items) => items.map((item) => item.id === selected.id ? { ...item, status } : item))
      setNotice({ type: "success", text: `Conversatie gemarkeerd als ${STATUS_LABELS[status].toLocaleLowerCase("nl-NL")}.` })
    })
  }

  function generateDraft() {
    if (!selected || !latestInbound) return
    apiAction(async () => {
      const data = await jsonRequest(`/api/admin/mailbox/threads/${selected.id}/draft`, { method: "POST", body: JSON.stringify({ messageId: latestInbound.id, force: Boolean(activeDraft) }) })
      setDrafts((items) => [data.draft, ...items.filter((draft) => draft.id !== data.draft.id)])
      setThreads((items) => items.map((item) => item.id === selected.id ? { ...item, status: data.draft.confidence === "low" ? "needs_review" : "draft_ready" } : item))
      setNotice({ type: "success", text: "Nieuw antwoordvoorstel gemaakt." })
    })
  }

  function sendDraft() {
    if (!selected || !activeDraft || !latestInbound) return
    const confirmed = window.confirm(`Controleer de verzending:\n\nAan: ${latestInbound.from_address}\nOnderwerp: ${subject}\n\n${body}\n\nDefinitief verzenden via TransIP?`)
    if (!confirmed) return
    apiAction(async () => {
      await jsonRequest(`/api/admin/mailbox/threads/${selected.id}/send`, { method: "POST", body: JSON.stringify({ draftId: activeDraft.id, subject, body, confirm: true }) })
      setThreads((items) => items.map((item) => item.id === selected.id ? { ...item, status: "replied", unread_count: 0 } : item))
      setDrafts((items) => items.map((draft) => draft.id === activeDraft.id ? { ...draft, status: "sent", final_body: body, sent_at: new Date().toISOString() } : draft))
      setNotice({ type: "success", text: "Antwoord is via TransIP verzonden." })
      router.refresh()
    })
  }

  return (
    <div className="space-y-4">
      <section className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-semibold">{configuration.configured ? `Verbonden mailbox: ${configuration.mailbox}` : "Mailbox nog niet geconfigureerd"}</p>
          <p className="mt-1 text-xs text-white/45">{latestRun ? `Laatste sync: ${formatDate(latestRun.started_at)} · ${latestRun.created_count} nieuw · ${latestRun.draft_count} concepten` : "Nog geen synchronisatie uitgevoerd."}</p>
        </div>
        <Button disabled={pending || !configuration.configured} onClick={() => apiAction(async () => { await jsonRequest("/api/admin/mailbox/sync", { method: "POST" }); setNotice({ type: "success", text: "Mailbox gesynchroniseerd." }); router.refresh() })}>
          {pending ? <Loader2 className="mr-2 size-4 animate-spin" /> : <RefreshCw className="mr-2 size-4" />}Nu synchroniseren
        </Button>
      </section>
      {!configuration.configured && <div role="alert" className="rounded-xl border border-yellow-300/30 bg-yellow-300/10 p-4 text-sm text-yellow-100">Voeg `MAILBOX_USER` en `MAILBOX_PASSWORD` toe aan de serveromgeving. IMAP en SMTP staan standaard op TransIP.</div>}
      {notice && <div role="status" className={cn("rounded-xl border p-3 text-sm", notice.type === "error" ? "border-red-300/30 bg-red-300/10 text-red-100" : "border-emerald-300/30 bg-emerald-300/10 text-emerald-100")}>{notice.text}</div>}

      <div className="grid min-h-[680px] overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] lg:grid-cols-[320px_minmax(0,1fr)_420px]">
        <aside className="border-b border-white/10 lg:border-b-0 lg:border-r">
          <div className="space-y-3 border-b border-white/10 p-4">
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Zoek afzender of onderwerp" className="border-white/10 bg-black/20" />
            <div className="flex gap-2 overflow-x-auto pb-1 lg:flex-wrap">
              {FILTERS.map((item) => <button key={item.value} onClick={() => setFilter(item.value)} className={cn("shrink-0 rounded-full px-3 py-1.5 text-xs", filter === item.value ? "bg-[var(--brand-blue)] text-white" : "bg-white/5 text-white/55 hover:bg-white/10")}>{item.label}</button>)}
            </div>
          </div>
          <div className="max-h-[590px] overflow-y-auto">
            {filtered.length ? filtered.map((thread) => (
              <button key={thread.id} onClick={() => selectThread(thread)} className={cn("w-full border-b border-white/10 p-4 text-left transition-colors", selected?.id === thread.id ? "bg-[var(--brand-blue)]/10" : "hover:bg-white/5")}>
                <div className="flex items-start justify-between gap-3"><p className={cn("truncate text-sm", thread.unread_count ? "font-bold" : "font-medium")}>{thread.contact_name || thread.contact_email || "Onbekende afzender"}</p>{thread.unread_count > 0 && <span className="rounded-full bg-[var(--brand-blue)] px-2 py-0.5 text-[10px] font-bold">{thread.unread_count}</span>}</div>
                <p className="mt-1 truncate text-xs text-white/55">{thread.subject_normalized || "Geen onderwerp"}</p>
                <div className="mt-2 flex items-center justify-between text-[11px] text-white/35"><span>{STATUS_LABELS[thread.status]}</span><time>{formatDate(thread.last_message_at)}</time></div>
              </button>
            )) : <Empty icon={Inbox} text="Geen conversaties voor dit filter." />}
          </div>
        </aside>

        <section className="flex min-w-0 flex-col border-b border-white/10 lg:border-b-0 lg:border-r">
          {selected ? <>
            <header className="flex items-start justify-between gap-4 border-b border-white/10 p-4 sm:p-5">
              <div className="min-w-0"><h2 className="truncate text-lg font-semibold">{threadMessages.at(-1)?.subject || selected.subject_normalized || "Geen onderwerp"}</h2><p className="mt-1 truncate text-xs text-white/45">{selected.contact_name || selected.contact_email} · {selected.contact_email}</p></div>
              <div className="flex shrink-0 gap-2"><Button size="sm" variant="outline" className="border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white" onClick={() => updateStatus("closed")}><Archive className="mr-1 size-4" />Sluiten</Button>{selected.status === "closed" && <Button size="sm" variant="outline" className="border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white" onClick={() => updateStatus("new")}>Heropenen</Button>}</div>
            </header>
            <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
              {threadMessages.map((message) => <article key={message.id} className={cn("max-w-[88%] rounded-2xl border p-4", message.direction === "outbound" ? "ml-auto border-[var(--brand-blue)]/25 bg-[var(--brand-blue)]/10" : "border-white/10 bg-white/5")}>
                <div className="flex items-center justify-between gap-4 text-xs text-white/40"><span>{message.direction === "outbound" ? "FlexPagina support" : message.from_name || message.from_address}</span><time>{formatDate(message.received_at || message.sent_at || message.created_at)}</time></div>
                <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-white/85">{message.text_body || "(geen tekstinhoud)"}</p>
                {message.attachment_metadata.length > 0 && <p className="mt-3 text-xs text-yellow-100/70">{message.attachment_metadata.length} bijlage(n) aanwezig; inhoud wordt niet automatisch geopend.</p>}
              </article>)}
            </div>
          </> : <Empty icon={MailOpen} text="Selecteer een conversatie." />}
        </section>

        <aside className="flex min-w-0 flex-col">
          {selected && latestInbound ? <>
            <header className="border-b border-white/10 p-4"><div className="flex items-center justify-between"><div className="flex items-center gap-2"><Bot className="size-5 text-[var(--brand-blue)]" /><h2 className="font-semibold">Antwoordvoorstel</h2></div>{activeDraft && <Confidence value={activeDraft.confidence} />}</div>
              {activeDraft?.confidence_reasons?.length ? <ul className="mt-3 space-y-1 text-xs text-white/45">{activeDraft.confidence_reasons.map((reason) => <li key={reason}>· {reason}</li>)}</ul> : null}
            </header>
            <div className="flex-1 space-y-4 overflow-y-auto p-4">
              {activeDraft ? <>
                <label className="block text-xs font-medium text-white/55">Onderwerp<Input className="mt-1.5 border-white/10 bg-black/20" value={subject} onChange={(event) => setSubject(event.target.value)} /></label>
                <label className="block text-xs font-medium text-white/55">Antwoord<Textarea className="mt-1.5 min-h-[310px] border-white/10 bg-black/20 leading-6" value={body} onChange={(event) => setBody(event.target.value)} /></label>
                <SourceList draft={activeDraft} knowledge={knowledge} />
                <div className="rounded-xl border border-yellow-300/20 bg-yellow-300/5 p-3 text-xs text-yellow-100/80"><ShieldAlert className="mb-2 size-4" />Controleer feiten, ontvanger en toezeggingen. De agent verstuurt nooit zonder jouw bevestiging.</div>
                <div className="flex flex-col gap-2 sm:flex-row"><Button className="flex-1" disabled={pending || !subject.trim() || !body.trim()} onClick={sendDraft}><Send className="mr-2 size-4" />Controleren en verzenden</Button><Button variant="outline" className="border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white" disabled={pending} onClick={generateDraft}><Sparkles className="mr-2 size-4" />Opnieuw</Button></div>
              </> : <div className="rounded-xl border border-dashed border-white/15 p-5 text-center"><Sparkles className="mx-auto size-6 text-[var(--brand-blue)]" /><p className="mt-3 text-sm font-medium">Nog geen antwoordvoorstel</p><p className="mt-1 text-xs text-white/45">Maak een voorstel met vaste kennis en eerder verzonden antwoorden.</p><Button className="mt-4" disabled={pending} onClick={generateDraft}>{pending ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Sparkles className="mr-2 size-4" />}Voorstel maken</Button></div>}
            </div>
          </> : <Empty icon={Mail} text="Voor deze conversatie is geen inkomend bericht beschikbaar." />}
        </aside>
      </div>
    </div>
  )
}

function SourceList({ draft, knowledge }: { draft: MailDraftRecord; knowledge: MailKnowledgeAnswer[] }) {
  const used = knowledge.filter((answer) => draft.knowledge_answer_ids.includes(answer.id))
  if (!used.length && !draft.example_message_ids.length) return <p className="text-xs text-white/40">Geen kennisbronnen gebruikt; extra controle is nodig.</p>
  return <div className="rounded-xl border border-white/10 bg-white/5 p-3"><p className="text-xs font-semibold text-white/70">Gebruikte bronnen</p><ul className="mt-2 space-y-1 text-xs text-white/45">{used.map((answer) => <li key={answer.id}><Check className="mr-1 inline size-3 text-emerald-300" />{answer.question}</li>)}{draft.example_message_ids.length > 0 && <li><Check className="mr-1 inline size-3 text-emerald-300" />{draft.example_message_ids.length} eerder verzonden voorbeeld(en)</li>}</ul></div>
}

function Confidence({ value }: { value: MailDraftRecord["confidence"] }) {
  const styles = value === "high" ? "bg-emerald-300/10 text-emerald-200" : value === "medium" ? "bg-yellow-300/10 text-yellow-100" : "bg-red-300/10 text-red-100"
  return <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-medium", styles)}>{value === "high" ? "Hoge" : value === "medium" ? "Gemiddelde" : "Lage"} zekerheid</span>
}

function Empty({ icon: Icon, text }: { icon: typeof Inbox; text: string }) { return <div className="flex min-h-52 flex-1 flex-col items-center justify-center p-8 text-center text-white/40"><Icon className="size-8" /><p className="mt-3 text-sm">{text}</p></div> }
function formatDate(value: string) { return new Intl.DateTimeFormat("nl-NL", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Amsterdam" }).format(new Date(value)) }
