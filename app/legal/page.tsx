import Link from "next/link"
import { legalDocuments } from "@/components/legal/legal-documents"
import { SharedFooter } from "@/components/layout/shared-footer"
import { SharedHeader } from "@/components/layout/shared-header"
import { PLATFORM_BRAND_NAME, PLATFORM_EMAILS } from "@/lib/platform"

export const metadata = {
  title: `Juridisch | ${PLATFORM_BRAND_NAME}`,
  description: `Juridische documenten van ${PLATFORM_BRAND_NAME}.`,
}

const pages = [
  legalDocuments.terms,
  legalDocuments.privacy,
  legalDocuments.cookies,
  legalDocuments.processorAgreement,
  legalDocuments.acceptableUse,
  legalDocuments.disclaimer,
  {
    title: "Status",
    description: `Status en incidentinformatie van ${PLATFORM_BRAND_NAME}.`,
    path: "/status",
  },
]

export default function LegalIndexPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--hero-bg)]">
      <SharedHeader title="Juridisch" />

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-12">
        <div className="mb-12">
          <h1 className="mb-4 text-4xl font-bold text-white">Juridische documenten</h1>
          <p className="max-w-2xl text-white/70">
            Praktische templates en beleidsdocumenten voor {PLATFORM_BRAND_NAME}. Laat deze teksten juridisch controleren voordat ze definitief worden gebruikt.
          </p>
        </div>

        <div className="mb-12 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {pages.map((page) => (
            <Link
              key={page.path}
              href={page.path}
              className="group rounded-lg border border-[#B7D1C2]/20 bg-white/5 p-6 text-white transition-colors hover:border-[#B7D1C2]/45 hover:bg-white/10"
            >
              <h2 className="mb-2 text-xl font-semibold transition-colors group-hover:text-[#B7D1C2]">
                {page.title}
              </h2>
              <p className="text-sm leading-6 text-white/65">{page.description}</p>
              <p className="mt-4 text-sm font-medium text-[#B7D1C2]">Openen</p>
            </Link>
          ))}
        </div>

        <section className="rounded-lg border border-[#B7D1C2]/20 bg-white/5 p-6 text-white">
          <h2 className="mb-3 text-2xl font-bold">Contact</h2>
          <p className="text-white/70">
            Voor privacyvragen:{" "}
            <a href={`mailto:${PLATFORM_EMAILS.privacy}`} className="text-[#B7D1C2] hover:underline">
              {PLATFORM_EMAILS.privacy}
            </a>
            . Voor misbruikmeldingen:{" "}
            <a href={`mailto:${PLATFORM_EMAILS.abuse}`} className="text-[#B7D1C2] hover:underline">
              {PLATFORM_EMAILS.abuse}
            </a>
            .
          </p>
        </section>
      </main>

      <SharedFooter />
    </div>
  )
}
