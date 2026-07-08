import { LegalDocumentPage, getLegalMetadata } from "@/components/legal/legal-documents"
import { LegalLayout } from "@/components/layout/legal-layout"

export const metadata = getLegalMetadata("acceptableUse")

export default function AcceptableUsePage() {
  return (
    <LegalLayout title="Acceptable Use Policy">
      <LegalDocumentPage documentKey="acceptableUse" />
    </LegalLayout>
  )
}
