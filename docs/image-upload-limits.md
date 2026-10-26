# Afbeeldingen, GIF's en video's uploaden

- De afbeeldingsbibliotheek, sectie-afbeeldingskiezer en FlexStart-logo-upload accepteren bestanden boven 5 MB. De browser comprimeert ze vóór de upload, zonder delen van de afbeelding af te snijden.
- De opgeslagen afbeelding blijft maximaal 5 MiB (5 × 1024 × 1024 bytes). De browser richt op maximaal 4.000.000 bytes om ruimte voor het voorbeeld en multipartvelden te houden binnen de [Vercel-requestlimiet van 4,5 MB](https://vercel.com/docs/functions/limitations#request-body-size).
- JPG-, PNG- en WebP-afbeeldingen groter dan 4000 pixels aan een zijde worden verkleind met behoud van de beeldverhouding. Eerst wordt de WebP-kwaliteit aangepast; indien nodig worden ook de afmetingen verder verkleind. Transparantie blijft behouden. Kleine bestanden blijven ongewijzigd.
- GIF-bestanden blijven bytegelijk en behouden hun animatie, tot maximaal 20 MiB. Alleen het kleine bibliotheekvoorbeeld is een stilstaand WebP-bestand.
- MP4- en WebM-video's tot maximaal 50 MiB worden via dezelfde afbeeldingsbibliotheek en kiezer toegevoegd. Een browserleesbare video (bijvoorbeeld MP4/H.264) is nodig voor het maken van het voorbeeld. Er is geen servertranscodering en geen YouTube-/Vimeo-import.
- Alleen het bibliotheekvoorbeeld wordt centraal uitgesneden tot 480 × 320 pixels. De bestaande servervalidatie, authenticatie, rate limiting en opslagbeveiliging blijven actief.
- De totale opslag is 500 MiB per account, inclusief voorbeelden en gereserveerde uploads. De bestaande databasetrigger bewaakt deze grens onder een transactielock. Er is geen afzonderlijke limiet van 100 afbeeldingen.

## Activeren

Pas de additieve migratie `supabase/migrations/20261006185918_user_image_storage_500mb.sql` toe op de bedoelde database vóór het uitrollen van de aangepaste applicatie. De migratie verandert alleen de bestaande quotafunctie; bestanden, metadata, trigger en rechten blijven behouden. `supabase/init.sql` bevat dezelfde grens voor nieuwe lokale installaties en mag hiervoor niet op een bestaande database worden uitgevoerd.

Voor GIF/video-ondersteuning moet ook `supabase/migrations/20261026112323_image_library_video_gif.sql` vóór de applicatie worden uitgerold. Deze verhoogt de bestaande bucketlimiet naar 50 MiB, voegt MP4/WebM toe aan de toegestane bestandstypen en voegt `user_images.upload_status` toe. Bestaande bestanden krijgen `ready`; gereserveerde directe uploads krijgen `pending`. Rechten en bestaande bestanden blijven behouden. Pas deze migratie toe; voer nooit `init.sql` uit op een bestaande database.

Video's en GIF's boven 4.000.000 bytes gaan rechtstreeks naar de bestaande Supabase-bucket via [tijdelijke uploadlinks](https://supabase.com/docs/reference/javascript/storage-from-createsigneduploadurl). De bestaande `/api/images/upload` reserveert eerst de volledige opslagruimte en rondt daarna af met controle van bestandsgrootte, handtekening, MIME-type, voorbeeld en eigenaar. Alleen kleine JSON-aanvragen lopen door de applicatieserver. Normale afbeeldingen houden de bestaande multipart-upload. In de bibliotheek verschijnen alleen afgeronde bestanden. Een late annulering verwijdert nooit een afgerond bestand. Oude onafgeronde reserveringen worden bij een volgende upload na 150 minuten opgeruimd; opruiming van opslag is bij een providerfout best effort.

In de bestaande afbeeldingsvelden blijven URL's opgeslagen. GIF's worden als afbeeldingen weergegeven; `.mp4`/`.webm`-adressen krijgen een inline videospeler. Voor geüploade video's wordt het opgeslagen WebP-voorbeeld als poster gebruikt. Video-achtergronden zijn stil en herhalend, hebben een afspeel-/pauzeknop en respecteren `prefers-reduced-motion`. Voorbeelden en logo's gebruiken een stille posterweergave. Er zijn geen pagina's of nieuwe routes toegevoegd. Externe URL-imports houden hun bestaande afbeeldingsdownloadlimieten.

## Controle

`node --test tests/user-images.test.mjs tests/user-image-quota.test.mjs tests/image-validation.test.mjs tests/import-create.test.mjs tests/sql-bootstrap.test.mjs tests/production-readiness.test.mjs` controleert onder andere het verwijderen van de bronbestandlimiet, compressie vóór uploaden, exact 500 MiB inclusief voorbeelden, afwijzing van een extra byte, behoud van bestaande metadata en het vrijmaken van ruimte na verwijderen.

Lokaal gecontroleerd op 6 oktober 2026: alle 23 gerichte tests, TypeScript en ESLint voor de gewijzigde bestanden slagen. Een Chrome-test met echte canvasencoding comprimeerde een PNG van 18.682.455 naar 3.606.792 bytes en een transparante PNG van 10.534.484 naar 3.913.634 bytes. Beeldverhouding en transparantie bleven behouden; de volledige multipartaanvragen bleven onder 4,5 MB. Een afbeelding van 10.000 × 2.000 werd 4.000 × 800; een kleine PNG bleef bytegelijk. Deze browsercontrole gebruikte lokale bestanden en geen hosted upload. De migratie is lokaal op PGlite getest en nog niet op een hosted database toegepast.

Controleer na activering in de doelomgeving:

```sql
select pg_get_functiondef('public.enforce_user_image_quota()'::regprocedure);
select id, file_size_limit from storage.buckets where id = 'user-images';
```

De quotafunctie moet `524288000` bevatten en de bucketlimiet `52428800`. Upload vervolgens via de bibliotheek en sectie-afbeeldingskiezer een foto groter dan 5 MB, een bewegende GIF en een video groter dan 4,5 MB. Controleer de animatie, poster, spelerbediening, achtergrondpauze, mobiele weergave en opslagruimte. Controleer ook uitloggen, een vervalste bestandsinhoud, een overschreden quota en een mislukte upload. Lokale tests bewijzen geen geslaagde hosted upload.

Media-uitbreiding: `tests/media-upload.test.mjs` controleert de echte lokale metadata-/quotafuncties, eigenaarsscheiding, dubbele afronding en veilige annulering met gesimuleerde objectopslag. `tests/user-images.test.mjs` controleert GIF-behoud en de rechtstreekse video-upload met een gesimuleerde browserdecoder. `tests/section-composition-render.test.mjs` rendert de echte GIF-, video- en achtergrondcomponenten. Echte browserdecodering, hosted opslag en publicatie moeten na migratie en uitrol in de doelomgeving worden gecontroleerd.
