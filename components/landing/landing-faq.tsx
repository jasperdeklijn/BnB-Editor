import { ChevronDown } from "lucide-react"
import { PLATFORM_EMAILS } from "@/lib/platform"
import { MARKETING_ACCESS_NOTICE, MARKETING_BOOKING_NOTICE } from "@/lib/marketing"

export const homepageFaqItems = [
  {
    question: "Wat betekent het dat FlexPagina een testversie is?",
    answer: `FlexPagina is in ontwikkeling. Je kunt nog onvolkomenheden tegenkomen. Deel je ervaringen of meld een probleem via ${PLATFORM_EMAILS.support}. ${MARKETING_ACCESS_NOTICE}`,
  },
  {
    question: "Kan ik zelf een website maken zonder technische kennis?",
    answer:
      "Ja. Je kiest kant-en-klare secties en past tekst, afbeeldingen, kleuren en contactgegevens aan in een visuele editor. Je hoeft geen code te schrijven.",
  },
  {
    question: "Wat kan ik gratis doen?",
    answer:
      `Je kunt zonder creditcard een account aanmaken. ${MARKETING_ACCESS_NOTICE} De officiële tarieven voor het betaalde aanbod worden later bekendgemaakt.`,
  },
  {
    question: "Kan ik mijn eigen domeinnaam gebruiken?",
    answer:
      "Ja. Je kunt een eigen domeinnaam koppelen en vanuit het dashboard controleren of de technische instellingen correct staan.",
  },
  {
    question: "Kan ik later opzeggen of van pakket veranderen?",
    answer:
      "De beoogde websitepakketten worden maandelijks gefactureerd. Betaalde pakketten kopen of wijzigen is tijdens de tijdelijke testtoegang nog niet beschikbaar. Heb je vragen over een bestaand abonnement, neem dan contact op met support. Opzeggen en je account verwijderen zijn verschillende acties.",
  },
  {
    question: "Kan ik mijn huidige website vervangen?",
    answer:
      "Ja. Bouw je nieuwe website eerst op en neem teksten en afbeeldingen over die je mag gebruiken. De editor biedt ook een AI-overzetfunctie voor openbare pagina's, als de AI-dienst beschikbaar is. Controleer het concept zelf: formulieren, boekingswidgets, e-mail en oude URL's worden niet automatisch volledig verhuisd. Koppel je domein pas na controle.",
  },
  {
    question: "Wat gebeurt er als ik stop?",
    answer:
      "Een opzegging stopt toekomstige abonnementsverlengingen. Bewaar voor vertrek je eigen teksten, afbeeldingen en benodigde facturen. Wil je ook je account en gegevens laten verwijderen, neem dan contact op met support. Opzeggen en je account verwijderen zijn verschillende acties.",
  },
  {
    question: "Kan ik hulp krijgen met instellen?",
    answer: `Ja. Mail je vraag naar ${PLATFORM_EMAILS.support}, bijvoorbeeld over de editor of het koppelen van je domein. Gold bevat ondersteuning met voorrang.`,
  },
  {
    question: "Zitten boekingen en facturen in mijn websitepakket?",
    answer: `${MARKETING_BOOKING_NOTICE} Je krijgt online boekingen, beschikbaarheid, boekingsbeheer en facturen vanuit boekingen. Een gewone aanvraag is nog geen bevestigde reservering.`,
  },
]

export function LandingFaq() {
  return (
    <section id="faq" className="scroll-mt-24 bg-white px-6 py-24" aria-labelledby="faq-title">
      <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[0.8fr_1.2fr]">
        <div>
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-[var(--landing-primary)]">
            Veelgestelde vragen
          </p>
          <h2 id="faq-title" className="text-balance text-4xl font-bold text-[var(--landing-secondary)] md:text-5xl">
            Antwoorden voordat je begint
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-[var(--landing-muted)]">
            Dit zijn de belangrijkste vragen over zelf een website maken met FlexPagina.nl.
          </p>
        </div>

        <div className="divide-y divide-[var(--landing-border)] overflow-hidden rounded-3xl border border-[var(--landing-border)] bg-[var(--landing-surface)]">
          {homepageFaqItems.map((item, index) => (
            <details key={item.question} className="group bg-white px-6 py-1" open={index === 0}>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-5 py-5 font-bold text-[var(--landing-secondary)]">
                {item.question}
                <ChevronDown className="h-5 w-5 shrink-0 text-[var(--landing-primary)] transition-transform group-open:rotate-180" aria-hidden="true" />
              </summary>
              <p className="max-w-2xl pb-5 text-sm leading-relaxed text-[var(--landing-muted)]">{item.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}
