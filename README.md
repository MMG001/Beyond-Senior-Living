# Beyond Senior Living: website

A static, SEO-optimized rebuild of beyondseniorlivingmn.com. It's plain HTML and CSS with a tiny build script and no frameworks or dependencies, hosted on Cloudflare Pages.

## Deploy on Cloudflare Pages

1. Push this folder to a GitHub repo.
2. In Cloudflare, go to **Workers & Pages > Create > Pages > Connect to Git** and pick the repo.
3. Use these build settings:
   - **Framework preset:** None
   - **Build command:** `node build.mjs`
   - **Build output directory:** `dist`
   - **Environment variable:** `NODE_VERSION` = `20` (any version 18+ works)
4. Add the custom domain `beyondseniorlivingmn.com` and `www` under **Custom domains**. The canonical URL is the non-www domain; add a redirect rule for www → non-www.
5. After launch, submit `https://beyondseniorlivingmn.com/sitemap.xml` in Google Search Console. The verification file `google677f148e16a35022.html` is already included.

Every push to `main` rebuilds and redeploys automatically.

## Local preview

```bash
node build.mjs
npx serve dist        # or: python3 -m http.server -d dist 8080
```

## Where things live

| Path | What it is |
|---|---|
| `site.config.json` | Business name, phone, fax, email, address, service area and **Cognito form IDs**. Change them here once and every page updates. |
| `src/partials/header.html` | Top bar, logo and main navigation (shared by every page) |
| `src/partials/footer.html` | Footer and the mobile "Call / Schedule a tour" bar |
| `src/partials/cta.html` | The navy "Come see the home" band used at the bottom of pages |
| `src/partials/svc-list.html` | The list of 5 services (home + services pages) |
| `src/partials/service-aside.html` | The sidebar on each service page |
| `src/partials/layout.html` | `<head>` template: meta, Open Graph, fonts, schema |
| `src/pages/**.html` | One file per page. The JSON block at the top sets the title, description, URL, breadcrumbs, FAQ and schema. |
| `src/assets/css/site.css` | All styles |
| `src/assets/js/site.js` | Mobile menu, dropdowns, gallery lightbox, click-to-load map |
| `src/static/` | Copied to the site root: `_redirects`, `_headers`, favicons, manifest, Google verification |
| `tools/images.py` | Turns original photos into responsive WebP files and writes `src/images.json` |

### Shortcodes you can use inside pages

- `<x-img name="living-room" alt="…" sizes="…" />`: a responsive WebP image with width/height and lazy loading. Add `eager` for above-the-fold images.
- `<x-gallery-item name="bedroom-1" alt="…" caption="…" />`: a gallery tile that opens in the lightbox.
- `<x-cognito form="contact" />`: embeds a Cognito form (see below).
- `<x-partial name="cta" />`: includes a partial.
- `{{phone}}`, `{{phoneHref}}`, `{{fax}}`, `{{email}}`, `{{street}}`, `{{year}}` and the other keys from `site.config.json`.

## Connect the Cognito forms

1. In Cognito Forms, open the form, then **Publish > Embed > Seamless**.
2. The code looks like `<script src="https://www.cognitoforms.com/f/seamless.js" data-key="ABC123…" data-form="5"></script>`.
3. Copy `data-key` into `cognito.accountKey` and `data-form` into `cognito.forms.contact` (Contact page) or `cognito.forms.employment` (Employment page) in `site.config.json`.
4. Commit. Until a form ID is filled in, that page shows a "Call / Email us" box instead, so there's never a broken form.

## SEO built in

- One `<h1>` per page, unique titles (≤ 60 characters) and meta descriptions (110–160 characters). The build warns if any are off.
- Canonical URLs, Open Graph and Twitter cards with a 1200×630 share image.
- JSON-LD `LocalBusiness` + `MedicalBusiness` (name, address, phone, fax, email, area served, payment accepted) on every page, plus `WebSite`, `BreadcrumbList`, `Service` and `FAQPage` where relevant.
- `sitemap.xml` and `robots.txt` generated on every build.
- 301 redirects from every old WordPress URL (`/services-style-1/...`, `/job-application/`, etc.) to the new pages, so existing Google rankings carry over.
- Fast pages: self-hosted fonts (no Google Fonts request), WebP images with `srcset`, lazy loading, Google Maps loaded only when clicked, long cache headers, roughly 10 KB of JavaScript.
- Accessibility: skip link, keyboard-friendly dropdowns, visible focus, alt text on every image, reduced-motion support.

## Content rules

- Always say **"assisted living"**, never "residential home". The build warns if the word "residential" appears.
- Phone 651-200-0857 · Fax 651-500-6891 · beyondseniorliving@gmail.com · 6281 Oakwood Road, Woodbury, MN 55128
