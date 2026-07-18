"use client"

import { useState, useTransition } from "react"
import { Archive, Check, Loader2, Pencil, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import type { MailKnowledgeAnswer } from "@/lib/mail/types"

export function KnowledgeAnswersManager({ initialAnswers }: { initialAnswers: MailKnowledgeAnswer[] }) {
  const [answers, setAnswers] = useState(initialAnswers)
  const [question, setQuestion] = useState("")
  const [answer, setAnswer] = useState("")
  const [keywords, setKeywords] = useState("")
  const [category, setCategory] = useState("algemeen")
  const [notice, setNotice] = useState("")
  const [pending, startTransition] = useTransition()

  async function request(url: string, init: RequestInit) {
    const response = await fetch(url, { ...init, headers: { "Content-Type": "application/json" } })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(data.error || "Actie mislukt.")
    return data
  }

  function addAnswer() {
    setNotice("")
    startTransition(async () => {
      try {
        const data = await request("/api/admin/mailbox/knowledge", { method: "POST", body: JSON.stringify({ question, answer, category, keywords: keywords.split(",").map((value) => value.trim()).filter(Boolean), status: "active", priority: 50 }) })
        setAnswers((items) => [data.answer, ...items]); setQuestion(""); setAnswer(""); setKeywords(""); setNotice("Standaardantwoord toegevoegd en geactiveerd.")
      } catch (error) { setNotice(error instanceof Error ? error.message : "Toevoegen mislukt.") }
    })
  }

  function setStatus(id: string, status: MailKnowledgeAnswer["status"]) {
    startTransition(async () => {
      try { const data = await request(`/api/admin/mailbox/knowledge/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }); setAnswers((items) => items.map((item) => item.id === id ? data.answer : item)); setNotice("Status bijgewerkt.") }
      catch (error) { setNotice(error instanceof Error ? error.message : "Wijzigen mislukt.") }
    })
  }

  function editAnswer(item: MailKnowledgeAnswer) {
    const nextQuestion = window.prompt("Vraag", item.question)?.trim()
    if (!nextQuestion) return
    const nextAnswer = window.prompt("Goedgekeurd antwoord", item.answer)?.trim()
    if (!nextAnswer) return
    const nextKeywords = window.prompt("Trefwoorden, gescheiden door komma's", item.keywords.join(", "))
    if (nextKeywords === null) return
    startTransition(async () => {
      try {
        const data = await request(`/api/admin/mailbox/knowledge/${item.id}`, { method: "PATCH", body: JSON.stringify({ question: nextQuestion, answer: nextAnswer, keywords: nextKeywords.split(",").map((value) => value.trim()).filter(Boolean) }) })
        setAnswers((items) => items.map((answerItem) => answerItem.id === item.id ? data.answer : answerItem))
        setNotice("Standaardantwoord bijgewerkt.")
      } catch (error) { setNotice(error instanceof Error ? error.message : "Wijzigen mislukt.") }
    })
  }

  return <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
    <section className="h-fit rounded-2xl border border-white/10 bg-white/5 p-5"><div className="flex items-center gap-2"><Plus className="size-5 text-[var(--brand-blue)]" /><h2 className="font-semibold">Antwoord toevoegen</h2></div><div className="mt-5 space-y-4"><label className="block text-xs text-white/55">Vraag<Input className="mt-1.5 border-white/10 bg-black/20" value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Hoe koppel ik een domeinnaam?" /></label><label className="block text-xs text-white/55">Goedgekeurd antwoord<Textarea className="mt-1.5 min-h-36 border-white/10 bg-black/20" value={answer} onChange={(event) => setAnswer(event.target.value)} /></label><label className="block text-xs text-white/55">Trefwoorden, gescheiden door komma's<Input className="mt-1.5 border-white/10 bg-black/20" value={keywords} onChange={(event) => setKeywords(event.target.value)} placeholder="domein, koppelen, dns" /></label><label className="block text-xs text-white/55">Categorie<Input className="mt-1.5 border-white/10 bg-black/20" value={category} onChange={(event) => setCategory(event.target.value)} /></label><Button className="w-full" disabled={pending || question.trim().length < 3 || answer.trim().length < 3} onClick={addAnswer}>{pending ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Plus className="mr-2 size-4" />}Toevoegen en activeren</Button>{notice && <p role="status" className="text-xs text-white/60">{notice}</p>}</div></section>
    <section><div className="mb-3 flex items-center justify-between"><h2 className="text-lg font-semibold">{answers.length} standaardantwoorden</h2><span className="text-xs text-white/40">Alleen actieve antwoorden worden gebruikt</span></div><div className="space-y-3">{answers.map((item) => <article key={item.id} className="rounded-2xl border border-white/10 bg-white/5 p-5"><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">{item.question}</h3><span className={`rounded-full px-2 py-0.5 text-[10px] ${item.status === "active" ? "bg-emerald-300/10 text-emerald-200" : "bg-white/10 text-white/50"}`}>{item.status}</span></div><p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-white/70">{item.answer}</p><div className="mt-3 flex flex-wrap gap-2 text-[11px] text-white/40"><span>{item.category}</span>{item.keywords.map((keyword) => <span key={keyword} className="rounded bg-white/5 px-2 py-0.5">{keyword}</span>)}</div></div><div className="flex shrink-0 flex-wrap gap-2"><Button size="sm" variant="outline" disabled={pending} onClick={() => editAnswer(item)}><Pencil className="mr-1 size-4" />Bewerken</Button>{item.status !== "active" && <Button size="sm" variant="outline" disabled={pending} onClick={() => setStatus(item.id, "active")}><Check className="mr-1 size-4" />Activeren</Button>}{item.status !== "archived" && <Button size="sm" variant="outline" disabled={pending} onClick={() => setStatus(item.id, "archived")}><Archive className="mr-1 size-4" />Archiveren</Button>}</div></div></article>)}{answers.length === 0 && <p className="rounded-2xl border border-dashed border-white/15 p-10 text-center text-sm text-white/45">Nog geen standaardantwoorden.</p>}</div></section>
  </div>
}
