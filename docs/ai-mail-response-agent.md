# AI Mail Response Agent - uitvoeringsplan

## Doel

Bouw een interne, admin-only mailbox voor FlexPagina die nieuwe e-mail uit een
TransIP-mailbox ophaalt, gesprekken ordent en per nieuwe klantmail een
antwoordvoorstel maakt. Een beheerder kan het voorstel aanpassen en via de
TransIP SMTP-server verzenden.

De agent wordt beter door twee gecontroleerde kennisbronnen:

1. beheerde standaardantwoorden, bijvoorbeeld:
   `Hoe koppel ik een domeinnaam? -> Ga in het dashboard naar Domeinen en kies Domein koppelen.`
2. eerder daadwerkelijk verzonden antwoorden, waarbij het systeem vooral leert
   van het verschil tussen het AI-concept en de definitieve verzonden tekst.

## Productgrens voor de eerste versie

- Nieuwe mail ophalen en antwoordconcepten genereren mag automatisch.
- Een antwoord verzenden vereist altijd een expliciete adminactie.
- De AI mag geen acties in accounts uitvoeren en geen prijzen, garanties,
  restituties of juridische toezeggingen verzinnen.
- Berichten en bijlagen zijn onbetrouwbare invoer. Instructies in een e-mail
  mogen nooit systeemregels, autorisatie of kennisbankregels overschrijven.
- In versie 1 worden bijlagen alleen als veilige metadata getoond; inhoudelijke
  extractie en downloads komen pas na aparte malware- en bestandstypecontroles.

## Aansluiting op de bestaande codebase

Gebruik de aanwezige patronen:

- Next.js App Router, TypeScript, Supabase en de bestaande admincontrole via
  `isAdmin`.
- Supabase service-role alleen in servercode.
- AI via dezelfde Vercel AI Gateway/Responses-aanpak als
  `lib/leads/generateLeadInsight.ts`.
- SMTP via de bestaande `nodemailer`-configuratie.
- Cronroutes beveiligen met `Authorization: Bearer $CRON_SECRET`.
- Nieuwe tabellen toevoegen aan zowel een timestamped Supabase-migratie als
  `supabase/init.sql`.
- Mutaties zoals verzenden, kennis wijzigen en een concept opnieuw genereren
  opnemen in `audit_logs`.

## TransIP-verbinding

Gebruik voor de standaardconfiguratie:

```env
MAIL_IMAP_HOST=imap.transip.email
MAIL_IMAP_PORT=993
MAIL_IMAP_SECURE=true
MAIL_SMTP_HOST=smtp.transip.email
MAIL_SMTP_PORT=465
MAIL_SMTP_SECURE=true
MAILBOX_USER=
MAILBOX_PASSWORD=
MAIL_FROM_NAME=FlexPagina support
MAIL_SYNC_FOLDER=INBOX
MAIL_SENT_FOLDER=Sent
```

De gebruikersnaam is het volledige e-mailadres. Houd de mailboxgegevens
server-only en gebruik bij voorkeur een aparte supportmailbox. De exacte naam
van de map voor verzonden mail moet bij de eerste verbinding worden ontdekt en
in instellingen opgeslagen, omdat IMAP-mapnamen per mailbox/client kunnen
verschillen.

TransIP documenteert IMAP met SSL op poort 993 en SMTP met SSL op poort 465:

- https://www.transip.nl/knowledgebase/309-algemene-instellingen-voor-mijn-e-mailadres/

## Gewenste flow

```txt
Beveiligde cron start
-> korte IMAP-verbinding met TransIP
-> haal alleen berichten na de laatst verwerkte UID op
-> parse en normaliseer afzender, onderwerp, tekst en threadheaders
-> sla bericht idempotent op
-> zoek relevante standaardantwoorden en goede eerdere verzonden antwoorden
-> AI maakt concept met bronverwijzingen en confidence
-> admin ziet "Nieuw concept" in /admin/mailbox
-> admin controleert en bewerkt het antwoord
-> server verstuurt via TransIP SMTP
-> definitieve mail wordt opgeslagen en aan de IMAP-thread gekoppeld
-> concept, definitieve tekst en feedback worden leerdata voor volgende concepten
```

## Voorgesteld datamodel

### `mail_accounts`

Bevat geen wachtwoord, alleen mailboxconfiguratie en syncstatus:

- `id`, `email_address`, `display_name`
- `imap_host`, `imap_port`, `imap_secure`
- `smtp_host`, `smtp_port`, `smtp_secure`
- `inbox_folder`, `sent_folder`
- `last_inbox_uid`, `last_sent_uid`, `uid_validity`
- `enabled`, `last_synced_at`, `last_error`, timestamps

Voor versie 1 is één account voldoende, maar het schema krijgt een account-id
zodat later meerdere mailboxen mogelijk zijn. Het wachtwoord blijft uitsluitend
in environment variables.

### `mail_threads`

- `id`, `mail_account_id`, `subject_normalized`
- `contact_email`, `contact_name`
- `status`: `new`, `draft_ready`, `needs_review`, `replied`, `closed`, `ignored`
- `assigned_user_id`, `last_message_at`, `last_inbound_at`, `last_outbound_at`
- `unread_count`, timestamps

### `mail_messages`

- `id`, `thread_id`, `mail_account_id`
- `direction`: `inbound` of `outbound`
- unieke `internet_message_id`
- `in_reply_to`, `references`, `imap_folder`, `imap_uid`
- `from_address`, `from_name`, `to_addresses`, `cc_addresses`
- `subject`, `text_body`, optioneel gesaniteerde `html_body`
- `received_at`, `sent_at`, `is_read`
- `attachment_metadata` als JSON zonder binaire inhoud
- `raw_headers` met een kleine allowlist, niet het volledige ruwe bericht
- unieke sleutel op `(mail_account_id, imap_folder, imap_uid)`

### `mail_drafts`

- `id`, `thread_id`, `in_reply_to_message_id`
- `status`: `generating`, `ready`, `edited`, `sent`, `discarded`, `failed`
- `subject`, `suggested_body`, `final_body`
- `confidence`: `low`, `medium`, `high`
- `confidence_reasons`, `missing_information`
- `knowledge_answer_ids`, `example_message_ids`
- `model`, `prompt_version`, `generation_error`
- `generated_at`, `edited_at`, `sent_at`, `sent_by`

Bewaar `suggested_body` na bewerken ongewijzigd. Daardoor kan later de afstand
tot `final_body` worden gemeten zonder trainingsdata te vervalsen.

### `mail_knowledge_answers`

- `id`, `question`, `answer`
- `keywords`, `category`, `language`
- `status`: `draft`, `active`, `archived`
- `priority`, `created_by`, `updated_by`, timestamps

Begin met eenvoudige PostgreSQL full-text/trigram retrieval. Voeg embeddings pas
toe wanneer de kennisbank groot genoeg is en zoekkwaliteit aantoonbaar tekortschiet.

Voorbeeld seed:

```txt
Vraag: Hoe koppel ik een domeinnaam?
Antwoord: Ga in het dashboard naar Domeinen, kies Domein koppelen en volg daar de stappen.
Keywords: domein, domeinnaam, koppelen, verbinden, DNS
Categorie: domeinen
```

### `mail_sync_runs` en `mail_feedback`

`mail_sync_runs` registreert start/einde, trigger, UID-bereik, aantallen, status
en een veilige foutmelding. `mail_feedback` registreert per concept:

- `accepted_without_changes`
- `edited_then_sent`
- `discarded`
- optionele adminrating en reden
- berekende edit ratio en gebruikte kennisbronnen

## Hoe de agent gecontroleerd slimmer wordt

Gebruik retrieval-augmented generation, niet direct fine-tunen:

1. Classificeer de nieuwe mail op intentie, taal, urgentie en risico.
2. Haal maximaal 3 actieve standaardantwoorden op.
3. Haal maximaal 3 vergelijkbare, door een admin verzonden antwoorden op.
4. Geef alleen deze voorbeelden plus de recente thread aan het model.
5. Laat het model gestructureerde JSON retourneren met onderwerp, concept,
   confidence, ontbrekende informatie en de gebruikte bron-id's.
6. Verlaag confidence als bronnen ontbreken, de klant meerdere vragen stelt,
   accountgegevens nodig zijn of het onderwerp financieel/juridisch/abuse is.
7. Gebruik alleen verzonden antwoorden met voldoende kwaliteitsfeedback opnieuw.
8. Toon in de UI waarom een antwoord wordt voorgesteld en welke kennis is gebruikt.

Een vaste kennisbankregel heeft voorrang boven een oud verzonden voorbeeld. Het
model mag feiten uit klantmail of voorbeelden nooit als platformbeleid aannemen.

## Admin-mailbox

Maak `/admin/mailbox` met drie duidelijke kolommen op desktop en een bruikbare
gestapelde mobiele variant:

- links: filters en threads (`Nieuw`, `Concept klaar`, `Beantwoord`, `Gesloten`)
- midden: volledige conversatie in chronologische volgorde
- rechts/onder: bewerkbaar antwoordvoorstel, confidence en gebruikte bronnen

Benodigde acties:

- markeren als gelezen/ongelezen
- concept genereren of opnieuw genereren
- concept direct bewerken
- verzenden na bevestiging
- sluiten, negeren en heropenen
- een goed definitief antwoord opslaan als nieuw standaardantwoord
- een verkeerd standaardantwoord melden of archiveren

Maak daarnaast `/admin/mailbox/knowledge` voor zoeken, toevoegen, aanpassen,
activeren en archiveren van standaardantwoorden. Zet een Mailbox-tegel en een
ongelezen teller op `/admin`.

## API- en module-indeling

Voorgestelde servermodules:

```txt
lib/mail/imap-client.ts
lib/mail/parse-message.ts
lib/mail/threading.ts
lib/mail/sync-mailbox.ts
lib/mail/retrieve-context.ts
lib/mail/generate-reply.ts
lib/mail/send-reply.ts
lib/mail/risk-policy.ts
lib/mail/types.ts
```

Voorgestelde routes:

```txt
GET  /api/cron/mail-sync
POST /api/admin/mailbox/sync
POST /api/admin/mailbox/threads/[threadId]/draft
POST /api/admin/mailbox/threads/[threadId]/send
PATCH /api/admin/mailbox/threads/[threadId]
GET  /api/admin/mailbox/knowledge
POST /api/admin/mailbox/knowledge
PATCH /api/admin/mailbox/knowledge/[answerId]
```

Alle adminroutes controleren de ingelogde gebruiker server-side met `isAdmin`.
De sendroute accepteert alleen een bestaand concept-id, controleert ontvangers,
voorkomt dubbele verzending met een idempotency key en schrijft eerst een
`sending`-status. Na SMTP-succes wordt de outbound mail als verzonden opgeslagen.
Als TransIP de mail niet automatisch in de verzonden map plaatst, voeg hem via
IMAP toe of laat de Sent-sync hem later idempotent koppelen.

## Cronstrategie

IMAP van TransIP biedt hier geen webhook, dus polling is nodig. Open per run een
korte TLS-verbinding, verwerk een begrensde batch en sluit de verbinding altijd.
Gebruik geen langdurige IMAP IDLE-verbinding in een Vercel Function.

Aanbevolen productie-instelling:

```json
{
  "path": "/api/cron/mail-sync",
  "schedule": "*/5 * * * *"
}
```

Dit vereist op Vercel minimaal Pro. Vercel Hobby staat momenteel slechts één
cronuitvoering per dag toe en is daarom niet geschikt voor een actuele mailbox.
Als het project op Hobby blijft, gebruik dan een externe scheduler met dezelfde
beveiligde route of accepteer een dagelijkse sync. Houd rekening met best-effort
delivery: lock runs in de database en maak elke stap idempotent.

## Beveiliging en privacy

- Secrets uitsluitend als Vercel/server environment variables; nooit in
  Supabase, clientprops, logs of foutmeldingen.
- TLS-certificaten strikt valideren.
- RLS aanzetten en standaard geen clienttoegang geven; adminroutes gebruiken
  gecontroleerde serverqueries.
- HTML saniteren en standaard platte tekst tonen; nooit externe trackingpixels
  automatisch laden.
- Blokkeer automatisch antwoorden bij facturatie, opzegging, refunds, juridische
  claims, abuse, beveiligingsincidenten, persoonsgegevens of lage confidence.
- Verwijder quoted history en handtekeningen waar mogelijk vóór AI-verwerking,
  maar bewaar het originele genormaliseerde bericht voor de conversatieweergave.
- Stel een retentiebeleid in, bijvoorbeeld verwijder AI-generatiemetadata na 90
  dagen en mailinhoud volgens de vastgelegde support-/privacytermijn.
- Voeg rate limits, maximale berichtgrootte en maximale aantallen per cronrun toe.
- Log geen volledige mailbody of mailboxwachtwoorden.

## Gefaseerde checklist

### 1. Beslissingen en mailbox voorbereiden

- [ ] Kies de TransIP supportmailbox en maak een apart sterk wachtwoord.
- [ ] Bevestig Vercel Pro of kies een externe scheduler.
- [ ] Bevestig gewenste pollingfrequentie; startadvies is elke 5 minuten.
- [ ] Leg bewaartermijn en toegestane adminaccounts vast.
- [ ] Controleer via IMAP de echte mapnamen voor Inbox en Verzonden.

### 2. Dependencies en serverconfiguratie

- [x] Voeg een onderhouden IMAP-library en MIME-parser toe, bijvoorbeeld
  `imapflow` en `mailparser`.
- [ ] Voeg server-only IMAP/SMTP environment variables toe.
- [ ] Maak een configuratiecheck met duidelijke adminstatus zonder secrets te tonen.
- [ ] Hergebruik of centraliseer de bestaande Nodemailer-transporter.

### 3. Database

- [x] Maak de voorgestelde tabellen, constraints en indexes.
- [x] Voeg RLS toe met deny-by-default beleid.
- [x] Voeg sync-lock/idempotency constraints toe.
- [x] Spiegel de migratie volledig in `supabase/init.sql`.
- [x] Voeg het eerste domein-standaardantwoord als seed toe.

### 4. Veilige IMAP-sync

- [ ] Verbind met TransIP via TLS en valideer de mailboxconfiguratie.
- [x] Verwerk alleen UID's na de opgeslagen cursor en respecteer `UIDVALIDITY`.
- [x] Parse MIME, tekst, headers en veilige attachmentmetadata.
- [x] Maak threading op basis van `Message-ID`, `In-Reply-To` en `References`,
  met genormaliseerd onderwerp alleen als fallback.
- [x] Synchroniseer Inbox en Verzonden zodat antwoorden buiten het adminscherm
  ook als leer- en threadcontext beschikbaar komen.
- [ ] Voeg tests toe voor duplicate cronruns, reconnects en UID-reset.

### 5. Kennisbank

- [x] Bouw CRUD-routes en `/admin/mailbox/knowledge`.
- [x] Voeg zoeken, categorie, keywords, status en prioriteit toe.
- [x] Toon wijzigingen in auditlogs.
- [ ] Voeg minimaal 15-25 goedgekeurde antwoorden toe voor de meest voorkomende
  onderwerpen voordat conceptkwaliteit als productiegeschikt wordt beoordeeld.

### 6. Retrieval en AI-concepten

- [x] Classificeer risico met een deterministische fallback.
- [x] Zoek relevante vaste antwoorden en goede verzonden voorbeelden.
- [x] Bouw een versieerbare prompt met duidelijke prompt-injectiongrens.
- [x] Laat het model strikt gevalideerde JSON retourneren.
- [x] Sla confidence, bron-id's, model en promptversie op.
- [x] Maak fouten zichtbaar als `needs_review`; verstuur nooit vanuit deze stap.

### 7. Admin-mailbox UI

- [x] Bouw threadlijst, filters, unread-status en conversatieweergave.
- [x] Bouw de bewerkbare composer met confidence en bronuitleg.
- [x] Voeg laden, lege staat, syncfout en AI-fout als expliciete states toe.
- [x] Voeg handmatige sync en concept opnieuw genereren toe.
- [x] Voeg Mailbox-tegel en ongelezen teller toe aan `/admin`.
- [ ] Controleer desktop, toetsenbordbediening en 390px mobiel.

### 8. Veilig verzenden

- [x] Bouw een admin-only sendroute met ontvanger- en header-validatie.
- [x] Toon altijd een laatste bevestiging met Aan, onderwerp en body.
- [x] Verzend via TransIP SMTP met idempotencybescherming.
- [x] Bewaar de definitieve tekst en koppel het outbound Message-ID aan de thread.
- [x] Registreer verzenden en fouten in auditlog zonder mailinhoud te loggen.
- [ ] Voeg retries alleen toe voor aantoonbaar tijdelijke fouten en voorkom
  dubbele verzending.

### 9. Feedbacklus

- [x] Leg acceptatie en bewerking bij verzending vast.
- [x] Bereken edit ratio tussen voorgesteld en definitief antwoord.
- [x] Gebruik alleen daadwerkelijk verzonden mails
  als toekomstige voorbeelden.
- [ ] Voeg een adminrapport toe met acceptatiegraad, gemiddelde edit ratio,
  lage-confidence onderwerpen en vaak ontbrekende kennis.
- [ ] Laat admins vanuit een goede verzonden mail een concept-kennisantwoord maken;
  activeer dit pas na controle.

### 10. Cron, observability en beheer

- [x] Voeg `/api/cron/mail-sync` en het schema aan `vercel.json` toe.
- [x] Hergebruik `CRON_SECRET` en weiger requests zonder exact bearer token.
- [x] Voeg database-lock, batchlimiet en maximale looptijd toe.
- [x] Toon laatste sync, aantallen en veilige foutmelding in de adminmailbox.
- [ ] Waarschuw admins bij meerdere mislukte runs, zonder klant automatisch te mailen.

### 11. Testen en acceptatie

- [ ] Unit tests voor parsing, threading, retrieval, risicoregels en idempotency.
- [ ] Integratietest met een aparte TransIP testmailbox.
- [ ] Test inbound plain text, HTML, reply, forward, CC, lege body, grote mail,
  afwijkende encoding en attachmentmetadata.
- [ ] Test prompt injection in onderwerp, body en handtekening.
- [ ] Test SMTP-timeout en herhaling zonder dubbel bericht.
- [ ] Draai `npx tsc --noEmit`, gerichte ESLint, build en `git diff --check`.

### 12. Veilige uitrol

- [ ] Start met alleen synchroniseren, zonder AI-concepten.
- [ ] Activeer daarna suggesties voor admins, nog steeds zonder automatisch sturen.
- [ ] Verzamel minimaal 50 beoordeelde concepten en meet kwaliteit per categorie.
- [ ] Verbeter kennisbank en risicoregels op basis van gemeten fouten.
- [ ] Overweeg pas daarna optionele auto-send voor een zeer kleine allowlist van
  laag-risico intents, en alleen na een aparte product- en veiligheidsbeslissing.

## Definition of done voor versie 1

Versie 1 is klaar wanneer een nieuwe testmail binnen de afgesproken synctijd in
`/admin/mailbox` verschijnt, correct aan een thread wordt gekoppeld, een
brononderbouwd concept krijgt, door een admin kan worden aangepast en precies
één keer via TransIP kan worden verzonden. De definitieve tekst moet daarna als
feedback beschikbaar zijn, zonder dat secrets of volledige mailinhoud in logs
terechtkomen. Alle lokale type-, lint-, build- en gerichte tests moeten groen
zijn; de live IMAP-, SMTP- en croncontrole telt pas als voltooid met echte
deploymentsecrets en een aparte testmailbox.

## Belangrijkste open keuzes voor uitvoering

1. Welk TransIP e-mailadres wordt de supportmailbox?
2. Draait de productieomgeving op Vercel Pro, of is een externe scheduler nodig?
3. Mogen admins alleen het primaire antwoordadres gebruiken, of ook CC/BCC?
4. Welke bewaartermijn geldt voor mailinhoud en feedbackdata?
5. Welke 15-25 standaardvragen vormen de eerste goedgekeurde kennisbank?
