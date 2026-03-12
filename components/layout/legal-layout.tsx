import { ReactNode } from "react"
import { SharedHeader } from "./shared-header"
import { SharedFooter } from "./shared-footer"

interface LegalLayoutProps {
  children: ReactNode
  title: string
}

export function LegalLayout({ children, title }: LegalLayoutProps) {
  return (
    <div className="flex flex-col min-h-screen bg-[var(--hero-bg)]">
      <SharedHeader title={title} />
      
      <main className="flex-1 mx-auto max-w-4xl px-6 py-12 w-full">
        <article className="prose prose-invert max-w-none">
          {children}
        </article>
      </main>

      <SharedFooter />
    </div>
  )
}
