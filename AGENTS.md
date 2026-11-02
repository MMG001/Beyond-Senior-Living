# Notes for AI agents and developers

Static site for Beyond Senior Living (assisted living, Woodbury, MN). See README.md for deploy and local preview.

## Build and deploy
- `node build.mjs` writes the site to `dist/` (no dependencies).
- Every push to `main` deploys to Cloudflare Pages project `beyond-senior-living` (beyond-senior-living.pages.dev). Check the "Cloudflare Pages" check-run on the commit before calling a change done.
- Canonical host is `https://beyondseniorlivingmn.com` (set in `site.config.json` → `url`).

## Single source of truth
- Name, phone, fax, email, address, map pin, MDH license number, service area and Cognito form IDs live in `site.config.json`. Pages, partials, JSON-LD and `llms.txt` read them through `{{tokens}}`.
- Do not hard-code the phone number in page copy; use `{{phone}}` / `{{phoneHref}}`. Front-matter titles and descriptions are the only exception (they are checked for length at build time); update them if the phone changes.
- The client's wording is the source of truth for page copy. Link existing phrases rather than rewriting them.

## Indexing
- No `X-Robots-Tag` noindex anywhere (removed Nov 2 for launch). Canonicals always point to the custom domain.
- Sitemap `lastmod` comes from `src/lastmod.json`: a hash of each page's main content and JSON-LD, and the date that content last changed. A local `node build.mjs` updates it; commit it with the content change.
- Old WordPress URLs 301 in one hop (`src/static/_redirects`). Remove a URL from internal links and the sitemap if it ever redirects.

## Build checks (warnings printed by build.mjs)
- One `<h1>` per page, titles ≤ 60 characters, descriptions 110–160 characters, every image has alt text, the word "residential" never appears.

## Structured data
Generated in `build.mjs`. Every page has one `@graph` with:
- the business node (`#business`, `LocalBusiness` + `MedicalBusiness`) with `potentialAction` for tour booking, contact and phone
- the `WebSite` node (`#website`)
- a `WebPage` (or `AboutPage`, `ContactPage`, `CollectionPage`)
- `BreadcrumbList` on inner pages, `Service` (`#service`) on service pages, `FAQPage` where FAQs are visible

### Intentionally not marked up, and why
- **Review / AggregateRating:** there are no first-party reviews on the site. Third-party (Google) reviews must never be marked up.
- **openingHoursSpecification:** the home is staffed 24/7 but tour/office hours have not been confirmed by the client.
- **GeoCircle:** `geo` uses the client-confirmed Google Maps pin (`site.config.json` → `geo`), but no service radius has been given, so the service area is a State plus named cities rather than a GeoCircle.
- **sameAs:** no confirmed Google Business Profile or social profile URLs yet.
- **Person (owner, RN):** names and credentials have not been provided.
- **Offer / price:** pricing is discussed by phone; none is published.
- **Dementia / memory care:** intentionally not offered on the site (client decision).
