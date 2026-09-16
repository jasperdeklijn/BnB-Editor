import type { Metadata } from "next"
import { LandingNav } from "@/components/landing/landing-nav"
import { LandingHero } from "@/components/landing/landing-hero"
import { LandingDemo } from "@/components/landing/landing-demo"
import { LandingFeatures } from "@/components/landing/landing-features"
import { LandingHowItWorks } from "@/components/landing/landing-how-it-works"
import { PricingSection } from "@/components/landing/pricing-section"
import { LandingCta } from "@/components/landing/landing-cta"
import { SharedFooter } from "@/components/layout/shared-footer"
import { LandingExamples } from "@/components/landing/landing-examples"
import { LandingBooking } from "@/components/landing/landing-booking"
import { LandingTrust } from "@/components/landing/landing-trust"
import { LandingFaq, homepageFaqItems } from "@/components/landing/landing-faq"
import { PLATFORM_BASE_URL, PLATFORM_BRAND_NAME } from "@/lib/platform"

export const metadata: Metadata = {
  title: {
    absolute: `Website maken voor je bedrijf | ${PLATFORM_BRAND_NAME}`,
  },
  description:
    "Je website, aanvragen en boekingen op één plek. Maak zonder technische kennis een bedrijfswebsite en breid uit met boekingen en facturatie.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    url: "/",
    title: `Website maken voor je bedrijf | ${PLATFORM_BRAND_NAME}`,
    description:
      "Maak zonder technische kennis een bedrijfswebsite. Beheer je website, aanvragen en boekingen op één plek met FlexPagina.",
    images: [
      {
        url: "/logo_klein.png",
        width: 1536,
        height: 1024,
        alt: `${PLATFORM_BRAND_NAME} websitebouwer voor kleine bedrijven`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `Website maken voor je bedrijf | ${PLATFORM_BRAND_NAME}`,
    description: "Je website, aanvragen en boekingen. Alles op één plek. Begin gratis met FlexPagina.",
    images: ["/logo_klein.png"],
  },
}

export default async function HomePage() {
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: PLATFORM_BRAND_NAME,
      url: PLATFORM_BASE_URL,
      logo: `${PLATFORM_BASE_URL}/logo_klein.png`,
      email: `info@${new URL(PLATFORM_BASE_URL).hostname}`,
    },
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: PLATFORM_BRAND_NAME,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      url: PLATFORM_BASE_URL,
      description:
        "Nederlands platform voor kleine ondernemers: maak en beheer je bedrijfswebsite, ontvang aanvragen en breid uit met boekingen en facturatie.",
      offers: {
        "@type": "AggregateOffer",
        priceCurrency: "EUR",
        lowPrice: "7.95",
        offerCount: "3",
        url: `${PLATFORM_BASE_URL}/pricing`,
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: homepageFaqItems.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: item.answer,
        },
      })),
    },
  ]

  return (
    <main className="bg-white text-[var(--landing-secondary)]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
        }}
      />
      <LandingNav />
      <LandingHero />
      <LandingDemo />
      <LandingFeatures />
      <LandingExamples />
      <LandingHowItWorks />
      <LandingBooking />
      <LandingTrust />
      <PricingSection />
      <LandingFaq />
      <LandingCta />
      <SharedFooter />
    </main>
  )
}
