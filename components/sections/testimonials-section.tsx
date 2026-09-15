"use client"
import { useEffect, useState } from "react"
import { Star } from "lucide-react"
import type { SectionRenderProps } from "@/components/editor/section-registry"
import { EditableText } from "@/components/editor/inline-editable-text"
import { getLayoutClasses } from "@/lib/section-layouts"
import { getSectionColorVars } from "@/lib/section-colors"
import { googleReviewUrl, reviewMode, reviewLimit, type PublicReview } from "@/lib/reviews/shared"

export function TestimonialsSection({ data, isPreview, styles, onUpdate, websiteId }: SectionRenderProps) {
  const mode = reviewMode(data), url = googleReviewUrl(data.googleReviewUrl), limit = reviewLimit(data.reviewLimit)
  const [result, setResult] = useState<{ websiteId: string; reviews: PublicReview[]; collectionUrl: string } | null>(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    if (mode !== "collection" || !websiteId) return
    const controller = new AbortController()
    fetch(`/api/reviews?websiteId=${encodeURIComponent(websiteId)}&limit=${limit}`, { cache: "no-store", signal: controller.signal })
      .then(async (response) => { if (!response.ok) throw new Error(); return response.json() })
      .then((value) => { setResult({ ...value, websiteId }); setFailed(false) })
      .catch(() => { if (!controller.signal.aborted) { setResult(null); setFailed(true) } })
    return () => controller.abort()
  }, [mode, websiteId, limit])
  const collection = result?.websiteId === websiteId ? result : null
  const editing = Boolean(onUpdate) && !isPreview
  if (mode === "google" && !url && !editing) return null
  if (mode === "collection" && !collection && !editing) return null
  const layout = getLayoutClasses(data.layout)
  const sectionStyle = { ...getSectionColorVars(styles), backgroundColor: styles?.backgroundColor, color: styles?.textColor }
  return <section className={`px-4 sm:px-6 ${layout.section} ${styles?.fontFamily ?? ""}`} style={sectionStyle}>
    <div className={`mx-auto ${layout.container}`}>
      <div className={`mb-8 ${layout.heading}`}>
        <EditableText as="h2" data={data} path={["title"]} value={String(data.title || "Ervaringen van klanten")} isPreview={isPreview} onUpdate={onUpdate} className="text-2xl font-bold sm:text-3xl" />
        {Boolean(data.subtitle) && <EditableText as="p" data={data} path={["subtitle"]} value={String(data.subtitle)} isPreview={isPreview} onUpdate={onUpdate} className="mt-3 text-sm text-muted-foreground" />}
      </div>
      {mode === "google" ? <div className={layout.heading}>{url ? <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex max-w-full rounded-lg bg-[var(--section-accent)] px-5 py-3 text-center text-sm font-semibold text-[var(--section-accent-foreground)]">{String(data.googleButtonText || "Lees onze recensies op Google")}</a> : <p className="rounded-lg border border-dashed border-border p-5 text-sm text-muted-foreground">Voeg een Google-recensielink toe in de sectie-instellingen.</p>}</div>
        : collection ? <>
          <p className="mb-4 text-sm text-muted-foreground">Gepubliceerde klantervaringen. Inzendingen worden beoordeeld op spam, relevantie en persoonlijke informatie. Hieronder staan de nieuwste gepubliceerde recensies.</p>
          <div className={`grid gap-4 ${layout.grid}`}>{collection.reviews.map((review) => <article key={review.id} className="flex min-w-0 flex-col gap-3 rounded-xl border border-border bg-[var(--section-surface)] p-5 text-[var(--section-surface-foreground)]">
            <div className="flex gap-1" role="img" aria-label={`${review.rating} van 5 sterren`}>{[1,2,3,4,5].map((star) => <Star aria-hidden="true" key={star} className={`h-4 w-4 ${star <= review.rating ? "fill-current text-[var(--section-accent)]" : "text-muted-foreground"}`} />)}</div>
            <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{review.body}</p>
            <div className="mt-auto border-t border-border pt-3"><p className="break-words text-sm font-semibold">{review.display_name}</p><time className="text-xs text-muted-foreground" dateTime={review.created_at}>{new Date(review.created_at).toLocaleDateString("nl-NL", { timeZone: "Europe/Amsterdam" })}</time></div>
          </article>)}</div>
          {collection.reviews.length === 0 && <p className="py-4 text-sm text-muted-foreground">Nog geen recensies. Deel als eerste je ervaring.</p>}
          <a href={collection.collectionUrl} className="mt-6 inline-flex rounded-lg bg-[var(--section-accent)] px-5 py-3 text-sm font-semibold text-[var(--section-accent-foreground)]">Schrijf een recensie</a>
        </> : <p className="rounded-lg border border-dashed p-5 text-sm text-muted-foreground">{failed ? "Publiceer de verzamelmodus met een actief Gold-abonnement. Controleer bij een storing Beheer recensies." : "Recensies laden…"}</p>}
    </div>
  </section>
}
