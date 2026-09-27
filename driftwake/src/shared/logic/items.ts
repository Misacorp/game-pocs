import type { CharacterState, ItemInstance, Rarity, StatMods } from '../types';
import { ITEMS } from '../data';

/** Total stats an item instance grants: base stats + bonus lines + star bonus. STUB. */
export function getItemStats(inst: ItemInstance): StatMods {
  const def = ITEMS[inst.itemId];
  return { ...(def?.equip?.stats ?? {}) };
}

/** Effective rarity of an instance. */
export function rarityOf(inst: ItemInstance): Rarity {
  return inst.rarity ?? ITEMS[inst.itemId]?.rarity ?? 'common';
}

/** Can this character equip the instance? STUB. */
export function canEquip(_state: CharacterState, inst: ItemInstance): { ok: boolean; reason?: string } {
  return ITEMS[inst.itemId]?.equip ? { ok: true } : { ok: false, reason: 'Not equipment' };
}

/** Count of an item across inventory tabs. */
export function countItem(state: CharacterState, itemId: string): number {
  let n = 0;
  for (const tab of Object.values(state.inventory)) for (const s of tab) if (s && s.itemId === itemId) n += s.qty;
  return n;
}

/** Success chance (0..1) of enhancing inst with the given stone. STUB. */
export function enhanceChance(_inst: ItemInstance, _stoneItemId: string): number { return 0.5; }

/** Find an instance by uid in inventory or equipment. */
export function findInstance(state: CharacterState, uid: string): ItemInstance | null {
  for (const tab of Object.values(state.inventory)) for (const s of tab) if (s && s.uid === uid) return s;
  for (const s of Object.values(state.equipment)) if (s && s.uid === uid) return s;
  return null;
}
