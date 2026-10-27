# FlexPagina marketingaudit — 27 oktober 2026

## Aanwezig
- Next.js 16.3.8 App Router; Nederlandstalige marketing zonder locale-prefix. Klantwebsites hebben een eigen locale/routeringslaag. De lokale Next-documentatie over metadata, sitemap, robots, JSON-LD en redirects is gelezen.
- Bestaande homepage met één H1, Supademo met fallback-link, fictieve demo's, gedeelde footer, pakketkaarten en HTML-FAQ. Huisstijl: `--landing-*` in `app/globals.css`, Geist/font-sans, groene primaire kleur, afgeronde kaarten en pill-buttons, Tailwind en lucide. Deze patronen blijven leidend.
- `lib/pricing.ts` is de centrale pakketbron. Bronze: 3 gepubliceerde pagina's; Silver: 10; Gold: onbeperkt (fair-use). Alle pakketten hebben onbeperkte secties. Dit komt overeen met `PUBLISHED_PAGE_LIMIT_BY_PLAN` in `lib/entitlements.ts`. Booking & Facturatie is optioneel; talenpakket bij Bronze/Silver, inbegrepen bij Gold.
- Homepage én `/pricing` tonen testfase en vervaagde placeholders, geen concrete basisprijzen. **Actuele toegangsstatus:** `DEFAULT_ALL_FEATURES_INCLUDED = true` in `lib/subscriptions.ts` geeft accounts tijdelijk Gold, beide uitbreidingen en publiceren zonder de betaalde pakketlimieten. Betaalde aankopen zijn uitgeschakeld, zoals bevestigd in `docs/temporary-gold-access.md`. De cataloguslimieten beschrijven het beoogde betaalde aanbod, niet de tijdelijke effectieve toegang. De marketing moet dit onderscheid expliciet tonen. De bestaande vlag blijft ongewijzigd en wordt alleen gelezen.
- Robots en sitemap bestaan; canonicals en noindex voor private previews zitten gedeeltelijk in bestaande routes. Google-verificatie via `GOOGLE_SITE_VERIFICATION`; geen Search Console/Bing-accounttoegang aangetroffen in projectconfiguratie.

## Ontbrekend / inconsistent
- Vijf gevraagde contentroutes ontbreken, evenals hun interne links, canonicals en sitemapvermeldingen.
- De prijstabel publiceert nog een concreet bedrag voor het talenpakket terwijl andere tarieven verborgen zijn. Maak de marketingweergave consistent, zonder bedragen of transacties te wijzigen.
- Paginagrenzen worden als tekst herhaald naast de handhavingsconfiguratie. Leid de marketinglimieten uit die bestaande configuratie af.
- De homepage-FAQ zegt dat website-import ontbreekt. De editor heeft wel `ImportWebsiteUrl` en `/api/websites/import-url`: openbare pagina's worden met toestemming omgezet naar een bewerkbaar concept. Genereren hangt af van serverconfiguratie; formulieren, boekingswidgets en URL-structuur worden niet automatisch gemigreerd. Beschrijf dit voorwaardelijk.
- Bestaande marketing beweert dat voor publiceren een betaald pakket nodig is; dat klopt niet met de tijdelijke Gold-vlag. Hergebruik die productvlag voor één marketingtoegangsbericht op homepage, nieuwe routes en prijzen; beschrijf de catalogus als beoogd betaald aanbod. Verander geen toegang, betaalflow of producttarieven.
- Metadata is niet overal compleet; een WebSite-entiteit en broodkruimels voor contentroutes ontbreken.
- Geen platformbrede www-redirect in Next-config gevonden. Voeg een hostgebonden permanente redirect toe voor uitsluitend `www.<platformdomein>`. Tenantroutering blijft intact.

## Risico's en grenzen
- **Launch-blocker:** `components/legal/legal-documents.tsx` bevat `[Bedrijfsnaam]`, `[KvK-nummer]`, `[Adres]`, `[E-mailadres]` en templatewaarschuwingen. Geen juridische teksten invullen of als definitief presenteren.
- Platformanalytics: Vercel Analytics/Speed Insights bestaan. Consent in `SiteCookieConsent` is websitegebonden en biedt geen platformmarketingcontract. Geen extra conversietracking of persistente UTM-opslag toevoegen zonder passend consent- en attributiebeleid. Signup/betaling vallen buiten marketingroutes.
- Klantsubdomeinen worden herschreven naar `/site/<slug>`, previews naar `/preview/<slug>` en eigen domeinen via bestaande RPC. Hun canonicals/sitemaps blijven afzonderlijk beheerd; geen tenantwijziging nodig.
- iCal-code en agenda-abonnementen bestaan, maar live interoperabiliteit met Booking.com is niet bevestigd. Geen directe Booking.com-synchronisatie beloven.
- De sandbox blokkeerde aanvankelijk DNS/HTTP en localhost. Met gecontroleerde netwerktoegang buiten de sandbox is live bevestigd: `/robots.txt` HTTP 200 (`text/plain`), ook met OAI-SearchBot-useragent; `/sitemap.xml` HTTP 200 (`application/xml`); `https://www.flexpagina.nl/` HTTP 200 zonder redirect. De hostgebonden www-redirect is dus nodig. Dit bevestigt geen volledige CDN/firewallconfiguratie of daadwerkelijke indexatiestatus. Responses zijn opgeslagen onder `artifacts/marketing-seo/live-*`.

## Kort wijzigingsvoorstel
1. Behoud homepagehero en Supademo; voeg feitelijke zzp-intro, doelgroep- en overstaplinks toe. Werk import-FAQ bij.
2. Bouw `/website-maken`, `/website-voor-zzp`, `/website-overstappen`, `/website-voor-bnb` en `/voorbeelden` met gedeelde marketingcomponenten, bestaande tokens en eigen inhoud per zoekintentie.
3. Voeg uniforme metadata, Organization/WebSite en BreadcrumbList, sitemaplinks en private-route-uitsluiting in robots toe. Geen verborgen offers/ratings en geen wijziging van GPTBot-beleid.
4. Verifieer productiebuild, lint/typecheck, HTML/HTTP, routeringsregressies en mobiel/desktop. Leg resultaten en externe vervolgacties vast in het opleverrapport.

Optionele branchepagina's/kennisbank wachten op metingen. Geen llms.txt nodig voor deze eerste implementatie.
