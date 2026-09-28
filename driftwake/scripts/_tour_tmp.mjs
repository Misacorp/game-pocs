import { chromium } from 'playwright';
const exe = '/opt/pw-browsers/chromium';
const browser = await chromium.launch({ executablePath: exe, args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error' && !/GPU stall|ReadPixels/.test(m.text())) console.log('[console.error]', m.text()); });
await page.goto('http://localhost:5213/');
await page.waitForTimeout(1500);
await page.click('text=Play');
await page.waitForTimeout(500);
await page.click('text=Create New');
await page.waitForTimeout(400);
await page.click('text=Vanguard');
await page.waitForTimeout(200);
await page.click('input');
await page.keyboard.type('TourQA');
await page.click('button:text-is("Create")');
await page.waitForFunction(() => window.__session?.state?.mapId === 'driftmoor_town', null, { timeout: 20000 });
await page.waitForTimeout(1500);

const maps = [
  ['driftmoor_town', undefined, undefined],
  ['mossback_meadows', undefined, undefined],
  ['barnacle_grotto', undefined, undefined],
  ['kelpwood_edge', undefined, undefined],
  ['gale_outpost', undefined, undefined],
  ['thunderhead_peaks', undefined, undefined],
  ['glowtide_shallows', undefined, undefined],
  ['sunken_galleon', undefined, undefined],
  ['hollow_mouth', undefined, undefined],
  ['heart_chamber', undefined, undefined],
  ['vesper_landing', undefined, undefined],
];

for (const [mapId, x, y] of maps) {
  await page.evaluate((m) => window.__dw.forceMap(m), mapId);
  await page.waitForTimeout(2200);
  await page.screenshot({ path: `/tmp/claude-0/render/theme_${mapId}.png` });
  console.log(`shot ${mapId}`);
}
console.log('ERRORS:', errors.length, errors.slice(0, 5));
await browser.close();
