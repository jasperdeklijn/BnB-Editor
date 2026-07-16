import type { MetadataRoute } from "next"

import { PLATFORM_BASE_URL } from "@/lib/platform"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/pricing", "/about", "/legal", "/status"],
      disallow: [
        "/admin/",
        "/api/",
        "/auth/",
        "/editor/",
        "/preview/",
      ],
    },
    sitemap: `${PLATFORM_BASE_URL}/sitemap.xml`,
    host: PLATFORM_BASE_URL,
  }
}
