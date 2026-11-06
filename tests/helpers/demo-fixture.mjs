export const legacyDemo = { format: "flexpagina", version: 1, title: "Demo", sections: [
  { key: "intro", type: "hero", content: { title: "Welkom", subtitle: "Een zelfstandige demo" } },
] }

export function editorDemo() {
  return {
    title: "Demo uit de editor",
    theme: { paletteId: "forest-green", fontPairId: "inter-system", spacing: "spacious", radius: "large", languageSwitcher: { style: "buttons", position: "nav-right" } },
    pages: [
      { id: "home", title: "Home", slug: "", isHome: true, showInNavigation: true, includeInPublication: true },
      { id: "about", title: "Over ons", slug: "over-ons", isHome: false, showInNavigation: true, includeInPublication: true },
      { id: "private", title: "Concept", slug: "concept", isHome: false, showInNavigation: false, includeInPublication: false },
    ],
    sections: [
      { id: "header", scope: "site_header", type: "nav", data: { brandName: "Demo", navLinks: [{ sectionId: "intro", label: "Intro", href: "section:home:intro", enabled: true }] } },
      { id: "intro", pageId: "home", scope: "page", type: "hero", data: { title: "Welkom", layout: "showcase", ctaEnabled: true, ctaText: "Meer", ctaHref: "page:about", presentation: { headingSize: 60 }, elements: [{ id: "extra", type: "button", text: "Lees verder", href: "section:about:contact" }] }, styles: { backgroundColor: "#123456", backgroundImage: "https://example.com/hero.jpg" } },
      { id: "offers", pageId: "home", scope: "page", type: "services", data: { title: "Aanbod", businessId: "customer-business", websiteId: "customer-website", serviceIds: ["room"], services: [{ id: "room", title: "Kamer", price: "95", image_urls: ["https://example.com/room.jpg"], business_id: "customer-business", booking_catalog: { private: true } }] } },
      { id: "contact", pageId: "about", scope: "page", type: "contact", data: { title: "Contact", formDestinationKey: "customer-form", buttonHref: "#section-contact" } },
      { id: "secret", pageId: "private", scope: "page", type: "freeform", data: { title: "PRIVATE CONTENT", elements: [] } },
      { id: "footer", scope: "site_footer", type: "footer", data: { companyName: "Demo", columns: [{ title: "Pagina's", links: [{ label: "Over ons", href: "page:about" }] }] } },
    ],
    transitions: [{ id: "transition", fromSectionId: "intro", toSectionId: "offers", type: "wave" }],
  }
}
