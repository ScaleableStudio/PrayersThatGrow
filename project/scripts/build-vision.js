// Builds the bus1idea vision boards with the shared builder in Workshop\VisionBoard.
// Usage:  node scripts\build-vision.js          builds vBoard-4k and vBoard-32k
//         node scripts\build-vision.js 32k      builds one version (4k or 32k)
// Settings per version: Workshop\VisionBoard\config\bus1idea-<version>.json
// vBoard-1k (the first, flat board) is kept as it was and is not rebuilt.
'use strict';
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.resolve(__dirname, '..', '..', '..');
const builder = path.join(root, 'Workshop', 'VisionBoard', 'build-board.js');
const wanted = process.argv[2] ? [process.argv[2]] : ['4k', '32k'];
for (const v of wanted) {
  const config = path.join(root, 'Workshop', 'VisionBoard', 'config', `bus1idea-${v}.json`);
  execFileSync(process.execPath, [builder, config], { stdio: 'inherit' });
}
