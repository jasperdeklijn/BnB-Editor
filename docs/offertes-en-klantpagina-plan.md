# Offertes, afspraken en klantpagina

Datum: 29 september 2026. Status: lokaal geïmplementeerd; hosted acceptatie en productieactivatie staan nog open. Zie `docs/offertes-en-klantpagina-runbook.md` voor implementatiekeuzes, testbewijs en uitrol.

## Doel

Een ondernemer kan vanuit een aanvraag of bestaande afspraak een offerte maken, deze aan de klant aanbieden en het akkoord opvolgen. De klant van de ondernemer krijgt een eigen beveiligde pagina met de voortgang van de aanvraag, de offerte, de gekoppelde afspraak en later de factuur.

De eerste versie biedt één pagina per aanvraag/dossier, zonder verplicht klantaccount. Een overzicht van alle aanvragen van dezelfde persoon valt buiten deze versie. Eenzelfde e-mailadres mag nooit automatisch toegang geven tot andere dossiers of bedrijven.

## Gecontroleerde bestaande basis

Onderstaande vinkjes betekenen aanwezig in lokale broncode, niet bewezen uitgerold of live getest.

- [x] Aanvrageninbox met statussen, notities, opvolgmomenten en e-mailreacties: `lib/inquiries.ts`, `components/requests/requests-client.tsx`, `app/editor/requests/actions.ts`.
- [x] Contact-, offerte- en afspraakaanvragen via `app/api/requests/route.ts`.
- [x] Koppeling van agenda-items via `calendar_entries.contact_request_id`.
- [x] Klantpagina voor boekingen op `/booking/[token]`, met historie, wijzigingsverzoeken en uitgegeven facturen: `lib/booking/customer-access.ts` en `components/booking/customer-booking-client.tsx`.
- [x] Bestaande boekingstoegang controleert ondertekende tokens, vervaldatum, versie en intrekking.
- [x] Conceptfacturen, definitieve PDF, handmatige e-mailverzending en creditfacturen: `lib/booking/invoicing.ts` en `components/calendar/booking-finance-panel.tsx`.
- [x] Facturatie is nu expliciet beperkt tot `metadata.source === 'booking_engine'`.
- [x] Tijdelijk alle functies beschikbaar via `DEFAULT_ALL_FEATURES_INCLUDED` in `lib/subscriptions.ts`.
- [x] Offertedocumenten, versies, akkoord en afwijzen.
- [x] Offerte maken vanuit een losse of handmatig ingevoerde afspraak.
- [x] Klantpagina voor aanvragen zonder online boeking.
- [x] Doorlopende koppeling van offerte naar planning en facturatie.

Dit plan vult `docs/enquiry-inbox-and-booking-flow-tasks.md` aan. Oudere voorgestelde statussen in `docs/customer-workspace-implementation-plan.md` zijn geen reden om de huidige aanvraagstatussen te vervangen.

## Productkeuzes voor de eerste versie

1. **Afspraak naar offerte is een gekoppeld document maken.** De afspraak wordt niet verwijderd, gekopieerd of automatisch geannuleerd. Naam, dienst, datum en beschikbare prijsgegevens worden voorgesteld; de ondernemer controleert de inhoud.
2. **Eén dossier als basis.** Gebruik `contact_requests` als dossier, met de bestaande agenda-relatie. Heeft een handmatige afspraak nog geen aanvraag, maak en koppel die transactioneel met bron `owner_created`. Geen tweede CRM of duplicerende klantendatabase.
3. **Drie afzonderlijke toestanden.** Aanvraagopvolging, offertestatus en afspraakstatus blijven apart. Een offerteakkoord bevestigt de prijs en scope; beschikbaarheid wordt via de boekingsregels gecontroleerd.
4. **Bewuste verzending.** De ondernemer kiest zelf wanneer een offerte wordt aangeboden en wanneer een factuur wordt uitgegeven/verstuurd. Ontvangstbevestiging met klantlink kan automatisch na een succesvolle aanvraag, met instelling per bedrijf; bestaande bedrijven krijgen deze instelling niet stilzwijgend aan.
5. **Eigen pagina in bedrijfsstijl.** Naam/logo van de ondernemer, taal van de aanvraag, duidelijke actuele status en volgende actie. Geen openbaar profiel en geen zoekmachine-indexering.
6. **Geen betaalverwerking in deze versie.** Facturen en handmatige betaalstatus sluiten aan op het bestaande systeem. Online betalen, deelbetalingen en boekhoudkoppelingen zijn vervolgwerk.

## Gewenste routes voor gebruiker en klant

### Aanvraag naar offerte

1. Bezoeker verstuurt een aanvraag; opslag slaagt voordat een klantlink wordt aangeboden/verstuurd.
2. Ondernemer opent Aanvragen en kiest **Offerte maken**.
3. Concept bevat klantgegevens, omschrijving, regels, aantallen, prijs, korting, btw, geldigheidsdatum en voorwaarden.
4. Ondernemer bekijkt de klantweergave/PDF en kiest **Offerte aanbieden**. De versie wordt vastgelegd en zichtbaar op de klantpagina; e-mailbezorging heeft een eigen status.
5. Klant ziet de offerte, downloadt de PDF en kiest **Akkoord geven** of **Afwijzen**, met expliciete bevestiging en optionele toelichting.
6. Ondernemer ontvangt het resultaat in de editor en via de ingestelde melding. Bij akkoord is de vervolgstap: bestaande afspraak behouden of een beschikbare afspraak inplannen.

### Bestaande afspraak naar offerte

1. Voeg **Offerte maken** toe aan afspraakdetails in Kalender en, waar van toepassing, Reserveringen.
2. Hergebruik de gekoppelde aanvraag of maak er veilig één aan. Vraag ontbrekende klantgegevens in de editor; zonder geldig e-mailadres kan wel een concept worden opgeslagen maar geen e-mail worden verstuurd.
3. Neem datum en dienst als voorstel over en vermeld of de afspraak al bevestigd is of nog aangevraagd.
4. Behoud afspraak-ID, status, historie en eventuele bestaande facturen. Dubbelklikken maakt geen tweede dossier of concept.
5. Bij een bestaande actieve offerte: open die. Bij een afgewezen/verlopen offerte: bied een nieuwe versie aan. Na akkoord vergt een gewijzigde scope een expliciete nieuwe versie en nieuw akkoord.
6. Afwijzen of verlopen annuleert een bestaande afspraak niet automatisch. Toon de ondernemer dat opvolging nodig is.
7. Geblokkeerde agenda-items zijn geen klantafspraken. Geannuleerde/afgeronde afspraken en afspraken met uitgegeven facturen krijgen uitleg en geen standaard omzetactie in v1.

### Geaccepteerde offerte naar factuur

1. Start vanuit een geaccepteerde offerte die aan een afspraak is gekoppeld.
2. Maak een conceptfactuur met een snapshot van de geaccepteerde regels, klantgegevens en bronversie.
3. Hergebruik een bestaand gekoppeld concept bij herhaald klikken; voorkom onbedoelde dubbele facturering en waarschuw bij bestaande uitgegeven facturen.
4. De ondernemer controleert, geeft uit en verstuurt via de bestaande factuurflow. Geen automatische factuur bij akkoord.
5. Breid de huidige booking-engine-beperking gericht uit voor geldige eigenaar-afspraken. Alleen de broncontrole verwijderen is onvoldoende: nummering, financiële records, rechten, PDF-toegang en klantpagina moeten meeveranderen.

## Wat de klantpagina toont

Route: `/aanvraag`; nieuwe links gebruiken een geheim URL-fragment dat wordt ingewisseld voor een sessie. De route `/aanvraag/[token]` blijft beschikbaar als compatibele ingang. De link geeft uitsluitend toegang tot dit dossier bij dit bedrijf.

- Bovenaan: bedrijfsnaam, aanvraagreferentie, actuele voortgang, laatste wijziging en volgende stap.
- Publieke tijdlijn: ontvangen, in behandeling, offerte beschikbaar, offerte geaccepteerd/afgewezen/verlopen, planning nodig, afspraak bevestigd, afgerond.
- Aanvraag: de eigen ingezonden gegevens en samenvatting.
- Offertes: huidige aangeboden versie, bedrag, geldigheid, voorwaarden, PDF en toegestane acties. Eerdere aangeboden versies blijven herkenbaar als vervangen.
- Afspraak: datum, tijd, tijdzone en echte afspraakstatus; bestaande annuleer/verplaatsregels hergebruiken waar die van toepassing zijn.
- Berichten: alleen bewust gedeelde berichten. Klant kan een toelichting of vraag plaatsen; dit komt in de bestaande aanvrageninbox. Bestaande interne historie wordt niet automatisch gepubliceerd.
- Facturen: uitsluitend uitgegeven, klantzichtbare documenten en de handmatig bijgehouden betaalstatus.
- Fout-/lege toestanden: nog geen offerte, planning nog niet bevestigd, verlopen link, ingetrokken toegang en tijdelijk niet beschikbaar.

Gebruik een expliciete publieke status/projectie. Interne labels zoals `spam`, `lost`, interne sluitredenen, notities, opvolgdata en mailfouten worden nooit rechtstreeks getoond. Geen vaste voortgangsbalk die onterecht een lineaire route of bevestigde afspraak suggereert.

## Offertestatus en versiebeheer

| Status | Betekenis en toegestane vervolgactie |
| --- | --- |
| `draft` | Alleen eigenaar zichtbaar; bewerken of aanbieden. |
| `offered` | Vastgelegde versie voor klant; accepteren, afwijzen, verlopen, intrekken of vervangen. |
| `accepted` | Akkoord vastgelegd; planning/factuur volgen. Inhoud blijft onveranderlijk. |
| `declined` | Afgewezen; nieuwe versie kan worden voorbereid. |
| `expired` | Geldigheid voorbij; server weigert akkoord, ook zonder cronrun. |
| `withdrawn` | Eigenaar trok aanbod in; akkoord niet meer mogelijk. |
| `superseded` | Vervangen door een nieuw aangeboden aanbod; oude link kan geen akkoord meer registreren. |

Een nieuw concept maakt een aangeboden versie nog niet ongeldig; vervanging gebeurt bij aanbieden. Een geaccepteerde versie blijft historisch geaccepteerd. Een latere wijziging bewaart de relatie met het eerdere akkoord en verandert bestaande afspraken/facturen niet stilzwijgend.

Aanbieden, intrekken, vervangen en klantbeslissing gebruiken transacties en versiecontrole. Bij gelijktijdig accepteren en intrekken wint precies één geldige overgang. Leg akkoord vast met versienummer, documenthash, naam, serverdatum en de tekst van de bevestiging/voorwaarden. Presenteer dit niet als een gecertificeerde digitale handtekening.

## Technisch ontwerp

Voorgestelde namen; controleer bij implementatie de definitieve schema-conventies.

- `quotes`: bedrijf, aanvraag, optionele bronafspraak en uniek offertenummer per bedrijf. Relaties moeten aantoonbaar tot hetzelfde bedrijf/dossier behoren.
- `quote_versions`: oplopende versie per offerte, status, snapshots van afzender/klant/regels/voorwaarden, totalen, valuta, geldigheid, PDF-pad/hash en beslismomenten. Eén actief aangeboden versie per offerte; maximaal één werkconcept.
- `quote_events`: audit van aanmaken, aanbieden, vervangen en beslissen; geen tokens in logs.
- `customer_request_access`: dossier, tokenhash, vervaldatum en intrekking. Gebruik cryptografisch willekeurige tokens; bewaar geen ruwe toegangstokens in de database.
- Klantzichtbare gebeurtenissen: aparte expliciete projectie/tabel, niet de interne activiteiten-JSON doorgeven. Verrijk `contact_request_messages` met expliciete zichtbaarheid, bron en herhaalbeveiliging; bestaande berichten standaard privé tot bewust gedeeld.
- Uitgaande berichten: duurzame bezorgregistratie/outbox met herhaalbeveiliging, pogingen en herstelbare fouten. Een aangeboden offerte blijft aangeboden als de mail mislukt; toon **Verzenden mislukt** met opnieuw-verzendenactie. Geen claim van ontvangst op basis van SMTP-acceptatie.
- Facturen: optionele unieke bronrelatie met geaccepteerde offerteversie en een gecontroleerde financiële initialisatie voor handmatige afspraken. Bij correcties de bestaande creditflow behouden.
- Geldbedragen in gehele centen, btw en afronding via gedeelde prijsfuncties. De server berekent totalen; clienttotalen zijn niet leidend.
- Nieuwe niet-destructieve migraties plus schema-pariteit in `supabase/init.sql`. Gebruik `init.sql` nooit als productie-upgrade.

Eigenaar-UI: voeg offertekaart en acties toe aan bestaande detailpanelen, plus `/editor/quotes` voor zoeken/filteren op klant, nummer, status en geldigheid. Hergebruik de gedeelde editor-shell, formulieren, meldingen en `docs/style-guide.md`.

Server: aparte offerte- en klantdossiermodules met gedeelde domeinfuncties voor editoracties en klant-API. Lees vóór Next.js-implementatie de relevante lokale handleiding in `node_modules/next/dist/docs/`, zoals AGENTS.md voorschrijft.

## Toegang en privacy

- Controleer eigenaarschap en entitlements server-side bij iedere eigenaaractie. RLS voor bedrijfsscheiding; samengestelde relaties/constraints voorkomen koppelingen tussen bedrijven.
- Klanten krijgen geen algemene tabeltoegang. Elk klantverzoek valideert de dossiergrant en controleert of offerte, versie, afspraak en PDF bij precies dat dossier horen.
- Link is een toegangssleutel: wie hem heeft kan het dossier zien. Voor accepteren/afwijzen: extra e-mailcode naar het bekende adres, kort geldig, beperkt aantal pogingen en gebonden aan dossier/versie/actie.
- Geen statuswijzigingen door GET of openen van e-mail; scanners mogen geen akkoord geven. Mutaties via beveiligde POST met herhaalbeveiliging en origin/CSRF-controles waar cookies worden gebruikt.
- Token na openen uitwisselen voor beperkte beveiligde sessie en naar een tokenvrije URL verwijzen. Geen tokens in analytics, auditlogs, referrers of externe embeds; `no-store`, `noindex` en strikte referrerinstelling.
- Verlopen/intrekken/heruitgeven moet ook bestaande sessies en PDF-toegang ongeldig maken. Herstel van toegang geeft geen informatie prijs over het bestaan van een klantadres.
- Private PDF-opslag; downloads alleen na autorisatie of met kort geldige, dossiergebonden links. Geen offertes in publieke websitecontent of gedeelde caches.
- Geen automatisch samenvoegen van dossiers op e-mailadres. Wijzigen van het klantadres vereist eigenaarcontrole en intrekken/heruitgeven van toegang.
- Bestaande `/booking/[token]`-links blijven werken. Deel presentatie en validatie waar passend, maar geef een oude boekingslink niet automatisch toegang tot extra dossierinformatie.
- Leg bewaartermijnen en afhandeling van verwijderen/archiveren vast, inclusief toegang, berichten, offertes en bestaande uitgegeven facturen. Voorkom onbedoeld verwijderen van documenthistorie.

## Implementatiechecklist en volgorde

### 1. Domein en database

- [x] Definitieve overgangen, klantprojectie en relaties vastleggen; huidige statusnamen behouden.
- [x] Migraties, indexes, constraints, RLS en transacties voor offerteversies en toegang bouwen.
- [x] Bestaande afspraken zonder aanvraag veilig kunnen koppelen; geen brede automatische backfill zonder controle.
- [x] Migraties en tweemaal bootstrap testen; bestaande aanvragen/boekingen blijven functioneren.

### 2. Offertes voor ondernemers

- [x] Offertelijst en concepteditor met klantgegevens, regels, btw, voorwaarden, geldigheid en preview.
- [x] Acties vanuit Aanvragen, Kalender en Reserveringen met dubbele-aanmaakbescherming.
- [x] Nummering, onveranderlijke versies, PDF en aanbieden/intrekken/vervangen implementeren.
- [x] Mail met klantlink en offerte-PDF, bezorgstatus en veilige retry.

### 3. Klantpagina en klantacties

- [x] Dossiergrant, sessie, vervallen/intrekken en toegang herstellen implementeren.
- [x] Mobiele klantpagina met voortgang, offerte, afspraak, gedeelde berichten en documenten.
- [x] Akkoord/afwijzen met e-mailcode, versiecontrole en bewijsregistratie.
- [x] Vragen van klanten in aanvrageninbox laten landen; interne notities strikt scheiden.
- [x] Instelling voor ontvangstbevestiging en bewuste klantmeldingen bouwen; storingen mogen opgeslagen aanvragen niet verliezen.

### 4. Planning en facturatie aansluiten

- [x] Akkoord tonen als opvolgactie; bestaande bevestigde afspraken behouden.
- [x] Nieuwe planning uitsluitend na servercontrole op beschikbaarheid, zonder dubbele reservering.
- [x] Conceptfactuur uit geaccepteerde offerte en gekoppelde afspraak maken.
- [x] Factuurfunctie uitbreiden voor handmatige afspraken inclusief financiële records, autorisatie en PDF-toegang.
- [x] Uitgegeven factuur op klantpagina tonen; bestaande correctie- en creditflow behouden.

### 5. Productbeleid en oplevering

- [ ] Offertebeheer, klanttoegang en facturatie opnemen in één entitlementbeleid. Tijdelijke gratis toegang respecteren; geen nieuwe prijs verzinnen. Toegang tot reeds gedeelde documenten bij abonnementwijziging expliciet vastleggen.
- [ ] UI, prijzenpagina/docs en server-/databasecontroles op dat beleid afstemmen.
- [ ] Nederlandse teksten en bestaande websitetalen toepassen; datums/tijdzones consistent tonen.
- [x] Operationele instructies voor mailfouten, ingetrokken links, verlopen offertes en factuurcorrecties schrijven.

Implementatieafwijkingen en vrijgavegrenzen staan in het runbook: offerte-PDFs worden atomair in de private database opgeslagen; nummers zijn globaal uniek; herstel verloopt via de ondernemer; wijzigen van afspraken op de dossierpagina gebeurt via een bericht. De onderstaande volledige acceptatiechecklist blijft open totdat deze op een gehoste testomgeving is doorlopen.

## Acceptatie en tests

- [ ] Offerteaanvraag verschijnt bij juiste bedrijf; klant kan uitsluitend het eigen dossier zien.
- [ ] Zowel online als handmatige afspraak kan een offerte krijgen zonder verlies of duplicatie van de afspraak.
- [ ] Opnieuw klikken/herladen/retry levert geen dubbele aanvraag, offerteversie, factuur of klantbeslissing op.
- [ ] Een aangeboden versie/PDF verandert niet wanneer bedrijfsgegevens, diensten of prijzen later wijzigen.
- [ ] Verlopen, ingetrokken, vervangen of reeds besloten versies kunnen niet alsnog worden geaccepteerd; gelijktijdige acties blijven consistent.
- [ ] Akkoord houdt geen onbevestigd tijdslot bezet en maakt geen automatische factuur. Afwijzen annuleert geen bevestigde afspraak.
- [ ] Token van dossier A kan geen gegevens/PDF/acties van dossier B benaderen, ook niet binnen hetzelfde bedrijf.
- [ ] Andere ondernemer, anonieme gebruiker, gewijzigde token, ingetrokken sessie en brute-force e-mailcodes worden geweigerd.
- [ ] Interne notities, sluitredenen, mailfouten en conceptdocumenten ontbreken ook in API-responses en HTML.
- [ ] PDF-/mailfout na opslaan is herstelbaar zonder nieuw offertenummer of verloren aanvraag.
- [ ] Klantvraag en eigenaarreactie verschijnen op de juiste plek; geen impliciete belofte van externe mailboxsynchronisatie.
- [ ] Oude boekingslinks, boekingen en facturen blijven bruikbaar zonder uitbreiding van toegang.
- [ ] Browserflow van aanvraag tot akkoord en conceptfactuur op mobiel (320/390 px) en desktop, met toetsenbord, foutmeldingen en loading states.
- [ ] Gerichte unit-, integratie-, RLS- en concurrerende-transactietests plus typecheck, lint en build. Lokale tests afzonderlijk rapporteren van hosted controles.

## Uitrol en aandachtspunten

1. Introduceer een featureflag voor nieuwe offerte-/dossieracties en pas eerst compatibele, niet-destructieve migraties toe op een geïsoleerde testomgeving.
2. Configureer private opslag, mail, token-/sessiebeheer en testontvangers. Gebruik geen productieklantgegevens voor acceptatietests.
3. Deploy serverfunctionaliteit en UI achter de flag; voer de volledige eigenaar- en klantflow uit met twee gescheiden bedrijven en testklanten.
4. Verifieer echte e-mailbezorging, PDF-downloads, intrekking en beschikbaarheidsconflicten op de gehoste testomgeving. Lokale broncode/tests bewijzen dit niet.
5. Productie-uitrol en klantmail pas als afzonderlijk geautoriseerde stap. Eerst beperkte activatie, daarna breder aanzetten.
6. Bij problemen nieuwe offerteacties via de flag stoppen, maar bestaande klantpagina's/documenten leesbaar houden. Behoud data en audit; geen destructieve rollback.

Belangrijkste risico's: onbedoelde toegang via doorgestuurde links, verwarring tussen offerteakkoord en afspraakbevestiging, dubbele verzending/beslissingen, overschrijven van geaccepteerde documenten en het te breed openstellen van bestaande facturatie. De toegangscontrole, versieovergangen en financiële initialisatie zijn daarom voorwaarden voor vrijgave.

De eerste complete oplevering omvat aanvragen én handmatige afspraken, offerteaanbod en akkoord, de beveiligde klantpagina en de aansluiting op conceptfacturatie. Een alleen zichtbare offerteknop of alleen een PDF-generator voldoet niet aan dit plan.
