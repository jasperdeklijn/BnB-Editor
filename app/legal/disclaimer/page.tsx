import { LegalDocumentPage, getLegalMetadata } from "@/components/legal/legal-documents"
import { LegalLayout } from "@/components/layout/legal-layout"

export const metadata = getLegalMetadata("disclaimer")

export default function LegalDisclaimerPage() {
  return (
    <LegalLayout title="Disclaimer">
      <LegalDocumentPage documentKey="disclaimer" />
    </LegalLayout>
  )
}
