import { el } from '../dom';
import { bus } from '../../events';
import type { GameSession } from '../../session';
import { WindowManager, createWindow } from '../manager';
import { attachTooltip } from '../tooltip';
import { MONSTERS, ITEMS } from '@shared/data';
import { iconUrlForMonster } from '../icons';
import type { MonsterDef } from '@shared/types';

export function createBestiaryWindow(wm: WindowManager, session: GameSession) {
  const grid = el('div', { class: 'dw-bestiary-grid' });
  const body = el('div', { class: 'dw-body' }, grid);
  const ctrl = createWindow(wm, { panel: 'bestiary', title: 'Bestiary', width: 480 }, body);

  function render() {
    grid.innerHTML = '';
    const st = session.state;
    const monsters = Object.values(MONSTERS);
    if (!monsters.length) { grid.appendChild(el('div', { style: { color: '#a7b0c4' } }, 'No monsters recorded yet.')); return; }
    for (const m of monsters) {
      const kills = st.bestiary[m.id] ?? 0;
      const seen = kills > 0;
      const card = el('div', { class: `dw-mon-card ${seen ? '' : 'dw-unseen'}` },
        el('img', { src: iconUrlForMonster(m) }),
        el('div', { class: 'dw-mon-name' }, seen ? m.name : '???'),
        el('div', { class: 'dw-mon-kills' }, seen ? `${kills} killed` : ''));
      attachTooltip(card, () => buildMonsterTooltip(m, kills));
      grid.appendChild(card);
    }
  }

  function buildMonsterTooltip(m: MonsterDef, kills: number): (Node | string)[] {
    if (kills <= 0) return ['??? Not yet encountered'];
    const nodes: (Node | string)[] = [el('div', { class: 'dw-tt-name' }, m.name)];
    nodes.push(el('div', { class: 'dw-tt-sub' }, `Level ${m.level}${m.isBoss ? ' · BOSS' : ''}`));
    if (kills >= 10) nodes.push(el('div', { class: 'dw-stat-row' }, el('span', null, 'HP'), el('span', null, String(m.hp))));
    if (kills >= 50) {
      nodes.push(el('hr'));
      nodes.push(el('div', { class: 'dw-tt-sub' }, 'Drops:'));
      for (const d of m.drops) {
        const def = ITEMS[d.itemId];
        nodes.push(el('div', { class: 'dw-stat-row' }, el('span', null, def?.name ?? d.itemId), el('span', null, `${Math.round(d.chance * 100)}%`)));
      }
    } else if (kills >= 1) {
      nodes.push(el('div', { class: 'dw-tt-desc' }, kills >= 10 ? 'Defeat 50 to reveal drop rates.' : 'Defeat 10 to reveal HP, 50 for drops.'));
    }
    return nodes;
  }

  wm.track(bus.on('state', render));
  render();
  return ctrl;
}
