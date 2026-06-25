import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Accountinstellingen | Website Maker",
  description: "Beheer je account, facturering en abonnementen",
}

export default function AccountLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}

