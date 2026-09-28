import { chromium } from 'playwright';
const quality = process.argv[2] || 'high';
const exe = '/opt/pw-browsers/chromium';
const browser = await chromium.launch({ executablePath: exe, args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto('http://localhost:5213/');
await page.waitForTimeout(1500);
await page.evaluate((q) => localStorage.setItem('driftwake:gfx', q), quality);
await page.click('text=Play');
await page.waitForTimeout(500);
await page.click('text=Create New');
await page.waitForTimeout(400);
await page.click('text=Vanguard');
await page.waitForTimeout(200);
await page.click('input');
await page.keyboard.type(`Combat${quality}`);
await page.click('button:text-is("Create")');
await page.waitForFunction(() => window.__session?.state?.mapId === 'driftmoor_town', null, { timeout: 20000 });
await page.waitForTimeout(2000);
await page.evaluate(() => window.__session.dispatch({ type: 'changeMap', mapId: 'mossback_meadows', portalId: 'to_town', fromPortalId: 'to_meadows' }));
await page.waitForFunction(() => window.__game.scene.getScene('World')?.map?.id === 'mossback_meadows', null, { timeout: 20000 }).catch(() => {});
await page.waitForTimeout(3000);
async function hold(key, ms) { await page.keyboard.down(key); await page.waitForTimeout(ms); await page.keyboard.up(key); }
const frame0 = await page.evaluate(() => window.__game.loop.frame);
const t0 = Date.now();
for (let i = 0; i < 6; i++) {
  await hold('ArrowRight', 350);
  await hold('KeyQ', 1500);
  await hold('KeyX', 1500);
}
const elapsed = Date.now() - t0;
const res = await page.evaluate(() => ({
  kills: window.__session.state.counters.kills,
  map: window.__session.state.mapId,
  fps: window.__game.loop.actualFps,
  px: window.__game.scene.getScene('World')?.player?.x,
  frame: window.__game.loop.frame,
}));
const ticks = res.frame - frame0;
console.log(`QUALITY=${quality} elapsedMs=${elapsed} kills=${res.kills} map=${res.map} fps=${res.fps.toFixed(2)} px=${res.px} ticks=${ticks} ticksPerSec=${(ticks / (elapsed / 1000)).toFixed(2)} errors=${errors.length}`);
if (errors.length) console.log('ERRORS:', errors.slice(0, 5));
await browser.close();
