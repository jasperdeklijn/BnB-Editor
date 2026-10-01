# Plan: vier vaste hoofdpagina’s in de editor

Datum: 1 oktober 2026. Status: de vier hoofdgroepen, tabs, editorbalk en kalenderkleuren zijn lokaal geïmplementeerd. Volledige ingelogde acceptatie met echte gegevens staat nog open.

## Volledige lokale oplevering

- [x] Eén centrale routeconfiguratie en vier vaste hoofdknoppen; de oude website-dropdown is verwijderd.
- [x] Klantzaken, Planning en Instellingen hebben gedeelde tabs op hun bestaande URL’s.
- [x] Eén gedeelde editorbalk voor desktop en mobiel: Ontwerpen beheren, Importeren, Preview, SEO & Analytics, FlexCheck en Publiceren.
- [x] Nieuw ontwerp, hernoemen met dialoog en verwijderen met de bestaande bevestiging zijn bereikbaar via Ontwerpen beheren.
- [x] FlexCheck staat direct naast Publiceren en krijgt de actieve website. Websitegebonden navigatie naar Domein en Recensies neemt die selectie eveneens mee.
- [x] De editortaal wordt per website bewaard; terugkeer gebruikt de bewaarde taal wanneer die nog bestaat.
- [x] Afspraak en verblijf hebben verschillende kleuren; blokkades en notities hebben een eigen presentatie. Statuslabels blijven afzonderlijk zichtbaar, inclusief mobiele kalenderindicatoren.
- [x] Formulierbescherming toegevoegd voor Bedrijf, Domein en Kalender; Diensten blokkeert navigatie tijdens opslaan en waarschuwt bij mislukte dienstwijzigingen.
- [x] Typecheck, lint zonder waarschuwingen, 52 gerichte tests (inclusief meertaligheid) en productiebuild met Node 24 geslaagd.
- [x] Echte navigatiecomponenten en menu’s met lokale voorbeelddata in de browser gecontroleerd: Planning/Reserveringen, Instellingen-tabs, importopties, naamdialoog en hernoemen. Geen browserfouten; geen horizontale paginascroll bij 320, 390, 768, 1024 en 1440 px.
- [ ] Volledige ingelogde flow, echte gegevensmutaties, publicatievoorwaarden, importverwerking en hosted integraties controleren. De componentpreview voerde geen backendacties uit en is na controle verwijderd.

De onderstaande implementatiebeschrijving blijft de ontwerpachtergrond. Openstaande acceptatiepunten beschrijven controles waarvoor nog geen volledige praktijkproef is uitgevoerd.

## Eerste oplevering: Klantzaken

- [x] Vaste knop **Klantzaken** naast de bestaande website-dropdown; opent Aanvragen.
- [x] Gedeelde navigatie met **Aanvragen · Offertes · Recensies**, inclusief actieve tab en mobiele indeling.
- [x] De drie afzonderlijke klantzakenlinks uit de oude dropdown verwijderd.
- [x] Bestaande routes, detailparameters en aanvraag-naar-offerteactie behouden.
- [x] Navigatie vanuit de gedeelde header wacht op openstaande editor-opslagacties; fouten stoppen de navigatie.
- [x] Offerte-invoer krijgt een waarschuwing bij het verlaten via de tabs of andere editorlinks; navigatie wacht op een lopende offerteactie.
- [x] Typecheck, lint op gewijzigde bestanden en 17 bestaande editor-/aanvraag-/offertedocumenttests geslaagd.
- [x] Productiebuild geslaagd met de meegeleverde Node 24-runtime. De standaard Node 20-runtime faalt op bestaande sharp-syntax.
- [x] De gerenderde navigatie lokaal gecontroleerd: drie tabroutes en actieve aanduidingen, geen klantzakentabs op andere routes, desktop en 320 px.
- [ ] Ingelogde volledige browserflow met echte aanvragen, offertes en recensies controleren. De lokale visuele controle rendert uitsluitend de navigatie, zonder klantgegevens of backendacties.

Klantzaken was de eerste deeloplevering; de volledige lokale oplevering hierboven bouwt daarop voort.

## Doel en indeling

Vervang de dropdown **Mijn website** door vier vaste navigatieknoppen: **Website · Klantzaken · Planning · Instellingen**. Toon onder de hoofdnavigatie alleen de tabs die bij de gekozen groep horen. Website opent direct de editor en houdt de ruimte gericht op ontwerpen.

| Hoofdpagina | Opent standaard | Tabs of acties | Bestaande routes |
| --- | --- | --- | --- |
| Website | Website-editor | Afbeeldingen in linkerzijbalk; Importeren en FlexCheck als acties | `/editor`, `/editor/images`, `/editor/import`, `/editor/flexstart`, `/editor/flexcheck` |
| Klantzaken | Aanvragen | Aanvragen · Offertes · Recensies | `/editor/requests`, `/editor/quotes`, `/editor/reviews` |
| Planning | Kalender | Kalender · Reserveringen | `/editor/calendar`, `/editor/reservations` |
| Instellingen | Bedrijf | Bedrijf · Diensten · Domein | `/editor/business`, `/editor/services`, `/editor/domains` |

De vier hoofdpagina’s zijn groepen in de interface. De bestaande routes blijven bruikbaar, inclusief queryparameters voor geselecteerde offertes, filters en detailweergaven. Zo kan een tab rechtstreeks worden geopend, vernieuwd of gedeeld en werkt browser-terug vanzelf.

Profiel, facturering en uitloggen blijven in het accountmenu. SEO & Analytics blijft bereikbaar binnen Website via de bestaande ontwerp-/website-instellingen; `/editor/seo` krijgt Website als actieve hoofdgroep. Hiervoor komt geen vijfde navigatieknop.

## Gecontroleerde uitgangssituatie

- [x] `components/editor/editor-header.tsx` bevat de huidige dropdown met losse links naar websitebeheer, klantzaken, planning en instellingen.
- [x] `components/editor/editor-layout-client.tsx` verzorgt de gedeelde header, paginatitels en editorcontext.
- [x] `components/editor/editor-page-shell.tsx` levert de gedeelde pagina-opmaak; deze blijft het uitgangspunt naast `docs/style-guide.md`.
- [x] `components/editor/editor-client.tsx` bevat de websitekiezer, JSON-import, website-overname, aanmaken/verwijderen, naam, talen, preview en publicatieacties, met afzonderlijke desktop- en mobiele opmaak.
- [x] `components/editor/sections-selector.tsx` bevat de bestaande afbeeldingenzijbalk en de link naar afbeeldingenbeheer.
- [x] Offertebeheer bestaat in `app/editor/quotes/page.tsx`. Aanvragen gebruiken `components/quotes/quote-entry-actions.tsx` voor **Offerte maken / openen**.
- [x] `components/calendar/calendar-client.tsx` ondersteunt afspraken, boekingen en blokkades. Kalenderitems gebruiken nu kleur op basis van status.
- [x] FlexCheck accepteert `websiteId` in de URL. Zonder deze parameter kan de eerste website worden geselecteerd.
- [x] De editor wacht binnen zijn eigen container bij navigatie op openstaande sectie-opslagacties. De gedeelde header staat buiten die container; de nieuwe hoofdnavigatie moet daarom expliciet dezelfde bescherming krijgen.

Deze vinkjes betekenen broncode gecontroleerd. Ze betekenen geen browseracceptatie of bevestiging van hosted offertefuncties. Het bestaande offerteplan en runbook vermelden nog openstaande hosted acceptatie en productieactivatie.

## Gewenste bediening

### Vaste navigatie en tabs

- De vier knoppen blijven op alle editorpagina’s zichtbaar. De actieve groep krijgt de bestaande primaire stijl en een toegankelijke actieve aanduiding.
- Klikken op een hoofdgroep opent altijd de hierboven genoemde standaardpagina.
- De tabs staan direct onder de hoofdnavigatie en blijven op dezelfde plaats bij wisselen binnen een groep. De actieve tab volgt de URL.
- Website krijgt geen extra tabrij voor Editor/Afbeeldingen/Import: afbeeldingen blijven links en importeren/controleren zijn gerichte acties.
- Op smalle schermen krijgt de hoofdnavigatie een eigen rij; bij 320 px mogen de vier knoppen in twee rijen staan. Alle vier labels blijven zichtbaar. Geen dropdown of horizontale paginascroll.
- Tabs passen op een eigen rij met voldoende aanraakruimte en zichtbare toetsenbordfocus.
- Eén duidelijke paginatitel in de inhoud. Voorkom dubbele titels, dubbele tabrijen en een overbodige knop Terug naar editor naast Website.

### Rustigere editorbalk

Voorgestelde volgorde op desktop:

| Links: ontwerp | Midden: bouwen | Rechts: controleren en publiceren |
| --- | --- | --- |
| Websitekiezer · Ontwerpen beheren | Taal · Ongedaan maken/opnieuw · Importeren | Preview · FlexCheck · Publiceren |

- **Ontwerpen beheren** staat direct bij de websitekiezer. Het menu bevat **Nieuw ontwerp**, **Naam wijzigen** en **Ontwerp verwijderen**. De losse plus en prullenbak verdwijnen uit de bovenbalk.
- Een ontwerp gebruikt het huidige website-record. De nieuwe benaming verandert het datamodel en de gevolgen van verwijderen niet.
- Verwijderen behoudt de bestaande bevestiging, inclusief waarschuwing voor secties, vertalingen en domeinkoppelingen. De huidige blokkering tijdens aanmaken, opslaan en verwijderen blijft gelden.
- **Importeren** bevat **JSON importeren** en **Bestaande website overnemen**. Hergebruik de bestaande importflow en FlexStart-route; behoud validatie, preview, eigenaarscontrole en bestaande goedkeuringen.
- **FlexCheck** staat onmiddellijk naast **Publiceren** en opent `/editor/flexcheck?websiteId=<actieve-website>`. Terug naar de editor herstelt de juiste website en taal.
- Gebruik **Publiceren** als herkenbaar actielabel; toon bestaand live/conceptgedrag en blokkades in de begeleidende status of publicatiedialoog. Verander de voorwaarden om live te zetten niet.
- Bewaar preview, apparaatkeuze, taalbeheer en opslagstatus. Toon elke bediening eenmaal en laat de balk op tablet over meerdere rijen passen waar nodig.
- Mobiel gebruikt dezelfde acties en volgorde: websitekiezer met Ontwerpen beheren, compacte bouwacties, en FlexCheck naast Publiceren. Afbeeldingen blijven bereikbaar via het bestaande mobiele paneel.

### Klantzaken

- Aanvragen blijft de eerste tab, met de bestaande lijst, filters en detailweergave.
- In een aanvraag blijft **Offerte maken / openen** beschikbaar. Na succes opent de Offertes-tab met de gemaakte of bestaande offerte geselecteerd.
- De oorspronkelijke aanvraag blijft bestaan en gekoppeld. Herhaald klikken mag geen dubbele offerte maken; de bestaande bescherming wordt hergebruikt.
- Offertes en Recensies behouden hun huidige functies, foutmeldingen en lege toestanden. Deze wijziging maakt geen nieuwe offerteflow nodig.
- Filters, geselecteerde details en niet-opgeslagen offertewijzigingen krijgen bewust gedrag bij tabwisselen: behoud waar mogelijk, opslaan of waarschuwen vóór verlies van invoer.

### Planning

- Hergebruik de bestaande kalender als één kalender voor afspraken en verblijven. Reserveringen blijft een tweede tab met het bestaande overzicht en detailacties.
- Maak een gedeelde presentatie op basis van het bestaande itemtype: afspraak in groen, verblijf in een tweede rustige, contrasterende kleur; blokkades neutraal met een herkenbaar patroon of icoon.
- Toon altijd het type als tekst of icoon naast kleur en voeg een legenda toe. Status blijft apart herkenbaar met een tekstbadge; behoud de bestaande waarschuwings- en conflictindicaties.
- Pas dit consequent toe in maand-, week-, dag- en mobiele weergaven, ook voor meerdaagse verblijven. Boekingsbron, beschikbaarheid, tijdzone en statusovergangen blijven leidend.
- De tab Reserveringen mag dezelfde kalendergegevens gebruiken, maar houdt zijn huidige selectie van reserveringen; voeg niet stilzwijgend alle afspraken aan dat overzicht toe.

### Instellingen

- Bedrijf, Diensten en Domein worden tabs rond de bestaande pagina’s en formulieren.
- De tab heet **Diensten**, zoals voorgesteld. De inhoud behoudt categoriepassende termen voor bijvoorbeeld verblijven of aanbod.
- Bewaar de geselecteerde bedrijfscontext. Domeininstellingen behouden daarnaast de juiste websitecontext; wisselen van groep mag geen instellingen voor een ander ontwerp tonen.
- Handhaaf bestaande opslagknoppen, validatie en meldingen. Bewaak niet-opgeslagen formulierwijzigingen bij wisselen van tab of hoofdgroep.

## Technische aanpak

1. Maak één centrale navigatieconfiguratie, bijvoorbeeld `lib/editor-navigation.ts`, met hoofdgroepen, standaardroutes, tabs en ondersteunende routes. Laat header, tabrij en actieve aanduidingen dezelfde configuratie gebruiken. Gebruik expliciete routeherkenning; onbekende routes krijgen niet willekeurig een actieve groep.
2. Vervang in `EditorHeader` de website-dropdown door een gedeelde hoofdnavigatie. Laat het accountmenu staan. Verwijder uitsluitend navigatiecode die hierdoor ongebruikt wordt.
3. Voeg een gedeelde navigatie voor de tabs toe in `EditorLayoutClient`, boven de pagina-inhoud. Gebruik echte links met actieve aanduiding voor deze routewissels; monteer niet alle formulieren en datalijsten tegelijk in verborgen tabpanelen.
4. Maak binnen de bestaande editorcontext een gedeeld mechanisme om vóór navigatie openstaande opslagacties af te handelen. Zowel hoofdnavigatie, tabs, Importeren als FlexCheck gebruiken dit. Een opslagfout houdt de gebruiker bij de huidige invoer en toont een herstelbare melding. Verwijder geregistreerde handlers bij het verlaten van een pagina.
5. Verplaats de bestaande handlers voor ontwerpen en importeren naar de nieuwe menupresentatie in `EditorClient`. Deel de bediening tussen desktop en mobiel zodat labels, blokkeringen en acties gelijk blijven.
6. Bewaar de actieve website/taal en relevante routeparameters bij ondersteunende Website-routes. Gebruik de bestaande expliciete `websiteId` voor FlexCheck en controleer herstel bij terugkeer. Bedrijfsscope en autorisatie worden niet afgeleid uit alleen de actieve navigatiegroep.
7. Voeg de kalenderkleuren toe via een gedeelde presentatiefunctie die itemtype en status apart behandelt. Hergebruik die voor kalenderweergaven en legenda.
8. Lees vóór implementatie de relevante lokale Next.js-documentatie onder `node_modules/next/dist/docs/`, zoals AGENTS.md voorschrijft. Het lokale hoofdstuk over layouts en pagina’s is bij het opstellen van dit plan geraadpleegd.

Voor de navigatieherindeling is geen databasewijziging voorzien. Eventuele tekortkomingen in offerteactivatie of bestaande opslagflows worden afzonderlijk vastgesteld en niet als voltooide navigatiewijziging gepresenteerd.

## Uitvoeringsvolgorde en checklist

### 1. Gedeelde navigatie

- [x] Centrale routeconfiguratie en actieve groepen/tabs toevoegen.
- [x] Vier vaste knoppen en tabrijen in de gedeelde layout plaatsen.
- [ ] Alle bestaande routes, detailparameters en accountlinks controleren.
- [x] Opslagbescherming voor navigatie uit de header en tabs aansluiten.

### 2. Websitewerkruimte

- [x] Ontwerpen beheren bij de websitekiezer plaatsen en losse plus/prullenbak verwijderen.
- [x] JSON-import en website-overname onder Importeren samenbrengen.
- [x] FlexCheck naast Publiceren plaatsen en actieve website doorgeven.
- [x] Desktop, tablet, mobiel, preview en vertaalmodus op dezelfde gedeelde balk aansluiten; volledige ingelogde acceptatie blijft open.
- [x] Afbeeldingen, taal, ontwerpnaam, undo/redo en SEO bereikbaar houden.

### 3. Klantzaken, Planning en Instellingen

- [x] Bestaande pagina’s met tabs in de juiste groep tonen.
- [ ] Aanvraag naar geselecteerde offerte controleren, inclusief opnieuw klikken.
- [x] Kalenderkleuren per type, legenda en afzonderlijke statuslabels invoeren.
- [ ] Bedrijfs-/websitecontext en invoerbehoud bij wisselen controleren.

### 4. Acceptatie en oplevering

- [ ] Hoofdknoppen openen de juiste standaardpagina; iedere ondersteunende route markeert de juiste groep.
- [ ] Directe links, herladen, browser-terug en vooruit behouden de juiste tab en detailcontext.
- [ ] Bij pending saves wordt vóór navigatie opgeslagen; bij opslagfout gaan editorwijzigingen niet verloren. Controleer ook formulierinvoer in Instellingen en Offertes.
- [ ] Wisselen tussen twee ontwerpen en vervolgens FlexCheck opent telkens het juiste ontwerp; terugkeer behoudt website en taal.
- [ ] Nieuw ontwerp, hernoemen, verwijderen met bevestiging en beide importopties werken vanuit hun nieuwe plek.
- [ ] Aanvraag blijft gekoppeld na Offerte maken / openen; navigatie maakt geen dubbele offerte en voert geen automatische publicatie, verzending of facturatie uit.
- [ ] Afspraken, verblijven en blokkades zijn in alle kalenderweergaven herkenbaar; status en conflicten blijven leesbaar zonder alleen op kleur te vertrouwen.
- [ ] Controleer 320, 390, 768, 1024 en 1440 px: vier hoofdlabels zichtbaar, geen horizontale paginascroll, geen verborgen acties en voldoende canvasruimte.
- [ ] Toetsenbord, focus, actieve aanduidingen, menu sluiten met Escape en klik buiten menu controleren.
- [ ] Gerichte navigatie-/opslag- en kalenderregressies uitvoeren, plus bestaande passende tests voor editor-save, editor-reliability, inquiries, reservations en import.
- [ ] Typecheck, lint en build uitvoeren; daarna de volledige gebruikersroutes in een ingelogde browser controleren.
- [ ] Lokale resultaten en hosted checks afzonderlijk rapporteren. Offertebeschikbaarheid blijft afhankelijk van bestaande migraties en activatie; zie `docs/offertes-en-klantpagina-runbook.md`.

## Dingen om op te letten

- De header staat buiten de huidige opslagbescherming van de editor. Alleen knoppen vervangen is daarom onvoldoende om invoerverlies te voorkomen.
- De combinatie van vaste hoofdnavigatie, tabs en editorbalk mag vooral op mobiel niet te veel werkruimte innemen. Houd de inhoudstitel compact en voorkom dubbele balken.
- Ontwerp verwijderen verwijdert momenteel meer dan alleen een visueel ontwerp. De nieuwe menunaam mag die gevolgen niet verbergen.
- Kalenderkleuren op type moeten bestaande statuskleuren niet onbegrijpelijk maken. Type en status krijgen ieder hun eigen zichtbare aanduiding.
- FlexCheck, domeinen, import en klantzaken hebben verschillende scopes. Bewaar expliciet de juiste website en het juiste bedrijf bij navigatie.
- Onopgeslagen formulierinvoer en queryparameters verdienen dezelfde aandacht als de automatisch opgeslagen editorsecties.

Oplevering: vier herkenbare hoofdingangen, samenhangende tabs en een rustigere editorbalk, met behoud van de huidige functies en werkende detailroutes.
