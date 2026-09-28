// Targeted, throwaway verification for the playtest-fix items (rope mount-on-top, dash clamp,
// projectile pierce count). Not part of the shipped test suite — deleted after use.
import { chromium } from 'playwright';
import { spawn, execSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const OUTDIR = 'dist-verify';
const PORT = 5299;
execSync(`npx vite build --outDir ${OUTDIR}`, { stdio: 'inherit' });
const server = spawn('npx', ['vite', 'preview', '--outDir', OUTDIR, '--port', String(PORT), '--strictPort'], { stdio: 'ignore', detached: true });
const url = `http://localhost:${PORT}/`;
await new Promise((r) => setTimeout(r, 2000));

const exe = process.env.CHROMIUM_PATH || (existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);
const browser = await chromium.launch({ executablePath: exe, args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.addInitScript(() => localStorage.setItem('driftwake:gfx', JSON.stringify('medium')));

await page.goto(url);
await page.waitForTimeout(2000);
await page.click('text=Play');
await page.click('text=Create New');
await page.click('text=Windrunner');
await page.click('input');
await page.keyboard.type('VerifyRun');
await page.click('button:text-is("Create")');
await page.waitForFunction(() => window.__session?.state?.mapId === 'driftmoor_town', null, { timeout: 20000 });
await page.waitForTimeout(2000);
await page.evaluate(() => window.__dw.godmode(true));

const results = {};

// ---- (a) rope mount-at-top ------------------------------------------------
// mossback_hills: rope(300, 430, 500) with plat(250,430,180) directly overhead (x 250..430, y 430).
await page.evaluate(() => window.__dw.forceMap('mossback_hills'));
await page.waitForFunction(() => window.__game.scene.getScene('World')?.map?.id === 'mossback_hills', null, { timeout: 20000 });
await page.waitForTimeout(1000);
await page.evaluate(() => {
  const w = window.__game.scene.getScene('World');
  const p = w.player;
  p.sprite.body.reset(300, 500);
  p.sprite.body.setVelocity(0, 0);
  p.sprite.body.setAllowGravity(true);
});
await page.keyboard.down('ArrowUp');
const climbSamples = [];
for (let i = 0; i < 40; i++) {
  await page.waitForTimeout(50);
  const s = await page.evaluate(() => {
    const w = window.__game.scene.getScene('World');
    const p = w.player;
    return { t: i, climbing: p.climbing, y: Math.round(p.y * 10) / 10, vy: Math.round(p.vy), grounded: p.grounded };
  }, {});
  climbSamples.push(s);
}
await page.keyboard.up('ArrowUp');
await page.waitForTimeout(400);
const finalClimb = await page.evaluate(() => {
  const w = window.__game.scene.getScene('World');
  const p = w.player;
  return { climbing: p.climbing, y: Math.round(p.y * 10) / 10, grounded: p.grounded };
});
results.ropeMount = { samples: climbSamples, final: finalClimb };

// ---- (b) dash end clamp ----------------------------------------------------
await page.evaluate(() => {
  const w = window.__game.scene.getScene('World');
  const p = w.player;
  p.sprite.body.reset(600, 500);
  p.sprite.body.setVelocity(0, 0);
  p.sprite.body.setAllowGravity(true);
  p.facing = 1;
});
await page.waitForTimeout(300);
// dash with no direction held afterward
const t0 = Date.now();
await page.keyboard.down('ShiftLeft');
await page.waitForTimeout(20);
await page.keyboard.up('ShiftLeft');
const dashSamplesNoDir = [];
for (let i = 0; i < 30; i++) {
  await page.waitForTimeout(20);
  const s = await page.evaluate(() => { const w = window.__game.scene.getScene('World'); const p = w.player; return { vx: Math.round(p.vx), t: Date.now() }; });
  dashSamplesNoDir.push({ ...s, dt: s.t - t0 });
}
results.dashNoDirection = dashSamplesNoDir;

// dash while continuing to hold the direction key
await page.evaluate(() => {
  const w = window.__game.scene.getScene('World');
  const p = w.player;
  p.sprite.body.reset(600, 500);
  p.sprite.body.setVelocity(0, 0);
  p.facing = 1;
});
await page.waitForTimeout(300);
await page.keyboard.down('ArrowRight');
await page.waitForTimeout(50);
await page.keyboard.down('ShiftLeft');
await page.waitForTimeout(20);
await page.keyboard.up('ShiftLeft');
const dashSamplesHeld = [];
for (let i = 0; i < 30; i++) {
  await page.waitForTimeout(20);
  const s = await page.evaluate(() => { const w = window.__game.scene.getScene('World'); const p = w.player; return { vx: Math.round(p.vx) }; });
  dashSamplesHeld.push(s);
}
await page.keyboard.up('ArrowRight');
results.dashHeldDirection = dashSamplesHeld;
results.playerBaseSpeedMax = await page.evaluate(() => {
  const s = window.__session.stats;
  return 110 * (1 + s.speed / 100);
});

// ---- (c) projectile pierce count -------------------------------------------
await page.evaluate(() => window.__dw.forceMap('mossback_meadows'));
await page.waitForFunction(() => window.__game.scene.getScene('World')?.map?.id === 'mossback_meadows', null, { timeout: 20000 });
await page.waitForTimeout(1000);
await page.evaluate(async () => {
  await window.__dw.prepJob('windrunner');
});
await page.evaluate(() => {
  const w = window.__game.scene.getScene('World');
  const p = w.player;
  p.sprite.body.reset(400, p.y);
  p.facing = 1;
  p.sprite.setFlipX(false);
});
await page.waitForTimeout(200);
await page.evaluate(() => {
  window.__dw.dummy(80);
  window.__dw.dummy(140);
  window.__dw.dummy(200);
});
await page.waitForTimeout(300);
const before = await page.evaluate(() => {
  const w = window.__game.scene.getScene('World');
  return w.spawner.monsters.filter((m) => m.def.id === 'dev_dummy').map((m) => ({ x: Math.round(m.sprite.x), hp: m.hp }));
});
await page.keyboard.down('KeyQ');
await page.waitForTimeout(60);
await page.keyboard.up('KeyQ');
await page.waitForTimeout(800);
const after = await page.evaluate(() => {
  const w = window.__game.scene.getScene('World');
  return w.spawner.monsters.filter((m) => m.def.id === 'dev_dummy').map((m) => ({ x: Math.round(m.sprite.x), hp: m.hp }));
});
results.pierceTest = { before, after };

console.log('ERRORS:', errors);
console.log(JSON.stringify(results, null, 2));

await page.close();
await browser.close();
try { process.kill(-server.pid); } catch { server.kill(); }
