# Productie-inloggen herstellen

De gedeelde limiter gebruikte `current_time` als PL/pgSQL-variabele. PostgreSQL
interpreteert deze naam in SQL als `CURRENT_TIME` (tijd zonder datum), waardoor
`check_rate_limit` bij een aanroep faalde met foutcode `42804`. Productie weigert
inloggen als de limiter onbeschikbaar is; localhost heeft een lokale terugval.
De loginroute gaf voor beide situaties dezelfde melding over te veel pogingen.

Daarnaast stond er letterlijk `\n+` vóór het readiness-blok in `supabase/init.sql`,
wat het uitvoeren van het script blokkeerde met syntaxfout `42601`.

## Bestaande productieomgeving

1. Voer `supabase/migrations/20260909130000_repair_rate_limit.sql` uit in de
   Supabase SQL Editor van het productieproject. Deze migratie behoudt bestaande
   data en tellers, vervangt de defecte functie en installeert de limiter ook als
   die nog ontbreekt. Ze vraagt PostgREST zijn schema-cache te vernieuwen.
2. Controleer dat `NEXT_PUBLIC_SUPABASE_URL` en `SUPABASE_SERVICE_ROLE_KEY` in de
   productieomgeving bij hetzelfde Supabase-project horen. Deel de sleutel niet
   en gebruik hiervoor geen `NEXT_PUBLIC_`-sleutel.
3. Deploy de aangepaste applicatie. Een limiterstoring krijgt nu HTTP 503 met
   “Inloggen is tijdelijk niet beschikbaar”; een werkelijk overschreden limiet
   blijft HTTP 429. Beide geven een `Retry-After`-header.
4. Controleer één echte login. Bij 503: bekijk de serverlogs met `[rate-limit]`;
   controleer de migratie, databasebeschikbaarheid en productieconfiguratie.

Gebruik **niet `init.sql` op de bestaande productiegegevens**: dit is een
destructief herbouwscript. De herstelmigratie vervangt niet de overige onderdelen
van nog niet uitgevoerde readiness-migraties.

## Lokale controle

`pnpm test` voert de volledige bootstrap uit in een geïsoleerde PostgreSQL-engine
(PGlite) met minimale Auth/Storage-fixtures. De tests controleren de eerste acht
toegestane pogingen, de negende blokkade, verlopen vensters, rechten, herhaald
toepassen van de herstelmigratie en installatie bij een ontbrekende limiter.
Dit bewijst geen uitgevoerde productiemigratie of geslaagde live login.
