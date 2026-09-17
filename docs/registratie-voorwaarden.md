# Akkoord met de voorwaarden bij registratie

Nieuwe gebruikers moeten vóór ‘Account aanmaken’ het lege verplichte vakje aanvinken. De leeslink opent in een nieuw tabblad, zodat formulierinvoer behouden blijft. De download is een versiegebonden UTF-8-tekstbestand, ook bereikbaar vanaf de voorwaardenpagina.

De client stuurt uitsluitend `terms_accepted: true` en `terms_version` mee aan Supabase Auth. De migratie `20260917120000_signup_terms_acceptance.sql` controleert die waarden bij iedere nieuwe `auth.users`-rij. Ontbrekend akkoord, een string in plaats van een boolean en een ongeldige/oude versie laten de hele registratie terugrollen. Dit geldt ook voor directe Auth-API-aanroepen, toekomstige OAuth-registraties en administratief aangemaakte accounts: zulke alternatieve flows moeten eerst een expliciete akkoordstap krijgen; verzin geen akkoord namens een gebruiker.

`public.user_terms_acceptances` bewaart gebruikers-ID, versie, database-tijdstip en bron. Gebruikers kunnen alleen hun eigen bewijs lezen en het niet aanpassen of verwijderen. Wijzigingen in Auth-profielmetadata veranderen dit bewijs niet. Verwijdering van het Auth-account verwijdert het bijbehorende akkoord. De accountexport neemt het akkoord mee.

Bestaande accounts blijven intact en krijgen geen achteraf verzonnen akkoord. Een eventuele heracceptatie voor bestaande klanten valt buiten deze registratieflow.

## Uitrollen

1. Vul de nog bestaande bedrijfsplaceholders in en rond beoordeling van de juridische tekst af. Maak bij tekstwijzigingen een nieuwe versie volgens onderstaande stappen.
2. Rol de app en de niet-destructieve migratie gecoördineerd uit, zo nodig tijdens een korte registratiepauze. De oude app stuurt geen akkoord mee en kan na de migratie niet meer registreren; de nieuwe app op een database zonder migratie legt nog geen afzonderlijk akkoordbewijs vast. Gebruik `init.sql` niet voor een bestaande database.
3. Test met een geautoriseerd nieuw testaccount: registratie zonder akkoord faalt, met akkoord slaagt, de bevestigingsmail werkt en precies één bewijsregel bevat de juiste versie en een actueel databasetijdstip. Bevestiging van e-mail is geen tweede akkoordmoment.
4. Controleer eigenaarstoegang, afscherming voor andere gebruikers, de accountexport en behoud van het bewijs na een profielwijziging. Test ook de publieke download zonder login.

## Een volgende versie publiceren

- Pas `lib/legal/terms.ts` aan en verhoog `TERMS_VERSION` in `lib/legal/terms-version.ts`.
- Genereer de nieuwe download met `node scripts/export-terms.mjs`. Dit script weigert bestaande archieven met andere inhoud te overschrijven. Bewaar oude downloads.
- Voeg een migratie toe die de geaccepteerde versie in `record_signup_terms_acceptance()` bijwerkt en houd de bootstrap gelijk. Verander eerdere bewijsregels niet.
- Voer `tests/signup-terms.test.mjs` en `tests/sql-bootstrap.test.mjs` uit, naast lint en typecheck. Informeer bestaande klanten zoals de voorwaarden vereisen.

Lokale SQL-tests gebruiken PGlite; die bewijzen geen toegepaste Supabase-migratie of aflevering van bevestigingsmail.
