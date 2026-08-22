# FlexPagina: Booking.com- en iCal-kalenderkoppeling

## Status van dit document

Dit document is op 22 augustus 2026 afgestemd op de huidige repository en na uitvoering bijgewerkt. Het beschrijft de geïmplementeerde uitbreiding van de bestaande algemene iCal-koppeling naar een koppeling per accommodatie, plus de resterende live deploymentchecks.

- `[x]` aantoonbaar aanwezig in de huidige broncode; waar beschikbaar zijn de gerichte tests meegewogen;
- `[ ]` ontbreekt, is slechts gedeeltelijk aanwezig of moet nog live worden gevalideerd.

De oorspronkelijke iCal-functie uit Booking Engine 2.0 fase 4 werkte uitsluitend op bedrijfsniveau. Die algemene overzichtsfeed blijft behouden. Migratie `20260822130000_service_calendar_connections.sql` voegt daarnaast providergerichte imports en exports per accommodatie toe. Bestaande bedrijfsbrede imports houden `service_id = null` en blijven alle boekbare diensten blokkeren totdat de eigenaar ze verwijdert of per accommodatie opnieuw toevoegt.

## Projectbegrippen

Gebruik de bestaande modellen en introduceer geen nieuwe `rooms`-, `bookings`- of parallelle `calendar_events`-tabel.

- Een klant/tenant is een rij in `businesses`.
- Een kamer of verhuurbare accommodatie is een rij in `services` met `service_booking_settings.booking_mode = 'stay'`.
- Een rechtstreekse boeking, afspraak of blokkade staat in `calendar_entries`.
- Een tijdelijke reservering tijdens het boekingsproces staat in `booking_holds`.
- De agenda is gekoppeld aan `business_id`; `website_id` is alleen nodig waar de publieke websitecontext relevant is. Een kalenderkoppeling hoort niet dubbel per website te worden opgeslagen.
- De eigenaar volgt uit `businesses.user_id`. Een extra `user_id` op een kalenderkoppeling is daarom redundant.
- `supabase/migrations/20260605100000_remove_legacy_bnb_rooms.sql` heeft de oude `rooms`- en `bnbs`-tabellen bewust verwijderd.

Voor deze functie betekent *per accommodatie* dus: per `service_id` waarvan de boekingsmodus `stay` is. Voor niet-B&B-bedrijven mag de bestaande bedrijfsbrede iCal-overzichtsfunctie beschikbaar blijven.

## Doel

Bouw voort op de bestaande agenda zodat een klant per accommodatie:

- een Booking.com-exportfeed kan importeren;
- een FlexPagina-feed kan exporteren naar Booking.com;
- optioneel een aparte Google Agenda of generieke iCalendar-feed kan importeren;
- directe FlexPagina-boekingen en handmatige blokkades als bezet kan publiceren;
- externe reserveringen als privacyveilige blokkades in de FlexPagina-agenda ziet;
- verschillende accommodaties onafhankelijk beheert.

iCalendar/ICS is een universele standaard en geen Apple-specifieke functie. iCal is niet realtime. De UI en documentatie mogen daarom nooit garanderen dat dubbele boekingen onmogelijk zijn.

## Productkeuzes

- FlexPagina blijft eigenaar van rechtstreekse FlexPagina-boekingen.
- Booking.com ontvangt via de providergerichte export uitsluitend bezette perioden. FlexPagina registreert een rechtstreekse boeking niet als Booking.com-reservering.
- Doe geen harde uitspraak dat hierdoor nooit Booking.com-commissie verschuldigd is. De commerciële gevolgen worden bepaald door de overeenkomst tussen de accommodatiehouder en Booking.com en vallen buiten de applicatielogica.
- De eerste versie gebruikt geen Booking.com Connectivity API, Google OAuth of Outlook OAuth.
- Ontwerp de synchronisatieservice met provideradapters, zodat een officiële API later kan worden toegevoegd zonder `calendar_entries` of het boekingsmodel te vervangen.
- Eén `services`-rij vertegenwoordigt voor de iCal-koppeling één verhuurbare accommodatie. Voorraadbeheer en afzonderlijke kalenderidentiteit voor meerdere identieke units binnen één Booking.com-kamertype vallen buiten deze versie. De bestaande generieke `capacity`-instelling verandert dat niet.

## Gecontroleerde bestaande basis

### Boekings- en beschikbaarheidsmodel

- [x] `services` en `service_booking_settings` zijn de bron voor aanbod, accommodaties en boekingsregels.
- [x] `calendar_entries` bewaart directe boekingen, afspraken, handmatige blokkades en geïmporteerde blokkades.
- [x] `booking_holds` bewaart tijdelijke holds met een gehashte token en een vervaltijd.
- [x] Beschikbaarheid gebruikt halfopen intervallen: `start < otherEnd && end > otherStart`.
- [x] Een uitcheck op dezelfde datum/tijd als de volgende check-in veroorzaakt daardoor geen overlap.
- [x] De publieke boekingsflow controleert capaciteit en blokkades server-side.
- [x] De definitieve boeking wordt transactioneel opnieuw gecontroleerd en aangemaakt via `finalize_public_booking`.
- [x] Gelijktijdige boekingspogingen voor dezelfde `service_id` worden geserialiseerd met een PostgreSQL advisory transaction lock.
- [x] Pending en confirmed boekingen, actieve holds en blokkades worden in de beschikbaarheidscontrole meegenomen.

### Bestaande algemene iCal-import

- [x] `calendar_import_sources` bestaat met eigenaar-RLS via `businesses.user_id`.
- [x] Meerdere algemene HTTPS-iCal-bronnen per bedrijf kunnen worden toegevoegd, gepauzeerd, hervat, handmatig gesynchroniseerd en verwijderd.
- [x] De volledige import-URL wordt niet door de serveractie aan de UI teruggegeven; de UI toont alleen de hostnaam.
- [x] Dezelfde feed-URL kan per bedrijf niet tweemaal worden toegevoegd.
- [x] Een synchronisatielock voorkomt gelijktijdige verwerking van dezelfde bron.
- [x] Time-out, maximale responsegrootte, maximaal aantal redirects, conditional requests, foutstatus en exponential backoff zijn aanwezig.
- [x] Alleen HTTPS is toegestaan en localhost, lokale/interne hostnamen en private/link-local IP-adressen worden geweigerd.
- [x] Redirectbestemmingen worden opnieuw gevalideerd.
- [x] Events worden op bron, `UID` en occurrence key idempotent ge-upsert.
- [x] Verdwenen events worden alleen na een volledig geslaagde parse/snapshot verwijderd.
- [x] Een mislukte fetch of parse behoudt de laatst geslaagde blokkades.
- [x] Geannuleerde en transparante events worden niet als actieve blokkade opgenomen.
- [x] All-day events, datum/tijd, tijdzones, folded lines, escaped tekst, veelgebruikte herhalingen, uitzonderingen en lege feeds worden verwerkt.
- [x] Geïmporteerde events zijn alleen-lezen in de kalender-UI.
- [x] Verwijderen van een importbron verwijdert via cascade ook de bijbehorende geïmporteerde blokkades.
- [x] Nieuwe importbronnen zijn aan één `service_id` gekoppeld; bestaande bedrijfsbrede bronnen blijven bewust als legacy-overzicht bestaan.
- [x] `calendar_import_sources` kent een gevalideerde provider: `booking_com`, `google_calendar` of `other`.
- [x] Per accommodatie is maximaal één Booking.com- en één Google-import toegestaan; meerdere `other`-imports blijven mogelijk.
- [x] Een event zonder `UID` krijgt een stabiele SHA-256-fallbackidentiteit.
- [x] Geïmporteerde titels worden in de database providergericht genormaliseerd en bevatten geen externe `SUMMARY`.
- [x] De parser gebruikt de onderhouden dependency `ical.js` 2.2.1 voor RFC 5545-syntaxis, tijdwaarden, herhalingen en uitzonderingen.
- [x] DNS-resultaten worden op openbare adressen gecontroleerd en de HTTPS-verbinding wordt aan het gekozen gevalideerde adres gepind.
- [x] Nieuwe geheime import-URL's worden met AES-256-GCM versleuteld en alleen gemaskeerd aan de UI teruggegeven. Legacy-URL's worden bij de volgende synchronisatie versleuteld.

### Bestaande algemene iCal-export

- [x] `calendar_export_feeds` biedt één niet-radenbare UUID-link per bedrijf.
- [x] De publieke route vereist geen login, is rate-limited en retourneert alleen bij een geldige, actieve token.
- [x] De eigenaar kan export pauzeren en de sleutel roteren; de oude URL wordt direct ongeldig.
- [x] De feed gebruikt stabiele UIDs, CRLF-regelafbrekingen, escaping en line folding.
- [x] Klantcontactgegevens en interne notities worden niet uit de database geselecteerd voor export.
- [x] Notitie-items worden niet geëxporteerd.
- [x] Iedere accommodatie kan een afzonderlijke exportfeed voor Booking.com en Google Agenda/Outlook krijgen.
- [x] Een Booking.com-export sluit geïmporteerde Booking.com-events uit.
- [x] Een Google-gerichte export sluit geïmporteerde Google-events uit.
- [x] Providergerichte exports gebruiken uitsluitend de generieke titel `Bezet`.
- [x] Accommodatiefeeds exporteren `DTSTART;VALUE=DATE` en een exclusieve `DTEND;VALUE=DATE`.
- [x] Cancelled en completed items worden niet geëxporteerd; blocking, pending en confirmed items volgen de bestaande capaciteitsregels.
- [x] Nieuwe exporttokens bestaan uit 32 cryptografisch willekeurige bytes en worden alleen als SHA-256-hash opgeslagen. De volledige URL wordt alleen na maken of roteren getoond; legacy-UUID-links blijven werken tot rotatie.

### Synchronisatie, UI en beheer

- [x] `Nu synchroniseren`, pauzeren, hervatten, verwijderen, syncstatus, laatste succes, foutmelding en aantal blokkades staan in `/editor/calendar`.
- [x] De cronroute `/api/cron/calendar-sync` controleert `CRON_SECRET`.
- [x] De cronroute is opgenomen in `vercel.json`.
- [x] Gezonde bronnen plannen in de database de volgende poging na één uur; fouten beginnen met een retry na vijftien minuten.
- [x] De Vercel-cron is van wekelijks naar dagelijks aangepast (`15 2 * * *`), de maximale frequentie die deploybaar blijft op Vercel Hobby.
- [x] Gezonde synchronisatie- en retry-intervallen zijn configureerbaar met `CALENDAR_SYNC_INTERVAL_MINUTES` en `CALENDAR_SYNC_RETRY_MINUTES`.
- [x] De UI is per accommodatie gegroepeerd en noemt de primaire flow `Booking.com-agenda koppelen`.
- [x] Een Nederlandstalige Booking.com-installatiewizard is aanwezig.
- [x] Een Nederlandstalige Google Agenda-installatiewizard is aanwezig.
- [x] De UI waarschuwt expliciet dat iCal niet realtime is en dat de externe provider zijn eigen ophaalfrequentie bepaalt.
- [x] De UI adviseert één aparte Google-agenda per accommodatie en behandelt het geheime iCal-adres als een wachtwoord.
- [x] De beperking voor meerdere identieke units binnen één kamertype staat in de product-UI.

### Migraties en teststatus

- [x] `20260822130000_service_calendar_connections.sql` en het definitieve schema in `supabase/init.sql` zijn in parity.
- [x] Gerichte tests slagen op 22 augustus 2026: 10 iCal-interoperabiliteit, 13 beschikbaarheid, 5 publieke boekingsflow, 5 kalender-UX, 8 lifecycle, 9 invoicing, 10 entitlement, 3 snapshot en 7 multilingual tests.
- [ ] De fase-4-migratie en nieuwe servicegerichte migratie zijn op het doel-Supabase-project toegepast en live gecontroleerd.
- [ ] Live RLS/eigenaarschap met twee accounts is gecontroleerd.
- [ ] Werkelijke Booking.com- en Google-feeds zijn end-to-end getest.
- [ ] Desktop- en mobiele browserflows voor de installatiewizards zijn gecontroleerd.
- [x] Volledige ESLint, `npx tsc --noEmit`, gerichte regressietests en `npm run build` slagen.

## Geïmplementeerd datamodel

Breid de bestaande tabellen uit. Maak geen nieuwe `calendar_connections`, `calendar_events` of `room_calendar_exports` naast de huidige tabellen.

### `calendar_import_sources`

De bestaande synchronisatie- en healthvelden zijn behouden en uitgebreid met:

- `service_id uuid not null`, met een samengestelde foreign key `(service_id, business_id)` naar `services(id, business_id)`;
- `provider text not null`, beperkt tot `booking_com`, `google_calendar` en `other`;
- eventueel `feed_url_ciphertext` plus sleutelversie in plaats van een rechtstreeks selecteerbare `feed_url`;
- een veilige hostnaam/maskering voor weergave;
- zo nodig een fingerprint van de genormaliseerde URL voor duplicaatdetectie zonder de geheime URL te loggen.

Cardinaliteit voor v1:

- maximaal één actieve `booking_com`-import per accommodatie;
- maximaal één actieve `google_calendar`-import per accommodatie;
- meerdere `other`-imports per accommodatie;
- geen verbinding met een service van een ander bedrijf;
- alleen services met `booking_mode = 'stay'` in de Booking.com-wizard.

De bestaande functie `replace_calendar_import_events` blijft het transactionele snapshotmechanisme. Laat deze functie bij imports `calendar_entries.service_id` vullen vanuit de geselecteerde bron. Hergebruik `external_source_id`, `external_uid` en `external_occurrence_key`.

### `calendar_entries`

Geen parallelle eventtabel toevoegen. Gebruik de bestaande velden:

- directe boeking: `entry_type = 'booking'`, `source = 'website_form'`, gekoppelde `service_id`;
- handmatige blokkade: `entry_type = 'blocked'`, `source = 'manual'`, gekoppelde `service_id`;
- externe blokkade: `entry_type = 'blocked'`, `source = 'import'`, gekoppelde `service_id` en `external_source_id`;
- tijdelijke hold: blijft in `booking_holds` en wordt niet als duurzaam kalenderitem gekopieerd.

Sla voor externe events alleen een generieke titel op, bijvoorbeeld `Geboekt via Booking.com` of `Extern bezet`. Importeer geen gastnaam, e-mail, telefoon, prijs, opmerkingen of betaalgegevens.

### `calendar_export_feeds`

De oorspronkelijke tabel had `business_id` als primary key en ondersteunde daardoor maar één bedrijfsfeed. De nieuwe migratie behoudt die feed als `overview` en gebruikt nu:

- een eigen `id uuid primary key`;
- `business_id uuid not null`;
- `service_id uuid null`: null voor de bestaande algemene overzichtsfeed, verplicht voor een providergerichte accommodatiefeed;
- `target_provider text not null`: bijvoorbeeld `overview`, `booking_com` of `google_calendar`;
- een lange willekeurige token of bij voorkeur `token_hash` plus een eenmalig getoonde URL;
- `enabled`, `token_version`, `last_rotated_at`, `created_at` en `updated_at`;
- unique constraints voor het gewenste feedtype per bedrijf/accommodatie/provider.

Een providergerichte export selecteert alleen events die de gekozen `service_id` blokkeren. Sluit events uit wanneer hun `external_source_id` verwijst naar dezelfde provider als `target_provider`. Een bedrijfsbrede handmatige blokkade met `service_id = null` mag alle accommodatiefeeds blokkeren wanneer dat expliciet het bedoelde gedrag is.

## Functionele status

### Booking.com-import per accommodatie

- [x] De eigenaar kiest eerst een bestaande accommodatie/service met boekingstype `stay`.
- [x] De geheime Booking.com-export-URL wordt server-side gevalideerd en versleuteld opgeslagen.
- [x] De bron wordt direct getest zonder dat een fout de eerder geslaagde snapshot verwijdert.
- [x] De succesvolle snapshot maakt alleen de gekozen accommodatie niet-boekbaar.
- [x] Updates met hetzelfde UID/occurrence worden bijgewerkt en verdwenen/geannuleerde events worden veilig verwijderd.
- [x] De kalender toont alleen `Geboekt via Booking.com`, zonder persoonsgegevens.

### FlexPagina-export naar Booking.com

- [x] Iedere accommodatie krijgt een afzonderlijke, roteerbare Booking.com-importlink.
- [x] De feed bevat confirmed directe boekingen en relevante handmatige/externe blokkades voor die accommodatie.
- [x] Pending aanvragen worden opgenomen, overeenkomstig de bestaande capaciteitsregel waarin pending boekingen beschikbaarheid verbruiken.
- [x] Booking.com-importevents worden niet naar de Booking.com-feed teruggeëxporteerd.
- [x] De samenvatting is altijd `Bezet` en bevat geen persoonsgegevens of financiële gegevens.
- [x] Verblijfsdatums gebruiken `VALUE=DATE` en een exclusieve `DTEND`.
- [x] Tokenrotatie maakt de oude URL direct ongeldig.

### Google Agenda en overige ICS-feeds

- [x] De eigenaar kan optioneel één Google iCal-import per accommodatie toevoegen.
- [x] De eigenaar kan meerdere generieke imports per accommodatie toevoegen.
- [x] Een Google-gerichte feed sluit Google-importevents uit om lussen te voorkomen.
- [x] Een alleen-lezen accommodatiefeed kan in Google Agenda of Outlook worden geabonneerd; de bestaande algemene overzichtsfeed blijft behouden.
- [x] De UI legt uit dat abonnementen vertraagd kunnen verversen en geen tweewegbewerking bieden.

### Beschikbaarheid en race conditions

- [x] De bestaande availability service combineert boekingen, holds en kalenderblokkades.
- [x] De bestaande databasefuncties gebruiken een atomische eindcontrole en halfopen intervallen.
- [x] Geïmporteerde blokkades dragen de juiste `service_id`, zodat twee accommodaties met dezelfde datums onafhankelijk blijven.
- [ ] Dat gedrag is getest met twee services in hetzelfde bedrijf en met een bedrijfsbrede handmatige blokkade.

## Beveiligingsvereisten

- [x] Eigenaar-RLS bestaat voor de huidige import- en exporttabellen.
- [x] Service-rolegebruik voor het vervangen van imports is beperkt tot servercode en de RPC is niet uitvoerbaar door `anon` of `authenticated`.
- [x] De openbare exportroute gebruikt een geheime token en rate limiting.
- [x] HTTPS-only, IP/hostvalidatie, redirectlimiet, time-out en responsegroottelimiet bestaan.
- [x] Samengestelde foreign keys en eigenaar-RLS bewijzen dat `service_id` bij hetzelfde `business_id` hoort.
- [x] Providergerichte export lekt uitsluitend kalenderdatums en de titel `Bezet`.
- [x] Import-URL's worden versleuteld opgeslagen en niet aan de browser teruggegeven; alleen de hostnaam wordt getoond.
- [x] DNS-rebinding wordt gemitigeerd door de HTTPS-lookup aan een vooraf gevalideerd openbaar adres te pinnen.
- [x] Foutmeldingen verwijderen URL's en de implementatie logt geen feed-URL's of ruwe exporttokens.
- [x] Foreign-keycascades verwijderen service-, business-, bron- en feedgegevens samen met hun eigenaar.

## Installatiewizards

### Booking.com-agenda koppelen

1. Kies in FlexPagina de juiste accommodatie.
2. Maak of kopieer de Booking.com-gerichte FlexPagina-kalenderlink van die accommodatie.
3. Open Booking.com Extranet en ga naar de kalendersynchronisatie van exact dezelfde accommodatie/kamer.
4. Importeer daar de FlexPagina-link.
5. Exporteer vervolgens de Booking.com-kalender van dezelfde accommodatie.
6. Plak die geheime Booking.com-link in FlexPagina.
7. Test de verbinding en toon het resultaat, de laatste succesvolle synchronisatie en een niet-realtimewaarschuwing.

Noem de functie primair `Booking.com-agenda koppelen`, niet alleen `iCal`. Leg kort uit dat ICS/iCalendar ook op Android en Windows werkt.

### Google Agenda koppelen

1. Gebruik bij voorkeur één aparte Google-agenda per accommodatie.
2. Open Google Agenda op een computer.
3. Open de instellingen van de gekozen agenda.
4. Kopieer onder `Agenda integreren` het `Geheim adres in iCal-indeling`.
5. Plak het adres bij dezelfde accommodatie in FlexPagina en test de verbinding.

Behandel dit geheime adres als een wachtwoord. Een Google Agenda-abonnement op een FlexPagina-feed is alleen-lezen en Google bepaalt wanneer het abonnement wordt vernieuwd.

## Testchecklist

### Parser en export

- [x] all-day `VALUE=DATE` met exclusieve `DTEND`;
- [x] datum/tijd met UTC, offset en TZID;
- [x] meerdere events, folded lines en escaped tekst;
- [x] gewijzigd, geannuleerd en verdwenen event via transactionele snapshotvervanging;
- [x] stabiele SHA-256-fallback voor ontbrekende UID;
- [x] herhalingen en recurrence exceptions via `ical.js`;
- [x] lege en ongeldige feeds plus broncontroles voor time-out en maximale grootte;
- [x] provider-exclusie voorkomt Booking.com- en Google-lussen;
- [x] providerexport bevat nergens klant- of betaalgegevens;
- [x] tokenrotatie en gedeactiveerde feeds maken de oude URL onbruikbaar.

### Database en beschikbaarheid

- [ ] één accommodatie met Booking.com-import;
- [ ] twee accommodaties met gelijke datums blijven onafhankelijk;
- [ ] bedrijfsbrede blokkade blokkeert beide wanneer zo ingesteld;
- [x] upsert van hetzelfde externe UID/occurrence is door schema- en servicetests gedekt;
- [x] verdwenen events worden alleen na succesvolle volledige snapshotvervanging verwijderd;
- [x] een mislukte sync bereikt de snapshot-RPC niet en behoudt de vorige blokkades;
- [ ] RLS/eigenaarschap met twee gebruikers;
- [x] samengestelde service/business foreign-keyisolatie is in migratie en bootstrap getest;
- [x] gelijktijdige definitieve boekingspogingen worden door de bestaande advisory-locktransactie afgevangen;
- [x] check-out gelijk aan volgende check-in blijft in de availability-unit tests toegestaan.

### Route en UI

- [ ] eigenaar kan per accommodatie een koppeling toevoegen, testen, pauzeren, wijzigen en verwijderen;
- [ ] andere gebruiker krijgt geen toegang;
- [x] volledige import-URL komt niet terug in browserdata; alleen `urlHost` wordt geserialiseerd;
- [x] de publieke route retourneert alleen voor een geldige actieve token en is rate-limited;
- [x] serveracties en UI houden import en export aan dezelfde gekozen accommodatie gekoppeld;
- [x] status, laatste synchronisatie, veilige foutmelding en waarschuwing worden gerenderd;
- [ ] desktop en 390 px mobiel zijn gecontroleerd.

## Acceptatiecriteria

- [x] Een klant kan per accommodatie een Booking.com ICS-link opslaan en direct testen.
- [x] Een Booking.com-event wordt met uitsluitend de gekozen `service_id` opgeslagen.
- [x] FlexPagina biedt per accommodatie een veilige Booking.com-exportlink.
- [x] Een confirmed directe boeking verschijnt zonder persoonsgegevens in die exportfeed.
- [x] Booking.com-events worden niet teruggeëxporteerd naar Booking.com.
- [x] Een optionele Google Agenda-feed kan per accommodatie als blokkade worden ingelezen.
- [x] De implementatie en servicefilters houden accommodaties onafhankelijk; live tweekamer-validatie blijft een deploymentcheck.
- [x] Mislukte synchronisatie verwijdert de vorige geslaagde blokkades niet.
- [x] Een definitieve FlexPagina-boeking wordt atomisch op beschikbaarheid gecontroleerd.
- [x] Handmatige synchronisatie werkt in de bestaande bedrijfsbrede functie.
- [x] Periodieke synchronisatie is dagelijks geconfigureerd voor Vercel Hobby; vijftienminutensynchronisatie kan via Pro of een externe scheduler dezelfde beveiligde route aanroepen.
- [ ] Servicegerichte RLS, SSRF-verharding, tokenrotatie en privacymaatregelen zijn geïmplementeerd maar nog niet live op het doel-Supabase-project gevalideerd.
- [x] De Nederlandstalige installatie-instructies zijn in de UI aanwezig.
- [x] De UI vermeldt dat iCal niet realtime is en dubbele boekingen niet volledig kan uitsluiten.
- [x] Gerichte tests, volledige lint, typecheck en productiebuild slagen na implementatie.

## Buiten scope van deze versie

- officiële Booking.com Connectivity Partner-onboarding;
- prijzen, minimumverblijf of restricties naar Booking.com sturen;
- Booking.com-betaalgegevens verwerken;
- meerdere identieke units binnen één Booking.com-kamertype afzonderlijk beheren;
- automatisch verplaatsen of annuleren van een bestaande Booking.com-reservering;
- bepalen of omzeilen van commissie voor reserveringen die via Booking.com zijn gemaakt;
- realtime garanties voor externe ICS-providers;
- Google Calendar- of Outlook-OAuth.

## Deployment

Pas na de bestaande Booking Engine-migraties toe:

1. `supabase/migrations/20260802120000_add_calendar_interoperability.sql` als fase 4 nog niet op het doelproject staat;
2. `supabase/migrations/20260822130000_service_calendar_connections.sql` voor service- en providergerichte koppelingen.

Server-side environment variables:

- `CALENDAR_SECRET_KEY`: verplicht in productie; gebruik een stabiel willekeurig geheim van minimaal 32 bytes en wijzig dit niet zonder een geplande herencryptiemigratie;
- `CRON_SECRET`: bestaand geheim voor de cronroute;
- `CALENDAR_SYNC_INTERVAL_MINUTES`: optioneel, standaard `60`, toegestaan `15` tot `1440`;
- `CALENDAR_SYNC_RETRY_MINUTES`: optioneel, standaard `15`, toegestaan `5` tot `360`;
- `NEXT_PUBLIC_PLATFORM_DOMAIN`: bestaand platformdomein voor gegenereerde exportlinks.

Zonder expliciete `CALENDAR_SECRET_KEY` gebruikt de server tijdelijk `SUPABASE_SERVICE_ROLE_KEY` als compatibiliteitsfallback. Configureer voor productie een afzonderlijke sleutel.

`vercel.json` gebruikt eenmaal per dag `15 2 * * *`, zodat een Vercel Hobby-deployment geldig blijft. Voor de gewenste synchronisatie rond vijftien minuten is Vercel Pro/Enterprise of een externe scheduler nodig. Laat die scheduler `GET /api/cron/calendar-sync` met `Authorization: Bearer <CRON_SECRET>` uitvoeren en wijzig bij Vercel Pro de cronexpressie naar `*/15 * * * *`.

Nieuwe URL's worden direct versleuteld. Bestaande plaintext fase-4-bronnen worden bij hun eerstvolgende synchronisatie automatisch met de nieuwe sleutel versleuteld. Controleer na rollout dat geen legacybron door een ontbrekende of verkeerde sleutel in foutstatus blijft staan.

## Uitgevoerde implementatievolgorde

1. [x] Provider- en servicekoppeling toegevoegd aan de bestaande import- en exporttabellen; migratie en `supabase/init.sql` gelijk gehouden.
2. [x] De bestaande import-RPC vult de gekozen `service_id` en samengestelde foreign keys bewaken business/service-integriteit.
3. [x] URL-opslag, DNS-rebindingbescherming en privacy-normalisatie van externe titels verhard.
4. [x] Providergerichte exports gebouwd met servicefilter, bronuitsluiting, generieke titel en all-day verblijfsdatums.
5. [x] De cron van wekelijks naar dagelijks gewijzigd voor Vercel Hobby en interne intervallen configureerbaar gemaakt.
6. [x] Booking.com- en Google-installatiewizards per accommodatie gebouwd en zichtbaar gemaakt.
7. [x] Gedragstests, regressietests, lint, typecheck en productiebuild uitgevoerd.
8. [ ] Live Supabase, twee accounts, twee accommodaties en echte providerfeeds valideren na deployment.

## Opleveringschecklist

Leg bij deployment vast:

1. een korte samenvatting van de gebouwde uitbreiding;
2. een lijst met gewijzigde bestanden;
3. database-migraties en deploymentvolgorde;
4. benodigde environment variables zonder geheime waarden;
5. uitgevoerde tests en resultaten;
6. bekende provider- en synchronisatiebeperkingen;
7. een handmatige testprocedure voor één en twee accommodaties;
8. instructies om Vercel Cron, Supabase RLS en tokenrotatie live te controleren.
