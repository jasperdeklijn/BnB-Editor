# Partneraccount — implementatieplan

Datum: 3 november 2026

Status: voorstel; functionaliteit en commerciële voorwaarden zijn nog niet geïmplementeerd.

## 1. Doel en uitgangspunt

Maak van Partneraccount een reselleromgeving voor webbouwers, marketingbureaus en zelfstandigen die FlexPagina-websites voor hun klanten verkopen en onderhouden. De partner krijgt één overzicht voor meerdere klanten en opent vanuit daar de bestaande editor in de juiste klantcontext.

**Voorgesteld model:** de klant blijft eigenaar van het account, bedrijfsprofiel, de websites en domeinkoppelingen. De partner krijgt expliciet verleende beheertoegang. De commerciële relatie bepaalt wie betaalt, maar geeft op zichzelf geen toegang tot klantgegevens.

Voorbeeld: een bureau beheert tien klanten. Elke klant heeft een eigen account en website. Het bureau wisselt tussen deze klanten zonder opnieuw in te loggen. Een klant kan de samenwerking beëindigen en met dezelfde website zelfstandig verdergaan.

## 2. Aansluiting op de bestaande applicatie

De volgende uitgangspunten zijn gecontroleerd in de lokale broncode; dit is geen verificatie van de productiedatabase.

| Bestaand onderdeel | Gevolg voor Partneraccount |
| --- | --- |
| `businesses.user_id` en `websites.user_id` bepalen eigendom; de website verwijst met bedrijfs-ID én eigenaar naar het bedrijfsprofiel | Eigendom behouden en een aparte partnerrelatie toevoegen |
| `lib/editor-bootstrap.ts` selecteert het eerste eigen bedrijfsprofiel | Een expliciete, gecontroleerde klantcontext toevoegen voor partnerbeheer |
| Editorhelpers, API-routes en databasepolicies controleren vaak rechtstreeks `user_id = ingelogde gebruiker` | Autorisatie moet door de hele beheerketen worden uitgebreid; een extra dashboard alleen is onvoldoende |
| `lib/subscriptions.ts` resolveert één abonnement per gebruiker | In versie 1 blijven rechten gekoppeld aan de klanteigenaar, nooit aan het persoonlijke abonnement van de partner |
| De publicatieflow en databasefunctie beperken publicatie tot één live website per eigenaar | Een partner beheert meerdere afzonderlijke klanteigenaren; dit plan verruimt die publicatielimiet niet |
| Afbeeldingsmetadata en opslagpaden zijn aan de gebruiker gekoppeld | Partneruploads en mediatoegang moeten expliciet aan de betreffende klantwebsite worden gekoppeld |
| Adminbeheer, auditlogging en FlexStart bestaan al | Gedeelde bouwstenen hergebruiken, maar partnerbevoegdheden afzonderlijk controleren |
| Gold, Booking & Facturatie en meertaligheid zijn tijdelijk gratis; betaalde aankopen zijn nog uitgeschakeld | Een beheerpilot kan eerder starten dan automatische resellerfacturatie |

Relevante bronnen: [prijzen](pricing.md), [tijdelijke Gold-toegang](temporary-gold-access.md), [FlexStart](flexstart.md), [adminoverzicht](admin-overview.md), [editorbootstrap](../lib/editor-bootstrap.ts), [abonnementen](../lib/subscriptions.ts), [publicatie-API](../app/api/websites/publish/route.ts) en [databaseschema](../supabase/init.sql).

## 3. Scope en fasering

### Versie 1: partnerbeheer en commerciële pilot

- FlexPagina-admin activeert een partnerorganisatie met één partnereigenaar.
- Partnerdashboard met klanten, websites, publicatiestatus en openstaande uitnodigingen.
- Nieuwe klant uitnodigen of een bestaande klant om toegang vragen.
- Klant geeft toegang tot één specifiek bedrijfsprofiel en de websites daaronder.
- Websites maken, importeren en bewerken met de bestaande editor en templates.
- Publiceren en domeinen beheren als de klant deze aanvullende bevoegdheden heeft verleend.
- Zichtbare klantcontext, activiteitenhistorie en direct intrekbare toegang.
- Instelbaar maximum voor actieve klantrelaties en openstaande uitnodigingen.
- Gebruiksoverzicht voor een eventuele handmatige resellerafrekening tijdens de pilot.
- Klant kan de samenwerking beëindigen zonder websiteverhuizing of accountoverdracht.

Voor de pilot geldt maximaal één actieve partnerorganisatie per bedrijfsprofiel. Een partner kan meerdere klanten beheren. Binnen één klanteigenaar blijft de bestaande limiet van één live website gelden, ook als die eigenaar meerdere bedrijfsprofielen heeft.

### Vervolgreleases

- Meerdere partnermedewerkers met rollen en toewijzing per klant.
- Automatische resellerabonnementen, inkooptarieven en verzamelfacturen.
- Partnerbranding van dashboard, uitnodigingen en rapportages.
- Herbruikbare partnertemplates en veilige kopieën van ontwerpen tussen klanten.
- Automatische maandrapportages en uitgebreidere gebruiksstatistieken.
- Volledig whitelabel aanbod of een eigen login-domein, na een apart ontwerp.

Aanvragen, offertes, bezoekersgegevens, boekingen en klantfacturen zijn in versie 1 afgeschermd voor partners. Websitebeheer geeft daar niet automatisch toegang toe. Eventueel operationeel beheer vraagt een latere, afzonderlijke bevoegdheid.

## 4. Gebruikersstromen

### A. Partner activeren

1. Platformadmin maakt een partnerorganisatie aan of keurt een aanvraag goed.
2. Leg bedrijfsnaam, contactpersoon, factuurgegevens, klantlimiet en partnerstatus vast.
3. Koppel de partnereigenaar aan een bestaand of nieuw, geverifieerd FlexPagina-account.
4. Leg de geaccepteerde versie van de partnerafspraken vast.
5. Toon in de navigatie de keuze tussen de eigen editor en de partneromgeving.

Zelfregistratie levert geen partnerrechten op. Een partner is geen platformadmin.

### B. Nieuwe klant toevoegen

1. Partner maakt een klantkaart met bedrijfsnaam en contact-e-mailadres.
2. Partner verstuurt een uitnodiging met een duidelijke uitleg van de gevraagde toegang.
3. Klant registreert zich of logt in en verifieert het uitgenodigde e-mailadres.
4. Klant rondt de noodzakelijke onboarding af, kiest of maakt een eigen bedrijfsprofiel en bevestigt de bevoegdheden.
5. Pas na acceptatie wordt de beheerrelatie actief en kan de partner een klantwebsite maken.

Een klantkaart zonder acceptatie is alleen een prospect. Maak daarvoor geen fictieve Auth-gebruiker en geen klantwebsite onder het persoonlijke account van de partner. Eventuele demo's vóór acceptatie zijn een afzonderlijke vervolgfase.

### C. Bestaande klant koppelen

1. Partner stuurt een toegangsverzoek naar het klantadres.
2. Het antwoord aan de partner onthult niet of dat e-mailadres al een account heeft.
3. De ingelogde, geverifieerde klant selecteert een bedrijfsprofiel waarvan die eigenaar is.
4. De klant bevestigt de reikwijdte; een bestaande partnerrelatie wordt nooit stilzwijgend vervangen.
5. Partner ziet uitsluitend het gekoppelde bedrijfsprofiel en de websites daaronder.

### D. Website beheren en opleveren

1. Partner selecteert een klant en daarna een website.
2. De editor toont permanent: **Je beheert [klantnaam] als [partnernaam]** met een teruglink.
3. Opslaan en preview gebruiken de bestaande concept- en liveversies.
4. Publicatie en domeinwijzigingen vragen hun eigen bevoegdheid; zonder die bevoegdheid voert de klant de actie zelf uit.
5. Bestaande abonnementslimieten, versiecontroles en FlexStart-klantgoedkeuring/FlexReview blijven gelden.
6. De activiteitenhistorie registreert de echte partnergebruiker als uitvoerder.

### E. Samenwerking beëindigen

Klant kan de toegang direct intrekken; partner kan de samenwerking zelf beëindigen. De eerstvolgende serveractie en databasebewerking moeten worden geweigerd, ook vanuit een al geopende editor. Een mutatie en een gelijktijdige intrekking worden transactioneel geordend.

Account, abonnement, domeinkoppelingen, bestanden en live website blijven bij de klant. Openstaande uitnodigingen voor dezelfde relatie worden ingetrokken. Een eventuele resellerbetaalafspraak wordt apart afgehandeld en maakt intrekking van beheertoegang niet onmogelijk.

## 5. Rechtenmodel

| Handeling | Klanteigenaar | Partner, actieve relatie | FlexPagina-admin |
| --- | --- | --- | --- |
| Eigen website en concept bewerken | Ja | Ja, binnen gekoppeld bedrijfsprofiel | Volgens bestaande adminflow |
| Bedrijfsinhoud en website-SEO wijzigen | Ja | Ja | Volgens bestaande adminflow |
| Website publiceren/depubliceren | Ja | Alleen met `can_publish` | Volgens bestaande adminflow |
| Domein koppelen, wijzigen of loskoppelen | Ja | Alleen met `can_manage_domains` | Volgens bestaande adminflow |
| Aanvragen, boekingen en klantfacturen bekijken | Ja | Nee in versie 1 | Volgens bestaande adminflow |
| Wachtwoord, e-mailadres of accounteigenaar wijzigen | Ja | Nee | Volgens bestaande accountprocedure |
| Klantaccount, bedrijfsprofiel of website verwijderen | Ja, met bestaande controles | Nee in versie 1 | Volgens bestaande adminflow |
| Partnerrelatie beëindigen | Ja | Ja, voor eigen relatie | Ja |
| Partner activeren, blokkeren of limieten aanpassen | Nee | Nee | Ja |
| Andere klanten, adminmailbox of platforminstellingen bekijken | Nee | Nee | Volgens bestaande adminrechten |

Standaard geeft acceptatie bewerktoegang; publiceren en domeinbeheer staan uit totdat de klant ze apart inschakelt. Een wijziging van bevoegdheden wordt gelogd. De eigenaar behoudt altijd toegang tot de eigen gegevens.

## 6. Voorgesteld gegevensmodel

Onderstaande namen zijn ontwerpvoorstellen. Voeg tabellen additief toe; bestaande eigenaren en abonnementen worden niet herschreven.

| Tabel | Belangrijkste inhoud en regels |
| --- | --- |
| `partner_organizations` | ID, bedrijfsnaam, contact- en factuurgegevens, status `pending/active/suspended/closed`, klantlimiet, uitnodigingslimiet, afsprakenversie en acceptatiemoment |
| `partner_memberships` | Partner-ID, gebruiker-ID, rol en status; versie 1 heeft één actieve `owner`. Alleen bevoegde platformacties kunnen lidmaatschap wijzigen |
| `partner_customers` | Partner-ID, klantnaam, gekoppeld `business_id`, status `prospect/active/ended`, bevoegdheden, bevestigende eigenaar, activatie- en eindmoment; prospect heeft nog geen bedrijfs-ID |
| `partner_invitations` | Relatie-ID, doeladres, hash van een eenmalig token, vervaldatum, geaccepteerd/ingetrokken moment en verzendstatus; token zelf nooit opslaan of loggen |
| `website_image_links` | Expliciete koppeling tussen website en klantafbeelding voor partnerbeheer; voorkom toegang tot de volledige persoonlijke mediabibliotheek van de eigenaar |
| Bestaande `audit_logs` uitbreiden | Actie, echte uitvoerder, partner-ID, klantrelatie, bedrijf, website en gewijzigde bevoegdheden; gevoelige inhoud en uitnodigingstokens uitsluiten |

Aanvullende regels:

- Eén actieve partnerrelatie per bedrijfsprofiel via een databaseconstraint/index.
- Unieke lidmaatschappen per partner/gebruiker en foreign keys op alle relaties.
- Activatie controleert atomair de actuele eigenaar, partnerstatus en klantlimiet. Gelijktijdige acceptaties kunnen de limiet niet overschrijden.
- `businesses.user_id` blijft de bron voor eigendom; eventuele opgeslagen eigenaarssnapshots verlenen geen rechten.
- Een prospect kan alleen via geverifieerde acceptatie aan een bedrijfsprofiel worden gekoppeld. Partner kan die koppeling niet vrij wijzigen.
- Indexen voor partner/status, bedrijfsprofiel, lidmaatschap en uitnodigingsvervaldatum; lijsten server-side pagineren.
- Auditregistratie van toegang verlenen, wijzigen en intrekken is onderdeel van de transactie. Alleen de bestaande best-effort logger gebruiken is hiervoor onvoldoende.
- Bewaartermijnen voor onbeantwoorde uitnodigingen, prospectgegevens en auditgegevens vóór de pilot vastleggen en opruiming automatiseren.

## 7. Technische aanpak

### Gedeelde autorisatie en klantcontext

Maak een servermodule, bijvoorbeeld `lib/partners/access.ts`, die voor elke actie de ingelogde gebruiker, actieve partner, lidmaatschap, klantrelatie, bedrijfsprofiel, website en benodigde bevoegdheid controleert.

Een routeparameter of cookie kiest alleen de gewenste context. De server bepaalt of de gebruiker die context mag openen. Bewaar de echte uitvoerder afzonderlijk van de klanteigenaar; gebruik geen impersonatie en geef nooit een klantsessie aan de partner.

Breid de bestaande editorbootstrap en bedrijfshelpers uit met expliciete context. Een partnerroute mag niet terugvallen op het eerste eigen bedrijfsprofiel. Onderzoek alle directe browserqueries, Server Actions, Route Handlers en databasefuncties die nu eigendom veronderstellen.

### Database, bestanden en cache

- Behoud bestaande eigenaarpolicies en voeg gerichte partnerpolicies toe voor de toegestane gegevens en acties.
- Controleer bij updates zowel bestaande als nieuwe waarden. Partner kan eigenaar, bedrijfs-ID, relatie of bevoegdheden niet via een directe databaseaanroep wijzigen.
- Bescherm ook onderliggende pagina's, secties, vertalingen, diensten, formulierinstellingen en domeinen; afgeschermde aanvraag- en boekingstabellen blijven eigenaar-only.
- Breid publicatiecontroles en de promotiefunctie samen uit. Controleer de werkelijke actor en partnerrechten, maar gebruik klanteigenaar en diens abonnement voor limieten en publicatierechten.
- Controleer partnerstatus en relatie in de database; een oud JWT of een open tabblad mag ingetrokken rechten niet verlengen.
- Pas afbeeldingsmetadata én storagepolicies aan. Partneruploads krijgen gecontroleerd de klantwebsite als bestemming; verwijdering mag geen beeld wissen dat nog elders wordt gebruikt.
- Geef alleen toegang tot expliciet gekoppelde media. Een partner mag geen andere afbeeldingen van dezelfde eigenaar doorzoeken.
- Gebruik service-role uitsluitend op de server na volledige autorisatie; geen algemene omweg om RLS-fouten op te lossen.
- Scheid caches per gebruiker en klantcontext. Wis lokale editorstate bij klantwissel en laat vertraagde autosaves hun oorspronkelijke website-ID behouden.
- Sla rollen niet op in door gebruikers wijzigbare metadata. Geef minimaal benodigde velden door aan de interface.

### Uitnodigingen en fouten

Voorgestelde geldigheid: zeven dagen. Opnieuw versturen trekt het vorige token in. Acceptatie is eenmalig en transactioneel; dubbel klikken levert hetzelfde resultaat op. Sla tokens gehasht op, beperk versturen en accepteren, en toon duidelijke verlopen/ingetrokken toestanden.

Herbruik bestaande mailinfrastructuur met een afzonderlijke uitnodigingstemplate. Een mislukte mail activeert geen relatie; de partner kan opnieuw proberen. Toon bij onbevoegde resource-ID's geen informatie over andere klanten.

## 8. Schermen en routes

| Voorgestelde route | Inhoud |
| --- | --- |
| `/partner` | Klantaantallen, live websites, open uitnodigingen en aandachtspunten |
| `/partner/klanten` | Zoekbare, gepagineerde klantenlijst met statusfilters |
| `/partner/klanten/[customerId]` | Relatie, websites, bevoegdheden, uitnodigingsstatus en activiteit |
| `/partner/klanten/[customerId]/websites/[websiteId]` | Bestaande editorcomponenten met gevalideerde klantcontext |
| `/partner/instellingen` | Partnerprofiel, contactgegevens, limieten en gebruiksoverzicht |
| `/partner/uitnodiging` | Token controleren, inloggen/registreren en toegang bevestigen; openen alleen activeert niets |
| `/editor/partner` | Klant ziet de partner, beheert bevoegdheden en trekt toegang in |
| `/admin/partners` | Partnerorganisaties activeren/blokkeren, limieten en relaties controleren |

Bouw gedeelde editorcomponenten in plaats van een kopie van de editor. Ondersteun mobiel, toetsenbordbediening, lege lijsten, laden, ontbrekende rechten en fouten. Partners met uitsluitend een partnerrol moeten hun dashboard kunnen openen zonder onboarding voor een fictief eigen klantbedrijf.

## 9. Resellermodel en facturatie

**Voorgesteld verdienmodel:** de partner verkoopt een eigen pakket aan de eindklant, met bijvoorbeeld websitebouw, hosting en onderhoud. FlexPagina rekent aan de partner een overeengekomen inkooptarief per actieve klantwebsite. Bedragen, staffels, minimumbedragen en brandingrechten zijn nog te bepalen.

Houd twee afzonderlijke zaken bij: functionele rechten van de klantwebsite en de commerciële afspraak over wie betaalt. Partnerstatus mag niet automatisch alle klanten Gold geven. Een limiet op partnerklanten is ook iets anders dan een limiet op gepubliceerde pagina's.

### Pilot zonder automatische checkout

- Start desgewenst met een gratis beheerpilot onder de huidige tijdelijke toegang.
- Een betaalde pilot vereist eerst vastgelegde tarieven, ingangsdatum, betaalverantwoordelijke en afspraken over beëindiging.
- Lever een controleerbare gebruiksexport per periode met partner, klantrelatie, website en actieve periode voor handmatige afrekening.
- Bewaar historie van activatie en beëindiging; een actuele telling alleen is onvoldoende om een vorige factuur te reconstrueren.
- Gebruik bestaande abonnementsrecords ongewijzigd; voorkom dubbele afrekening met een eventueel rechtstreeks klantabonnement.

### Automatische resellerfacturatie als aparte release

Ontwerp eerst een billingaccount voor de partner en een expliciete koppeling naar de klantabonnementen. Leg vast hoe pakketwijzigingen, naar rato berekenen, belasting, betalingsachterstand, credits en overstappen naar directe betaling werken. Maak verwerking van betaalgebeurtenissen idempotent en reconciliatie controleerbaar.

Bij beëindiging van beheer moet een betaalrelatie tijdelijk kunnen doorlopen tot het afgesproken einde of expliciet worden overgedragen. Een partnerblokkade trekt beheerrechten in, maar haalt niet automatisch klantwebsites offline. Commerciële blokkades en gevolgen voor publicatie vragen een afzonderlijk vastgesteld beleid.

## 10. Uitvoerbare bouwfasen

### Fase 0 — productafspraken en inventarisatie

- [ ] Scope, eigendom, recht op beëindigen en één actieve partner per bedrijf bevestigen.
- [ ] Pilotvoorwaarden, klantlimieten en bevoegdheden vastleggen.
- [ ] Alle eigenaarchecks, directe Supabase-queries, opslagpolicies, publicatiefuncties en onboardingredirects inventariseren.
- [ ] Lokale Next.js-guides en actuele Supabase-documentatie vóór implementatie raadplegen.

Resultaat: route-, gegevens- en rechtenontwerp met een volledige lijst van aan te passen toegangspaden.

### Fase 1 — fundament en autorisatie

- [ ] Additieve migratie, constraints, indexen en RLS maken; schema ook in `supabase/init.sql` bijwerken.
- [ ] Centrale autorisatie en expliciete klantcontext implementeren.
- [ ] Adminflow voor partneractivatie, blokkeren en limieten toevoegen.
- [ ] Transactionele acceptatie, intrekking en auditgeschiedenis implementeren.
- [ ] Isolatietests met twee partners en meerdere klanten uitvoeren.

Resultaat: veilige partnerrelaties zonder wijziging van bestaand eigendom.

### Fase 2 — dashboard en uitnodigingen

- [ ] Partnernavigatie, klantenlijst en klantdetail bouwen.
- [ ] Nieuwe en bestaande klanten uitnodigen; acceptatie en onboarding afhandelen.
- [ ] Hersturen, verlopen tokens, mailfouten en capaciteitsgrenzen verwerken.
- [ ] Klantscherm voor bevoegdheden en beëindiging bouwen.

Resultaat: een partner kan met expliciete klanttoestemming een beheerportefeuille opbouwen.

### Fase 3 — bestaande editor toegankelijk maken

- [ ] Editorbootstrap, bedrijfshelpers en alle beheeracties naar gecontroleerde context uitbreiden.
- [ ] Templates/import, conceptopslag, pagina's, vertalingen, diensten en SEO controleren.
- [ ] Medialinks, uploads, database- en storagepolicies aanpassen.
- [ ] Publicatie-API, databasepromotie en domeinbeheer op afzonderlijke bevoegdheden aanpassen.
- [ ] Eigenaargebonden abonnementen, één-live-website-regel en FlexStart-controles behouden.
- [ ] Klantwissels, gelijktijdig bewerken en intrekken tijdens autosave testen.

Resultaat: partner kan een volledige website opleveren via de bestaande editor.

### Fase 4 — pilot en uitrol

- [ ] Functie achter een server-side featureflag plaatsen, standaard uit.
- [ ] Migraties eerst in testomgeving uitvoeren en daarna applicatie deployen.
- [ ] Twee of drie partners met afzonderlijke testklanten toelaten.
- [ ] Gebruiksexport, supportprocedure en foutmonitoring beschikbaar maken.
- [ ] Beoordelen of onboarding, editorbeheer en beëindiging zelfstandig uitvoerbaar zijn.
- [ ] Daarna gefaseerd openstellen; automatische facturatie blijft een aparte oplevering.

Bij terugrollen partneracties via de featureflag afsluiten en bestaande eigenaarflows actief houden. Gebruik geen destructieve terugmigratie en voer `supabase/init.sql` nooit uit op een bestaande productiedatabase.

## 11. Acceptatiecriteria en verificatie

De eerste versie is gereed wanneer:

1. Partner A kan twee verschillende klanteigenaren beheren zonder accountwisseling; beide klanten kunnen binnen hun eigen rechten publiceren.
2. Partner B, een losse klant en een anonieme bezoeker kunnen die relaties of concepten niet lezen of wijzigen via UI, API, databasefuncties of storage.
3. Alleen de eigenaar kan de beheerrelatie accepteren en aanvullende bevoegdheden verlenen; tokens zijn eenmalig, verlopen correct en zijn niet bruikbaar vanuit een ander account.
4. Gelijktijdige acceptaties overschrijden geen klantlimiet en maken geen dubbele actieve relatie.
5. Klantwissels lekken geen gegevens en schrijven geen autosave naar de verkeerde website, ook met twee geopende tabbladen.
6. Publiceren gebruikt de rechten en limieten van de klanteigenaar; de partner kan de publicatie- of domeinbevoegdheid niet omzeilen met een directe aanroep.
7. De partner kan geen aanvragen, boekingen, klantfacturen of andere persoonlijke media openen via gedeelde bedrijfsrelaties.
8. Intrekken of blokkeren weigert volgende beheeracties zonder de bestaande live website of toegang van de eigenaar te verwijderen.
9. Bestaande klanten zonder partner behouden hun onboarding, editor, publicatiegedrag en opgeslagen abonnementen.
10. Toegangswijzigingen en publicaties tonen de echte uitvoerder in de auditgeschiedenis.
11. Uitnodiging, klantkeuze, editor en beëindiging werken op desktop en mobiel zonder horizontale pagina-overloop.
12. Een eventuele betaalde pilot kan gebruik per periode verklaren zonder dubbele klantfacturatie.

Voer bij implementatie gerichte database/RLS-, autorisatie-, uitnodigings-, storage- en publicatietests uit, inclusief gelijktijdige mutaties en mislukte transacties. Controleer het volledige ingelogde traject met echte testaccounts in een testomgeving. Draai vervolgens de toepasselijke regressietests, typecheck, lint, productiebuild en `git diff --check`.

Voor dit plan zijn geen applicatie- of databasewijzigingen uitgevoerd.

## 12. Nog te bepalen vóór commerciële lancering

- Inkooptarief, eventuele vaste partnerbijdrage, staffels en wat als factureerbare actieve website geldt.
- Wie betaalt per klant en hoe een bestaand direct abonnement wordt behandeld.
- Afspraken over eerstelijnssupport, reactietijden en onderhoud door de partner.
- Toegestane partnerbranding en gebruik van de naam FlexPagina.
- Gegevensverwerking, bewaartermijnen en procedure bij een partner die stopt.
- Of bewerktoegang per volledig bedrijfsprofiel voldoende is, of een volgende versie toegang per individuele website nodig heeft.

Deze keuzes blokkeren het uitwerken van de technische beheerbasis niet; ze moeten wel vaststaan voordat betaalde resellercontracten en automatische facturatie worden aangeboden.
