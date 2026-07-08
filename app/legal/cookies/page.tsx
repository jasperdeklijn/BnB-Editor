import { LegalDocumentPage, getLegalMetadata } from "@/components/legal/legal-documents"
import { LegalLayout } from "@/components/layout/legal-layout"

export const metadata = getLegalMetadata("cookies")

export default function LegalCookiesPage() {
  return (
    <LegalLayout title="Cookiebeleid">
      <LegalDocumentPage documentKey="cookies" />
    </LegalLayout>
  )
}
