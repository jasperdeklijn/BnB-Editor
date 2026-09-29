# FlexStart — beheerde websiteovername

FlexStart gebruikt de bestaande procedure voor URL-naar-JSON en de bestaande importer. Een beheerder maakt een nieuw, bewerkbaar concept in het klantaccount. De bronwebsite wordt niet automatisch uitgelezen. De geïmporteerde JSON wordt niet permanent bewaard; er is geen afzonderlijk versiesysteem toegevoegd.

## Aanbod en toegang

- De eerste 100 klantaccounts kunnen één gratis overstap aanvragen, inclusief persoonlijke FlexReview en maximaal één correctieronde.
- De database kent de plekken atomair toe. Dubbele aanvragen kosten geen extra plek; verwijderen van een account geeft de plek niet opnieuw vrij.
- Na 100 aanvragen sluit de gratis intake. Er is geen betaalde vervolgflow of automatische afschrijving.
- Het aanbod betreft de overstapservice. Websiteabonnementen en eventuele domeinkosten vallen erbuiten.
- FlexCheck is bereikbaar voor aangemelde klanten via `/editor/flexcheck`, passend bij de huidige algemene featuretoegang. De persoonlijke reviewflow is gekoppeld aan een FlexStart-aanvraag.

## Werkwijze

1. Klant opent **Bestaande website overnemen** of `/editor/flexstart`, vult de intake in en bevestigt toestemming voor hergebruik. Een logo kan via de bestaande afbeeldingsopslag worden toegevoegd.
2. Beheerder opent `/admin/flexstart`, kiest de aanvraag en neemt deze in behandeling. Interne notities zijn uitsluitend beschikbaar voor beheerders.
3. Maak het ontwerp met de bestaande Codex-procedure en importeer het JSON-bestand vanuit de aanvraag. Controleer het voorbeeld en de toestemming vóór het aanmaken van het klantconcept. Bestaande ontwerpen blijven behouden.
4. Gebruik **Concept afronden: contact, diensten en SEO** voor native contact-, diensten-, CTA- en footersecties en SEO. Vul echte contactgegevens, dienstnamen en de juiste privacy-URL in. Bestaande diensten met dezelfde titel worden hergebruikt; prijzen worden niet verzonnen. Deze velden zijn een aanvulling op het beperkte JSON-importformaat.
5. Markeer **Klaar voor klant**. De klant ziet een melding in de editor, bij het openen, terugkeren naar het venster en vervolgens iedere minuut zolang het venster zichtbaar is. Er wordt geen aparte gereedmelding per e-mail verstuurd.
6. Klant vergelijkt het bronontwerp met het nieuwe concept op desktop en mobiel. Bronwebsites laden pas na een klik en kunnen iframe-weergave blokkeren; er is een link om de bron apart te openen. Formulieren in het nieuwe voorbeeld versturen niets.
7. Klant keurt het concept goed of bundelt opmerkingen in de inbegrepen correctieronde. Na verwerking markeert de beheerder **Correcties verwerkt** en beoordeelt de klant opnieuw.
8. Klant rondt verplichte FlexCheck-punten af en verstuurt een testaanvraag. Deze verschijnt in Aanvragen; een testmail gaat naar het ingestelde formulieradres. Dit maakt geen boeking aan.
9. Klant vraagt FlexReview aan. Beheerder controleert de inhoud en mobiele weergave, bevestigt dat de klant de testmail heeft ontvangen, legt bevindingen vast en keurt de review goed.
10. Klant controleert de domeinkoppeling en publiceert. De API én een databasetrigger vereisen klantgoedkeuring, persoonlijke review en het testbewijs voor dezelfde conceptversie. Wijzigingen maken eerdere goedkeuringen ongeldig; de bestaande liveversie blijft behouden totdat opnieuw wordt gepubliceerd.

Een verwijderd gekoppeld concept zet de aanvraag terug naar **In behandeling**, zodat opnieuw importeren mogelijk blijft. Een nieuwe import maakt steeds een nieuw concept; oude concepten worden niet automatisch verwijderd.

## Wat FlexCheck bewijst

De twaalf punten tonen gereed, aanbevolen of vereist. De controle zoekt opgeslagen bedrijfs- en contactgegevens, een actieve knop met doel, een ingesteld formulier, een geselecteerde dienst, beeldverwijzingen, SEO, plaatsnaam, beschikbare mobiele preview, privacylink, domeinregistratie en een testaanvraag.

De score bewijst geen beeldkwaliteit, bereikbaarheid van alle links, juridische juistheid van een privacyverklaring of correcte DNS. Een domein met status `active` betekent hier dat het is toegevoegd; controleer de koppeling op de domeinpagina. SMTP-acceptatie bewijst nog geen ontvangst in de mailbox. De testaanvraag gebruikt opgeslagen formulierinstellingen en de aanvragen-inbox; test vóór livegang daarnaast het daadwerkelijk gepubliceerde formulier in de browser.

## Uitrollen

- [ ] Pas eerst `supabase/migrations/20260927181522_flexstart_managed_transfers.sql` toe op de bedoelde omgeving. Gebruik nooit het destructieve `supabase/init.sql` voor een bestaande database.
- [ ] Controleer dat de bestaande import-, afbeeldings-, formulierbestemmings- en draft-version-migraties aanwezig zijn.
- [ ] Controleer bestaande Supabase-configuratie, service-roletoegang en de bestaande admin-autorisatie. Er zijn geen nieuwe secrets nodig.
- [ ] Controleer `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS` en eventueel `SMTP_FROM` voor de testmail. Gebruik voor testen een geïsoleerde mailbox.
- [ ] Deploy daarna de applicatie. De publicatie-API verwacht de FlexStart-tabel; zonder migratie meldt die tijdelijk onbeschikbaar.
- [ ] Voer de onderstaande live acceptatiecontrole uit met een beheerder en twee afzonderlijke klantaccounts in een testomgeving.

## Verificatie

- [x] Geautomatiseerde intakevalidatie en twaalf FlexCheck-punten, inclusief verouderd testbewijs en niet-geselecteerde diensten.
- [x] Additieve migratie lokaal uitgevoerd in PGlite; klantisolatie, afgeschermde notities en uitsluitend servertoegang tot mutaties gecontroleerd.
- [x] Atomaire import/rollback, statusovergangen, één correctieronde, verouderde revisies en publicatieblokkades getest.
- [x] Gewijzigde inhoud of formulierontvanger maakt goedkeuringen ongeldig; verwijderd concept kan vervangen worden.
- [x] Limiet van 100 plekken, ook na accountverwijdering, getest. Bootstrap tweemaal uitgevoerd en gelijkheid met migratie gecontroleerd.
- [x] Echte UI-componenten met fictieve gegevens lokaal in de browser bekeken; mobiel 320px zonder horizontale pagina-overloop, desktoppreview en loginredirect gecontroleerd.
- [x] Volledige testsuite: 232 geslaagd. ESLint, TypeScript en productiebuild geslaagd; `git diff --check` schoon.
- [ ] Hosted Supabase-migratie, RLS en storage met echte testaccounts verifiëren.
- [ ] Volledige ingelogde flow: intake → logo-upload → adminimport → aanvullen → gereedmelding → correctie → klantakkoord → testmail → persoonlijke review → publicatie.
- [ ] Ontvangst van testmail en het gepubliceerde contactformulier controleren; domein/DNS en bereikbaarheid testen.

Lokale controles: `pnpm test`, `pnpm lint`, `pnpm typecheck` en `pnpm build`. De browsertest gebruikt geen productieaanvragen en verstuurt geen echte e-mail.
