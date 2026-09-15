"use client"
import Link from "next/link"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { getActiveWebsiteId, setActiveWebsiteId } from "@/lib/active-website"
import { REVIEW_STATUS_LABELS, type PublicReview, type ReviewStatus } from "@/lib/reviews/shared"
import { postReview } from "./review-form"
import { getReviewInvitationMailto } from "@/lib/reviews/presentation"
type OwnerReview = PublicReview & { email: string; status: ReviewStatus; delivery_status: string }
interface Overview { reviews: OwnerReview[]; total: number; pending: number; canCollect: boolean; hasLegacy: boolean; collectionUrl: string; events: { id: number; review_id: string | null; action: string; reason: string; created_at: string }[] }
export function ReviewsClient({ websites, initialWebsiteId }: { websites: { id: string; title: string }[]; initialWebsiteId?: string }) {
  const [websiteId, setWebsiteId] = useState(websites.some((site) => site.id === initialWebsiteId) ? initialWebsiteId! : "")
  const [overview, setOverview] = useState<(Overview & { websiteId: string }) | null>(null), [page, setPage] = useState(1), [revision, setRevision] = useState(0)
  const [error, setError] = useState(""), [message, setMessage] = useState(""), [loading, setLoading] = useState(true)
  const [deleteLegacy, setDeleteLegacy] = useState(false), [deletingLegacy, setDeletingLegacy] = useState(false)
  useEffect(() => { if (!websiteId) { const active = getActiveWebsiteId(); setWebsiteId(websites.find((site) => site.id === active)?.id || websites[0]?.id || "") } }, [websiteId, websites])
  useEffect(() => {
    if (!websiteId) return
    const controller = new AbortController()
    fetch(`/api/reviews?view=owner&websiteId=${websiteId}&page=${page}`, { cache: "no-store", signal: controller.signal })
      .then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.error); return data })
      .then((data) => { setOverview({ ...data, websiteId }); setError(""); setLoading(false) })
      .catch((failure) => { if (!controller.signal.aborted) { setError(failure.message); setLoading(false) } })
    return () => controller.abort()
  }, [websiteId, page, revision])
  const current = overview?.websiteId === websiteId ? overview : null
  function refresh() { setLoading(true); setRevision((value) => value + 1) }
  if (!websites.length) return <Card className="p-5">Maak eerst een website om recensies te beheren.</Card>
  return <div className="space-y-4">
    <div className="space-y-2"><Label htmlFor="reviews-website">Website</Label><select id="reviews-website" className="h-11 w-full max-w-lg rounded-md border border-input bg-background px-3 text-sm" value={websiteId} onChange={(event) => { setWebsiteId(event.target.value); setActiveWebsiteId(event.target.value); setPage(1); setLoading(true); setMessage("") }}>{websites.map((site) => <option key={site.id} value={site.id}>{site.title}</option>)}</select></div>
    {error && <p role="alert" className="text-sm text-destructive">{error} <Button variant="outline" size="sm" onClick={refresh}>Opnieuw proberen</Button></p>}
    {message && <p role="status" className="text-sm">{message}</p>}
    {current && <>
      {!current.canCollect && <Card className="space-y-2 p-4"><p className="text-sm">Verzamelen en publiceren vereist Gold. Bestaande gegevens blijven beschikbaar om te lezen, exporteren en verwijderen.</p><Link className="text-sm font-medium underline" href="/editor/account/billing">Bekijk Gold</Link></Card>}
      {current.hasLegacy && <Card className="space-y-3 p-4 text-sm"><p>Oude handmatige recensies zijn privé gearchiveerd. Download de export om ze terug te lezen. Kies een recensiemodus in de website-editor; oude teksten worden niet als klantinzendingen gepubliceerd.</p><Button size="sm" variant="outline" onClick={() => setDeleteLegacy(!deleteLegacy)}>Oud archief verwijderen</Button>{deleteLegacy && <div className="space-y-2"><p>Dit verwijdert het archief definitief, inclusief de herstelkopie. Exporteer eerst wat je wilt bewaren.</p><Button variant="destructive" size="sm" disabled={deletingLegacy} onClick={async () => { setDeletingLegacy(true); try { await postReview({ action: "delete-legacy", websiteId }); setDeleteLegacy(false); refresh() } catch (failure) { setError((failure as Error).message) } finally { setDeletingLegacy(false) } }}>Archief definitief verwijderen</Button></div>}</Card>}
      <Card className="space-y-3 p-4"><h2 className="font-semibold">{current.pending} te beoordelen</h2><p className="text-sm text-muted-foreground">Beoordeel op spam, relevantie, misbruik of privégegevens. Een lage beoordeling is geen afwijzingsreden. Tekst en sterren blijven ongewijzigd.</p>
        <div className="flex flex-wrap gap-2">{current.canCollect && <Button variant="outline" onClick={async () => { try { await navigator.clipboard.writeText(current.collectionUrl); setMessage("Verzamellink gekopieerd. Publiceer de verzamelmodus voordat je de link deelt.") } catch { setError("Kopiëren mislukt. Open de verzamellink en kopieer de URL.") } }}>Verzamellink kopiëren</Button>}<a className="inline-flex items-center rounded-md border border-input px-3 py-2 text-sm" href={current.collectionUrl} target="_blank" rel="noopener noreferrer">Verzamellink openen</a><a className="inline-flex items-center rounded-md border border-input px-3 py-2 text-sm" href={`/api/reviews?view=export&websiteId=${websiteId}`}>Gegevens exporteren</a></div>
      </Card>
      {current.canCollect && <Card className="space-y-3 p-4">
        <h2 className="font-semibold">Klanten uitnodigen</h2>
        <p className="text-sm text-muted-foreground">De verzamellink werkt ook als het formulier verborgen is op je website. Laat de modus Recensies verzamelen aanstaan en publiceer je website.</p>
        <a className="inline-flex min-h-11 items-center rounded-md border border-input px-3 py-2 text-sm font-medium hover:bg-muted" href={getReviewInvitationMailto(websites.find((site) => site.id === websiteId)?.title || "ons bedrijf", current.collectionUrl)}>Uitnodigen per e-mail</a>
        <p className="text-xs text-muted-foreground">Opent je e-mailprogramma met een uitnodiging en de recensielink. Kies zelf de ontvanger en verstuur de e-mail. Je kunt de verzamellink hierboven ook kopiëren.</p>
      </Card>}
    </>}
    {loading ? <p role="status" className="text-sm text-muted-foreground">Recensies laden…</p> : current && <>
      {!current.reviews.length && <Card className="p-6 text-sm text-muted-foreground">Nog geen inzendingen. Deel de verzamellink zodra deze modus live staat.</Card>}
      <div className="grid gap-4 lg:grid-cols-2">{current.reviews.map((review) => <ReviewCard key={review.id} review={review} websiteId={websiteId} canCollect={current.canCollect} onChanged={refresh} />)}</div>
      <div className="flex flex-wrap items-center gap-3"><Button variant="outline" disabled={page <= 1} onClick={() => { setPage(page - 1); setLoading(true) }}>Vorige</Button><span className="text-sm">Pagina {page} van {Math.max(1, Math.ceil(current.total / 25))}</span><Button variant="outline" disabled={page * 25 >= current.total} onClick={() => { setPage(page + 1); setLoading(true) }}>Volgende</Button></div>
      {current.events.length > 0 && <details className="rounded-lg border border-border p-4"><summary className="cursor-pointer text-sm font-medium">Laatste moderatieacties</summary><ul className="mt-3 space-y-2 text-xs">{current.events.map((event) => <li className="break-words" key={event.id}>{new Date(event.created_at).toLocaleString("nl-NL")} · {REVIEW_STATUS_LABELS[event.action as ReviewStatus] || ({ confirm: "E-mail bevestigd", withdraw: "Toestemming ingetrokken", delete: "Verwijderd" } as Record<string,string>)[event.action] || event.action}{event.reason ? ` — ${event.reason}` : ""}</li>)}</ul></details>}
    </>}
  </div>
}
function ReviewCard({ review, websiteId, canCollect, onChanged }: { review: OwnerReview; websiteId: string; canCollect: boolean; onChanged: () => void }) {
  const [reason, setReason] = useState(""), [error, setError] = useState(""), [busy, setBusy] = useState(false), [confirmDelete, setConfirmDelete] = useState(false)
  async function act(action: string) { setBusy(true); setError(""); try { await postReview({ websiteId, id: review.id, action, expectedStatus: review.status, reason }); onChanged() } catch (failure) { setError((failure as Error).message) } finally { setBusy(false) } }
  const moderatable = canCollect && ["pending", "published", "rejected"].includes(review.status)
  return <Card className="min-w-0 space-y-3 p-4">
    <div className="flex flex-wrap items-start justify-between gap-2"><h3 className="break-words font-semibold">{review.display_name}</h3><span className="rounded-full bg-muted px-2 py-1 text-xs">{REVIEW_STATUS_LABELS[review.status]}</span></div>
    <p className="text-sm">{review.rating} / 5 sterren · {new Date(review.created_at).toLocaleDateString("nl-NL")}</p>
    <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{review.body}</p>
    <p className="break-all text-xs text-muted-foreground">Privé: {review.email}{review.delivery_status === "failed" ? " · E-mailbezorging mislukt" : ""}</p>
    <Label htmlFor={`reason-${review.id}`}>Reden voor je actie</Label><Input id={`reason-${review.id}`} value={reason} onChange={(event) => setReason(event.target.value)} maxLength={500} placeholder="Bijvoorbeeld: relevante klantervaring" />
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <div className="flex flex-wrap gap-2">{moderatable && <>{review.status !== "published" && <Button size="sm" disabled={busy || reason.trim().length < 3} onClick={() => act("published")}>Publiceren</Button>}{review.status === "published" && <Button size="sm" variant="outline" disabled={busy || reason.trim().length < 3} onClick={() => act("pending")}>Publicatie intrekken</Button>}{review.status !== "rejected" && <Button size="sm" variant="outline" disabled={busy || reason.trim().length < 3} onClick={() => act("rejected")}>Afwijzen</Button>}</>}<Button size="sm" variant="outline" disabled={busy} onClick={() => setConfirmDelete(!confirmDelete)}>Verwijderen</Button></div>
    {confirmDelete && <div className="space-y-2 rounded-lg border border-destructive/30 p-3"><p className="text-sm">Deze inzending definitief verwijderen? Dit kan niet ongedaan worden gemaakt.</p><Button size="sm" variant="destructive" disabled={busy || reason.trim().length < 3} onClick={() => act("delete")}>Definitief verwijderen</Button></div>}
  </Card>
}
