#!/usr/bin/env node
// Compare the latest runtime-check screenshots with a baseline folder using pixelmatch
const fs = require('fs');
const path = require('path');
const PNG = require('pngjs').PNG;
const pixelmatch = require('pixelmatch');

const baselineDir = path.join(__dirname, '..', 'tests', 'baseline-screenshots');
const newDir = path.join(__dirname, '..', 'tests', 'screenshots', 'runtime-check');
const outDir = path.join(__dirname, '..', 'runtime-check-diffs');
let issues = 0;

if (!fs.existsSync(baselineDir)) {
  console.log('No baseline screenshots found at', baselineDir);
  console.log('Place baseline screenshots in tests/baseline-screenshots with the same filenames as tests/screenshots/runtime-check');
  process.exit(0);
}

if (!fs.existsSync(newDir)) {
  console.error('No runtime-check screenshots found at', newDir);
  process.exit(1);
}
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const files = fs.readdirSync(baselineDir).filter(f => f.endsWith('.png'));
files.forEach(file => {
  const baselinePath = path.join(baselineDir, file);
  const newPath = path.join(newDir, file);
  if (!fs.existsSync(newPath)) {
    console.error('Missing new screenshot:', newPath);
    issues++;
    return;
  }
  const baselineImg = PNG.sync.read(fs.readFileSync(baselinePath));
  const newImg = PNG.sync.read(fs.readFileSync(newPath));
  const { width, height } = baselineImg;
  if (width !== newImg.width || height !== newImg.height) {
    console.error('Screenshot dimension mismatch for', file);
    issues++;
    return;
  }
  const diff = new PNG({ width, height });
  const diffPixels = pixelmatch(baselineImg.data, newImg.data, diff.data, width, height, { threshold: 0.12 });
  const diffFile = path.join(outDir, file.replace('.png', '.diff.png'));
  fs.writeFileSync(diffFile, PNG.sync.write(diff));
  const percent = (diffPixels / (width * height) * 100).toFixed(2);
  console.log(`${file}: ${diffPixels} pixels different (${percent}%)`);
  if (diffPixels > 0) {
    issues++;
  }
});

if (issues > 0) {
  console.error('Visual diffing detected differences. See runtime-check-diffs for output.');
  process.exit(1);
}

console.log('All baseline images match the runtime-check screenshots.');
process.exit(0);
