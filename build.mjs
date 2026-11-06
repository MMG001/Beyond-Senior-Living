// Zero-dependency static site build for Beyond Senior Living.
// - Wraps every page in src/pages with the shared layout (head, header/nav, footer)
// - Expands <x-img>, <x-cognito>, <x-partial> shortcodes and {{tokens}}
// - Writes per-page SEO tags + JSON-LD, sitemap.xml, robots.txt
// Run: node build.mjs   → output in dist/
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT = path.dirname(new URL(import.meta.url).pathname);
const SRC = path.join(ROOT, 'src');
const DIST = path.join(ROOT, 'dist');
const site = JSON.parse(fs.readFileSync(path.join(ROOT, 'site.config.json'), 'utf8'));
const images = JSON.parse(fs.readFileSync(path.join(SRC, 'images.json'), 'utf8'));
const warnings = [];

const read = (p) => fs.readFileSync(p, 'utf8');
const esc = (s = '') => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const attrs = (s) => {
  const o = {};
  for (const m of s.matchAll(/([\w-]+)(?:="([^"]*)")?/g)) o[m[1]] = m[2] ?? true;
  return o;
};
function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const e of fs.readdirSync(from, { withFileTypes: true })) {
    const a = path.join(from, e.name), b = path.join(to, e.name);
    e.isDirectory() ? copyDir(a, b) : fs.copyFileSync(a, b);
  }
}
function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(path.join(dir, e.name)) : e.name.endsWith('.html') ? [path.join(dir, e.name)] : []);
}

// ---------- fresh dist ----------
fs.rmSync(DIST, { recursive: true, force: true });
copyDir(path.join(SRC, 'assets'), path.join(DIST, 'assets'));
copyDir(path.join(SRC, 'static'), DIST);

const hash = (f) => crypto.createHash('md5').update(read(path.join(SRC, f))).digest('hex').slice(0, 8);
const assetV = { css: hash('assets/css/site.css'), js: hash('assets/js/site.js') };

// ---------- shortcodes ----------
function img(a) {
  const meta = images[a.name];
  if (!meta) { warnings.push(`Unknown image "${a.name}"`); return ''; }
  const largest = meta.widths[meta.widths.length - 1];
  const h = Math.round(meta.h * largest / meta.w);
  const srcset = meta.widths.map((w) => `/assets/img/${a.name}-${w}.webp ${w}w`).join(', ');
  const fallback = meta.widths.find((w) => w >= 800) || largest;
  if (!a.alt && a.alt !== '') warnings.push(`Image "${a.name}" missing alt`);
  return `<img src="/assets/img/${a.name}-${fallback}.webp" srcset="${srcset}" sizes="${a.sizes || '(min-width: 1200px) 600px, 100vw'}" width="${largest}" height="${h}" alt="${esc(a.alt)}"${a.class ? ` class="${a.class}"` : ''}${a.eager ? ' fetchpriority="high"' : ' loading="lazy"'} decoding="async">`;
}
function cognito(a) {
  const key = site.cognito.accountKey, f = site.cognito.forms[a.form];
  if (key && f && f.id) {
    // Cognito iframe embed, exactly as provided by Cognito Forms (iframe.js auto-resizes the frame)
    return `<div class="cognito-wrap"><iframe src="https://www.cognitoforms.com/f/${esc(key)}/${esc(f.id)}" allow="payment" style="border:0;width:100%;" height="${esc(f.height || '600')}" title="${esc(f.title || 'Form')}"></iframe>\n<script src="https://www.cognitoforms.com/f/iframe.js"></script></div><p class="note form-help">Trouble with the form? Call <a href="${site.phoneHref}">${site.phone}</a> or email <a href="mailto:${site.email}">${site.email}</a>. We use what you send only to respond to you; see our <a href="/privacy-policy/">privacy policy</a>.</p>`;
  }
  warnings.push(`Cognito form "${a.form}" not configured — fallback shown`);
  return `<div class="form-fallback" role="note"><p class="form-fallback__title">${esc(a.title || 'Our online form is on its way')}</p><p>${esc(a.text || 'In the meantime, call or email us and we’ll get right back to you.')}</p><p class="form-fallback__actions"><a class="btn" href="${site.phoneHref}">Call ${site.phone}</a> <a class="btn btn-ghost" href="mailto:${site.email}">Email us</a></p></div>`;
}
const partials = {};
const partial = (name) => (partials[name] ??= read(path.join(SRC, 'partials', `${name}.html`)));

function expand(html) {
  for (let i = 0; i < 3; i++) html = html.replace(/<x-partial\s+name="([\w-]+)"\s*\/>/g, (_, n) => partial(n));
  html = html.replace(/<x-img\s+([^>]*?)\s*\/>/g, (_, s) => img(attrs(s)));
  html = html.replace(/<x-cognito\s+([^>]*?)\s*\/>/g, (_, s) => cognito(attrs(s)));
  html = html.replace(/<x-gallery-item\s+([^>]*?)\s*\/>/g, (_, s) => {
    const a = attrs(s), meta = images[a.name];
    if (!meta) { warnings.push(`Unknown image "${a.name}"`); return ''; }
    const full = `/assets/img/${a.name}-${meta.widths[meta.widths.length - 1]}.webp`;
    return `<li><figure><a href="${full}" data-full>${img({ ...a, sizes: '(min-width: 1200px) 380px, (min-width: 600px) 45vw, 100vw' })}</a>${a.caption ? `<figcaption>${esc(a.caption)}</figcaption>` : ''}</figure></li>`;
  });
  html = html.replace(/\{\{(\w+)\}\}/g, (m, k) => (k === 'year' ? String(new Date().getFullYear()) : site[k] ?? m));
  return html;
}

// ---------- schema ----------
const absolute = (p) => (p.startsWith('http') ? p : site.url + p);
const business = {
  '@type': ['LocalBusiness', 'MedicalBusiness'],
  '@id': `${site.url}/#business`,
  name: site.name,
  description: 'Small, family-style assisted living home in Woodbury, Minnesota with awake staff on site 24/7 and RN services, serving the Twin Cities.',
  url: site.url + '/',
  telephone: '+1-' + site.phone,
  faxNumber: '+1-' + site.fax,
  email: site.email,
  logo: `${site.url}/icon-512.png`,
  image: `${site.url}/assets/img/og-default.jpg`,
  address: { '@type': 'PostalAddress', streetAddress: site.street, addressLocality: site.city, addressRegion: site.region, postalCode: site.zip, addressCountry: 'US' },
  areaServed: [{ '@type': 'State', name: 'Minnesota' }, ...site.areaServed.map((n) => ({ '@type': 'City', name: n }))],
  paymentAccepted: 'Private pay, long-term care insurance, Minnesota Medicaid waivers (Brain Injury, CADI, Elderly Waiver)',
  hasMap: site.mapsUrl,
  sameAs: [site.gbpUrl],
  geo: { '@type': 'GeoCoordinates', latitude: site.geo.latitude, longitude: site.geo.longitude },
  identifier: { '@type': 'PropertyValue', propertyID: 'Minnesota Department of Health assisted living license', value: site.license },
  potentialAction: [
    { '@type': 'ReserveAction', name: 'Schedule a tour', target: { '@type': 'EntryPoint', urlTemplate: `${site.url}/schedule-a-tour/`, actionPlatform: ['https://schema.org/DesktopWebPlatform', 'https://schema.org/MobileWebPlatform'] } },
    { '@type': 'CommunicateAction', name: 'Send us a message', target: { '@type': 'EntryPoint', urlTemplate: `${site.url}/contact/`, actionPlatform: ['https://schema.org/DesktopWebPlatform', 'https://schema.org/MobileWebPlatform'] } },
    { '@type': 'CommunicateAction', name: 'Call us', target: { '@type': 'EntryPoint', urlTemplate: site.phoneHref, actionPlatform: ['https://schema.org/MobileWebPlatform'] } },
  ],
};
const website = { '@type': 'WebSite', '@id': `${site.url}/#website`, url: site.url + '/', name: site.name, publisher: { '@id': `${site.url}/#business` } };
const pageType = { '/about/': 'AboutPage', '/contact/': 'ContactPage', '/gallery/': 'CollectionPage', '/gallery/our-facility/': 'CollectionPage', '/gallery/our-rooms/': 'CollectionPage' };

// ---------- lastmod tracking (src/lastmod.json is committed) ----------
const LASTMOD = path.join(SRC, 'lastmod.json');
const lastmod = fs.existsSync(LASTMOD) ? JSON.parse(read(LASTMOD)) : {};
let lastmodChanged = false;
const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' });

// ---------- pages ----------
const layout = read(path.join(SRC, 'partials', 'layout.html'));
const pages = [];
for (const file of walk(path.join(SRC, 'pages'))) {
  const raw = read(file);
  const m = raw.match(/^<!--\s*(\{[\s\S]*?\})\s*-->\s*/);
  if (!m) throw new Error(`Missing front matter in ${file}`);
  const fm = JSON.parse(m[1]);
  const body = raw.slice(m[0].length);
  pages.push({ ...fm, body, file });
}

for (const p of pages) {
  const url = absolute(p.path);
  const title = p.path === '/' ? p.title : `${p.title}`;
  const ogImg = absolute(p.ogImage || '/assets/img/og-default.jpg');
  const graph = [ { ...business } ];
  graph.push(website);
  graph.push({ '@type': pageType[p.path] || 'WebPage', '@id': url + '#webpage', url, name: title, description: p.description, isPartOf: { '@id': `${site.url}/#website` }, about: { '@id': `${site.url}/#business` }, ...(p.service ? { mainEntity: { '@id': url + '#service' } } : {}) });
  if (p.breadcrumbs) {
    const items = [['Home', '/'], ...p.breadcrumbs];
    graph.push({ '@type': 'BreadcrumbList', itemListElement: items.map(([name, href], i) => ({ '@type': 'ListItem', position: i + 1, name, item: absolute(href) })) });
  }
  if (p.service) graph.push({ '@type': 'Service', '@id': url + '#service', name: p.service, description: p.description, serviceType: p.service, provider: { '@id': `${site.url}/#business` }, areaServed: { '@type': 'State', name: 'Minnesota' }, url });
  if (p.city) {
    graph.push({ '@type': 'City', '@id': url + '#city', name: 'Woodbury', description: 'City in Washington County, Minnesota, United States', url,
      geo: { '@type': 'GeoCoordinates', latitude: 44.9239, longitude: -92.9594 },
      containedInPlace: { '@type': 'State', name: 'Minnesota', geo: { '@type': 'GeoCoordinates', latitude: 45.7326, longitude: -93.9196 } },
      sameAs: ['https://www.wikidata.org/wiki/Q862672', 'https://en.wikipedia.org/wiki/Woodbury,_Minnesota', 'https://www.woodburymn.gov/'] });
    graph.find((n) => n['@id'] === url + '#webpage').mainEntity = { '@id': url + '#city' };
  }
  if (p.faq) graph.push({ '@type': 'FAQPage', mainEntity: p.faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) });
  const jsonld = JSON.stringify({ '@context': 'https://schema.org', '@graph': graph });

  let crumbs = '';
  if (p.breadcrumbs) {
    const items = [['Home', '/'], ...p.breadcrumbs];
    crumbs = `<nav class="crumbs" aria-label="Breadcrumb"><ol>${items.map(([n, h], i) => i === items.length - 1 ? `<li><span aria-current="page">${esc(n)}</span></li>` : `<li><a href="${h}">${esc(n)}</a></li>`).join('')}</ol></nav>`;
  }
  let faqHtml = '';
  if (p.faq) faqHtml = p.faq.map(([q, a]) => `<details class="faq__item"><summary>${esc(q)}</summary><div class="faq__a"><p>${esc(a)}</p></div></details>`).join('\n');

  let html = layout
    .replace('{{pageTitle}}', esc(title))
    .replace(/\{\{pageDescription\}\}/g, esc(p.description))
    .replace(/\{\{canonical\}\}/g, url)
    .replace(/\{\{ogImage\}\}/g, ogImg)
    .replace(/\{\{ogTitle\}\}/g, esc(p.ogTitle || title))
    .replace('{{robots}}', p.noindex ? 'noindex, follow' : 'index, follow, max-image-preview:large')
    .replace('{{jsonld}}', jsonld.replace(/</g, '\\u003c'))
    .replace('{{preload}}', p.preload ? `<link rel="preload" as="image" href="/assets/img/${p.preload}" fetchpriority="high">` : '')
    .replace(/\{\{cssV\}\}/g, assetV.css).replace(/\{\{jsV\}\}/g, assetV.js)
    .replace('{{bodyClass}}', p.bodyClass || '')
    .replace('{{content}}', p.body.replace('{{breadcrumbs}}', crumbs).replace('{{faq}}', faqHtml));
  html = expand(html);
  // active nav state
  html = html.replace(/(<a )(href="([^"]+)"[^>]*data-nav[^>]*)>/g, (all, a, rest, href) => {
    if (href === p.path) return `${a}${rest} aria-current="page">`;
    if (href !== '/' && p.path.startsWith(href)) return `${a}${rest} data-active>`;
    return all;
  });
  const h1s = (html.match(/<h1[\s>]/g) || []).length;
  if (h1s !== 1) warnings.push(`${p.path} has ${h1s} <h1>`);
  if (/residential/i.test(html.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/, ''))) warnings.push(`${p.path} contains the word "residential"`);
  if (p.title.length > 60) warnings.push(`${p.path} title is ${p.title.length} chars`);
  if (p.description.length > 160 || p.description.length < 110) warnings.push(`${p.path} description is ${p.description.length} chars`);

  // lastmod: hash of the page's main content; the date only changes when that content changes
  if (!p.noindex) {
    const mainHtml = (html.match(/<main[\s\S]*?<\/main>/) || [html])[0];
    const h = crypto.createHash('sha1').update(mainHtml + jsonld).digest('hex').slice(0, 12);
    const prev = lastmod[p.path];
    if (!prev || prev.hash !== h) { lastmod[p.path] = { hash: h, date: today }; lastmodChanged = true; }
    p.lastmod = lastmod[p.path].date;
  }
  const out = p.path === '/404/' ? path.join(DIST, '404.html') : path.join(DIST, p.path, 'index.html');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, html);
}

// ---------- sitemap + robots ----------
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages
  .filter((p) => !p.noindex)
  .sort((a, b) => (b.priority ?? 0.6) - (a.priority ?? 0.6))
  .map((p) => `  <url><loc>${absolute(p.path)}</loc><lastmod>${p.lastmod}</lastmod><priority>${(p.priority ?? 0.6).toFixed(1)}</priority></url>`)
  .join('\n')}\n</urlset>\n`;
fs.writeFileSync(path.join(DIST, 'sitemap.xml'), sitemap);
// llms.txt: fill {{tokens}} from site.config.json so business facts stay in one place
{ const f = path.join(DIST, 'llms.txt'); if (fs.existsSync(f)) fs.writeFileSync(f, read(f).replace(/\{\{(\w+)\}\}/g, (m, k) => site[k] ?? m)); }
fs.writeFileSync(path.join(DIST, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${site.url}/sitemap.xml\n`);

if (lastmodChanged) {
  if (process.env.CF_PAGES) warnings.push('src/lastmod.json is out of date: run `node build.mjs` locally and commit it so sitemap dates stay accurate');
  else fs.writeFileSync(LASTMOD, JSON.stringify(Object.fromEntries(Object.entries(lastmod).sort()), null, 2) + '\n');
}
console.log(`Built ${pages.length} pages → dist/`);
if (warnings.length) console.log('\nWarnings:\n- ' + [...new Set(warnings)].join('\n- '));
