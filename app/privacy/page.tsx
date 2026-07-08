import { LegalDocumentPage, getLegalMetadata } from "@/components/legal/legal-documents"
import { LegalLayout } from "@/components/layout/legal-layout"

export const metadata = getLegalMetadata("privacy")

export default function PrivacyPage() {
  return (
    <LegalLayout title="Privacyverklaring">
      <LegalDocumentPage documentKey="privacy" />
    </LegalLayout>
  )
}
