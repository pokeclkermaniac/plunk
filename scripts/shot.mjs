// Dev helper: screenshots + a jet-tapping bot. Usage: node scripts/shot.mjs <outdir> [portrait|landscape]
import { createRequire } from 'module';
const { chromium } = createRequire(import.meta.url)('playwright');
const out = process.argv[2] || 'shots';
const land = process.argv[3] === 'landscape';
const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: land ? { width: 1280, height: 720 } : { width: 450, height: 800 },
  deviceScaleFactor: 1,
});
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
await page.goto('http://localhost:5173/?debug');
await page.waitForTimeout(1500);
await page.screenshot({ path: `${out}/menu.png` });
const startGame = async (expr) => {
  await page.evaluate(expr);
  await page.waitForTimeout(800);
};
// Ring toss timed
await startGame(
  `(async()=>{const m=await import('/src/modes/TimedMode.ts'); const g=window.__game; g.scene.getScenes(true).forEach(s=>s.scene.key!=='Game'&&s.scene.stop()); g.scene.start('Game',{config:m.timedConfig('ringToss',90)});})()`,
);
await page.screenshot({ path: `${out}/ring_start.png` });
// bot: alternate taps
const res = await page.evaluate(async () => {
  const gs = window.__plunk;
  const t0 = performance.now();
  let taps = 0;
  while (performance.now() - t0 < 25000) {
    // aim: tap the jet nearest to the lowest ring
    const rings = gs.pieces.filter((p) => p.alive);
    let side = Math.random() < 0.5 ? 0 : 1;
    if (rings.length) {
      const r = rings[Math.floor(Math.random() * rings.length)];
      side = r.body.position.x < 300 ? 0 : 1;
    }
    gs.pressJet(side);
    taps++;
    await new Promise((r) => setTimeout(r, 180 + Math.random() * 250));
  }
  return {
    taps,
    score: gs.score,
    landed: gs.stats.landed,
    wrong: gs.stats.wrong,
    full: gs.stats.fullPegs,
    free: gs.pieces.length,
  };
});
console.log('ringtoss bot', JSON.stringify(res));
await page.screenshot({ path: `${out}/ring_mid.png` });
await startGame(
  `(async()=>{const m=await import('/src/modes/TimedMode.ts'); const g=window.__game; g.scene.stop('Hud'); g.scene.start('Game',{config:m.timedConfig('basketball',90)});})()`,
);
await page.screenshot({ path: `${out}/ball_start.png` });
const res2 = await page.evaluate(async () => {
  const gs = window.__plunk;
  const t0 = performance.now();
  let taps = 0;
  while (performance.now() - t0 < 25000) {
    gs.pressJet(Math.random() < 0.5 ? 0 : 1);
    taps++;
    await new Promise((r) => setTimeout(r, 150 + Math.random() * 200));
  }
  return {
    taps,
    score: gs.score,
    baskets: gs.stats.baskets,
    swishes: gs.stats.swishes,
    free: gs.pieces.length,
  };
});
console.log('basketball bot', JSON.stringify(res2));
await page.screenshot({ path: `${out}/ball_mid.png` });
console.log('errors', errors.slice(0, 10));
await browser.close();
