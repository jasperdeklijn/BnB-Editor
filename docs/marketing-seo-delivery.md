# FlexPagina SEO — oplevering 27 oktober 2026

## Resultaat en scope
Vijf Nederlandse marketingroutes toegevoegd in de bestaande FlexPagina-huisstijl. De homepage behoudt zijn hero, Supademo, voorbeelden en CTA-stroom, met een extra doelgroep-/overstapsectie. De prijsvergelijking, homepage en nieuwe pagina's onderscheiden de huidige tijdelijke gratis Gold-toegang van het beoogde betaalde aanbod.

Geen wijzigingen aan tenantgegevens, auth, editor, publicatie, transacties, database, productbedragen of de tijdelijke Gold-vlag. Geen nieuwe dependencies. De enige routeringswijziging is een permanente redirect voor uitsluitend de www-host van het platform, met behoud van pad en querystring.

Audit en wijzigingsvoorstel: [marketing-seo-audit.md](marketing-seo-audit.md).

## Pagina's en SEO-titels
Iedere titel hieronder krijgt het achtervoegsel ` | FlexPagina.nl`. Iedere hoofdmarketingpagina en fictieve demo heeft een eigen beschrijving, canonical, Open Graph, Twitter en index/follow-instelling; de pagina's bevatten één H1.

| Route | SEO-titel |
| --- | --- |
| `/` | Website maken voor je bedrijf zonder code |
| `/website-maken` | Zelf een zakelijke website maken zonder code |
| `/website-voor-zzp` | Website maken voor zzp en kleine bedrijven |
| `/website-overstappen` | Je website vervangen en overstappen naar FlexPagina |
| `/website-voor-bnb` | Een eigen website maken voor je bed and breakfast |
| `/voorbeelden` | Voorbeeldwebsites voor B&B, coach en hovenier |
| `/pricing` | Prijzen en websitepakketten vergelijken |
| `/voorbeelden/bnb` | De Tuinkamer: fictieve B&B-voorbeeldwebsite |
| `/voorbeelden/coach` | Ruimte voor jou: fictieve Coach-voorbeeldwebsite |
| `/voorbeelden/hovenier` | Buiten in Balans: fictieve Hovenier-voorbeeldwebsite |

## Inhoud en techniek
- Gedeelde demo-kaarten met de bestaande SVG-afbeeldingen, categorie, fictief-label, demo- en doelgroep-links. Voorbeelden zijn geen klantcases; aanvragen en boekingen blijven uitgeschakeld.
- Overstapcopy beschrijft de werkelijk bestaande, voorwaardelijk beschikbare AI-overzetfunctie. Geen volledige migratie, automatische redirects, mailboxmigratie of identieke kopie beloofd.
- B&B-copy onderscheidt basiswebsite en Booking & Facturatie. Geen claim over directe Booking.com-synchronisatie.
- Pakketlimieten komen uit de bestaande handhavingsconfiguratie; pakketfuncties en bedragen blijven in `lib/pricing.ts`. Het zichtbare concrete talenpakketbedrag in de vergelijking is vervangen door een add-onlabel; het onderliggende bedrag is niet veranderd.
- Toegangscopy leest `DEFAULT_ALL_FEATURES_INCLUDED` uit de bestaande abonnementsbron. Geen aparte kopie van deze productvlag.
- Alle nieuwe routes staan in de sitemap; bestaande publieke en demovermeldingen blijven behouden. Geen nieuwe kunstmatige `lastModified`-datums per build.
- Robots laat marketing en rendering-assets toe en sluit extra private platformpaden uit. OAI-SearchBot volgt de algemene policy; geen afzonderlijke wijziging van GPTBot-trainingstoestemming.
- Organization en WebSite op de homepage; BreadcrumbList op diepere marketingroutes. Geen offers, verborgen bedragen, ratings of reviews in JSON-LD. Bestaande homepage-FAQ-data sluit aan op zichtbare FAQ-inhoud.
- Crawlbare navigatie en footerlinks, skiplink en HTML-FAQ's; ook de prijs-FAQ gebruikt nu native `details`/`summary`, zodat antwoorden zonder JavaScript in de HTML staan.
- Marketing blijft Nederlands. Bestaande tenant-locale-routering blijft behouden. Geen hreflang voor niet-bestaande marketingvertalingen.

## Gewijzigde bestanden
| Groep | Bestanden |
| --- | --- |
| Nieuwe routes | `app/(marketing)/website-maken/page.tsx`, `website-voor-zzp/page.tsx`, `website-overstappen/page.tsx`, `website-voor-bnb/page.tsx`, `voorbeelden/page.tsx` |
| Bestaande routes | `app/page.tsx`, `app/(marketing)/pricing/page.tsx`, `app/voorbeelden/[slug]/page.tsx` |
| Marketingcomponenten | `components/marketing/marketing-page.tsx`, `components/landing/landing-discovery.tsx`, `landing-hero.tsx`, `landing-nav.tsx`, `landing-examples.tsx`, `landing-faq.tsx`, `landing-booking.tsx`, `landing-cta.tsx`, `pricing-section.tsx`, `components/pricing/pricing-faq.tsx`, `components/layout/shared-footer.tsx` |
| Configuratie/SEO | `lib/marketing.ts`, `lib/seo/marketing.ts`, `lib/pricing.ts`, `app/robots.ts`, `app/sitemap.ts`, `next.config.mjs` |
| Verificatie | `tests/marketing-seo.test.mjs`, `tests/pricing.test.mjs`, `tests/search-indexing.test.mjs`, `scripts/check-marketing-seo.mjs` |
| Documentatie | deze oplevering en `docs/marketing-seo-audit.md` |

## Tests en bewijs
- Volledige regressiesuite: **362 geslaagd, 0 mislukt, 1 overgeslagen** (363 tests). De overgeslagen tweesessie-Postgres-concurrencytest vereist expliciet een lege wegwerpdatabase via `BOOKING_TEST_DATABASE_URL`; bestaande PGlite-tests zijn wel uitgevoerd. Log: `artifacts/marketing-seo/final-tests.log`.
- Gerichte SEO-, prijs- en zoekindexeringtests: **14 geslaagd**. Inclusief www-pad/querybehoud, uitsluiting van klant-/previewdomeinen, anon-editor-login, previewrobots, tenantrobots/sitemap en Engelse tenantlocale. Log: `artifacts/marketing-seo/final-targeted-tests.log`.
- Typecheck geslaagd; lint geslaagd. Logs: `artifacts/marketing-seo/typecheck.log`, `final-lint.log`.
- Productiebuild: `node node_modules/next/dist/bin/next build --webpack`. De normale Turbopack-poging was door sandbox/fontproblemen niet bruikbaar. De productiebuild buiten de sandbox gebruikt de normale Google Fonts-bron, zonder fontfixture of wijziging aan productiecode. Log: `artifacts/marketing-seo/build.log`.
- Definitieve productie-HTTP-controle geslaagd: **10 routes**, **36 afbeeldingen/JS/CSS-assets**, alle publieke bestemmingen uit de **20 gevonden interne linkpaden**, XML-sitemap en tekst-robots. Unieke titels/beschrijvingen, één H1, server-HTML, canonicals en parsebare feitelijke JSON-LD bevestigd. Log en details: `artifacts/marketing-seo/http-check.log`, `http-report.json`.
- De 20 gevonden linkpaden bevatten **18 publieke bestemmingen**; de twee accountlinks worden niet als publieke content gecontroleerd. Echte lokale HTTP-requests met Googlebot, Bingbot en OAI-SearchBot leveren 200 zonder noindex-header. Een native HTTP-request met de www-Host levert **308** naar `https://flexpagina.nl/website-maken?utm_source=qa`. De hostregel matcht ook in de regressietest geen bijna-gelijke hostnaam zoals `wwwXflexpagina.nl`.
- Browsercontrole in de productiebuild: homepage, vijf nieuwe routes en prijzen op **1440 × 1000** en **390 × 844**. In alle 14 controles één H1, geen horizontale overflow en geen ontbrekende afbeeldingen. Bewijs: `artifacts/marketing-seo/browser-report.json` en `<route>-desktop.jpg` / `<route>-mobile.jpg` in dezelfde map. Extra screenshot: `voorbeelden-kaart-mobile.jpg` toont de fictief-aanduiding en focusring.
- Desktopnavigatie van voorbeelden naar prijzen en mobiele navigatie naar voorbeelden bevestigd. Het mobiele menu opent met Enter en sluit na navigeren; de prijs-FAQ opent met Enter. Geen consolefouten/-waarschuwingen bij de gecontroleerde pagina's.
- De behouden Supademo laadt in het iframe; **Get Started** opent de interactieve eerste stap. Iframe-URL en externe fallback-link blijven behouden. Screenshot: `artifacts/marketing-seo/supademo-desktop.jpg`.

De browserflow volgt marketinglink → serverroute → gedeelde leesbare configuratie → server-HTML → navigatie/FAQ. Er is geen nieuwe API of databaseflow toegevoegd. Tenant- en authgrenzen zijn met bestaande regressies en gemockte proxyrequests getest; dit is geen bewijs van een actuele productie-accounttest.

## Acceptatie
| Criterium | Stand |
| --- | --- |
| Bestaande huisstijl, homepage en demo behouden | Bevestigd met codecontrole, screenshots en gestarte Supademo |
| Vijf bruikbare publieke pagina's op desktop/mobiel | Geïmplementeerd, 14 browsercontroles inclusief homepage/prijzen |
| Unieke metadata en één H1 | HTTP-controle voor tien marketing-/demoroutes |
| Interne links, canonical, sitemap en robots | Lokaal gecontroleerd; productie-uitrol blijft nodig |
| Gestructureerde data feitelijk en leesbaar | Parsebaar en gecontroleerd op typen, broodkruimels en ontbreken van offers/ratings |
| Centrale pakketten en eerlijke teststatus | Bestaande pakketlimieten en tijdelijke Gold-vlag hergebruikt |
| Demo's expliciet fictief | Op overzicht, kaarten, demobalken en in metadata |
| Geen regressie in private productflows | Volledige regressiesuite geslaagd; hosted end-to-end blijft apart |
| Meetbaarheid en resterende onzekerheden | Bestaande analytics behouden; nieuwe events/UTM-opslag uitgesteld wegens ontbrekend marketing-consentcontract |

De HTTP-controle is reproduceerbaar: start de productiebuild op poort 3100 en draai `node scripts/check-marketing-seo.mjs http://localhost:3100`. Het script controleert HTML zonder clientuitvoering, unieke metadata, H1's, canonicals, JSON-LD, afbeeldingen/JS/CSS, publieke interne links, sitemap en robots; het schrijft `artifacts/marketing-seo/http-report.json`.

## Niet geactiveerd en resterende onzekerheden
- Nieuwe conversie-events en persistente UTM-attributie zijn niet toegevoegd: het aanwezige consent is gekoppeld aan klantwebsites en is geen expliciet platformmarketingcontract. Bestaande Vercel-pageviews blijven de bestaande integratie volgen. Geen signup-/betaalwijzigingen buiten marketingroutes.
- Optionele fase 2b (extra branches en kennisbank) wacht op eerste zoek-/conversiemetingen. Geen llms.txt toegevoegd; crawlbare HTML, metadata, robots en sitemap hebben voorrang.
- **Commerciële launch-blocker:** juridische templates bevatten nog bedrijfs-, KvK-, adres- en contactplaceholders. Ze zijn niet ingevuld of als definitief aangemerkt.
- Geen Search Console/Bing-credentials aangenomen, geen daadwerkelijke indexatiestatus bevestigd en geen wijzigingen aan CDN/firewall gedaan.
- Geen Lighthouse/PageSpeed-score of betrouwbare voor/na-CWV-baseline beschikbaar uit de projecttooling. Geen performanceverbetering of score beloofd; de bestaande iframe-afmetingen, fallback-link en afbeeldingen met vaste dimensies blijven behouden.
- Geen productie-uitrol gedaan. Hosted auth, echte betalingen, daadwerkelijke DNS-/e-mailomzetting, deployed databasebeleid en volledige externe boekingsinteroperabiliteit zijn niet door deze lokale tests bewezen.

## Na uitrol: Search Console en Bing
1. Publiceer de gecontroleerde wijziging via het normale releaseproces. Controleer de tijdelijke Gold-status en de bijbehorende bestaande database-uitrol; deze wijziging wijzigt die niet.
2. Controleer in productie met Googlebot en OAI-SearchBot: HTTP 200, geen onbedoelde noindex/firewallblokkade, verwachte canonical en toegankelijke rendering-assets. Controleer ook de 308 van www met pad en querystring.
3. Gebruik de bestaande Google-verificatie (`GOOGLE_SITE_VERIFICATION`) of verifieer de domeinproperty via de eigenaar. Dien `https://flexpagina.nl/sitemap.xml` in en inspecteer homepage en de vijf nieuwe routes; vraag waar passend indexering aan.
4. Verifieer in Bing Webmaster Tools met het account van de eigenaar en dien dezelfde sitemap in. Controleer crawlproblemen en gemelde canonicals. Er is geen automatische indiening gedaan.
5. Bekijk na voldoende meettijd zoektermen, impressies, doorklikken, crawlmeldingen en bestaande analytics per landingspagina. Beslis daarna over fase 2b en een passende privacyvriendelijke attributie-opzet. Indexering of een zoekpositie is niet gegarandeerd.
