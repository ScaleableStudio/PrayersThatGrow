'use strict';
// Builds the website from src/ and site.config.json.
//   src/pages/*.html   -> site/*.html        (the public pages: Home, About, Contact)
//   src/drafts/*.html  -> _drafts/*.html     (the cart: prepared, NOT part of site/, never deployed from here)
//   assets/            -> site/assets/
// In a page: first line <!--meta {"title","description","nav"}-->; {{> partial}} pulls src/partials/partial.html;
// {{path.in.config}} and {{computed.value}} fill values (escaped); an unknown marker stops the build.
// Run: node tools/build.js

const fs = require('fs');
const path = require('path');
const P = require('../assets/js/pricing.js');

const root = path.resolve(__dirname, '..');
const cfg = JSON.parse(fs.readFileSync(path.join(root, 'site.config.json'), 'utf8'));
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const pr = cfg.pricing;
const withShip = c => P.money(c + pr.shippingPerCardCents);

// Values the pages use that are worked out from the config, so no price is ever typed into a page.
const computed = {
  price: {
    base: P.money(pr.baseCents), bulk: P.money(pr.bulkCents), church: P.money(pr.churchCents),
    shipping: P.money(pr.shippingPerCardCents), bulkMin: pr.bulkMinQty,
    baseTotal: withShip(pr.baseCents), bulkTotal: withShip(pr.bulkCents), churchTotal: withShip(pr.churchCents),
    bulkBelow: pr.bulkMinQty - 1
  },
  prayer: cfg.prayers[0],
  prayersAvailable: cfg.prayers.filter(p => p.available).length,
  ordersOpen: cfg.orders.open,
  // Forms send only once a form service is set in the config; until then the page says so instead of pretending.
  forms: { endpoint: cfg.contact.formEndpoint || '', ready: cfg.contact.formEndpoint ? 'yes' : 'no' }
};

// HTML snippets built from lists in the config (inserted unescaped: they are made here from escaped values).
const html = {
  socialLinks: (() => {
    const claimed = cfg.social.filter(s => s.claimed);
    if (!claimed.length) return '<p class="fine">Social accounts are on the way.</p>';
    return '<ul class="social">' + claimed.map(s => `<li><a href="${esc(s.url)}" rel="noopener">${esc(s.platform)} <span class="mono">${esc(s.handle)}</span></a></li>`).join('') + '</ul>';
  })(),
  contactDetails: (() => {
    const c = cfg.contact, rows = [];
    if (c.email) rows.push(`<div><dt>Email</dt><dd><span class="mono">${esc(c.email)}</span></dd></div>`);
    if (c.phone) rows.push(`<div><dt>Phone</dt><dd><span class="mono">${esc(c.phone)}</span></dd></div>`);
    if (!rows.length) return '<p class="notice">Our email address and phone number will be listed here when the shop opens.</p>';
    return '<dl class="details">' + rows.join('') + '</dl>';
  })(),
  prayerOptions: cfg.prayers.filter(p => p.available).map(p => `<option value="${esc(p.id)}">${esc(p.title)} · ${esc(p.reference)}</option>`).join(''),
  // The cart's data: available prayers and the price rules, as JSON for assets/js/cart.js.
  cartData: '<script type="application/json" id="ptg-data">' + JSON.stringify({
    pricing: cfg.pricing,
    prayers: cfg.prayers.filter(p => p.available).map(p => ({ id: p.id, title: p.title, reference: p.reference }))
  }).replace(/</g, '\\u003c') + '</script>',
  orderButton: cfg.orders.open
    ? '<a class="btn primary" href="cart.html">Order cards</a>'
    : '<span class="btn primary is-soon" aria-disabled="true">Orders open soon</span>'
};

function lookup(key) {
  const [head, ...rest] = key.split('.');
  let v = head === 'html' ? html : head in computed ? computed[head] : cfg[head];
  if (head === 'html') return rest.reduce((o, k) => (o == null ? o : o[k]), html);
  for (const k of rest) v = v == null ? v : v[k];
  return v == null ? v : esc(v);
}

function render(file, base) {
  let s = fs.readFileSync(file, 'utf8');
  const metaMatch = s.match(/^<!--meta (\{[\s\S]*?\})-->\s*/);
  if (!metaMatch) throw new Error(`${file}: first line must be <!--meta {...}-->`);
  const meta = JSON.parse(metaMatch[1]);
  s = s.slice(metaMatch[0].length);
  s = s.replace(/\{\{>\s*([a-z-]+)\s*\}\}/g, (_, n) => fs.readFileSync(path.join(root, 'src', 'partials', n + '.html'), 'utf8'));
  s = s.replace(/\{\{\s*page\.([a-z]+)\s*\}\}/g, (_, k) => esc(meta[k] ?? ''));
  s = s.replace(/\{\{\s*base\s*\}\}/g, base);
  s = s.replace(/\{\{\s*nav\.([a-z]+)\s*\}\}/g, (_, k) => (meta.nav === k ? ' aria-current="page"' : ''));
  s = s.replace(/\{\{\s*([A-Za-z0-9_.]+)\s*\}\}/g, (m, key) => {
    const v = lookup(key);
    if (v == null) throw new Error(`${path.basename(file)}: unknown marker ${m}`);
    return v;
  });
  return s;
}

function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const e of fs.readdirSync(from, { withFileTypes: true })) {
    const a = path.join(from, e.name), b = path.join(to, e.name);
    if (e.isDirectory()) copyDir(a, b); else fs.copyFileSync(a, b);
  }
}

const site = path.join(root, 'site');
// Empty site/ rather than delete it: Windows refuses to remove a folder that a terminal or editor has open.
fs.mkdirSync(site, { recursive: true });
for (const e of fs.readdirSync(site)) fs.rmSync(path.join(site, e), { recursive: true, force: true });
copyDir(path.join(root, 'assets'), path.join(site, 'assets'));
// GitHub Pages reads the custom domain from site/CNAME. Harmless until Pages is switched on (see docs/domain-connection.md).
fs.writeFileSync(path.join(site, 'CNAME'), cfg.deploy.domain + '\n', 'utf8');
fs.writeFileSync(path.join(site, '.nojekyll'), '', 'utf8');
for (const f of fs.readdirSync(path.join(root, 'src', 'pages')).filter(f => f.endsWith('.html'))) {
  fs.writeFileSync(path.join(site, f), render(path.join(root, 'src', 'pages', f), ''), 'utf8');
  console.log('site/' + f);
}
const drafts = path.join(root, '_drafts');
fs.mkdirSync(drafts, { recursive: true });
for (const f of fs.readdirSync(path.join(root, 'src', 'drafts')).filter(f => f.endsWith('.html'))) {
  fs.writeFileSync(path.join(drafts, f), render(path.join(root, 'src', 'drafts', f), '../site/'), 'utf8');
  console.log('_drafts/' + f + '   (draft: not in site/, not deployed)');
}
