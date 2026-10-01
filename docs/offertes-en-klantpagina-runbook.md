# Offertes en klantpagina: beheer en uitrol

## Wat is gebouwd

- `/editor/quotes`: offertes zoeken en filteren, pagineren, concepten bewerken, PDF-preview, versies aanbieden/intrekken, e-mailen en klantreacties bekijken.
- Knoppen in Aanvragen, Kalender en Reserveringen om een offerte vanuit de bestaande aanvraag/afspraak te openen. Een afspraak blijft behouden. Geïmporteerde, geblokkeerde, geannuleerde en afgeronde agenda-items zijn geen omzetbron.
- Vanuit een akkoord: beschikbare afspraak plannen of gekoppelde afspraak openen, daarna één gekoppelde conceptfactuur maken. Nieuwe planning gebruikt de bestaande beschikbaarheidsberekening en controleert capaciteit en actieve holds opnieuw onder dezelfde servicelock als online boekingen.
- `/aanvraag`: een persoonlijke pagina per dossier met offerte, voortgang, afspraak, gedeelde berichten, uitgegeven facturen en handmatige betaalstatus. Geen overzicht op basis van e-mailadres.
- Nederlandse, Engelse, Duitse en Franse klantinterface en belangrijkste klantmails. Vrije offerteteksten worden door de ondernemer geschreven; ze worden niet automatisch vertaald.
- Persoonlijke links via URL-fragment, beperkte HttpOnly-sessie, intrekking en een aanvullende e-mailcode voor akkoord/afwijzen. De legacy vorm `/aanvraag/[token]` wisselt een token eveneens in voor een sessie.
- Ontvangstbevestiging met klantlink is per bedrijf opt-in. Handmatig versturen blijft mogelijk vanuit Aanvragen. Berichten delen op de klantpagina verstuurt op zichzelf geen e-mail.

## Implementatiekeuzes

- Een dossier heeft één offerte met meerdere versies. Een werkconcept vervangt het actieve aanbod pas bij aanbieden. Geaccepteerde versies blijven historisch geaccepteerd.
- PDF-bytes worden bij aanbieden **atomair in de private database** opgeslagen (`quote_versions.pdf_base64`) met SHA-256 van de PDF. Dit vervangt het aanvankelijk voorgestelde aparte opslagpad voor offertes en voorkomt een aangeboden versie zonder bijbehorend bestand. De bestaande factuur-PDF-opslag blijft ongewijzigd. Bewaak databasegrootte bij veel grote offertes.
- Offertenummers zijn globaal unieke nummers met prefix `O-`; versies krijgen `v1`, `v2`, enzovoort. Factuurnummering blijft via de bestaande bedrijfsgebonden nummerreeksen lopen.
- Offertemutaties gebruiken het bestaande recht `booking_management` van Booking & Facturatie, inclusief het bestaande tijdelijke gratis-toegangsbeleid. Geen nieuw betaald tarief. Eigenaren kunnen bestaande offertes blijven lezen zonder mutatierecht. Klanten met geldige toegang kunnen gedeelde documenten blijven lezen onafhankelijk van abonnementswijzigingen.
- Mailpogingen worden duurzaam geregistreerd. Geen automatische retries na een onzekere SMTP-uitkomst. De eigenaar controleert en verstuurt zo nodig opnieuw; een mislukte mail trekt het aanbod niet in.
- De klantlink is 90 dagen geldig, de sessie maximaal 24 uur en de besliscode 10 minuten met maximaal vijf pogingen. Nieuwe links maken oude links niet automatisch ongeldig; gebruik eerst **Klanttoegang intrekken** als dat nodig is.
- Zelf toegang herstellen op basis van alleen een opgegeven e-mailadres is niet beschikbaar. De ondernemer kan na controle een nieuwe link versturen. Een gewijzigd contactadres trekt de bestaande toegang in.
- Bij gekoppelde afspraken blijven bestaande wijzigings-/annuleerlinks beschikbaar. Op de dossierpagina kan de klant een wijzigingsvraag stellen via berichten; deze wijzigigt de planning niet rechtstreeks.

## Configuratie en volgorde

1. Gebruik een geïsoleerde Supabase-testomgeving en testmailboxen. Maak vóór productie-upgrade een passende databaseback-up.
2. Pas `supabase/migrations/20260929120000_quotes_customer_portal.sql` toe. Gebruik hiervoor nooit `supabase/init.sql`; dat is een destructieve bootstrap.
3. Stel `CUSTOMER_PORTAL_BASE_URL` in op de canonieke HTTPS-platformhost; lokaal kan `http://localhost:3000`. Gebruik geen tenant-subdomein: de bestaande tenantrouter stuurt dat naar een website.
4. Configureer de bestaande `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS` en eventueel `SMTP_FROM`. De gedeelde rate-limit-RPC moet bereikbaar zijn; fouten blokkeren nieuwe code-/mailpogingen.
5. Deploy de applicatie in de testomgeving. Offertefuncties zijn altijd beschikbaar; bestaande autorisatie en statuscontroles blijven gelden.
6. Voer onderstaande acceptatietests uit. Activeer ontvangstbevestigingen afzonderlijk per testbedrijf.
7. Pas bij geautoriseerde productie-uitrol eerst de migratie en configuratie toe en deploy daarna de applicatie. Test daar alleen met afgesproken testgegevens en ontvangers.

De lokaal geïnstalleerde Node 20.9 loopt bij de bestaande `sharp`-dependency vast tijdens de build. De productiebuild is gecontroleerd met de meegeleverde Node 24.19.0. Dit is geen aanpassing van de projectdependencies.

## Hosted acceptatietest voor vrijgave

- [ ] Maak twee testbedrijven en twee klantdossiers; verifieer scheiding via editor, klant-API en PDF-download.
- [ ] Aanvraag zonder afspraak → offerte opslaan → PDF controleren → aanbieden → e-mail met klantlink ontvangen.
- [ ] Handmatige afspraak → offerte; afspraak-ID, status en historie blijven gelijk.
- [ ] Open de klantlink op mobiel en desktop. Controleer dat het fragment uit de adresbalk verdwijnt, analytics uitblijft en documenten niet publiek gecachet worden.
- [ ] Accepteer/afwijs met code uit de juiste mailbox. Controleer verkeerd adres, verlopen code, vijf foutieve pogingen, ingetrokken link en twee gelijktijdige beslissingen.
- [ ] Maak een nieuwe versie; oude aangeboden versie kan niet meer worden geaccepteerd. Een eerder akkoord blijft aantoonbaar bewaard.
- [ ] Plan een beschikbaar tijdvak na akkoord. Een bezet/geblokkeerd tijdvak of actieve hold verhindert dubbele planning.
- [ ] Maak conceptfactuur, controleer gegevens/btw, geef uit en verstuur. Controleer PDF, klantweergave, betaalstatus en creditfactuur.
- [ ] Simuleer SMTP-fout. Aanvraag en offerte blijven opgeslagen; editor toont verzendprobleem; handmatige retry maakt geen nieuwe offerteversie.
- [ ] Controleer NL/EN/DE/FR, lange klantnamen, 320/390 px en toetsenbordbediening.
- [ ] Test bestaande boekingslinks en gedeelde documenten. Controleer dat mutaties zonder geldige klanttoegang of eigenaarsrechten worden geweigerd.

## Beheer

**Verzending mislukt of onzeker:** controleer de doelmailbox en mailprovider eerst. Het offerteoverzicht toont verzendstatus. Een vastgelopen `sending`-poging kan na tien minuten opnieuw worden gestart. Behandel een onzekere uitkomst niet als bewijs dat er niets is verstuurd.

**Verkeerd klantadres:** corrigeer het adres via de offerte-editor, waardoor links/sessies worden ingetrokken. Een definitieve offerte-PDF wordt niet aangepast; maak indien nodig een nieuwe versie. Verstuur een nieuwe klantlink na controle.

**Offerte verlopen:** de server weigert akkoord zodra de geldigheid verstrijkt; geen cron nodig. Maak een nieuwe versie en bied die bewust aan.

**Geen factuur mogelijk:** controleer of de offerte is geaccepteerd en precies één bevestigde/afgeronde afspraak is gekoppeld. Een al aanwezige factuur moet eerst worden geopend/beoordeeld; maak niet blind een tweede factuur.

**Archiveren/verwijderen:** archiveren in Aanvragen verwijdert geen offertehistorie en trekt klanttoegang niet vanzelf in. Trek toegang expliciet in wanneer een dossier niet langer gedeeld mag worden. Verwijder geen gekoppelde offertes of facturen als reparatiemiddel. Stel operationele bewaartermijnen vast vóór brede uitrol; plan daarna een gecontroleerde opschoning van verlopen sessies/codes en oude mailpogingen. Een accountverwijdering blijft een afzonderlijke bestaande procedure die met de nieuwe relaties in de testomgeving moet worden gecontroleerd.

**Terugdraaien:** deploy een eerdere applicatieversie die compatibel is met het huidige databaseschema, of voer een gerichte reparatie uit. Behoud tabellen, documenten, bestaande klanttoegang en audit. Geen destructieve rollback.

## Lokale bewijslast

- De volledige bestaande testset plus alle offerte- en PDF-tests slaagden (239 tests, 30 september 2026).
- Aanvullende tests verifiëren ingetrokken toegang, toegang tussen dossiers, pogingenlimiet, verlopen offertes en service-role-rechten.
- PDF-tests genereren lange offertes met meerdere pagina's; taaltests controleren alle klanttekstsleutels.
- SQL-bootstrap draait tweemaal en vergelijkt foreign keys; de migratie is ook afzonderlijk op het bestaande schema getest.
- TypeScript en gerichte ESLint-controles slagen; de productiebuild slaagt met Node 24.
- Browsercontrole via Edge/Playwright: `/aanvraag` en ongeldige links tonen geen dossiergegevens, `no-store` en `no-referrer` zijn aanwezig, `/editor/quotes` vraagt inloggen, geen JavaScriptfouten of mobiele horizontale overflow.
- De ingelogde volledige browserflow, echte Supabase-migratie, e-mailbezorging en productie-uitrol zijn hiermee niet bewezen of uitgevoerd.
