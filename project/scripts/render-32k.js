// Renders the vBoard-32k vector stills on this node with resvg (Workshop\Bezalel\tools\resvg).
// Output in vision\renders\:
//   vBoard-32k-poster.png   30720 x 17280 (32K): seed logo, title, the whole set to scale from the laser files
//   seed-logo-32k.png       17280 x 17280 (the logo at full 32K height)
//   *-preview.png           1920 wide copies for checking
// Text uses Gores Sans from the licensed font library (W:\blueprints\Fonts-organized); no system fonts are read.
// Usage:  node scripts\render-32k.js [preview|full] [32k|ptg]
//   preview = previews only. Board 32k (default) = the original Sowing Faith poster, unchanged;
//   ptg = the Prayers That Grow poster (vBoard-ptg).
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const project = path.resolve(__dirname, '..');
const root = path.resolve(project, '..', '..');
const resvg = path.join(root, 'Workshop', 'Bezalel', 'tools', 'resvg', 'resvg.exe');
const cards = JSON.parse(fs.readFileSync(path.join(project, 'designs', 'cards.json'), 'utf8'));
const font = path.join(cards.fontRoot, 'library', 'Gores Sans', 'ttf', 'GoresSans.ttf');
const artDir = path.join(project, 'designs', 'laser-test');
const outDir = path.join(project, 'vision', 'renders');
fs.mkdirSync(outDir, { recursive: true });

const FULL_W = 30720, FULL_H = 17280;        // 32K
// Poster text and file names per board. '32k' reproduces the original exactly; 'ptg' is Prayers That Grow.
const BOARDS = {
  '32k': { prefix: 'vBoard-32k', logo: true, eyebrow: 'SOWING FAITH SEEDS · KEN &amp; ANN', line1: 'Plant it. Water it.', line2: 'Pray it.',
    lede: ['A daily prayer that grows, burned by hand on a laser in Texas.'], foot: 'vBoard-32k · 30720 × 17280 · set drawn to scale from the laser files' },
  'ptg': { prefix: 'vBoard-ptg', logo: false, eyebrow: 'PRAYERSTHATGROW.COM · KEN &amp; ANN', line1: 'Prayers that', line2: 'grow.',
    lede: ['Plant it. Water it. Pray it.', 'A daily prayer, burned by hand on a laser in Texas.'],
    foot: 'vBoard-ptg · prayersthatgrow.com · 30720 × 17280 · set drawn to scale from the laser files' }
};
const B = BOARDS[process.argv[3] || '32k'];
if (!B) throw new Error('Unknown board: ' + process.argv[3]);
const BURN = '#4a2d1b';

function inner(svg) { return (svg.match(/<svg\b[^>]*>([\s\S]*)<\/svg>/) || [])[1]; }
function art(name, x, y, w, h) {
  const svg = fs.readFileSync(path.join(artDir, name + '.svg'), 'utf8');
  const vb = svg.match(/viewBox="([^"]+)"/)[1];
  const body = inner(svg)
    .replace(/<defs\b[^>]*\/>/g, '')
    .replace(/<path\b[^>]*stroke="#ff0000"[^>]*\/>/g, '')
    .replace(/\s+id="[^"]*"/g, '')
    .replace(/fill="#(000000|0000ff)"/g, `fill="${BURN}"`)
    .replace(/stroke="#000000"/g, 'stroke="none"');
  return `<svg x="${x}" y="${y}" width="${w}" height="${h}" viewBox="${vb}">${body}</svg>`;
}
const logoSrc = fs.readFileSync(path.join(project, 'designs', 'logo', 'sprouting-seed.svg'), 'utf8');
const logoBody = inner(logoSrc);

function card(name, x, y, w, h, fill) {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill || '#f7f6f1'}" filter="url(#lift)"/>` + art(name, x, y, w, h);
}

// seed and petal flecks scattered over the swatch (fixed seed, so every render matches)
function flecks(x, y, w, h) {
  let s = 7, out = '';
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const cols = ['#d98aa0', '#e6c24a', '#7d9a5a', '#b88a5a', '#c66f8a'];
  for (let i = 0; i < 140; i++) {
    out += `<circle cx="${(x + 0.6 + rnd() * (w - 1.2)).toFixed(2)}" cy="${(y + 0.6 + rnd() * (h - 1.2)).toFixed(2)}" r="${(0.12 + rnd() * 0.3).toFixed(2)}" fill="${cols[i % cols.length]}"/>`;
  }
  return out;
}

// poster, laid out in a 1920 x 1080 frame, rendered at 30720 x 17280 (16x)
const S = Math.min(900 / 370, 500 / 218);
const poster = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" width="1920" height="1080">
<defs>
  <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0b0f16"/><stop offset="1" stop-color="#05070a"/></linearGradient>
  <radialGradient id="warm" cx="76%" cy="42%" r="55%"><stop offset="0" stop-color="#ff8a3d" stop-opacity="0.20"/><stop offset="1" stop-color="#ff8a3d" stop-opacity="0"/></radialGradient>
  <radialGradient id="cool" cx="8%" cy="96%" r="60%"><stop offset="0" stop-color="#5078c8" stop-opacity="0.14"/><stop offset="1" stop-color="#5078c8" stop-opacity="0"/></radialGradient>
  <filter id="lift" x="-10%" y="-10%" width="130%" height="130%"><feDropShadow dx="0.8" dy="1.6" stdDeviation="1.6" flood-color="#000" flood-opacity="0.55"/></filter>
  <filter id="txtglow" x="-20%" y="-60%" width="140%" height="220%"><feGaussianBlur stdDeviation="9" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  <pattern id="flecks" width="9" height="7" patternUnits="userSpaceOnUse">
    <rect width="9" height="7" fill="#efe9dc"/><circle cx="1.5" cy="1.2" r="0.35" fill="#d98aa0"/><circle cx="6.2" cy="3.4" r="0.3" fill="#e6c24a"/>
    <circle cx="3.6" cy="5.6" r="0.28" fill="#7d9a5a"/><circle cx="8.1" cy="6.2" r="0.22" fill="#c9a77d"/>
  </pattern>
</defs>
<rect width="1920" height="1080" fill="url(#bg)"/>
<rect width="1920" height="1080" fill="url(#warm)"/>
<rect width="1920" height="1080" fill="url(#cool)"/>
<svg x="1000" y="-40" width="1160" height="1160" viewBox="0 0 600 600">${logoBody}</svg>
<g font-family="Gores Sans">
  <text x="110" y="150" font-size="22" letter-spacing="5" fill="#ff8a3d">${B.eyebrow}</text>
  <text x="104" y="268" font-size="104" fill="#eef0f3">${B.line1}</text>
  <text x="104" y="384" font-size="104" fill="#86e39a" filter="url(#txtglow)">${B.line2}</text>
  ${B.lede.map((l, i) => `<text x="110" y="${446 + i * 40}" font-size="30" fill="#aab3c2">${l}</text>`).join('\n  ')}
</g>
<g transform="translate(110 530) scale(${S.toFixed(4)})">
  <rect x="6" y="34" width="92.075" height="165.1" rx="1" fill="#b98b5c" filter="url(#lift)"/>
  <polygon points="6,34 52.04,4 98.08,34" fill="#a97d50"/>
  <polyline points="6,199.1 52.04,128 98.08,199.1" fill="none" stroke="#9c7247" stroke-width="0.5"/>
  ${card('thank-you-front', 110, 30, 82.55, 127)}
  ${card('prayer-card', 204, 18, 47.625, 152.4)}
  ${card('thank-you-back', 264, 30, 82.55, 127)}
  ${card('seed-swatch', 267.2, 178, 76.2, 25.4, '#efe8d8').replace('<svg ', flecks(267.2, 178, 76.2, 25.4) + '<svg ')}
</g>
<text x="110" y="1050" font-family="Gores Sans" font-size="16" fill="#6c7585">${B.foot}</text>
</svg>`;

const logo = logoSrc.replace('<svg ', '<svg width="600" height="600" ').replace(/<circle class="sl-halo"/, '<rect width="600" height="600" fill="#07090d"/><circle class="sl-halo"');

const posterSvg = path.join(outDir, B.prefix + '-poster.svg');
const logoSvg = path.join(outDir, 'seed-logo-32k.svg');
fs.writeFileSync(posterSvg, poster, 'utf8');
fs.writeFileSync(logoSvg, logo, 'utf8');

const fontArgs = ['--skip-system-fonts', '--use-font-file', font, '--font-family', 'Gores Sans'];
function render(svg, png, width) {
  const t = Date.now();
  execFileSync(resvg, [...fontArgs, '--width', String(width), svg, png], { stdio: 'inherit' });
  console.log(`${path.basename(png)}: ${width} px wide, ${(fs.statSync(png).size / 1048576).toFixed(1)} MB, ${((Date.now() - t) / 1000).toFixed(1)} s`);
}
render(posterSvg, path.join(outDir, B.prefix + '-poster-preview.png'), 1920);
// the preview as a data URI, for the board page (builder include "posterPreview")
fs.writeFileSync(path.join(outDir, B.prefix + '-poster-preview.datauri.txt'),
  'data:image/png;base64,' + fs.readFileSync(path.join(outDir, B.prefix + '-poster-preview.png')).toString('base64'), 'utf8');
if (B.logo) render(logoSvg, path.join(outDir, 'seed-logo-32k-preview.png'), 1080);
if (process.argv[2] !== 'preview') {
  render(posterSvg, path.join(outDir, B.prefix + '-poster.png'), FULL_W);
  if (B.logo) render(logoSvg, path.join(outDir, 'seed-logo-32k.png'), FULL_H);
}
