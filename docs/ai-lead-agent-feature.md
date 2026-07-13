# AI Lead Agent - Stappenplan voor Codex

## Doel

Bouw een interne AI lead-agent voor mijn SaaS website builder.
De agent zoekt lokale bedrijven, analyseert hun website, geeft een lead-score en slaat interessante leads op in Supabase.

De agent mag **niet automatisch e-mails versturen**. Outreach mag alleen als concept worden voorbereid zodat ik dit handmatig kan controleren.

---

## Technische context

Gebruik de bestaande stack:

* Next.js App Router
* TypeScript
* Supabase
* Tailwind
* Shadcn UI indien aanwezig
* Server-side API routes
* Geen automatische spam/outreach

---

## Gewenste flow

```txt
Admin klikt op "Zoek nieuwe leads"
→ systeem zoekt bedrijven op basis van branche + plaats
→ systeem analyseert website
→ systeem berekent lead-score
→ AI schrijft korte reden waarom lead interessant is
→ AI maakt optioneel een concept outreach-tekst
→ lead wordt opgeslagen in Supabase
→ admin ziet leads in dashboard
```

---

# Checklist

## 1. Database voorbereiden

Maak een Supabase tabel `leads`.

```sql
create table leads (
  id uuid primary key default gen_random_uuid(),

  company_name text not null,
  category text,
  city text,

  website text,
  phone text,
  email text,

  google_place_id text,
  google_rating numeric,
  google_reviews_count int,

  has_website boolean default false,
  has_https boolean default false,
  has_mobile_meta boolean default false,
  has_contact_form boolean default false,
  has_clear_cta boolean default false,

  pagespeed_score int,
  seo_title text,
  seo_description text,

  lead_score int default 0,
  reason text,
  outreach_draft text,

  status text default 'new',
  notes text,

  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);
```

### Status opties

Gebruik deze statussen:

```txt
new
interesting
contacted
not_interested
customer
ignored
```

Checklist:

* [x] Maak tabel `leads`
* [x] Voeg index toe op `google_place_id`
* [x] Voeg index toe op `city`
* [x] Voeg index toe op `category`
* [x] Voeg index toe op `status`
* [x] Zorg dat dubbele leads worden voorkomen op basis van `google_place_id` of `website`

---

## 2. Environment variables toevoegen

Voeg toe aan `.env.local`:

```env
GOOGLE_PLACES_API_KEY=
GOOGLE_PAGESPEED_API_KEY=
OPENAI_API_KEY=
```

Checklist:

* [x] Voeg env vars toe
* [x] Controleer dat keys alleen server-side gebruikt worden
* [x] Nooit API keys naar client sturen

---

## 3. Lead search API maken

Maak een API route:

```txt
app/api/admin/leads/search/route.ts
```

Deze route accepteert:

```ts
{
  city: string;
  category: string;
  limit?: number;
}
```

Voorbeeld:

```json
{
  "city": "Uden",
  "category": "kapper",
  "limit": 25
}
```

Checklist:

* [x] Alleen toegankelijk voor ingelogde/admin gebruiker
* [x] Valideer input
* [x] Gebruik Google Places API om bedrijven te zoeken
* [x] Haal bedrijfsnaam, telefoon, website, rating en reviews op
* [x] Sla ruwe resultaten niet dubbel op
* [x] Beperk standaard tot maximaal 25 leads per run

---

## 4. Website analyse functie maken

Maak helper:

```txt
lib/leads/analyzeWebsite.ts
```

Deze functie ontvangt een website URL en retourneert:

```ts
type WebsiteAnalysis = {
  hasWebsite: boolean;
  hasHttps: boolean;
  hasMobileMeta: boolean;
  hasContactForm: boolean;
  hasClearCta: boolean;
  seoTitle: string | null;
  seoDescription: string | null;
};
```

Checklist:

* [x] Controleer of website bestaat
* [x] Controleer of URL HTTPS gebruikt
* [x] Fetch homepage HTML
* [x] Check `<meta name="viewport">`
* [x] Check contactformulier via `<form>`
* [x] Check CTA woorden zoals:

  * contact
  * offerte
  * afspraak
  * bel
  * reserveren
* [x] Lees `<title>`
* [x] Lees meta description
* [x] Gebruik timeout zodat trage sites de run niet blokkeren
* [x] Fouten netjes afvangen

---

## 5. PageSpeed analyse toevoegen

Maak helper:

```txt
lib/leads/getPageSpeedScore.ts
```

Retourneer:

```ts
type PageSpeedResult = {
  score: number | null;
};
```

Checklist:

* [x] Gebruik Google PageSpeed Insights API
* [x] Analyseer mobile performance
* [x] Zet score om naar 0-100
* [x] Bij fout: retourneer `null`
* [x] Laat PageSpeed optioneel zijn zodat lead search niet faalt

---

## 6. Lead scoring maken

Maak helper:

```txt
lib/leads/calculateLeadScore.ts
```

Voorbeeldregels:

```ts
let score = 0;

if (!hasWebsite) score += 40;
if (pagespeedScore !== null && pagespeedScore < 50) score += 25;
if (!hasHttps) score += 10;
if (!hasMobileMeta) score += 10;
if (!hasContactForm) score += 10;
if (!hasClearCta) score += 10;
if (!seoTitle) score += 5;
if (!seoDescription) score += 5;

score = Math.min(score, 100);
```

Score betekenis:

```txt
0-30   = lage kans
31-60  = mogelijk interessant
61-80  = interessant
81-100 = zeer interessant
```

Checklist:

* [x] Maak scorefunctie
* [x] Houd score maximaal 100
* [x] Maak scoring makkelijk aanpasbaar
* [x] Sla score op in database

---

## 7. AI reden en outreach draft maken

Maak helper:

```txt
lib/leads/generateLeadInsight.ts
```

Input:

```ts
{
  companyName: string;
  category: string;
  city: string;
  website?: string;
  analysis: WebsiteAnalysis;
  pagespeedScore?: number | null;
  leadScore: number;
}
```

Output:

```ts
{
  reason: string;
  outreachDraft: string;
}
```

AI prompt:

```txt
Je bent een Nederlandse sales assistant voor een SaaS website builder voor kleine ondernemers en ZZP'ers.

Schrijf:
1. Een korte interne reden waarom deze lead interessant is.
2. Een vriendelijke outreach conceptmail.

Regels:
- Niet agressief verkopen.
- Niet doen alsof we de ondernemer persoonlijk kennen.
- Geen harde claims maken als die niet zeker zijn.
- Maximaal 120 woorden voor de mail.
- Schrijf in het Nederlands.
- Noem concreet wat verbeterd kan worden.
- Eindig met een laagdrempelige vraag.
```

Checklist:

* [x] Maak AI helper
* [x] Gebruik server-side API key
* [x] Maak fallback tekst als AI faalt
* [x] Verstuur nooit automatisch e-mail
* [x] Sla alleen concepttekst op

---

## 8. Leads opslaan in Supabase

Maak helper:

```txt
lib/leads/saveLead.ts
```

Checklist:

* [x] Upsert op basis van `google_place_id`
* [x] Als `google_place_id` ontbreekt, voorkom dubbeling via website + company_name
* [x] Sla alle analysevelden op
* [x] Sla `reason` op
* [x] Sla `outreach_draft` op
* [x] Zet nieuwe leads standaard op `new`

---

## 9. Admin dashboard maken

Maak pagina:

```txt
app/admin/leads/page.tsx
```

Functionaliteit:

* Overzicht van leads
* Filter op status
* Filter op plaats
* Filter op branche
* Sorteer op lead_score
* Knop om nieuwe leads te zoeken
* Detailweergave per lead

Checklist:

* [x] Maak leads tabel
* [x] Toon bedrijfsnaam
* [x] Toon branche
* [x] Toon plaats
* [x] Toon website
* [x] Toon score
* [x] Toon reden
* [x] Toon status
* [x] Maak status aanpasbaar
* [x] Maak notitieveld
* [x] Maak knop “Open website”
* [x] Maak knop “Kopieer outreach tekst”

---

## 10. Zoekformulier toevoegen

Op `/admin/leads`:

Velden:

```txt
Plaats: Uden
Branche: kapper
Aantal: 25
```

Vooraf ingevulde branches:

```txt
kapper
hovenier
schoonheidssalon
nagelstudio
fysiotherapeut
tandarts
schildersbedrijf
loodgieter
elektricien
aannemer
restaurant
bed and breakfast
camping
coach
fotograaf
```

Checklist:

* [x] Maak formulier
* [x] Valideer invoer
* [x] Toon loading state
* [x] Toon hoeveel leads gevonden zijn
* [x] Toon foutmelding bij API error
* [x] Refresh leadlijst na succesvolle run

---

## 11. Veiligheid en anti-spam

Belangrijk:

* De agent mag niet automatisch outreach-e-mails naar leads versturen.
* Alle outreach moet eerst handmatig worden gecontroleerd.
* Geen scraping van e-mailadressen als dit tegen voorwaarden ingaat.
* Respecteer rate limits.
* Gebruik alleen openbare bedrijfsinformatie.

Checklist:

* [x] Geen automatische outreach-mailfunctie naar leads
* [x] Geen bulk-send knop
* [x] Rate limiting op lead search route
* [x] Admin-only toegang
* [x] Log fouten zonder gevoelige data
* [x] API keys niet naar client lekken

---

## 12. Cron job pas later toevoegen

Voor MVP nog geen automatische cron.

Later eventueel:

```txt
Elke maandag 09:00:
zoek 25 nieuwe leads in ingestelde regio's
```

Checklist later:

* [x] Vercel Cron toevoegen
* [x] Instellingenpagina maken voor regio's en branches
* [x] Maximaal aantal leads per week instelbaar maken
* [x] Notificatie sturen naar admin na run

De notificatie bestaat uit dashboardhistorie en, indien SMTP + `ADMIN_EMAILS` zijn ingesteld, een korte e-mail aan beheerders. Er worden nooit automatisch outreach-e-mails naar leads verstuurd.

---

# MVP scope

Bouw eerst alleen dit:

* [x] Supabase tabel `leads`
* [x] API route om leads te zoeken
* [x] Website analyse
* [x] Lead score
* [x] AI reden + outreach draft
* [x] Admin dashboard
* [x] Handmatige knop “Zoek nieuwe leads”

Niet doen in MVP:

* [x] Geen automatische e-mails naar leads
* [ ] Geen cron job
* [ ] Geen complexe CRM
* [ ] Geen uitgebreide analytics
* [ ] Geen automatische follow-ups

---

# Acceptatiecriteria

De feature is klaar wanneer:

* [ ] Ik op `/admin/leads` een plaats en branche kan invullen
* [ ] Ik op “Zoek leads” kan klikken
* [ ] Het systeem bedrijven zoekt
* [ ] Het systeem websites analyseert
* [ ] Leads worden opgeslagen in Supabase
* [ ] Elke lead een score heeft
* [ ] Elke lead een reden heeft
* [ ] Elke lead een outreach concepttekst heeft
* [ ] Ik leads kan filteren en status kan aanpassen
* [ ] Er geen automatische outreach-e-mails naar leads worden verstuurd

---

# Codex opdracht

Implementeer bovenstaande feature stap voor stap in de bestaande Next.js/Supabase applicatie.

Werk netjes en production-ready:

* Gebruik TypeScript types
* Maak kleine herbruikbare helpers
* Voeg error handling toe
* Houd server-side secrets veilig
* Maak UI simpel maar bruikbaar
* Gebruik bestaande styling/componenten waar mogelijk
* Breek bestaande functionaliteit niet
