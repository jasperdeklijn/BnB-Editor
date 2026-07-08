import { SharedFooter } from "@/components/layout/shared-footer"
import { SharedHeader } from "@/components/layout/shared-header"
import { PLATFORM_BRAND_NAME } from "@/lib/platform"

const services = [
  { name: "Website editor", status: "operational" },
  { name: "Gepubliceerde websites", status: "operational" },
  { name: "Database", status: "operational" },
  { name: "Bestandsopslag", status: "operational" },
  { name: "E-mail en contactformulieren", status: "operational" },
  { name: "Betalingen", status: "operational" },
] as const

const statusLabels = {
  operational: "Operationeel",
  degraded: "Vertraagd",
  partial_outage: "Gedeeltelijke storing",
  major_outage: "Grote storing",
  maintenance: "Onderhoud",
} as const

export const metadata = {
  title: `Status | ${PLATFORM_BRAND_NAME}`,
  description: `Statuspagina van ${PLATFORM_BRAND_NAME}.`,
}

export default function StatusPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--hero-bg)] text-white">
      <SharedHeader title="Status" />

      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-12">
        <div className="mb-10">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.08em] text-[var(--brand-blue)]">
            Systeemstatus
          </p>
          <h1 className="mb-4 text-4xl font-bold">Alle kernservices zijn operationeel</h1>
          <p className="max-w-2xl text-white/70">
            Deze MVP-statuspagina geeft een praktische momentopname van {PLATFORM_BRAND_NAME}. Bij incidenten plaatsen we hier updates en melden we welke onderdelen geraakt zijn.
          </p>
        </div>

        <section className="mb-10 rounded-lg border border-white/10 bg-white/5">
          <div className="border-b border-white/10 px-5 py-4">
            <h2 className="text-xl font-semibold">Services</h2>
          </div>
          <div className="divide-y divide-white/10">
            {services.map((service) => (
              <div key={service.name} className="flex items-center justify-between gap-4 px-5 py-4">
                <span className="font-medium">{service.name}</span>
                <span className="rounded-full border border-emerald-300/30 bg-emerald-300/10 px-3 py-1 text-xs font-semibold text-emerald-100">
                  {statusLabels[service.status]}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-10 rounded-lg border border-white/10 bg-white/5 p-5">
          <h2 className="mb-3 text-xl font-semibold">Laatste incidenten</h2>
          <p className="text-white/70">Er zijn momenteel geen recente incidenten gemeld.</p>
        </section>

        <section className="rounded-lg border border-white/10 bg-white/5 p-5">
          <h2 className="mb-3 text-xl font-semibold">Uitleg voor klanten</h2>
          <p className="text-white/70">
            Bij een storing controleren we eerst of de oorzaak binnen onze applicatie ligt of bij externe diensten zoals Vercel, Supabase, Stripe, e-mailproviders of DNS-providers. Waar nodig geven we een workaround en plaatsen we herstelupdates op deze pagina.
          </p>
        </section>
      </main>

      <SharedFooter />
    </div>
  )
}
