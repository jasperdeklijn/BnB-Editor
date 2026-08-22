# FlexPagina AI-agentteam — operations en uitrol

Datum: 22 augustus 2026

Dit document hoort bij `docs/flexpagina-ai-agent-team-plan.md` en beschrijft de geïmplementeerde MVP (fasen 0 tot en met 5). Nieuwe installaties zijn veilig standaard uitgeschakeld en observe-only.

## Wat is geïmplementeerd

- Centrale Supabase-queue met deduplicatie, leases, dependencycontrole, retries, jitter, dead-letter en handmatige retry.
- Transactionele statusovergangen en append-only agent-auditlog.
- Immutable, gehashte artefactversies en single-use approvals.
- Supportjobs vanuit mailboxsync, Structured Outputs, Zodvalidatie en maximaal één modelretry.
- Expliciete supportexecutor met bestaande stabiele `send_key`, `unknown`-status en reconciliatie.
- Marketingjobs vanuit de bestaande Amsterdam-weekplanner, zonder automatische marketingmail.
- Beveiligde cronroutes voor dispatch, reconciliatie en dagsamenvatting.
- Admin-only control center op `/admin/agents` met kill switch, observe-only, limieten, approvalbewerking en herstel.
- Responsive agent-spinnenweb met de manager centraal, actuele specialisttaken en alleen lijnen voor echte actieve overdrachten.
- Retentiecleanup voor terminale jobs en auditregels volgens `agent_settings`.

OpenAI background mode en developer-/QA-agents zijn bewust niet geïmplementeerd. Die volgen alleen na gemeten noodzaak en een afzonderlijke geïsoleerde runner.

## Vereiste serverconfiguratie

Behoud de bestaande servervariabelen:

```text
NEXT_PUBLIC_SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
CRON_SECRET
AI_GATEWAY_API_KEY of VERCEL_OIDC_TOKEN
GOOGLE_PLACES_API_KEY
MAIL_IMAP_HOST en bestaande mailboxvariabelen
MAIL_SMTP_HOST en bestaande mailboxvariabelen
```

Secrets blijven uitsluitend server-side. Modelcalls gebruiken de bestaande Vercel AI Gateway. SMTP en Google Places worden alleen gebruikt door servermodules.

De toegevoegde crons draaien iedere 5, 10 en 15 minuten. Controleer vóór deployment dat het actieve Vercel-plan deze frequenties en de ingestelde `maxDuration` ondersteunt. Als dat niet zo is, gebruik Supabase Cron of een andere scheduler die exact dezelfde beveiligde GET-routes aanroept. Dit is een deploymentblocker, geen codefallback.

## Database-uitrol

1. Maak een databaseback-up of herstelpunt.
2. Pas `supabase/migrations/20260822120000_agent_team_platform.sql` toe in staging.
3. Verifieer dat alle agenttabellen RLS hebben en browserrollen geen directe toegang krijgen.
4. Verifieer de service-role-RPC's voor enqueue, claim, transition, approval, execution, retry, reconcile en cleanup.
5. Controleer resetpariteit met `supabase/init.sql`.
6. Laat `agents_enabled = false` en `observe_only = true` staan tijdens deze verificatie.

De migratie gebruikt de bestaande `businesses.id`-scope en introduceert geen parallel tenant- of companymodel.

## Veilige activering

1. Deploy met de kill switch uit (`agents_enabled = false`).
2. Test cronrequests zonder en met een geldige bearerwaarde; alleen de geldige request mag slagen.
3. Zet `agents_enabled = true`, `observe_only = true`, `support_enabled = true` en `marketing_enabled = false`.
4. Synchroniseer een aparte testmailbox en controleer job, run, artefact, approval en auditregels.
5. Keur een testartefact goed. In observe-only mag geen SMTP-bericht ontstaan.
6. Draai de geplande tweeweekse observe-only pilot en registreer acceptatie, edits, afwijzingen, dead letters, tokengebruik en onbekende kosten.
7. Neem een expliciet go/no-go-besluit. Zet pas daarna `observe_only = false` voor gecontroleerde supportverzending.
8. Activeer marketing pas afzonderlijk en laat outbound marketing uitgeschakeld.

## Budget en retentie

`daily_run_limit` is een harde bovengrens. Omdat de Gateway niet altijd een betrouwbare europrijs teruggeeft, reserveert iedere run standaard `budget_reservation_eur` tegen `daily_budget_eur`. Pas de reservering conservatief aan op basis van werkelijke facturatie. Het dashboard toont onbekende kosten als onbekend.

Terminale agentjobs worden na `run_retention_days` verwijderd, inclusief gekoppelde runs, artefacten, approvals en executions. Agent-auditregels worden uitsluitend via de security-definer onderhoudsprocedure na `audit_retention_days` verwijderd. Standaarden zijn 90 en 365 dagen. Stem deze termijnen en de gebruikte subverwerkers vóór productie af met het privacybeleid en verwerkersregister.

## Threat model en grenzen

- Mail, websites en modeltekst zijn onbetrouwbare data en krijgen nooit toolrechten.
- Structured Output wordt alsnog met Zod gevalideerd; ongeldige output krijgt maximaal één retry en daarna een veilige fallback of verklaarde failure.
- Browsergebruikers kunnen agenttabellen niet rechtstreeks lezen of schrijven. Adminroutes verifiëren eerst de sessie en adminrol en maken pas daarna een service-roleclient.
- Artefacten zijn immutable. Een edit maakt een nieuwe versie, invalideert de oude pending approval en vereist een nieuwe beslissing.
- Approval en execution zijn uniek gekoppeld. Dubbel klikken kan geen tweede executionrecord maken.
- De kill switch wordt bij jobclaim, approval en executionclaim gecontroleerd.
- Een SMTP-time-out na mogelijk extern effect wordt `unknown` en wordt niet blind opnieuw verzonden.
- Foutmeldingen worden begrensd en bekende secretpatronen worden geredigeerd.

## Validatie

Lokaal zonder externe model-, Places- of SMTP-calls:

```powershell
npm run typecheck
npm run test:agents
npm run test:mail
npm run build
```

De agentsuite controleert schema-/initpariteit, deduplicatie, skip-locked claims, statusovergangen, leaseherstel, approvalbinding, observe-only, kill switch, cronbeveiliging, businessscope en supportintegratie. Productie is pas aantoonbaar klaar na een stagingmigratie, echte RLS/authcontrole, veilige SMTP-test, cronobservatie en mobiele browsercontrole vanaf 320 px.

## Incident en rollback

1. Zet onmiddellijk `agents_enabled = false`.
2. Laat executions met status `unknown` staan en controleer de provider/mailbox vóór een volgende actie.
3. Stop of pauzeer externe crontriggers als jobs blijven binnenkomen.
4. Bewaar jobs, runs en auditdata voor onderzoek; verwijder de tabellen niet tijdens een incident.
5. Herstel pas na oorzaakbevestiging. Gebruik handmatige retry alleen voor `failed` of `dead_letter`, nooit voor `unknown`.
6. De bestaande mailbox- en leadinterfaces blijven bruikbaar; directe admin-mailverzending behoudt haar bestaande menselijke bevestiging.

## Nog te verifiëren buiten de repository

- Het daadwerkelijke Vercel-plan en de toegestane cronfrequentie.
- Toegepaste Supabase-migratie, grants en live RLS/authgedrag.
- Geldige Gateway-, Places-, IMAP- en SMTP-configuratie.
- Veilige testverzending en reconciliatie van een gesimuleerde onbekende SMTP-uitkomst.
- Twee weken observe-only pilotdata en het go/no-go-besluit.
- Responsive en accessibility-QA in een echte browser.
