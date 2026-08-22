# FlexPagina AI-agentteam — functioneel uitvoeringsplan

> Status: gereed voor gefaseerde implementatie
> Doelgroep: developer(s), product owner en beheerder van FlexPagina
> Technische context: Next.js 16, TypeScript, Supabase, Vercel en Vercel AI Gateway
> Verplichte ontwerpbron: `docs/style-guide.md`

## 1. Besluit en doel

FlexPagina krijgt een gecontroleerd, event-driven agentsysteem dat overdag voorbereidende werkzaamheden uitvoert en de eigenaar een centrale wachtrij geeft voor beslissingen en goedkeuringen.

Dit plan bouwt voort op de bestaande:

- leadagent in `lib/leads`, `/admin/leads` en `lead_agent_*`;
- supportagent in `lib/mail`, `/admin/mailbox` en `mail_*`;
- server-side admincontrole in `lib/security.ts` en `lib/mail/admin-api.ts`;
- service-roleclient in `lib/supabase/admin.ts`;
- cronbeveiliging met `CRON_SECRET`;
- auditlog in `audit_logs`;
- styling uit `docs/style-guide.md`.

Agents mogen analyseren, classificeren, concepten maken, intern opslaan en tests voorbereiden. Externe communicatie, financiële acties, codepublicatie, merges en deployments vereisen expliciete menselijke autorisatie.

## 2. Vastgelegde MVP-keuzes

Deze keuzes zijn bindend voor fase 0 tot en met fase 5.

### 2.1 Runtime

- Vercel Route Handlers starten en verwerken jobs.
- Vercel Cron roept cronroutes met `GET` aan.
- Een dispatcher claimt per invocation maximaal twee jobs en verwerkt die met begrensde concurrency binnen dezelfde invocation.
- Er wordt geen onbeheerde fire-and-forget-Promise gestart.
- Iedere modelcall heeft een applicatietime-out van maximaal 25 seconden.
- Iedere route die werk uitvoert declareert een passende `maxDuration`.
- Doorlopende verwerking vereist een Vercel-plan dat cron vaker dan eenmaal per dag ondersteunt. Zonder dat plan is een externe scheduler of Supabase Cron een deploymentblocker.

### 2.2 Modelprovider

- De MVP behoudt de bestaande Vercel AI Gateway en de Responses-compatibele endpoint `https://ai-gateway.vercel.sh/v1/responses`.
- Provider en model komen uit een server-side allowlist/configuratie en worden per run opgeslagen.
- De bestaande supportmodelconfiguratie is de startwaarde; modelwijzigingen worden met de evaluatieset vergeleken.
- Modeloutput gebruikt waar ondersteund JSON Schema/Structured Outputs en wordt altijd opnieuw met Zod gevalideerd.
- OpenAI background mode, OpenAI-webhooks en de Agents SDK zijn geen MVP-afhankelijkheid.
- Als later OpenAI background mode nodig is, krijgt die integratie een directe OpenAI-client met `OPENAI_API_KEY`, ondertekende OpenAI-webhooks en een afzonderlijke provideradapter. Een Gateway-response wordt niet behandeld alsof het een OpenAI background response is.

Officiële referenties:

- [OpenAI — background mode](https://developers.openai.com/api/docs/guides/background)
- [OpenAI — webhooks](https://developers.openai.com/api/docs/guides/webhooks)
- [OpenAI — orchestration and handoffs](https://developers.openai.com/api/docs/guides/agents/orchestration)
- [Vercel — cron concurrency en idempotency](https://vercel.com/docs/cron-jobs/manage-cron-jobs)
- [Vercel — OpenResponses API](https://vercel.com/docs/ai-gateway/sdks-and-apis/openresponses)

### 2.3 Eerste specialist

De bestaande supportagent is de eerste specialist. De eerste end-to-end workflow is:

```text
inkomende supportmail
  -> idempotente agent_job
  -> manager/policy-router
  -> bestaande generateReplyDraft
  -> agent_artifact met verwijzing naar mail_draft
  -> approval
  -> bestaande sendReply-executor
  -> auditlog en job completed
```

Tijdens de MVP wordt geen supportmail automatisch verzonden, ook niet bij hoge confidence. Automatisch verzenden kan pas na een observe-onlypilot, een goedgekeurde categoriepolicy en afzonderlijke productgoedkeuring.

### 2.4 Managerpatroon

De manager is in de MVP primair een deterministische orchestration- en policyservice:

- routeert bekende `job_type`-waarden;
- controleert scope, risico, budget en kill switch;
- bouwt de minimale context voor de specialist;
- valideert specialistoutput;
- bepaalt of een approval nodig is;
- schrijft statusovergangen en auditgebeurtenissen.

Alleen ambigue inhoudelijke classificatie mag een modelcall gebruiken. Het model krijgt nooit zelf onbeperkte toolkeuze of toestemming voor externe acties. Agents-as-tools en handoffs zijn uitbreidingsopties, geen vereiste voor de eerste workflow.

## 3. Bestaande onderdelen en migratiestrategie

Er worden geen parallelle vervangers gebouwd voor bestaande domeintabellen.

| Bestaand onderdeel | Gebruik in agentsysteem |
| --- | --- |
| `mail_messages` | bron voor supportjob |
| `mail_drafts` | domeinrecord voor supportconcept |
| `mail_knowledge_answers` | gepubliceerde supportkennis; geen nieuwe kennisbank in MVP |
| `mail_sync_runs` | operationele mail-syncgeschiedenis |
| `sendReply()` en `mail_drafts.send_key` | bestaande idempotente supportexecutor |
| `lead_agent_settings` | bestaande marketingconfiguratie |
| `lead_agent_runs` | domeinspecifieke marketingrun; later koppelbaar aan `agent_jobs` |
| `ai_leads` | marketingartifact/domeinresultaat |
| `audit_logs` | bestaand bedrijfsbreed auditoverzicht |
| nieuwe `agent_audit_logs` | append-only technische agenttrail |

De generieke agenttabellen orkestreren. Domeindata blijft in de bestaande tabellen. Een `agent_artifact` bevat daarom waar mogelijk een veilige samenvatting en een verwijzing zoals `mailDraftId` of `leadId`, niet een onbeperkte kopie van klantdata.

Historische `mail_sync_runs` en `lead_agent_runs` worden niet gemigreerd. Nieuwe relevante runs kunnen een nullable `agent_job_id` krijgen. Daardoor blijft bestaande geschiedenis intact.

## 4. Rollen en bevoegdheden

### 4.1 Manager

Mag:

- jobs classificeren en routeren;
- specialisten starten;
- interne artifacts en approvals maken;
- taken blokkeren bij ontbrekende informatie;
- dagsamenvattingen maken.

Mag niet:

- externe communicatie verzenden;
- financiële acties uitvoeren;
- code publiceren, mergen of deployen;
- scopes, budgetten of eigen toolrechten verruimen.

### 4.2 Supportspecialist

Gebruikt uitsluitend:

- het betrokken mailthread;
- actieve `mail_knowledge_answers`;
- begrensde, goedgekeurde voorbeeldmails;
- de bestaande risk-policy en contextretrieval.

Output:

- onderwerp en antwoordconcept;
- confidence met redenen;
- ontbrekende informatie;
- gebruikte kennis-ID's;
- risico en aanbevolen vervolgactie;
- nooit de status `sent`.

### 4.3 Marketingspecialist

Wordt pas na de supportworkflow aan het generieke systeem gekoppeld. De bestaande leadzoek- en scoringsfuncties blijven de bron van waarheid.

Mag automatisch:

- leads zoeken binnen ingestelde limieten;
- publiek beschikbare websites analyseren;
- leads intern opslaan;
- persoonlijke conceptteksten maken.

Mag niet automatisch:

- marketingmail verzenden;
- contactinformatie omzeilen of onrechtmatig verzamelen;
- campagnebudgetten wijzigen.

### 4.4 Product- en administratieagent

Niet in de MVP. Deze rollen mogen later alleen interne samenvattingen en voorstellen maken. Financiële of abonnementswijzigingen blijven altijd handmatig.

### 4.5 Developer- en QA-agent

Niet in de Vercel-MVP-worker. Codeonderzoek en worktrees vereisen later een afzonderlijke ephemeral runner, bijvoorbeeld een afgeschermde GitHub Action of andere geïsoleerde CI-runtime.

Die runtime krijgt:

- een aparte branch/worktree per taak;
- geen productiesecrets;
- geen merge- of deployrechten;
- een commandoallowlist;
- begrensde netwerktoegang;
- test- en diffartifacts die terugkomen in een approval.

## 5. Functionele architectuur

### 5.1 Componenten

| Component | Verantwoordelijkheid |
| --- | --- |
| Next.js-admindashboard | jobs, runs, artifacts, approvals, status en dagoverzicht |
| Supabase Postgres | queue, leases, runs, artifacts, approvals, executions en audittrail |
| Supabase Realtime of polling | dashboardstatus verversen; geen onderdeel van queuecorrectheid |
| `GET /api/cron/agents/dispatch` | jobs claimen en begrensd uitvoeren |
| `GET /api/cron/agents/reconcile` | verlopen leases, onbekende executions en vastgelopen runs herstellen |
| `GET /api/cron/agents/daily-summary` | tijdzonebewuste dagsamenvatting enqueueën |
| Manager/policyservice | routering, risico, budget, outputvalidatie en approvalbeleid |
| Vercel AI Gateway-adapter | synchrone Responses-modelcalls in de MVP |
| Domeinadapters | bestaande mail-, lead-, audit- en later GitHubfuncties aanroepen |

### 5.2 End-to-end datastroom

1. Een trigger roept `enqueue_agent_job` aan met een stabiele deduplicatiesleutel.
2. De dispatcher controleert `agents_enabled`, dagbudget en batchlimiet.
3. `claim_agent_jobs` claimt maximaal twee beschikbare jobs met `FOR UPDATE SKIP LOCKED` en zet een lease.
4. De manager valideert jobtype, scope, payloadversie en risico.
5. Een `agent_run` wordt gestart.
6. De specialist produceert gestructureerde output.
7. Zod valideert de output; ongeldige output leidt tot maximaal één veilige modelretry.
8. Het resultaat wordt als immutable `agent_artifact` opgeslagen.
9. De policyservice zet de job op `completed` of `awaiting_approval`.
10. Bij approval maakt de server atomisch één `agent_execution` aan.
11. De domeinexecutor voert de actie uit met dezelfde idempotency key.
12. Statuswijzigingen en agent-auditregels worden transactioneel vastgelegd.

### 5.3 Geen exactly-once-claim

Het systeem belooft geen wiskundige exactly-once-executie over externe providers. Het levert:

- idempotente enqueueing;
- één actieve lease per job;
- single-use approvals;
- één executionrecord per approval en artifactversie;
- stabiele provider-idempotency keys waar ondersteund;
- reconciliatie bij een onbekende uitkomst;
- geen blinde retry van een externe actie als niet vastgesteld kan worden of die al is uitgevoerd.

## 6. Statusmodellen

### 6.1 Jobstatus

```text
queued
claimed
running
waiting_for_dependency
awaiting_approval
executing
completed
failed
dead_letter
cancelled
expired
```

Belangrijkste overgangen:

```text
queued -> claimed
claimed -> running|queued|dead_letter
running -> completed|awaiting_approval|waiting_for_dependency|queued|failed|dead_letter
waiting_for_dependency -> queued|cancelled|expired
awaiting_approval -> executing|cancelled|expired
executing -> completed|failed
failed -> queued|dead_letter|cancelled
iedere niet-terminale status -> cancelled via een bevoegde cancelactie
```

### 6.2 Runstatus

```text
queued
in_progress
completed
failed
cancelled
```

### 6.3 Approvalstatus

```text
pending
approved
rejected
expired
invalidated
executed
execution_failed
```

### 6.4 Executionstatus

```text
pending
executing
succeeded
failed
unknown
```

De client schrijft nooit rechtstreeks statussen. Alleen server-side RPC's of servicefuncties mogen geldige overgangen uitvoeren.

## 7. Datamodel

Alle schemawijzigingen komen zowel in een nieuwe file onder `supabase/migrations` als in `supabase/init.sql`.

### 7.1 `agent_jobs`

Minimaal:

- `id uuid primary key default gen_random_uuid()`;
- `business_id uuid null references businesses(id) on delete cascade`;
- `scope text not null check (scope in ('platform','business'))`;
- check: platform heeft `business_id is null`, business heeft `business_id is not null`;
- `job_type text not null`;
- `payload_version integer not null default 1`;
- `source text not null`;
- `deduplication_key text not null`;
- `priority smallint not null default 50`;
- `risk_level text not null`;
- `status text not null`;
- `payload jsonb not null default '{}'`;
- `scheduled_for timestamptz not null default now()`;
- `available_at timestamptz not null default now()`;
- `claimed_at timestamptz null`;
- `claimed_by text null`;
- `lease_expires_at timestamptz null`;
- `heartbeat_at timestamptz null`;
- `attempt_count integer not null default 0`;
- `max_attempts integer not null default 3`;
- `last_error_code text null`;
- `last_error_message text null`;
- `correlation_id uuid not null default gen_random_uuid()`;
- `created_at`, `updated_at`, `completed_at`.

Constraints en indexes:

- unique `(source, deduplication_key)`;
- index op `(status, available_at, priority desc)` voor claimen;
- index op `lease_expires_at` voor reconciliatie;
- index op `(business_id, created_at desc)`;
- payloadgrootte begrenzen in applicatiecode.

### 7.2 `agent_job_dependencies`

- `job_id`;
- `depends_on_job_id`;
- unique combinatie;
- check tegen self-dependency;
- alleen voldaan wanneer dependency `completed` is;
- cycli worden bij insert door de service geweigerd.

### 7.3 `agent_runs`

- `id`, `job_id`, `parent_run_id`;
- `agent_type`;
- `provider` en `model`;
- `status`;
- `prompt_version`;
- `provider_response_id` nullable;
- veilige `input_summary` en `output_summary`;
- `input_tokens`, `output_tokens`, `total_tokens` nullable;
- `estimated_cost` nullable en `currency`;
- `started_at`, `finished_at`;
- `error_code`, gesaniteerde `error_message`.

Volledige prompts en secrets worden niet in deze tabel opgeslagen.

### 7.4 `agent_artifacts`

- `id`, `job_id`, `run_id`;
- `artifact_type`;
- `title`;
- `content jsonb` met veilige inhoud of domeinrecord-ID;
- `version integer not null`;
- `content_hash text not null`;
- `supersedes_artifact_id uuid null`;
- `created_at`;
- unique `(job_id, artifact_type, version)`.

Artifacts zijn immutable. Een edit maakt een nieuwe versie.

### 7.5 `agent_approvals`

- `id`, `job_id`, `artifact_id`;
- `artifact_content_hash`;
- `action_type`, `risk_level`, `status`;
- `requested_at`, `expires_at`;
- `decided_at`, `decided_by`, `decision_note`;
- `created_at`, `updated_at`.

Een approval wordt `invalidated` zodra een nieuwere artifactversie de onderliggende inhoud wijzigt.

### 7.6 `agent_executions`

- `id`, `job_id`, `approval_id`, `artifact_id`;
- `executor_type`;
- `idempotency_key text not null unique`;
- `status`;
- `attempt_count`, `max_attempts`;
- `provider_action_id` nullable;
- `result_summary` nullable;
- `last_error_code`, gesaniteerde `last_error_message`;
- `started_at`, `finished_at`, `created_at`.

Een unieke constraint op `approval_id` voorkomt een tweede execution voor dezelfde approval.

### 7.7 `agent_audit_logs`

Append-only tabel met:

- actor type en actor id;
- event type;
- object type en object id;
- vorige en nieuwe status;
- correlation-id;
- veilige metadata;
- timestamp.

Er komen geen update- of deletepolicies. Agentstatus-RPC's schrijven de status en auditregel in dezelfde databasetransactie. Materiële externe acties schrijven daarnaast een samenvatting naar het bestaande `audit_logs`.

Een database-trigger weigert `UPDATE` en `DELETE` op bestaande auditregels voor normale applicatierollen. Alleen een expliciete beheer-/migratieprocedure mag onderhoud uitvoeren.

### 7.8 `agent_settings`

Server-owned singleton met minimaal:

- `agents_enabled boolean default false` als kill switch;
- `observe_only boolean default true`;
- `daily_budget numeric`;
- `max_jobs_per_dispatch integer default 2`;
- `support_enabled`, `marketing_enabled`;
- goedgekeurde modelallowlist en standaardmodellen;
- `updated_at`, `updated_by`.

## 8. Databasefuncties

Gebruik security-definerfuncties met een lege, vaste `search_path`, expliciete grants en server-only aanroep.

### 8.1 `enqueue_agent_job`

- valideert jobtype, scope en payloadversie;
- accepteert een niet-lege deduplicatiesleutel;
- doet insert-or-return-existing op `(source, deduplication_key)`;
- maakt bij een duplicate geen tweede externe actie of run;
- schrijft `job.enqueued` alleen voor een nieuwe job.

### 8.2 `claim_agent_jobs`

- gebruikt `FOR UPDATE SKIP LOCKED`;
- selecteert alleen `queued`, beschikbare, niet-geblokkeerde jobs;
- respecteert priority en ouderdom;
- zet `claimed_by`, `claimed_at` en `lease_expires_at`;
- verhoogt `attempt_count` atomisch;
- retourneert maximaal de ingestelde batchgrootte.

### 8.3 `transition_agent_job`

- lockt de jobrij;
- valideert de overgang tegen vaste server-side regels;
- controleert de actieve lease waar vereist;
- wijzigt status;
- schrijft de auditregel in dezelfde transactie.

### 8.4 `renew_agent_job_lease`

- alleen de actuele worker mag verlengen;
- verlengt nooit voorbij de maximale runtijd;
- schrijft niet voor ieder heartbeatmoment een onnodige auditregel.

### 8.5 `requeue_expired_agent_jobs`

- vindt verlopen leases;
- zet herstelbare jobs terug naar `queued` met backoff en jitter;
- zet jobs met opgebruikte pogingen op `dead_letter`;
- schrijft een auditregel per overgang.

## 9. API-contracten

Alle externe input en dynamische routeparameters worden met Zod gevalideerd.

### 9.1 Cronroutes — altijd `GET`

```text
GET /api/cron/agents/dispatch
GET /api/cron/agents/reconcile
GET /api/cron/agents/daily-summary
GET /api/cron/mail-sync
GET /api/cron/leads
```

Regels:

- dezelfde `Authorization: Bearer ${CRON_SECRET}`-controle als bestaande cronroutes;
- geen queryparametersecret;
- `Cache-Control: no-store`;
- stabiele lokale periodesleutel in `Europe/Amsterdam` voor dagsamenvatting en marketingruns;
- dubbele croninvocations leveren door deduplicatie maximaal één job op;
- Vercel Cron retryt niet automatisch, dus fouten blijven zichtbaar voor reconciliatie.

### 9.2 Interne serverroutes

```text
POST /api/internal/agents/jobs
POST /api/internal/agents/jobs/[jobId]/cancel
POST /api/internal/agents/jobs/[jobId]/retry
```

Deze routes vereisen service-authenticatie en zijn niet bedoeld voor browserclients.

### 9.3 Adminroutes

```text
GET  /api/admin/agents/jobs
GET  /api/admin/agents/jobs/[jobId]
GET  /api/admin/agents/runs/[runId]
GET  /api/admin/agents/approvals
POST /api/admin/agents/approvals/[approvalId]/approve
POST /api/admin/agents/approvals/[approvalId]/reject
POST /api/admin/agents/artifacts/[artifactId]/revise
POST /api/admin/agents/jobs/[jobId]/retry
POST /api/admin/agents/settings
```

Regels:

- gebruik de bestaande server-side `isAdmin`/`requireAdminApiUser`-grens;
- maak de service-roleclient pas nadat adminautorisatie geslaagd is;
- valideer alle mutaties runtime;
- approve/reject lockt de approval en is single-use;
- approve controleert expiry en artifacthash;
- hoog-risicoacties vereisen recente herauthenticatie voordat ze later worden toegevoegd.

### 9.4 Optionele OpenAI-webhookroute — niet in MVP

```text
POST /api/webhooks/openai
```

Pas toevoegen als directe OpenAI background responses daadwerkelijk worden gebruikt. Dan gelden:

- verifieer de handtekening op de onbewerkte requestbody met de officiële SDK;
- verwerk completed, failed, incomplete en cancelled;
- dedupliceer op webhookevent-ID;
- haal de response server-side op;
- koppel alleen aan een bekende `provider_response_id`;
- antwoord snel met 2xx en verwerk idempotent;
- voeg pollingreconciliatie toe voor gemiste webhooks.

## 10. Supportworkflow in de MVP

### 10.1 Trigger

Na succesvolle mailboxsync wordt voor ieder nieuw inkomend bericht één job aangemaakt:

```json
{
  "jobType": "support.reply_draft",
  "source": "mail_message",
  "deduplicationKey": "<mail_account_id>:<mail_message_id>",
  "scope": "platform",
  "payloadVersion": 1,
  "payload": {
    "threadId": "uuid",
    "messageId": "uuid"
  }
}
```

De payload bevat alleen IDs. De specialist laadt gegevens server-side na scopecontrole.

### 10.2 Verwerking

1. Manager controleert dat thread en message bestaan en bij elkaar horen.
2. Manager maakt een support-run.
3. Specialist hergebruikt `generateReplyDraft()`.
4. Prompt-injectiontekst uit de mail blijft onbetrouwbare data.
5. Zod valideert de modeloutput.
6. Bestaande risk-policy kan confidence verlagen.
7. Artifact verwijst naar `mailDraftId` en bevat alleen veilige metadata.
8. Approval met `action_type = support.send_reply` wordt aangemaakt.
9. Job wacht op approval.

### 10.3 Approval en uitvoering

1. Admin ziet bronmail, kennisbasis, confidence, risico en concept.
2. Edit maakt eerst een nieuwe artifactversie en invalideert de oude approval.
3. Approve controleert de actuele hash en maakt één executionrecord.
4. Executor roept de bestaande `sendReply()` aan met de stabiele `send_key`.
5. Bij bewezen SMTP-succes worden execution en job voltooid.
6. Bij timeout na SMTP-overdracht wordt status `unknown`; er wordt niet blind opnieuw verzonden.
7. Reconciliatie controleert de bestaande outbound message en IMAP-sentstatus voordat retry wordt toegestaan.

## 11. Marketingworkflow na de support-MVP

De bestaande `GET /api/cron/leads` blijft eerst werken. Daarna wordt die route dunner:

1. route berekent de bestaande Amsterdam-periodesleutel;
2. route enqueuet `marketing.lead_search`;
3. dispatcher roept de bestaande `runLeadSearch()` aan;
4. `lead_agent_runs` krijgt optioneel `agent_job_id`;
5. gevonden leads blijven in `ai_leads`;
6. artifact bevat aantallen, lead-ID's, bronnen en onzekerheden;
7. opslaan is automatisch toegestaan;
8. iedere outbound marketingmail vereist approval en is niet in de eerste marketingfase opgenomen.

## 12. Approvalmatrix

| Actie | MVP-beleid |
| --- | --- |
| Supportconcept maken | automatisch |
| Supportmail verzenden | altijd approval |
| Lead zoeken en intern opslaan | automatisch binnen limieten |
| Marketingconcept maken | automatisch |
| Marketingmail verzenden | altijd approval; executor later bouwen |
| GitHub-issue aanmaken | approval |
| Draft-PR publiceren | approval |
| PR mergen | niet beschikbaar voor agent |
| Productiedeploy | niet beschikbaar voor agent |
| Refund, korting of abonnement wijzigen | niet beschikbaar voor agent |
| Persoonsgegevens verwijderen | bestaande privacyflow plus herbevestiging; geen agentexecutor |

`observe_only = true` voorkomt tijdens de pilot alle externe executions, ook na een per ongeluk aangemaakte approval.

## 13. Security en privacy

### 13.1 Scope en RLS

- FlexPagina gebruikt `businesses.id` als businessscope; introduceer geen parallel `tenant_id`-concept.
- Platformjobs hebben expliciet `scope = platform` en `business_id = null`.
- Businessjobs hebben expliciet `scope = business` en een geldig `business_id`.
- Browsergebruikers krijgen geen directe schrijfrechten op agenttabellen.
- Adminqueries blijven server-side en admin-only.
- Service-roletoegang wordt uitsluitend na authenticatie/autorisatie gebruikt.
- Test business A tegen business B voor iedere read- en mutationroute.

### 13.2 Prompt- en toolveiligheid

- E-mails, websites, tickets, logs en GitHubtekst zijn onbetrouwbare data.
- Onbetrouwbare tekst kan geen toolrechten, beleid, model of outputcontract veranderen.
- Iedere specialist krijgt alleen expliciet toegewezen domeinfuncties.
- Toolinput wordt gevalideerd en output wordt begrensd.
- Modeltekst is nooit bewijs dat een toolactie is uitgevoerd; alleen het executionrecord en providerresultaat gelden.

### 13.3 Gegevensminimalisatie

- Stuur alleen velden die nodig zijn voor de taak.
- Log geen API-keys, cookies, mailwachtwoorden of service-rolekeys.
- Sla geen volledige prompts op in run- of auditrecords.
- Saniteer foutmeldingen voordat ze in de database komen.
- Voeg vóór productie bewaartermijnen toe voor jobs, runs, artifacts en auditdata.
- Verwijder of anonimiseer agentdata mee met bestaande account/privacyflows.

### 13.4 Budget en rate limiting

- Dagbudget wordt vóór iedere modelrun gereserveerd of conservatief gecontroleerd.
- Bij bereikt budget worden niet-kritieke jobs uitgesteld.
- Maximaal één veilige modelretry bij ongeldige output.
- Exponentiële backoff met jitter voor tijdelijke infrastructuurfouten.
- Rate limiting op handmatige run-, retry- en approvalroutes.
- Kill switch wordt vóór claimen en vóór externe execution opnieuw gecontroleerd.

## 14. Dashboard en styling

Alle UI volgt `docs/style-guide.md` en hergebruikt bestaande admincomponenten, buttons, dialogs, badges en tabellen.

### 14.1 Pagina's

```text
/admin/agents
/admin/agents/jobs/[jobId]
/admin/agents/approvals
/admin/agents/history
/admin/agents/settings
```

### 14.2 MVP-hoofdscherm

Begin met een functionele operationele weergave:

- `Jouw beslissing nodig`;
- `Klaar voor goedkeuring`;
- `Automatisch afgerond`;
- `Mislukt of geblokkeerd`;
- kill-switchstatus en dagbudget;
- filters op agent, status, risico en datum;
- directe link naar run, artifact en audittrail.

Het spinnenweb is een aanvullende visualisatie in fase 4, niet de enige manier om status te begrijpen. Tabellen en lijsten blijven de toegankelijke bron van waarheid.

### 14.3 Agent-spinnenweb

- manager centraal en specialisten rondom;
- actieve verbinding alleen bij een echte lopende overdracht;
- status nooit alleen met kleur;
- klik- en toetsenbordbediening;
- korte actuele taak per agent;
- `prefers-reduced-motion`;
- geen continue decoratieve animaties;
- mobiele fallback als verticale agentlijst.

### 14.4 Accessibility en responsive

- werkt vanaf 320 px;
- geen afgesneden approvalacties;
- logische focusvolgorde en focus return;
- dialogs met correcte focus trapping;
- semantische tabelheaders;
- toegankelijke namen en live status waar nuttig;
- WCAG AA-contrast;
- loading, empty, error, stale en offline states.

## 15. Cron- en dagschema

Alle tijdgebaseerde deduplicatiesleutels worden met `Europe/Amsterdam` berekend, niet met de serverlokale tijd.

| Trigger | Frequentie | Effect |
| --- | --- | --- |
| mail sync | iedere 5–10 minuten indien plan dit ondersteunt | nieuwe berichten opslaan en supportjobs enqueueën |
| dispatcher | iedere 5 minuten | maximaal twee beschikbare jobs uitvoeren |
| reconciler | iedere 15 minuten | verlopen leases en onbekende executions controleren |
| lead scheduler | bestaande maandagplanning | één marketingjob per Amsterdam-week |
| daily summary | periodieke cron met Amsterdam-tijdguard | één summaryjob per lokale kalenderdag rond 17:30 |

Als frequente cron niet beschikbaar is, mogen de routes handmatig worden getest maar is de continue productiewerking niet opgeleverd.

## 16. Implementatiefasen

### Fase 0 — voorbereiding en beslissingen

- [ ] Lees `docs/style-guide.md`, repositorydocs en huidige agentflows volledig.
- [ ] Leg Vercel-plan en beschikbare cronfrequentie vast.
- [ ] Bevestig Vercel AI Gateway als MVP-provider.
- [ ] Leg toegestane modeldata, bewaartermijnen en subverwerkers vast.
- [ ] Schrijf threat model voor prompt injection, scopelekken en dubbele externe acties.
- [ ] Leg approvalmatrix, dagbudget en kill-switchbeheer vast.
- [ ] Maak payloadschemas en promptversies voor `support.reply_draft`.

Exitcriteria:

- [ ] Geen open besluit over worker, provider, scope of approvalbeleid.
- [ ] Dataclassificatie en threat model goedgekeurd.
- [ ] MVP-testset bevat minimaal normale, ambigue en schadelijke supportinput.

### Fase 1 — queue en transactionele statusmotor

- [ ] Maak migratie voor jobs, dependencies, runs, artifacts, approvals, executions, settings en agent-auditlogs.
- [ ] Spiegel schema in `supabase/init.sql`.
- [ ] Implementeer enqueue-, claim-, transition-, renew- en reconcile-RPC's.
- [ ] Voeg constraints, indexes, RLS en expliciete grants toe.
- [ ] Bouw serverrepositories en Zodschemas.
- [ ] Test dubbele enqueue, concurrent claims, lease expiry, retries en dead-letter.
- [ ] Test platformscope en businessscope.

Exitcriteria:

- [ ] Twee gelijktijdige workers krijgen nooit dezelfde actieve lease.
- [ ] Iedere statusovergang heeft transactioneel een auditregel.
- [ ] Een gecrashte worker levert na lease expiry herstel of dead-letter op.
- [ ] Reset via `supabase/init.sql` levert hetzelfde schema.

### Fase 2 — bestaande supportagent integreren

- [ ] Laat mailboxsync voor nieuwe inbound messages idempotent supportjobs enqueueën.
- [ ] Bouw deterministische managerrouter voor `support.reply_draft`.
- [ ] Hergebruik `generateReplyDraft`, risk-policy en knowledge retrieval.
- [ ] Centraliseer Gateway-call, timeout, providermetadata en gebruiksregistratie.
- [ ] Gebruik Structured Outputs waar Gateway/model dit ondersteunt en valideer met Zod.
- [ ] Maak artifact met `mailDraftId`, hash en veilige samenvatting.
- [ ] Zet iedere supportjob op `awaiting_approval`.
- [ ] Bouw mocks; standaardtests doen geen echte modelcall.

Exitcriteria:

- [ ] Tien representatieve supportcases leveren geldig concept of verklaarde failure.
- [ ] Prompt-injectioncases krijgen geen extra rechten.
- [ ] Duplicate maildelivery levert maximaal één job en één actueel concept op.
- [ ] Geen supportmail kan door deze fase worden verzonden.

### Fase 3 — approvals en veilige supportexecutor

- [ ] Bouw approval API en overzicht.
- [ ] Toon bron, kennis, confidence, risico, artifactversie en audittrail.
- [ ] Implementeer edit als nieuwe immutable artifactversie.
- [ ] Implementeer approve, reject, expiry en invalidation.
- [ ] Maak atomisch één executionrecord per approval.
- [ ] Koppel executor aan bestaande `sendReply` en `send_key`.
- [ ] Behandel timeout na extern effect als `unknown`.
- [ ] Voeg reconciliatie toe voordat een onbekende send opnieuw mag.

Exitcriteria:

- [ ] Dubbel klikken kan maximaal één execution maken.
- [ ] Oude of verlopen approval kan niet worden uitgevoerd.
- [ ] Gewijzigd concept vereist nieuwe approval.
- [ ] Onbevoegde gebruiker krijgt 403 en geen service-rolequery.
- [ ] Observe-only blokkeert iedere send.

### Fase 4 — dispatcher, dagoverzicht en operations

- [ ] Voeg beveiligde GET-cronroutes toe.
- [ ] Verwerk maximaal twee jobs met begrensde concurrency.
- [ ] Voeg timeoutmonitor, retries, dead-letter en handmatige retry toe.
- [ ] Voeg kill switch en dagbudget toe.
- [ ] Bouw avondoverzicht en operationele agentpagina's.
- [ ] Voeg gecontroleerde polling of Realtime toe.
- [ ] Bouw toegankelijke desktop- en mobiele states.
- [ ] Voeg alerts toe voor herhaald falen en bereikt budget.

Exitcriteria:

- [ ] Systeem werkt zonder ingelogde eigenaar en zonder lokale computer.
- [ ] Duplicate croninvocation heeft geen dubbel effect.
- [ ] Vastgelopen job wordt zichtbaar hersteld of dead-letter.
- [ ] Dashboard werkt vanaf 320 px en status is niet kleurafhankelijk.

### Fase 5 — marketing integreren en pilot

- [ ] Laat bestaande leadscheduler een generieke marketingjob enqueueën.
- [ ] Hergebruik bestaande leadservices en limieten.
- [ ] Koppel nieuwe `lead_agent_runs` aan `agent_job_id`.
- [ ] Maak leadartifact met bronnen, scores en onzekerheden.
- [ ] Houd outbound marketing uitgeschakeld.
- [ ] Draai minimaal twee weken observe-only.
- [ ] Meet acceptatie, correcties, fouten, kosten en tijdwinst.

Exitcriteria:

- [ ] Leadjobs zijn idempotent per Amsterdam-week/periodesleutel.
- [ ] Geen marketingmail wordt automatisch verzonden.
- [ ] Pilotdata ondersteunt een expliciet go/no-go-besluit.

### Fase 6 — optionele OpenAI background mode

Alleen uitvoeren als gemeten taken regelmatig niet binnen de synchrone workerlimiet passen.

- [ ] Voeg officiële OpenAI SDK en directe OpenAI-provideradapter toe.
- [ ] Gebruik `background: true` uitsluitend voor geschikte lange runs.
- [ ] Voeg ondertekende OpenAI-webhookroute toe.
- [ ] Verwerk terminale events idempotent.
- [ ] Poll en reconcile gemiste events.
- [ ] Documenteer dataretentie en providerkeuze opnieuw.
- [ ] Houd bestaande Gateway-adapter voor korte runs of migreer bewust; vermeng response-ID's niet.

### Fase 7 — developer/QA en overige specialisten

- [ ] Kies en beveilig een ephemeral code-runner buiten de Vercel webworker.
- [ ] Gebruik GitHub App-rechten met least privilege.
- [ ] Maak alleen draft-PR's na approval.
- [ ] Laat QA onafhankelijk tests en diff beoordelen.
- [ ] Houd merge en deploy handmatig.
- [ ] Voeg product- en administratieagent alleen toe na aantoonbare MVP-waarde.
- [ ] Gebruik Responses multi-agent beta alleen voor concrete onafhankelijke deeltaken en na kosten/evalvergelijking.

## 17. Teststrategie

### 17.1 Nieuwe tests

Voeg minimaal toe:

```text
tests/agent-queue.test.mjs
tests/agent-status-transitions.test.mjs
tests/agent-support-workflow.test.mjs
tests/agent-approvals.test.mjs
tests/agent-cron-security.test.mjs
tests/agent-business-isolation.test.mjs
```

Voeg scripts toe:

```json
{
  "test:agents": "node --test tests/agent-*.test.mjs",
  "typecheck": "tsc --noEmit"
}
```

`next.config.mjs` bevat momenteel `typescript.ignoreBuildErrors: true`. Daarom is een geslaagde build geen bewijs van typesafety. `npm run typecheck` is verplicht en `ignoreBuildErrors` moet vóór productie worden verwijderd.

### 17.2 Verplichte scenario's

1. Normale supportvraag.
2. Ambigue vraag met ontbrekende informatie.
3. Boze klant met refundverzoek.
4. Mail met prompt-injectioninstructie.
5. Mail met API-key of ander secret in de tekst.
6. Duplicate IMAP-message of webhookdelivery.
7. Ongeldige modeloutput.
8. Modeltimeout vóór extern effect.
9. Timeout nadat SMTP mogelijk is geaccepteerd.
10. Twee workers claimen gelijktijdig.
11. Lease verloopt halverwege een run.
12. Approval wordt tweemaal verstuurd.
13. Artifact wijzigt na approvalaanvraag.
14. Approval verloopt.
15. Niet-admin probeert approval uit te voeren.
16. Business A probeert business B te lezen.
17. Dagbudget is bereikt.
18. Kill switch wordt geactiveerd tussen approval en execution.
19. Cronrun start tweemaal.
20. Bestaande tests falen al vóór een wijziging.

### 17.3 Live verificatie

- Tests gebruiken standaard mocks en veroorzaken geen modelkosten.
- Een gecontroleerde live-evaluatie gebruikt aparte testdata.
- SMTP-test gebruikt een veilige testmailbox.
- Supabase-migratie wordt eerst lokaal/staging toegepast.
- Productieclaims volgen pas nadat migrations, RLS, cron en echte serverconfiguratie zijn geverifieerd.

## 18. Observability en succesmetingen

Per job/run minimaal zichtbaar:

- correlation-id;
- trigger en deduplicatiesleutel;
- job-, run-, approval- en executionstatus;
- specialist, provider, model en promptversie;
- start- en eindtijd;
- tokengebruik en geschatte kosten indien beschikbaar;
- retry- en leasegeschiedenis;
- gesaniteerde foutcode;
- artifactversie en beslisser.

Meet tijdens pilot:

- aantal jobs per type;
- concepttijd;
- approvaltijd;
- acceptatie-, edit- en afwijzingspercentage;
- gemiddelde edit ratio van supportconcepten;
- ongeldige of onbruikbare outputs;
- geneutraliseerde duplicates;
- policy- en securityblokkades;
- dead-letterpercentage;
- kosten per taaktype;
- geschatte menselijke tijdwinst;
- incidenten door agentexecutions.

Succes betekent minder voorbereidingstijd zonder stijging van fouten of klantimpact. Maximale autonomie is geen MVP-doel.

## 19. Rollout en rollback

1. Deploy databasebasis met `agents_enabled = false`.
2. Verifieer RLS, grants, RPC's en adminroutes in staging.
3. Activeer queue en dispatcher met mocks.
4. Activeer echte supportgeneratie met `observe_only = true`.
5. Vergelijk twee weken lang artifacts met menselijke antwoorden.
6. Activeer approvals, maar houd executions geblokkeerd.
7. Activeer supportexecutor voor admins na go/no-go.
8. Integreer marketing pas na stabiele supportmetingen.
9. Automatiseer een laag-risicoactie pas na een apart besluit.

Rollback:

- zet eerst `agents_enabled = false`;
- stop nieuwe crontriggers;
- laat lopende externe executions niet blind opnieuw starten;
- behoud jobs, runs en audittrail voor onderzoek;
- herstel bestaande mailbox- en leadinterfaces onafhankelijk van het generieke dashboard;
- verwijder tabellen niet tijdens operationele rollback.

## 20. Definition of Done

Een fase is pas klaar wanneer alle toepasselijke punten aantoonbaar zijn gevalideerd.

### Functioneel

- [ ] Happy path werkt end-to-end.
- [ ] Duplicate triggers veroorzaken geen duplicate externe actie.
- [ ] Leaseherstel en dead-letter werken.
- [ ] Approval is single-use, actueel en niet verlopen.
- [ ] Onbekende externe uitkomst wordt niet blind geretryd.
- [ ] Kill switch blokkeert claim en execution.

### Code en database

- [ ] Repositoryconventies en bestaande services zijn hergebruikt.
- [ ] Migratie en `supabase/init.sql` zijn gelijkwaardig.
- [ ] Externe input en modeloutput hebben runtimevalidatie.
- [ ] Status en audit worden transactioneel geschreven.
- [ ] `npm run typecheck` slaagt.
- [ ] Relevante bestaande en nieuwe tests slagen.
- [ ] Geen secrets of service-rolekeys zitten in clientbundles of logs.

### Security en privacy

- [ ] Admin- en businessgrenzen zijn server-side getest.
- [ ] Prompt injection is getest.
- [ ] Modelcontext bevat alleen noodzakelijke data.
- [ ] Bewaartermijnen en verwijdering zijn vastgelegd.
- [ ] Rate limit, budgetlimiet en kill switch werken.
- [ ] Auditlogs bevatten geen secrets of volledige gevoelige prompts.

### UI

- [ ] `docs/style-guide.md` is gevolgd.
- [ ] Bestaande componenten en tokens zijn hergebruikt.
- [ ] Loading, empty, error, stale, offline en disabled states bestaan.
- [ ] Mobiel vanaf 320 px is getest.
- [ ] Keyboard, focus, reduced motion en WCAG AA zijn gecontroleerd.
- [ ] Status is niet uitsluitend door kleur herkenbaar.

### Operations

- [ ] Cronfrequentie past bij het actieve Vercel-plan of de vervangende scheduler.
- [ ] Dispatcher heeft begrensde concurrency en maximale duur.
- [ ] Reconciliatie herstelt gemiste of vastgelopen verwerking.
- [ ] Budget- en faalalerts zijn zichtbaar.
- [ ] Rollback via kill switch is getest.
- [ ] Productieconfiguratie en Supabase-migratie zijn live geverifieerd voordat productie als klaar wordt gemeld.

## 21. Eindresultaat

Na fase 4 beschikt FlexPagina over een betrouwbare agentworkflow voor supportconcepten, menselijke approvals, veilige verzending, herstelbare jobs en een dagelijks operationeel overzicht. Na fase 5 gebruikt ook de bestaande leadagent dezelfde queue en observability zonder bestaande domeindata te dupliceren.

Nieuwe agentrollen, OpenAI background mode, multi-agent en codewijzigende agents komen pas daarna. Daardoor blijft het systeem controleerbaar, idempotent en passend bij de huidige FlexPagina-architectuur.
