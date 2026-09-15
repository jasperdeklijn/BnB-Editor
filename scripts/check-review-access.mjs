import nextEnv from "@next/env"

// Read-only diagnostics. Never print credentials, customer content or email addresses.
nextEnv.loadEnvConfig(process.cwd(), true, { info() {}, error() {} })
const websiteId = process.argv[2]
if (!websiteId || !/^[a-f0-9-]{36}$/i.test(websiteId)) throw new Error("Usage: node scripts/check-review-access.mjs <website UUID>")
async function read(path, query) {
  const url = new URL(`/rest/v1/${path}`, process.env.NEXT_PUBLIC_SUPABASE_URL)
  url.search = new URLSearchParams(query).toString()
  const response = await fetch(url, { headers: {
    apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
  } })
  const data = await response.json()
  return response.ok ? { data } : { error: { code: data.code ?? response.status } }
}
const { data: websites, error } = await read("websites", {
  select: "id,user_id,business_id,published,live_snapshot", id: `eq.${websiteId}`,
})
if (error) throw new Error(`Website read failed: ${error.code}`)
const website = websites[0]
if (!website) throw new Error("Website not found")
const [gold, live, draft] = await Promise.all([
  read("rpc/review_gold_access", { p_user: website.user_id }),
  read("rpc/review_collection_live", { p_website: websiteId }),
  read("website_sections", { select: "id,content", website_id: `eq.${websiteId}`, type: "eq.testimonials" }),
])
const snapshot = website.live_snapshot
console.log(JSON.stringify({
  websiteId,
  published: website.published,
  businessLinked: Boolean(website.business_id),
  snapshotBusinessLinked: Boolean(snapshot?.website?.businessId),
  businessMatchesSnapshot: website.business_id === snapshot?.website?.businessId,
  draftReviewModes: draft.data?.map((section) => section.content?.reviewMode ?? "google"),
  liveReviewModes: snapshot?.sections?.filter((section) => section.type === "testimonials").map((section) => section.data?.reviewMode ?? "google"),
  databaseGoldAccess: gold.error ? { error: gold.error.code } : gold.data,
  databaseCollectionLive: live.error ? { error: live.error.code } : live.data,
  reviewBaseUrl: process.env.REVIEWS_BASE_URL ? new URL(process.env.REVIEWS_BASE_URL).origin : "platform default",
}, null, 2))
