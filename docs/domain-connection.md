# Connecting prayersthatgrow.com

## Now: bus1idea.scalablestudio.online (Ken, 2026-11-05)

Ken chose to go live on a subdomain of the domain Scalable Studio already owns, and to make this repository
public (the hosting choice below is settled that way: Pages publishes straight from this repo, free).
- `site.config.json` → `deploy.domain` is `bus1idea.scalablestudio.online`, `deploy.live` is `true`.
- "Publish website" runs on every push to `main` that touches the website.
- DNS at Hostinger (scalablestudio.online zone): `bus1idea` CNAME `scaleablestudio.github.io.`. Body file:
  `Scriptorium\Workshop\Hostinger\changes\2026-11-05-bus1idea-dns.json`. Restore point before it: snapshot
  194360425. The domain is already verified for the ScaleableStudio organisation, so no new TXT record is needed.
- Ken asked for scalablestudio.com; the account owns only scalablestudio.ai and .online, so .online is used.

When prayersthatgrow.com is bought, follow the steps below with that domain, then set `deploy.domain` to it
(steps 2 and 3 are needed again: the new domain must be verified and pointed).

---

Prepared 2026-11-04, ready for when the domain is bought.

**Already ready:**
- `site.config.json` → `deploy.domain` is `prayersthatgrow.com`, and the build writes it to `site/CNAME`.
- `.github/workflows/pages.yml` publishes `site/` only:
  - it runs only when started by hand;
  - it stops while `deploy.live` is `false`;
  - it runs the pricing tests first;
  - it checks the cart is not in the site.
- `deploy/dns-github-pages.json` holds the DNS records for GitHub Pages, in the format the Scriptorium Hostinger
  gateway takes. It is the same layout that put scalablestudio.online on GitHub Pages on 2026-11-04.

## Decision needed first: where the public site lives

This repository is **private**, and it holds the whole project (blueprint, research, Ann's v3, laser files).
GitHub Pages can only publish from a private repository on a paid GitHub plan. Three ways forward:

| Option | How | For | Against |
|---|---|---|---|
| **A. A small public site repo** (Thunder's recommendation) | A second repo, e.g. `ScaleableStudio/prayersthatgrow.com`, holding only the built `site/` folder; this repo stays private | Free; business files stay private; same setup as scalablestudio.online | One more repo; publish by copying `site/` across (scriptable) |
| B. Paid GitHub plan for the organisation | Pages publishes straight from this private repo with the workflow here | Simplest flow | Monthly cost |
| C. Shopify hosts the whole domain | The pages become the Shopify theme's Home, About and Contact | One place for site and shop | The pages must be rebuilt in Shopify's theme; Shopify monthly plan |

The shop itself is Shopify either way. With A or B, a common pattern is the site on `prayersthatgrow.com` and the
store on `shop.prayersthatgrow.com` (a CNAME to Shopify). Ken and Ann decide.

## Steps once the domain is bought (A or B)

1. **Buy** prayersthatgrow.com (owner tier: Ken and Ann). If it's bought at Hostinger on Ann's account, the
   gateway can manage its DNS.
2. **Verify the domain for the ScaleableStudio organisation** on GitHub (organisation settings → Pages → Add a
   domain). GitHub shows a TXT record:
   `_github-pages-challenge-ScaleableStudio.prayersthatgrow.com`, with a value that only exists at that moment.
   Add it to the zone (`"overwrite": false`).
3. **DNS:**
   - take a Hostinger snapshot (`dns.snapshots.list`) and save the current zone first;
   - dry-run `deploy/dns-github-pages.json` with `dns.zone.update`;
   - Ken's yes, then apply;
   - read the zone back.
   - The records:
     - `@` A 185.199.108.153, 185.199.109.153, 185.199.110.153, 185.199.111.153
     - `www` CNAME `scaleablestudio.github.io.`
   - `"overwrite": true` replaces only the `@` A and `www` CNAME records named in the file. When the same
     layout was applied to scalablestudio.online, the zone's other 12 records, mail included, stayed as they were.
     Still read the zone back afterwards.
4. **Turn on Pages:** repository settings → Pages → Source: GitHub Actions; custom domain `prayersthatgrow.com`.
5. **Go live:** set `deploy.live` to `true` in `site.config.json`, commit, and run "Publish website" from the
   Actions tab.
6. **HTTPS:** wait for the certificate, then tick "Enforce HTTPS". If no certificate appears, clear and re-save
   the custom domain (the lesson from sidebox.scalablestudio.online).
7. **Check:**
   - `https://prayersthatgrow.com`, `/about.html` and `/contact.html` return 200;
   - `www` redirects;
   - the cart URL returns 404.

## For option C or the shop subdomain (Shopify)

Shopify shows the exact records in its admin when a domain is connected; use those. Commonly they are an `@` A
record to Shopify's IP and a `www` (or `shop`) CNAME to `shops.myshopify.com`. Confirm in Shopify at the time
rather than from this note.
