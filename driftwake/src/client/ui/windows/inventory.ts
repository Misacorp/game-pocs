import { el, fmtNum } from '../dom';
import { bus } from '../../events';
import type { GameSession } from '../../session';
import { WindowManager, createWindow } from '../manager';
import { makeTabs, confirmDialog, showContextMenu } from '../widgets';
import { attachTooltip } from '../tooltip';
import { buildItemTooltip } from '../itemTooltip';
import { safeItemIcon, goldIconUrl } from '../icons';
import { ITEMS } from '@shared/data';
import { INVENTORY_SIZE } from '@shared/constants';
import type { InventoryTab, ItemInstance } from '@shared/types';
import { uiState } from '../state';
import { audio } from '../../audio';

const TABS: { id: InventoryTab; label: string }[] = [
  { id: 'equip', label: 'Equipment' },
  { id: 'use', label: 'Items' },
  { id: 'etc', label: 'Materials' },
];

export function createInventoryWindow(wm: WindowManager, session: GameSession) {
  const goldEl = el('div', { style: { display: 'flex', alignItems: 'center', gap: '5px', fontWeight: '700', color: '#ffd24a' } }, el('img', { src: goldIconUrl(16), style: { width: '16px', height: '16px' } }), '0');
  const grid = el('div', { class: 'dw-grid' });
  let currentTab: InventoryTab = 'equip';

  const tabs = makeTabs(TABS, (id) => { currentTab = id as InventoryTab; render(); });
  const sortBtn = el('button', { class: 'dw-btn dw-btn-sm', onclick: () => session.dispatch({ type: 'sortInventory', tab: currentTab }) }, 'Sort');
  const header = el('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px 0' } }, goldEl, sortBtn);
  const body = el('div', { class: 'dw-body' }, header, tabs.root, el('div', { style: { padding: '10px 0' } }, grid));

  const ctrl = createWindow(wm, { panel: 'inventory', title: 'Inventory', width: 320 }, body);

  let dragSrc: { tab: InventoryTab; index: number } | null = null;

  function render() {
    goldEl.lastChild!.textContent = ` ${fmtNum(session.state.gold)}`;
    grid.innerHTML = '';
    const slots = session.state.inventory[currentTab] ?? [];
    for (let i = 0; i < INVENTORY_SIZE; i++) {
      const inst = slots[i] ?? null;
      const def = inst ? ITEMS[inst.itemId] : undefined;
      const slot = el('div', { class: `dw-slot ${inst ? '' : 'dw-empty'}` });
      if (inst) {
        slot.appendChild(el('img', { src: safeItemIcon(def) }));
        if (inst.qty > 1) slot.appendChild(el('div', { class: 'dw-count' }, String(inst.qty)));
        slot.draggable = true;
        slot.addEventListener('dragstart', (e) => {
          dragSrc = { tab: currentTab, index: i };
          e.dataTransfer?.setData('text/plain', `item:${inst.itemId}`);
        });
        attachTooltip(slot, () => buildItemTooltip(session.state, inst));
        slot.addEventListener('dblclick', () => useOrEquip(inst, def));
        slot.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          openContextMenu(e, inst, def);
        });
      }
      slot.addEventListener('dragover', (e) => { e.preventDefault(); slot.classList.add('dw-dragover'); });
      slot.addEventListener('dragleave', () => slot.classList.remove('dw-dragover'));
      slot.addEventListener('drop', (e) => {
        e.preventDefault();
        slot.classList.remove('dw-dragover');
        if (dragSrc && dragSrc.tab === currentTab && dragSrc.index !== i) {
          session.dispatch({ type: 'moveItem', tab: currentTab, from: dragSrc.index, to: i });
        }
        dragSrc = null;
      });
      grid.appendChild(slot);
    }
  }

  function useOrEquip(inst: ItemInstance, def = ITEMS[inst.itemId]) {
    if (!def) return;
    audio.playSfx('uiClick');
    if (def.pet) session.dispatch({ type: 'summonPet', itemId: session.state.activePet === inst.itemId ? null : inst.itemId });
    else if (def.equip) session.dispatch({ type: 'equip', uid: inst.uid });
    else if (def.use) session.dispatch({ type: 'useItem', uid: inst.uid });
  }

  function openContextMenu(e: MouseEvent, inst: ItemInstance, def = ITEMS[inst.itemId]) {
    const items: { label: string; onClick: () => void; danger?: boolean }[] = [];
    if (def?.pet) {
      const active = session.state.activePet === inst.itemId;
      items.push({ label: active ? 'Dismiss' : 'Summon', onClick: () => session.dispatch({ type: 'summonPet', itemId: active ? null : inst.itemId }) });
    } else if (def?.equip) items.push({ label: 'Equip', onClick: () => session.dispatch({ type: 'equip', uid: inst.uid }) });
    else if (def?.use) items.push({ label: 'Use', onClick: () => session.dispatch({ type: 'useItem', uid: inst.uid }) });
    if (uiState.openShopId && def?.sellPrice && !def.quest) {
      items.push({ label: `Sell (${def.sellPrice}g)`, onClick: () => session.dispatch({ type: 'sell', uid: inst.uid, qty: inst.qty }) });
    }
    if (def?.equip) {
      items.push({
        label: 'Salvage', onClick: async () => {
          if (await confirmDialog(`Salvage ${def.name}? This destroys the item for materials.`)) session.dispatch({ type: 'salvage', uid: inst.uid });
        },
      });
    }
    if (!def?.quest) {
      items.push({
        label: 'Discard', danger: true, onClick: async () => {
          if (await confirmDialog(`Discard ${def?.name ?? 'this item'}${inst.qty > 1 ? ` x${inst.qty}` : ''}? This cannot be undone.`, { danger: true, okLabel: 'Discard' })) {
            session.dispatch({ type: 'discardItem', uid: inst.uid, qty: inst.qty });
          }
        },
      });
    }
    showContextMenu(e.clientX, e.clientY, items);
  }

  wm.track(bus.on('state', render));
  render();
  return ctrl;
}
