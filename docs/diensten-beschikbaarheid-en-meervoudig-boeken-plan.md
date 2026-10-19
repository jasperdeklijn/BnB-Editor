# Implementatieplan: beschikbaarheid en meerdere diensten boeken

Status: voorstel voor implementatie; nog niet gebouwd.
Datum: 19 oktober 2026.

## Doel en afbakening

Een ondernemer stelt beschikbaarheid in bij de dienst. Een bezoeker kiest één of meerdere diensten met opties, ziet passende tijden en verstuurt alles als één boeking. De ondernemer ontvangt één aanvraag met afzonderlijke agendaonderdelen.

Met **meerdere opties boeken** bedoelen we meerdere daadwerkelijke onderdelen van een boeking. Meerdere vrijblijvende voorkeursmomenten voor één afspraak vallen buiten deze flow.

De eerste oplevering omvat wekelijkse beschikbaarheid, uitzonderingen per datum, varianten, extra's, gedeelde capaciteit en aansluitende afspraken op één dag. Een vervolgfase voegt afzonderlijke dagen per onderdeel toe. Bestaande verblijfsboekingen blijven werken via hun huidige flow; gecombineerde accommodaties en behandelingen volgen later. Betalingen verwerken valt buiten dit plan; bestaande handmatige betaalstatussen en facturen worden wel aangesloten.

## Onderdeel van de boekingsadd-on

Deze uitbreiding valt onder de bestaande **boekingsadd-on**. De boekingslijst, het combineren van diensten en opties, de bijbehorende beschikbaarheidsplanning en het gezamenlijk bevestigen van afspraken horen bij deze add-on.

- Gebruik de bestaande toegangscontrole via `hasBookingAddonAccess` en de runtime-entitlements. Algemeen dienstenbeheer blijft de bestaande abonnementsregels volgen.
- Toon in het beheer bij deze functies dat de boekingsadd-on vereist is en bied bij ontbrekende toegang een verwijzing naar het activeren van de add-on.
- Controleer toegang op de server bij het opslaan van add-oninstellingen, het opvragen van publieke boekbare tijden, het maken van een hold en het definitief vastleggen. Alleen bedieningselementen verbergen is onvoldoende.
- Een eerder gepubliceerde website of actieve hold geeft geen recht op nieuwe boekingen wanneer de toegang tot de add-on inmiddels is vervallen. Controleer dit opnieuw bij bevestiging.
- Behoud bestaande boekingsgegevens, klantlinks en facturen bij het vervallen van de add-on. Leg voor het beheer van bestaande boekingen expliciet vast welke handelingen volgens de bestaande toegangsregels beschikbaar blijven.

De boekingsadd-on reserveert afspraken en verwerkt geen online betalingen. Noem het overzicht voor klanten **Jouw afspraak** of **Jouw boeking**, met als laatste actie **Boeking aanvragen** of **Afspraak bevestigen**. Een bevestigde boeking is geen betaalbevestiging.

## Wat al bestaat en wat ontbreekt

| Onderdeel | Huidige basis | Benodigde uitbreiding |
| --- | --- | --- |
| Dienstenbeheer | `components/business/services-client.tsx` | Duidelijke tabbladen voor opties en beschikbaarheid |
| Boekregels | `lib/booking/types.ts`, `lib/supabase/booking-settings.ts` | Opties, combinatieregels en koppeling aan gedeelde capaciteit |
| Weekbeschikbaarheid | `calendar_availability_windows` en `components/calendar/calendar-client.tsx` | Beheer vanuit de dienst en datumuitzonderingen |
| Berekening | `lib/booking/availability.ts` | Combinaties en capaciteit over verschillende diensten heen |
| Publiek boeken | `/api/booking/availability`, `/holds`, `/confirm` | Boekingsmandje en transactie voor alle onderdelen |
| Publicatie | `lib/website-snapshot.ts`, `lib/booking/public-context.ts` | Gepubliceerde opties/prijzen en actuele beschikbaarheid expliciet scheiden |
| Agenda en reserveringen | `calendar_entries`, `lib/booking/reservations.ts` | Eén boekingsgroep met meerdere agendaonderdelen |
| Klantbeheer en berichten | `customer-access.ts`, `lifecycle.ts`, `notifications.ts` | Beheerlink, bevestiging en annulering voor de hele groep |
| Financieel | `invoicing.ts`, `pricing.ts` | Eén reserveringsnummer en totaal op groepsniveau |

De huidige boeking, tijdelijke reservering, klantlink en financiële administratie zijn gekoppeld aan één agenda-item. Alleen een meervoudige keuzelijst toevoegen is daarom onvoldoende.

## Gebruikerservaring voor de ondernemer

Per dienst komen de tabbladen **Algemeen**, **Opties** en **Beschikbaarheid**.

### Opties

- Een variant is een alternatief voor de basisdienst: bijvoorbeeld Basis (45 minuten, €45) of Uitgebreid (75 minuten, €70). Per gekozen dienst wordt precies één variant geselecteerd.
- Een extra is optioneel en kan prijs en/of duur toevoegen: bijvoorbeeld Massage (+20 minuten, +€20).
- De ondernemer bepaalt bij welke varianten een extra beschikbaar is. Onverenigbare extra's worden via keuzegroepen uitgesloten.
- De eerste versie ondersteunt extra's die dezelfde uitvoerder/capaciteit gebruiken als de basisdienst. Extra's met een eigen ruimte, voorraad of parallelle uitvoering krijgen later een aparte planningsregel.
- Bestaande diensten zonder opties gedragen zich als één standaardvariant.
- De ondernemer bepaalt of een dienst gecombineerd mag worden met andere diensten. De optie om alleen los te boeken blijft beschikbaar.

### Beschikbaarheid

- Een weekoverzicht met meerdere tijdvakken per dag en een actie om dagen te kopiëren.
- Keuze tussen het algemene bedrijfsrooster en een eigen rooster voor deze dienst.
- Een datumuitzondering vervangt het rooster voor die datum: gesloten of één/meerdere afwijkende tijdvakken. Een volledige bedrijfssluiting geldt voor alle diensten.
- De bestaande instellingen blijven beschikbaar: duur, buffers, capaciteit, minimale voorbereidingstijd, boekingshorizon en bevestigingswijze.
- Een voorbeeld toont de eerstvolgende boekbare momenten en legt uit waarom een dag niet boekbaar is.
- Beschikbaarheid en blokkades werken na opslaan direct door naar online boeken. De huidige publieke weekbeschikbaarheid komt uit de publicatiesnapshot; deze gegevensstroom moet hiervoor bewust worden aangepast.

### Wie of wat voert de dienst uit?

Gebruik een gedeelde agenda/capaciteitsbron, in de interface bijvoorbeeld **Mijn agenda**, **Medewerker Anna** of **Behandelruimte 1**.

- Bij het activeren kiest de ondernemer expliciet of diensten dezelfde agenda delen. Bestaande diensten worden niet automatisch samengevoegd: hun huidige capaciteit kan bewust onafhankelijk zijn.
- Een gedeelde agenda met capaciteit één verhindert overlap tussen verschillende gekoppelde diensten.
- Dienstcapaciteit en gedeelde capaciteit gelden beide; een hogere dienstcapaciteit vergroot nooit ongemerkt de capaciteit van een medewerker of ruimte.
- De eerste versie koppelt een dienst aan één bron. Meerdere gelijktijdig vereiste bronnen en automatische toewijzing uit een medewerkerspool volgen later.
- Beschikbaarheid van een dienst is de doorsnede van het dienstrooster en het rooster van de gekoppelde bron.

## Gebruikerservaring voor de klant

1. Kies diensten en per dienst een variant en extra's.
2. Bekijk het mandje met prijs, behandeltijd en volgorde.
3. Kies een dag en een starttijd waarop alle onderdelen achter elkaar passen.
4. Vul contactgegevens één keer in.
5. Controleer het volledige overzicht en bevestig de boeking.

Voorbeeld: Basisbehandeling van 45 minuten met 20 minuten massage kost €65 en duurt 65 minuten. Een tweede dienst van 30 minuten wordt daarna gepland. Zonder buffers vraagt deze combinatie 95 minuten beschikbaarheid.

De gekozen volgorde wordt getoond en vastgehouden bij het zoeken naar tijden. De eerste versie zoekt niet automatisch door alle mogelijke volgordes. Tussen twee diensten worden de buffer na het eerste onderdeel en de buffer vóór het volgende onderdeel opgeteld. Extra's verlengen hun basisdienst en krijgen geen extra interne buffers. Toon zowel behandeltijd als de volledige afspraakperiode als die verschillen.

Een wijziging in diensten, opties of volgorde maakt de eerder gekozen tijd en tijdelijke reservering ongeldig. De klant kiest daarna opnieuw uit passende tijden. De browser bewaart geen persoonsgegevens in het mandje.

## ‘Jouw boeking’ aanpassen in de website-editor

De ondernemer kan **Jouw boeking** aanpassen via de bestaande website-editor. De pagina neemt standaard de stijl van de website over. Deze aanpassingen zijn onderdeel van de **boekingsadd-on**.

- **Vormgeving:** logo, kleuren, lettertypen, achtergrond en knopstijl.
- **Teksten:** titel, introductie, knoplabels en bevestigingstekst.
- **Inhoud:** welke diensten en extra's boekbaar zijn, prijsweergave en betaalinstructies.
- **Indeling:** het boekingsoverzicht naast of onder de selectie. Op mobiel worden de onderdelen onder elkaar getoond.

Sla deze instellingen op bij de website en neem ze mee in de publicatiesnapshot. De editorpreview toont conceptwijzigingen; de gepubliceerde boekingspagina gebruikt de gepubliceerde instellingen. De selectie van aangeboden diensten en extra's blijft onder de bestaande servervalidatie voor boekbaarheid vallen.

Toon de betaalinstructies vóór het bevestigen en in de bevestigingsmail. De prijsweergave bepaalt de presentatie; prijsberekening, beschikbaarheidscontrole en boekingsstatus blijven door de server bepaald.

## Gegevensmodel

Onderstaande namen zijn voorgesteld; definitieve SQL wordt in de bouwfase opgesteld.

| Gegeven | Doel en belangrijkste relaties |
| --- | --- |
| `service_option_groups` | Variant- en extragroepen per dienst, selectiegrenzen en volgorde |
| `service_options` | Opties per groep, vaste variantprijs/-duur of toeslag/-duur, actief/inactief |
| `service_option_compatibility` | Toegestane variant-extra-combinaties, met bedrijfs- en dienstgrenzen |
| `booking_resources` | Gedeelde agenda/capaciteitsbron per bedrijf |
| `service_booking_resources` | Koppeling dienst-bron; aanvankelijk maximaal één bron per dienst |
| `booking_resource_windows` | Wekelijkse beschikbaarheid van de bron |
| `booking_availability_exceptions` | Datumuitzonderingen op bedrijfs-, dienst- of bronniveau |
| `booking_groups` | Website, bedrijf, klant, status, reserveringsnummer en idempotentiesleutel |
| `booking_items` | Dienst, gekozen opties, volgorde, tijdvak en onveranderlijke prijs-/duursnapshot |
| `booking_resource_allocations` | Gereserveerde bron, tijdvak inclusief buffers en capaciteitsgebruik per item |
| `booking_group_holds` en hold-items | Tijdelijk vastzetten van het hele mandje met één vervaltijd en token |

Een `booking_item` hoort bij één `booking_group` en één `calendar_entry`. Een extra zonder eigen planning is een prijs-/optieselectie binnen hetzelfde item, geen afzonderlijke agenda-afspraak. Bedrijfsgrenzen worden met samengestelde relaties en servervalidatie afgedwongen.

Prijzen worden gestructureerd opgeslagen in centen met valuta en bestaande btw-/factuurregels. De huidige vrije tekst `services.price` blijft bruikbaar voor weergave, maar wordt niet stilzwijgend als betrouwbare prijsbron gebruikt. Niet eenduidig omzetbare prijzen vereisen een expliciete instelling voordat een berekend totaal kan worden aangeboden.

Archiveren van diensten of opties verwijdert geen bestaande boekingshistorie. Prijs, naam en duur blijven op geboekte onderdelen bewaard, ook na een wijziging of nieuwe publicatie.

Nieuwe tabellen krijgen RLS, minimale grants en controle op het eigenaarschap via het bedrijf. Publieke bezoekers krijgen uitsluitend de nodige serverroutes; zij krijgen geen directe toegang tot klant-, hold- of boekingstabellen. Privileged boekingsfuncties worden uitsluitend aan de daarvoor bedoelde serverrol beschikbaar gemaakt. Zie de [Supabase-documentatie over RLS en grants](https://supabase.com/docs/guides/database/postgres/row-level-security).

## Beschikbaarheid en definitief vastleggen

Breid de bestaande engine uit met een planner die een volledige selectie omzet naar concrete onderdelen:

1. Controleer of alle diensten en opties bij hetzelfde bedrijf en dezelfde gepubliceerde website horen en online boekbaar zijn.
2. Bereken prijs en duur op de server. Vertrouw geen totalen, eindtijden of bron-ID's uit de browser.
3. Bouw per mogelijke starttijd de onderdelen in de getoonde volgorde op.
4. Controleer ieder onderdeel tegen zijn eigen rooster, datumuitzonderingen, buffers, voorbereidingstijd en boekingshorizon. Een dienst hoeft alleen tijdens zijn eigen onderdeel beschikbaar te zijn.
5. Controleer daarnaast bestaande boekingen, blokkades en actieve holds voor alle gebruikte bronnen. Controleer ook conflicten tussen de onderdelen van het nieuwe mandje zelf.
6. Geef alleen starttijden terug waarvoor de volledige combinatie past. Bestaande tijdzone- en zomertijdvalidatie blijft gelden.

De agenda, publieke routes, handmatige invoer, verplaatsingen en import/synchronisatie moeten dezelfde capaciteit begrijpen. Een bestaande afspraak zonder bronkoppeling voor een gekoppelde dienst moet bij de invoering correct worden meegenomen; anders lijkt een bezette medewerker ten onrechte beschikbaar.

### Eén transactie voor het hele mandje

- Maak een hold voor alle onderdelen tegelijk; de eerste versie kan de bestaande duur van tien minuten aanhouden.
- Vergrendel alle betrokken bronnen en diensten in een vaste volgorde om gelijktijdige boekingen en deadlocks te beheersen. Bestaande boekingsroutes en nieuwe routes gebruiken hetzelfde vergrendelingsprotocol.
- Hercontroleer onder die vergrendeling de actuele boekregels, capaciteit, publicatiestatus en abonnementsrechten. Alle mutaties die capaciteit of beschikbaarheid wijzigen moeten dezelfde regels respecteren.
- Leg de groep, items, agendaonderdelen en financiële snapshot gezamenlijk vast, of draai alles terug.
- Een herhaalde bevestiging met dezelfde idempotentiesleutel retourneert dezelfde boeking. Hergebruik met een andere selectie wordt geweigerd.
- Verlopen/vervangen holds tellen niet meer mee. De eigen hold wordt bij bevestiging niet dubbel geteld.
- Bij gewijzigde prijs of duur moet de klant het nieuwe overzicht expliciet bevestigen; de app boekt geen ongemerkt gewijzigde combinatie.
- Als één onderdeel goedkeuring vereist, wordt de hele groep een aanvraag. Pending groepen nemen capaciteit in, net zoals bestaande pending afspraken. Afwijzen of annuleren geeft alle onderdelen vrij.

Gebruik aparte mandjeroutes onder bijvoorbeeld `/api/booking/cart/availability`, `/holds` en `/confirm`. Laat de bestaande routes voor enkelvoudige afspraken en verblijven functioneren via dezelfde gedeelde validatie waar relevant.

## Publicatie, beheer en financiële afhandeling

- Publicatiesnapshots bevatten de aangeboden varianten, extra's, namen, prijzen en combinatieregels. Nieuwe conceptopties verschijnen pas na publiceren.
- Roosters, blokkades, actuele capaciteit en een directe uitschakeling van online boeken worden live gecontroleerd. Een oude snapshot mag een inmiddels uitgeschakelde dienst niet alsnog boekbaar maken.
- De agenda toont elk onderdeel afzonderlijk met een verwijzing naar de gezamenlijke boeking. Het reserveringsoverzicht groepeert op boeking en telt die één keer.
- De klant krijgt één bevestiging met alle onderdelen en één beveiligde beheerlink voor de groep. Berichten worden pas na commit verzonden, met herhaalbare bezorging zonder dubbele bevestigingen.
- De eerste versie ondersteunt bevestigen, afwijzen en annuleren van de hele groep. Verplaatsen is een verzoek voor de hele combinatie en wordt opnieuw op beschikbaarheid gecontroleerd. Gedeeltelijk annuleren volgt later en wordt nog niet als losse actie aangeboden.
- De financiële administratie krijgt een expliciete groepsrelatie met één reserveringsnummer en één totaal. Bestaande relaties via `calendar_entry_id` blijven ondersteund voor oude boekingen. Nieuwe gegroepeerde boekingen krijgen geen extra factuur of reserveringsnummer per item.
- Factuurregels bevatten de gekozen diensten/opties. Uitgegeven facturen en hun snapshots worden niet herschreven; bestaande facturen, klantlinks en boekingsnummers blijven geldig.
- Preview simuleert de hele flow zonder holds, boekingen of e-mails aan te maken. Bestaande abonnementscontrole blijft serverleidend.

## Bouwvolgorde en acceptatiecriteria

### Fase 1 — Basis en bestaande boekingen behouden

- [ ] Voeg modellen, validatie en migraties toe; spiegel definitieve wijzigingen in `supabase/init.sql`.
- [ ] Voeg optieprijzen en -duur toe; modelleer bestaande diensten als standaardvariant zonder verplichte bulkconversie.
- [ ] Voeg groepsrelaties toe aan agenda, klantbeheer en financiën zonder bestaande boekingen te herschrijven.
- [ ] Test eigenaarschap, bedrijfsgrenzen, ongeldige combinaties en minimale databasegrants.
- [ ] Koppel de nieuwe functies aan de bestaande boekingsadd-on en test servercontrole op toegang voor beheer en publieke routes.

Gereed wanneer bestaande enkelvoudige afspraken, verblijven, klantlinks en uitgegeven facturen ongewijzigd werken en een boekingsgroep met meerdere items geldig opgeslagen kan worden.

### Fase 2 — Beschikbaarheid beheren bij de dienst

- [ ] Bouw weekrooster, meerdere tijdvakken, datumuitzonderingen en kopiëren van dagen.
- [ ] Voeg bronkeuze met expliciete gedeelde/afzonderlijke agenda's toe.
- [ ] Breid de engine en alle schrijvende boekingspaden uit met gedeelde capaciteit.
- [ ] Laat een voorbeeld van boekbare momenten zien; verwerk wijzigingen direct in de publieke beschikbaarheid.

Gereed wanneer een sluitingsdag nergens boekbaar is, een afwijkende openingsdag wel werkt en een boeking voor dienst A de juiste capaciteit voor dienst B inneemt wanneer ze een bron delen.

### Fase 3 — Opties en aansluitend boeken

- [ ] Bouw variant-/extrabeheer, compatibiliteitsregels en publicatiesnapshotvelden.
- [ ] Bouw selectie, mandje, serverberekening en zoeken naar gezamenlijke starttijden.
- [ ] Voeg instellingen voor **Jouw boeking** toe aan de bestaande website-editor: vormgeving, teksten, aangeboden diensten/extra's, prijsweergave, betaalinstructies en indeling, met de websitestijl als standaard.
- [ ] Neem de instellingen mee in preview en publicatie en koppel het aanpassen ervan aan de boekingsadd-on.
- [ ] Bouw groepsholds en atomische bevestiging, inclusief idempotentie en foutmeldingen per onderdeel.
- [ ] Stel expliciete grenzen in voor aantal diensten, opties en zoekperiode zodat beschikbaarheid berekenbaar blijft.

Gereed wanneer het voorbeeld van 65 + 30 minuten alleen verschijnt waar 95 minuten passen, buffers correct meetellen en twee gelijktijdige klanten de laatste plek niet allebei kunnen vastleggen.

### Fase 4 — Eén complete boekingservaring

- [ ] Koppel agenda, reserveringsoverzicht, aanvraaginbox en klantbeheer aan de groep.
- [ ] Voeg één bevestiging, groepsstatus, groepsannulering en verplaatsingsverzoek toe.
- [ ] Koppel één financiële snapshot, reserveringsnummer en factuurflow aan de groep.
- [ ] Controleer desktop en mobiel, alle relevante dienstsectie-indelingen, preview en gepubliceerde website.
- [ ] Controleer dat **Jouw boeking** standaard de websitestijl overneemt, alle genoemde instellingen aanpasbaar zijn en het overzicht naast of onder de selectie werkt; op mobiel staat het onder de selectie.
- [ ] Controleer dat conceptwijzigingen pas na publiceren zichtbaar worden op de boekingspagina en betaalinstructies vóór bevestiging en in de bevestigingsmail verschijnen.
- [ ] Controleer de aanduiding van de boekingsadd-on in het beheer en het blokkeren van nieuwe boekingen bij ontbrekende of vervallen toegang, ook met een oude publicatie of actieve hold.
- [ ] Test de volledige flow met echte lokale databasefuncties en gelijktijdige transacties; controles op broncode alleen zijn onvoldoende.

Gereed wanneer de klant één boeking beheert, de ondernemer alle onderdelen kan terugvinden en een mislukte combinatie geen losse boekingen of dubbele berichten achterlaat.

### Vervolgfase — Losse dagen en uitgebreidere planning

- [ ] Laat ieder item een eigen dag/tijd krijgen binnen hetzelfde mandje, met één atomische bevestiging.
- [ ] Ondersteun gedeeltelijke annulering met aangepaste totalen en passende correctiedocumenten.
- [ ] Voeg opties met eigen voorraad/bronnen, meerdere vereiste bronnen en medewerkerspools toe.
- [ ] Onderzoek gecombineerde verblijven en aanvullende diensten met hun afzonderlijke regels.

## Verificatie en invoering

Verplicht te testen: exclusieve varianten, ongeldige extra's, gemanipuleerde prijzen, verschillende dienstroosters, gedeelde versus onafhankelijke capaciteit, pauzes en buffers, datumsluitingen, zomertijd, verlopen holds, dubbele bevestiging, concurrency, rollback bij één bezet onderdeel, gemengde bevestigingsregels, concept versus gepubliceerde opties, directe uitschakeling, groepsannulering en behoud van oude facturen/klantlinks.

Gebruik bestaande tests in `tests/booking-availability.test.mjs`, `booking-public-flow.test.mjs`, `booking-lifecycle.test.mjs`, `booking-calendar-interoperability.test.mjs`, `booking-invoicing.test.mjs` en `website-snapshot.test.mjs` als regressiebasis. Voeg gedragstests voor combinaties en transactietests voor gelijktijdigheid toe. Voer daarnaast typecheck en lint uit.

Lever additief op: eerst database en compatibele servercode, daarna beheer en publicatie, daarna het publieke mandje. Activeer combinaties pas zodra alle paden gedeelde capaciteit afdwingen. Bij terugschakelen blijft het beheer van bestaande groepen werken, ook wanneer nieuwe mandjeboekingen tijdelijk uitstaan.

De eerste openbare oplevering bestaat uit fase 1 t/m 4. De vervolgfase is een afzonderlijke uitbreiding en blokkeert die oplevering niet.
