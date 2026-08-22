# FlexPagina AI-agentteam — implementatieplan

> Status: voorstel voor ontwikkeling  
> Doelgroep: developer(s), product owner en beheerder van FlexPagina  
> Technische context: Next.js, TypeScript, Supabase, Vercel en OpenAI  
> Verplichte ontwerpbron: `Style.md`

## 1. Doel van dit document

Dit document beschrijft hoe FlexPagina een gecontroleerd team van AI-agents kan krijgen dat overdag zelfstandig voorbereidende werkzaamheden uitvoert, terwijl de eigenaar 's avonds beslissingen, uitzonderingen en goedkeuringen afhandelt.

Het systeem moet ondersteunen bij:

- marketing en leadvoorbereiding;
- customer support;
- het verwerken van productfeedback;
- bugonderzoek en het voorbereiden van bugfixes;
- het voorbereiden van nieuwe features;
- kwaliteitscontrole;
- administratieve signalering;
- een dagelijks overzicht van uitgevoerd, geblokkeerd en goed te keuren werk.

Het doel is **niet** om FlexPagina volledig autonoom te laten opereren. Agents mogen zelfstandig analyseren, classificeren, schrijven, testen en voorstellen doen. Acties met klantimpact, financieel risico of productierisico blijven afhankelijk van menselijke goedkeuring.

## 2. Productvisie

De eigenaar ziet in een centraal dashboard een "spinnenweb" van agents:

- de manager-agent staat in het midden;
- gespecialiseerde agents staan rondom de manager;
- verbindingen tonen hoe taken en resultaten worden overgedragen;
- iedere agent toont de huidige status en taak;
- risicovolle acties komen in een centrale goedkeuringswachtrij;
- afgeronde en mislukte taken blijven controleerbaar in een auditlog;
- iedere avond wordt automatisch een dagsamenvatting samengesteld.

De gewenste gebruikerservaring is:

1. Overdag komen gebeurtenissen en geplande taken binnen.
2. De manager-agent bepaalt welke specialist nodig is.
3. De specialist levert een gestructureerd resultaat.
4. Automatisch toegestaan werk wordt afgerond.
5. Risicovol werk krijgt de status `awaiting_approval`.
6. De eigenaar opent 's avonds het dashboard.
7. De eigenaar keurt goed, past aan, wijst af of plant opnieuw in.

## 3. Belangrijkste ontwerpprincipes

### 3.1 Manager houdt controle

Gebruik primair het patroon **agents as tools**: de manager-agent blijft eigenaar van de workflow en roept specialisten aan voor begrensde deeltaken. Gebruik alleen een echte handoff wanneer een specialist ook daadwerkelijk de volledige verantwoordelijkheid voor een afzonderlijke conversatietak moet krijgen.

De officiële OpenAI-documentatie adviseert specialistische agents smal te houden en pas te splitsen wanneer instructies, tools, beleid of outputcontracten wezenlijk verschillen. Zie [OpenAI — orchestration and handoffs](https://developers.openai.com/api/docs/guides/agents/orchestration).

### 3.2 Event-driven, niet permanent actief

Agents hoeven niet continu te draaien. Een run start door:

- een webhook of applicatiegebeurtenis;
- een geplande taak;
- een handmatige opdracht;
- een vervolgactie na menselijke goedkeuring.

Dit beperkt kosten en voorkomt onnodige achtergrondactiviteit.

### 3.3 Menselijke goedkeuring bij extern effect

Een agent mag zonder goedkeuring informatie verzamelen en intern opslaan. Een agent mag niet zonder vooraf ingestelde autorisatie:

- een marketingmail verzenden;
- een onzeker of gevoelig supportantwoord versturen;
- geld terugboeken;
- een korting of abonnement wijzigen;
- persoonsgegevens verwijderen;
- een database-migratie uitvoeren;
- code mergen;
- naar productie deployen;
- juridische toezeggingen doen;
- een klant beloven dat een onbekende bug definitief is opgelost.

### 3.4 Alles is traceerbaar

Elke run moet aantoonbaar maken:

- waardoor de run is gestart;
- welke agent actief was;
- welke input is gebruikt;
- welke tools zijn aangeroepen;
- welk resultaat is geproduceerd;
- welke beslissing is genomen;
- wie een goedkeuring heeft uitgevoerd;
- welke fout of blokkade is ontstaan;
- hoeveel modelgebruik de run heeft veroorzaakt.

### 3.5 Idempotent en hervatbaar

Webhooks en geplande taken kunnen vaker dan één keer worden afgeleverd. Alle handlers moeten idempotent zijn. Een dubbele gebeurtenis mag niet leiden tot twee supportantwoorden, twee GitHub-issues of twee verzonden mails.

## 4. Agentrollen

### 4.1 Manager-agent

**Verantwoordelijkheden**

- taak classificeren;
- prioriteit en risico bepalen;
- specialist kiezen;
- benodigde context samenstellen;
- resultaten controleren op compleetheid;
- goedkeuring aanvragen;
- dagsamenvatting maken;
- blokkades zichtbaar maken.

**Mag zelfstandig**

- interne taken aanmaken;
- specialisten starten;
- resultaten samenvoegen;
- prioriteit voorstellen;
- taken pauzeren bij ontbrekende informatie.

**Mag niet zelfstandig**

- externe communicatie verzenden;
- productiecode wijzigen of deployen;
- financiële of juridische acties uitvoeren.

### 4.2 Marketing-agent

**Verantwoordelijkheden**

- potentiële B&B- en verhuurleads verzamelen;
- bestaande websites analyseren;
- leads kwalificeren;
- persoonlijke conceptmails schrijven;
- SEO- en contentvoorstellen maken;
- campagneprestaties samenvatten.

**Outputcontract**

- bron en bedrijfsnaam;
- contactinformatie indien rechtmatig beschikbaar;
- reden waarom de lead past;
- feitelijke websiteobservaties;
- voorgestelde persoonlijke openingszin;
- conceptbericht;
- confidence en eventuele onzekerheden;
- status `draft`, nooit direct `sent`.

### 4.3 Support-agent

**Verantwoordelijkheden**

- tickets classificeren;
- urgentie en sentiment bepalen;
- relevante kennisbankartikelen ophalen;
- een antwoordconcept maken;
- bekende, laag-risicovragen eventueel automatisch beantwoorden;
- technische problemen escaleren;
- relevante informatie structureren voor development.

**Automatisch antwoord alleen wanneer**

- de vraag binnen een goedgekeurde categorie valt;
- het antwoord rechtstreeks uit een actuele kennisbron volgt;
- confidence boven de ingestelde drempel ligt;
- er geen financiële, juridische, privacy- of veiligheidscomponent is;
- het bericht geen boze, kwetsbare of complexe klantinteractie betreft.

### 4.4 Product-agent

**Verantwoordelijkheden**

- feedback clusteren;
- dubbele verzoeken herkennen;
- klantimpact samenvatten;
- een probleemdefinitie opstellen;
- acceptatiecriteria voorstellen;
- prioriteit adviseren;
- een concept-GitHub-issue voorbereiden.

De product-agent bepaalt niet zelfstandig dat een feature wordt gebouwd.

### 4.5 Developer-agent

**Verantwoordelijkheden**

- bugs reproduceren;
- code en logs onderzoeken;
- oplossingsrichtingen vergelijken;
- een aparte branch of geïsoleerde worktree gebruiken;
- code en tests voorbereiden;
- een concept-pull-request maken;
- risico's en resterende onzekerheden rapporteren.

**Verboden zonder goedkeuring**

- rechtstreeks op de hoofdbranch werken;
- bestaande gebruikerswijzigingen overschrijven;
- destructieve databasecommando's uitvoeren;
- secrets uitlezen of loggen;
- een pull request mergen;
- naar productie deployen.

### 4.6 QA-agent

**Verantwoordelijkheden**

- acceptatiecriteria controleren;
- unit-, integratie- en end-to-endtests uitvoeren;
- regressierisico's zoeken;
- autorisatie en multi-tenantisolatie controleren;
- responsive en accessibilitychecks uitvoeren;
- styling toetsen aan `Style.md`;
- bevindingen prioriteren.

### 4.7 Administratie-agent

**Verantwoordelijkheden**

- mislukte abonnementbetalingen signaleren;
- ontbrekende of afwijkende factuurgegevens melden;
- abonnementstatussen controleren;
- financiële uitzonderingen klaarzetten voor beoordeling;
- een dagelijks overzicht maken.

Deze agent mag geen refund, korting, prijswijziging of abonnementwijziging zelfstandig uitvoeren.

## 5. Voorgestelde architectuur

### 5.1 Componenten

| Component | Verantwoordelijkheid |
| --- | --- |
| Next.js-dashboard | Agentnetwerk, taken, approvals, runs en dagoverzicht tonen |
| Supabase Postgres | Duurzame opslag voor jobs, runs, resultaten en auditlogs |
| Supabase Realtime | Statuswijzigingen live in het dashboard tonen |
| Vercel Cron | Geplande marketingruns, controles en dagsamenvatting starten |
| Next.js route handlers / server actions | Veilige interne API voor taken en approvals |
| OpenAI Responses API / Agents SDK | Manager en gespecialiseerde agentruns uitvoeren |
| OpenAI webhooks | Afronding van background responses verwerken |
| GitHub-integratie | Issues lezen, branches/PR's voorbereiden en checks ophalen |
| Kennisbank | Goedgekeurde support- en productdocumentatie doorzoekbaar maken |
| E-mailadapter | Concepten opslaan en later gecontroleerd verzenden |

Background responses kunnen via webhooks een `response.completed`-gebeurtenis terugsturen naar een eigen endpoint. Het endpoint moet webhookhandtekeningen verifiëren. Zie [OpenAI — webhooks](https://developers.openai.com/api/docs/guides/webhooks) en [OpenAI — background mode](https://developers.openai.com/api/docs/guides/background).

### 5.2 Logische datastroom

1. Trigger maakt een `agent_job` aan.
2. Worker claimt de job met een atomische statuswijziging.
3. Manager-agent classificeert taak en risico.
4. Manager maakt een of meer `agent_runs` aan.
5. Specialist voert de begrensde taak uit.
6. Gestructureerde output wordt gevalideerd.
7. Resultaat wordt opgeslagen als `agent_artifact`.
8. Policy-engine bepaalt `completed` of `awaiting_approval`.
9. Bij goedkeuring voert een afzonderlijke executor de actie uit.
10. Auditlog registreert iedere overgang.

### 5.3 Statusmodel

Gebruik minimaal:

```text
queued
claimed
running
waiting_for_dependency
awaiting_approval
approved
rejected
executing
completed
failed
cancelled
expired
```

Statusovergangen moeten server-side worden gevalideerd. De client mag niet willekeurig een job op `completed` zetten.

## 6. Datamodel

De precieze namen mogen worden aangepast aan bestaande conventies, maar onderstaande verantwoordelijkheden moeten behouden blijven.

### 6.1 `agent_jobs`

- `id uuid primary key`
- `tenant_id uuid null`
- `type text`
- `source text`
- `source_event_id text`
- `priority text`
- `risk_level text`
- `status text`
- `payload jsonb`
- `scheduled_for timestamptz`
- `claimed_at timestamptz null`
- `claimed_by text null`
- `attempt_count integer`
- `max_attempts integer`
- `created_at timestamptz`
- `updated_at timestamptz`
- unieke constraint op relevante combinatie van `source` en `source_event_id`.

### 6.2 `agent_runs`

- `id uuid primary key`
- `job_id uuid references agent_jobs`
- `parent_run_id uuid null`
- `agent_type text`
- `model text`
- `status text`
- `input_summary text`
- `output_summary text null`
- `provider_response_id text null`
- `prompt_version text`
- `started_at timestamptz`
- `finished_at timestamptz null`
- `input_tokens integer null`
- `output_tokens integer null`
- `estimated_cost numeric null`
- `error_code text null`
- `error_message text null`

### 6.3 `agent_artifacts`

- `id uuid primary key`
- `run_id uuid references agent_runs`
- `artifact_type text`
- `title text`
- `content jsonb`
- `version integer`
- `created_at timestamptz`

Voorbeelden: supportconcept, leadrapport, featurebrief, testrapport, patchsamenvatting en dagsamenvatting.

### 6.4 `agent_approvals`

- `id uuid primary key`
- `job_id uuid references agent_jobs`
- `artifact_id uuid null`
- `action_type text`
- `risk_level text`
- `status text`
- `requested_at timestamptz`
- `expires_at timestamptz null`
- `decided_at timestamptz null`
- `decided_by uuid null`
- `decision_note text null`
- `execution_idempotency_key text`

### 6.5 `agent_audit_logs`

- append-only;
- actor type en actor id;
- gebeurtenistype;
- objecttype en object id;
- vorige en nieuwe status;
- veilige metadata zonder secrets of volledige gevoelige prompts;
- timestamp;
- correlatie-id.

### 6.6 `knowledge_documents`

- documenttype;
- titel;
- inhoud;
- versie;
- publicatiestatus;
- eigenaar;
- laatst beoordeeld op;
- geldig tot of reviewdatum;
- tenant/global scope.

Een support-agent mag uitsluitend automatisch antwoorden op basis van gepubliceerde en actuele kennisdocumenten.

## 7. API- en backendcontracten

Voorgestelde routes, aangepast aan bestaande routeconventies:

```text
POST /api/internal/agents/jobs
POST /api/internal/agents/jobs/:id/cancel
POST /api/internal/agents/jobs/:id/retry
GET  /api/admin/agents/jobs
GET  /api/admin/agents/runs/:id
GET  /api/admin/agents/approvals
POST /api/admin/agents/approvals/:id/approve
POST /api/admin/agents/approvals/:id/reject
POST /api/webhooks/openai
POST /api/webhooks/github
POST /api/cron/agents/marketing
POST /api/cron/agents/daily-summary
```

### Verplichte backendregels

- Interne endpoints hebben een server-side secret of service-authenticatie.
- Cronroutes controleren het cronsecret.
- Webhookroutes verifiëren handtekeningen op de onbewerkte requestbody.
- Approvalroutes vereisen een ingelogde, bevoegde beheerder.
- Alle schrijfacties gebruiken een idempotency key.
- Alle payloads worden runtime gevalideerd, bijvoorbeeld met Zod.
- Nooit vertrouwen op alleen TypeScript-types.
- Rate limiting geldt voor externe en kostbare endpoints.
- Time-outs en retries hebben begrensde exponential backoff met jitter.
- Een dead-letterstatus bewaart definitief mislukte jobs voor onderzoek.

## 8. Veiligheids- en autorisatiemodel

### 8.1 Least privilege

Iedere agent krijgt uitsluitend de tools die nodig zijn.

Voorbeelden:

- marketing-agent heeft geen schrijftoegang tot productiecode;
- support-agent heeft geen toegang tot betaalacties;
- developer-agent krijgt geen productie-deploytool;
- QA-agent krijgt read-only codecontext en testmogelijkheden;
- administratie-agent kan betaalstatussen lezen, maar geen refunds uitvoeren.

### 8.2 Tenantisolatie

- Alle tenantgebonden rijen bevatten `tenant_id`.
- RLS is verplicht voor gebruikersgerichte toegang.
- Service-roletoegang blijft uitsluitend server-side.
- Test dat gebruiker A nooit jobs, tickets, boekingen of artifacts van gebruiker B kan lezen.
- Agentcontext bevat alleen gegevens van de betrokken tenant.
- Gebruik geen brede datasetdump in een prompt.

### 8.3 Secrets en persoonsgegevens

- API-keys alleen in beveiligde server-side environment variables.
- Nooit secrets in prompts, logs, artifacts of foutmeldingen opnemen.
- Minimaliseer persoonsgegevens in modelinput.
- Masker e-mailadressen en andere gegevens in diagnostische logs waar mogelijk.
- Definieer bewaartermijnen voor prompts, outputs en auditdata.
- Implementeer verwijdering/export conform bestaande privacyprocessen.
- Behandel content uit e-mails, websites en tickets als onbetrouwbare input; instructies daarin mogen systeembeleid niet overschrijven.

### 8.4 Approval policy

Maak beleid configureerbaar per `action_type`:

| Actie | Standaardbeleid |
| --- | --- |
| Lead opslaan | Automatisch toegestaan |
| Marketingconcept maken | Automatisch toegestaan |
| Marketingmail verzenden | Altijd goedkeuring |
| FAQ-antwoord versturen | Alleen goedgekeurde categorie + hoge confidence |
| Complex supportantwoord | Altijd goedkeuring |
| GitHub-issue aanmaken | Goedkeuring in MVP |
| Draft-PR maken | Goedkeuring voordat code wordt gepubliceerd |
| PR mergen | Altijd handmatig |
| Productiedeploy | Altijd handmatig |
| Refund/korting | Altijd handmatig |
| Persoonsgegevens verwijderen | Altijd handmatig plus herbevestiging |

## 9. Dashboard en styling

### 9.1 `Style.md` is verplicht

Voordat een developer een dashboardcomponent, statusbadge, formulier, modal, tabel, grafiek of agentnode bouwt:

- [ ] Zoek en lees de volledige `Style.md` in de repository.
- [ ] Noteer de bestaande design tokens, kleuren, typografie, spacing, radii en schaduwen.
- [ ] Identificeer bestaande componenten die hergebruikt moeten worden.
- [ ] Controleer regels voor light/dark mode indien aanwezig.
- [ ] Controleer responsive breakpoints en mobiele navigatie.
- [ ] Controleer iconen- en animatierichtlijnen.
- [ ] Gebruik de merknaam, tone of voice en terminologie uit `Style.md`.

**Geen nieuwe UI-stijl introduceren wanneer `Style.md` of bestaande componenten al een patroon voorschrijven.** `Style.md` is de primaire bron voor de bedrijfsstyling. Als `Style.md` ontbreekt, tegenstrijdig of onvolledig is, moet de developer dit als blocker melden en geen eigen kleurenpalet verzinnen.

### 9.2 Dashboardpagina's

Minimaal:

```text
/admin/agents
/admin/agents/jobs/[id]
/admin/agents/approvals
/admin/agents/history
/admin/agents/settings
```

### 9.3 Hoofdscherm: agent-spinnenweb

Het hoofdscherm toont:

- manager-agent centraal;
- specialistische agents rondom;
- neutrale lijnen voor beschikbare relaties;
- actieve lijnen voor lopende overdracht;
- visueel onderscheid tussen actief, beschikbaar, geblokkeerd, mislukt en wacht op goedkeuring;
- huidige korte taak per agent;
- klik/tap op agent voor details;
- één duidelijk geselecteerd detailgebied;
- geen decoratieve animaties die informatie niet verbeteren;
- ondersteuning voor `prefers-reduced-motion`.

### 9.4 Avondoverzicht

Vier primaire werkbakken:

1. **Jouw beslissing nodig**
2. **Klaar voor goedkeuring**
3. **Automatisch afgerond**
4. **Mislukt of geblokkeerd**

Per item minimaal:

- titel;
- betrokken agent;
- aanmaaktijd;
- risico;
- korte samenvatting;
- aanbevolen actie;
- primaire actie en veilige secundaire acties;
- link naar volledige run/audittrail.

### 9.5 Accessibility en responsive eisen

- Alle acties zijn met toetsenbord bereikbaar.
- Status wordt niet uitsluitend met kleur gecommuniceerd.
- Agentnodes hebben toegankelijke namen.
- Focusvolgorde is logisch.
- Contrast voldoet minimaal aan WCAG AA.
- Dialogen hebben correcte focus trapping en terugkeer.
- Tabellen hebben semantische headers.
- Dashboard werkt vanaf 320 px breed.
- Geen horizontaal afgesneden approvalacties.
- Motion wordt verminderd wanneer het OS dit vraagt.

## 10. Volledig praktijkvoorbeeld: klant meldt dat bevestigingsmail ontbreekt

### 10.1 Trigger

Een klant verstuurt via het supportformulier:

> "Mijn gast krijgt geen bevestigingsmail na een boeking."

### 10.2 Automatische verwerking

1. Supportendpoint maakt ticket en `agent_job` aan.
2. Idempotency key voorkomt dubbele verwerking.
3. Manager-agent classificeert:
   - categorie: `booking_email`;
   - urgentie: `high`;
   - risico: `medium`;
   - mogelijk technisch probleem: `true`.
4. Support-agent zoekt relevante kennisdocumenten en recente soortgelijke tickets.
5. Als een bekende configuratiefout waarschijnlijk is:
   - agent maakt antwoordconcept;
   - agent vraagt ontbrekende veilige informatie op;
   - concept wacht op goedkeuring indien confidence te laag is.
6. Als een productbug waarschijnlijk is:
   - product-agent maakt een bugbrief;
   - developer-agent krijgt geanonimiseerde context;
   - developer-agent onderzoekt relevante logs en code;
   - developer-agent reproduceert het probleem;
   - developer-agent maakt patch en tests in geïsoleerde branch;
   - QA-agent controleert regressie, mailflow en tenantisolatie.
7. Manager-agent bundelt:
   - oorzaak;
   - impact;
   - voorgestelde oplossing;
   - testresultaten;
   - conceptantwoord;
   - benodigde goedkeuring.
8. Dashboard toont 's avonds:
   - `1 supportantwoord klaar`;
   - `1 draft-PR klaar voor review`;
   - `productiedeploy vereist handmatige goedkeuring`.

### 10.3 Voorbeeld van artifact

```json
{
  "type": "bug_resolution_proposal",
  "ticketId": "SUP-1042",
  "summary": "Bevestigingsmail wordt niet gestart wanneer een boeking via de factuurconversie ontstaat.",
  "evidence": [
    "Reproductie geslaagd in testomgeving",
    "Mailjob ontbreekt voor booking source invoice_conversion",
    "Bestaande normale boekingsflow werkt"
  ],
  "proposedChange": "Roep dezelfde booking-confirmation enqueue service aan na succesvolle conversie.",
  "tests": [
    "unit test voor invoice_conversion",
    "integration test voor mailjob enqueue",
    "regressietest voor normale boeking"
  ],
  "risk": "medium",
  "requiresApproval": true
}
```

### 10.4 Acceptatiecriteria voor dit voorbeeld

- [ ] Dubbele supportwebhooks leveren maximaal één job op.
- [ ] Ticket bevat geen secrets in agentcontext.
- [ ] Agent benoemt onzekerheid en verzint geen logresultaten.
- [ ] Developer-agent werkt niet op de hoofdbranch.
- [ ] Bestaande normale boekingsflow blijft werken.
- [ ] Nieuwe test faalt vóór en slaagt na de patch.
- [ ] QA-agent rapporteert concrete testresultaten.
- [ ] Supportmail wordt niet verzonden vóór het toegestane approvalmoment.
- [ ] Deploy gebeurt niet automatisch.
- [ ] Auditlog verbindt ticket, job, runs, artifact en approval.

## 11. Geplande werkdag

Voorbeeldschema, configureerbaar en niet hardcoded:

| Moment | Taak |
| --- | --- |
| 08:00 | Manager controleert openstaande en verlopen jobs |
| 09:00 | Marketing-agent verzamelt en kwalificeert leads |
| Doorlopend | Nieuwe supporttickets starten supportworkflow |
| Doorlopend | GitHub/Sentry-events starten triageworkflow |
| 15:00 | Product-agent bundelt nieuwe feedback |
| 17:30 | Manager maakt dagsamenvatting |
| 's Avonds | Eigenaar verwerkt approvals en beslissingen |

Voor iedere cronrun geldt:

- [ ] beveiligde endpointcontrole;
- [ ] maximaal één actieve run per jobtype/periode;
- [ ] configureerbare limiet;
- [ ] spendlimiet;
- [ ] retries met maximum;
- [ ] resultaat in auditlog;
- [ ] zichtbare foutstatus.

## 12. Stappenplan voor implementatie

### Fase 0 — inventarisatie en randvoorwaarden

**Doel:** bestaande architectuur en styling begrijpen voordat er code wordt gewijzigd.

- [ ] Lees `Style.md` volledig.
- [ ] Lees repository-instructies zoals `AGENTS.md` en README's.
- [ ] Breng bestaande auth, rollen, RLS en adminroutes in kaart.
- [ ] Breng bestaande e-mail-, booking-, invoice- en supportflows in kaart.
- [ ] Inventariseer bestaande GitHub- en loggingintegraties.
- [ ] Bepaal welke gegevens naar een AI-provider mogen.
- [ ] Leg bewaartermijnen en privacyregels vast.
- [ ] Definieer MVP-agentrollen: manager, marketing en support óf manager en developer.
- [ ] Schrijf een threat model voor prompt injection, tenantlekken en ongewenste toolacties.
- [ ] Definieer budget- en rate-limits.

**Exitcriteria**

- [ ] Architectuurnotitie goedgekeurd.
- [ ] Dataclassificatie voltooid.
- [ ] `Style.md`-regels vertaald naar concrete UI-eisen.
- [ ] Approvalmatrix goedgekeurd.

### Fase 1 — jobqueue, runs en auditlog

**Doel:** een betrouwbare basis zonder agents met externe acties.

- [ ] Maak database-migraties voor jobs, runs, artifacts, approvals en auditlogs.
- [ ] Voeg enums/check constraints of gevalideerde statuswaarden toe.
- [ ] Implementeer idempotency.
- [ ] Implementeer atomisch claimen van jobs.
- [ ] Implementeer retries en dead-letterstatus.
- [ ] Voeg RLS en server-only servicefuncties toe.
- [ ] Bouw veilige adminqueries.
- [ ] Test concurrente claims.
- [ ] Test dubbele events.

**Exitcriteria**

- [ ] Geen job kan door twee workers tegelijk worden uitgevoerd.
- [ ] Iedere statusovergang staat in de auditlog.
- [ ] Tenantisolatietests slagen.
- [ ] Mislukte jobs zijn herstelbaar.

### Fase 2 — manager-agent en één specialist

**Doel:** klein beginnen en de volledige keten bewijzen.

Aanbevolen eerste specialist: support-agent of marketing-agent. Voeg nog geen zeven actieve agents tegelijk toe.

- [ ] Definieer managerprompt en versionering.
- [ ] Definieer één smal specialistcontract.
- [ ] Gebruik gestructureerde output met runtimevalidatie.
- [ ] Sla response-id, status, gebruik en veilige samenvatting op.
- [ ] Implementeer time-out en foutafhandeling.
- [ ] Bouw mocks zodat tests geen echte API-kosten hoeven te maken.
- [ ] Voeg evaluatieset toe met normale, ambigue en schadelijke input.
- [ ] Test prompt injection vanuit ticket- of websitecontent.

**Exitcriteria**

- [ ] Agent kan tien representatieve taken correct classificeren.
- [ ] Ongeldige output wordt geweigerd en veilig opnieuw geprobeerd.
- [ ] Geen externe actie wordt zonder approval uitgevoerd.
- [ ] Kosten en tokengebruik zijn per run zichtbaar.

### Fase 3 — approvalworkflow

**Doel:** eigenaar kan 's avonds gecontroleerd beslissen.

- [ ] Bouw approvaloverzicht.
- [ ] Bouw detailweergave met bewijs, onzekerheden en aanbevolen actie.
- [ ] Voeg approve, reject, edit en retry toe.
- [ ] Maak approvals single-use.
- [ ] Voeg expiration en stale-data-controle toe.
- [ ] Vereis recente herauthenticatie voor hoog-risicoacties.
- [ ] Registreer beslisser en beslissing.
- [ ] Laat executor alleen goedgekeurde artifacts uitvoeren.

**Exitcriteria**

- [ ] Dubbel klikken voert een actie maximaal één keer uit.
- [ ] Verlopen approval kan niet worden uitgevoerd.
- [ ] Gewijzigd onderliggend artifact maakt oude approval ongeldig.
- [ ] Onbevoegde gebruiker krijgt geen toegang.

### Fase 4 — dashboard en spinnenweb

**Doel:** live inzicht in werkzaamheden.

- [ ] Bouw de UI uitsluitend volgens `Style.md`.
- [ ] Hergebruik bestaande layout-, button-, modal-, badge- en tablecomponenten.
- [ ] Toon agentstatussen via Realtime of gecontroleerde polling.
- [ ] Maak agentnodes klikbaar en toetsenbordtoegankelijk.
- [ ] Toon actieve overdrachten zonder afleidende animatie.
- [ ] Voeg avondoverzicht met vier werkbakken toe.
- [ ] Voeg lege, laad-, fout- en offline-statussen toe.
- [ ] Voeg mobiele variant toe.
- [ ] Test reduced motion.

**Exitcriteria**

- [ ] Stylingreview tegen `Style.md` is uitgevoerd.
- [ ] Dashboard werkt op mobiel en desktop.
- [ ] Status is niet alleen door kleur herkenbaar.
- [ ] Approvalacties zijn duidelijk en veilig.

### Fase 5 — background mode, cron en webhooks

**Doel:** werkzaamheden gaan door als eigenaar niet actief is.

- [ ] Voeg beveiligde crontriggers toe.
- [ ] Implementeer OpenAI background responses waar nuttig.
- [ ] Implementeer webhookendpoint met handtekeningverificatie.
- [ ] Verwerk `response.completed`, `response.failed` en relevante statussen idempotent.
- [ ] Voeg timeoutmonitor voor vastgelopen runs toe.
- [ ] Voeg dagsamenvatting toe.
- [ ] Voeg kostenplafond per dag en per agent toe.
- [ ] Voeg noodstop toe om alle nieuwe agentruns te pauzeren.

**Exitcriteria**

- [ ] Systeem werkt met uitgelogde eigenaar en uitgeschakelde lokale computer.
- [ ] Gemiste webhook kan via reconciliatie worden hersteld.
- [ ] Een duplicate webhook heeft geen dubbel effect.
- [ ] Daglimiet stopt nieuwe niet-kritieke runs.

### Fase 6 — developer- en QA-agent

**Doel:** bugs en features veilig voorbereiden.

- [ ] Koppel goedgekeurde issues aan codecontext.
- [ ] Gebruik altijd aparte branch/worktree.
- [ ] Definieer toegestane en verboden commando's.
- [ ] Voorkom toegang tot productiesecrets.
- [ ] Laat agent bestaande tests draaien vóór wijziging.
- [ ] Vereis tests voor gewijzigd gedrag.
- [ ] Laat QA-agent onafhankelijk reviewen.
- [ ] Maak alleen draft-PR's.
- [ ] Voeg changelog- en documentatiecontrole toe.
- [ ] Houd merge en deploy handmatig.

**Exitcriteria**

- [ ] Geen rechtstreekse wijziging op hoofdbranch.
- [ ] Geen merge- of deployrechten voor agents.
- [ ] Testresultaten en diff zijn zichtbaar in approval.
- [ ] Foutieve patch kan veilig worden verwijderd zonder gebruikerswerk te raken.

### Fase 7 — uitbreiding en optimalisatie

Pas uitbreiden wanneer meetgegevens aantonen dat de bestaande workflow waarde levert.

- [ ] Voeg product-agent toe.
- [ ] Voeg administratie-agent toe.
- [ ] Automatiseer alleen bewezen laag-risicocategorieën.
- [ ] Voeg parallelle subagents alleen toe voor echt onafhankelijke deeltaken.
- [ ] Meet extra tokengebruik tegenover tijdwinst.
- [ ] Herzie prompts en policies op basis van echte fouten.
- [ ] Voer periodieke security- en privacyreview uit.

De ingebouwde Responses API multi-agentfunctie is momenteel bèta en kan tokengebruik verhogen. Gebruik deze alleen voor concrete, onafhankelijke werkstromen, niet als standaard voor iedere taak. Zie [OpenAI — multi-agent](https://developers.openai.com/api/docs/guides/responses-multi-agent).

## 13. Developer Definition of Done

Een agentfeature is pas gereed wanneer alle toepasselijke punten zijn afgevinkt.

### Functioneel

- [ ] Happy path werkt end-to-end.
- [ ] Lege, ongeldige en ambigue input wordt veilig verwerkt.
- [ ] Duplicate events veroorzaken geen duplicate acties.
- [ ] Run kan veilig opnieuw worden geprobeerd.
- [ ] Approval is vereist volgens de matrix.
- [ ] Dagsamenvatting verwijst naar de juiste jobs en artifacts.

### Codekwaliteit

- [ ] Code volgt bestaande repositoryconventies.
- [ ] Geen `any` zonder onderbouwde reden.
- [ ] Runtimevalidatie voor externe input en modeloutput.
- [ ] Geen duplicatie van bestaande services of componenten.
- [ ] Server/clientgrenzen zijn correct.
- [ ] Geen secrets of service-rolekeys in clientbundles.
- [ ] Migraties zijn vooruit en veilig terug te draaien waar mogelijk.

### Styling

- [ ] `Style.md` is aantoonbaar gevolgd.
- [ ] Bestaande componenten en tokens zijn hergebruikt.
- [ ] Geen hardcoded merkkleuren wanneer tokens bestaan.
- [ ] Typografie en spacing volgen het bedrijfssysteem.
- [ ] Light/dark mode werkt indien ondersteund.
- [ ] Mobiele layout is getest.
- [ ] Loading, empty, error en disabled states zijn ontworpen.

### Security en privacy

- [ ] RLS en rolchecks zijn aanwezig en getest.
- [ ] Prompt injection is meegenomen in tests.
- [ ] Modelinput bevat alleen noodzakelijke persoonsgegevens.
- [ ] Webhookhandtekeningen worden geverifieerd.
- [ ] Idempotency keys worden gebruikt.
- [ ] Rate limit en kostenlimiet zijn aanwezig.
- [ ] Auditlog bevat geen secrets.
- [ ] Toolrechten zijn minimaal.

### Testen

- [ ] Unit tests voor policies, validators en statusovergangen.
- [ ] Integratietests voor queue, approvals en webhookverwerking.
- [ ] Tenantisolatietests.
- [ ] Tests voor retries, timeout en duplicate delivery.
- [ ] UI-tests voor approve/reject/edit.
- [ ] Accessibilitycontrole.
- [ ] Tests draaien zonder standaard echte modelcalls.
- [ ] Een kleine gecontroleerde live-evaluatie is apart uitgevoerd.

### Observability

- [ ] Correlatie-id door de volledige workflow.
- [ ] Runstatus en fout zichtbaar in dashboard.
- [ ] Kosten/gebruik per run zichtbaar.
- [ ] Alert op herhaald falen.
- [ ] Alert op overschreden budget.
- [ ] Dead-letterjobs zijn vindbaar en herstelbaar.

## 14. Testscenario's

Minimaal opnemen in automatische of gecontroleerde evaluatietests:

1. Normale eenvoudige supportvraag.
2. Ambigue supportvraag met te weinig informatie.
3. Boze klant met refundverzoek.
4. Ticket met instructie om systeembeleid te negeren.
5. Ticket met een API-key of ander secret in de tekst.
6. Dubbele webhookdelivery.
7. OpenAI-timeout.
8. Ongeldige gestructureerde modeloutput.
9. Agent hallucineert een logregel die niet bestaat.
10. Marketinglead zonder betrouwbare contactinformatie.
11. Marketingwebsite bevat prompt-injectiontekst.
12. Developer-agent treft een dirty worktree aan.
13. Test suite faalt al vóór de wijziging.
14. Approval wordt tweemaal verstuurd.
15. Approval wordt uitgevoerd nadat artifact is aangepast.
16. Gebruiker van tenant A probeert run van tenant B te lezen.
17. Dagbudget is bereikt.
18. Webhook komt binnen voordat lokale jobstatus is bijgewerkt.
19. Cronrun start tweemaal gelijktijdig.
20. Systeem wordt halverwege een run herstart.

## 15. Monitoring en succesmetingen

Meet vanaf de MVP:

- aantal jobs per agenttype;
- percentage automatisch afgerond;
- percentage dat approval nodig had;
- acceptatie- en afwijzingspercentage van agentvoorstellen;
- gemiddelde tijd tot eerste supportconcept;
- gemiddelde tijd tot avondbeslissing;
- aantal incorrecte of onbruikbare outputs;
- aantal dubbele gebeurtenissen dat veilig is geneutraliseerd;
- aantal beveiligings- of policyblokkades;
- modelkosten per taaktype;
- geschatte menselijke tijdwinst;
- bugs veroorzaakt door agentwijzigingen;
- percentage supportantwoorden dat handmatig sterk aangepast moest worden.

Streef niet direct naar maximale autonomie. Een daling van menselijke voorbereidingstijd zonder stijging van fouten is de primaire succesmaatstaf.

## 16. MVP-afbakening

### Wel in MVP

- jobqueue en auditlog;
- manager-agent;
- één specialist, bij voorkeur support of marketing;
- gestructureerde outputs;
- approvalwachtrij;
- avondoverzicht;
- basis-agentstatusdashboard volgens `Style.md`;
- kostenlimiet en noodstop;
- handmatige retry;
- basis-evaluaties.

### Niet in MVP

- zeven agents die tegelijk autonoom werken;
- automatisch mergen of deployen;
- automatische refunds;
- volledig autonome outbound marketing;
- onbegrensde toegang tot e-mail of database;
- eigen vectorzoekinfrastructuur wanneer eenvoudige kennisretrieval volstaat;
- dynamische agents die zelf nieuwe permanente agentrollen maken;
- complexe langetermijnplanning zonder concrete businesswaarde.

## 17. Aanbevolen eerste sprintindeling

### Sprint 1

- inventarisatie en `Style.md`-review;
- datamodel en migraties;
- queue, runstatus en auditlog;
- adminlijst met mockdata;
- security- en tenanttests.

### Sprint 2

- manager-agent;
- support- of marketing-specialist;
- structured output;
- artifacts;
- kostenregistratie;
- testset en mocks.

### Sprint 3

- approvals;
- avondoverzicht;
- agent-spinnenweb volgens `Style.md`;
- Realtime/polling;
- responsive en accessibilityreview.

### Sprint 4

- cron en background runs;
- webhookverificatie;
- retries en reconciliatie;
- dagsamenvatting;
- pilot met alleen interne taken.

## 18. Pilot en rollout

1. Start in `observe-only`: agents analyseren, maar ondernemen niets.
2. Vergelijk outputs twee weken met menselijke beslissingen.
3. Activeer conceptgeneratie voor één taaktype.
4. Activeer approvals voor gecontroleerde vervolgacties.
5. Automatiseer pas een laag-risicoactie na voldoende correcte voorbeelden.
6. Houd een kill switch beschikbaar.
7. Evalueer wekelijks fouten, kosten en tijdwinst.
8. Breid pas daarna uit met een volgende agent.

## 19. Eindchecklist voor oplevering

- [ ] De eigenaar kan zien welke agents actief, beschikbaar, geblokkeerd of mislukt zijn.
- [ ] De eigenaar kan iedere run terugvinden en begrijpen.
- [ ] De eigenaar krijgt dagelijks één helder avondoverzicht.
- [ ] Risicovolle acties wachten aantoonbaar op goedkeuring.
- [ ] Geen agent kan buiten zijn toolrechten handelen.
- [ ] Geen agent kan zelfstandig mergen, deployen of geld terugboeken.
- [ ] Dubbele events veroorzaken geen dubbel extern effect.
- [ ] RLS en tenantisolatie zijn getest.
- [ ] Webhookhandtekeningen worden geverifieerd.
- [ ] Modeloutputs worden runtime gevalideerd.
- [ ] Kosten- en rate-limits zijn ingesteld.
- [ ] Auditlogs bevatten geen secrets.
- [ ] `Style.md` is gebruikt voor alle bedrijfsstyling.
- [ ] Dashboard is responsive en toegankelijk.
- [ ] Developer- en QA-checklists zijn volledig afgevinkt.
- [ ] Pilot is uitgevoerd voordat automatische klantacties worden ingeschakeld.

## 20. Samenvatting voor de developer

Bouw eerst een betrouwbare workflowmotor en pas daarna meer agents. Houd de manager-agent verantwoordelijk voor de totale taak. Geef iedere specialist een smalle rol, minimale toolrechten en een gevalideerd outputcontract. Laat alles met extern, financieel, juridisch of productie-effect via een expliciete approval lopen. Maak iedere run traceerbaar, hervatbaar en idempotent. Gebruik `Style.md` als verplichte bron voor alle styling en hergebruik de bestaande FlexPagina-componenten. Begin met één specialist en bewijs tijdwinst en kwaliteit voordat het agentteam wordt uitgebreid.

