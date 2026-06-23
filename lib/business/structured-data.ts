type BusinessLike = {
  name?: string | null
  category?: string | null
  description?: string | null
  phone?: string | null
  email?: string | null
  street?: string | null
  city?: string | null
  postal?: string | null
  country?: string | null
  latitude?: number | string | null
  longitude?: number | string | null
  social_links?: Record<string, string> | null
  opening_note?: string | null
}

const CATEGORY_SCHEMA_TYPES: Record<string, string> = {
  restaurant: "Restaurant",
  hairdresser: "HairSalon",
  construction: "HomeAndConstructionBusiness",
}

export function buildLocalBusinessJsonLd(business: BusinessLike | null | undefined, url: string) {
  if (!business?.name) return null

  const schemaType = CATEGORY_SCHEMA_TYPES[business.category ?? ""] ?? "LocalBusiness"
  const sameAs = business.social_links
    ? Object.values(business.social_links).filter(Boolean)
    : []

  return {
    "@context": "https://schema.org",
    "@type": schemaType,
    name: business.name,
    description: business.description || undefined,
    url,
    telephone: business.phone || undefined,
    email: business.email || undefined,
    address: business.street || business.city || business.postal
      ? {
          "@type": "PostalAddress",
          streetAddress: business.street || undefined,
          addressLocality: business.city || undefined,
          postalCode: business.postal || undefined,
          addressCountry: business.country || "NL",
        }
      : undefined,
    geo: business.latitude && business.longitude
      ? {
          "@type": "GeoCoordinates",
          latitude: Number(business.latitude),
          longitude: Number(business.longitude),
        }
      : undefined,
    sameAs: sameAs.length > 0 ? sameAs : undefined,
    openingHoursSpecification: business.opening_note || undefined,
  }
}
