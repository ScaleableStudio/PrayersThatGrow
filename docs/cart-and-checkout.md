# Cart and checkout: ready, not deployed

Status, 2026-11-04: Ken asked for the cart to be prepared but **not deployed**.

**Where the cart is:**
- The draft page is `src/drafts/cart.html`.
- It builds to `_drafts/cart.html`, outside `site/`, so it never goes out with the website.
- No page links to it.
- `site.config.json` → `orders.open` is `false`, so every order button reads "Orders open soon".

## What is ready

- **Pricing** (`assets/js/pricing.js`) is one module used by the cart page and by the tests:
  - $10 a card;
  - $8.50 a card at 10 or more cards in the order, any mix of prayers;
  - churches $7.50, invoiced after a phone call;
  - $1.25 shipping for every card.
- **Tests** (`node tools/pricing.test.js`): 11 pass.
  - The blueprint's worked prices: 1 card $11.25, 5 cards $56.25, 10 cards $97.50, a church order of 50 $437.50.
  - Ann's v3 checkout tests 1–6. Test 7 (tracking orders without typing them in again) belongs to Shopify.
- **The cart page:**
  - quantity steppers per prayer, with live totals;
  - a nudge ("add 3 more cards and every card drops to $8.50");
  - quantities kept in the visitor's browser;
  - the checkout button is switched off.
- **The church order request** on the contact page collects the blueprint's fields: church, address, contact
  name, phone, prayer, quantity and notes. It takes no payment.

## To do when the Shopify store exists (Ken, Ann, Thunder)

1. Products: one product per prayer at $10.00, each "card" a complete set.
2. 10+ price: an automatic discount of 15% (10.00 → 8.50) when the cart holds 10 or more items from the prayer
   products, any mix. Check the result with v3 test 1 (3 + 4 + 3 = 10 cards at $8.50).
3. Shipping $1.25 per card: **to confirm** how Shopify's shipping rates can charge per item. Run the tests for
   1, 9, 10 and 37 cards.
4. Churches: the request arrives (contact form) → phone call → a Shopify draft order at $7.50 a card, sent as an
   invoice.
5. Texas sales tax permit in place before taking payment (blueprint section 15).
6. Then:
   - set `orders.open` to `true`;
   - either point the order button at Shopify, or move the cart page into `src/pages/` and wire its checkout
     button to the Shopify cart;
   - rebuild;
   - run all 7 v3 tests on the live checkout.
