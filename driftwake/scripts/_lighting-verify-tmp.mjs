// Lighting verification: for each theme map x quality tier, create a light-haired character,
// summon the pale-shelled snail pet, screenshot, and measure the fraction of near-fully-saturated
// pixels in a box around the player. Usage:
//   node lighting-verify.mjs <baseUrl> <outDir> <label> [qualityList csv] [mapList csv]
import { chromium } from 'playwright';
import { existsSync, mkdirSync } from 'node:fs';
import { writeFileSync } from 'node:fs';

const url = process.argv[2];
const outDir = process.argv[3];
const label = process.argv[4] || 'run';
const qualities = (process.argv[5] || 'high,medium').split(',');
const maps = (process.argv[6] || 'driftmoor_town,mossback_meadows,glowtide_shallows,barnacle_grotto,heart_chamber').split(',');

mkdirSync(outDir, { recursive: true });

const exe = process.env.CHROMIUM_PATH || (existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);
const browser = await chromium.launch({ executablePath: exe, args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });

const results = [];

for (const quality of qualities) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on('pageerror', (e) => console.error(`[pageerror:${quality}]`, e.message));
  await page.addInitScript((q) => localStorage.setItem('driftwake:gfx', JSON.stringify(q)), quality);
  await page.goto(url);
  await page.waitForTimeout(2500);
  await page.click('text=Play');
  await page.click('text=Create New');
  await page.click('text=Vanguard');
  await page.click('input');
  await page.keyboard.type(`Verify${quality.slice(0, 4)}`);
  await page.click('button:text-is("Create")');
  await page.waitForFunction(() => window.__session?.state?.mapId === 'driftmoor_town', null, { timeout: 20000 });
  await page.waitForTimeout(1500);

  // Pale hair + give/summon the pale-shelled snail pet via devMutate (server-authoritative in
  // WsBackend, but LocalBackend used for this preview build supports direct dev mutation).
  await page.evaluate(() => {
    const backend = window.__session.backend;
    const mutated = backend.devMutate((s) => {
      s.appearance.hair = '#f5f0e0';
      const useTab = s.inventory.use;
      const slot = useTab.findIndex((x) => x === null);
      if (slot >= 0) useTab[slot] = { uid: 'qa_pet_shellsnail', itemId: 'pet_shellsnail', qty: 1 };
    });
    if (mutated) window.__session.applyState(mutated);
  });
  await page.evaluate(() => window.__session.dispatch({ type: 'summonPet', itemId: 'pet_shellsnail' }));
  await page.waitForTimeout(500);

  for (const mapId of maps) {
    await page.evaluate((m) => window.__dw.forceMap(m), mapId);
    await page.waitForFunction((m) => window.__game.scene.getScene('World')?.map?.id === m, mapId, { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(1800);

    const shotPath = `${outDir}/${label}_${mapId}_${quality}.png`;
    await page.screenshot({ path: shotPath });

    // Player screen-space box via the camera's worldView (robust to zoom/scroll).
    const geo = await page.evaluate(() => {
      const w = window.__game.scene.getScene('World');
      const cam = w.cameras.main;
      const wv = cam.worldView;
      const p = w.player;
      const canvas = window.__game.canvas;
      const rect = canvas.getBoundingClientRect();
      const sx = rect.left + ((p.sprite.x - wv.x) / wv.width) * rect.width;
      const sy = rect.top + ((p.sprite.y - wv.y) / wv.height) * rect.height;
      return { sx, sy, cw: rect.width, ch: rect.height };
    });
    const boxW = 160, boxH = 190;
    const clip = {
      x: Math.max(0, Math.min(geo.cw - boxW, geo.sx - boxW / 2)),
      y: Math.max(0, Math.min(geo.ch - boxH, geo.sy - boxH * 0.85)),
      width: boxW, height: boxH,
    };
    const boxBuf = await page.screenshot({ clip });
    const b64 = boxBuf.toString('base64');
    const stats = await page.evaluate(async (b64) => {
      const img = new Image();
      img.src = `data:image/png;base64,${b64}`;
      await img.decode();
      const c = document.createElement('canvas');
      c.width = img.width; c.height = img.height;
      const cx = c.getContext('2d');
      cx.drawImage(img, 0, 0);
      const d = cx.getImageData(0, 0, c.width, c.height).data;
      let sat = 0; const total = c.width * c.height;
      for (let i = 0; i < d.length; i += 4) {
        if (d[i] >= 250 && d[i + 1] >= 250 && d[i + 2] >= 250) sat++;
      }
      return { sat, total, frac: total ? sat / total : 0 };
    }, b64);
    writeFileSync(`${outDir}/${label}_${mapId}_${quality}_box.png`, boxBuf);
    results.push({ label, quality, mapId, ...stats });
    console.log(`${label} ${mapId} ${quality}: sat=${stats.sat}/${stats.total} frac=${stats.frac.toFixed(4)}`);
  }
  await page.close();
}

await browser.close();
writeFileSync(`${outDir}/${label}_results.json`, JSON.stringify(results, null, 2));
console.log('DONE', label);
