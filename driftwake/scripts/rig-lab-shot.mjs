// Screenshots the dev rig lab. Usage:
//   node scripts/rig-lab-shot.mjs <out.png> [query]      e.g.  node scripts/rig-lab-shot.mjs /tmp/v.png "only=vanguard&zoom=2"
// Starts its own vite dev server on a free port and tears it down afterwards.
import { chromium } from 'playwright';
import { createServer } from 'vite';
const [out = 'rig-lab.png', query = ''] = process.argv.slice(2);
const server = await createServer({ server: { port: 0, host: '127.0.0.1' }, logLevel: 'error' });
await server.listen();
const port = server.httpServer.address().port;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: Number(process.env.LAB_W || 1600), height: 900 } });
const logs = [];
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') logs.push(`[${m.type()}] ${m.text()}`); });
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}\n${e.stack}`));
try {
  await page.goto(`http://127.0.0.1:${port}/rig-lab.html?${query}`);
  await page.waitForFunction(() => window.__labReady === true, null, { timeout: 60000 });
  await page.screenshot({ path: out, fullPage: true });
} catch (e) { logs.push(String(e)); }
console.log(logs.join('\n') || 'ok');
await browser.close();
await server.close();
