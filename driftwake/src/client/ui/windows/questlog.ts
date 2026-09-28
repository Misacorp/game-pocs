import { el, fmtNum } from '../dom';
import { bus } from '../../events';
import type { GameSession } from '../../session';
import { WindowManager, createWindow } from '../manager';
import { makeTabs, confirmDialog } from '../widgets';
import { safeItemIcon, goldIconUrl } from '../icons';
import { QUESTS, ITEMS, NPCS } from '@shared/data';
import { getQuestState, questObjectiveProgress } from '@shared/logic';
import type { QuestType } from '@shared/types';

const TYPE_LABEL: Record<QuestType, string> = { main: 'Main Story', side: 'Side Quests', job: 'Job', faction: 'Faction', profession: 'Profession', daily: 'Daily' };
const TYPE_ORDER: QuestType[] = ['main', 'side', 'job', 'faction', 'profession', 'daily'];

export function createQuestLogWindow(wm: WindowManager, session: GameSession) {
  let mode: 'active' | 'completed' = 'active';
  let selected: string | null = null;

  const listEl = el('div', { style: { width: '210px', overflowY: 'auto', flexShrink: '0', borderRight: '1px solid rgba(255,255,255,0.1)', paddingRight: '8px' } });
  const detailEl = el('div', { style: { flex: '1', minWidth: '240px' } });
  const tabsHost = el('div');
  const body = el('div', { class: 'dw-body' }, tabsHost, el('div', { style: { display: 'flex', gap: '10px', marginTop: '8px' } }, listEl, detailEl));
  const ctrl = createWindow(wm, { panel: 'quests', title: 'Quest Log', width: 520 }, body);

  function questIdsFor(mode2: 'active' | 'completed'): string[] {
    return Object.entries(session.state.quests).filter(([, p]) => p.state === mode2).map(([id]) => id);
  }

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
    for (const type of TYPE_ORDER) {
      const group = grouped.get(type);
      if (!group?.length) continue;
      listEl.appendChild(el('div', { class: 'dw-tt-sub', style: { marginTop: '8px' } }, TYPE_LABEL[type]));
      for (const id of group) {
        const def = QUESTS[id];
        const ready = mode === 'active' && getQuestState(session.state, id) === 'ready';
        const row = el('div', {
          style: {
            padding: '5px 7px', borderRadius: '5px', cursor: 'pointer', fontSize: '12px',
            background: selected === id ? 'rgba(232,196,119,0.15)' : 'transparent', color: ready ? 'var(--dw-tide)' : undefined,
          },
          onclick: () => { selected = id; renderList(); renderDetail(); },
        }, def?.name ?? id, ready ? ' ✔' : '');
        listEl.appendChild(row);
      }
    }
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
    for (const it of r.items ?? []) rewardsRow.appendChild(rewardChip(safeItemIcon(ITEMS[it.itemId]), `${ITEMS[it.itemId]?.name ?? it.itemId}${it.qty && it.qty > 1 ? ` x${it.qty}` : ''}`));
    if (r.chooseOne?.length) rewardsRow.appendChild(el('div', { class: 'dw-dlg-reward' }, 'Choice of: ' + r.chooseOne.map((it) => ITEMS[it.itemId]?.name ?? it.itemId).join(', ')));
    detailEl.appendChild(rewardsRow);

    if (mode === 'active' && def.type !== 'main') {
      detailEl.appendChild(el('button', {
        class: 'dw-btn dw-btn-danger dw-btn-sm', style: { marginTop: '10px' },
        onclick: async () => {
          if (await confirmDialog(`Abandon "${def.name}"? Progress will be lost.`, { danger: true, okLabel: 'Abandon' })) {
            session.dispatch({ type: 'abandonQuest', questId: selected! });
          }
        },
      }, 'Abandon Quest'));
    }
  }

  function rewardChip(icon: string | null, text: string): HTMLElement {
    return el('div', { class: 'dw-dlg-reward' }, icon ? el('img', { src: icon }) : null, text);
  }

  const tabs = makeTabs([{ id: 'active', label: 'Active' }, { id: 'completed', label: 'Completed' }], (id) => { mode = id as any; selected = null; renderList(); renderDetail(); });
  tabsHost.appendChild(tabs.root);

  wm.track(bus.on('state', () => { renderList(); renderDetail(); }));
  renderList();
  renderDetail();
  return ctrl;
}
