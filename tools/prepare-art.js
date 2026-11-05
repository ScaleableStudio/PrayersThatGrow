'use strict';
// Turns the laser files into web images: drops the red cut line, turns engraving (black, and the blue border)
// into the laser-burn colour, puts the card on its paper colour, and rounds coordinates to 0.01 mm to keep files
// small. Also copies the placeholder logo. Paths come from site.config.json ("art").
// Run: node tools/prepare-art.js        Output: assets/art/*.svg

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const cfg = JSON.parse(fs.readFileSync(path.join(root, 'site.config.json'), 'utf8'));
const src = path.resolve(root, cfg.art.laserDir);
const out = path.join(root, 'assets', 'art');
fs.mkdirSync(out, { recursive: true });

const round = s => s.replace(/-?\d+\.\d{3,}/g, n => String(Math.round(parseFloat(n) * 100) / 100));

for (const name of cfg.art.pieces) {
  const svg = fs.readFileSync(path.join(src, name + '.svg'), 'utf8');
  const vb = svg.match(/viewBox="([^"]+)"/)[1];
  const [, , w, h] = vb.split(/\s+/).map(Number);
  let body = (svg.match(/<svg\b[^>]*>([\s\S]*)<\/svg>/) || [])[1];
  body = body
    .replace(/<defs\b[^>]*\/>/g, '')
    .replace(/<path\b[^>]*stroke="#ff0000"[^>]*\/>/g, '')          // cut line: the card edge shows the cut
    .replace(/\s+id="[^"]*"/g, '')
    .replace(/(fill|stroke)="#(000000|0000ff)"/g, `$1="${cfg.art.burn}"`);
  body = round(body).replace(/\n\s+/g, '\n');
  const paper = name === 'seed-swatch' ? '#efe8d8' : cfg.art.paper;
  const label = name.replace(/-/g, ' ');
  const file = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" width="${w}mm" height="${h}mm" role="img" aria-label="${label}">` +
    `<rect width="${w}" height="${h}" fill="${paper}"/>${body}</svg>\n`;
  fs.writeFileSync(path.join(out, name + '.svg'), file, 'utf8');
  console.log(`${name}.svg ${Math.round(file.length / 1024)} KB`);
}

const logo = fs.readFileSync(path.resolve(root, cfg.art.logo), 'utf8').replace(/<!--[\s\S]*?-->\s*/g, '');
fs.writeFileSync(path.join(out, 'logo.svg'), logo, 'utf8');
console.log('logo.svg copied (placeholder logo)');
