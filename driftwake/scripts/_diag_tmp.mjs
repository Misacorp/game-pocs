import { chromium } from 'playwright';
const exe = '/opt/pw-browsers/chromium';
const browser = await chromium.launch({ executablePath: exe, args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('console', (m) => console.log(`[${m.type()}] ${m.text()}`));
page.on('pageerror', (e) => console.log(`[pageerror] ${e.message}`));
await page.goto('http://localhost:5213/');
await page.waitForTimeout(2000);
await page.evaluate(() => localStorage.setItem('driftwake:gfx', 'low'));
await page.click('text=Play');
await page.waitForTimeout(500);
await page.click('text=Create New');
await page.waitForTimeout(400);
await page.click('text=Vanguard');
await page.waitForTimeout(200);
await page.click('input');
await page.keyboard.type('DiagRaw1');
await page.click('button:text-is("Create")');
await page.waitForTimeout(3000);
await page.evaluate(() => window.__dw.dummy(20));
await page.waitForTimeout(300);
const descInfo = await page.evaluate(() => {
  const w = window.__game.scene.getScene('World');
  return { jobId: w.player ? window.__session.state.jobId : null, facing: w.player.facing, px: w.player.x, py: w.player.y };
});
console.log('DESC', JSON.stringify(descInfo));

await page.keyboard.down('KeyX');
await page.waitForTimeout(120);
const mid = await page.evaluate(() => {
  const w = window.__game.scene.getScene('World');
  return { attackDown: w.input2.isDown('attack'), dead: w.player.dead, casting: w.player.isCasting() };
});
console.log('MID', JSON.stringify(mid));
await page.waitForTimeout(400);
const mid2 = await page.evaluate(() => {
  const w = window.__game.scene.getScene('World');
  const m = w.spawner.monsters[0];
  return { hp: m?.hp, attackDown: w.input2.isDown('attack') };
});
console.log('MID2', JSON.stringify(mid2));
await page.keyboard.up('KeyX');
await page.waitForTimeout(200);
const fin = await page.evaluate(() => {
  const m = window.__game.scene.getScene('World').spawner.monsters[0];
  return { hp: m?.hp };
});
console.log('FINAL', JSON.stringify(fin));
await browser.close();
