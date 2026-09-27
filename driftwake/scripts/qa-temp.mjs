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
  // index 2 (not 0) on purpose: the tier-1 basic attack skill (index 0) typically has no cooldown,
  // which wouldn't exercise the cooldown-sweep UI at all.
  const skillWithCd = await page.evaluate(() => Object.keys(window.__session.state.skills)[2] ?? Object.keys(window.__session.state.skills)[0] ?? null);
  console.log('skill chosen for hotbar (should have a real cooldown):', skillWithCd);
  if (skillWithCd) {
    await dispatch({ type: 'setHotbar', index: 2, entry: { kind: 'skill', id: skillWithCd } });
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
  console.log('cooldowns after mouse.click:', await page.evaluate(() => JSON.stringify(window.__session.cooldowns)));
  const directDomClick = await page.evaluate(() => {
    const slot = document.querySelectorAll('.dw-hotbar .dw-slot')[2];
    if (!slot) return 'no slot';
    slot.click();
    return 'clicked el directly';
  });
  await wait(500);
  console.log(directDomClick, '-> cooldowns:', await page.evaluate(() => JSON.stringify(window.__session.cooldowns)));
  await shot('hotbar-after-activate');
  console.log('player state before direct bus emit:', await page.evaluate(() => {
    const w = window.__game.scene.getScene('World');
    return { dead: w?.player?.dead, casting: w?.player?.isCasting?.(), mp: window.__session.mp, hotbar2: window.__session.state.hotbar[2] };
  }));
  await page.evaluate(() => window.__ui.bus.emit('hotbar:activate', { index: 2 }));
  await wait(500);
  console.log('cooldowns after direct bus emit:', await page.evaluate(() => JSON.stringify(window.__session.cooldowns)));

  console.log('--- real synthetic drag-and-drop: skill row -> hotbar slot 5 ---');
  const dndResult = await page.evaluate(() => {
    const skillsWin = Array.from(document.querySelectorAll('#ui .dw-window')).find((w) => w.querySelector('.dw-title')?.textContent?.trim() === 'Skills');
    const skillRow = skillsWin?.querySelector('.dw-slot[draggable="true"]');
    const target = document.querySelectorAll('.dw-hotbar .dw-slot')[5];
    if (!skillRow || !target) return 'missing elements';
    const dt = new DataTransfer();
    skillRow.dispatchEvent(new DragEvent('dragstart', { bubbles: true, cancelable: true, dataTransfer: dt }));
    target.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: dt }));
    target.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt }));
    return 'dispatched';
  });
  await wait(300);
  console.log('dnd result:', dndResult, 'hotbar[5]:', JSON.stringify((await getState()).hotbar[5]));
  await shot('hotbar-after-dnd');

  console.log('--- drag a potion item onto hotbar slot 6 ---');
  await toggle('inventory');
  await wait(300);
  await page.evaluate(() => { const t = Array.from(document.querySelectorAll('.dw-tab')).find((x) => x.textContent === 'Items'); t?.click(); });
  await wait(200);
  const dndItemResult = await page.evaluate(() => {
    const invWin = Array.from(document.querySelectorAll('#ui .dw-window')).find((w) => w.querySelector('.dw-title')?.textContent?.trim() === 'Inventory');
    const itemSlot = invWin ? Array.from(invWin.querySelectorAll('.dw-grid .dw-slot')).find((s) => s.getAttribute('draggable') === 'true') : null;
    const target = document.querySelectorAll('.dw-hotbar .dw-slot')[6];
    if (!itemSlot || !target) return 'missing elements';
    const dt = new DataTransfer();
    itemSlot.dispatchEvent(new DragEvent('dragstart', { bubbles: true, cancelable: true, dataTransfer: dt }));
    target.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: dt }));
    target.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt }));
    return 'dispatched';
  });
  await wait(300);
  console.log('dnd item result:', dndItemResult, 'hotbar[6]:', JSON.stringify((await getState()).hotbar[6]));
  await shot('hotbar-after-item-dnd');
  await toggle('inventory');
} catch (e) {
  console.log('PHASE B ERROR:', e.message);
  await shot('phaseB-error');
}

// =========================================================================
console.log('=== PHASE C: professions (learn, craft, buy recipe, salvage, enhance) ===');
try {
  await cheat(`
    const slot = cur.inventory.etc.findIndex((x) => x === null);
    cur.inventory.etc[slot] = { uid: 'cheat_ore', itemId: 'mat_copper_ore', qty: 12 };
    const slot2 = cur.inventory.etc.findIndex((x) => x === null);
    cur.inventory.etc[slot2] = { uid: 'cheat_stone', itemId: 'mat_enhance_stone_1', qty: 3 };
    cur.gold += 1000;
  `);
  await openDialogue('npc_brina');
  await shot('brina-root');
  await clickOpt('Crafting');
  await waitUntil(() => document.body.innerText.includes('PROFESSIONS'), null, 5000);
  await wait(300);
  await shot('professions-overview-attrainer');
  console.log('professions before learn:', JSON.stringify((await getState()).professions));
  const learnClicked = await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find((b) => b.textContent?.trim() === 'Learn');
    if (btn) { btn.click(); return true; }
    return false;
  });
  console.log('clicked Learn?', learnClicked);
  await wait(400);
  console.log('professions after learn:', JSON.stringify((await getState()).professions));
  await shot('professions-after-learn');

  await page.evaluate(() => { const t = Array.from(document.querySelectorAll('.dw-tab')).find((x) => x.textContent === 'Recipes'); t?.click(); });
  await wait(200);
  const selected = await page.evaluate(() => {
    const sel = document.querySelector('#ui select.dw-select');
    if (!sel) return 'no select';
    sel.value = 'smithing';
    sel.dispatchEvent(new Event('change', { bubbles: true }));
    return 'set';
  });
  console.log('profession select:', selected);
  await wait(300);
  await shot('recipes-smithing-tab');
  console.log('known recipes has smelt copper?', (await getState()).knownRecipes.includes('rec_smith_smelt_copper'));

  const craftClicked = await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find((b) => b.textContent?.trim() === 'x1' && !b.disabled);
    if (btn) { btn.click(); return true; }
    return 'not found or disabled: ' + JSON.stringify(Array.from(document.querySelectorAll('button')).filter((b) => b.textContent?.trim() === 'x1').map((b) => b.disabled));
  });
  console.log('craft x1 clicked?', craftClicked);
  await wait(400);
  console.log('copper ore/ingot count:', (await getState()).inventory.etc.filter((i) => i && (i.itemId === 'mat_copper_ore' || i.itemId === 'mat_copper_ingot')).map((i) => `${i.itemId}:${i.qty}`));
  await shot('after-craft');

  console.log('--- buy a trainer recipe ---');
  const buyRecipeClicked = await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find((b) => b.textContent?.includes('Buy Recipe'));
    if (btn) { btn.click(); return btn.textContent; }
    return null;
  });
  console.log('buy recipe button:', buyRecipeClicked);
  await wait(400);
  await shot('after-buy-recipe');

  console.log('--- salvage tab ---');
  await page.evaluate(() => { const t = Array.from(document.querySelectorAll('.dw-tab')).find((x) => x.textContent === 'Salvage'); t?.click(); });
  await wait(300);
  await shot('salvage-tab');

  console.log('--- enhance tab ---');
  await page.evaluate(() => { const t = Array.from(document.querySelectorAll('.dw-tab')).find((x) => x.textContent === 'Enhance'); t?.click(); });
  await wait(300);
  await shot('enhance-tab-empty');
  const enhanceSetup = await page.evaluate(() => {
    const win = Array.from(document.querySelectorAll('#ui .dw-window')).find((w) => w.querySelector('.dw-title')?.textContent?.trim() === 'Professions');
    const grids = win?.querySelectorAll('.dw-grid');
    if (!grids || grids.length < 2) return 'grids not found: ' + grids?.length;
    const equipSlot = grids[0].querySelector('.dw-slot');
    const stoneSlot = grids[1].querySelector('.dw-slot');
    equipSlot?.click();
    stoneSlot?.click();
    return { equip: !!equipSlot, stone: !!stoneSlot };
  });
  console.log('enhance setup:', JSON.stringify(enhanceSetup));
  await wait(200);
  await shot('enhance-selected');
  const enhanceClicked = await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find((b) => b.textContent?.trim() === 'Enhance' && !b.disabled);
    if (btn) { btn.click(); return true; }
    return false;
  });
  console.log('enhance clicked?', enhanceClicked);
  await wait(500);
  await shot('after-enhance');
  await closeDialogue();
} catch (e) {
  console.log('PHASE C ERROR:', e.message);
  await shot('phaseC-error');
}

// =========================================================================
console.log('=== PHASE D: character AP, job advance + tier2 skills, death/respawn, worldmap/bestiary ===');
try {
  console.log('--- character window: AP allocation ---');
  await toggle('character');
  await wait(300);
  await shot('character-before-ap');
  await cheat(`cur.ap = 10;`);
  await wait(300);
  const strBefore = (await getState()).baseStats.str;
  const apPlusClicked = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('#ui .dw-window .dw-stat-row2'));
    const strRow = rows.find((r) => r.textContent?.trim().startsWith('STR'));
    const btn = strRow?.querySelector('button');
    btn?.dispatchEvent(new MouseEvent('click', { bubbles: true, shiftKey: true })); // shift-click = +5
    return !!btn;
  });
  console.log('AP + clicked (shift, +5)?', apPlusClicked);
  await wait(400);
  const afterAp = await getState();
  console.log('STR before/after:', strBefore, afterAp.baseStats.str, 'AP left:', afterAp.ap);
  await shot('character-after-ap');
  await toggle('character');

  console.log('--- real job advance via jq_vanguard turn-in choice ---');
  await cheat(`
    cur.level = 16; cur.xp = 0;
    cur.quests['jq_vanguard'] = { state: 'active', progress: [12, 6], acceptedAt: Date.now() };
    const slot = cur.inventory.etc.findIndex((x) => x === null);
    cur.inventory.etc[slot] = { uid: 'cheat_badge', itemId: 'mat_raider_badge', qty: 6 };
  `);
  await openDialogue('npc_hale');
  await shot('hale-root');
  await clickOpt('Bulwark or Reaver');
  await waitUntil(() => document.querySelectorAll('.dw-choice-card').length >= 2, null, 8000);
  await shot('jq-vanguard-choice');
  await page.evaluate(() => { const c = Array.from(document.querySelectorAll('.dw-choice-card')).find((x) => x.textContent?.includes('Bulwark')); c?.click(); });
  await wait(200);
  await clickDlgBtn('Complete');
  await wait(300);
  await clickAnyButton('Confirm Choice', 3000);
  await wait(500);
  const afterAdvance = await getState();
  console.log('jobId after advance:', afterAdvance.jobId, 'sp:', afterAdvance.sp);
  await closeDialogue();

  await toggle('skills');
  await wait(400);
  await shot('skills-tier2-tabs');
  await toggle('skills');

  console.log('--- death dialog + respawn ---');
  await dispatch({ type: 'die' });
  await wait(600);
  await shot('death-dialog');
  const respawnClicked = await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find((b) => b.textContent?.trim() === 'Respawn');
    if (btn) { btn.click(); return true; }
    return false;
  });
  console.log('respawn clicked?', respawnClicked);
  await wait(600);
  console.log('hp after respawn:', await page.evaluate(() => window.__session.hp));
  await shot('after-respawn');

  console.log('--- world map + bestiary with real data ---');
  await toggle('map');
  await wait(300);
  await shot('worldmap-real');
  await toggle('map');
  await toggle('bestiary');
  await wait(300);
  await shot('bestiary-real');
  await toggle('bestiary');
} catch (e) {
  console.log('PHASE D ERROR:', e.message);
  await shot('phaseD-error');
}

// =========================================================================
console.log('=== PHASE E: settings keybind remap (engine effect) + menu quit/reenter persistence ===');
try {
  await toggle('settings');
  await wait(300);
  await shot('settings-before-remap');
  const bindClicked = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('#ui .dw-bind-row'));
    const jumpRow = rows.find((r) => r.textContent?.includes('Jump'));
    const keyBtn = jumpRow?.querySelector('.dw-bind-key');
    keyBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    return !!keyBtn;
  });
  console.log('bind listen started?', bindClicked);
  await wait(200);
  await page.keyboard.down('KeyJ');
  await page.keyboard.up('KeyJ');
  await wait(200);
  const newLabel = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('#ui .dw-bind-row'));
    const jumpRow = rows.find((r) => r.textContent?.includes('Jump'));
    return jumpRow?.querySelector('.dw-bind-key')?.textContent;
  });
  console.log('jump keybind now shows:', newLabel);
  await shot('settings-after-remap');
  await toggle('settings');

  console.log('--- engine effect: pressing J should now jump ---');
  const vyBefore = await page.evaluate(() => window.__game.scene.getScene('World')?.player?.body?.velocity?.y);
  await page.keyboard.down('KeyJ');
  await wait(80);
  await page.keyboard.up('KeyJ');
  await wait(120);
  const vyAfter = await page.evaluate(() => window.__game.scene.getScene('World')?.player?.body?.velocity?.y);
  console.log('vertical velocity before/after pressing J:', vyBefore, vyAfter, '(expect a negative/upward change if jump bound correctly)');

  console.log('--- menu: Save & Quit to Title, then re-enter same character ---');
  const nameBefore = (await getState()).name;
  const goldBefore2 = (await getState()).gold;
  await toggle('menu');
  await wait(300);
  await shot('menu-open');
  await page.evaluate(() => { const b = Array.from(document.querySelectorAll('button')).find((x) => x.textContent === 'Save & Quit to Title'); b?.click(); });
  await wait(1200);
  await shot('back-at-title');
  await page.mouse.click(640, 426); // Play (title menu -> character select)
  await wait(500);
  await shot('char-select-after-quit');
  // re-enter: click first character card's Play button
  const cardsInfo = await page.evaluate(() => document.querySelectorAll('.dw-charcard').length);
  console.log('character cards on select screen:', cardsInfo);
  await page.evaluate(() => { const b = Array.from(document.querySelectorAll('.dw-charcard button')).find((x) => x.textContent === 'Play'); b?.click(); });
  await wait(1200);
  await shot('reentered');
  const afterReenter = await getState();
  console.log('name/gold persisted?', afterReenter.name === nameBefore, afterReenter.gold === goldBefore2, afterReenter.name, afterReenter.gold);
} catch (e) {
  console.log('PHASE E ERROR:', e.message);
  await shot('phaseE-error');
}

console.log(JSON.stringify(logs, null, 1));
await browser.close();
