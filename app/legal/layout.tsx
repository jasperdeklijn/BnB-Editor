import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Juridisch | Website Maker',
  description: 'Juridische documenten van Website Maker',
}

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}

