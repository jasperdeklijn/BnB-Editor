import type { MetadataRoute } from "next"

import { PLATFORM_BASE_URL } from "@/lib/platform"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      // OAI-SearchBot uses this general policy too. GPTBot training policy is unchanged.
      allow: "/",
      disallow: [
        "/admin$",
        "/admin/",
        "/api/",
        "/auth$",
        "/auth/",
        "/editor$",
        "/editor/",
        "/preview$",
        "/preview/",
        "/onboarding$",
        "/reviews/",
        "/aanvraag",
        "/booking/",
        "/site/",
      ],
    },
    sitemap: `${PLATFORM_BASE_URL}/sitemap.xml`,
    host: PLATFORM_BASE_URL,
  }
}
