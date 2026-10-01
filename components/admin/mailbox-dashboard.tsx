"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Archive, Bot, Check, Inbox, Loader2, Mail, MailOpen, RefreshCw, Send, ShieldAlert, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import type { MailDraftRecord, MailKnowledgeAnswer, MailMessageRecord, MailThreadRecord, MailThreadStatus } from "@/lib/mail/types"
import { cn } from "@/lib/utils"

type MailFilter = "all" | "open" | "unread" | MailThreadStatus
const FILTERS: Array<{ value: MailFilter; label: string }> = [
  { value: "open", label: "Open" }, { value: "unread", label: "Ongelezen" },
  { value: "all", label: "Alles" }, { value: "new", label: "Nieuw" }, { value: "draft_ready", label: "Concept klaar" },
  { value: "needs_review", label: "Controle nodig" }, { value: "replied", label: "Beantwoord" }, { value: "closed", label: "Gesloten" },
]

const STATUS_LABELS: Record<MailThreadStatus, string> = {
  new: "Nieuw", draft_ready: "Concept klaar", needs_review: "Controle nodig", replied: "Beantwoord", closed: "Gesloten", ignored: "Genegeerd",
}

type LatestRun = { status: string; started_at: string; created_count: number; draft_count: number; error_message: string | null } | null

export function MailboxDashboard({ initialThreads, initialMessages, initialDrafts, knowledge, configuration, latestRun, initialThreadId, initialFilter = "all" }: {
  initialThreads: MailThreadRecord[]
  initialMessages: MailMessageRecord[]
  initialDrafts: MailDraftRecord[]
  knowledge: MailKnowledgeAnswer[]
  configuration: { configured: boolean; mailbox: string | null; imapHost: string; smtpHost: string }
  latestRun: LatestRun
  initialThreadId?: string
  initialFilter?: MailFilter
}) {
  const router = useRouter()
  const [threads, setThreads] = useState(initialThreads)
  const [messages, setMessages] = useState(initialMessages)
  const [drafts, setDrafts] = useState(initialDrafts)
  const [selectedId, setSelectedId] = useState(initialThreadId ?? "")
  const [filter, setFilter] = useState<MailFilter>(initialFilter)
  const [search, setSearch] = useState("")
  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("")
  const [notice, setNotice] = useState<{ type: "error" | "success"; text: string } | null>(null)
  const [pending, startTransition] = useTransition()

  useEffect(() => { setThreads(initialThreads) }, [initialThreads])
  useEffect(() => { setMessages(initialMessages) }, [initialMessages])
  useEffect(() => { setDrafts(initialDrafts) }, [initialDrafts])

  const filtered = useMemo(() => threads.filter((thread) => {
    const matchesFilter = filter === "all" || (filter === "open" ? ["new", "draft_ready", "needs_review"].includes(thread.status) : filter === "unread" ? thread.unread_count > 0 : thread.status === filter)
    const term = search.trim().toLocaleLowerCase("nl-NL")
    return matchesFilter && (!term || `${thread.contact_name ?? ""} ${thread.contact_email} ${thread.subject_normalized}`.toLocaleLowerCase("nl-NL").includes(term))
  }), [filter, search, threads])
  const selected = filtered.find((thread) => thread.id === selectedId) ?? filtered[0] ?? null
  const threadMessages = selected ? messages.filter((message) => message.thread_id === selected.id) : []
  const latestInbound = [...threadMessages].reverse().find((message) => message.direction === "inbound")
  const latestOutbound = [...threadMessages].reverse().find((message) => message.direction === "outbound")
  const activeDraft = selected ? drafts.find((draft) => draft.thread_id === selected.id && !["discarded", "sent"].includes(draft.status)) ?? null : null
  const sentDraftForLatestInbound = selected && latestInbound
    ? drafts.find((draft) => draft.thread_id === selected.id && draft.in_reply_to_message_id === latestInbound.id && draft.status === "sent") ?? null
    : null
  const latestOutboundRepliesToLatestInbound = Boolean(latestInbound && latestOutbound && (
    (latestInbound.internet_message_id && latestOutbound.in_reply_to === latestInbound.internet_message_id)
    || new Date(latestOutbound.sent_at || latestOutbound.created_at).getTime() >= new Date(latestInbound.received_at || latestInbound.created_at).getTime()
  ))
  const sentReply = sentDraftForLatestInbound ? {
    subject: sentDraftForLatestInbound.subject,
    body: sentDraftForLatestInbound.final_body || sentDraftForLatestInbound.suggested_body,
    sentAt: sentDraftForLatestInbound.sent_at,
  } : latestOutboundRepliesToLatestInbound && latestOutbound ? {
    subject: latestOutbound.subject,
    body: latestOutbound.text_body,
    sentAt: latestOutbound.sent_at || latestOutbound.created_at,
  } : null

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
      const data = await jsonRequest(`/api/admin/mailbox/threads/${selected.id}/send`, { method: "POST", body: JSON.stringify({ draftId: activeDraft.id, subject, body, confirm: true }) })
      setThreads((items) => items.map((item) => item.id === selected.id ? { ...item, status: "replied", unread_count: 0 } : item))
      setDrafts((items) => items.map((draft) => draft.id === activeDraft.id ? { ...draft, status: "sent", final_body: body, sent_at: new Date().toISOString() } : draft))
      if (data.outboundMessage) {
        setMessages((items) => [...items.filter((message) => message.id !== data.outboundMessage.id), data.outboundMessage])
      }
      setNotice({ type: "success", text: "Antwoord is via TransIP verzonden." })
      router.refresh()
    })
  }

  return (
    <div className="space-y-4">
      <section className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-semibold">{configuration.configured ? `Verbonden mailbox: ${configuration.mailbox}` : "Mailbox nog niet geconfigureerd"}</p>
          <p className="mt-1 text-xs text-muted-foreground">{latestRun ? `Laatste sync: ${formatDate(latestRun.started_at)} · ${latestRun.created_count} nieuw · ${latestRun.draft_count} concepten` : "Nog geen synchronisatie uitgevoerd."}</p>
        </div>
        <Button disabled={pending || !configuration.configured} onClick={() => apiAction(async () => { await jsonRequest("/api/admin/mailbox/sync", { method: "POST" }); setNotice({ type: "success", text: "Mailbox gesynchroniseerd." }); router.refresh() })}>
          {pending ? <Loader2 className="mr-2 size-4 animate-spin" /> : <RefreshCw className="mr-2 size-4" />}Nu synchroniseren
        </Button>
      </section>
      {!configuration.configured && <div role="alert" className="rounded-xl border border-yellow-300/30 bg-yellow-300/10 p-4 text-sm text-yellow-800">Voeg `MAILBOX_USER` en `MAILBOX_PASSWORD` toe aan de serveromgeving. IMAP en SMTP staan standaard op TransIP.</div>}
      {notice && <div role="status" className={cn("rounded-xl border p-3 text-sm", notice.type === "error" ? "border-red-300/30 bg-red-300/10 text-red-800" : "border-emerald-300/30 bg-emerald-300/10 text-emerald-800")}>{notice.text}</div>}

      <div className="grid min-h-[680px] overflow-hidden rounded-2xl border border-border bg-secondary lg:grid-cols-[320px_minmax(0,1fr)_420px]">
        <aside className="border-b border-border lg:border-b-0 lg:border-r">
          <div className="space-y-3 border-b border-border p-4">
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Zoek afzender of onderwerp" className="border-border bg-muted" />
            <div className="flex gap-2 overflow-x-auto pb-1 lg:flex-wrap">
              {FILTERS.map((item) => <button key={item.value} aria-pressed={filter === item.value} onClick={() => setFilter(item.value)} className={cn("shrink-0 rounded-full px-3 py-1.5 text-xs focus-visible:ring-2 focus-visible:ring-ring", filter === item.value ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-secondary")}>{item.label}</button>)}
            </div>
          </div>
          <div className="max-h-[590px] overflow-y-auto">
            {filtered.length ? filtered.map((thread) => (
              <button key={thread.id} onClick={() => selectThread(thread)} className={cn("w-full border-b border-border p-4 text-left transition-colors", selected?.id === thread.id ? "bg-primary/10" : "hover:bg-card")}>
                <div className="flex items-start justify-between gap-3"><p className={cn("truncate text-sm", thread.unread_count ? "font-bold" : "font-medium")}>{thread.contact_name || thread.contact_email || "Onbekende afzender"}</p>{thread.unread_count > 0 && <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold">{thread.unread_count}</span>}</div>
                <p className="mt-1 truncate text-xs text-muted-foreground">{thread.subject_normalized || "Geen onderwerp"}</p>
                <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground"><span>{STATUS_LABELS[thread.status]}</span><time>{formatDate(thread.last_message_at)}</time></div>
              </button>
            )) : <Empty icon={Inbox} text="Geen conversaties voor dit filter." />}
          </div>
        </aside>

        <section className="flex min-w-0 flex-col border-b border-border lg:border-b-0 lg:border-r">
          {selected ? <>
            <header className="flex items-start justify-between gap-4 border-b border-border p-4 sm:p-5">
              <div className="min-w-0"><h2 className="truncate text-lg font-semibold">{threadMessages.at(-1)?.subject || selected.subject_normalized || "Geen onderwerp"}</h2><p className="mt-1 truncate text-xs text-muted-foreground">{selected.contact_name || selected.contact_email} · {selected.contact_email}</p></div>
              <div className="flex shrink-0 gap-2"><Button size="sm" variant="outline" className="border-border bg-card text-foreground hover:bg-card hover:text-foreground" onClick={() => updateStatus("closed")}><Archive className="mr-1 size-4" />Sluiten</Button>{selected.status === "closed" && <Button size="sm" variant="outline" className="border-border bg-card text-foreground hover:bg-card hover:text-foreground" onClick={() => updateStatus("new")}>Heropenen</Button>}</div>
            </header>
            <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
              {threadMessages.map((message) => <article key={message.id} className={cn("max-w-[88%] rounded-2xl border p-4", message.direction === "outbound" ? "ml-auto border-primary/25 bg-primary/10" : "border-border bg-card")}>
                <div className="flex items-center justify-between gap-4 text-xs text-muted-foreground"><span>{message.direction === "outbound" ? "FlexPagina support" : message.from_name || message.from_address}</span><time>{formatDate(message.received_at || message.sent_at || message.created_at)}</time></div>
                <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-muted-foreground">{message.text_body || "(geen tekstinhoud)"}</p>
                {message.attachment_metadata.length > 0 && <p className="mt-3 text-xs text-yellow-800">{message.attachment_metadata.length} bijlage(n) aanwezig; inhoud wordt niet automatisch geopend.</p>}
              </article>)}
            </div>
          </> : <Empty icon={MailOpen} text="Selecteer een conversatie." />}
        </section>

        <aside className="flex min-w-0 flex-col">
          {selected && latestInbound ? <>
            <header className="border-b border-border p-4"><div className="flex items-center justify-between"><div className="flex items-center gap-2"><Bot className="size-5 text-primary" /><h2 className="font-semibold">Antwoordvoorstel</h2></div>{activeDraft && <Confidence value={activeDraft.confidence} />}</div>
              {activeDraft?.confidence_reasons?.length ? <ul className="mt-3 space-y-1 text-xs text-muted-foreground">{activeDraft.confidence_reasons.map((reason) => <li key={reason}>· {reason}</li>)}</ul> : null}
            </header>
            <div className="flex-1 space-y-4 overflow-y-auto p-4">
              {activeDraft ? <>
                <label className="block text-xs font-medium text-muted-foreground">Onderwerp<Input className="mt-1.5 border-border bg-muted" value={subject} onChange={(event) => setSubject(event.target.value)} /></label>
                <label className="block text-xs font-medium text-muted-foreground">Antwoord<Textarea className="mt-1.5 min-h-[310px] border-border bg-muted leading-6" value={body} onChange={(event) => setBody(event.target.value)} /></label>
                <SourceList draft={activeDraft} knowledge={knowledge} />
                <div className="rounded-xl border border-yellow-300/20 bg-yellow-300/5 p-3 text-xs text-yellow-800"><ShieldAlert className="mb-2 size-4" />Controleer feiten, ontvanger en toezeggingen. De agent verstuurt nooit zonder jouw bevestiging.</div>
                <div className="flex flex-col gap-2 sm:flex-row"><Button className="flex-1" disabled={pending || !subject.trim() || !body.trim()} onClick={sendDraft}><Send className="mr-2 size-4" />Controleren en verzenden</Button><Button variant="outline" className="border-border bg-card text-foreground hover:bg-card hover:text-foreground" disabled={pending} onClick={generateDraft}><Sparkles className="mr-2 size-4" />Opnieuw</Button></div>
              </> : sentReply ? (
                <div className="rounded-xl border border-emerald-300/25 bg-emerald-300/5 p-4">
                  <div className="flex items-start gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-emerald-300/10 text-emerald-800"><Check className="size-4" /></span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-emerald-800">Antwoord verzonden</p>
                      {sentReply.sentAt ? <time className="mt-1 block text-xs text-muted-foreground">{formatDate(sentReply.sentAt)}</time> : null}
                    </div>
                  </div>
                  <p className="mt-4 break-words text-sm font-medium text-muted-foreground">{sentReply.subject}</p>
                  <div className="mt-3 max-h-[360px] overflow-y-auto whitespace-pre-wrap break-words rounded-lg border border-border bg-muted p-3 text-sm leading-6 text-muted-foreground">{sentReply.body}</div>
                  <p className="mt-3 text-xs leading-relaxed text-muted-foreground">Dit verzonden antwoord blijft bij deze conversatie bewaard.</p>
                </div>
              ) : <div className="rounded-xl border border-dashed border-border p-5 text-center"><Sparkles className="mx-auto size-6 text-primary" /><p className="mt-3 text-sm font-medium">Nog geen antwoordvoorstel</p><p className="mt-1 text-xs text-muted-foreground">Maak een voorstel met vaste kennis en eerder verzonden antwoorden.</p><Button className="mt-4" disabled={pending} onClick={generateDraft}>{pending ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Sparkles className="mr-2 size-4" />}Voorstel maken</Button></div>}
            </div>
          </> : <Empty icon={Mail} text="Voor deze conversatie is geen inkomend bericht beschikbaar." />}
        </aside>
      </div>
    </div>
  )
}

function SourceList({ draft, knowledge }: { draft: MailDraftRecord; knowledge: MailKnowledgeAnswer[] }) {
  const used = knowledge.filter((answer) => draft.knowledge_answer_ids.includes(answer.id))
  if (!used.length && !draft.example_message_ids.length) return <p className="text-xs text-muted-foreground">Geen kennisbronnen gebruikt; extra controle is nodig.</p>
  return <div className="rounded-xl border border-border bg-card p-3"><p className="text-xs font-semibold text-muted-foreground">Gebruikte bronnen</p><ul className="mt-2 space-y-1 text-xs text-muted-foreground">{used.map((answer) => <li key={answer.id}><Check className="mr-1 inline size-3 text-emerald-700" />{answer.question}</li>)}{draft.example_message_ids.length > 0 && <li><Check className="mr-1 inline size-3 text-emerald-700" />{draft.example_message_ids.length} eerder verzonden voorbeeld(en)</li>}</ul></div>
}

function Confidence({ value }: { value: MailDraftRecord["confidence"] }) {
  const styles = value === "high" ? "bg-emerald-300/10 text-emerald-800" : value === "medium" ? "bg-yellow-300/10 text-yellow-800" : "bg-red-300/10 text-red-800"
  return <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-medium", styles)}>{value === "high" ? "Hoge" : value === "medium" ? "Gemiddelde" : "Lage"} zekerheid</span>
}

function Empty({ icon: Icon, text }: { icon: typeof Inbox; text: string }) { return <div className="flex min-h-52 flex-1 flex-col items-center justify-center p-8 text-center text-muted-foreground"><Icon className="size-8" /><p className="mt-3 text-sm">{text}</p></div> }
function formatDate(value: string) {
  const parts = new Intl.DateTimeFormat("nl-NL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: "Europe/Amsterdam",
  }).formatToParts(new Date(value))
  const values = Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]))
  return `${values.day}-${values.month}-${values.year}, ${values.hour}:${values.minute}`
}
