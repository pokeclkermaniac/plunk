// Renders public/icons/icon.svg to the PNG sizes the PWA manifest needs (uses the preinstalled Playwright).
import { createRequire } from 'module';
import { readFileSync } from 'fs';
const { chromium } = createRequire(import.meta.url)('playwright');
const svg = readFileSync(new URL('../public/icons/icon.svg', import.meta.url), 'utf8');
const browser = await chromium.launch();
const page = await browser.newPage();
const sizes = [
  ['icon-192.png', 192, 0],
  ['icon-512.png', 512, 0],
  ['apple-touch-icon.png', 180, 0],
  ['icon-512-maskable.png', 512, 0.12],
];
for (const [name, size, pad] of sizes) {
  await page.setViewportSize({ width: size, height: size });
  const inner = Math.round(size * (1 - pad * 2));
  await page.setContent(
    `<html><body style="margin:0;background:${pad ? '#a62b23' : 'transparent'};display:flex;align-items:center;justify-content:center;width:${size}px;height:${size}px">${svg.replace('<svg ', `<svg width="${inner}" height="${inner}" `)}</body></html>`,
  );
  await page.screenshot({
    path: new URL(`../public/icons/${name}`, import.meta.url).pathname,
    omitBackground: !pad,
  });
}
await browser.close();
console.log('icons written');
