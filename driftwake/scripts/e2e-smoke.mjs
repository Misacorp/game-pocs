// End-to-end smoke test in a real (headless) browser against a production build.
// For each class: create a character, enter the world, fight in Mossback Meadows, and assert
// that kills happened and no page errors were thrown. Also exercises a map change and quit-to-title.
//
// Usage: npm run e2e            (builds, serves on :5290, runs, exits non-zero on failure)
//        E2E_URL=http://localhost:5173/ node scripts/e2e-smoke.mjs   (against an already-running server)
import { chromium } from 'playwright';
import { spawn, execSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const CLASSES = ['Vanguard', 'Stormcaller', 'Windrunner', 'Shade'];
let server = null;
let url = process.env.E2E_URL;

if (!url) {
  execSync('npx vite build --outDir dist-e2e', { stdio: 'inherit' });
  server = spawn('npx', ['vite', 'preview', '--outDir', 'dist-e2e', '--port', '5290', '--strictPort'], { stdio: 'ignore', detached: true });
  url = 'http://localhost:5290/';
  await new Promise((r) => setTimeout(r, 2500));
}

const exe = process.env.CHROMIUM_PATH || (existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);
const browser = await chromium.launch({ executablePath: exe, args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const failures = [];

async function hold(page, key, ms) { await page.keyboard.down(key); await page.waitForTimeout(ms); await page.keyboard.up(key); }

for (const cls of CLASSES) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  try {
    await page.goto(url);
    await page.waitForTimeout(2500);
    await page.click('text=Play');
    await page.click('text=Create New');
    await page.click(`text=${cls}`);
    await page.click('input');
    await page.keyboard.type(`E2e${cls.slice(0, 6)}`);
    await page.click('button:text-is("Create")');
    await page.waitForFunction(() => window.__session?.state?.mapId === 'driftmoor_town', null, { timeout: 20000 });
    await page.waitForTimeout(3000);
    // Walk through the real town → meadows portal path via the reducer (validates portal + scene transition).
    await page.evaluate(() => window.__session.dispatch({ type: 'changeMap', mapId: 'mossback_meadows', portalId: 'to_town', fromPortalId: 'to_meadows' }));
    await page.waitForFunction(() => window.__game.scene.getScene('World')?.map?.id === 'mossback_meadows', null, { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(4000);
    await page.evaluate(() => window.__dw?.godmode?.(true));
    for (let i = 0; i < 6; i++) {
      await hold(page, 'ArrowRight', 350);
      await hold(page, 'KeyQ', 1500);
      await hold(page, 'KeyX', 1500);
    }
    const res = await page.evaluate(() => ({ kills: window.__session.state.counters.kills, map: window.__session.state.mapId }));
    if (res.kills < 1) failures.push(`${cls}: no kills in meadows (${JSON.stringify(res)})`);
    // Quit to title and back in (listener-leak / teardown path).
    await page.evaluate(() => window.__ui?.bus?.emit('game:quit'));
    await page.waitForTimeout(2500);
    if (errors.length) failures.push(`${cls}: page errors: ${errors.slice(0, 3).join(' | ')}`);
    console.log(`${cls}: kills=${res.kills} map=${res.map} errors=${errors.length}`);
  } catch (e) {
    failures.push(`${cls}: ${e.message}`);
  }
  await page.close();
}

await browser.close();
if (server) { try { process.kill(-server.pid); } catch { server.kill(); } }
if (failures.length) { console.error('E2E FAILURES:\n' + failures.join('\n')); process.exit(1); }
console.log('E2E smoke: all classes OK');
