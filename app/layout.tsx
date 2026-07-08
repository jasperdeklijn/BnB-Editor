import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { Toaster } from 'sonner'
import { SpeedInsights } from "@vercel/speed-insights/next"
import { PLATFORM_BRAND_NAME } from "@/lib/platform"
import './globals.css'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: PLATFORM_BRAND_NAME,
  description: 'Bouw eenvoudig een professionele website voor jouw kleine bedrijf. Geen code nodig, direct online.',
  generator: 'v0.app',
  icons: [
    { rel: 'icon', url: '/icon.png', sizes: '1024x1024', type: 'image/png' },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="nl">
      <body className={`font-sans antialiased`}>
        {children}
        <Analytics />
        <SpeedInsights/>
        <Toaster
          toastOptions={{
            classNames: {
              toast: "rounded-md border border-border bg-background text-foreground shadow-lg",
              success: "border-primary/20 bg-primary/10 text-primary",
              error: "border-destructive/20 bg-destructive/10 text-destructive",
              warning: "border-warning/30 bg-warning/10 text-secondary-foreground",
              info: "border-border bg-muted text-foreground",
            },
          }}
        />
      </body>
    </html>
  )
}

