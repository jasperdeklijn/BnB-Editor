import { LegalDocumentPage, getLegalMetadata } from "@/components/legal/legal-documents"
import { LegalLayout } from "@/components/layout/legal-layout"
import { PLATFORM_BASE_URL } from "@/lib/platform"

const documentMetadata = getLegalMetadata("takedown")

export const metadata = {
  ...documentMetadata,
  title: { absolute: documentMetadata.title },
  alternates: { canonical: `${PLATFORM_BASE_URL}/melding-onrechtmatige-content` },
}

export default function ContentReportPage() {
  return (
    <LegalLayout title="Onrechtmatige content melden">
      <LegalDocumentPage documentKey="takedown" />
    </LegalLayout>
  )
}
