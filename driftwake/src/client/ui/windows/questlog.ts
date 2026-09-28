import { el, fmtNum } from '../dom';
import { bus } from '../../events';
import type { GameSession } from '../../session';
import { WindowManager, createWindow } from '../manager';
import { makeTabs, confirmDialog, createListNav, keyHintFooter, isConfirmDialogOpen } from '../widgets';
import { attachItemTooltip } from '../itemTooltip';
import { safeItemIcon, goldIconUrl } from '../icons';
import { QUESTS, ITEMS, NPCS } from '@shared/data';
import { getQuestState, questObjectiveProgress } from '@shared/logic';
import type { QuestType } from '@shared/types';
import { isQuestPinned, toggleQuestPin } from '../state';

const TYPE_LABEL: Record<QuestType, string> = { main: 'Main Story', side: 'Side Quests', job: 'Job', faction: 'Faction', profession: 'Profession', daily: 'Daily' };
const TYPE_ORDER: QuestType[] = ['main', 'side', 'job', 'faction', 'profession', 'daily'];

export function createQuestLogWindow(wm: WindowManager, session: GameSession) {
  let mode: 'active' | 'completed' = 'active';
  let selected: string | null = null;

  const listEl = el('div', { style: { width: '210px', overflowY: 'auto', flexShrink: '0', borderRight: '1px solid rgba(255,255,255,0.1)', paddingRight: '8px' } });
  const detailEl = el('div', { style: { flex: '1', minWidth: '240px' } });
  const tabsHost = el('div');
  const footerEl = keyHintFooter('↑↓ select · ←→/Tab tabs · Enter details · Del abandon · Esc close');
  const body = el('div', { class: 'dw-body' }, tabsHost, el('div', { style: { display: 'flex', gap: '10px', marginTop: '8px' } }, listEl, detailEl), footerEl);
  const ctrl = createWindow(wm, {
    panel: 'quests', title: 'Quest Log', width: 520,
    // Keyboard nav (arrows/Enter/Esc/Del) needs the game to stop eating those same keys as
    // movement/attack while the log is open — same reasoning as the dialogue window.
    onOpen: () => bus.emit('input:capture', true),
    onClose: () => bus.emit('input:capture', false),
  }, body);

  function questIdsFor(mode2: 'active' | 'completed'): string[] {
    return Object.entries(session.state.quests).filter(([, p]) => p.state === mode2).map(([id]) => id);
  }

  /** ↑/↓ move this focus ring over the list without changing the detail pane; Enter "expands"
   *  (commits) the focused quest into `selected`, which is what actually updates the detail pane
   *  and the Abandon shortcut's target — see PLAYTEST feedback #1. */
  let nav = createListNav([]);
  function renderList() {
    listEl.innerHTML = '';
    const ids = questIdsFor(mode);
    if (!ids.some((id) => id === selected)) selected = ids[0] ?? null;
    const grouped = new Map<QuestType, string[]>();
    for (const id of ids) {
      const def = QUESTS[id];
      const type = def?.type ?? 'side';
      if (!grouped.has(type)) grouped.set(type, []);
      grouped.get(type)!.push(id);
    }
    if (!ids.length) listEl.appendChild(el('div', { style: { color: 'var(--dw-bone-dim)', fontSize: '12px' } }, mode === 'active' ? 'No active quests.' : 'No completed quests yet.'));
    const rows: HTMLElement[] = [];
    for (const type of TYPE_ORDER) {
      const group = grouped.get(type);
      if (!group?.length) continue;
      listEl.appendChild(el('div', { class: 'dw-tt-sub', style: { marginTop: '8px' } }, TYPE_LABEL[type]));
      for (const id of group) {
        const def = QUESTS[id];
        const ready = mode === 'active' && getQuestState(session.state, id) === 'ready';
        const pinBtn = el('span', {
          class: `dw-pin-toggle ${isQuestPinned(id) ? 'dw-pinned' : ''}`,
          title: isQuestPinned(id) ? 'Shown in tracker — click to unpin' : 'Not shown in tracker — click to pin',
          onclick: (e: MouseEvent) => { e.stopPropagation(); toggleQuestPin(id); renderList(); },
        });
        const row = el('div', {
          style: {
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px',
            padding: '5px 7px', borderRadius: '5px', cursor: 'pointer', fontSize: '12px',
            background: selected === id ? 'rgba(232,196,119,0.15)' : 'transparent',
          },
          onclick: () => { selected = id; renderList(); renderDetail(); },
        }, el('span', { style: { color: ready ? 'var(--dw-tide)' : undefined } }, def?.name ?? id, ready ? ' ✔' : ''), pinBtn);
        rows.push(row);
        listEl.appendChild(row);
      }
    }
    const focusOn = Math.max(0, ids.indexOf(selected ?? ''));
    nav = createListNav(rows, { initialIndex: focusOn, wrap: true });
  }

  function renderDetail() {
    detailEl.innerHTML = '';
    if (!selected) { detailEl.appendChild(el('div', { style: { color: 'var(--dw-bone-dim)' } }, 'Select a quest.')); return; }
    const def = QUESTS[selected];
    const prog = session.state.quests[selected];
    if (!def || !prog) { detailEl.appendChild(el('div', { style: { color: 'var(--dw-bone-dim)' } }, '??? Unknown quest')); return; }
    detailEl.appendChild(el('div', { style: { fontWeight: '800', color: 'var(--dw-lantern-hot)', fontSize: '14px' } }, def.name));
    const turnInDiffers = !!def.turnIn && def.turnIn !== def.giver;
    detailEl.appendChild(el('div', { class: 'dw-tt-sub' }, `${TYPE_LABEL[def.type]}  ·  Lv ${def.level}  ·  Giver: ${NPCS[def.giver]?.name ?? def.giver}`
      + (turnInDiffers ? `  ·  Turn in: ${NPCS[def.turnIn!]?.name ?? def.turnIn}` : '')));
    detailEl.appendChild(el('div', { style: { margin: '8px 0', fontSize: '12.5px' } }, mode === 'completed' ? def.summary : def.summary));
    if (mode === 'active') {
      for (const o of questObjectiveProgress(session.state, selected)) {
        detailEl.appendChild(el('div', { class: `dw-dlg-obj ${o.done ? 'dw-done' : ''}` }, `${o.done ? '✓' : '•'} ${o.text} (${o.current}/${o.target})`));
      }
    }
    const rewardsRow = el('div', { class: 'dw-dlg-reward-row' });
    const r = def.rewards;
    if (r.xp) rewardsRow.appendChild(rewardChip(null, `${fmtNum(r.xp)} XP`));
    if (r.gold) rewardsRow.appendChild(rewardChip(goldIconUrl(16), `${fmtNum(r.gold)}`));
    for (const it of r.items ?? []) rewardsRow.appendChild(rewardChip(safeItemIcon(ITEMS[it.itemId]), `${ITEMS[it.itemId]?.name ?? it.itemId}${it.qty && it.qty > 1 ? ` x${it.qty}` : ''}`, it.itemId, it.qty));
    if (r.chooseOne?.length) rewardsRow.appendChild(el('div', { class: 'dw-dlg-reward' }, 'Choice of: ' + r.chooseOne.map((it) => ITEMS[it.itemId]?.name ?? it.itemId).join(', ')));
    detailEl.appendChild(rewardsRow);

    if (mode === 'active' && def.type !== 'main') {
      detailEl.appendChild(el('button', { class: 'dw-btn dw-btn-danger dw-btn-sm', style: { marginTop: '10px' }, onclick: () => abandonSelected() }, 'Abandon Quest'));
    }
  }

  function rewardChip(icon: string | null, text: string, itemId?: string, qty?: number): HTMLElement {
    const chip = el('div', { class: 'dw-dlg-reward' }, icon ? el('img', { src: icon }) : null, text);
    if (itemId) attachItemTooltip(chip, session.state, { uid: '', itemId, qty: qty ?? 1 });
    return chip;
  }

  /** Abandons whichever quest is currently selected/expanded — shared by the detail pane's button
   *  and the Delete/X keyboard shortcut. Uses confirmDialog (keyboard-operable, never native
   *  confirm()) so the abandon prompt itself works without a mouse. */
  async function abandonSelected(): Promise<void> {
    if (!selected || mode !== 'active') return;
    const def = QUESTS[selected];
    if (!def || def.type === 'main') return;
    if (await confirmDialog(`Abandon "${def.name}"? Progress will be lost.`, { danger: true, okLabel: 'Abandon' })) {
      session.dispatch({ type: 'abandonQuest', questId: selected });
    }
  }

  const tabs = makeTabs([{ id: 'active', label: 'Active' }, { id: 'completed', label: 'Completed' }], (id) => { mode = id as any; selected = null; renderList(); renderDetail(); });
  tabsHost.appendChild(tabs.root);

  // Persistent listener (registered once) — ←/→/Tab switch tabs, Delete/X abandon the selected
  // quest, everything else (↑/↓ focus, Enter "expand" into the detail pane) goes to `nav`. Esc is
  // left unhandled here so it bubbles to the WindowManager's global Escape-closes-topmost.
  const onKeyDown = (e: KeyboardEvent) => {
    if (!ctrl.isOpen() || isConfirmDialogOpen()) return;
    if (e.code === 'ArrowLeft' || e.code === 'ArrowRight' || e.code === 'Tab') {
      e.preventDefault(); e.stopImmediatePropagation();
      const next = mode === 'active' ? 'completed' : 'active';
      tabs.select(next); mode = next; selected = null; renderList(); renderDetail();
      return;
    }
    if (e.code === 'Delete' || e.code === 'KeyX') { e.preventDefault(); e.stopImmediatePropagation(); void abandonSelected(); return; }
    nav.handleKey(e);
  };
  window.addEventListener('keydown', onKeyDown, true);
  wm.track(() => window.removeEventListener('keydown', onKeyDown, true));

  wm.track(bus.on('state', () => { renderList(); renderDetail(); }));
  wm.track(bus.on('ui:questPinsChanged', renderList));
  renderList();
  renderDetail();
  return ctrl;
}
