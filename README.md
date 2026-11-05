# Prayers That Grow

**prayersthatgrow.com** · Ken & Ann's plantable prayer cards. *Plant it. Water it. Pray it.*

Each set is a prayer card read aloud each time the pot is watered, a seed-paper swatch to plant, and a thank-you
card with the four planting steps, burned by hand on a laser in Texas.

This private repository belongs to the Scalable Studio organisation. The working blueprint, laser files and
vision boards are kept in Scriptorium (`Projects\bus1idea`).

## Website (built 2026-11-04, not deployed)

| Path | What it is |
|---|---|
| `site.config.json` | Every value the site shows: name, prices, prayers, social handles, contact details, whether orders are open. Edit here, then rebuild. |
| `src/pages/` | Home (`index.html`), About, Contact, written with `{{markers}}` that the build fills from the config |
| `src/partials/` | Shared head, header and footer |
| `src/drafts/cart.html` | The cart, prepared but **not deployed** (see `docs/cart-and-checkout.md`) |
| `assets/` | Stylesheet ("Ember & Seed", from the vision board), scripts, and the card artwork made from the laser files |
| `tools/build.js` | Builds `site/` (the website) and `_drafts/` (the cart, outside the website) |
| `tools/prepare-art.js` | Remakes `assets/art/` from the laser files in Scriptorium |
| `tools/pricing.test.js` | Checks the order maths against the blueprint and Ann's checkout tests |
| `site/` | The built website: open `site/index.html` in a browser to look at it |

```
node tools/prepare-art.js     # only after the laser files change
node tools/pricing.test.js
node tools/build.js
```

Not yet set (the pages say so plainly): the contact email and phone, a form service for the contact forms,
claimed social accounts (handles are listed but not linked until claimed), and the Shopify store.
The domain is not bought yet, and nothing is deployed.

- Store: Shopify on prayersthatgrow.com
- Social: @prayersthatgrow (YouTube, TikTok, Pinterest, X) · @4prayersthatgrow (Instagram, Threads)
