# Plan: Risicobescherming voor SaaS Website Builder

## Doel

Voeg basisfunctionaliteit toe aan de SaaS-applicatie om het bedrijf beter te beschermen tegen technische, juridische en operationele risico’s.

De applicatie is een SaaS website builder voor kleine ondernemers/ZZP’ers. Klanten kunnen websites maken, publiceren, beheren en eventueel koppelen aan een eigen domein.

De app gebruikt:

* Next.js App Router
* TypeScript
* Tailwind CSS
* Supabase
* Vercel hosting
* Mogelijk Stripe voor abonnementen
* SMTP/mail voor contactformulieren

---

## Belangrijk

Maak dit praktisch en MVP-gericht. Bouw geen enterprise compliance-systeem. Het doel is een solide basis voor een startende SaaS.

---

## Implementatiechecklist

Laatst gecontroleerd op 2026-07-13 tegen de huidige codebase.

- [x] 1. Juridische pagina's uitbreiden — alle zeven routes en Nederlandse MVP-templatecontent zijn aanwezig.
- [x] 2. Footer links toevoegen — alle juridische links en de statuslink staan responsive in `SharedFooter`.
- [x] 3. Statuspagina maken — statische servicestatus, incidenten en klantenuitleg zijn aanwezig.
- [~] 4. Audit logging toevoegen — tabel, helper en alle huidige appacties zijn aangesloten, inclusief website- en accountverwijdering; alleen een echte `payment.failed`-bron wacht nog op een toekomstige Stripe-webhook.
- [x] 5. Backup-strategie documenteren — `/docs/backup-strategy.md` beschrijft backups, frequenties, verantwoordelijkheden, hersteltests en de procedure bij dataverlies.
- [x] 6. Incident response document maken — `/docs/incident-response.md` bevat het storingsproces, rollen, ernstniveaus, controles en communicatietemplates.
- [x] 7. Rate limiting voorbereiden — de centrale MVP-helper beschermt contact, login, wachtwoordreset, publiceren en domeinverificatie; een TODO documenteert de latere overstap naar een gedeelde Redis/Upstash-store.
- [x] 8. Contactformulier veiliger maken — validatie, lengtelimieten, honeypot, spamdetectie, rate limiting, logging en veilige foutmeldingen zijn aanwezig.
- [x] 9. Custom domain risico's afdekken — risicoteksten en logging van domeinacties zijn aanwezig.
- [x] 10. Account verwijdering en data export voorbereiden — profiel-UI en beveiligde API-routes ondersteunen JSON-export, websiteverwijdering en definitieve accountverwijdering.
- [x] 11. Security headers controleren — frame-, MIME-, referrer-, permissions- en Content Security Policy-headers zijn centraal ingesteld met toegestane Supabase-, afbeeldings-, font- en kaartbronnen.
- [x] 12. Admin-only pagina voor audit logs — `/admin/audit-logs` toont de nieuwste logs en gebruikt een standaard-weigerende server-side admincontrole.
- [x] 13. Geen harde uptime-belofte — geen verboden uptimeclaims gevonden in de app- en marketingteksten.
- [x] 14. Acceptatiecriteria — gehaald voor alle bestaande MVP-flows; lint, TypeScript, de bestaande tests en de productiebuild slagen.
- [x] 15. Belangrijke randvoorwaarden — de uitgevoerde wijzigingen zijn MVP-gericht en juridische templates tonen de verplichte controlewaarschuwing.
- [x] 16. Aanbevolen bestandsstructuur — routes, auditlogging, rate limiting, operationele documentatie, `lib/security.ts` en de adminpagina zijn aanwezig.
- [ ] 17. Extra toekomstige verbeteringen — niet verplicht en grotendeels nog toekomstwerk.

Validatie op 2026-07-13: `npm run lint`, `npx tsc --noEmit`, alle vier bestaande testsuites en `npm run build` zijn succesvol afgerond.

Legenda: `[x]` uitgevoerd, `[~]` gedeeltelijk uitgevoerd, `[ ]` niet uitgevoerd.

---

# 1. Juridische pagina’s uitbreiden

Status: uitgevoerd op 2026-07-08 voor flexpagina.nl. De routes `/terms`, `/privacy`, `/cookies`, `/processor-agreement`, `/acceptable-use`, `/disclaimer` en `/status` bestaan nu met Nederlandse MVP-templatecontent en een duidelijke controlewaarschuwing voor juridische review.

Controleer of de volgende routes bestaan. Maak ze aan als ze nog ontbreken:

* `/terms`
* `/privacy`
* `/cookies`
* `/processor-agreement`
* `/acceptable-use`
* `/disclaimer`
* `/status`

Gebruik duidelijke Nederlandse teksten. Voeg waar nodig placeholders toe zoals:

```txt
[Bedrijfsnaam]
[KvK-nummer]
[Adres]
[E-mailadres]
[Laatst bijgewerkt]
```

## Algemene voorwaarden `/terms`

Moet minimaal bevatten:

* gebruik van de dienst;
* abonnementen en betaling;
* opzegging;
* geen garantie op 100% uptime;
* afhankelijkheid van externe partijen zoals Vercel, Supabase, Stripe en SMTP;
* beperking van aansprakelijkheid;
* geen aansprakelijkheid voor indirecte schade, omzetverlies of gevolgschade;
* klant is verantwoordelijk voor eigen website-inhoud;
* klant is verantwoordelijk voor rechten op teksten, foto’s, logo’s en uploads;
* recht om accounts/websites te blokkeren bij misbruik;
* onderhoud en wijzigingen aan de dienst;
* overmacht.

## Privacyverklaring `/privacy`

Moet minimaal bevatten:

* welke persoonsgegevens worden verwerkt;
* waarom gegevens worden verwerkt;
* bewaartermijnen;
* gebruik van Supabase, Vercel, Stripe, mailprovider en analytics;
* rechten van gebruikers;
* contactgegevens;
* beveiligingsmaatregelen;
* internationale doorgifte indien relevant.

## Cookiebeleid `/cookies`

Moet minimaal bevatten:

* noodzakelijke cookies;
* functionele cookies;
* analytische cookies;
* marketingcookies alleen indien gebruikt;
* uitleg over toestemming.

## Verwerkersovereenkomst `/processor-agreement`

Maak een simpele standaard DPA-pagina met:

* rolverdeling;
* type gegevens;
* doel van verwerking;
* beveiliging;
* subverwerkers;
* datalekken;
* verwijdering/export van data;
* audit/verzoeken.

## Acceptable Use Policy `/acceptable-use`

Verbied minimaal:

* illegale content;
* haatdragende content;
* phishing;
* malware;
* spam;
* inbreuk op auteursrechten;
* misbruik van formulieren;
* misleidende websites;
* adult/gewelddadige content indien niet gewenst.

## Disclaimer `/disclaimer`

Moet bevatten:

* informatie op websites kan fouten bevatten;
* geen juridisch/financieel/medisch advies;
* AI-output kan fouten bevatten als AI-functionaliteit wordt gebruikt;
* klant blijft verantwoordelijk voor gepubliceerde inhoud.

---

# 2. Footer links toevoegen

Status: uitgevoerd op 2026-07-08. De algemene `SharedFooter` linkt nu responsive naar `/terms`, `/privacy`, `/cookies`, `/processor-agreement`, `/acceptable-use`, `/disclaimer` en `/status`.

Voeg in de algemene site-footer links toe naar:

* Algemene voorwaarden
* Privacyverklaring
* Cookiebeleid
* Verwerkersovereenkomst
* Acceptable Use
* Disclaimer
* Status

Zorg dat dit responsive is.

---

# 3. Statuspagina maken

Maak route:

```txt
/status
```

Deze pagina toont:

* status van de applicatie;
* status van externe diensten;
* laatste incidenten;
* simpele uitleg voor klanten.

Voor MVP mag dit statisch zijn.

Gebruik bijvoorbeeld:

```ts
const services = [
  { name: "Website editor", status: "operational" },
  { name: "Gepubliceerde websites", status: "operational" },
  { name: "Database", status: "operational" },
  { name: "Bestandsopslag", status: "operational" },
  { name: "E-mail/contactformulieren", status: "operational" },
  { name: "Betalingen", status: "operational" }
]
```

Statusmogelijkheden:

* `operational`
* `degraded`
* `partial_outage`
* `major_outage`
* `maintenance`

Maak dit later makkelijk uitbreidbaar naar databasebeheer.

---

# 4. Audit logging toevoegen

Status: grotendeels uitgevoerd. Toegevoegd: `audit_logs` tabel + migratie, `logAuditEvent` helper met try/catch, en logging voor login, logout, website aangemaakt/gepubliceerd/ongepubliceerd/verwijderd, sectie toegevoegd/verwijderd, domein toegevoegd/verwijderd, domeinverificatie gestart/gelukt/mislukt, abonnement gewijzigd en account verwijderd. `payment.failed` is voorbereid in de audit-API, maar kan pas door een echte bron worden gelogd zodra een Stripe-webhook bestaat.

Maak een Supabase tabel voor audit logs.

## Tabel: `audit_logs`

Velden:

```sql
id uuid primary key default gen_random_uuid(),
user_id uuid null,
website_id uuid null,
action text not null,
metadata jsonb null,
ip_address text null,
user_agent text null,
created_at timestamp with time zone default now()
```

## Acties die gelogd moeten worden

Log minimaal:

* login;
* logout indien eenvoudig mogelijk;
* website aangemaakt;
* website gepubliceerd;
* website verwijderd;
* sectie toegevoegd;
* sectie verwijderd;
* domein gekoppeld;
* domein verwijderd;
* abonnement gewijzigd;
* betaling mislukt;
* account verwijderd.

Maak een helperfunctie:

```ts
logAuditEvent({
  userId,
  websiteId,
  action,
  metadata,
  request
})
```

Zorg dat logging nooit de hoofdactie mag laten falen. Gebruik try/catch.

---

# 5. Backup-strategie documenteren

Status: uitgevoerd op 2026-07-13. `docs/backup-strategy.md` beschrijft de dagelijkse databasebackup, afzonderlijke Storage-backup, GitHub als code-backup, bewaartermijnen, verantwoordelijkheden, kwartaalhersteltests en de procedure bij dataverlies.

Maak een markdownbestand:

```txt
/docs/backup-strategy.md
```

Beschrijf hierin:

* Supabase database backups;
* storage backups;
* GitHub als code-backup;
* hoe vaak backups gemaakt moeten worden;
* hoe herstel getest moet worden;
* wie verantwoordelijk is;
* wat te doen bij dataverlies.

Voor MVP:

* database dagelijks;
* storage minimaal dagelijks of wekelijks;
* hersteltest minimaal elk kwartaal.

---

# 6. Incident response document maken

Status: uitgevoerd op 2026-07-13. `docs/incident-response.md` beschrijft herkenning, triage, status- en klantcommunicatie, workarounds, herstelcontrole, afsluiting en post-mortems, inclusief de gevraagde klanttemplates.

Maak bestand:

```txt
/docs/incident-response.md
```

Beschrijf stappen bij storing:

1. Incident herkennen.
2. Controleren of oorzaak intern of extern is.
3. Statuspagina bijwerken.
4. Klanten informeren.
5. Workaround zoeken.
6. Herstel controleren.
7. Incident afsluiten.
8. Korte post-mortem schrijven.

Voeg templates toe:

## Klantmelding storing

```txt
We ervaren momenteel een storing in onze dienst. De oorzaak lijkt te liggen bij [provider/interne service]. We onderzoeken dit en plaatsen updates op onze statuspagina.
```

## Herstelmelding

```txt
De storing is opgelost. We blijven de dienst monitoren. Excuses voor het ongemak.
```

---

# 7. Rate limiting voorbereiden

Status: uitgevoerd op 2026-07-13. De centrale in-memory `checkRateLimit` helper beschermt nu het contactformulier, de server-side loginroute, wachtwoordreset, het publicatie-endpoint en domeinverificatie. Login en wachtwoordreset hebben eigen serverroutes en herstel-UI. Domeinverificatie vereist nu bovendien een ingelogde eigenaar. De helper bevat een expliciete TODO voor vervanging door een gedeelde Redis/Upstash-store voordat de app horizontaal schaalt.

Voeg rate limiting toe of bereid dit voor voor:

* contactformulier;
* login;
* wachtwoord reset;
* publicatie endpoint;
* domein-verificatie endpoint;

Maak een centrale helper:

```ts
checkRateLimit(key, limit, window)
```

Voor MVP mag dit simpel zijn. Bijvoorbeeld op basis van IP + actie.

Als er nog geen Redis/Upstash is, maak dan een duidelijke TODO en documenteer welke endpoints bescherming nodig hebben.

---

# 8. Contactformulier veiliger maken

Status: uitgevoerd op 2026-07-08. `/api/contact` loopt via `/api/requests`; die handler valideert nu naam/e-mail/bericht, max-lengtes, honeypotvelden, simpele spamkenmerken en een MVP in-memory rate limit. Publieke formulieren sturen een verborgen honeypot mee, mislukte pogingen worden server-side gelogd en gebruikers krijgen alleen niet-technische foutmeldingen.

Controleer `/api/contact`.

Voeg toe:

* validatie op naam, e-mail en bericht;
* maximale lengte van velden;
* rate limiting;
* simpele spamdetectie;
* honeypot field;
* logging van mislukte pogingen;
* duidelijke foutmeldingen zonder technische details.

Contactformulier mag nooit secrets of stacktraces tonen aan de gebruiker.

---

# 9. Custom domain risico’s afdekken

Status: uitgevoerd op 2026-07-08. De domeinbeheer-UI toont nu expliciete risico-uitleg over eigendom, DNS-verantwoordelijkheid, offline-risico, SSL-tijd en DNS-propagatie. Domein toevoegen/verwijderen en verificatie gestart/gelukt/mislukt worden gelogd via audit logging, inclusief websitekoppeling bij verificatie vanuit het dashboard.

Controleer domain management code.

Voeg duidelijke UI-teksten toe:

* klant blijft eigenaar van eigen domein;
* DNS-instellingen zijn verantwoordelijkheid van klant;
* verkeerde DNS kan zorgen dat website offline is;
* SSL kan enige tijd duren;
* wijzigingen kunnen door DNS-propagatie vertraagd zijn.

Log acties:

* domein toegevoegd;
* domein verwijderd;
* domein verificatie gestart;
* domein verificatie mislukt;
* domein verificatie gelukt.

---

# 10. Account verwijdering en data export voorbereiden

Status: uitgevoerd op 2026-07-13. De profielpagina bevat een JSON-export, afzonderlijke websiteverwijdering en definitieve accountverwijdering met e-mailbevestiging. De server controleert eigendom, gebruikt rate limiting, verwijdert gekoppelde Storage-bestanden en probeert custom domains uit Vercel op te ruimen. Website- en accountverwijdering worden in de auditlog vastgelegd.

Maak MVP-basis voor:

* account verwijderen;
* website verwijderen;
* data exporteren als JSON.

Als volledige functionaliteit nog niet past, maak dan minimaal:

* UI placeholder;
* duidelijke uitleg;
* TODO;
* backend structuur voorbereid.

Belangrijk voor privacy/GDPR.

---

# 11. Security headers controleren

Status: uitgevoerd op 2026-07-13. `next.config.mjs` stelt `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `Content-Security-Policy` en HSTS centraal in. De CSP staat de bestaande Supabase-verbindingen, HTTPS-afbeeldingen, Google Fonts en HTTPS-kaartframes toe en laat `unsafe-eval` alleen in development toe.

Controleer Next.js configuratie en voeg waar mogelijk security headers toe:

* `X-Frame-Options`
* `X-Content-Type-Options`
* `Referrer-Policy`
* `Permissions-Policy`
* `Content-Security-Policy` indien haalbaar zonder app te breken

Gebruik veilige defaults, maar voorkom dat Supabase, Vercel assets of afbeeldingen kapot gaan.

---

# 12. Admin-only pagina voor audit logs

Status: uitgevoerd op 2026-07-13. `/admin/audit-logs` toont maximaal 200 recente logs met datum, gebruiker, website, actie, metadata en IP. `isAdmin(user)` weigert standaard toegang en accepteert alleen server-beheerde Supabase `app_metadata.role = "admin"` of een e-mailadres uit de server-only `ADMIN_EMAILS` configuratie.

Maak een simpele adminpagina:

```txt
/admin/audit-logs
```

Alleen toegankelijk voor admins.

Toon:

* datum;
* gebruiker;
* website;
* actie;
* metadata;
* IP indien beschikbaar.

Als er nog geen adminrol bestaat, maak dan een duidelijke helper:

```ts
isAdmin(user)
```

Gebruik voorlopig een veilige placeholder of bestaande role-check.

---

# 13. Geen harde uptime-belofte

Status: gecontroleerd op 2026-07-13. Er zijn geen marketingclaims gevonden met 100% uptime, altijd-onlinegaranties of gegarandeerde beschikbaarheid. De juridische teksten vermelden juist expliciet dat geen 100% uptime wordt gegarandeerd.

Controleer marketingteksten en pricingpagina’s.

Verwijder of vermijd claims zoals:

```txt
Altijd online
100% uptime
Gegarandeerd beschikbaar
```

Gebruik liever:

```txt
Betrouwbare hosting
Wij monitoren de beschikbaarheid
Best effort beschikbaarheid
```

---

# 14. Acceptatiecriteria

Status: uitgevoerd en gecontroleerd op 2026-07-13. Alle criteria voor de bestaande MVP-flows zijn aanwezig. `npm run lint`, `npx tsc --noEmit`, de vier bestaande testsuites en `npm run build` zijn succesvol afgerond. Betalingsfouten blijven toekomstwerk totdat een echte Stripe-webhook wordt toegevoegd; de auditactie en beveiligde audit-API zijn hiervoor voorbereid.

De taak is klaar als:

* alle juridische pagina’s bestaan;
* footer naar alle juridische pagina’s linkt;
* statuspagina bestaat;
* audit log tabel en helper aanwezig zijn;
* belangrijke acties gelogd worden;
* contactformulier basisbescherming heeft;
* backup-strategie document bestaat;
* incident-response document bestaat;
* custom domain UI betere risicoteksten heeft;
* er geen 100% uptime belofte meer in de app staat;
* code TypeScript-validatie doorstaat;
* bestaande functionaliteit blijft werken.

---

# 15. Belangrijke randvoorwaarden

* Houd UI consistent met bestaande stijl.
* Gebruik bestaande componenten waar mogelijk.
* Geen grote refactor uitvoeren.
* Geen externe betaalde services toevoegen zonder TODO of duidelijke env-config.
* Geen juridische teksten presenteren als definitief juridisch advies.
* Voeg boven juridische templates een korte melding toe:

```txt
Let op: dit is een template en moet juridisch gecontroleerd worden voordat het definitief gebruikt wordt.
```

---

# 16. Aanbevolen bestandsstructuur

Gebruik waar mogelijk:

```txt
app/terms/page.tsx
app/privacy/page.tsx
app/cookies/page.tsx
app/processor-agreement/page.tsx
app/acceptable-use/page.tsx
app/disclaimer/page.tsx
app/status/page.tsx
app/admin/audit-logs/page.tsx

lib/audit-log.ts
lib/rate-limit.ts
lib/security.ts

docs/backup-strategy.md
docs/incident-response.md

supabase/migrations/create_audit_logs.sql
```

---

# 17. Extra: toekomstige verbeteringen

Niet verplicht voor deze taak, maar voorbereid houden:

* echte statuspagina met databasebeheer;
* Better Stack/UptimeRobot integratie;
* automatische incidentmeldingen per e-mail;
* automatische Supabase backup export;
* admin incident dashboard;
* Stripe webhook logging;
* 2FA;
* security scan;
* abuse report formulier;
* data retention instellingen per klant.
