export async function removeDomainFromVercel(domain: string | null | undefined) {
  const token = process.env.VERCEL_ACCESS_TOKEN
  const projectId = process.env.VERCEL_PROJECT_ID

  if (!domain || !token || !projectId) {
    return { removed: false, skipped: true }
  }

  try {
    const response = await fetch(
      `https://api.vercel.com/v9/projects/${projectId}/domains/${encodeURIComponent(domain)}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      },
    )

    if (!response.ok && response.status !== 404) {
      console.warn("[Vercel Domain] Cleanup failed", { domain, status: response.status })
      return { removed: false, skipped: false }
    }

    return { removed: true, skipped: false }
  } catch (error) {
    console.warn("[Vercel Domain] Cleanup request failed", {
      domain,
      message: error instanceof Error ? error.message : String(error),
    })
    return { removed: false, skipped: false }
  }
}

