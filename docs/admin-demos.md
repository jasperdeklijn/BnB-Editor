# Demowebsites

Beheerders openen **Beheer → Demowebsites** (`/admin/demos`). Upload een editor-export of FlexPagina JSON-bestand (versie 1 of 2, maximaal 2 MB), controleer naam en subdomein en open het desktop- of mobiele voorbeeld. Vervolgens kan de demo live worden gezet of als concept worden opgeslagen. Bestaande demo’s kunnen worden bekeken, gepubliceerd, offline gehaald en verwijderd. Live links kunnen worden gekopieerd.

## Vanuit de editor

1. Open het gewenste ontwerp en kies **Ontwerpen beheren → Exporteren voor demo**. Op mobiel staat dezelfde actie onder **Meer website-acties**.
2. Wacht tot het JSON-bestand is gedownload. Openstaande sectiewijzigingen worden eerst opgeslagen; de export bevat alle opgeslagen pagina’s, gedeelde onderdelen, sectietypes, stijlen, thema en overgangen. De export gebruikt de basisinhoud van het ontwerp; taalvarianten worden niet meegenomen.
3. Upload het bestand bij **Beheer → Demowebsites**, bekijk het voorbeeld en sla het op als concept of zet het live.

De editor gebruikt het aparte formaat `flexpagina-editor` versie 1, bedoeld voor de demo-uploader. Het beperkte, handgeschreven importformaat blijft ondersteund. Aanbodkaarten worden als vaste inhoud meegenomen; klantwebsite-ID’s, bedrijfsverwijzingen, formulierbestemmingen en boekingscatalogi worden verwijderd. Pagina- en sectieverwijzingen krijgen nieuwe ID’s, inclusief knoppen en navigatielinks. Er is geen nieuwe databasemigratie nodig voor dit exportformaat.

## Opslag en publicatie

- Installeer `supabase/migrations/20261014121210_admin_demo_websites.sql` vóór gebruik en deploy daarna de applicatie.
- De bestaande Supabase-serverconfiguratie en `SUPABASE_SERVICE_ROLE_KEY` zijn nodig voor beheer. Beheertoegang gebruikt dezelfde `app_metadata.role` / `ADMIN_EMAILS`-controle als de rest van het portaal.
- Demo’s staan in `demo_websites`, los van klantwebsites, bedrijfsgegevens, abonnementen en de limiet op live klantwebsites. Meerdere demo’s kunnen gelijktijdig live staan.
- Het adres is `https://demo-naam.<NEXT_PUBLIC_PLATFORM_DOMAIN>`. De bestaande wildcard-DNS, TLS en subdomeinrouting worden hergebruikt; er wordt geen extra DNS-record per demo aangemaakt. De directe route `/site/demo-naam` werkt ook, inclusief gepubliceerde subpagina’s.
- `demo-` is gereserveerd voor nieuwe demo’s. De database weigert dubbele demonamen en demo’s met een bestaand klant-subdomein. Bestaande klantwebsites die al met `demo-` beginnen blijven werken en kunnen hun bestaande slug behouden.
- De publicatie bevat alleen Home, pagina’s met `includeInPublication: true` en gedeelde header/footer. Uitgesloten pagina’s staan alleen in de beheerweergave. Publieke databaselezers krijgen uitsluitend gepubliceerde inhoud; bronbestandsnamen, auteurs en volledige concepten zijn niet toegankelijk.
- Offline halen en verwijderen maken zowel het subdomein als de directe route ontoegankelijk. Demo’s krijgen `noindex, nofollow`, geen sitemap en een blokkerende robots.txt via de bestaande website-routes.
- Afbeeldingen blijven verwijzen naar de HTTPS-bronnen uit de JSON-export. Ze worden niet gekopieerd naar een klantaccount; zorg dat de bronafbeeldingen beschikbaar blijven.
- Handgeschreven imports gebruiken de bestaande importvalidator; editor-exports ondersteunen alle huidige sectietypes en behouden de editorinhoud en lay-outs. Een import maakt een zelfstandig demo-ontwerp; er worden geen boekingen of klantaccounts aangemaakt. Zichtbare ontwerpinhoud, zoals contactgegevens, blijft onderdeel van de demo.

## Verificatie

`node --test tests/demo-export.test.mjs tests/demo-websites.test.mjs tests/demo-api.test.mjs` controleert exportautorisatie, volledige gepagineerde ontwerpdata, verwijzingen en stijlen na import, de echte migratie met PGlite, databaseprivileges en RLS, subdomeinconflicten, publicatie van pagina’s, beheerautorisatie, JSON-validatie, herhaalde uploads en de volledige API-levenscyclus. Voer daarnaast typecheck, lint en build uit.

Na installatie op de doelomgeving: exporteer een ontwerp vanuit de editor, log in als beheerder, upload de export, bekijk het voorbeeld, publiceer en open het HTTPS-subdomein zonder beheersessie. Controleer een multipage-export met een uitgesloten pagina, haal de demo offline en controleer dat beide openbare URL’s niet meer werken. Controleer ook een bestaande klantwebsite. Een hosted browsertest vereist de configuratie, een beheersessie en de geïnstalleerde migratie.
