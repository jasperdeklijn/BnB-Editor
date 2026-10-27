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
import { LandingDiscovery } from "@/components/landing/landing-discovery"
import { marketingMetadata } from "@/lib/seo/marketing"

const homepageTitle = "Website maken voor je bedrijf zonder code"
const homepageDescription = "Maak zelf je bedrijfswebsite met FlexPagina, de Nederlandse websitebouwer voor zzp en kleine bedrijven. Ontdek eigen domein, aanvragen en optionele boekingen in de testversie."

export const metadata: Metadata = marketingMetadata("/", homepageTitle, homepageDescription)

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
      "@type": "WebSite",
      name: PLATFORM_BRAND_NAME,
      url: PLATFORM_BASE_URL,
      inLanguage: "nl-NL",
      description: homepageDescription,
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
    <div className="bg-white text-[var(--landing-secondary)]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
        }}
      />
      <LandingNav />
      <main id="inhoud">
      <LandingHero />
      <LandingDemo />
      <LandingFeatures />
      <LandingDiscovery />
      <LandingExamples />
      <LandingHowItWorks />
      <LandingBooking />
      <LandingTrust />
      <PricingSection />
      <LandingFaq />
      <LandingCta />
      </main>
      <SharedFooter />
    </div>
  )
}
