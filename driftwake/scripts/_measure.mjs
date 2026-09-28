import { chromium } from 'playwright';
const exe = '/opt/pw-browsers/chromium';
const browser = await chromium.launch({ executablePath: exe, args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
for (const vp of [{ width: 1280, height: 720 }, { width: 1920, height: 1080 }]) {
  const page = await browser.newPage({ viewport: vp });
  await page.goto('http://localhost:5301/');
  await page.waitForTimeout(2500);
  await page.click('text=Play');
  await page.waitForTimeout(500);
  await page.click('text=Create New');
  await page.waitForTimeout(500);
  await page.click('text=Vanguard');
  await page.waitForTimeout(200);
  await page.click('input');
  await page.keyboard.type('Measure');
  await page.click('button:text-is("Create")');
  await page.waitForTimeout(4000);
  const r = await page.evaluate(() => {
    const sel = (s) => document.querySelector(s)?.getBoundingClientRect();
    return {
      hudBottom: sel('.dw-hud-bottom'),
      medallion: sel('.dw-medallion'),
      bars: sel('.dw-bars'),
      hotbar: sel('.dw-hotbar'),
      chat: sel('.dw-chat'),
      feed: sel('.dw-feed'),
      buffs: sel('.dw-buffs'),
    };
  });
  console.log(`--- ${vp.width}x${vp.height} ---`);
  console.log(JSON.stringify(r, null, 1));
  await page.close();
}
await browser.close();
