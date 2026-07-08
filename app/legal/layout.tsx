import type { Metadata } from 'next'
import { PLATFORM_BRAND_NAME } from "@/lib/platform"

export const metadata: Metadata = {
  title: `Juridisch | ${PLATFORM_BRAND_NAME}`,
  description: `Juridische documenten van ${PLATFORM_BRAND_NAME}`,
}

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}

