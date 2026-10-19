# Boekingsadd-on: oplevering en verificatie

Datum: 19 oktober 2026.

## Wat is gebouwd

- Dienstenbeheer met Opties en Beschikbaarheid: varianten, extra's, compatibiliteit, weekroosters, datumuitzonderingen en gedeelde agenda's.
- Een aanpasbare ‘Jouw boeking’ in de bestaande diensten-sectie: selectie, volgorde, serverberekende tijden/totaal en één klantformulier.
- Eén boekingsgroep met afzonderlijke agendaonderdelen, één klantlink, groepsstatus/annulering/verplaatsing en één financiële snapshot voor de bestaande factuurflow.
- Toegangscontrole via de bestaande boekingsadd-on, met hercontrole bij bevestiging. Betaling blijft rechtstreeks met de ondernemer.

De eerste versie plant onderdelen aansluitend op één dag. Losse dagen, gedeeltelijke annulering en meerdere vereiste bronnen per onderdeel blijven een vervolgfase.

## Lokale controles

- TypeScript: `npm run typecheck` geslaagd.
- ESLint op alle gewijzigde en nieuwe TypeScript-bestanden en nieuwe tests: geslaagd.
- Volledige regressiesuite: 335 tests, waarvan 333 geslaagd en één optionele test overgeslagen. Eén controle trof het verwijderde `.env.example` tijdens de run; na herstel zijn alle negen tests uit `production-readiness.test.mjs` opnieuw geslaagd. De eerdere vergelijking van migratie en bootstrap is na normalisatie van regeleinden eveneens opnieuw geslaagd. Er zijn na deze gerichte hercontroles geen resterende testfouten.
- `npm run test:booking-cart`: acht gedragstests geslaagd. De optionele PostgreSQL-test slaat zonder testdatabase bewust over.
- De PostgreSQL-test is daarnaast apart op een tijdelijke native PostgreSQL 18.4-database uitgevoerd met twee onafhankelijke verbindingen: geslaagd. De tweede bezoeker wacht op de transactievergrendeling en kan de laatste plek niet alsnog reserveren. Twee bevestigingen van dezelfde hold geven dezelfde groep, twee agendaonderdelen, één financieel record en één klantbericht.
- De daadwerkelijke migratie is getest op atomische opslag, rollback als het laatste onderdeel bezet is, groepsverplaatsing/annulering, verouderde beheeracties, vaste brontoewijzing, RLS, minimale grants, conflicterende planningswijzigingen en vervallen add-ontoegang.
- `supabase/init.sql` is tweemaal achter elkaar op een lege lokale PGlite-database uitgevoerd: geslaagd. Alleen Supabase Auth/Storage zijn gestubd en de pgcrypto-installatie is vervangen door de ingebouwde UUID-functie.
- Browserpreview op desktop en 390px breedte: combinatie 65 + 30 minuten, extra selecteren, tijden kiezen, contactgegevens, gesimuleerde bevestiging, aangepaste titel/knopstijl, verborgen prijzen en overzicht onderaan op mobiel gecontroleerd. Geen horizontale overflow. De preview maakt geen echte boekingen of e-mails aan.

Afbeeldingen van de lokale preview staan in `artifacts/booking-cart/desktop.png` en `artifacts/booking-cart/mobile.png`. Testuitvoer staat in dezelfde, door Git genegeerde map.

## Ingebruikname

1. Pas **eerst** `supabase/migrations/20261019090552_booking_cart_and_service_planning.sql` toe via het normale migratieproces. De bestaande publieke boekingsroutes gebruiken daarna ook de gedeelde planningsgegevens. Gebruik `init.sql` uitsluitend voor een bewuste volledige database-reset.
2. Rol de bijbehorende appcode uit. Bestaande enkelvoudige boekingen en verblijven houden hun bestaande interface; de nieuwe boekingslijst wordt per sectie ingeschakeld.
3. Stel bij Diensten → Opties expliciete prijzen en duur in en activeer boekbare opties. Stel bij Beschikbaarheid online boeken, het rooster en eventueel een gedeelde agenda in. Vrije prijsbeschrijvingen worden niet automatisch omgerekend.
4. Kies in de website-editor bij de diensten-sectie Boekingsruimte → Weergave → Beschikbaarheid. Schakel ‘Meerdere diensten en opties samen laten boeken’ in en pas ‘Jouw boeking’ aan. Publiceer daarna de website.
5. Controleer op de verbonden omgeving een echte boeking, ontvangen bevestigingsmail, klantbeheerlink en factuur. Controleer ook dat conceptopties pas na publiceren zichtbaar zijn en een directe uitschakeling van boeken meteen geldt.

Er is lokaal geen verbonden Supabase-/mailomgeving geconfigureerd. De migratie is niet op productie toegepast en de echte publieke API → Supabase → e-mailketen is daarom nog niet volledig gecontroleerd. De browsercontrole en SQL-transactietests zijn afzonderlijke controles.

De optionele gelijktijdigheidstest staat in `tests/booking-cart-concurrency.test.mjs`. Hij vereist `BOOKING_TEST_DATABASE_URL`, een beschikbare `pg`-driver (eventueel via `BOOKING_TEST_PG_MODULE`) en weigert een database met bestaande tabellen in `public` of `auth`.
