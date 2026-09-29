import type { Section } from "../types"
import type { CheckItem, CheckResult } from "./shared"

type CheckInput = {
  website: { id: string; title: string; draft_version: string; seo?: { title?: string; description?: string } };
  business: { name?: string; city?: string; email?: string; phone?: string } | null;
  sections: Section[]; services: Array<{ id?: string; title?: string }>; hasDestination: boolean; domainActive: boolean;
  testedVersion?: string | null;
}
const filled = (value: unknown) => typeof value === "string" && value.trim().length > 0
const placeholder = (value: string) => /placeholder|placehold\.co|via\.placeholder|voorbeeld\.(nl|com)|\/placeholder\.svg/i.test(value)
function imageValues(value: unknown, key = ""): string[] {
  if (Array.isArray(value)) return value.flatMap((v) => imageValues(v, key))
  if (value && typeof value === "object") return Object.entries(value).flatMap(([k, v]) => imageValues(v, k))
  return typeof value === "string" && /^(images?|imageUrl|image_urls|backgroundImage|logo)$/i.test(key) ? [value] : []
}
export function runFlexCheck(input: CheckInput): CheckResult {
  const { website, business, sections } = input
  const editor = `/editor?websiteId=${website.id}`
  const items: CheckItem[] = []
  const add = (id: string, label: string, passed: boolean, required: boolean, detail: string, href = editor) => {
    items.push({ id, label, state: passed ? "ready" : required ? "required" : "recommended", detail, href })
  }
  const content = sections.map((s) => JSON.stringify(s.data)).join(" ").toLowerCase()
  const contact = sections.filter((s) => s.type === "contact" || s.type === "request_form")
  const validTarget = (href: unknown) => typeof href === "string" && (/^(tel:|mailto:|https?:\/\/)/.test(href)
    || (href.startsWith("#section-") && sections.some((s) => `#section-${s.id}` === href && ["contact", "request_form", "services"].includes(s.type))))
  const cta = sections.some(({ data }) => ["cta", "primaryCta", "secondaryCta"].some((key) =>
    data[key + "Enabled"] === true && filled(data[key + "Text"]) && validTarget(data[key + "Href"])))
  const images = sections.flatMap((s) => [...imageValues(s.data), ...imageValues(s.styles)])
  const privacy = sections.some((s) => s.type === "footer" && s.data.showLinks !== false && Array.isArray(s.data.columns)
    && s.data.columns.some((column: { links?: Array<{ label?: string; href?: string }> } | null) => Array.isArray(column?.links) && column.links.some((l) =>
      l && /privacy/i.test(l.label || "") && typeof l.href === "string" && (/^https?:\/\//.test(l.href) || (l.href.startsWith("#section-") && sections.some((section) => `#section-${section.id}` === l.href))))))
  const visibleService = sections.some((section) => section.type === "services" && input.services.some((service) =>
    filled(service.title) && (!Array.isArray(section.data.serviceIds) || section.data.serviceIds.length === 0 || section.data.serviceIds.includes(service.id))))
  add("name", "Bedrijfsnaam", filled(business?.name) && business?.name !== "Mijn bedrijf", true, "Controleert de opgeslagen bedrijfsnaam.", "/editor/business")
  add("contact", "Telefoon of e-mailadres", sections.some((s) => filled(s.data.phone) || filled(s.data.email)), true, "Contactgegevens moeten in een sectie staan.")
  add("cta", "Duidelijke contactknop", cta, true, "Een actieve knop met tekst en een bruikbaar doel.")
  add("form", "Contactformulier ingesteld", contact.length > 0 && input.hasDestination, true, "Een formulier met een geldig ontvangstadres; verzending wordt apart getest.")
  add("services", "Minimaal één dienst", visibleService, true, "Een opgeslagen dienst die in een dienstensectie is geselecteerd.", "/editor/services")
  add("images", "Afbeeldingen zonder lege placeholders", images.length > 0 && images.every((url) => filled(url) && !placeholder(url)), false, "Controleert ingevulde verwijzingen. Bereikbaarheid en beeldkwaliteit controleer je persoonlijk.")
  add("seo", "SEO-titel en omschrijving", filled(website.seo?.title) && filled(website.seo?.description), true, "Beide velden moeten zijn ingevuld.", `/editor/seo?websiteId=${website.id}`)
  add("area", "Plaats of werkgebied genoemd", filled(business?.city) && content.includes(business!.city!.toLowerCase()), false, "Zoekt de vestigingsplaats in de website-inhoud. Controleer je volledige werkgebied zelf.")
  add("mobile", "Mobiele weergave beschikbaar", sections.length > 0, false, "Het concept heeft een mobielvoorbeeld. Dit is geen automatische visuele goedkeuring.")
  add("privacy", "Privacyverklaring gekoppeld", privacy, true, "Een privacylink in de footer. De inhoud en juridische juistheid worden niet automatisch beoordeeld.")
  add("domain", "Eigen domein ingesteld", input.domainActive, false, "Controleert of een domein is toegevoegd. Controleer de DNS-koppeling in Domeininstellingen; publiceren op je FlexPagina-adres kan ook.", `/editor/domains?websiteId=${website.id}`)
  add("test", "Testaanvraag verzonden", input.testedVersion === website.draft_version, true, "Testaanvraag opgeslagen en geaccepteerd door de mailserver voor deze conceptversie. Controleer ook de ontvangst.")
  return { items, ready: items.filter((i) => i.state === "ready").length, total: items.length,
    canPublish: !items.some((i) => i.state === "required"), version: website.draft_version }
}
