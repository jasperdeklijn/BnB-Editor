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
    { rel: 'icon', url: '/favicon_48x48.png', sizes: '48x48' },
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
        <Toaster />
      </body>
    </html>
  )
}

