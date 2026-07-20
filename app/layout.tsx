import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { Toaster } from 'sonner'
import { SpeedInsights } from "@vercel/speed-insights/next"
import { PLATFORM_BRAND_NAME } from "@/lib/platform"
import { PLATFORM_BASE_URL } from "@/lib/platform"
import { headers } from "next/headers"
import './globals.css'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(PLATFORM_BASE_URL),
  title: {
    default: `Website maken voor je bedrijf | ${PLATFORM_BRAND_NAME}`,
    template: `%s | ${PLATFORM_BRAND_NAME}`,
  },
  description:
    'Maak zelf een professionele website voor je bedrijf. Kies kant-en-klare secties, pas alles visueel aan en publiceer zonder code.',
  keywords: [
    "website maken",
    "websitebouwer kleine ondernemer",
    "bedrijfswebsite maken",
    "website maken zonder code",
    "website builder Nederland",
  ],
  openGraph: {
    type: "website",
    locale: "nl_NL",
    siteName: PLATFORM_BRAND_NAME,
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: [
    { rel: 'icon', url: '/favicon.ico' },
  ],
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const requestHeaders = await headers()
  const websiteLocale = requestHeaders.get("x-website-locale") || "nl-NL"
  return (
    <html lang={websiteLocale}>
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

