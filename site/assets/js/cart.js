/* Cart page (draft). Quantities per prayer, totals from pricing.js, so the page and the tests use the same maths.
   The quantities are kept in this browser only (localStorage) and the checkout button stays off until Shopify is set up. */
(function () {
  'use strict';
  var data = JSON.parse(document.getElementById('ptg-data').textContent);
  var P = window.PTGPricing;
  var KEY = 'ptg-cart-v1';
  var qty = {};
  try { qty = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { qty = {}; }

  var linesEl = document.getElementById('cart-lines');
  linesEl.innerHTML = data.prayers.map(function (p) {
    var id = 'q-' + p.id;
    return '<div class="cart-line"><div><h3>' + p.title + '</h3><p class="fine">' + p.reference + '</p></div>' +
      '<div class="stepper"><button type="button" class="btn" data-step="-1" data-id="' + p.id + '" aria-label="One fewer ' + p.title + '">−</button>' +
      '<label class="sr" for="' + id + '">Cards of ' + p.title + '</label>' +
      '<input id="' + id + '" type="number" min="0" step="1" inputmode="numeric" value="' + (qty[p.id] || 0) + '" data-id="' + p.id + '">' +
      '<button type="button" class="btn" data-step="1" data-id="' + p.id + '" aria-label="One more ' + p.title + '">+</button></div></div>';
  }).join('');

  function render() {
    var lines = data.prayers.map(function (p) { return { id: p.id, title: p.title, qty: qty[p.id] || 0 }; });
    var q = P.quote(lines, data.pricing);
    document.getElementById('cart-summary').innerHTML =
      '<div><dt>Cards</dt><dd>' + q.qty + '</dd></div>' +
      '<div><dt>Price per card</dt><dd>' + (q.qty ? P.money(q.unitCents) : '–') + '</dd></div>' +
      '<div><dt>Subtotal</dt><dd>' + P.money(q.subtotalCents) + '</dd></div>' +
      '<div><dt>Shipping</dt><dd>' + P.money(q.shippingCents) + '</dd></div>' +
      '<div><dt>Total</dt><dd><strong>' + P.money(q.totalCents) + '</strong></dd></div>';
    var nudge = document.getElementById('cart-nudge');
    nudge.hidden = !q.cardsToBulk;
    if (q.cardsToBulk) nudge.textContent = 'Add ' + q.cardsToBulk + ' more card' + (q.cardsToBulk > 1 ? 's' : '') + ', of any prayer, and every card drops to ' + P.money(data.pricing.bulkCents) + '.';
    try { localStorage.setItem(KEY, JSON.stringify(qty)); } catch (e) { /* storage blocked: the cart still works for this visit */ }
  }

  linesEl.addEventListener('click', function (e) {
    var b = e.target.closest('[data-step]');
    if (!b) return;
    var id = b.dataset.id;
    qty[id] = Math.max(0, (qty[id] || 0) + Number(b.dataset.step));
    document.getElementById('q-' + id).value = qty[id];
    render();
  });
  linesEl.addEventListener('input', function (e) {
    if (!e.target.dataset.id) return;
    qty[e.target.dataset.id] = Math.max(0, Math.floor(Number(e.target.value) || 0));
    render();
  });
  render();
}());
