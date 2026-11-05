'use strict';
// Tests the order maths against the blueprint's worked examples and Ann's v3 checkout tests (adopted 2026-11-04).
// Run: node tools/pricing.test.js        Exit code 1 if any test fails.
// Test 7 (owners track orders without re-entry) belongs to the Shopify store itself and is checked there.

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const P = require('../assets/js/pricing.js');
const rules = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'site.config.json'), 'utf8')).pricing;

const lord = n => ({ id: 'lords-prayer', title: "The Lord's Prayer", qty: n });
const other = (id, n) => ({ id, title: id, qty: n });
const tests = [
  ['Blueprint: 1 card = $11.25', () => assert.strictEqual(P.quote([lord(1)], rules).totalCents, 1125)],
  ['Blueprint: 5 cards = $56.25', () => assert.strictEqual(P.quote([lord(5)], rules).totalCents, 5625)],
  ['Blueprint: 10 cards = $97.50', () => assert.strictEqual(P.quote([lord(10)], rules).totalCents, 9750)],
  ['Blueprint: church order of 50 = $437.50', () => assert.strictEqual(P.quote([lord(50)], rules, { church: true, verified: true }).totalCents, 43750)],
  ['v3 test 1: 3 + 4 + 3 of three prayers gets $8.50 on all 10', () => {
    const q = P.quote([lord(3), other('prayer-2', 4), other('prayer-3', 3)], rules);
    assert.strictEqual(q.qty, 10); assert.strictEqual(q.unitCents, 850); assert.strictEqual(q.subtotalCents, 8500);
  }],
  ['v3 test 2: 9 cards in any mix stay at $10 each', () => {
    const q = P.quote([lord(5), other('prayer-2', 4)], rules);
    assert.strictEqual(q.unitCents, 1000); assert.strictEqual(q.cardsToBulk, 1);
  }],
  ['v3 test 3: a church request takes no payment and waits for the phone call', () => {
    const q = P.quote([lord(24)], rules, { church: true });
    assert.strictEqual(q.payNow, false); assert.strictEqual(q.status, 'pending phone verification');
  }],
  ['v3 test 4: a verified church order is invoiced at $7.50 a card', () => {
    const q = P.quote([lord(24)], rules, { church: true, verified: true });
    assert.strictEqual(q.unitCents, 750); assert.strictEqual(q.status, 'verified: send invoice'); assert.strictEqual(q.payNow, false);
  }],
  ['v3 test 5: shipping is $1.25 for every card', () => {
    for (const n of [1, 9, 10, 37]) assert.strictEqual(P.quote([lord(n)], rules).shippingCents, n * 125);
  }],
  ['v3 test 6: the confirmation lists every line and the right total', () => {
    const s = P.summary(P.quote([lord(3), other('prayer-2', 7)], rules));
    assert.ok(s.includes("3 × The Lord's Prayer at $8.50 = $25.50"), s);
    assert.ok(s.includes('Total: $97.50'), s);
  }],
  ['Empty or invalid quantities never charge', () => {
    const q = P.quote([lord(0), other('x', -3), other('y', 'abc')], rules);
    assert.strictEqual(q.totalCents, 0); assert.strictEqual(q.payNow, false);
  }]
];

let failed = 0;
for (const [name, fn] of tests) {
  try { fn(); console.log('pass  ' + name); } catch (e) { failed++; console.log('FAIL  ' + name + '\n      ' + e.message); }
}
console.log(`${tests.length - failed} of ${tests.length} passed`);
process.exit(failed ? 1 : 0);
