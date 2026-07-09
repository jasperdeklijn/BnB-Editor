export const PLATFORM_BRAND_NAME = "FlexPagina.nl"
export const PLATFORM_BRAND_INITIALS = "FP"
export const PLATFORM_PRODUCT_DESCRIPTION = "websitebouwer voor kleine bedrijven"

// Keep production domain behavior centralized. Change these when the final
// platform domain is decided and DNS/Vercel routing are ready.
export const PLATFORM_DOMAIN = process.env.NEXT_PUBLIC_PLATFORM_DOMAIN || "FlexPagina.nl"
export const PLATFORM_BASE_URL = `https://${PLATFORM_DOMAIN}`

export const PLATFORM_EMAILS = {
  support: `support@${PLATFORM_DOMAIN}`,
  privacy: `privacy@${PLATFORM_DOMAIN}`,
  abuse: `abuse@${PLATFORM_DOMAIN}`,
  appeals: `appeals@${PLATFORM_DOMAIN}`,
  info: `info@${PLATFORM_DOMAIN}`,
}
