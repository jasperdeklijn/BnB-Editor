# Super Assist als softwarepartner van FlexPagina

Datum: 3 november 2026

Status: product- en samenwerkingsvoorstel. Geen overeenkomst, implementatie of toezegging over beschikbare integraties.

## 1. Het aanbod in één zin

**Bied Super Assist een partnerwerkplek waarmee zij klantwebsites verkoopt en beheert, en vanuit dezelfde klantomgeving aanvragen, planning, offertes en ondersteunende werkzaamheden uitvoert.**

De website brengt werk binnen. Super Assist verzorgt de opvolging en organisatie. FlexPagina levert de software waarin ondernemer en assistent samenwerken.

Dit maakt een combinatie mogelijk van eenmalige websiteoplevering, een doorlopend websiteabonnement en terugkerende ondersteuning door Super Assist. De software ondersteunt haar persoonlijke dienstverlening; beslissingen en communicatie blijven bij bevoegde mensen.

## 2. Onderbouwing en relatie met het eerdere plan

Super Assist presenteert zich als virtual assistant voor ondernemers. Haar openbare aanbod omvat administratief werk, secretariële ondersteuning en planning/organisatie, waaronder ondersteuning bij offertes en facturen, mailboxwerk en social media. Ze biedt structurele, flexibele, tijdelijke en projectmatige samenwerking. Zie de [dienstenpagina](https://superassist.nl/index.php/diensten/) en [homepage](https://superassist.nl/), geraadpleegd op 3 november 2026.

De onderstaande modules en pakketten zijn voorstellen van FlexPagina op basis van dat aanbod. Ze zijn niet met Super Assist afgestemd. Websiteverkoop wordt voorgesteld als nieuwe gezamenlijke dienst; de bronwebsite bewijst niet dat zij deze nu al aanbiedt.

Dit document bouwt voort op [Partneraccount — implementatieplan](partneraccount-plan.md). Dat basisplan beperkt partners tot websitebeheer. **Voor dit softwarepartnerprofiel worden operationele modules toegevoegd met afzonderlijke, door de ondernemer verleende rechten.** De algemene websitepartner blijft die rechten standaard missen. Gebruik één partnerfundament met verschillende bevoegdheden, zonder een afzonderlijk accountsysteem voor Super Assist te bouwen.

De bestaande [Super Assist-websitedemo](import/examples/superassist.md) kan het gesprek ondersteunen. Het is een lokaal ontwerpconcept, geen bewijs van een actief partneraccount of operationele software.

## 3. Wat het ieder oplevert

| Partij | Voorgestelde waarde |
| --- | --- |
| Super Assist | Eén werkoverzicht voor klanten, minder wisselen tussen losse dossiers, websiteverkoop als aanvullende dienst en terugkerend onderhoud |
| Ondernemer | Een website met opvolging erachter, zicht op lopend werk en ondersteuning die per module kan worden uitbesteed |
| FlexPagina | Websiteabonnementen, een partner die klanten begeleidt en een herbruikbaar softwarepartnerproduct voor andere assistenten of bureaus |

Meet deze voordelen tijdens een pilot. Beloof vooraf geen vast aantal bespaarde uren, hogere omzet of gegarandeerde conversie.

## 4. Van dienstverlening naar software

De dienstcategorieën komen uit het openbare aanbod; de invulling hieronder is ons productvoorstel.

| Werkgebied | Voorgestelde uitvoering vanuit FlexPagina | Basis in deze repository | Aanvullend nodig |
| --- | --- | --- | --- |
| Website en online presentatie | Website opleveren, inhoud aanpassen en contact-/aanvraagstromen inrichten | Editor, templates, import, SEO en domeinbeheer | Partnercontext en gedelegeerde rechten |
| Aanvragen en correspondentie | Websiteaanvragen beoordelen, notities en opvolging vastleggen, antwoord voorbereiden of bevoegd versturen | Aanvrageninbox, statussen, notities, opvolgdatum en verzendhistorie | Partnertoegang en goedkeuringsflow voor conceptantwoorden |
| Afspraken en organisatie | Klantafspraken en beschikbaarheid beheren, werk aan dossiers koppelen | Kalender, reserveringen en boekingslogica | Partnerrechten; algemene werkplanning als nieuwe module |
| Offertes | Concept opstellen, laten controleren, aanbieden en opvolgen | Offertes, versies, PDF en dossierpagina | Afzonderlijke concept-, goedkeurings- en verzendrechten |
| Uitgaande factuurvoorbereiding | Ondersteunde dossierfactuur voorbereiden; ondernemer controleert en geeft uit | Bestaande factuurflow bij boekingen en geldige offerte-/afspraakdossiers | Partnerrechten en beoordeling; algemene losse facturen vallen buiten deze bestaande flow |
| Terugkerend administratief werk | Checklists, deadlines, klantvragen en werkinstructies per dossier | Bestaande dossiernotities en activiteit | Taken, herhaling, documentomgeving en werkrapportage |
| Vergaderondersteuning | Voorbereiding, notulen en actiepunten bewaren en delen | Hooguit bestaande notities als beperkte basis | Eigen interne/gedeelde documenten en gekoppelde taken |
| Socialmediabegeleiding | Contentkalender, berichtconcepten, klantakkoord en handmatig plaatsen | Geen algemene socialmediaplanner aangetoond | Contentmodule; automatische publicatie via externe platformen is apart integratiewerk |
| Inkoopadministratie en bankverwerking | Werk plannen en documenten verzamelen; uitvoering in de bestaande boekhoudomgeving | Geen aangetoonde boekhoud-, bank- of inkoopadministratie | Later eventueel een geselecteerde boekhoudkoppeling; deze werkzaamheden blijven tot die tijd extern |
| Algemene mailbox | Een werktaak en gecontroleerde verwijzing naar de externe mailbox | De bestaande platformmailbox is admin-only | Aparte klantmailintegratie als vervolg; websiteaanvragen zijn geen volledige mailbox |

De bestaande basis is lokaal onderbouwd in [aanvragen en boekingen](enquiry-inbox-and-booking-flow-tasks.md), [offertes en klantpagina](offertes-en-klantpagina-runbook.md), [aanvragenlogica](../lib/inquiries.ts), [offertelogica](../lib/quotes/server.ts) en [facturatie](../lib/booking/invoicing.ts). Hosted werking en partnertoegang zijn hiermee niet bewezen.

## 5. Drie mogelijke klantpakketten

Dit zijn nieuwe gezamenlijke pakketvoorstellen, geen huidige pakketten of tarieven van Super Assist. Namen, inhoud, uren en prijzen worden samen vastgesteld.

| Pakketvoorstel | Wat de ondernemer koopt | Werk van Super Assist |
| --- | --- | --- |
| **Website & Beheer** | Inrichting van een FlexPagina-website, hostingabonnement en afgesproken onderhoud | Intake, content verzamelen, website opleveren en wijzigingen verzorgen |
| **Website & Opvolging** | Website plus begeleiding van binnenkomende aanvragen | Intake verwerken, opvolging bewaken, antwoorden/offertes voorbereiden en planning ondersteunen |
| **Website & Ondersteuning** | Website plus een afgesproken aantal ondersteuningsuren of taken | Dagelijkse werkvoorraad, dossierbeheer, documenten, terugkerende werkzaamheden en rapportage; externe werkzaamheden herkenbaar apart |

Een bestaande Super Assist-klant kan ook alleen de werkplek afnemen en de huidige website behouden. De combinatie met een FlexPagina-website levert de meest directe aanvraagstroom op, maar een verplichte websiteverhuizing zou bestaande dienstverlening onnodig beperken. Handmatig een dossier aanmaken of een andere invoerroute vraagt aparte scopecontrole.

### Prijsopbouw en verantwoordelijkheden

- **Eenmalige inrichting:** intake, websitebouw/content, moduleconfiguratie en uitleg.
- **Maandelijkse software:** website, gekozen modules en eventuele partnerlicentie.
- **Dienstverlening:** afgesproken uren, takenpakket of projectprijs van Super Assist.
- **Meerwerk:** vooraf afspreken wie wijzigingen, spoedwerk en extra uren goedkeurt.

Aanbevolen start: de ondernemer betaalt het softwareabonnement rechtstreeks aan FlexPagina; Super Assist factureert haar inrichting en ondersteuning. Websiteverkoop kan worden beloond met een afgesproken partnervergoeding. Zo kan de samenwerking beginnen zonder eerst volledige verzamelfacturatie te bouwen.

Als Super Assist één totaalbedrag wil factureren, past het resellerinkoopmodel uit het basisplan. Daarvoor zijn afspraken over betaalverantwoordelijkheid, looptijd, overdracht en een controleerbare gebruiksafrekening nodig.

De [huidige prijsdocumentatie](pricing.md) vermeldt tijdelijk gratis Gold-toegang en uitgeschakelde betaalde aankopen. Daarom bevat dit voorstel geen definitieve verkoopbedragen of claim dat partnercheckout al werkt. Maak een rendementsberekening met: klantprijs minus software-inkoop, bestede uren maal intern uurtarief en overige afgesproken kosten.

## 6. De dagelijkse partnerwerkplek

### Startscherm: Vandaag

Super Assist ziet alleen klanten waarvoor zij actuele toegang heeft, met onder meer:

- Nieuwe aanvragen en opvolgmomenten die vandaag aandacht vragen.
- Afspraken en eigen werktaken voor vandaag.
- Concepten die op haar actie of op goedkeuring van de ondernemer wachten.
- Achterstallige taken en documenten die nog ontbreken.
- Een snelle klantwissel, altijd met zichtbare bedrijfsnaam.

Een teller mag alleen gegevens meetellen waarvoor zij leesrecht heeft. Zonder financiële rechten krijgt zij ook geen omzetbedragen of factuurdetails in het totaaloverzicht.

### Klantwerkplek

Per ondernemer toont de werkplek toegestane modules: Overzicht, Website, Aanvragen, Agenda, Offertes, Factuurvoorbereiding, Taken, Documenten en Rapportage. De interface toont welke acties Super Assist zelf mag afronden en waarvoor klantakkoord nodig is.

### Voorkom verwarring tussen drie relaties

1. **FlexPagina ↔ Super Assist:** softwarepartner en gebruiker van de partnerwerkplek.
2. **Super Assist ↔ ondernemer:** opdrachtgever en diens eigen bedrijfsomgeving.
3. **Ondernemer ↔ eindklant:** websitebezoeker, aanvrager of ontvanger van een offerte/factuur.

De bestaande `/aanvraag`-pagina hoort bij het dossier van een eindklant. Goedkeuringen voor Super Assist horen in de ingelogde omgeving van de ondernemer. Een eindklant krijgt geen toegang tot interne werktaken of de dienstverleningsovereenkomst.

## 7. Een concreet traject van website naar uitvoering

Voorbeeld: een fictief dienstverlenend bedrijf koopt een website en laat de opvolging ondersteunen.

1. Super Assist verzamelt de bedrijfsinhoud en richt de website, diensten en aanvraagknoppen in.
2. De ondernemer controleert de website en geeft eventueel aparte publicatiebevoegdheid.
3. Een bezoeker vraagt via de gepubliceerde website een offerte aan.
4. De aanvraag verschijnt bij het juiste bedrijf en in de bevoegde werkvoorraad van Super Assist.
5. Super Assist controleert gegevens, maakt een vervolgtaak en bereidt een offerte voor.
6. De ondernemer controleert de actuele versie, prijs, scope en voorwaarden en keurt deze goed.
7. De offerte wordt bewust aangeboden en eventueel verstuurd door iemand met de juiste bevoegdheid. Akkoord op een concept en een mail verzenden zijn afzonderlijke acties.
8. De eindklant reageert via de bestaande dossierpagina. Een beschikbare afspraak wordt via de bestaande planningsregels vastgelegd.
9. Super Assist bereidt voor een ondersteund dossier een conceptfactuur voor; de ondernemer controleert en geeft deze uit.
10. Het werkoverzicht toont de volgende actie. Een perioderapport maakt zichtbaar wat is uitgevoerd, wat openstaat en welke uren zijn geregistreerd.

Een generiek aanvraagformulier reserveert geen beschikbaar tijdvak. Een offerteakkoord bewijst geen ontvangst van betaling. Deze bestaande procesgrenzen blijven behouden.

## 8. Rechten en goedkeuring

Alle rechten gelden per klantrelatie. De ondernemer kiest modules en bevoegdheden; een softwarepartnerlabel geeft op zichzelf geen toegang.

| Module/actie | Aanbevolen start voor Super Assist | Aanvullende bevoegdheid |
| --- | --- | --- |
| Website bewerken | Na expliciete klanttoestemming | Publiceren en domeinbeheer apart |
| Aanvragen lezen, status, notities en opvolging | Na activering van aanvraagbeheer | Extern antwoorden versturen apart |
| Offerte opstellen en aanpassen | Concepten voorbereiden | Aanbieden/versturen apart, met goedgekeurde versie |
| Kalender inzien | Na activering van planning | Afspraken wijzigen/bevestigen apart |
| Facturen | Alleen na expliciete financiële toegang; concepten voorbereiden | Uitgeven, crediteren en betaalstatus wijzigen apart; standaard bij ondernemer |
| Taken en interne documenten | Binnen de geactiveerde werkmodule | Delen met eindklanten apart |
| Uren en werkrapport | Eigen werkzaamheden registreren | Ondernemer beoordeelt indien gebruikt voor afrekening |
| Account, eigendom en partnerrechten | Geen wijzigingsrecht | Blijft bij ondernemer/platformbeheer |

Een modulelicentie en een toestemming zijn twee voorwaarden: de klant moet de functie mogen gebruiken én de partner moet de betreffende handeling mogen uitvoeren. Gebruik nooit het privéabonnement van Super Assist om klantrechten te bepalen.

### Goedkeuring hoort bij een specifieke versie

Nieuwe goedkeuringsverzoeken bevatten bedrijf, dossier, actietype, exacte revisie en beoogde ontvanger. Een wijziging van tekst, bedrag, voorwaarden, bijlage of ontvanger maakt het eerdere akkoord ongeldig. Het systeem registreert wie akkoord gaf en wie de actie daarna uitvoerde.

Default: ondernemer verzendt offertes en geeft facturen uit. Een ondernemer kan later gerichte uitvoeringsbevoegdheden geven. Aanpassen van een definitief financieel document blijft de bestaande versie-/creditprocedure volgen.

## 9. Wat we eerst bouwen

**Eerste bruikbare versie: websitebeheer + aanvragen + taken + offertevoorbereiding.** Hiermee kan Super Assist al een concreet gecombineerd aanbod uitvoeren. Volledige e-mail, boekhouding en socialmediapublicatie vragen eigen integratieprojecten.

### Fase A — procesgesprek en partnerfundament

- [ ] Met Super Assist twee of drie herkenbare klantprocessen en huidige hulpmiddelen bespreken.
- [ ] Vaststellen hoeveel klanten zij wil beheren en welke werkzaamheden werkelijk binnen FlexPagina moeten plaatsvinden.
- [ ] Het bestaande partnerplan realiseren: uitnodiging, acceptatie, eigendom, klantcontext, intrekken en audit.
- [ ] Per klant een module- en bevoegdhedenkeuze toevoegen.

Oplevering: zij kan veilig tussen aangesloten ondernemers wisselen en klantwebsites beheren.

### Fase B — operationele kern voor de pilot

- [ ] Aanvragen en follow-ups toegankelijk maken voor bevoegde partners.
- [ ] Een eenvoudige takenlijst per ondernemer/dossier toevoegen met deadline, verantwoordelijke en status.
- [ ] Offerteconcepten laten voorbereiden; ondernemer controleert en biedt aan.
- [ ] Startscherm met toegestane klantoverstijgende werkvoorraad bouwen.
- [ ] Alle acties vastleggen met de echte uitvoerder en klantcontext.
- [ ] Bestaande modules en openbare aanvraagflow volledig met testaccounts verifiëren.

Oplevering: website → aanvraag → voorbereiding → ondernemersactie, inclusief opvolgtaken. Externe verzending kan eerst bij de ondernemer blijven.

### Fase C — samenwerken en administratieve ondersteuning

- [ ] Goedkeuringsverzoeken voor antwoorden en offertes toevoegen, inclusief revisiecontrole.
- [ ] Gedelegeerd agenda-/afspraakbeheer met bestaande beschikbaarheidscontroles toevoegen.
- [ ] Private documenten, werkinstructies en notulen met expliciete deelrechten toevoegen.
- [ ] Herhalende taken, tijdregistratie en een eenvoudig perioderapport toevoegen.
- [ ] Factuurvoorbereiding voor de bestaande ondersteunde dossiers toegankelijk maken; definitieve uitgifte blijft standaard bij ondernemer.

Oplevering: een dagelijkse assistentwerkplek voor afgebakende werkzaamheden, met controle door de opdrachtgever.

### Fase D — selectieve uitbreidingen na pilot

- [ ] Een eenvoudige contentkalender met concept en klantakkoord ontwikkelen als daar vraag naar blijkt.
- [ ] Per behoefte één mailbox-, agenda- of boekhoudintegratie ontwerpen en haalbaarheid afzonderlijk toetsen.
- [ ] Eventueel algemene verkoopfacturen buiten boekings-/offertedossiers als apart financieel project ontwerpen.
- [ ] Automatische resellerfacturatie en meerdere partnermedewerkers toevoegen wanneer gebruik dit rechtvaardigt.

Bouw automatische publicatie op sociale netwerken, bankkoppelingen en een compleet boekhoudsysteem pas na afzonderlijke productkeuzes. In eerdere fasen toont de werkplek welke handelingen buiten FlexPagina worden uitgevoerd.

## 10. Technische uitwerking voor de implementatie

Onderstaande structuur is een voorstel, geen bestaand schema.

- Hergebruik `partner_organizations`, lidmaatschappen en klantrelaties uit het basisplan. Voeg moduletoegang en expliciete actiebevoegdheden toe, standaard uit.
- Houd bevoegdheden bij in één centraal model dat serveracties, API-routes, databasepolicies en downloads gebruiken. Alleen knoppen verbergen voldoet niet.
- Voeg `work_tasks` toe met `business_id`, optioneel dossier-ID, verantwoordelijke, status, deadline en herhaalgegevens. Een gekoppeld dossier en taak moeten tot hetzelfde bedrijf behoren.
- Voeg `work_documents` toe met bedrijfscontext, versie en expliciete zichtbaarheid. Bestanden staan in private opslag met gecontroleerde downloads; scheid deze van publieke websiteafbeeldingen.
- Voeg `approval_requests` toe met resource, exacte versie, gewenste actie, ontvanger en beslisser. Uitvoering controleert akkoord en actuele rechten opnieuw in dezelfde transactie waar mogelijk.
- Voeg in fase C `time_entries` en perioderapporten toe. Uren zijn geen automatisch bewijs van een verschuldigd factuurbedrag en maken niet vanzelf klantfacturen aan.
- Breid bestaande auditactiviteiten uit met partner, actor en bedrijf. Het intrekken van rechten en het definitief uitvoeren van een goedgekeurde actie vereisen duurzame vastlegging.
- Pas bestaande eigenaarchecks en runtime-entitlements in aanvragen, offertes, kalender, facturatie, PDF-routes en databasefuncties samen aan. Sommige huidige helpers gaan uit van de ingelogde eigenaar; alleen extra RLS is daarom onvoldoende.
- Laat een klantoverstijgend overzicht uitsluitend via gecontroleerde queries toegestane gegevens ophalen; cache resultaten per gebruiker én klant-/rechtenscope.
- Ondersteun intrekken tijdens open tabbladen, autosave en geplande acties. Een oude sessie of eerder akkoord mag verlopen toegang niet herstellen.

Toekomstige externe koppelingen krijgen een eigen beveiligings- en autorisatieontwerp. Geef partners geen toegang tot de bestaande platformadminmailbox, globale mailcredentials of service-role keys. Een bericht verzenden via FlexPagina is niet hetzelfde als verzenden uit de persoonlijke mailbox van een ondernemer.

Lees vóór implementatie de relevante geïnstalleerde Next.js-guides en actuele documentatie van gebruikte diensten. Voeg wijzigingen additief toe; bestaande eigendom, abonnementen, dossierstatussen en documenthistorie blijven intact.

## 11. Pilotvoorstel en demonstratie

Voorgestelde omvang: Super Assist en twee of drie vrijwillig deelnemende ondernemers. De pilotduur start zodra fase B bruikbaar is; dit is geen inschatting van de bouwtijd. Een periode van vier tot zes weken geeft gelegenheid om herhaald dagelijks gebruik te beoordelen.

### Demonstratie voor het partnergesprek

1. Toon de bestaande Super Assist-websitedemo als voorbeeld van websiteoplevering.
2. Gebruik een fictieve ondernemer om website → aanvraag → offerte → afspraak te laten zien.
3. Toon het gewenste partneroverzicht als concept, duidelijk herkenbaar als nog te bouwen.
4. Laat zien hoe een ondernemer toegang verleent, een voorstel controleert en samenwerking beëindigt.
5. Bespreek welk concreet klantpakket en welk proces zij als eerste wil testen.

Gebruik fictieve gegevens voor een verkoopdemo. Verstuur geen echte offertes of uitnodigingen zonder afgesproken ontvangers. Dit document autoriseert of verstuurt geen contact met Super Assist.

### Voorsteltekst voor het gesprek

> We willen Super Assist een eigen partnerwerkplek binnen FlexPagina bieden. Daarmee kun je klanten een website aanbieden en hun aanvragen, planning en ondersteunende werkzaamheden vanuit dezelfde omgeving begeleiden. Je klant houdt het eigendom en kiest welke taken jij mag uitvoeren. We beginnen met websitebeheer, aanvraagopvolging en offertevoorbereiding en ontwikkelen vanuit een kleine pilot verder wat jij dagelijks nodig hebt.

Deze tekst is een gespreksvoorstel. Beschrijf bij aanbieding expliciet welke delen al werken en welke nog ontwikkeld worden.

## 12. Wanneer de eerste versie geslaagd is

- Super Assist kan voor minstens twee afzonderlijke ondernemers websites en toegestane dossiers beheren zonder accounts te delen.
- Een nieuwe websiteaanvraag komt bij het juiste bedrijf binnen en kan worden opgevolgd met een taak en offerteconcept.
- De ondernemer kan het actuele concept beoordelen en zelf aanbieden/versturen. In fase C vervalt akkoord automatisch zodra relevante gegevens veranderen.
- Zonder aanvullende bevoegdheid kan de partner geen offerte aanbieden, factuur uitgeven, betaalstatus wijzigen of domein loskoppelen.
- Andere partners en niet-gekoppelde gebruikers krijgen via interface, directe API/databaseaanroepen, bestanden of totalen geen klantgegevens.
- Het intrekken van een relatie blokkeert nieuwe partneracties, terwijl de ondernemer zijn website, dossiers en documenten behoudt.
- De werkplek maakt zichtbaar welke taken zijn uitgevoerd, welke wachten op klantactie en welke extern moeten gebeuren.
- De pilot meet tijd per proces, gemiste opvolging, daadwerkelijk modulegebruik, ondersteuningsvragen en bereidheid om voor het pakket te betalen.

Verifieer bij implementatie autorisatie per actie, klantisolatie, gelijktijdige wijzigingen, versiegebonden goedkeuring, mailuitkomsten, private downloads en regressies in de eigenaarflows. Voer daarna een volledige ingelogde praktijktest uit op desktop en mobiel in een testomgeving. Er is voor dit document geen applicatiecode gewijzigd of live partnerfunctionaliteit getest.

## 13. Beslispunten voor het eerste overleg

1. Wil Super Assist websites zelf opleveren, of vooral verkoop/intake en beheer verzorgen met bouwondersteuning van FlexPagina?
2. Welke drie dagelijkse handelingen moeten als eerste binnen FlexPagina kunnen?
3. Welke mailbox-, agenda- en boekhoudsoftware gebruiken zij en de pilotklanten nu?
4. Welke handelingen mag zij zelfstandig afronden en waarvoor wil de ondernemer goedkeuring geven?
5. Willen klanten rechtstreeks software betalen of één gecombineerd pakket van Super Assist afnemen?
6. Welke klant is geschikt voor een kleinschalige pilot en hoe verdelen we onboarding en support?

Leg vóór de pilot ook dienstverlening, gegevensverwerking, bewaartermijnen en overdracht bij beëindiging vast. De technische productkeuze blijft gericht op één herbruikbaar softwarepartneraccount, met Super Assist als eerste beoogde praktijkpartner.
