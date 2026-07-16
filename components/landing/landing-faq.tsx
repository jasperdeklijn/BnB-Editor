import { ChevronDown } from "lucide-react"

export const homepageFaqItems = [
  {
    question: "Kan ik zelf een website maken zonder technische kennis?",
    answer:
      "Ja. Je kiest kant-en-klare secties en past tekst, afbeeldingen, kleuren en contactgegevens aan in een visuele editor. Je hoeft geen code te schrijven.",
  },
  {
    question: "Voor welke bedrijven is FlexPagina.nl bedoeld?",
    answer:
      "FlexPagina.nl is ontwikkeld voor zelfstandigen en kleine bedrijven, zoals vakmensen, salons, adviseurs, lokale winkels, dienstverleners en kleinschalige verblijven.",
  },
  {
    question: "Kan ik mijn eigen domeinnaam gebruiken?",
    answer:
      "Ja. Je kunt een eigen domeinnaam koppelen en vanuit het dashboard controleren of de technische instellingen correct staan.",
  },
  {
    question: "Kan ik later van abonnement veranderen?",
    answer:
      "Ja. Je kunt upgraden of downgraden wanneer je website of bedrijf andere functies nodig heeft.",
  },
  {
    question: "Is mijn website geschikt voor mobiele telefoons?",
    answer:
      "Ja. De websites zijn responsive opgebouwd, zodat pagina's zich aanpassen aan mobiele telefoons, tablets en grotere schermen.",
  },
  {
    question: "Kan ik mijn website later zelf blijven bijwerken?",
    answer:
      "Ja. De editor is juist bedoeld om teksten, foto's, diensten, prijzen en andere onderdelen zelf actueel te houden.",
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
