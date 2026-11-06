// Dev helper: measures how high one tap / several taps lift a piece, and how fast it sinks.
import { createRequire } from 'module';
const { chromium } = createRequire(import.meta.url)('playwright');
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 450, height: 800 } });
await page.goto('http://localhost:5173/?debug');
await page.waitForTimeout(1200);
for (const type of ['ringToss', 'basketball']) {
  await page.evaluate(async (type) => {
    const m = await import('/src/modes/TimedMode.ts');
    const g = window.__game;
    g.scene.stop('Hud');
    const cfg = { ...m.timedConfig(type, 999), startPieces: 1, replaceOnLand: false, targets: [] };
    g.scene.start('Game', { config: cfg });
  }, type);
  await page.waitForTimeout(2500);
  for (const taps of [1, 2, 4, 8]) {
    const r = await page.evaluate(async (taps) => {
      const gs = window.__plunk;
      const p = gs.pieces[0];
      const M = (await import('/src/game/Matter.ts')).M;
      M.Body.setPosition(p.body, { x: gs.jets[0].x, y: 850 });
      M.Body.setVelocity(p.body, { x: 0, y: 0 });
      M.Body.setAngle(p.body, 0);
      await new Promise((r) => setTimeout(r, 600));
      const y0 = p.body.position.y;
      let minY = y0,
        xAtMin = 0;
      const t0 = performance.now();
      let n = 0;
      let tPeak = 0;
      while (performance.now() - t0 < 9000) {
        if (n < taps && performance.now() - t0 > n * 220) {
          gs.pressJet(0);
          n++;
        }
        if (p.body.position.y < minY) {
          minY = p.body.position.y;
          xAtMin = p.body.position.x;
          tPeak = performance.now() - t0;
        }
        await new Promise((r) => requestAnimationFrame(r));
        if (performance.now() - t0 > tPeak + 400 && p.body.position.y > 840 && n >= taps) break;
      }
      return {
        taps,
        rise: Math.round(y0 - minY),
        peakX: Math.round(xAtMin),
        tPeak: Math.round(tPeak),
        backDown: Math.round(performance.now() - t0),
      };
    }, taps);
    console.log(type, JSON.stringify(r));
  }
}
await browser.close();
