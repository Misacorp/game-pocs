import type { CharacterState, ItemInstance, DerivedStatKey, EquipSlot } from '@shared/types';
import { ITEMS, SETS } from '@shared/data';
import { getItemStats, rarityOf } from '@shared/logic';
import { RARITY_COLORS } from '@shared/constants';
import { el } from './dom';
import { statLabel, formatStatValue } from './statsFormat';

const CATEGORY_LABEL: Record<string, string> = { equip: 'Equipment', use: 'Consumable', etc: 'Material / Quest Item' };

/** Builds the full rich tooltip content nodes for an item instance. */
export function buildItemTooltip(state: CharacterState, inst: ItemInstance, opts: { compareEquipped?: boolean } = {}): (Node | string)[] {
  const def = ITEMS[inst.itemId];
  const rarity = rarityOf(inst);
  const color = RARITY_COLORS[rarity] ?? '#e8e8e8';
  const nodes: (Node | string)[] = [];

  const stars = inst.stars ?? 0;
  const nameText = (def?.name ?? '??? Unknown Item') + (stars > 0 ? ` ${'★'.repeat(Math.min(stars, 15))}` : '');
  nodes.push(el('div', { class: 'dw-tt-name', style: { color } }, nameText));

  if (!def) {
    nodes.push(el('div', { class: 'dw-tt-sub' }, `id: ${inst.itemId}`));
    return nodes;
  }

  const subBits: string[] = [];
  if (def.category === 'equip' && def.equip) subBits.push(capitalize(def.equip.slot));
  else subBits.push(CATEGORY_LABEL[def.category] ?? def.category);
  if (def.equip?.weaponType) subBits.push(capitalize(def.equip.weaponType));
  subBits.push(capitalize(rarity));
  nodes.push(el('div', { class: 'dw-tt-sub' }, subBits.join(' · ')));

  // Requirements
  const reqBits: (Node | string)[] = [];
  if (def.levelReq) {
    const unmet = state.level < def.levelReq;
    reqBits.push(el('div', { class: unmet ? 'dw-tt-unmet' : '' }, `Requires Level ${def.levelReq}`));
  }
  if (def.classReq && def.classReq.length) {
    const unmet = !def.classReq.includes(state.classId);
    reqBits.push(el('div', { class: unmet ? 'dw-tt-unmet' : '' }, `Class: ${def.classReq.map(capitalize).join(', ')}`));
  }
  if (reqBits.length) { nodes.push(el('hr')); nodes.push(...reqBits); }

  // Stats (with comparison to currently equipped item in the same slot)
  if (def.equip) {
    const mine = getItemStats(inst);
    const keys = Object.keys(mine) as DerivedStatKey[];
    let equippedStats: Partial<Record<DerivedStatKey, number>> | null = null;
    if (opts.compareEquipped !== false) {
      const equippedInst = state.equipment[def.equip.slot];
      if (equippedInst && equippedInst.uid !== inst.uid) equippedStats = getItemStats(equippedInst) as any;
    }
    if (keys.length) {
      nodes.push(el('hr'));
      for (const k of keys) {
        const v = (mine as any)[k] ?? 0;
        if (!v) continue;
        const row = el('div', { class: 'dw-stat-row' }, el('span', null, statLabel(k)), el('span', null, formatStatValue(k, v, true)));
        if (equippedStats) {
          const ev = equippedStats[k] ?? 0;
          const delta = v - ev;
          if (Math.abs(delta) > 1e-9) {
            row.appendChild(el('span', { class: delta > 0 ? 'dw-tt-delta-pos' : 'dw-tt-delta-neg' }, ` (${delta > 0 ? '+' : ''}${formatStatValue(k, delta)})`));
          }
        }
        nodes.push(row);
      }
    }
    if (inst.bonus && Object.keys(inst.bonus).length) {
      nodes.push(el('div', { class: 'dw-tt-sub', style: { marginTop: '4px' } }, 'Bonus lines:'));
      for (const k in inst.bonus) {
        const v = (inst.bonus as any)[k];
        if (!v) continue;
        nodes.push(el('div', { class: 'dw-stat-row', style: { color: '#6fdc6f' } }, el('span', null, statLabel(k as DerivedStatKey)), el('span', null, formatStatValue(k as DerivedStatKey, v, true))));
      }
    }
    if (def.equip.setId) {
      const set = SETS[def.equip.setId];
      if (set) {
        nodes.push(el('hr'));
        const owned = countSetPiecesOwned(state, set.pieces);
        nodes.push(el('div', { class: 'dw-tt-sub' }, `${set.name} (${owned}/${set.pieces.length})`));
        for (const b of set.bonuses) {
          const active = owned >= b.count;
          const line = Object.entries(b.stats).map(([k, v]) => `${statLabel(k as DerivedStatKey)} ${formatStatValue(k as DerivedStatKey, v as number, true)}`).join(', ');
          nodes.push(el('div', { style: { color: active ? '#6fdc6f' : '#8a90a0', fontSize: '11.5px' } }, `(${b.count}) ${line}`));
        }
      }
    }
    nodes.push(el('div', { class: 'dw-tt-sub', style: { marginTop: '4px' } }, `Enhance: ${stars} / ${def.equip.maxStars ?? 10}`));
  }

  if (def.use) {
    nodes.push(el('hr'));
    const u = def.use;
    if (u.heal) {
      const bits: string[] = [];
      if (u.heal.hp) bits.push(`+${u.heal.hp} HP`);
      if (u.heal.mp) bits.push(`+${u.heal.mp} MP`);
      if (u.heal.hpPct) bits.push(`+${Math.round(u.heal.hpPct * 100)}% HP`);
      if (u.heal.mpPct) bits.push(`+${Math.round(u.heal.mpPct * 100)}% MP`);
      nodes.push(el('div', null, bits.join(', ')));
    }
    if (u.buff) nodes.push(el('div', null, `Buff: ${u.buff.name} (${Math.round(u.buff.durationMs / 1000)}s)`));
    if (u.teleport) nodes.push(el('div', null, 'Teleports to town.'));
  }

  if (def.description) nodes.push(el('div', { class: 'dw-tt-desc' }, def.description));

  const stackBits: string[] = [];
  if (inst.qty > 1 || def.stack > 1) stackBits.push(`x${inst.qty}`);
  if (def.sellPrice) stackBits.push(`Sell: ${def.sellPrice}g`);
  if (def.quest) stackBits.push('Quest Item');
  if (stackBits.length) nodes.push(el('div', { class: 'dw-tt-sub', style: { marginTop: '4px' } }, stackBits.join(' · ')));

  return nodes;
}

function countSetPiecesOwned(state: CharacterState, pieces: string[]): number {
  let n = 0;
  for (const slot of Object.keys(state.equipment) as EquipSlot[]) {
    const inst = state.equipment[slot];
    if (inst && pieces.includes(inst.itemId)) n++;
  }
  return n;
}

function capitalize(s: string): string { return s.length ? s[0].toUpperCase() + s.slice(1) : s; }
