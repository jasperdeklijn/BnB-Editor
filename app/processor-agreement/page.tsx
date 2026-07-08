import { LegalDocumentPage, getLegalMetadata } from "@/components/legal/legal-documents"
import { LegalLayout } from "@/components/layout/legal-layout"

export const metadata = getLegalMetadata("processorAgreement")

export default function ProcessorAgreementPage() {
  return (
    <LegalLayout title="Verwerkersovereenkomst">
      <LegalDocumentPage documentKey="processorAgreement" />
    </LegalLayout>
  )
}
