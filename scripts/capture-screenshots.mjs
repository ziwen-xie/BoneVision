/**
 * Captures real product screenshots of the deployed viewer for the landing page.
 *
 * Uses headless Chromium with SwiftShader so the WebGL 3D panel actually renders;
 * a stub or a mockup would misrepresent the product on its own marketing page.
 * Hovers a bone so the captures show synchronized highlighting rather than an idle view.
 *
 * Run: node scripts/capture-screenshots.mjs [baseUrl]
 */
import { chromium } from '@playwright/test';
import { readFileSync, mkdirSync } from 'node:fs';

const BASE = process.argv[2] ?? 'https://ziwen-xie.github.io/BoneVision';
const OUT = 'public/landing';
const BONE = 'metatarsal-1';

mkdirSync(OUT, { recursive: true });

const cfg = JSON.parse(readFileSync('public/config/foot-mapping.json', 'utf8'));
const bone = cfg.bones.find((b) => b.id === BONE);
const cs = bone.xrayRegion.coordinates;
const cx = cs.reduce((a, [x]) => a + x, 0) / cs.length / cfg.xrayDimensions.width;
const cy = cs.reduce((a, [, y]) => a + y, 0) / cs.length / cfg.xrayDimensions.height;
console.log(`hover target: ${bone.name}  frac(${cx.toFixed(3)}, ${cy.toFixed(3)})`);

const browser = await chromium.launch({
  args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--hide-scrollbars'],
});
const page = await browser.newPage({
  viewport: { width: 1680, height: 1000 },
  deviceScaleFactor: 2,
});
page.on('console', (m) => m.type() === 'error' && console.log('  page error:', m.text()));

await page.goto(`${BASE}/#/viewer`, { waitUntil: 'networkidle' });
await page.waitForSelector('canvas[aria-label*="Interactive X-ray"]', { timeout: 60000 });
await page.waitForFunction(() => {
  const c = document.querySelectorAll('canvas');
  return c.length >= 2 && [...c].every((x) => x.width > 0);
}, { timeout: 60000 });
await page.waitForTimeout(6000); // let the 3D scene settle and auto-frame

const overlay = await page.locator('canvas[aria-label*="Interactive X-ray"]').boundingBox();
await page.mouse.move(overlay.x + overlay.width * cx, overlay.y + overlay.height * cy, { steps: 12 });
await page.waitForTimeout(1800);

const panel = await page.locator('text=Metatarsal').first().count();
console.log(`educational panel showing bone: ${panel > 0 ? 'yes' : 'no'}`);

await page.screenshot({ path: `${OUT}/shot-split.png` });
console.log('captured split view');

await browser.close();
