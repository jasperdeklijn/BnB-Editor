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

Status: uitgevoerd op 2026-07-08. Toegevoegd: `audit_logs` tabel + migratie, `logAuditEvent` helper met try/catch, en logging voor huidige actiepunten: login, logout, website aangemaakt, website gepubliceerd/ongepubliceerd, sectie toegevoegd/verwijderd, domein toegevoegd/verwijderd, domeinverificatie gestart/gelukt/mislukt en abonnement gewijzigd via de huidige billing-UI. Actienamen voor `website.deleted`, `account.deleted` en `payment.failed` zijn voorbereid; die worden pas daadwerkelijk gelogd zodra de bijbehorende delete-flow of Stripe webhook bestaat.

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

Voeg rate limiting toe of bereid dit voor voor:

* contactformulier;
* login;
* wachtwoord reset;
* publicatie endpoint;
* domein-verificatie endpoint;
* AI-generatie endpoint indien aanwezig.

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

Controleer Next.js configuratie en voeg waar mogelijk security headers toe:

* `X-Frame-Options`
* `X-Content-Type-Options`
* `Referrer-Policy`
* `Permissions-Policy`
* `Content-Security-Policy` indien haalbaar zonder app te breken

Gebruik veilige defaults, maar voorkom dat Supabase, Vercel assets of afbeeldingen kapot gaan.

---

# 12. Admin-only pagina voor audit logs

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
