import "server-only"

export type PageSpeedResult = {
  score: number | null
}

type PageSpeedResponse = {
  lighthouseResult?: {
    categories?: {
      performance?: {
        score?: number
      }
    }
  }
}

export async function getPageSpeedScore(website: string | null | undefined): Promise<PageSpeedResult> {
  const apiKey = process.env.GOOGLE_PAGESPEED_API_KEY?.trim()
  if (!apiKey || !website) return { score: null }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 25_000)

  try {
    const endpoint = new URL("https://www.googleapis.com/pagespeedonline/v5/runPagespeed")
    endpoint.searchParams.set("url", website)
    endpoint.searchParams.set("key", apiKey)
    endpoint.searchParams.set("strategy", "mobile")
    endpoint.searchParams.set("category", "performance")

    const response = await fetch(endpoint, { signal: controller.signal, cache: "no-store" })
    if (!response.ok) return { score: null }

    const data = (await response.json()) as PageSpeedResponse
    const rawScore = data.lighthouseResult?.categories?.performance?.score
    if (typeof rawScore !== "number" || !Number.isFinite(rawScore)) return { score: null }

    return { score: Math.max(0, Math.min(100, Math.round(rawScore * 100))) }
  } catch {
    return { score: null }
  } finally {
    clearTimeout(timeout)
  }
}
