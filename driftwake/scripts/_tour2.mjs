import { chromium } from 'playwright';
const exe = '/opt/pw-browsers/chromium';
const browser = await chromium.launch({ executablePath: exe, args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.addInitScript(() => localStorage.setItem('driftwake:gfx', JSON.stringify('high')));
await page.goto('http://localhost:5214/');
await page.waitForTimeout(1500);
await page.click('text=Play');
await page.waitForTimeout(500);
await page.click('text=Create New');
await page.waitForTimeout(400);
await page.click('text=Vanguard');
await page.waitForTimeout(200);
await page.click('input');
await page.keyboard.type('Tour2');
await page.click('button:text-is("Create")');
await page.waitForFunction(() => window.__session?.state?.mapId === 'driftmoor_town', null, { timeout: 20000 });
await page.waitForTimeout(1500);
await page.click('text=GOT IT').catch(() => {});
await page.waitForTimeout(500);
await page.screenshot({ path: '/tmp/claude-0/render/after_town.png' });

const maps = ['mossback_meadows', 'barnacle_grotto', 'kelpwood_edge', 'gale_outpost', 'thunderhead_peaks', 'glowtide_shallows', 'sunken_galleon', 'hollow_mouth', 'heart_chamber'];
for (const mapId of maps) {
  await page.evaluate((m) => window.__dw.forceMap(m), mapId);
  await page.waitForTimeout(2200);
  await page.screenshot({ path: `/tmp/claude-0/render/after_${mapId}.png` });
  console.log(`shot ${mapId}`);
}
console.log('ERRORS:', errors.length, errors.slice(0, 5));
await browser.close();
