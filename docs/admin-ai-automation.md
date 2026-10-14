# AI in het beheer

Vanaf 14 oktober 2026 zijn de leadgenerator en de supportmail-AI de twee zelfstandige AI-beheerfuncties. Het algemene AI-agentteam, het control center, agentgoedkeuringen, de gedeelde wachtrijcode en de dispatch-, reconcile- en daily-summaryroutes zijn verwijderd. Oude agentteam-URL's bestaan niet meer.

## Leadgenerator

De handmatige zoekfunctie en instellingen blijven op `/admin/leads` en `/admin/leads/settings`. `/api/cron/leads` voert de wekelijkse zoektocht rechtstreeks uit, alleen op maandag om 09:00 Europe/Amsterdam. De twee bestaande UTC-schema's vangen zomer- en wintertijd op. De wekelijkse limiet, ingestelde plaatsen en branches blijven gelden.

Elke week krijgt één unieke `lead-cron:<weekKey>`-run in `lead_agent_runs`; een dubbele cronaanroep start geen tweede zoektocht. De resultaten en gedeeltelijke fouten blijven zichtbaar in het leadoverzicht. Optionele samenvattingen gaan via de bestaande SMTP-configuratie naar `ADMIN_EMAILS`. Outreach blijft een concept voor handmatige controle.

## Supportmail-AI

`/admin/mailbox`, handmatig synchroniseren, antwoordconcepten, verzenden en de kennisbank blijven beschikbaar. Na het ophalen van mail maakt de sync rechtstreeks maximaal tien antwoordconcepten, met maximaal drie gelijktijdige generaties. Open gesprekken met een onbeantwoord bericht blijven in de database beschikbaar voor de volgende sync; ook eerder door het agentteam ingeplande mail kan zo worden opgepakt.

Alleen het laatste inkomende bericht per open gesprek komt in aanmerking. Automatische berichten, gesloten of genegeerde gesprekken en berichten met een bestaand of weggegooid concept worden overgeslagen. Mislukte concepten kunnen opnieuw worden geprobeerd. Verzenden vereist de bestaande expliciete bevestiging door een beheerder. `AGENT_SUPPORT_MODEL` blijft als bestaande serverconfiguratie voor het supportmodel ondersteund.

## Uitrol en gegevens

Deploy de gewijzigde applicatie en `vercel.json` samen. Externe schedulers die nog `/api/cron/agents/*` aanroepen, moeten die triggers verwijderen; deze routes geven na deployment geen uitvoering meer.

De verouderde migratie `20260822120000_agent_team_platform.sql` is verwijderd. De lead- en mailboxmigraties blijven behouden. De vier velden voor modelrespons en tokengebruik staan nu rechtstreeks in de mailboxmigratie en de tabeldefinitie in `init.sql`.

`init.sql` maakt geen agentteam-tabellen, wachtrijfuncties of agentkoppelingen meer aan. Alleen de resetsectie noemt oude agentteam-objecten, zodat een reset ook achtergebleven tabellen en RPC's opruimt. De bestaande openbare websitefunctie en productiebeveiliging blijven behouden.

Deze bestandswijzigingen wijzigen een bestaande database of toegepaste migratiehistorie niet. Een reset met `init.sql` bouwt het volledige applicatieschema opnieuw op en verwijdert applicatiegegevens; gebruik dit uitsluitend als die reset de bedoeling is.

Validatie: `npm run test:admin-ai`, `npm run typecheck`, gerichte ESLint-controle en `npm run build`. De regressies controleren cronautorisatie, weeklimieten, deduplicatie, resultaatregistratie, supportbacklog en het behoud van handmatige verzendbevestiging. Echte IMAP-, SMTP-, Places- en modelcalls vereisen daarnaast een controle in de eigen omgeving.

De controle van de applicatiewijziging op 14 oktober 2026 liet 23 geslaagde gerichte tests, geslaagde TypeScript- en ESLint-controles en een geslaagde productiebuild met Webpack zien. Turbopack liep in deze Windows-omgeving vast bij het starten van een CSS-loaderproces. De volledige suite had één bestaande fout in `tests/multipage-plan-access.test.mjs`: de test verwachtte dat `supabase/init.sql` letterlijk de inhoud van `20261013131134_pricing_visitor_analytics.sql` bevatte. De schema-opruiming voegt databasecontroles toe voor een schone init, legacy-reset, RLS, lead-run-deduplicatie en de behouden mailboxvelden.
