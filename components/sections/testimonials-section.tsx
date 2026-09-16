"use client"
import { useEffect, useState } from "react"
import { Star } from "lucide-react"
import type { SectionRenderProps } from "@/components/editor/section-registry"
import { EditableText } from "@/components/editor/inline-editable-text"
import { ReviewForm } from "@/components/reviews/review-form"
import { getLayoutClasses } from "@/lib/section-layouts"
import { getSectionColorVars } from "@/lib/section-colors"
import { getReviewFormSettings, getReviewPanelClass } from "@/lib/reviews/presentation"
import { googleReviewUrl, reviewMode, reviewLimit, type PublicReview } from "@/lib/reviews/shared"

export function TestimonialsSection({ data, isPreview, styles, onUpdate, websiteId }: SectionRenderProps) {
  const mode = reviewMode(data), url = googleReviewUrl(data.googleReviewUrl), limit = reviewLimit(data.reviewLimit)
  const preview = isPreview || Boolean(onUpdate) || !websiteId
  const editing = !isPreview && Boolean(onUpdate)
  const formUpdate = editing ? onUpdate : undefined
  const showWebsiteForm = data.reviewFormOnWebsite !== false
  const [result, setResult] = useState<{ key: string; reviews: PublicReview[]; failed: boolean } | null>(null)
  const [attempt, setAttempt] = useState(0)
  const requestKey = `${websiteId}:${limit}:${attempt}`
  useEffect(() => {
    if (mode !== "collection" || !websiteId || preview) return
    const controller = new AbortController()
    fetch(`/api/reviews?websiteId=${encodeURIComponent(websiteId)}&limit=${limit}`, { cache: "no-store", signal: controller.signal })
      .then(async (response) => { if (!response.ok) throw new Error(); return response.json() })
      .then((value) => setResult({ key: requestKey, reviews: value.reviews ?? [], failed: false }))
      .catch(() => { if (!controller.signal.aborted) setResult({ key: requestKey, reviews: [], failed: true }) })
    return () => controller.abort()
  }, [mode, websiteId, limit, preview, requestKey])
  const collection = result?.key === requestKey ? result : null
  const layout = getLayoutClasses(data.layout), settings = getReviewFormSettings(data)
  const sectionStyle = {
    ...getSectionColorVars(styles),
    backgroundColor: styles?.backgroundColor,
    backgroundImage: styles?.backgroundImage ? `url(${styles.backgroundImage})` : undefined,
    backgroundSize: "cover",
    backgroundPosition: styles?.backgroundPosition || "center",
    color: styles?.textColor,
  }
  const reviews = collection?.reviews ?? []
  const formFirst = layout.layout === "card"
  const emptyText = !showWebsiteForm && !String(data.reviewEmptyText ?? "").trim()
    ? "Er zijn nog geen gepubliceerde recensies."
    : settings.reviewEmptyText
  const reviewList = <div className={`min-w-0 ${formFirst ? "order-2" : ""}`}>
    {reviews.length > 0 ? <>
      <p className="mb-4 text-sm opacity-75">Gepubliceerde klantervaringen. De nieuwste recensies staan bovenaan.</p>
      <div className={`grid gap-4 ${layout.layout === "split" ? "grid-cols-1" : layout.grid}`}>
        {reviews.map((review, index) => <article key={review.id} className={`${getReviewPanelClass(data.styleType)} flex flex-col gap-3 ${layout.layout === "showcase" && index === 0 ? "lg:col-span-2 text-lg" : "text-sm"}`}>
          <div className="flex gap-1" role="img" aria-label={`${review.rating} van 5 sterren`}>{[1, 2, 3, 4, 5].map((star) => <Star aria-hidden="true" key={star} className={`h-5 w-5 ${star <= review.rating ? "fill-yellow-400 text-yellow-400" : "text-current/35"}`} />)}</div>
          <p className="whitespace-pre-wrap break-words leading-relaxed">{review.body}</p>
          <div className="mt-auto border-t border-current/15 pt-3"><p className="break-words text-sm font-semibold">{review.display_name}</p><time className="text-xs opacity-75" dateTime={review.created_at}>{new Date(review.created_at).toLocaleDateString("nl-NL", { timeZone: "Europe/Amsterdam" })}</time></div>
        </article>)}
      </div>
    </> : <div role="status" className={`${getReviewPanelClass(data.styleType)} text-sm`}>
      {editing ? <EditableText as="p" data={data} path={["reviewEmptyText"]} value={emptyText} isPreview={false} onUpdate={onUpdate} multiline />
        : preview ? emptyText : !collection ? "Recensies laden…" : collection.failed ? "Recensies zijn momenteel niet beschikbaar. Probeer het later opnieuw." : emptyText}
    </div>}
    {collection?.failed && !preview && <button type="button" className="mt-3 min-h-11 text-sm underline underline-offset-4" onClick={() => setAttempt((value) => value + 1)}>Opnieuw proberen</button>}
  </div>
  return <section className={`px-4 sm:px-6 ${layout.section} ${styles?.fontFamily ?? ""}`} style={sectionStyle}>
    <div className={`mx-auto ${layout.container}`}>
      <div className={`mb-10 ${layout.heading}`}>
        <EditableText as="h2" data={data} path={["title"]} value={String(data.title || "Ervaringen van klanten")} isPreview={isPreview} onUpdate={onUpdate} className="mb-3 text-balance text-3xl font-bold md:text-4xl" />
        {(Boolean(data.subtitle) || editing) && <EditableText as="p" data={data} path={["subtitle"]} value={String(data.subtitle || "")} fallback="" isPreview={isPreview} onUpdate={onUpdate} className={`opacity-75 ${editing && !data.subtitle ? "min-h-6" : ""}`} multiline />}
      </div>
      {mode === "google" ? <div className={layout.heading}>{(url || editing) && <a href={url || "#"} target="_blank" rel="noopener noreferrer" onClick={preview ? (event) => event.preventDefault() : undefined} className="inline-flex max-w-full rounded-xl bg-[var(--section-accent)] px-6 py-3 text-center text-sm font-semibold text-[var(--section-accent-foreground)] shadow-sm"><EditableText data={data} path={["googleButtonText"]} value={String(data.googleButtonText || "Lees onze recensies op Google")} isPreview={isPreview} onUpdate={onUpdate} /></a>}{!url && <p className="mt-4 rounded-lg border border-dashed border-current/20 p-5 text-sm">{preview ? "Voeg een Google-recensielink toe in de sectie-instellingen." : "Recensies volgen binnenkort."}</p>}</div>
        : <div className={`grid items-start gap-8 ${layout.layout === "split" && showWebsiteForm ? "lg:grid-cols-2" : "grid-cols-1"}`}>
          {reviewList}
          {showWebsiteForm && (preview || collection) && <div className={`min-w-0 w-full ${layout.layout === "split" ? "" : "mx-auto max-w-2xl"} ${formFirst ? "order-1" : ""}`}>
            <ReviewForm websiteId={websiteId ?? ""} available={preview || !collection?.failed} preview={preview} data={data} styles={styles} onUpdate={formUpdate} />
          </div>}
        </div>}
      {mode === "collection" && !showWebsiteForm && editing && <details className="mt-6 rounded-lg border border-dashed border-current/25 p-4">
        <summary className="cursor-pointer text-sm font-medium">Formulier verborgen op website · voorbeeld losse recensiepagina</summary>
        <div className="mx-auto mt-4 max-w-2xl"><ReviewForm websiteId={websiteId ?? ""} available preview data={data} styles={styles} onUpdate={formUpdate} /></div>
      </details>}
    </div>
  </section>
}
