import { ReviewForm } from "@/components/reviews/review-form"
import { collectionContext, requireWebsiteId, ReviewError } from "@/lib/reviews/server"
import { notFound } from "next/navigation"
export const dynamic = "force-dynamic"
export default async function CollectionPage({ params }: { params: Promise<{ websiteId: string }> }) {
  const { websiteId } = await params
  try { requireWebsiteId(websiteId) } catch { notFound() }
  let title = "Recensie", available = false, serviceError = false
  try { const result = await collectionContext(websiteId); title = result.website.title; available = true }
  catch (error) { if (!(error instanceof ReviewError)) throw error; serviceError = error.status === 503 }
  return <><h1 className="break-words text-2xl font-bold">{available ? `Deel je ervaring met ${title}` : "Je recensie beheren"}</h1>{serviceError && <p role="alert" className="text-sm text-destructive">Recensies zijn tijdelijk niet beschikbaar. Probeer het later opnieuw.</p>}<ReviewForm websiteId={websiteId} available={available} /></>
}
