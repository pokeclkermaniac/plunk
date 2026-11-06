// Dev helper: drives real game mechanics in a headless browser and checks the outcomes.
// Requires the dev server (npm run dev). Usage: node scripts/verify.mjs
import { createRequire } from 'module';
const { chromium } = createRequire(import.meta.url)('playwright');
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 405, height: 720 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e.stack).slice(0, 500)));
await page.goto('http://localhost:5173/?debug');
await page.waitForTimeout(1200);
let fails = 0;
const check = (name, ok, info = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name} ${info}`);
  if (!ok) fails++;
};
const startCfg = async (js) => {
  await page.evaluate(
    `(async()=>{ localStorage.clear(); const g=window.__game; g.scene.getScenes(true).forEach(s=>s.scene.key!=='Game'&&s.scene.stop()); const cfg = await (${js}); g.scene.start('Game',{config:cfg}); })()`,
  );
  await page.waitForTimeout(900);
};
// Helper in page: drop a piece right above a target
const helpers = `
  window.__drop = async (kind, color, targetIdx, dy = 120) => {
    const gs = window.__plunk; const M = (await import('/src/game/Matter.ts')).M;
    const t = gs.targets[targetIdx];
    const a = t.anchor();
    const p = gs.cfg.gameType === 'ringToss'
      ? new (await import('/src/game/Ring.ts')).Ring(gs, a.x, a.y - dy, { color, kind })
      : new (await import('/src/game/Ball.ts')).Ball(gs, a.x, a.y - dy, { color, kind });
    gs.pieces.push(p);
    M.Body.setVelocity(p.body, { x: 0, y: 2 });
    return p.id;
  };
  window.__wait = (ms) => new Promise(r => setTimeout(r, ms));
`;

// 1. Ring Toss: streak + full peg + bomb rescue
await startCfg(
  `import('/src/modes/TimedMode.ts').then(m => ({...m.timedConfig('ringToss', 90), startPieces: 0, replaceOnLand: false}))`,
);
await page.evaluate(helpers);
let r = await page.evaluate(async () => {
  const gs = window.__plunk;
  for (let i = 0; i < 4; i++) {
    await window.__drop('normal', 0, 0);
    await window.__wait(1300);
  }
  const afterFull = { score: gs.score, stack: gs.pegs[0].state.stack.length, full: gs.stats.fullPegs };
  for (const c of [0, 1, 2, 1]) {
    await window.__drop('normal', c, 2);
    await window.__wait(1300);
  }
  const dead = gs.pegs[2].state.stack.length;
  await window.__drop('bomb', 0, 2);
  await window.__wait(1600);
  return {
    afterFull,
    dead,
    afterBomb: gs.pegs[2].state.stack.length,
    wrong: gs.stats.wrong,
    score: gs.score,
  };
});
check(
  'rings land & streak to full peg (10+20+30+40+250)',
  r.afterFull.score === 350 && r.afterFull.full === 1,
  JSON.stringify(r.afterFull),
);
check('mixed peg clogs (4 rings)', r.dead === 4);
check('bomb ring clears a dead peg', r.afterBomb === 0, JSON.stringify(r));

// 2. Tank clear when all pegs full
r = await page.evaluate(async () => {
  const gs = window.__plunk;
  for (let i = 0; i < 4; i++) {
    await window.__drop('golden', 0, 1);
    await window.__wait(1200);
  }
  for (let i = 0; i < 4; i++) {
    await window.__drop('normal', 2, 2);
    await window.__wait(1200);
  }
  await window.__wait(1500);
  return { stacks: gs.pegs.map((p) => p.state.stack.length), score: gs.score };
});
check(
  'tank clear empties every peg when all are full',
  r.stacks.every((n) => n === 0),
  JSON.stringify(r),
);

// 3. Basketball: swish, full tube drain, ball return
await startCfg(
  `import('/src/modes/TimedMode.ts').then(m => ({...m.timedConfig('basketball', 90), startPieces: 0}))`,
);
await page.evaluate(helpers);
r = await page.evaluate(async () => {
  const gs = window.__plunk;
  const out = [];
  for (let i = 0; i < 4; i++) {
    await window.__drop('normal', 1, 0, 200);
    await window.__wait(1600);
    out.push(gs.score);
  }
  await window.__wait(1500);
  return {
    scores: out,
    baskets: gs.stats.baskets,
    swishes: gs.stats.swishes,
    fullTubes: gs.stats.fullTubes,
    tube: gs.hoops[0].state.stack.length,
    free: gs.pieces.length,
  };
});
check('balls dropped through a hoop count as baskets', r.baskets === 4, JSON.stringify(r));
check('swishes detected', r.swishes >= 1);
check('full single-colour tube pays bonus and drains', r.fullTubes === 1 && r.tube === 0);
check('drained balls return to the tank', r.free >= 3, `free=${r.free}`);
r = await page.evaluate(async () => {
  const gs = window.__plunk;
  const M = (await import('/src/game/Matter.ts')).M;
  const before = gs.stats.baskets;
  // push a ball UP through the hoop from below: must not count
  const h = gs.hoops[1];
  const B = (await import('/src/game/Ball.ts')).Ball;
  const b = new B(gs, h.rimCenterX, h.rimY + 90, { color: 0, kind: 'normal' });
  gs.pieces.push(b);
  for (let i = 0; i < 25; i++) {
    M.Body.setVelocity(b.body, { x: 0, y: -9 });
    await window.__wait(16);
  }
  await window.__wait(2500);
  return { before, after: gs.stats.baskets };
});
check(
  'ball pushed up through a hoop (and falling back) does not score',
  r.after === r.before,
  JSON.stringify(r),
);

// 4. Hot hands
r = await page.evaluate(async () => {
  const gs = window.__plunk;
  gs.timeLeftMs = 14000;
  await window.__wait(300);
  const s0 = gs.score;
  await window.__drop('normal', 4, 1, 200);
  await window.__wait(1700);
  return { hot: gs.hotHands, delta: gs.score - s0 };
});
check('Hot Hands turns on in the last 15s and doubles points', r.hot && r.delta >= 40, JSON.stringify(r));

// 5. Boosters
r = await page.evaluate(async () => {
  const { Save } = await import('/src/systems/SaveSystem.ts');
  const gs = window.__plunk;
  Save.data.boosters.extratime = 1;
  Save.data.boosters.slowmo = 1;
  const t0 = gs.timeLeftMs;
  gs.useBooster('extratime');
  gs.useBooster('slowmo');
  await window.__wait(200);
  return {
    added: Math.round((gs.timeLeftMs - t0) / 1000),
    left: Save.data.boosters.extratime,
    slow: gs.time.now < gs.slowmoUntil,
    used: gs.boostersUsed,
  };
});
check('extra time booster adds ~15s and is consumed', r.added >= 14 && r.left === 0, JSON.stringify(r));
check('slow-mo booster activates', r.slow && r.used);

// 6. Level 1: complete the goal → results + stars saved
await startCfg(`import('/src/modes/LevelMode.ts').then(m => m.levelConfig(m.LEVELS.ringToss[0], 0))`);
await page.evaluate(helpers);
r = await page.evaluate(async () => {
  const gs = window.__plunk;
  for (let i = 0; i < 6 && !gs.ended; i++) {
    await window.__drop('normal', 0, i < 4 ? 0 : 1);
    await window.__wait(1300);
  }
  await window.__wait(2500);
  const { Save } = await import('/src/systems/SaveSystem.ts');
  const active = window.__game.scene.getScenes(true).map((s) => s.scene.key);
  return {
    ended: gs.ended,
    active,
    lvl: Save.data.bests.levels['ringtoss-01'],
    xp: Save.data.xp,
    level: Save.data.level,
  };
});
check(
  'level goal completes and opens results',
  r.ended && r.active.includes('Results'),
  JSON.stringify(r.active),
);
check('level stars + best saved', r.lvl && r.lvl.stars >= 1 && r.lvl.best > 0, JSON.stringify(r));
await page
  .screenshot({ path: process.env.SHOT_DIR ? `${process.env.SHOT_DIR}/results_level.png` : '/dev/null' })
  .catch(() => {});

// 7. Clean Sweep: one wrong colour fails the level
await startCfg(`import('/src/modes/LevelMode.ts').then(m => m.levelConfig(m.LEVELS.ringToss[5], 5))`);
await page.evaluate(helpers);
r = await page.evaluate(async () => {
  const gs = window.__plunk;
  await window.__drop('normal', 0, 0);
  await window.__wait(1300);
  await window.__drop('normal', 1, 0);
  await window.__wait(2500);
  return { ended: gs.ended, wrong: gs.stats.wrong };
});
check('no-wrong level fails on a wrong colour', r.ended && r.wrong === 1, JSON.stringify(r));

// 8. Endless refill + ramp
await startCfg(`import('/src/modes/EndlessMode.ts').then(m => m.endlessConfig())`);
await page.evaluate(helpers);
r = await page.evaluate(async () => {
  const gs = window.__plunk;
  const s0 = gs.supply;
  for (let i = 0; i < 4; i++) {
    await window.__drop('normal', 1, 0);
    await window.__wait(1300);
  }
  return { s0, s1: gs.supply, landed: gs.stats.landed, full: gs.stats.fullPegs, colors: gs.colors, score: gs.score };
});
check(
  'endless: full peg refills the supply (+5 each, minus one per landing)',
  r.full >= 1 && r.s1 === r.s0 - r.landed + 5 * r.full,
  JSON.stringify(r),
);
check('endless: 4th colour appears past 600 points', r.score < 600 || r.colors >= 4, JSON.stringify(r));

// 9. Versus: points go to the peg owner
await startCfg(
  `import('/src/modes/VersusMode.ts').then(m => ({...m.versusConfig('ringToss'), startPieces: 0, replaceOnLand: false}))`,
);
await page.evaluate(helpers);
r = await page.evaluate(async () => {
  const gs = window.__plunk;
  await window.__drop('normal', 0, 3);
  await window.__wait(1400);
  return gs.scores;
});
check('versus: a ring on P2’s peg scores for P2', r[0] === 0 && r[1] === 10, JSON.stringify(r));

console.log(errors.length ? 'PAGE ERRORS:\n' + errors.join('\n') : 'no page errors');
console.log(fails ? `${fails} FAILED` : 'ALL PASSED');
await browser.close();
process.exit(fails ? 1 : 0);
