import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Juridisch | BnB Website Maken',
  description: 'Juridische documenten van BnB Website Maken',
}

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
