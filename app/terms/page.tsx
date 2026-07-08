import { LegalDocumentPage, getLegalMetadata } from "@/components/legal/legal-documents"
import { LegalLayout } from "@/components/layout/legal-layout"

export const metadata = getLegalMetadata("terms")

export default function TermsPage() {
  return (
    <LegalLayout title="Algemene voorwaarden">
      <LegalDocumentPage documentKey="terms" />
    </LegalLayout>
  )
}
