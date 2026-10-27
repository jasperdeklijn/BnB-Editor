import type { Metadata } from "next"
import { PLATFORM_BASE_URL, PLATFORM_BRAND_NAME } from "@/lib/platform"

export function marketingMetadata(path: string, title: string, description: string): Metadata {
  const fullTitle = `${title} | ${PLATFORM_BRAND_NAME}`
  return {
    title: { absolute: fullTitle },
    description,
    alternates: { canonical: path },
    robots: { index: true, follow: true },
    openGraph: {
      type: "website", locale: "nl_NL", siteName: PLATFORM_BRAND_NAME,
      url: path, title: fullTitle, description,
      images: [{ url: "/logo_klein.png", width: 1536, height: 1024, alt: PLATFORM_BRAND_NAME }],
    },
    twitter: { card: "summary_large_image", title: fullTitle, description, images: ["/logo_klein.png"] },
  }
}

export function marketingBreadcrumbs(items: { path: string; name: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [{ path: "/", name: "Home" }, ...items].map((item, index) => ({
      "@type": "ListItem", position: index + 1, name: item.name,
      item: new URL(item.path, PLATFORM_BASE_URL).href,
    })),
  }
}
