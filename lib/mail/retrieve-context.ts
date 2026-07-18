import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"
import type { MailKnowledgeAnswer, MailMessageRecord } from "@/lib/mail/types"

const STOP_WORDS = new Set(["de", "het", "een", "en", "of", "ik", "je", "jij", "u", "is", "zijn", "van", "voor", "met", "naar", "hoe", "wat", "kan", "kun", "mijn", "dit", "dat"])

function tokens(value: string) {
  return new Set(
    value.toLocaleLowerCase("nl-NL")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .split(/[^a-z0-9]+/)
      .filter((word) => word.length > 2 && !STOP_WORDS.has(word)),
  )
}

function overlapScore(query: Set<string>, value: string, keywords: string[] = []) {
  const candidate = tokens(`${value} ${keywords.join(" ")}`)
  let overlap = 0
  for (const word of query) if (candidate.has(word)) overlap += 1
  return query.size === 0 ? 0 : overlap / query.size
}

export async function retrieveReplyContext(supabase: SupabaseClient, subject: string, body: string) {
  const query = tokens(`${subject} ${body}`)
  const [{ data: knowledgeData }, { data: exampleData }] = await Promise.all([
    supabase.from("mail_knowledge_answers").select("*").eq("status", "active").order("priority", { ascending: false }).limit(100),
    supabase.from("mail_messages").select("id, subject, text_body, sent_at, created_at").eq("direction", "outbound").order("sent_at", { ascending: false, nullsFirst: false }).limit(100),
  ])

  const knowledge = ((knowledgeData ?? []) as MailKnowledgeAnswer[])
    .map((item) => ({ item, score: overlapScore(query, `${item.question} ${item.answer}`, item.keywords) + item.priority / 1_000 }))
    .filter(({ score }) => score > 0.05)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)

  const examples = ((exampleData ?? []) as Pick<MailMessageRecord, "id" | "subject" | "text_body" | "sent_at" | "created_at">[])
    .filter((item) => item.text_body.trim().length > 20)
    .map((item) => ({ item, score: overlapScore(query, `${item.subject} ${item.text_body}`) }))
    .filter(({ score }) => score > 0.1)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)

  return { knowledge, examples }
}
