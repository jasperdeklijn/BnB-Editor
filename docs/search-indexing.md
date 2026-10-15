# Google Search Console

The platform sitemap at `/sitemap.xml` lists the public marketing, legal, status, and example pages. Legal aliases share the canonical URL of their main document. Private editor, admin, authentication, preview, booking-management, and customer-request pages remain excluded from indexing.

Each published customer site has its own `/robots.txt` and `/sitemap.xml` on its public subdomain or custom domain. Its sitemap includes all published pages and enabled languages, using the same origin as the page canonical and language-alternate links. Draft pages and disabled languages are excluded. Database failures return HTTP 503 so a temporary outage does not publish a blocking robots file.

After deploying:

1. Verify the platform domain property in Google Search Console using the DNS record Google supplies. Alternatively, set `GOOGLE_SITE_VERIFICATION` to the HTML verification token's `content` value and redeploy to verify the platform URL-prefix property.
2. Submit `https://flexpagina.nl/sitemap.xml` for the platform property. If the platform domain is configured differently, use that domain.
3. Submit each customer site's `https://{public-host}/sitemap.xml` in its corresponding property. Custom domains need their own verified Search Console properties; their pages are intentionally absent from the platform sitemap.
4. Inspect representative page URLs, including a non-home page and a translated page, with Search Console's live URL test. Confirm HTTP 200, crawling allowed, indexing allowed, and the expected canonical URL; then request indexing.

Sitemaps and crawlable metadata make pages eligible for discovery and indexing. Google decides whether and when to index them. These changes do not submit sitemaps or verify Search Console ownership automatically.

References: [Google sitemap submission](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap), [requesting a recrawl](https://developers.google.com/search/docs/crawling-indexing/ask-google-to-recrawl).
