import { termsDocument } from "@/lib/legal/terms"
import Link from "next/link"
import { PLATFORM_BRAND_NAME, PLATFORM_EMAILS } from "@/lib/platform"
import { TERMS_DOWNLOAD_PATH, TERMS_VERSION } from "@/lib/legal/terms-version"

export type LegalDocumentKey =
  | "terms"
  | "privacy"
  | "cookies"
  | "processorAgreement"
  | "acceptableUse"
  | "disclaimer"
  | "takedown"

type LegalSection = {
  title: string
  paragraphs?: string[]
  bullets?: string[]
  links?: { href: string; label: string }[]
}

type LegalDocument = {
  title: string
  description: string
  path: string
  sections: LegalSection[]
  isTemplate?: boolean
  updatedAt?: string
}

const providerLine = `Aanbieder: [Bedrijfsnaam], handelend onder de naam ${PLATFORM_BRAND_NAME}. KvK-nummer: [KvK-nummer]. Adres: [Adres]. E-mail: [E-mailadres]. Laatst bijgewerkt: [Laatst bijgewerkt].`

export const legalDocuments: Record<LegalDocumentKey, LegalDocument> = {
  terms: termsDocument,
  privacy: {
    title: "Privacyverklaring",
    description: `Privacytemplate voor ${PLATFORM_BRAND_NAME}.`,
    path: "/privacy",
    sections: [
      {
        title: "1. Verwerkingsverantwoordelijke",
        paragraphs: [
          providerLine,
          `Deze privacyverklaring legt uit hoe ${PLATFORM_BRAND_NAME} persoonsgegevens verwerkt van accountgebruikers, websitebezoekers, contactpersonen, leads, klanten en personen die via klantwebsites formulieren invullen.`,
          "Voor klantwebsites kan de klant zelf verwerkingsverantwoordelijke zijn voor de inhoud, formulieren en bezoekersgegevens van die website. Wij kunnen dan optreden als verwerker volgens de verwerkersovereenkomst."
        ]
      },
      {
        title: "2. Welke persoonsgegevens wij verwerken",
        bullets: [
          "Accountgegevens: naam, e-mailadres, wachtwoordhash, bedrijfsnaam, rol en accountinstellingen.",
          "Akkoord met de voorwaarden: gebruikers-ID, geaccepteerde versie en het tijdstip van registratie, om vast te leggen welke afspraken zijn aanvaard.",
          "Contact- en supportgegevens: e-mails, berichten, supportvragen en administratieve correspondentie.",
          "Contentmeldingen en bezwaren: contactgegevens van de melder, gemelde URL's, toelichting, bewijs, correspondentie en besluiten over de melding.",
          "Websitegegevens: website-inhoud, uploads, domeinnamen, instellingen, formulieren en publicatiegegevens.",
          "Technische gegevens: IP-adres, browser, apparaat, loggegevens, sessiegegevens en beveiligingsinformatie.",
          "Betalings- en factuurgegevens: abonnementsstatus, factuurgegevens, transactiegegevens en betaalstatus via Stripe of een vergelijkbare betaalprovider.",
          "Analyticsgegevens: geaggregeerde of pseudonieme gebruiksstatistieken wanneer analytics is ingeschakeld."
        ]
      },
      {
        title: "3. Doeleinden en grondslagen",
        bullets: [
          "Uitvoering van de overeenkomst: accountbeheer, websitebouw, hosting, publicatie, support en abonnementen.",
          "Wettelijke verplichting: administratie, fiscale bewaarplichten, beveiligingsmeldingen en medewerking aan bevoegde autoriteiten.",
          "Wettelijke verplichting: meldingen van onrechtmatige content beoordelen, besluiten motiveren en betrokkenen informeren volgens de Digital Services Act. Voor aanvullende geschilafhandeling gebruiken wij waar nodig ons gerechtvaardigd belang bij rechtsbescherming.",
          "Gerechtvaardigd belang: beveiliging, fraudepreventie, misbruikbestrijding, productverbetering, logging en continuiteit.",
          "Toestemming: optionele marketingcookies, nieuwsbrieven of andere verwerkingen waarvoor toestemming nodig is."
        ]
      },
      {
        title: "4. Bewaartermijnen",
        paragraphs: [
          "Wij bewaren persoonsgegevens niet langer dan nodig is voor het doel waarvoor zij zijn verzameld, tenzij een wettelijke bewaartermijn geldt."
        ],
        bullets: [
          "Account- en websitegegevens: zolang het account actief is en daarna voor een redelijke herstel-, bewijs- of administratieve periode.",
          "Factuur- en administratiegegevens: in beginsel zeven jaar voor fiscale administratie.",
          "Supportcommunicatie: zolang nodig voor afhandeling en kwaliteitsbewaking.",
          "Contentmeldingen en bezwaren: zolang nodig voor beoordeling, communicatie, geschilafhandeling en toepasselijke wettelijke verplichtingen. Wij delen met betrokkenen alleen noodzakelijke informatie en de identiteit van de melder alleen als dat strikt noodzakelijk is.",
          "Technische logs: zo kort mogelijk, met een redelijke termijn voor beveiliging, foutanalyse en misbruikbestrijding.",
          "Back-ups: volgens het backupbeleid; verwijdering kan vertraagd zichtbaar zijn in back-upkopieen."
        ]
      },
      {
        title: "5. Dienstverleners en subverwerkers",
        paragraphs: [
          "Wij gebruiken externe dienstverleners wanneer dit nodig is voor de werking van de dienst. Met relevante partijen worden passende afspraken gemaakt over beveiliging en gegevensverwerking."
        ],
        bullets: [
          "Supabase voor database, authenticatie en opslag.",
          "Vercel voor hosting, deployment, edge-infrastructuur en performancegegevens.",
          "Stripe of een vergelijkbare betaalprovider voor abonnementen en betalingen.",
          "SMTP- of mailproviders voor transactionele e-mail, contactformulieren en support.",
          "Analytics- en monitoringdiensten wanneer deze zijn ingeschakeld."
        ]
      },
      {
        title: "6. Internationale doorgifte",
        paragraphs: [
          "Waar mogelijk verwerken wij gegevens binnen de Europese Economische Ruimte. Als gegevens buiten de EER worden verwerkt, gebruiken wij passende waarborgen, zoals EU-standaardcontractbepalingen, adequaatheidsbesluiten of aanvullende beveiligingsmaatregelen waar dat nodig is."
        ]
      },
      {
        title: "7. Beveiliging",
        paragraphs: [
          "Wij nemen passende technische en organisatorische maatregelen, afgestemd op de aard van de dienst en de risico's."
        ],
        bullets: [
          "HTTPS/TLS voor verkeer met de dienst.",
          "Toegangsbeperking op basis van noodzakelijkheid.",
          "Authenticatie en sessiebeveiliging.",
          "Logging voor beveiliging en misbruikdetectie.",
          "Regelmatige updates van gebruikte software en infrastructuur.",
          "Back-ups en herstelprocedures voor kerngegevens."
        ]
      },
      {
        title: "8. Rechten van betrokkenen",
        paragraphs: [
          `U kunt verzoeken om inzage, correctie, verwijdering, beperking, overdraagbaarheid, bezwaar tegen verwerking en intrekking van toestemming. Mail daarvoor naar ${PLATFORM_EMAILS.privacy} of [E-mailadres].`,
          "Wij kunnen om aanvullende informatie vragen om uw identiteit te controleren. U heeft ook het recht om een klacht in te dienen bij de Autoriteit Persoonsgegevens."
        ]
      },
      {
        title: "9. Wijzigingen",
        paragraphs: [
          "Wij kunnen deze privacyverklaring wijzigen wanneer de dienst, wetgeving of gebruikte verwerkers veranderen. De actuele versie staat op deze pagina."
        ]
      }
    ]
  },
  cookies: {
    title: "Cookiebeleid",
    description: `Cookiebeleid voor ${PLATFORM_BRAND_NAME}.`,
    path: "/cookies",
    sections: [
      {
        title: "1. Inleiding",
        paragraphs: [
          providerLine,
          `Dit cookiebeleid legt uit welke cookies en vergelijkbare technieken ${PLATFORM_BRAND_NAME} gebruikt op het platform en, waar van toepassing, op gepubliceerde websites.`
        ]
      },
      {
        title: "2. Noodzakelijke cookies",
        paragraphs: [
          "Noodzakelijke cookies zijn nodig voor basisfuncties zoals inloggen, beveiliging, sessiebeheer, formulierbeveiliging, taalvoorkeuren en het onthouden van technische instellingen. Deze cookies kunnen zonder toestemming worden geplaatst wanneer zij strikt noodzakelijk zijn."
        ]
      },
      {
        title: "3. Functionele cookies",
        paragraphs: [
          "Functionele cookies helpen om voorkeuren en instellingen te onthouden, zoals editorinstellingen of interfacevoorkeuren. Als deze cookies niet strikt noodzakelijk zijn, vragen wij toestemming waar dat wettelijk vereist is."
        ]
      },
      {
        title: "4. Analytische cookies",
        paragraphs: [
          "Analytische cookies kunnen worden gebruikt om te begrijpen hoe het platform wordt gebruikt en waar technische verbeteringen nodig zijn.",
          "Voor privacyvriendelijke analytische cookies die geen of geringe gevolgen hebben voor de privacy kan toestemming niet altijd nodig zijn. Voor uitgebreidere analytics, tracking of profielen vragen wij vooraf toestemming."
        ]
      },
      {
        title: "5. Marketingcookies",
        paragraphs: [
          "Marketingcookies, trackingpixels en vergelijkbare technieken worden alleen gebruikt als deze daadwerkelijk zijn ingeschakeld en nadat daarvoor geldige toestemming is gevraagd.",
          "Als marketingcookies niet worden gebruikt, moet deze pagina dat in de definitieve versie expliciet vermelden."
        ]
      },
      {
        title: "6. Toestemming beheren",
        paragraphs: [
          "Bezoekers moeten cookies waarvoor toestemming nodig is kunnen accepteren, weigeren en later weer kunnen wijzigen. Toestemming moet vrij, specifiek, geinformeerd en ondubbelzinnig zijn.",
          "Klanten die zelf scripts, pixels of analytics op hun website plaatsen, zijn verantwoordelijk voor juiste cookie-informatie en toestemming op hun eigen website."
        ]
      },
      {
        title: "7. Contact",
        paragraphs: [
          `Vragen over cookies kunnen worden gestuurd naar ${PLATFORM_EMAILS.privacy} of [E-mailadres].`
        ]
      }
    ]
  },
  processorAgreement: {
    title: "Verwerkersovereenkomst",
    description: `Standaard verwerkersovereenkomst voor ${PLATFORM_BRAND_NAME}.`,
    path: "/processor-agreement",
    sections: [
      {
        title: "1. Partijen en rolverdeling",
        paragraphs: [
          providerLine,
          `Deze verwerkersovereenkomst geldt wanneer een klant via ${PLATFORM_BRAND_NAME} persoonsgegevens verwerkt waarvoor de klant verwerkingsverantwoordelijke is en wij als verwerker optreden.`,
          "De klant bepaalt het doel en de middelen van de verwerking op de eigen website. Wij verwerken die gegevens uitsluitend voor het leveren, beveiligen, ondersteunen en verbeteren van de dienst, tenzij wetgeving anders vereist."
        ]
      },
      {
        title: "2. Type gegevens en betrokkenen",
        bullets: [
          "Gegevens van websitebezoekers, formulierinzenders, leads, klanten van de klant en medewerkers van de klant.",
          "Contactgegevens zoals naam, e-mailadres, telefoonnummer en berichtinhoud.",
          "Technische gegevens zoals IP-adres, timestamps, browsergegevens en loggegevens.",
          "Website-inhoud en bestanden die door de klant worden ingevoerd of geupload.",
          "Geen bijzondere persoonsgegevens, strafrechtelijke gegevens of gegevens van kinderen, tenzij partijen dit uitdrukkelijk schriftelijk afspreken en passende maatregelen nemen."
        ]
      },
      {
        title: "3. Doel en duur van de verwerking",
        paragraphs: [
          "Het doel van de verwerking is het leveren van websitebouw, hosting, formulierverwerking, opslag, publicatie, domeinkoppeling, support en beveiliging.",
          "De verwerking duurt zolang de klant de dienst gebruikt en zolang daarna als nodig is voor verwijdering, export, back-ups, wettelijke verplichtingen of afhandeling van geschillen."
        ]
      },
      {
        title: "4. Instructies en geheimhouding",
        paragraphs: [
          "Wij verwerken persoonsgegevens uitsluitend op basis van de overeenkomst, deze verwerkersovereenkomst, redelijke schriftelijke instructies van de klant en toepasselijke wetgeving.",
          "Personen die namens ons toegang hebben tot persoonsgegevens zijn gehouden aan geheimhouding of een vergelijkbare wettelijke of contractuele verplichting."
        ]
      },
      {
        title: "5. Beveiliging",
        paragraphs: [
          "Wij nemen passende technische en organisatorische maatregelen, waaronder toegangsbeperking, transportbeveiliging, logging, back-ups, beveiligingsupdates en maatregelen tegen misbruik."
        ]
      },
      {
        title: "6. Subverwerkers",
        paragraphs: [
          "De klant geeft algemene toestemming voor het gebruik van subverwerkers die nodig zijn voor de dienst, zoals Supabase, Vercel, Stripe, SMTP/mailproviders, analytics- of monitoringdiensten en infrastructuurleveranciers.",
          "Wij blijven verantwoordelijk voor het opleggen van passende verwerkersverplichtingen aan subverwerkers. Bij wezenlijke wijzigingen in subverwerkers informeren wij klanten waar redelijk mogelijk."
        ]
      },
      {
        title: "7. Datalekken",
        paragraphs: [
          "Wanneer wij een inbreuk in verband met persoonsgegevens ontdekken die betrekking heeft op klantgegevens, informeren wij de klant zonder onredelijke vertraging met de beschikbare informatie.",
          "De klant blijft verantwoordelijk voor beoordeling en eventuele melding aan de Autoriteit Persoonsgegevens en betrokkenen, tenzij wij zelf verwerkingsverantwoordelijke zijn voor de betreffende verwerking."
        ]
      },
      {
        title: "8. Verwijdering, export en einde dienst",
        paragraphs: [
          "Na einde van de dienst verwijderen of retourneren wij persoonsgegevens op verzoek van de klant, tenzij wettelijke bewaarplichten of gerechtvaardigde belangen tijdelijke bewaring vereisen.",
          "Voor MVP kan export plaatsvinden in een technisch redelijk formaat, zoals JSON of CSV, wanneer die functionaliteit beschikbaar is."
        ]
      },
      {
        title: "9. Audit en verzoeken",
        paragraphs: [
          "Wij leveren redelijke informatie die nodig is om naleving van deze verwerkersovereenkomst aan te tonen. Audits moeten redelijk, vooraf afgestemd, proportioneel en vertrouwelijk zijn.",
          "Wij helpen de klant, voor zover redelijk en technisch mogelijk, bij verzoeken van betrokkenen en verplichtingen rond beveiliging, datalekken en gegevensbescherming."
        ]
      }
    ]
  },
  acceptableUse: {
    title: "Acceptable Use Policy",
    description: `Regels voor toegestaan gebruik van ${PLATFORM_BRAND_NAME}.`,
    path: "/acceptable-use",
    sections: [
      {
        title: "1. Doel",
        paragraphs: [
          providerLine,
          `Deze Acceptable Use Policy beschrijft welk gebruik van ${PLATFORM_BRAND_NAME} verboden is. De regels gelden voor accounts, websites, formulieren, uploads, domeinen en alle overige onderdelen van de dienst.`
        ]
      },
      {
        title: "2. Verboden content en activiteiten",
        bullets: [
          "Illegale content, handel, diensten of instructies.",
          "Haatdragende, discriminerende, intimiderende of bedreigende content.",
          "Phishing, spoofing, misleiding, frauduleuze websites of het nabootsen van andere organisaties.",
          "Malware, virussen, schadelijke scripts, botnets, exploitkits of cyberaanvallen.",
          "Spam, ongewenste bulkberichten, misbruik van contactformulieren of leadformulieren.",
          "Inbreuk op auteursrechten, merken, handelsnamen, portretrechten, databankrechten of andere rechten van derden.",
          "Publicatie van persoonsgegevens zonder geldige grondslag, doxing of privacyschending.",
          "Adult content, expliciet seksuele content, gewelddadige content of schokkende content wanneer wij dit niet toestaan voor het platform.",
          "Content die minderjarigen schaadt of uitbuit.",
          "Overmatig gebruik van opslag, bandbreedte, geautomatiseerde requests of andere middelen."
        ]
      },
      {
        title: "3. Maatregelen",
        paragraphs: [
          "Bij overtreding mogen wij content verwijderen, websites offline halen, formulieren blokkeren, domeinen ontkoppelen, accounts opschorten of verwijderen, technische maatregelen nemen en bevoegde autoriteiten informeren wanneer dat nodig is.",
          "Wij beoordelen klachten en risico's zorgvuldig en nemen evenredige maatregelen volgens artikel 6 van de algemene voorwaarden. Een klacht leidt niet automatisch tot verwijdering. Bij beperkingen wegens content informeren wij de betrokken klant met een concrete motivering en mogelijkheden voor bezwaar, zoals beschreven in de meldprocedure."
        ]
      },
      {
        title: "4. Meldingen",
        paragraphs: [
          `Misbruik en vermeend onrechtmatige content kunnen zonder account worden gemeld via ${PLATFORM_EMAILS.abuse}. De meldprocedure beschrijft de benodigde informatie, de uitzondering voor contactgegevens bij meldingen over seksueel misbruik van kinderen, de beoordeling en de mogelijkheden voor bezwaar.`
        ],
        links: [{ href: "/melding-onrechtmatige-content", label: "Bekijk de meldprocedure" }]
      },
      {
        title: "5. Verantwoordelijkheid van de klant",
        paragraphs: [
          "De klant blijft verantwoordelijk voor de eigen website, eigen gebruikers, eigen formulieren, eigen domeinen en eigen communicatie. De klant moet misbruik actief voorkomen en snel reageren op verzoeken om schadelijke of illegale content te verwijderen."
        ]
      }
    ]
  },
  takedown: {
    title: "Onrechtmatige content melden",
    description: `Meld vermeend onrechtmatige content op websites die door ${PLATFORM_BRAND_NAME} worden gehost.`,
    path: "/melding-onrechtmatige-content",
    isTemplate: false,
    updatedAt: "17 september 2026",
    sections: [
      {
        title: "Een melding indienen",
        paragraphs: [
          `Ziet u mogelijk onrechtmatige content op een website die door ${PLATFORM_BRAND_NAME} wordt gehost? Iedereen kan dit per e-mail melden. U heeft geen account nodig en hoeft niet zelf rechthebbende te zijn. Denk aan auteursrechtinbreuk, merkinbreuk, privacyschending, fraude, phishing of andere illegale content.`,
          `Stuur uw melding naar ${PLATFORM_EMAILS.abuse} met als onderwerp ‘Melding onrechtmatige content’. De e-maillink opent uw eigen mailprogramma; verstuur de melding daar zelf. U kunt het adres ook kopiëren en in uw webmail gebruiken.`
        ],
        links: [{ href: `mailto:${PLATFORM_EMAILS.abuse}?subject=${encodeURIComponent("Melding onrechtmatige content")}`, label: `Melden via ${PLATFORM_EMAILS.abuse}` }]
      },
      {
        title: "Wat vermeldt u in de melding?",
        bullets: [
          "De exacte URL of URL's van de content. Benoem bij meerdere afbeeldingen of teksten welk onderdeel u bedoelt.",
          "Een onderbouwde uitleg waarom de content volgens u onrechtmatig is, met relevante informatie of bewijs waarover u beschikt.",
          "Uw naam en e-mailadres, zodat wij ontvangst kunnen bevestigen, vragen kunnen stellen en ons besluit kunnen toesturen.",
          "Bij een melding over intellectuele eigendom: beschrijf het oorspronkelijke werk of recht en voeg waar mogelijk een bronlink toe. Als u namens een rechthebbende optreedt, licht dan uw bevoegdheid toe.",
          "Neem deze verklaring op: ‘Ik meen te goeder trouw dat de informatie en beweringen in deze melding juist en volledig zijn.’"
        ],
        paragraphs: [
          "Voor meldingen over seksueel misbruik of seksuele uitbuiting van kinderen hoeft u geen naam of e-mailadres op te geven. Gebruik desgewenst een e-mailadres dat uw identiteit niet prijsgeeft. Zonder bruikbare contactgegevens kunnen wij u geen ontvangstbevestiging of besluit sturen. Stuur geen kopieën van strafbaar beeldmateriaal mee; vermeld de vindplaats.",
          "Een telefoonnummer, woonadres, auteursrechtregistratie, identiteitsbewijs of handtekening is niet standaard nodig. Deel alleen persoonsgegevens die nodig zijn voor de beoordeling."
        ]
      },
      {
        title: "Wat gebeurt er na uw melding?",
        paragraphs: [
          "Als uw elektronische contactgegevens beschikbaar zijn, bevestigen wij de ontvangst zonder onnodige vertraging. Wij beoordelen de melding tijdig, zorgvuldig, objectief en zonder willekeur. Bij ontbrekende informatie vragen wij zo nodig om aanvulling; een onvolledige melding wordt niet automatisch genegeerd.",
          "Wij onderzoeken de betreffende content en wegen de rechten en belangen van de melder, de klant en andere betrokkenen. Waar nodig vragen wij de klant om een reactie. Ernst en urgentie bepalen hoe snel actie nodig is; bij acute risico's kan direct ingrijpen nodig zijn.",
          "Een melding leidt niet automatisch tot verwijdering. Wij kunnen besluiten geen maatregel te nemen, specifieke content tijdelijk of permanent te verwijderen of ontoegankelijk te maken. Als een beperktere maatregel niet volstaat, kan bij ernstige of herhaalde overtredingen ook een website of account worden geschorst of beëindigd.",
          "Wij informeren de melder zonder onnodige vertraging over het besluit en de mogelijkheden om daartegen op te komen. Als geautomatiseerde middelen zijn gebruikt voor de verwerking of besluitvorming, vermelden wij dat."
        ]
      },
      {
        title: "Informatie voor de betrokken klant",
        paragraphs: [
          "Bij een beperking wegens illegale content of overtreding van onze contentregels krijgt de klant uiterlijk bij het ingaan van de maatregel een duidelijke motivering, wanneer diens elektronische contactgegevens bekend zijn en behoudens wettelijke uitzonderingen.",
          "De motivering beschrijft de maatregel, de feiten, de wettelijke of contractuele grond, de omvang en eventuele duur, eventueel gebruik van automatisering en de beschikbare mogelijkheden voor bezwaar. De identiteit van de melder wordt alleen gedeeld als dat strikt noodzakelijk is."
        ]
      },
      {
        title: "Niet eens met het besluit?",
        paragraphs: [
          `Zowel de melder als de betrokken klant kan kosteloos om herbeoordeling vragen via ${PLATFORM_EMAILS.appeals}. Vermeld het betreffende besluit, de URL's, waarom u het niet eens bent en eventuele aanvullende informatie.`,
          "Wij beoordelen het bezwaar zorgvuldig en informeren u zonder onnodige vertraging over de uitkomst. Een onjuiste beperking wordt waar mogelijk opgeheven. U kunt zich ook tot de bevoegde rechter wenden en, voor zover van toepassing, gebruikmaken van buitengerechtelijke geschillenbeslechting. Een verzoek aan ons is daarvoor geen voorwaarde."
        ],
        links: [{ href: `mailto:${PLATFORM_EMAILS.appeals}?subject=${encodeURIComponent("Bezwaar tegen contentbesluit")}`, label: `Bezwaar via ${PLATFORM_EMAILS.appeals}` }]
      },
      {
        title: "Uw gegevens en de toepasselijke regels",
        paragraphs: [
          "Wij gebruiken de gegevens uit uw melding om de melding te beoordelen, daarover te communiceren en aan wettelijke verplichtingen te voldoen. Wij delen alleen noodzakelijke informatie met betrokkenen of bevoegde autoriteiten en bewaren gegevens niet langer dan nodig voor de afhandeling, geschillen en wettelijke verplichtingen."
        ],
        links: [
          { href: "/privacy", label: "Privacyverklaring" },
          { href: "/terms", label: "Algemene voorwaarden" },
          { href: "/acceptable-use", label: "Regels voor toegestaan gebruik" },
          { href: "https://eur-lex.europa.eu/eli/reg/2022/2065/oj?locale=nl", label: "Digital Services Act (artikelen 16 en 17)" }
        ]
      }
    ]
  },
  disclaimer: {
    title: "Disclaimer",
    description: `Disclaimer voor ${PLATFORM_BRAND_NAME}.`,
    path: "/disclaimer",
    sections: [
      {
        title: "1. Algemene informatie",
        paragraphs: [
          providerLine,
          `${PLATFORM_BRAND_NAME} biedt een technische website builder en hostingomgeving. De informatie op deze website en op websites van klanten kan fouten, verouderde informatie of onvolledigheden bevatten.`
        ]
      },
      {
        title: "2. Geen professioneel advies",
        paragraphs: [
          "Informatie op het platform, in voorbeeldteksten, templates, gegenereerde teksten of klantwebsites is geen juridisch, financieel, fiscaal, medisch of ander professioneel advies.",
          "Gebruikers en bezoekers moeten zelf professioneel advies inwinnen wanneer dat nodig is."
        ]
      },
      {
        title: "3. AI-output",
        paragraphs: [
          "Als AI-functionaliteit wordt gebruikt, kan AI-output fouten, onvolledigheden, verouderde informatie of ongewenste formuleringen bevatten.",
          "De klant blijft verantwoordelijk voor controle, aanpassing en publicatie van alle AI-output en andere content."
        ]
      },
      {
        title: "4. Verantwoordelijkheid voor gepubliceerde inhoud",
        paragraphs: [
          "Klanten blijven zelf verantwoordelijk voor de inhoud van hun websites, inclusief teksten, afbeeldingen, producten, diensten, prijzen, claims, privacy-informatie, cookie-informatie en contactformulieren.",
          "Wij controleren klantwebsites niet vooraf en zijn niet verantwoordelijk voor beslissingen die bezoekers nemen op basis van klantcontent."
        ]
      },
      {
        title: "5. Beschikbaarheid en externe diensten",
        paragraphs: [
          "Wij streven naar een betrouwbare dienst, maar garanderen geen ononderbroken beschikbaarheid. De werking kan afhankelijk zijn van externe diensten zoals hosting, database, opslag, e-mail, betaalproviders, DNS en domeinregistrars."
        ]
      },
      {
        title: "6. Aansprakelijkheid",
        paragraphs: [
          "Voor zover wettelijk toegestaan sluiten wij aansprakelijkheid uit voor indirecte schade, gevolgschade, omzetverlies, winstderving, reputatieschade, dataverlies en schade door gebruik van klantwebsites of externe diensten.",
          "Niets in deze disclaimer beperkt aansprakelijkheid voor zover beperking of uitsluiting wettelijk niet is toegestaan."
        ]
      }
    ]
  }
}

export function getLegalMetadata(key: LegalDocumentKey) {
  const document = legalDocuments[key]

  return {
    title: `${document.title} | ${PLATFORM_BRAND_NAME}`,
    description: document.description,
  }
}

export function LegalDocumentPage({ documentKey }: { documentKey: LegalDocumentKey }) {
  const document = legalDocuments[documentKey]

  return (
    <div className="space-y-8 text-white/90">
      {document.isTemplate !== false ? (
        <section className="rounded-lg border border-amber-300/30 bg-amber-300/10 p-4 text-sm text-amber-50">
          <p className="font-semibold">Let op: dit is een template en moet juridisch gecontroleerd worden voordat het definitief gebruikt wordt.</p>
          <p className="mt-2 text-amber-50/85">
            Vul alle placeholders in, controleer de feitelijke dienstverleners en laat de tekst aanpassen aan de definitieve bedrijfsstructuur van {PLATFORM_BRAND_NAME}.
          </p>
        </section>
      ) : null}

      {document.updatedAt ? <p className="text-sm text-white/70">Laatst bijgewerkt: {document.updatedAt}</p> : null}

      {documentKey === "terms" ? (
        <p className="text-sm text-white/80">
          Versie {TERMS_VERSION}.{" "}
          <a href={TERMS_DOWNLOAD_PATH} download className="text-[var(--brand-blue)] underline underline-offset-4 hover:text-white">
            Download de algemene voorwaarden (tekstbestand)
          </a>
        </p>
      ) : null}

      {document.sections.map((section) => (
        <section key={section.title}>
          <h2 className="mb-4 text-2xl font-bold text-white">{section.title}</h2>
          {section.paragraphs?.map((paragraph) => (
            <p key={paragraph} className="mb-3 leading-7">
              {paragraph}
            </p>
          ))}
          {section.bullets ? (
            <ul className="list-disc space-y-2 pl-6 leading-7">
              {section.bullets.map((bullet) => (
                <li key={bullet}>{bullet}</li>
              ))}
            </ul>
          ) : null}
          {section.links ? (
            <ul className="mt-4 space-y-2">
              {section.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="break-words text-[var(--brand-blue)] underline underline-offset-4 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ))}
    </div>
  )
}
