# FlexPagina.nl — Production Readiness Checklist

## Doel

Deze checklist wordt gebruikt om FlexPagina.nl vóór de eerste serieuze productiegebruikers volledig te controleren.

FlexPagina.nl is een multi-tenant SaaS-platform waarmee klanten websites kunnen maken en publiceren. Het platform bevat onder andere:

- Website editor
- Publieke websites
- Eigen domeinen
- Subdomeinen
- Supabase authentication
- Supabase database
- Website/content management
- Booking systeem
- iCal synchronisatie
- Booking.com synchronisatie
- Google Calendar/iCal synchronisatie
- Facturen
- PDF-generatie
- Stripe betalingen
- Abonnementen
- Add-ons
- Meertaligheid
- Contactformulieren
- E-mail
- Vercel hosting

## Belangrijkste regel voor Codex

Controleer niet alleen of code "er goed uitziet".

Waar mogelijk:

1. Inspecteer de volledige codebase.
2. Zoek alle relevante database queries.
3. Controleer API-routes.
4. Controleer server actions.
5. Controleer middleware.
6. Controleer Supabase RLS.
7. Controleer authenticatie en autorisatie.
8. Controleer webhook-validatie.
9. Controleer edge cases.
10. Voer bestaande tests uit.
11. Voeg tests toe wanneer belangrijke functionaliteit nog niet getest wordt.
12. Probeer beveiligingsproblemen actief te reproduceren.
13. Controleer zowel frontend als backend.
14. Controleer productieconfiguratie.
15. Maak geen grote wijzigingen zonder duidelijke reden.

### Classificatie

Gebruik voor iedere gevonden situatie:

- `[PASS]` = gecontroleerd en correct
- `[FAIL]` = probleem gevonden
- `[PARTIAL]` = gedeeltelijk geïmplementeerd
- `[NOT TESTED]` = niet kunnen testen
- `[NOT APPLICABLE]` = niet van toepassing

Gebruik daarnaast een severity:

- `CRITICAL` = direct blokkeren voor productie
- `HIGH` = oplossen vóór betalende klanten
- `MEDIUM` = zo snel mogelijk oplossen
- `LOW` = verbetering
- `INFO` = aanbeveling

---

# 1. Architectuur & Codebase

## Algemene architectuur

- [ ] Frontend en backend verantwoordelijkheden zijn duidelijk gescheiden.
- [ ] Server-side secrets worden nooit naar de client gestuurd.
- [ ] Environment variables zijn correct gescheiden tussen server en client.
- [ ] Geen hardcoded API keys.
- [ ] Geen hardcoded Supabase service-role key in frontendcode.
- [ ] Geen Stripe secret key in clientcode.
- [ ] Geen SMTP credentials in frontendcode.
- [ ] Geen private credentials in Git.
- [ ] `.env` bestanden worden niet gecommit.
- [ ] Test/debug credentials staan niet in productiecode.
- [ ] Development-only code wordt niet uitgevoerd in productie.
- [ ] Console logging van gevoelige gegevens is verwijderd.
- [ ] TODO/FIXME items met production-impact zijn geïdentificeerd.
- [ ] Deprecated code wordt geïdentificeerd.
- [ ] Ongebruikte dependencies worden gecontroleerd.
- [ ] Dependencies bevatten geen bekende kritieke vulnerabilities.
- [ ] Next.js configuratie is geschikt voor productie.
- [ ] Vercel configuratie is geschikt voor productie.

## Error handling

- [ ] Server errors worden correct afgehandeld.
- [ ] Database errors worden niet rechtstreeks aan gebruikers getoond.
- [ ] API errors geven correcte HTTP statuscodes.
- [ ] Frontend toont gebruikersvriendelijke foutmeldingen.
- [ ] Geen stack traces zichtbaar voor bezoekers.
- [ ] Geen SQL/database informatie zichtbaar in errors.
- [ ] Geen environment variables zichtbaar in errors.
- [ ] Unexpected errors worden gelogd.
- [ ] Errors bevatten voldoende context om te debuggen.

---

# 2. Multi-Tenant Security

Dit is één van de belangrijkste controles.

Elke klant moet volledig geïsoleerd zijn van andere klanten.

## Tenant isolation

Maak minimaal twee testaccounts:

```text
User A
User B
```

Maak voor beide accounts:

```text
Website A
Website B
Booking A
Booking B
Invoice A
Invoice B
Customer A
Customer B
```

Controleer:

- [ ] User A kan Website B niet bekijken.
- [ ] User B kan Website A niet bekijken.
- [ ] User A kan Booking B niet bekijken.
- [ ] User B kan Booking A niet bekijken.
- [ ] User A kan Invoice B niet bekijken.
- [ ] User B kan Invoice A niet bekijken.
- [ ] User A kan Customer B niet bekijken.
- [ ] User B kan Customer A niet bekijken.
- [ ] User A kan data van User B niet aanpassen.
- [ ] User A kan data van User B niet verwijderen.
- [ ] User A kan data van User B niet publiceren.
- [ ] User A kan bestanden van User B niet openen.
- [ ] User A kan IDs van User B niet misbruiken via API calls.
- [ ] Directe API requests zijn beveiligd.
- [ ] Server actions controleren ownership.
- [ ] Client-side checks zijn niet de enige beveiligingslaag.

## IDOR testen

Test bijvoorbeeld:

```text
GET /api/websites/{websiteA}
```

met de authentication van User B.

Controleer dat dit wordt geweigerd.

Herhaal voor:

- [ ] Websites
- [ ] Bookings
- [ ] Invoices
- [ ] Customers
- [ ] Domains
- [ ] Files
- [ ] Images
- [ ] Subscriptions
- [ ] Payment records
- [ ] User settings

---

# 3. Supabase Security

## Authentication

- [ ] Login werkt.
- [ ] Logout werkt.
- [ ] Session expiry werkt.
- [ ] Expired sessions worden correct afgehandeld.
- [ ] Password reset werkt.
- [ ] Password reset tokens verlopen correct.
- [ ] Een gebruiker kan geen andere gebruiker impersoneren.
- [ ] Authenticated-only pagina's zijn daadwerkelijk beveiligd.
- [ ] Admin-only pagina's zijn daadwerkelijk beveiligd.

## Row Level Security

Controleer ALLE tabellen.

Voor iedere tabel:

- [ ] RLS is enabled waar nodig.
- [ ] SELECT policy is correct.
- [ ] INSERT policy is correct.
- [ ] UPDATE policy is correct.
- [ ] DELETE policy is correct.
- [ ] Ownership wordt gecontroleerd.
- [ ] `user_id`/`account_id`/tenant relationship kan niet worden gemanipuleerd.
- [ ] Een gebruiker kan geen records voor een andere tenant aanmaken.
- [ ] Een gebruiker kan geen records van een andere tenant aanpassen.
- [ ] Een gebruiker kan geen records van een andere tenant verwijderen.

Controleer specifiek:

- [ ] users/profiles
- [ ] accounts/organizations
- [ ] websites
- [ ] website sections
- [ ] bookings
- [ ] rooms/accommodations
- [ ] customers/guests
- [ ] invoices
- [ ] invoice lines
- [ ] subscriptions
- [ ] domains
- [ ] translations
- [ ] files/images
- [ ] settings
- [ ] payment records

## Service role

- [ ] Supabase service-role key wordt alleen server-side gebruikt.
- [ ] Service-role endpoints zijn niet publiek toegankelijk.
- [ ] Service-role queries controleren zelf ownership wanneer nodig.
- [ ] Geen endpoint accepteert willekeurige tenant IDs zonder authorization.

---

# 4. Account & Onboarding

## Registratie

- [ ] Nieuwe gebruiker kan account aanmaken.
- [ ] Duplicate email wordt correct afgehandeld.
- [ ] Invalid email wordt geweigerd.
- [ ] Zwakke wachtwoorden worden geweigerd indien vereist.
- [ ] Email verification werkt indien ingeschakeld.
- [ ] Onboarding wordt correct gestart.

## Onboarding

Controleer:

- [ ] Bedrijfsnaam

- [ ] Contactgegevens

- [ ] Adres

- [ ] Websitegegevens

- [ ] Logo

- [ ] Branding

- [ ] Taal

- [ ] Andere verplichte bedrijfsinformatie

- [ ] Onboarding kan niet leiden tot data van een andere klant.

- [ ] Onboarding kan veilig worden hervat.

- [ ] Refresh tijdens onboarding veroorzaakt geen dataverlies.

- [ ] Browser sluiten veroorzaakt geen corruptie.

- [ ] Onboarding kan correct worden afgerond.

- [ ] Onvolledige onboarding wordt correct afgehandeld.

---

# 5. Website Editor

## Editor

- [ ] Website kan worden aangemaakt.
- [ ] Website kan worden opgeslagen.
- [ ] Website kan worden bewerkt.
- [ ] Website kan worden verwijderd.
- [ ] Website kan worden gepubliceerd.
- [ ] Website kan worden gedepubliceerd.
- [ ] Sections kunnen worden toegevoegd.
- [ ] Sections kunnen worden verwijderd.
- [ ] Sections kunnen worden verplaatst.
- [ ] Content wordt correct opgeslagen.
- [ ] Images worden correct opgeslagen.
- [ ] Styling wordt correct opgeslagen.
- [ ] Branding wordt correct toegepast.

## Autosave

Indien aanwezig:

- [ ] Autosave werkt.
- [ ] Autosave veroorzaakt geen race conditions.
- [ ] Twee snelle wijzigingen verliezen elkaar niet.
- [ ] Network failure wordt correct afgehandeld.
- [ ] Refresh tijdens save veroorzaakt geen dataverlies.
- [ ] Unsaved changes worden correct aangegeven.

## Responsive

Controleer:

- [ ] Desktop
- [ ] Tablet
- [ ] Mobile

Voor iedere sectie:

- [ ] Geen overflow.
- [ ] Geen horizontale scrollbar.
- [ ] Tekst blijft leesbaar.
- [ ] Images schalen correct.
- [ ] Buttons zijn bruikbaar.
- [ ] Navigation werkt.
- [ ] Booking flow werkt.

---

# 6. Publieke Websites

Test een gepubliceerde website als anonieme bezoeker.

- [ ] Website is publiek toegankelijk.
- [ ] Website laadt zonder login.
- [ ] Website laadt op desktop.
- [ ] Website laadt op mobiel.
- [ ] Website laadt op tablet.
- [ ] Geen editor-functionaliteit is publiek beschikbaar.
- [ ] Geen klantgegevens zijn publiek zichtbaar.
- [ ] Geen database IDs lekken onnodig.
- [ ] Geen Supabase secrets lekken.
- [ ] SEO metadata is correct.
- [ ] Favicon werkt.
- [ ] Open Graph metadata werkt.
- [ ] 404 gedrag is correct.
- [ ] Broken images worden correct afgehandeld.

---

# 7. Custom Domains

Controleer:

- [ ] Eigen domein kan gekoppeld worden.
- [ ] Domeinverificatie werkt.
- [ ] SSL werkt.
- [ ] HTTPS wordt geforceerd.
- [ ] HTTP redirect naar HTTPS werkt.
- [ ] `www` gedrag is duidelijk.
- [ ] Non-www gedrag is duidelijk.
- [ ] DNS instructies zijn correct.
- [ ] Verkeerde DNS configuratie wordt duidelijk gemeld.
- [ ] Domein kan niet aan meerdere accounts worden gekoppeld.
- [ ] Een verwijderd domein kan correct opnieuw worden gebruikt.
- [ ] Een domein van Account A kan niet door Account B worden geclaimd.
- [ ] Subdomein werkt.
- [ ] Custom domain en FlexPagina subdomain tonen dezelfde juiste website.
- [ ] SSL provisioning errors worden afgehandeld.
- [ ] Verlopen/verwijderde domeinen worden correct afgehandeld.

---

# 8. Booking System

## Basis

- [ ] Beschikbaarheid wordt correct berekend.
- [ ] Check-in werkt.
- [ ] Check-out werkt.
- [ ] Beschikbare kamers worden correct getoond.
- [ ] Niet-beschikbare kamers worden niet aangeboden.
- [ ] Booking kan worden aangemaakt.
- [ ] Booking kan worden gewijzigd.
- [ ] Booking kan worden geannuleerd.
- [ ] Booking status wordt correct bijgehouden.

## Double booking

Test:

```text
User opens booking page
        ↓
Room appears available
        ↓
Two users book simultaneously
```

Controleer:

- [ ] Slechts één booking wordt bevestigd.
- [ ] Database constraints voorkomen dubbele reserveringen.
- [ ] Race conditions zijn afgehandeld.
- [ ] Failed booking krijgt duidelijke foutmelding.

## Edge cases

Test:

- [ ] Zelfde check-in/check-out datum.
- [ ] Check-out = check-in van volgende booking.
- [ ] Overlappende booking.
- [ ] Booking midden in bestaande booking.
- [ ] Booking meerdere kamers.
- [ ] Meerdere accommodaties.
- [ ] Last-minute booking.
- [ ] Booking ver in de toekomst.
- [ ] Annuleren.
- [ ] Wijzigen.
- [ ] Geen beschikbaarheid.

---

# 9. iCal / Booking.com / Google Calendar

## Import

- [ ] iCal URL kan worden opgeslagen.
- [ ] URL wordt gevalideerd.
- [ ] Ongeldige URL geeft duidelijke foutmelding.
- [ ] Calendar kan worden opgehaald.
- [ ] Events worden correct verwerkt.
- [ ] Events worden correct gekoppeld aan kamers.
- [ ] Hele-dag events werken.
- [ ] Tijdzones worden correct verwerkt.
- [ ] Annuleringen worden verwerkt.
- [ ] Gewijzigde bookings worden verwerkt.
- [ ] Verwijderde events verdwijnen wanneer nodig.
- [ ] Duplicate events worden voorkomen.

## Synchronisatie

- [ ] Sync kan opnieuw worden uitgevoerd.
- [ ] Sync is idempotent.
- [ ] Een event wordt niet meerdere keren aangemaakt.
- [ ] Failed sync wordt gelogd.
- [ ] Tijdelijke externe fouten worden afgehandeld.
- [ ] Rate limits van externe systemen worden gerespecteerd.
- [ ] Een externe kalender die tijdelijk offline is breekt de website niet.

## Booking.com

Controleer specifiek:

- [ ] Booking.com kalender kan worden gekoppeld.
- [ ] Import werkt.
- [ ] Booking.com reserveringen blokkeren correcte beschikbaarheid.
- [ ] Annuleringen worden correct verwerkt.
- [ ] Meerdere kamers werken onafhankelijk.
- [ ] Er worden geen commissieclaims of betalingsflows uitgevoerd alsof FlexPagina Booking.com vervangt.
- [ ] De gebruiker begrijpt duidelijk welke reserveringen via welk kanaal plaatsvinden.

---

# 10. Facturatie

## Invoice creation

- [ ] Factuur kan worden aangemaakt.
- [ ] Factuurnummering werkt.
- [ ] Factuurnummers zijn uniek.
- [ ] Factuurdatum werkt.
- [ ] Vervaldatum werkt.
- [ ] Klantgegevens zijn correct.
- [ ] Bedrijfsgegevens zijn correct.
- [ ] Regels worden correct opgeslagen.
- [ ] BTW wordt correct berekend.
- [ ] Subtotalen zijn correct.
- [ ] Totaal is correct.
- [ ] Afronding is correct.

## Booking → Invoice

- [ ] Booking kan worden omgezet naar factuur.
- [ ] Booking wordt niet dubbel gefactureerd.
- [ ] Bookinggegevens worden correct overgenomen.
- [ ] Bedrag wordt correct overgenomen.
- [ ] Klantgegevens worden correct overgenomen.
- [ ] Factuur blijft bestaan als booking later verandert.
- [ ] Statussen zijn duidelijk.

## PDF

- [ ] PDF wordt correct gegenereerd.
- [ ] PDF opent.
- [ ] PDF bevat correcte bedrijfsgegevens.
- [ ] PDF bevat correcte klantgegevens.
- [ ] PDF bevat correcte bedragen.
- [ ] BTW is correct.
- [ ] Factuurnummer is zichtbaar.
- [ ] PDF is leesbaar op desktop.
- [ ] PDF is leesbaar op mobiel.
- [ ] PDF kan veilig worden gedownload.
- [ ] Een klant kan geen PDF van een andere klant openen.

## Immutability

Wanneer een factuur definitief/verzonden is:

- [ ] Kritieke factuurgegevens kunnen niet zomaar worden gewijzigd.
- [ ] Wijzigingen zijn traceerbaar indien nodig.
- [ ] Factuurnummers kunnen niet zomaar worden hergebruikt.
- [ ] Verwijderen van facturen is gecontroleerd.

---

# 11. Stripe & Payments

## Stripe integration

- [ ] Stripe secret key is server-side.
- [ ] Stripe public key is correct gebruikt.
- [ ] Producten/prijzen komen overeen met applicatie.
- [ ] Subscription creation werkt.
- [ ] Upgrade werkt.
- [ ] Downgrade werkt.
- [ ] Cancellation werkt.
- [ ] Reactivation werkt indien ondersteund.

## Webhooks

Controleer alle gebruikte webhooks.

- [ ] Webhook signature wordt gecontroleerd.
- [ ] Ongeldige signatures worden geweigerd.
- [ ] Webhook events worden idempotent verwerkt.
- [ ] Duplicate webhook events veroorzaken geen dubbele acties.
- [ ] Failed webhook processing wordt gelogd.
- [ ] Subscription status wordt correct bijgewerkt.
- [ ] Payment failure wordt correct verwerkt.
- [ ] Successful payment wordt correct verwerkt.
- [ ] Cancellation wordt correct verwerkt.
- [ ] Upgrade wordt correct verwerkt.
- [ ] Downgrade wordt correct verwerkt.

## Subscription states

Test:

```text
trial
active
past_due
unpaid
canceled
expired
```

Controleer per status:

- [ ] Wat mag de gebruiker?
- [ ] Welke features zijn beschikbaar?
- [ ] Is de website online?
- [ ] Is de editor toegankelijk?
- [ ] Kan de gebruiker upgraden?
- [ ] Kan de gebruiker betalen?
- [ ] Wordt data behouden?

## Add-ons

Controleer:

- [ ] Booking add-on.
- [ ] Meertaligheid.
- [ ] Andere toekomstige add-ons.

Test:

```text
Bronze
→ Add-on
→ Upgrade
→ Downgrade
→ Add-on verwijderen
→ Subscription cancel
```

Controleer dat prijs en features altijd overeenkomen.

---

# 12. Pricing & Feature Enforcement

Controleer dat abonnementen niet alleen visueel verschillen.

Voor ieder plan:

- [ ] Frontend verbergt correcte features.
- [ ] Backend blokkeert ongeautoriseerde features.
- [ ] API blokkeert ongeautoriseerde features.
- [ ] Directe URL toegang is geblokkeerd.
- [ ] Directe API calls zijn geblokkeerd.
- [ ] Feature limits worden afgedwongen.
- [ ] Upgrade maakt features beschikbaar.
- [ ] Downgrade verwijdert toegang correct.

Test bijvoorbeeld:

```text
Bronze user
→ probeert Gold feature via API
→ request moet worden geweigerd
```

---

# 13. Meertaligheid

Controleer:

- [ ] Nederlands.
- [ ] Engels.
- [ ] Duits.
- [ ] Frans.
- [ ] Alle UI teksten hebben vertalingen.
- [ ] Geen ontbrekende translation keys.
- [ ] Geen hardcoded UI teksten waar vertaling verwacht wordt.
- [ ] Foutmeldingen zijn vertaald.
- [ ] Booking flow is vertaald.
- [ ] Contactformulier is vertaald.
- [ ] E-mails zijn vertaald indien relevant.
- [ ] SEO title is vertaald.
- [ ] Meta description is vertaald.
- [ ] Open Graph content is correct.
- [ ] Taalwissel werkt.
- [ ] Refresh behoudt taal.
- [ ] Directe URL naar taal werkt.
- [ ] Ontbrekende vertaling heeft veilige fallback.

## Content translations

Controleer wat gebeurt wanneer:

```text
Original content gewijzigd
```

en wanneer:

```text
Translation gewijzigd
```

Zorg dat bestaande vertalingen niet onverwacht worden overschreven.

---

# 14. Contactformulier

- [ ] Formulier werkt.
- [ ] Validatie werkt.
- [ ] Verplichte velden worden gecontroleerd.
- [ ] E-mailvalidatie werkt.
- [ ] Spam protection aanwezig.
- [ ] Rate limiting aanwezig.
- [ ] HTML injection wordt voorkomen.
- [ ] XSS wordt voorkomen.
- [ ] Formulier kan niet onbeperkt e-mails versturen.
- [ ] Errors worden correct afgehandeld.
- [ ] Success message werkt.
- [ ] Gegevens worden alleen opgeslagen indien noodzakelijk.

Test:

```text
100 snelle requests
```

en controleer of abuse wordt beperkt.

---

# 15. E-mail

Controleer:

- [ ] SMTP/API credentials zijn veilig.
- [ ] SPF correct.
- [ ] DKIM correct.
- [ ] DMARC correct.
- [ ] From address correct.
- [ ] Reply-to correct.
- [ ] Bounce handling.
- [ ] Failed email handling.
- [ ] E-mails komen niet onnodig in spam.
- [ ] HTML e-mails werken.
- [ ] Plain-text fallback werkt.
- [ ] Links in e-mails werken.
- [ ] Booking confirmation werkt.
- [ ] Invoice email werkt.
- [ ] Password reset werkt.

---

# 16. File Uploads & Images

Als klanten afbeeldingen kunnen uploaden:

- [ ] File type wordt gecontroleerd.
- [ ] MIME type wordt gecontroleerd.
- [ ] Bestandsgrootte wordt beperkt.
- [ ] Afmetingen worden gecontroleerd indien nodig.
- [ ] Bestandsnamen worden gesanitized.
- [ ] Executable files worden geweigerd.
- [ ] SVG uploads zijn veilig afgehandeld.
- [ ] Storage permissions zijn correct.
- [ ] User A kan bestanden van User B niet openen.
- [ ] Verwijderen werkt.
- [ ] Orphaned files worden voorkomen.
- [ ] Storage URLs lekken geen gevoelige informatie.

---

# 17. Security — Algemene Web Security

Controleer minimaal:

- [ ] XSS.
- [ ] SQL injection.
- [ ] IDOR.
- [ ] Authentication bypass.
- [ ] Authorization bypass.
- [ ] CSRF waar relevant.
- [ ] SSRF waar relevant.
- [ ] Open redirects.
- [ ] Path traversal.
- [ ] Unsafe file upload.
- [ ] Mass assignment.
- [ ] Privilege escalation.
- [ ] Rate limit bypass.
- [ ] Sensitive information disclosure.

## Input validation

Alle user input:

- [ ] Client-side validation.
- [ ] Server-side validation.
- [ ] Database constraints waar relevant.
- [ ] Length limits.
- [ ] Type validation.
- [ ] Allowed values.
- [ ] Sanitization waar nodig.

Vertrouw nooit uitsluitend op frontend-validatie.

---

# 18. Rate Limiting & Abuse Protection

Controleer publieke endpoints:

- [ ] Login.
- [ ] Password reset.
- [ ] Registration.
- [ ] Contact form.
- [ ] Booking creation.
- [ ] API endpoints.
- [ ] Image upload.
- [ ] Email sending.
- [ ] PDF generation.
- [ ] iCal sync.
- [ ] Stripe endpoints.

Voor ieder relevant endpoint:

- [ ] Rate limiting.
- [ ] Abuse detection.
- [ ] Maximum request size.
- [ ] Timeout.
- [ ] Correct error response.

---

# 19. Database Integrity

Controleer:

- [ ] Foreign keys.
- [ ] Unique constraints.
- [ ] NOT NULL constraints.
- [ ] Check constraints waar relevant.
- [ ] Indexes.
- [ ] Cascade behavior.
- [ ] Delete behavior.
- [ ] Duplicate prevention.
- [ ] Race conditions.
- [ ] Transaction usage waar nodig.

Controleer specifiek booking:

```text
Room
+
Start date
+
End date
```

en zorg dat database-level bescherming tegen dubbele reserveringen aanwezig is waar mogelijk.

---

# 20. Concurrency & Race Conditions

Test acties die gelijktijdig kunnen plaatsvinden.

- [ ] Twee bookings tegelijk.
- [ ] Twee invoice creations tegelijk.
- [ ] Twee subscription updates tegelijk.
- [ ] Twee users die dezelfde website wijzigen indien relevant.
- [ ] Twee webhook events tegelijk.
- [ ] Twee iCal syncs tegelijk.
- [ ] Twee domain claims tegelijk.

Controleer dat dubbele records niet kunnen ontstaan.

---

# 21. GDPR / AVG

## Persoonsgegevens

Inventariseer:

- [ ] Naam.
- [ ] E-mail.
- [ ] Telefoon.
- [ ] Adres.
- [ ] Bookinggegevens.
- [ ] Factuurgegevens.
- [ ] IP-adressen.
- [ ] Logs.
- [ ] Payment metadata.
- [ ] Contactformulierdata.

Voor ieder gegeven:

- [ ] Waarom wordt het opgeslagen?
- [ ] Hoe lang?
- [ ] Waar?
- [ ] Wie heeft toegang?
- [ ] Kan het verwijderd worden?

## Account deletion

Test:

```text
User
→ Delete account
```

Controleer:

- [ ] Account wordt verwijderd.
- [ ] Persoonsgegevens worden verwijderd waar verplicht.
- [ ] Website wordt correct afgehandeld.
- [ ] Bookings worden correct afgehandeld.
- [ ] Facturen worden volgens wettelijke bewaarplicht behandeld.
- [ ] Stripe customer wordt correct afgehandeld.
- [ ] Storage files worden verwijderd waar toegestaan.
- [ ] Domain mappings worden verwijderd.
- [ ] Geen orphaned persoonlijke data blijft achter.

## Documentatie

- [ ] Privacyverklaring aanwezig.
- [ ] Algemene voorwaarden aanwezig.
- [ ] Cookiebeleid indien relevant.
- [ ] Verwerkersinformatie aanwezig.
- [ ] Contactgegevens voor privacyvragen aanwezig.

---

# 22. Cookies & Tracking

- [ ] Alleen noodzakelijke cookies zonder toestemming.
- [ ] Analytics correct geïmplementeerd indien gebruikt.
- [ ] Marketing cookies correct afgehandeld.
- [ ] Cookie consent werkt indien vereist.
- [ ] Consent wordt opgeslagen.
- [ ] Consent kan worden ingetrokken.
- [ ] Tracking start niet vóór noodzakelijke toestemming indien vereist.

---

# 23. SEO

Voor iedere klantwebsite:

- [ ] Title.
- [ ] Meta description.
- [ ] Canonical URL.
- [ ] Robots metadata.
- [ ] Sitemap indien relevant.
- [ ] Favicon.
- [ ] Open Graph.
- [ ] Twitter/X metadata indien relevant.
- [ ] Correcte headings.
- [ ] Alt text.
- [ ] Mobile friendly.
- [ ] HTTPS.
- [ ] Geen duplicate content tussen preview en productie.

## Preview websites

Controleer specifiek dat:

```text
klant.flexpagina.nl
```

en eventuele preview URLs niet ongewenst worden geïndexeerd wanneer dat niet de bedoeling is.

---

# 24. Performance

Controleer:

- [ ] Homepage laadt snel.
- [ ] Editor laadt acceptabel.
- [ ] Images worden geoptimaliseerd.
- [ ] Lazy loading waar relevant.
- [ ] Geen onnodige client-side JavaScript.
- [ ] Geen onnodige database requests.
- [ ] Geen N+1 queries.
- [ ] API responses zijn redelijk klein.
- [ ] Large websites blijven performant.
- [ ] Large image uploads veroorzaken geen problemen.

Test met:

```text
1 website
10 sections
50 sections
100+ images indien mogelijk
```

---

# 25. Mobile

Controleer op echte responsive layouts:

- [ ] iPhone-sized viewport.
- [ ] Android-sized viewport.
- [ ] Tablet.
- [ ] Desktop.

Controleer:

- [ ] Navigation.
- [ ] Forms.
- [ ] Booking.
- [ ] Buttons.
- [ ] Editor.
- [ ] Images.
- [ ] Text.
- [ ] Modals.
- [ ] Dropdowns.
- [ ] Date pickers.
- [ ] PDF links.

---

# 26. Accessibility

Controleer minimaal:

- [ ] Keyboard navigation.
- [ ] Focus states.
- [ ] Labels op inputs.
- [ ] Alt text.
- [ ] Button labels.
- [ ] Form errors.
- [ ] Contrast.
- [ ] Semantic HTML.
- [ ] Heading hierarchy.
- [ ] Screenreader basics.
- [ ] Modals kunnen met keyboard worden gesloten.

---

# 27. Backup & Disaster Recovery

Controleer:

- [ ] Supabase backups zijn geconfigureerd.
- [ ] Database recovery procedure bestaat.
- [ ] Belangrijke files/images kunnen worden hersteld.
- [ ] Environment configuration is gedocumenteerd.
- [ ] DNS configuratie is gedocumenteerd.
- [ ] Stripe configuration is gedocumenteerd.
- [ ] Domain configuration is gedocumenteerd.

## Restore test

Niet alleen aannemen dat backups werken.

- [ ] Een restore procedure is getest.
- [ ] Database kan worden teruggezet.
- [ ] Applicatie kan opnieuw worden gedeployed.
- [ ] Custom domains kunnen opnieuw worden gekoppeld.
- [ ] Storage kan worden hersteld.
- [ ] Kritieke configuratie kan worden gereconstrueerd.

---

# 28. Monitoring & Logging

Controleer of er monitoring bestaat voor:

- [ ] Website downtime.
- [ ] API errors.
- [ ] Database errors.
- [ ] Authentication errors.
- [ ] Stripe webhook failures.
- [ ] Payment failures.
- [ ] Booking failures.
- [ ] iCal sync failures.
- [ ] Email failures.
- [ ] PDF generation failures.
- [ ] Domain/SSL failures.

## Logging

Logs mogen GEEN bevatten:

- [ ] Passwords.
- [ ] API keys.
- [ ] Stripe secrets.
- [ ] Supabase service role keys.
- [ ] Payment credentials.
- [ ] Onnodige volledige persoonsgegevens.

---

# 29. Vercel / Production Deployment

Controleer:

- [ ] Production environment variables correct.
- [ ] Preview environment variables correct.
- [ ] Development environment variables correct.
- [ ] Production gebruikt geen development credentials.
- [ ] Build werkt.
- [ ] TypeScript build werkt.
- [ ] Lint werkt.
- [ ] Tests werken.
- [ ] Environment variables ontbreken niet.
- [ ] Deployment rollback mogelijk.
- [ ] Production domain correct.
- [ ] HTTPS correct.
- [ ] Error pages correct.

---

# 30. Environment Variables

Maak een volledige lijst:

```text
DATABASE
SUPABASE
STRIPE
EMAIL
DOMAIN
OTHER_EXTERNAL_SERVICES
```

Voor iedere variable:

- [ ] Is deze noodzakelijk?
- [ ] Is deze server-only?
- [ ] Mag deze `NEXT_PUBLIC_` zijn?
- [ ] Staat deze veilig opgeslagen?
- [ ] Staat deze niet in Git?
- [ ] Is productie correct geconfigureerd?
- [ ] Is development correct geconfigureerd?

---

# 31. API Audit

Maak een lijst van ALLE endpoints/server actions.

Voor iedere endpoint:

```text
Endpoint:
Authentication:
Authorization:
Input:
Output:
Database access:
External services:
Rate limit:
Error handling:
```

Controleer:

- [ ] Authentication.
- [ ] Authorization.
- [ ] Input validation.
- [ ] Tenant isolation.
- [ ] Rate limiting.
- [ ] Error handling.
- [ ] Logging.
- [ ] Sensitive data exposure.

---

# 32. Database Query Audit

Zoek in de volledige codebase naar:

```text
supabase.from(
supabase.rpc(
select(
insert(
update(
delete(
```

Controleer iedere query.

Voor iedere query:

- [ ] Is authentication nodig?
- [ ] Is authorization gecontroleerd?
- [ ] Is tenant isolation gegarandeerd?
- [ ] Kan een ID worden gemanipuleerd?
- [ ] Kan iemand data van een andere gebruiker ophalen?
- [ ] Is RLS voldoende?
- [ ] Is server-side authorization nodig?

---

# 33. Dependency Audit

Controleer:

- [ ] `npm audit`.
- [ ] Verouderde dependencies.
- [ ] Critical vulnerabilities.
- [ ] High vulnerabilities.
- [ ] Deprecated packages.
- [ ] Ongebruikte packages.
- [ ] Packages met verdachte permissions.
- [ ] Lockfile aanwezig.
- [ ] Reproduceerbare install.

---

# 34. Automated Testing

Zorg voor tests voor minimaal:

## Authentication

- [ ] Login.
- [ ] Logout.
- [ ] Unauthorized access.
- [ ] Password reset.

## Tenant security

- [ ] Cross-tenant read.
- [ ] Cross-tenant update.
- [ ] Cross-tenant delete.

## Booking

- [ ] Available room.
- [ ] Unavailable room.
- [ ] Overlap.
- [ ] Cancellation.
- [ ] Modification.
- [ ] Concurrent booking.

## Billing

- [ ] Invoice creation.
- [ ] Invoice calculation.
- [ ] PDF generation.
- [ ] Subscription creation.
- [ ] Upgrade.
- [ ] Downgrade.
- [ ] Cancellation.
- [ ] Payment failure.
- [ ] Webhook.

## Website

- [ ] Create.
- [ ] Edit.
- [ ] Publish.
- [ ] Unpublish.
- [ ] Delete.
- [ ] Custom domain.

---

# 35. End-to-End Customer Journey

Voer een volledige test uit alsof je een echte klant bent.

```text
1. Register
2. Login
3. Complete onboarding
4. Create website
5. Add content
6. Add images
7. Configure branding
8. Configure language
9. Configure booking
10. Configure calendar
11. Preview website
12. Publish website
13. Open website as visitor
14. Make booking
15. Generate invoice
16. Generate PDF
17. Upgrade subscription
18. Use additional feature
19. Downgrade
20. Cancel subscription
21. Login again
22. Delete account
```

Bij iedere stap:

- [ ] Werkt.
- [ ] Error handling werkt.
- [ ] Data wordt correct opgeslagen.
- [ ] Geen data leakage.
- [ ] UI is begrijpelijk.

---

# 36. Failure Testing

Test bewust fouten.

## Database offline

- [ ] Website toont geen stack trace.
- [ ] Editor toont duidelijke fout.
- [ ] Data raakt niet corrupt.

## Stripe offline

- [ ] Payment flow faalt netjes.
- [ ] Subscription status blijft consistent.

## Email service offline

- [ ] Applicatie crasht niet.
- [ ] Failure wordt gelogd.
- [ ] User krijgt correcte status.

## Calendar service offline

- [ ] Booking systeem blijft bruikbaar.
- [ ] Sync wordt als failed gemarkeerd.

## Invalid user input

- [ ] Request wordt geweigerd.
- [ ] Database blijft intact.

## Network interruption

- [ ] Editor raakt niet corrupt.
- [ ] Booking wordt niet dubbel aangemaakt.
- [ ] Payment wordt niet dubbel verwerkt.

---

# 37. Data Consistency

Controleer dat dezelfde informatie niet op conflicterende plekken kan staan.

Bijvoorbeeld:

```text
Stripe subscription
        ↓
Database subscription
        ↓
User permissions
        ↓
Available features
```

Controleer:

- [ ] Stripe status en database status komen overeen.
- [ ] Database status en feature access komen overeen.
- [ ] Booking status en availability komen overeen.
- [ ] Invoice status en payment status komen overeen.
- [ ] Domain status en website status komen overeen.

---

# 38. Security Headers

Controleer productieheaders waar relevant:

- [ ] Content-Security-Policy.
- [ ] Strict-Transport-Security.
- [ ] X-Content-Type-Options.
- [ ] Referrer-Policy.
- [ ] Frame protection.
- [ ] Permissions-Policy.

Controleer dat security headers niet per ongeluk functionaliteit breken.

---

# 39. Public vs Private Data

Maak expliciet onderscheid tussen:

### Public

- Website content.
- Publieke bedrijfsinformatie.
- Publieke booking availability.
- Publieke contactgegevens indien door klant gepubliceerd.

### Private

- Customer data.
- Guest data.
- Invoice data.
- Subscription data.
- Payment data.
- Internal settings.
- Authentication data.
- Private booking information.

Controleer dat private data nooit via publieke endpoints beschikbaar is.

---

# 40. Admin Functionaliteit

Indien er een admin dashboard bestaat:

- [ ] Admin authentication.
- [ ] Admin authorization.
- [ ] Non-admin kan admin routes niet openen.
- [ ] Admin API's zijn beveiligd.
- [ ] Admin kan niet per ongeluk tenant data wijzigen.
- [ ] Audit logging waar relevant.
- [ ] Gevoelige informatie is beperkt zichtbaar.

---

# 41. Business Logic

Controleer alle belangrijke business rules.

## Subscription

- [ ] Prijs klopt.
- [ ] Plan klopt.
- [ ] Features kloppen.
- [ ] Add-ons kloppen.
- [ ] Upgrade klopt.
- [ ] Downgrade klopt.
- [ ] Cancellation klopt.

## Booking

- [ ] Beschikbaarheid klopt.
- [ ] Prijs klopt.
- [ ] Datums kloppen.
- [ ] Room klopt.
- [ ] Status klopt.

## Invoice

- [ ] Booking → invoice klopt.
- [ ] Bedrag klopt.
- [ ] BTW klopt.
- [ ] PDF klopt.

---

# 42. Edge Case Checklist

Test minimaal:

- [ ] User zonder website.
- [ ] User met meerdere websites.
- [ ] Website zonder sections.
- [ ] Website met veel sections.
- [ ] Website zonder images.
- [ ] Website met grote images.
- [ ] Geen booking.
- [ ] Eén booking.
- [ ] Veel bookings.
- [ ] Meerdere kamers.
- [ ] Meerdere talen.
- [ ] Geen vertaling.
- [ ] Verwijderde vertaling.
- [ ] Canceled subscription.
- [ ] Failed payment.
- [ ] Expired subscription.
- [ ] Custom domain zonder DNS.
- [ ] Verwijderd custom domain.
- [ ] Geblokkeerd domain.
- [ ] Onvolledige onboarding.
- [ ] Deleted user.
- [ ] Deleted website.
- [ ] Database error.
- [ ] External API error.

---

# 43. Production Launch Blockers

Markeer onderstaande problemen automatisch als BLOCKER:

- [ ] Cross-tenant data access.
- [ ] Authentication bypass.
- [ ] Authorization bypass.
- [ ] Exposed secret.
- [ ] Stripe webhook zonder signature validation.
- [ ] Dubbele betalingen.
- [ ] Dubbele bookings.
- [ ] Data loss.
- [ ] Facturen met incorrecte bedragen.
- [ ] Private customer data publiek toegankelijk.
- [ ] Account deletion werkt niet waar vereist.
- [ ] Database backup/recovery ontbreekt volledig.
- [ ] Production deployment gebruikt test credentials.
- [ ] Kritieke security vulnerability.

Een BLOCKER moet worden opgelost voordat betalende klanten worden toegelaten.

---

# 44. Codex Audit Output

Na de volledige controle moet Codex een rapport genereren met:

## Executive summary

```text
Production readiness:
READY / NOT READY

Critical issues:
X

High issues:
X

Medium issues:
X

Low issues:
X
```

## Findings

Voor iedere finding:

```text
ID:
Severity:
Category:
Location:
Problem:
Why it matters:
How to reproduce:
Recommended fix:
Status:
```

Voorbeeld:

```text
ID: SEC-001
Severity: CRITICAL
Category: Multi-tenant security

Problem:
User A can retrieve User B's invoice by changing invoice_id.

Location:
app/api/invoices/[id]/route.ts

How to reproduce:
1. Login as User A.
2. Obtain invoice ID belonging to User B.
3. Request invoice endpoint.
4. Invoice is returned.

Recommended fix:
Enforce tenant ownership server-side and through RLS.

Status:
FAIL
```

---

# 45. Final Score

Bereken:

```text
CRITICAL = 10 points
HIGH     = 5 points
MEDIUM   = 2 points
LOW      = 1 point
PASS     = 0 points
```

## Result

### 🟢 READY

Alle voorwaarden:

- Geen CRITICAL.
- Geen HIGH.
- Geen onbeheerde data-leak.
- Geen payment/booking integriteitsproblemen.
- Tests slagen.
- Production environment gecontroleerd.

### 🟡 CONDITIONAL

- Geen CRITICAL.
- Eén of meerdere MEDIUM/LOW issues.
- Issues hebben geen directe impact op security, betalingen of data-integriteit.

### 🔴 NOT READY

Wanneer één van de volgende aanwezig is:

- CRITICAL security issue.
- Cross-tenant data leakage.
- Payment integrity issue.
- Double booking issue.
- Data loss issue.
- Exposed secrets.
- Authentication bypass.
- Kritieke production configuration error.

---

# 46. Final Codex Instructions

Voer deze audit uit op de volledige FlexPagina.nl codebase.

### Belangrijk

Doe NIET alleen een statische code review.

Gebruik waar mogelijk:

- bestaande tests
- unit tests
- integration tests
- API tests
- database tests
- E2E tests
- dependency audit
- build
- lint
- TypeScript checks

Maak voor security tests bij voorkeur aparte testaccounts/testdata.

### Niet zomaar wijzigen

Tijdens de audit:

- Verander geen bestaande business logic zonder aanleiding.
- Refactor geen grote delen van de applicatie alleen om code mooier te maken.
- Verwijder geen functionaliteit.
- Verander geen pricing.
- Verander geen Stripe producten/prijzen.
- Verander geen productiegegevens.
- Verwijder geen klantdata.
- Gebruik geen productiecredentials in tests.
- Voer destructieve database-acties alleen uit in een veilige testomgeving.

### Bij problemen

Los alleen problemen automatisch op wanneer:

1. De oorzaak duidelijk is.
2. De oplossing lokaal en veilig is.
3. De bestaande functionaliteit behouden blijft.
4. Er een test voor de oplossing kan worden toegevoegd.

Bij onduidelijkheid:

```text
DO NOT GUESS.
REPORT THE ISSUE.
```

### Eindresultaat

Lever uiteindelijk:

1. `PRODUCTION_READINESS_REPORT.md`
2. Overzicht van alle PASS/FAIL/PARTIAL checks.
3. Alle CRITICAL/HIGH issues.
4. Reproductiestappen voor security issues.
5. Concrete aanbevelingen.
6. Tests die zijn uitgevoerd.
7. Tests die niet konden worden uitgevoerd.
8. Eventuele code changes die tijdens de audit zijn gemaakt.
9. Final verdict:

```text
READY
CONDITIONAL
NOT READY
```

De applicatie mag alleen als **READY** worden aangemerkt wanneer er geen bekende CRITICAL of HIGH problemen meer zijn en de kernfunctionaliteit voor authentication, multi-tenancy, booking, payments, invoicing en data-integriteit aantoonbaar werkt.
