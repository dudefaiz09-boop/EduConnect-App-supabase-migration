import sharp from 'sharp';
import { existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '..', 'public');
const iconsDir = join(publicDir, 'icons');

if (!existsSync(iconsDir)) {
  mkdirSync(iconsDir, { recursive: true });
}

const COLORS = {
  bg: '#0f172a',
  bar: '#38bdf8',
  line: '#f8fafc',
  circle: '#22c55e',
};

function createSvgIcon(size) {
  const padding = Math.round(size * 0.08);
  const innerSize = size - padding * 2;
  const barH = Math.round(innerSize * 0.14);
  const barY = padding + Math.round(innerSize * 0.12);
  const lineH = Math.round(innerSize * 0.08);
  const lineGap = Math.round(innerSize * 0.07);
  const lineStartY = barY + barH + Math.round(innerSize * 0.1);
  const circleR = Math.round(innerSize * 0.14);
  const cx = size - padding - circleR;
  const cy = size - padding - circleR;
  const r = Math.round(size * 0.1);

  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}">
    <rect width="${size}" height="${size}" rx="${r}" fill="${COLORS.bg}" />
    <rect x="${padding}" y="${barY}" width="${innerSize}" height="${barH}" rx="${Math.round(barH / 2)}" fill="${COLORS.bar}" />
    <rect x="${padding + Math.round(innerSize * 0.1)}" y="${lineStartY}" width="${Math.round(innerSize * 0.7)}" height="${lineH}" rx="${Math.round(lineH / 2)}" fill="${COLORS.line}" />
    <rect x="${padding + Math.round(innerSize * 0.1)}" y="${lineStartY + lineH + lineGap}" width="${Math.round(innerSize * 0.5)}" height="${lineH}" rx="${Math.round(lineH / 2)}" fill="${COLORS.line}" />
    <circle cx="${cx}" cy="${cy}" r="${circleR}" fill="${COLORS.circle}" />
  </svg>`);
}

async function generateIcon(size, filename, subdir = '') {
  const targetDir = subdir ? join(publicDir, subdir) : iconsDir;
  if (!existsSync(targetDir)) {
    mkdirSync(targetDir, { recursive: true });
  }
  const svg = createSvgIcon(size);
  const outputPath = join(targetDir, filename);
  await sharp(svg).resize(size, size).png().toFile(outputPath);
  console.log(`  ✓ ${outputPath}`);
}

async function main() {
  console.log('Generating PWA icons...');

  await generateIcon(192, 'icon-192x192.png');
  await generateIcon(512, 'icon-512x512.png');
  await generateIcon(180, 'apple-touch-icon.png', '.');
  await generateIcon(48, 'favicon.png', '.');

  console.log('Done.');
}

main().catch((err) => {
  console.error('Icon generation failed:', err);
  process.exit(1);
});
