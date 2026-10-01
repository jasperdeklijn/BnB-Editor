# Adminoverzicht en klantbeheer

Het adminoverzicht brengt dagelijkse aandachtspunten, klantzoekwerk en platformcijfers samen. Er zijn geen nieuwe database-tabellen of migraties nodig. Het overzicht en de klantpagina's voeren uitsluitend leesacties uit; verzenden, goedkeuren, publiceren en opnieuw uitvoeren blijven in de bestaande beheerflows.

## Navigatie en klanten

- `/admin`: aandachtspunten, zoeken per klant, vier hoofdcijfers, periodestatistieken, recente activiteit en templategebruik.
- `/admin/customers`: alle accounts, inclusief klanten zonder website. Zoek op naam, e-mailadres, account-ID, websitetitel, slug of gekoppeld domein. Live websites en concepten staan onder hun eigenaar. Bij een websitezoekopdracht worden de passende websites binnen de klantgroep getoond.
- `/admin/customers/[customerId]`: opgeslagen abonnement, websites en domeinen, laatste 20 supportgesprekken en laatste 20 auditacties van de klant of diens websites. Supportkoppeling gebruikt het huidige account-e-mailadres, niet een veronderstelde klantrelatie.
- Websitezoekresultaten linken rechtstreeks naar de geselecteerde website in de klantpagina. De website blijft bij de eigenaar zichtbaar.
- Desktop heeft een vaste beheernavigatie; mobiel heeft een uitklapbaar beheermenu. De gedeelde shell en semantische kleuren gelden ook voor bestaande beheerpagina's.

## Definities van cijfers

| Cijfer | Definitie | Vergelijking |
| --- | --- | --- |
| Nieuwe accounts | Accounts aangemaakt binnen de gekozen 7, 30 of 90 dagen | Vorige aaneengesloten periode van dezelfde lengte |
| Live websites | `published = true` | Huidige stand; geen verzonnen historische trend |
| Actieve betaalde abonnementen | `status = active` en `current_price > 0`; één abonnement per gebruiker volgens het schema | Huidige stand; geen bewijs van ontvangen betalingen |
| Open supportgesprekken | `new`, `draft_ready` of `needs_review` | Huidige stand |
| Bezoekerssessies | Registraties in `website_visits` in de gekozen periode; geen unieke personen | Vorige periode |
| Ontvangen aanvragen | Registraties in `contact_requests` in de gekozen periode | Vorige periode |

Perioden zijn halfopen intervallen: vanaf de start, tot maar niet inclusief het einde. Een vergelijking vanaf nul toont de absolute toename; onbeschikbare gegevens tonen geen nul of procent. Datums worden in Europe/Amsterdam weergegeven.

## Aandacht nodig

Per onderdeel worden het totale aantal en maximaal vier oudste items getoond:

- Supportgesprekken met `unread_count > 0`.
- Goedkeuringen met status `pending`, zonder verlopen vervaldatum.
- Agenttaken met `failed` of `dead_letter`.
- FlexStart in `requested`, `processing`, `checking`, `corrections` of `approved`, plus niet-gepubliceerde aanvragen met een onbehandeld reviewverzoek. `ready` zonder reviewverzoek wacht op de klant.

Links bevatten het exacte gesprek-, goedkeuring-, taak- of aanvraag-ID. Mailbox en agentbeheer halen een geselecteerd item ook buiten hun recente lijst op. Een auditlink opent de geselecteerde auditactie met metadata. Goedkeuringen en taakherstel behouden de bestaande servercontrole en menselijke beslissingen.

## Toegang, fouten en capaciteit

Elke pagina controleert de ingelogde gebruiker en adminbevoegdheid voordat een service-role-query wordt uitgevoerd. De gedeelde layout voegt dezelfde controle toe. Service-role-clients worden alleen op de server gebruikt. Rollen in user-editable metadata geven geen adminrechten.

Mislukte queries krijgen per onderdeel een foutmelding. Een onvolledig klantzoekresultaat wordt niet als volledig getoond. De klantpagina houdt onafhankelijke onderdelen beschikbaar wanneer één query mislukt.

De Auth admin API ondersteunt geen serverfilter op klantnaam of e-mailadres. Klantzoeken leest daarom de accounts en minimale website/domein/abonnementkolommen in serverpagina's, groepeert ze en pagineert de zichtbare resultaten. Dit voorkomt de limiet van alleen de eerste 1.000 accounts, maar is geen geschikte zoekarchitectuur voor zeer grote accountbestanden. Meet doorlooptijd bij groei; voeg dan een beheerde, geïndexeerde klantdirectory toe. Historische voorraadcijfers voor live websites, actieve abonnementen en open support vragen eigen snapshots voordat trends kunnen worden getoond.

## Acceptatie

- [x] Regressies voor eigenaar-groepering, concepten, alternatieve domeinen en klanten zonder website.
- [x] Periodegrenzen, nulvergelijking, ontbrekende gegevens en gepagineerde brongegevens getest.
- [x] Anonieme gebruikers en gewone klanten krijgen geen service-role-client.
- [x] Specifieke aandachtlinks en filtering op status/vervaldatum getest met gecontroleerde queryfixtures.
- [x] Oudere supportgesprekken halen eigen berichten en antwoordvoorstellen op, buiten de globale recente-lijstlimiet.
- [x] TypeScript, gerichte ESLint-controle en productiebuild geslaagd.
- [x] Vijf gerenderde schermtoestanden gecontroleerd met synthetische gegevens op 320, 375, 768, 1024, 1440 en 1920 px; geen horizontale pagina-overloop. Zoekresultaat naar geselecteerde klantwebsite gecontroleerd.
- [ ] Authenticated hosted controle: zoek op naam, e-mailadres en secundair domein; controleer eigenaar en geselecteerde website.
- [ ] Authenticated hosted controle: open een ouder supportgesprek, een oude mislukte taak en een goedkeuring vanuit het overzicht.
- [ ] Controleer de definities en foutmeldingen tegen het bestaande Supabase-project. Lokale fixtures zijn geen hosted databasebewijs.

Gerichte regressie: `node --test tests/admin-dashboard.test.mjs`. Gebruik daarnaast de bestaande typecheck, lint, tests en productiebuild.

Bij de controle van 1 oktober 2026 slaagden 253 van 254 tests. De bestaande enquiry-test `owner inbox and booking setup guidance are available without WhatsApp integration` in `tests/inquiries.test.mjs` faalde: de assertion verwacht een letterlijke `/editor/requests`-link in het ongewijzigde `components/editor/editor-header.tsx`. Alle 29 gerichte admin/mail/agent/abonnementtests slagen. De volledige ESLint-run vond daarnaast twee bestaande CommonJS-scripts onder de genegeerde werkmap `tmp/quote-check`. Deze bestanden zijn niet aangepast voor het adminwerk; de gerichte admincontroles slagen. Browserfixtures bewijzen opmaak en basisnavigatie, geen ingelogde hosted integraties.
