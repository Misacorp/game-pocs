// Usage: node scripts/screenshot.mjs <url> <out.png> [waitMs] [actionsJson]
// actionsJson: [{"key":"ArrowRight","holdMs":500},{"click":[x,y]},{"wait":500},{"eval":"js"}]
import { chromium } from 'playwright';
const [url, out, waitMs = '2500', actions = '[]'] = process.argv.slice(2);
const exe = process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium';
const browser = await chromium.launch({ executablePath: exe, args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] }).catch(async () => chromium.launch());
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const logs = [];
page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`));
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}\n${e.stack}`));
await page.goto(url);
await page.waitForTimeout(Number(waitMs));
for (const a of JSON.parse(actions)) {
  if (a.key) { await page.keyboard.down(a.key); await page.waitForTimeout(a.holdMs ?? 80); await page.keyboard.up(a.key); }
  if (a.press) await page.keyboard.press(a.press);
  if (a.click) await page.mouse.click(a.click[0], a.click[1]);
  if (a.clickSel) await page.click(a.clickSel);
  if (a.type) await page.keyboard.type(a.type);
  if (a.wait) await page.waitForTimeout(a.wait);
  if (a.eval) { const r = await page.evaluate(a.eval); if (r !== undefined) logs.push(`[eval] ${JSON.stringify(r)}`); }
  if (a.shot) await page.screenshot({ path: a.shot });
}
await page.screenshot({ path: out });
console.log(logs.join('\n'));
await browser.close();
