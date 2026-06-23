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
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-slate-50 dark:from-slate-950 dark:to-slate-900">
      {/* Header */}
      <header className="border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Accountinstellingen
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Beheer je abonnement, facturen en accountinstellingen
          </p>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-6 py-12">
        {children}
      </main>
    </div>
  )
}

