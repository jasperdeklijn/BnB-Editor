# Afbeeldingen uploaden en opslag

- De afbeeldingsbibliotheek, sectie-afbeeldingskiezer en FlexStart-logo-upload accepteren bestanden boven 5 MB. De browser comprimeert ze vóór de upload, zonder delen van de afbeelding af te snijden.
- De opgeslagen afbeelding blijft maximaal 5 MiB (5 × 1024 × 1024 bytes). De browser richt op maximaal 4.000.000 bytes om ruimte voor het voorbeeld en multipartvelden te houden binnen de [Vercel-requestlimiet van 4,5 MB](https://vercel.com/docs/functions/limitations#request-body-size).
- Afbeeldingen groter dan 4000 pixels aan een zijde worden verkleind met behoud van de beeldverhouding. Eerst wordt de WebP-kwaliteit aangepast; indien nodig worden ook de afmetingen verder verkleind. Transparantie blijft behouden. Kleine bestanden blijven ongewijzigd. Een gecomprimeerde GIF wordt een stilstaande afbeelding.
- Alleen het bibliotheekvoorbeeld wordt centraal uitgesneden tot 480 × 320 pixels. De bestaande servervalidatie, authenticatie, rate limiting en opslagbeveiliging blijven actief.
- De totale opslag is 500 MiB per account, inclusief voorbeelden. De bestaande databasetrigger bewaakt deze grens onder een transactielock en telt de daadwerkelijk opgeslagen bytes. Er is geen afzonderlijke limiet van 100 afbeeldingen.

## Activeren

Pas de additieve migratie `supabase/migrations/20261006185918_user_image_storage_500mb.sql` toe op de bedoelde database vóór het uitrollen van de aangepaste applicatie. De migratie verandert alleen de bestaande quotafunctie; bestanden, metadata, trigger en rechten blijven behouden. `supabase/init.sql` bevat dezelfde grens voor nieuwe lokale installaties en mag hiervoor niet op een bestaande database worden uitgevoerd.

De bucketlimiet blijft 5 MiB per bestand; de [Supabase-bestandslimiet](https://supabase.com/docs/guides/storage/uploads/file-limits) staat los van de totale accountopslag. Externe URL-imports houden hun bestaande downloadlimieten, maar gebruiken ook de nieuwe totale accountquota.

## Controle

`node --test tests/user-images.test.mjs tests/user-image-quota.test.mjs tests/image-validation.test.mjs tests/import-create.test.mjs tests/sql-bootstrap.test.mjs tests/production-readiness.test.mjs` controleert onder andere het verwijderen van de bronbestandlimiet, compressie vóór uploaden, exact 500 MiB inclusief voorbeelden, afwijzing van een extra byte, behoud van bestaande metadata en het vrijmaken van ruimte na verwijderen.

Lokaal gecontroleerd op 6 oktober 2026: alle 23 gerichte tests, TypeScript en ESLint voor de gewijzigde bestanden slagen. Een Chrome-test met echte canvasencoding comprimeerde een PNG van 18.682.455 naar 3.606.792 bytes en een transparante PNG van 10.534.484 naar 3.913.634 bytes. Beeldverhouding en transparantie bleven behouden; de volledige multipartaanvragen bleven onder 4,5 MB. Een afbeelding van 10.000 × 2.000 werd 4.000 × 800; een kleine PNG bleef bytegelijk. Deze browsercontrole gebruikte lokale bestanden en geen hosted upload. De migratie is lokaal op PGlite getest en nog niet op een hosted database toegepast.

Controleer na activering in de doelomgeving:

```sql
select pg_get_functiondef('public.enforce_user_image_quota()'::regprocedure);
select id, file_size_limit from storage.buckets where id = 'user-images';
```

De quotafunctie moet `524288000` bevatten en de bucketlimiet `5242880`. Upload vervolgens via de bibliotheek en sectie-afbeeldingskiezer een foto groter dan 5 MB. Controleer dat de upload slaagt, de afbeelding volledig zichtbaar blijft en het opslaggebruik overeenkomt met origineel plus voorbeeld. Lokale tests bewijzen geen geslaagde hosted upload.
