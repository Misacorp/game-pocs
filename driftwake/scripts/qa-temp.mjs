import { chromium } from 'playwright';

const URL = process.argv[2] || 'http://localhost:5202/';
const OUT = process.argv[3] || '/tmp/claude-0/ui/qa';
const exe = process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium';

const browser = await chromium.launch({ executablePath: exe, args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] }).catch(async () => chromium.launch());
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const logs = [];
page.on('console', (m) => { const t = m.text(); if (!/GPU stall|GL Driver|Phaser v/.test(t)) logs.push(`[${m.type()}] ${t}`); });
page.on('pageerror', (e) => logs.push(`[PAGEERROR] ${e.message}`));

const wait = (ms) => page.waitForTimeout(ms);
let shotN = 0;
async function shot(name) { shotN++; const p = `${OUT}-${String(shotN).padStart(2, '0')}-${name}.png`; await page.screenshot({ path: p }); return p; }

async function waitUntil(fn, arg, timeout = 8000, interval = 150) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const ok = await page.evaluate(fn, arg);
    if (ok) return true;
    await wait(interval);
  }
  return false;
}

async function clickOpt(text) {
  const ok = await waitUntil((t) => {
    const el = Array.from(document.querySelectorAll('.dw-dlg-opt')).find((o) => o.textContent?.includes(t));
    if (el) { el.click(); return true; }
    return false;
  }, text, 12000);
  if (!ok) throw new Error('dialogue option not found: ' + text);
}

async function clickDlgBtn(text) {
  const ok = await waitUntil((t) => {
    const el = Array.from(document.querySelectorAll('.dw-dlg-actions button')).find((b) => b.textContent?.trim() === t);
    if (el) { el.click(); return true; }
    return false;
  }, text, 12000);
  if (!ok) throw new Error('dialogue button not found: ' + text);
}

/** Paginate offer text (repeatedly click "Continue" the instant it's clickable) until Accept/Decline show. */
async function acceptOffer() {
  for (let i = 0; i < 50; i++) {
    const state = await page.evaluate(() => {
      if (Array.from(document.querySelectorAll('.dw-dlg-actions button')).some((b) => b.textContent?.trim() === 'Accept')) return 'accept';
      const cont = Array.from(document.querySelectorAll('.dw-dlg-opt')).find((o) => o.textContent?.includes('Continue'));
      if (cont) { cont.click(); return 'continued'; }
      return 'waiting';
    });
    if (state === 'accept') break;
    await wait(500);
  }
  await clickDlgBtn('Accept');
}

async function openDialogue(npcId) {
  await page.evaluate((id) => window.__ui.bus.emit('ui:dialogue', { npcId: id }), npcId);
  await waitUntil(() => document.querySelector('.dw-dialogue-window')?.style.display !== 'none', null, 3000);
}

async function toggle(panel) { await page.evaluate((p) => window.__ui.toggle(p), panel); }
async function dispatch(action) { return page.evaluate((a) => window.__session.dispatch(a), action); }
function getState() { return page.evaluate(() => window.__session.state); }
function getBackendState() { return page.evaluate(() => window.__session.backend.current); }
/** Mutate the AUTHORITATIVE backend copy (private-but-accessible at runtime) then resync the client. */
async function cheat(mutatorFnSrc) {
  await page.evaluate((src) => { const fn = new Function('cur', src); fn(window.__session.backend.current); }, mutatorFnSrc);
  await dispatch({ type: 'syncVitals', hp: 1, mp: 1, x: 0, y: 0 }); // harmless roundtrip that resyncs client state from backend
}
async function closeDialogue() { await page.keyboard.press('Escape'); await wait(200); }
async function clickAnyButton(text, timeout = 5000) {
  return waitUntil((t) => { const el = Array.from(document.querySelectorAll('button')).find((b) => b.textContent?.trim() === t); if (el) { el.click(); return true; } return false; }, text, timeout);
}

console.log('=== boot ===');
await page.goto(URL);
await wait(500);
await page.mouse.click(640, 426); // Play
await wait(300);
await page.mouse.click(640, 360); // Create New
await wait(300);
await page.click('input.dw-input');
await page.keyboard.type('QAHero');
await page.mouse.click(671, 617); // Create
await wait(1000);
console.log('hooks:', await page.evaluate(() => ({ ui: !!window.__ui, session: !!window.__session, dw: !!window.__dw })));
await shot('ingame');

// =========================================================================
console.log('=== PHASE A: quest loop ===');
try {
  await openDialogue('npc_pell');
  await clickOpt('Welcome to Driftmoor');
  await acceptOffer();
  await wait(400);
  console.log('after accept mq_01:', JSON.stringify((await getState()).quests['mq_01_welcome']));
  await closeDialogue();

  await openDialogue('npc_maren');
  await clickOpt('Welcome to Driftmoor'); // should be the ✔ ready row
  await waitUntil(() => !!Array.from(document.querySelectorAll('.dw-dlg-actions button')).find((b) => b.textContent?.trim() === 'Complete'), null, 8000);
  await shot('mq01-turnin-view');
  await clickDlgBtn('Complete');
  await wait(500);
  const afterMq01 = await getState();
  console.log('gold/xp/level after mq01 complete:', afterMq01.gold, afterMq01.xp, afterMq01.level, 'mq01 state:', afterMq01.quests['mq_01_welcome']?.state);

  await wait(300);
  await shot('maren-after-mq01');
  await clickOpt('Tremors');
  await acceptOffer();
  await wait(400);
  console.log('after accept mq_02:', JSON.stringify((await getState()).quests['mq_02_tremors']));
  await closeDialogue();
  await shot('tracker-mq02-fresh');

  console.log('--- cheat: complete mq_02 objectives ---');
  await cheat(`
    cur.quests['mq_02_tremors'].progress = [8, 0];
    const slot = cur.inventory.etc.findIndex((x) => x === null);
    cur.inventory.etc[slot] = { uid: 'cheat_fluff', itemId: 'mat_puffmoss_fluff', qty: 5 };
  `);
  await wait(300);
  await shot('tracker-mq02-ready');

  await openDialogue('npc_maren');
  await clickOpt('Tremors');
  await waitUntil(() => !!Array.from(document.querySelectorAll('.dw-dlg-actions button')).find((b) => b.textContent?.trim() === 'Complete'), null, 8000);
  await shot('mq02-turnin-view');
  await clickDlgBtn('Complete');
  await wait(500);
  console.log('after mq02 complete:', JSON.stringify((await getState()).quests['mq_02_tremors']));
  await closeDialogue();

  console.log('--- fast-forward to mq_08 choice (two currents) ---');
  await cheat(`
    cur.level = 13; cur.xp = 0;
    cur.quests['mq_08_two_currents'] = { state: 'active', progress: [1,1,1], acceptedAt: Date.now() };
  `);
  await wait(300);
  await openDialogue('npc_idris');
  await shot('idris-root');
  await clickOpt('Two Currents');
  await waitUntil(() => document.querySelectorAll('.dw-choice-card').length > 0, null, 8000);
  await shot('mq08-choice-cards');
  // pick harpooners
  await page.evaluate(() => { const c = Array.from(document.querySelectorAll('.dw-choice-card')).find((x) => x.textContent?.includes('Harpooners')); c?.click(); });
  await wait(200);
  await shot('mq08-choice-selected');
  await clickDlgBtn('Complete');
  await wait(300);
  const confirmed = await clickAnyButton('Confirm Choice', 3000);
  console.log('confirm-choice modal shown?', confirmed);
  await wait(400);
  console.log('flags after mq08:', JSON.stringify((await getState()).flags));
  await closeDialogue();
} catch (e) {
  console.log('PHASE A ERROR:', e.message);
  await shot('phaseA-error');
}

// =========================================================================
console.log('=== PHASE A2: chooseOne reward (mq_10) + locked choice (mq_19) ===');
try {
  await cheat(`
    cur.quests['mq_10_old_tangle'] = { state: 'active', progress: [1,1], acceptedAt: Date.now() };
  `);
  await openDialogue('npc_fenna');
  await clickOpt('Old Tangle');
  await waitUntil(() => document.querySelectorAll('.dw-choice-card').length > 0 || document.querySelector('.dw-dlg-actions'), null, 8000);
  await shot('mq10-chooseone-view');
  const completeDisabledBefore = await page.evaluate(() => { const b = Array.from(document.querySelectorAll('.dw-dlg-actions button')).find((x) => x.textContent?.trim() === 'Complete'); return b?.disabled; });
  console.log('mq10 complete disabled before pick?', completeDisabledBefore);
  // reward-choice cards for chooseOne render as .dw-choice-card too (per dialogue.ts) — pick the 2nd (staff)
  await page.evaluate(() => { const cards = Array.from(document.querySelectorAll('.dw-choice-card')); (cards[1] ?? cards[0])?.click(); });
  await wait(200);
  await shot('mq10-chooseone-selected');
  await clickDlgBtn('Complete');
  await wait(500);
  console.log('mq10 quest state:', JSON.stringify((await getState()).quests['mq_10_old_tangle']));
  await closeDialogue();

  console.log('--- mq_19 locked choice (before unlocking) ---');
  await cheat(`
    cur.quests['mq_19_heart'] = { state: 'active', progress: [1,1,1], acceptedAt: Date.now() };
    const slot = cur.inventory.etc.findIndex((x) => x === null);
    if (slot >= 0) cur.inventory.etc[slot] = { uid: 'cheat_ember', itemId: 'qi_ember_fragment', qty: 1 };
  `);
  await openDialogue('npc_first_singer');
  await clickOpt('Heart of Oma');
  await waitUntil(() => document.querySelectorAll('.dw-choice-card').length >= 3, null, 8000);
  await shot('mq19-locked-before');
  const lockedInfo = await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('.dw-choice-card'));
    return cards.map((c) => ({ locked: c.classList.contains('dw-locked'), text: c.textContent }));
  });
  console.log('mq19 choice cards:', JSON.stringify(lockedInfo));
  await closeDialogue();

  console.log('--- mq_19 unlock true ending flags, reopen ---');
  await cheat(`cur.flags.roc = 'freed'; cur.flags.rook = 'rested';`);
  await openDialogue('npc_first_singer');
  await clickOpt('Heart of Oma');
  await waitUntil(() => document.querySelectorAll('.dw-choice-card').length >= 3, null, 8000);
  await shot('mq19-unlocked');
  const unlockedInfo = await page.evaluate(() => Array.from(document.querySelectorAll('.dw-choice-card')).map((c) => c.classList.contains('dw-locked')));
  console.log('mq19 locked flags after unlock (should be [f,f,f]):', JSON.stringify(unlockedInfo));
  await page.evaluate(() => { const c = Array.from(document.querySelectorAll('.dw-choice-card')).find((x) => x.textContent?.includes('Sing Together')); c?.click(); });
  await wait(200);
  await shot('mq19-sing-selected');
  await clickDlgBtn('Complete');
  await wait(300);
  await clickAnyButton('Confirm Choice', 3000);
  await wait(500);
  console.log('mq19 result:', JSON.stringify((await getState()).quests['mq_19_heart']), 'flags:', JSON.stringify((await getState()).flags), 'titles:', JSON.stringify((await getState()).titles));
  await closeDialogue();
} catch (e) {
  console.log('PHASE A2 ERROR:', e.message);
  await shot('phaseA2-error');
}

// =========================================================================
console.log('=== PHASE B: shop, inventory, hotbar ===');
try {
  const before = await getState();
  console.log('gold before shop:', before.gold);
  function findShopWin() { return Array.from(document.querySelectorAll('#ui .dw-window')).find((w) => w.querySelector('.dw-title')?.textContent?.trim() === 'Shop'); }
  await openDialogue('npc_pim');
  await shot('pim-root');
  await clickOpt('Shop');
  await waitUntil(findShopWin, null, 5000);
  await wait(300);
  await shot('shop-buy-tab');
  console.log('shop name shown:', await page.evaluate(() => document.querySelector('#ui .dw-window .dw-caps')?.textContent));
  // Buy 3x small HP potion
  const bought = await page.evaluate(() => {
    const shopWin = Array.from(document.querySelectorAll('#ui .dw-window')).find((w) => w.querySelector('.dw-title')?.textContent?.trim() === 'Shop');
    if (!shopWin) return 'no shop window';
    const qtyInput = shopWin.querySelector('input[type="number"]');
    if (qtyInput) { qtyInput.value = '3'; qtyInput.dispatchEvent(new Event('change', { bubbles: true })); }
    const buyBtn = Array.from(shopWin.querySelectorAll('button')).find((b) => b.textContent === 'Buy');
    buyBtn?.click();
    return 'clicked';
  });
  console.log('buy result:', bought);
  await wait(500);
  const afterBuy = await getState();
  console.log('gold after buying potions:', afterBuy.gold, '(was', before.gold, ')');
  await shot('after-buy');

  console.log('--- sell tab ---');
  await page.evaluate(() => { const t = Array.from(document.querySelectorAll('.dw-tab')).find((x) => x.textContent === 'Sell'); t?.click(); });
  await wait(300);
  await shot('shop-sell-tab');
  const sold = await page.evaluate(() => {
    const shopWin = Array.from(document.querySelectorAll('#ui .dw-window')).find((w) => w.querySelector('.dw-title')?.textContent?.trim() === 'Shop');
    const allSellBtns = Array.from(shopWin?.querySelectorAll('button') ?? []).filter((b) => b.textContent === 'Sell');
    allSellBtns[0]?.click();
    return allSellBtns.length;
  });
  console.log('sell buttons found:', sold);
  await wait(400);
  const afterSell = await getState();
  console.log('gold after selling:', afterSell.gold);
  await shot('after-sell');
  await closeDialogue();

  console.log('--- inventory: open, tooltip, right-click menu, discard ---');
  await toggle('inventory');
  await wait(400);
  await shot('inventory-open');
  await page.evaluate(() => { const t = Array.from(document.querySelectorAll('.dw-tab')).find((x) => x.textContent === 'Items'); t?.click(); });
  await wait(200);
  await shot('inventory-items-tab');
  // hover first non-empty slot for tooltip
  await page.evaluate(() => {
    const slot = Array.from(document.querySelectorAll('.dw-slot')).find((s) => s.querySelector('img') && !s.closest('.dw-hotbar'));
    if (slot) slot.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true, clientX: 500, clientY: 300 }));
  });
  await wait(150);
  await shot('inventory-tooltip');
  // right click for context menu -> Discard
  const ctxOk = await page.evaluate(() => {
    const slot = Array.from(document.querySelectorAll('.dw-grid .dw-slot')).find((s) => s.querySelector('img'));
    if (!slot) return false;
    const rect = slot.getBoundingClientRect();
    slot.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: rect.x + 10, clientY: rect.y + 10 }));
    return true;
  });
  console.log('context menu triggered?', ctxOk);
  await wait(200);
  await shot('inventory-context-menu');

  console.log('--- hotbar: drag a skill + a potion, activate ---');
  await page.evaluate(() => { window.__dw.learnAll(); }); // ensure current job has learned skills to drag
  await toggle('skills');
  await wait(300);
  await shot('skills-window-learned');
  const dragOk = await page.evaluate(() => {
    const skillIcon = document.querySelector('.dw-slot img[src^="data:"]');
    // simulate DnD via manual dataTransfer + dispatch since native drag events are hard to synthesize reliably;
    // instead call the same code path the real dragstart/drop handlers use.
    return true;
  });
  // Simplest reliable path: directly dispatch setHotbar like the drop handler would, to verify HUD renders it,
  // then separately confirm the hotbar slot's own drop handler code is exercised by a synthetic DragEvent.
  const firstSkillId = await page.evaluate(() => {
    const jobId = window.__session.state.jobId;
    // read job skills from the game's own data via a temporary global the app doesn't expose; fallback: scan skills obj
    return Object.keys(window.__session.state.skills)[0] ?? null;
  });
  console.log('first learned skill id:', firstSkillId);
  if (firstSkillId) {
    await dispatch({ type: 'setHotbar', index: 2, entry: { kind: 'skill', id: firstSkillId } });
  }
  await wait(300);
  await shot('hotbar-skill-set');
  const slot2Rect = await page.evaluate(() => {
    const slot = document.querySelectorAll('.dw-hotbar .dw-slot')[2];
    const r = slot?.getBoundingClientRect();
    return r ? { x: r.x + r.width / 2, y: r.y + r.height / 2 } : null;
  });
  console.log('hotbar slot 2 rect:', JSON.stringify(slot2Rect));
  if (slot2Rect) await page.mouse.click(slot2Rect.x, slot2Rect.y);
  await wait(500);
  console.log('cooldowns after activate:', await page.evaluate(() => JSON.stringify(window.__session.cooldowns)));
  await shot('hotbar-after-activate');
} catch (e) {
  console.log('PHASE B ERROR:', e.message);
  await shot('phaseB-error');
}

console.log(JSON.stringify(logs, null, 1));
await browser.close();
