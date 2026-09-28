import { el, fmtNum, fmtPlaytime } from '../dom';
import { bus } from '../../events';
import type { GameSession } from '../../session';
import { WindowManager, createWindow } from '../manager';
import { attachTooltip } from '../tooltip';
import { buildItemTooltip } from '../itemTooltip';
import { statLabel, formatStatValue } from '../statsFormat';
import { safeItemIcon, characterPreviewUrlSafe } from '../icons';
import { ITEMS, JOBS } from '@shared/data';
import { EQUIP_SLOTS } from '@shared/types';
import type { EquipSlot, StatKey } from '@shared/types';
import { damageRange } from '@shared/logic';

const EQ_POS: Record<EquipSlot, { left: number; top: number }> = {
  helmet: { left: 70, top: 4 },
  amulet: { left: 134, top: 56 },
  weapon: { left: 4, top: 96 },
  armor: { left: 70, top: 96 },
  ring: { left: 134, top: 146 },
  gloves: { left: 4, top: 150 },
  boots: { left: 70, top: 186 },
};

const STAT_KEYS: StatKey[] = ['str', 'dex', 'int', 'luk'];

export function createCharacterWindow(wm: WindowManager, session: GameSession) {
  const previewImg = el('img', { class: 'dw-doll-preview' });
  const paperdoll = el('div', { class: 'dw-paperdoll' }, previewImg);
  const eqSlotEls: Partial<Record<EquipSlot, HTMLElement>> = {};
  for (const slot of EQUIP_SLOTS) {
    const pos = EQ_POS[slot];
    const box = el('div', { class: 'dw-slot dw-eq-slot', style: { left: `${pos.left}px`, top: `${pos.top}px` } });
    box.addEventListener('dblclick', () => { if (session.state.equipment[slot]) session.dispatch({ type: 'unequip', slot }); });
    box.addEventListener('dragover', (e) => e.preventDefault());
    box.addEventListener('drop', (e) => {
      e.preventDefault();
      const data = e.dataTransfer?.getData('text/plain');
      if (data?.startsWith('item:')) {
        const itemId = data.slice(5);
        const inst = Object.values(session.state.inventory).flat().find((i) => i?.itemId === itemId);
        if (inst) session.dispatch({ type: 'equip', uid: inst.uid });
      }
    });
    eqSlotEls[slot] = box;
    paperdoll.appendChild(box);
  }

  const statRows: Record<StatKey, HTMLElement> = {} as any;
  const apLabel = el('span', { class: 'dw-caps', style: { color: 'var(--dw-lantern)' } }, 'AP: 0');
  const autoBtn = el('button', {
    class: 'dw-btn dw-btn-sm', title: 'Spend all AP: mostly your main stat, some into your secondary',
    onclick: () => {
      const st = session.state;
      const job = JOBS[st.jobId];
      if (!job || st.ap <= 0) return;
      const secondary = Math.floor(st.ap * 0.2);
      const main = st.ap - secondary;
      if (main > 0) session.dispatch({ type: 'allocateStat', stat: job.mainStat, amount: main });
      if (secondary > 0) session.dispatch({ type: 'allocateStat', stat: job.secondaryStat, amount: secondary });
    },
  }, 'Auto');
  const statBlock = el('div', {}, el('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' } }, el('b', null, 'Base Stats'), el('div', { style: { display: 'flex', gap: '8px', alignItems: 'center' } }, apLabel, autoBtn)));
  for (const stat of STAT_KEYS) {
    const valueEl = el('span', { style: { fontWeight: '700' } }, '0');
    const plus = el('button', {
      class: 'dw-btn dw-btn-sm dw-stat-plus', title: 'Shift-click for +5',
      onclick: (e: MouseEvent) => session.dispatch({ type: 'allocateStat', stat, amount: e.shiftKey ? 5 : 1 }),
    }, '+');
    const row = el('div', { class: 'dw-stat-row2' }, el('span', null, stat.toUpperCase()), el('div', { style: { display: 'flex', gap: '6px', alignItems: 'center' } }, valueEl, plus));
    statRows[stat] = valueEl;
    statBlock.appendChild(row);
  }

  const derivedBlock = el('div', { style: { marginTop: '10px' } }, el('b', null, 'Combat'));
  const repBlock = el('div', { style: { marginTop: '10px' } }, el('b', null, 'Reputation'));
  const titlesBlock = el('div', { style: { marginTop: '10px' } }, el('b', null, 'Titles'));
  const petBlock = el('div', { style: { marginTop: '10px' } }, el('b', null, 'Companion'));
  const countersBlock = el('div', { style: { marginTop: '10px', fontSize: '11.5px', color: 'var(--dw-bone-dim)' } });

  const right = el('div', { style: { flex: '1', minWidth: '210px' } }, statBlock, derivedBlock, repBlock, titlesBlock, petBlock, countersBlock);
  const body = el('div', { class: 'dw-body', style: { display: 'flex', gap: '16px', flexWrap: 'wrap' } }, paperdoll, right);

  const ctrl = createWindow(wm, { panel: 'character', title: 'Character', width: 520 }, body);

  function render() {
    const st = session.state;
    const stats = session.stats;
    const job = JOBS[st.jobId];

    previewImg.src = characterPreviewUrlSafe({ classId: st.classId, jobId: st.jobId, appearance: st.appearance });

    for (const slot of EQUIP_SLOTS) {
      const box = eqSlotEls[slot]!;
      box.innerHTML = '';
      const inst = st.equipment[slot];
      box.classList.toggle('dw-empty', !inst);
      if (inst) {
        const def = ITEMS[inst.itemId];
        box.appendChild(el('img', { src: safeItemIcon(def) }));
        box.draggable = true;
        box.ondragstart = (e) => e.dataTransfer?.setData('text/plain', `eq:${slot}`);
        attachTooltip(box, () => buildItemTooltip(st, inst));
      } else {
        attachTooltip(box, () => [slot[0].toUpperCase() + slot.slice(1)]);
      }
    }

    apLabel.textContent = `AP: ${st.ap}`;
    (autoBtn as HTMLButtonElement).disabled = st.ap <= 0;
    for (const stat of STAT_KEYS) {
      statRows[stat].textContent = String(st.baseStats[stat]);
      const btn = statBlock.querySelectorAll<HTMLButtonElement>('.dw-stat-plus')[STAT_KEYS.indexOf(stat)];
      if (btn) btn.disabled = st.ap <= 0;
    }

    derivedBlock.innerHTML = '';
    derivedBlock.appendChild(el('b', null, 'Combat'));
    const [dmgMin, dmgMax] = job ? damageRange(stats, job) : [0, 0];
    const lines: [string, string][] = [
      ['Damage', `${fmtNum(dmgMin)} - ${fmtNum(dmgMax)}`],
      ['Attack', formatStatValue('attack', stats.attack)],
      ['Magic Attack', formatStatValue('magicAttack', stats.magicAttack)],
      ['Defense', formatStatValue('defense', stats.defense)],
      ['Crit Rate', formatStatValue('critRate', stats.critRate)],
      ['Crit Damage', formatStatValue('critDamage', stats.critDamage)],
      ['Speed', formatStatValue('speed', 100 + stats.speed)],
      ['Avoidability', formatStatValue('avoid', stats.avoid)],
    ];
    for (const [label, value] of lines) derivedBlock.appendChild(el('div', { class: 'dw-stat-row2' }, el('span', null, label), el('span', null, value)));

    repBlock.innerHTML = '';
    repBlock.appendChild(el('b', null, 'Reputation'));
    for (const [faction, amt] of Object.entries(st.reputation)) {
      repBlock.appendChild(el('div', { class: 'dw-stat-row2' }, el('span', null, faction[0].toUpperCase() + faction.slice(1)), el('span', null, fmtNum(amt))));
    }

    titlesBlock.innerHTML = '';
    titlesBlock.appendChild(el('b', null, 'Titles'));
    const select = el('select', { class: 'dw-select', style: { width: '100%', marginTop: '4px' } },
      el('option', { value: '' }, '(none)'),
      ...st.titles.map((t) => el('option', { value: t, selected: st.activeTitle === t }, t)));
    select.addEventListener('change', () => session.dispatch({ type: 'setTitle', title: select.value || null }));
    titlesBlock.appendChild(select);

    petBlock.innerHTML = '';
    petBlock.appendChild(el('b', null, 'Companion'));
    const petItemId = st.activePet;
    const petDef = petItemId ? ITEMS[petItemId] : undefined;
    if (petDef?.pet) {
      const row = el('div', {
        class: 'dw-slot', style: { width: '42px', height: '42px', marginTop: '4px', cursor: 'pointer' },
        title: 'Click to dismiss',
        onclick: () => session.dispatch({ type: 'summonPet', itemId: null }),
      }, el('img', { src: safeItemIcon(petDef) }));
      attachTooltip(row, () => buildItemTooltip(st, { uid: 'pet-preview', itemId: petItemId!, qty: 1 }));
      petBlock.appendChild(el('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' } },
        row, el('div', {}, el('div', null, petDef.name), el('div', { style: { fontSize: '10.5px', color: 'var(--dw-bone-dim)' } }, 'Click to dismiss'))));
    } else {
      petBlock.appendChild(el('div', { style: { color: 'var(--dw-bone-dim)', fontSize: '11.5px', marginTop: '4px' } }, 'No active pet — double-click one in your Inventory to summon it.'));
    }

    countersBlock.innerHTML = '';
    const c = st.counters;
    countersBlock.appendChild(el('div', null, `Kills: ${fmtNum(c.kills)}  ·  Deaths: ${fmtNum(c.deaths)}  ·  Boss kills: ${fmtNum(c.bossKills)}`));
    countersBlock.appendChild(el('div', null, `Crafted: ${fmtNum(c.crafted)}  ·  Gathered: ${fmtNum(c.gathered)}`));
    countersBlock.appendChild(el('div', null, `Gold earned: ${fmtNum(c.goldEarned)}  ·  Playtime: ${fmtPlaytime(c.playTimeMs)}`));
  }

  wm.track(bus.on('state', render));
  render();
  return ctrl;
}
