import { el, fmtNum, clamp } from '../dom';
import { bus } from '../../events';
import type { GameSession } from '../../session';
import { WindowManager, createWindow } from '../manager';
import { makeTabs } from '../widgets';
import { attachTooltip } from '../tooltip';
import { buildItemTooltip } from '../itemTooltip';
import { safeItemIcon, goldIconUrl } from '../icons';
import { ITEMS, SHOPS } from '@shared/data';
import { checkConditions } from '@shared/logic';
import { uiState } from '../state';
import type { ItemInstance } from '@shared/types';

export function createShopWindow(wm: WindowManager, session: GameSession) {
  let shopId: string | null = null;
  let mode: 'buy' | 'sell' = 'buy';
  const qtyState = new Map<string, number>();

  const shopNameEl = el('div', { class: 'dw-caps', style: { color: 'var(--dw-lantern)', fontWeight: '700', fontSize: '12px', marginBottom: '4px' } }, 'Shop');
  const goldEl = el('div', { style: { fontWeight: '700', color: 'var(--dw-lantern-hot)', display: 'flex', alignItems: 'center', gap: '5px' } }, el('img', { src: goldIconUrl(16) }), '0');
  const tabsHost = el('div');
  const grid = el('div', { style: { marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '2px', maxHeight: '420px', overflowY: 'auto' } });
  const body = el('div', { class: 'dw-body' }, shopNameEl, goldEl, tabsHost, grid);
  const invPos = wm.get('inventory')?.root;
  const ctrl = createWindow(wm, {
    panel: 'shop', title: 'Shop', width: 360,
    defaultPos: invPos ? { x: invPos.offsetLeft + 330, y: invPos.offsetTop } : undefined,
    // The Shop panel only ever opens from an NPC conversation (there's no standalone hotkey for
    // it). Closing it while that conversation is still open behind it used to leave the
    // conversation's input:capture stuck true — the player could no longer move and had nothing
    // on screen telling them why, since the shop visually covered the conversation window. Close
    // the conversation too so closing the shop always hands control back.
    onClose: () => { uiState.openShopId = null; if (wm.isOpen('dialogue')) wm.close('dialogue'); },
  }, body);

  const tabs = makeTabs([{ id: 'buy', label: 'Buy' }, { id: 'sell', label: 'Sell' }], (id) => { mode = id as any; render(); });
  tabsHost.appendChild(tabs.root);

  function render() {
    goldEl.lastChild!.textContent = ` ${fmtNum(session.state.gold)}`;
    grid.innerHTML = '';
    if (mode === 'buy') renderBuy(); else renderSell();
  }

  function renderBuy() {
    const shop = shopId ? SHOPS[shopId] : undefined;
    if (!shop) { grid.appendChild(el('div', { style: { color: 'var(--dw-bone-dim)' } }, 'Shop unavailable.')); return; }
    for (const entry of shop.items) {
      if (!checkConditions(session.state, entry.reqs)) continue;
      const def = ITEMS[entry.itemId];
      const price = entry.price ?? def?.buyPrice ?? 0;
      const card = el('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', padding: '6px', borderBottom: '1px solid rgba(255,255,255,0.06)' } });
      const iconSlot = el('div', { class: 'dw-slot' }, el('img', { src: safeItemIcon(def) }));
      attachTooltip(iconSlot, () => def ? [`${def.name}`] : ['??? Item']);
      card.appendChild(iconSlot);
      card.appendChild(el('div', { style: { flex: '1' } }, el('div', null, def?.name ?? entry.itemId), el('div', { style: { fontSize: '11px', color: 'var(--dw-lantern-hot)' } }, `${fmtNum(price)}g`)));
      const stackable = (def?.stack ?? 1) > 1;
      const qtyKey = entry.itemId;
      if (!qtyState.has(qtyKey)) qtyState.set(qtyKey, 1);
      if (stackable) {
        const qtyInput = el('input', { class: 'dw-input', type: 'number', min: '1', value: String(qtyState.get(qtyKey)), style: { width: '46px' } }) as HTMLInputElement;
        qtyInput.addEventListener('change', () => qtyState.set(qtyKey, Math.max(1, parseInt(qtyInput.value) || 1)));
        card.appendChild(qtyInput);
      }
      card.appendChild(el('button', {
        class: 'dw-btn dw-btn-sm', disabled: session.state.gold < price,
        onclick: () => session.dispatch({ type: 'buy', shopId: shopId!, itemId: entry.itemId, qty: stackable ? (qtyState.get(qtyKey) ?? 1) : 1 }),
      }, 'Buy'));
      grid.appendChild(card);
    }
  }

  function renderSell() {
    const all: ItemInstance[] = [];
    for (const tab of Object.values(session.state.inventory)) for (const inst of tab) if (inst && !ITEMS[inst.itemId]?.quest) all.push(inst);
    if (!all.length) { grid.appendChild(el('div', { style: { color: 'var(--dw-bone-dim)' } }, 'Nothing to sell.')); return; }
    for (const inst of all) {
      const def = ITEMS[inst.itemId];
      const card = el('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', padding: '6px', borderBottom: '1px solid rgba(255,255,255,0.06)' } });
      const iconSlot = el('div', { class: 'dw-slot' }, el('img', { src: safeItemIcon(def) }), inst.qty > 1 ? el('div', { class: 'dw-count' }, String(inst.qty)) : null);
      attachTooltip(iconSlot, () => buildItemTooltip(session.state, inst));
      card.appendChild(iconSlot);
      card.appendChild(el('div', { style: { flex: '1' } }, el('div', null, def?.name ?? inst.itemId), el('div', { style: { fontSize: '11px', color: 'var(--dw-lantern-hot)' } }, `${fmtNum(def?.sellPrice ?? 0)}g ea`)));
      card.appendChild(el('button', { class: 'dw-btn dw-btn-sm', onclick: () => session.dispatch({ type: 'sell', uid: inst.uid, qty: inst.qty }) }, 'Sell'));
      grid.appendChild(card);
    }
  }

  ctrl.root.addEventListener('dragover', (e) => e.preventDefault());
  ctrl.root.addEventListener('drop', () => { mode = 'sell'; tabs.select('sell'); render(); });

  wm.track(bus.on('ui:shop', ({ shopId: id }) => {
    shopId = id;
    uiState.openShopId = id;
    shopNameEl.textContent = SHOPS[id]?.name ?? 'Shop';
    mode = 'buy'; tabs.select('buy');
    ctrl.open();
    render();
  }));
  wm.track(bus.on('state', render));
  return ctrl;
}
