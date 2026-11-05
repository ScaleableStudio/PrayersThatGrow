'use strict';
// Mirrors the working project in Scriptorium (Projects/bus1idea: blueprint, research, laser files, vision boards,
// renders, scripts) into project/ in this repository. Scriptorium stays the working copy; run this after changes there.
// It empties project/ first, so files removed in Scriptorium are removed here too. Paths: site.config.json "project".
// It refuses to copy font files or anything that looks like a secret.
// Run: node tools/sync-project.js

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const cfg = JSON.parse(fs.readFileSync(path.join(root, 'site.config.json'), 'utf8')).project;
const from = path.resolve(root, cfg.source);
const to = path.join(root, cfg.target);
const refuse = /\.(ttf|otf|woff2?|key|pem)$|(^|[\\/])\.env|secret|token/i;
if (!fs.existsSync(path.join(from, 'blueprint.md'))) throw new Error('Source does not look like the bus1idea project: ' + from);

fs.mkdirSync(to, { recursive: true });
for (const e of fs.readdirSync(to)) fs.rmSync(path.join(to, e), { recursive: true, force: true });

let files = 0, bytes = 0;
const refused = [];
(function copy(a, b) {
  fs.mkdirSync(b, { recursive: true });
  for (const e of fs.readdirSync(a, { withFileTypes: true })) {
    const pa = path.join(a, e.name), pb = path.join(b, e.name);
    if (e.isDirectory()) { copy(pa, pb); continue; }
    if (refuse.test(path.relative(from, pa))) { refused.push(path.relative(from, pa)); continue; }
    fs.copyFileSync(pa, pb);
    files++; bytes += fs.statSync(pa).size;
  }
})(from, to);

console.log(`project/: ${files} files, ${(bytes / 1048576).toFixed(1)} MB copied from ${from}`);
if (refused.length) console.log('Not copied (fonts or secret-like names):\n  ' + refused.join('\n  '));
