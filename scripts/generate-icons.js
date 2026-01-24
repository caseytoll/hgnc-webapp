import { createCanvas } from 'canvas';
import { writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const iconsDir = join(__dirname, '../public/icons');

// Ensure icons directory exists
mkdirSync(iconsDir, { recursive: true });

function generateIcon(size, filename) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Create gradient background
  const gradient = ctx.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, '#a855f7');
  gradient.addColorStop(1, '#7c3aed');

  // Draw rounded rectangle
  const radius = size * 0.188; // ~96/512 ratio for rounded corners
  ctx.beginPath();
  ctx.roundRect(0, 0, size, size, radius);
  ctx.fillStyle = gradient;
  ctx.fill();

  // Draw "TM" text
  ctx.fillStyle = 'white';
  ctx.font = `800 ${size * 0.43}px system-ui, -apple-system, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('TM', size / 2, size / 2 + size * 0.02);

  // Save PNG
  const buffer = canvas.toBuffer('image/png');
  writeFileSync(join(iconsDir, filename), buffer);
  console.log(`Generated ${filename} (${size}x${size})`);
}

// Generate icons
generateIcon(180, 'apple-touch-icon.png');
generateIcon(192, 'icon-192.png');
generateIcon(512, 'icon-512.png');

console.log('All icons generated!');
