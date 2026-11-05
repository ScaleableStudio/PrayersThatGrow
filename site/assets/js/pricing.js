/* Prayers That Grow pricing: one place for the order maths, used by the cart page and by tools/pricing.test.js.
   All money is in whole cents. Rules (blueprint, Ken 2026-11-02 and 2026-11-04):
   - $10 a card; $8.50 a card when the order holds 10 or more cards in total, any mix of prayers;
   - churches $7.50 a card, but only after a phone call verifies the order: the request itself takes no payment;
   - shipping $1.25 for every card, charged on top. Each card is one complete set. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.PTGPricing = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function money(cents) {
    return '$' + (cents / 100).toFixed(2);
  }

  // lines: [{ id, title, qty }]; rules: site.config.json "pricing"; opts.church: a church order request.
  function quote(lines, rules, opts) {
    opts = opts || {};
    var clean = (lines || []).map(function (l) {
      return { id: l.id, title: l.title || l.id, qty: Math.max(0, Math.floor(Number(l.qty) || 0)) };
    }).filter(function (l) { return l.qty > 0; });
    var qty = clean.reduce(function (n, l) { return n + l.qty; }, 0);
    var tier, unit;
    if (opts.church) { tier = 'church'; unit = rules.churchCents; }
    else if (qty >= rules.bulkMinQty) { tier = 'bulk'; unit = rules.bulkCents; }
    else { tier = 'base'; unit = rules.baseCents; }
    var subtotal = qty * unit;
    var shipping = qty * rules.shippingPerCardCents;
    return {
      lines: clean.map(function (l) { return { id: l.id, title: l.title, qty: l.qty, unitCents: unit, lineCents: l.qty * unit }; }),
      qty: qty,
      tier: tier,
      unitCents: unit,
      subtotalCents: subtotal,
      shippingCents: shipping,
      totalCents: subtotal + shipping,
      // A church request is held for a phone call; payment is asked only afterwards, by invoice.
      payNow: !opts.church && qty > 0,
      status: opts.church ? (opts.verified ? 'verified: send invoice' : 'pending phone verification') : (qty > 0 ? 'ready to pay' : 'empty'),
      cardsToBulk: (!opts.church && qty > 0 && qty < rules.bulkMinQty) ? rules.bulkMinQty - qty : 0
    };
  }

  // Plain-text order summary, the same wording for the page and a confirmation message.
  function summary(q) {
    var out = q.lines.map(function (l) { return l.qty + ' × ' + l.title + ' at ' + money(l.unitCents) + ' = ' + money(l.lineCents); });
    out.push('Cards: ' + q.qty);
    out.push('Subtotal: ' + money(q.subtotalCents));
    out.push('Shipping (' + q.qty + ' × ' + money(q.qty ? q.shippingCents / q.qty : 0) + '): ' + money(q.shippingCents));
    out.push('Total: ' + money(q.totalCents));
    out.push('Status: ' + q.status);
    return out.join('\n');
  }

  return { quote: quote, summary: summary, money: money };
}));
