import type { CharacterState, InventoryTab, ItemInstance, Rarity, StatMods } from '../types';
import { ITEMS, JOBS } from '../data';
import { ENHANCE_STAT_PER_STAR, ENHANCE_SUCCESS, RARITY_MAX_STARS } from '../constants';

/** Total stats an item instance grants: base equip stats + rolled bonus lines + star bonus. */
export function getItemStats(inst: ItemInstance): StatMods {
  const def = ITEMS[inst.itemId];
  const out: StatMods = {};
  if (!def?.equip) return out;
  const add = (key: keyof StatMods, val: number | undefined) => {
    if (!val) return;
    out[key] = (out[key] ?? 0) + val;
  };
  const base = def.equip.stats;
  for (const k in base) add(k as keyof StatMods, base[k as keyof StatMods]);
  if (inst.bonus) for (const k in inst.bonus) add(k as keyof StatMods, inst.bonus[k as keyof StatMods]);
  const stars = inst.stars ?? 0;
  if (stars > 0) {
    for (const statKey of ['attack', 'magicAttack', 'defense'] as const) {
      const baseVal = base[statKey];
      if (baseVal) {
        const perStar = Math.max(1, Math.round(baseVal * ENHANCE_STAT_PER_STAR));
        add(statKey, perStar * stars);
      }
    }
  }
  return out;
}

/** Effective rarity of an instance (rolled rarity overrides the item def's base rarity). */
export function rarityOf(inst: ItemInstance): Rarity {
  return inst.rarity ?? ITEMS[inst.itemId]?.rarity ?? 'common';
}

/** Max enhancement stars usable on this instance (item override, else by rarity). */
export function maxStarsFor(inst: ItemInstance): number {
  const def = ITEMS[inst.itemId];
  return def?.equip?.maxStars ?? RARITY_MAX_STARS[rarityOf(inst)];
}

/** Can this character equip the instance? Checks level, class, and weapon-type requirements. */
export function canEquip(state: CharacterState, inst: ItemInstance): { ok: boolean; reason?: string } {
  const def = ITEMS[inst.itemId];
  if (!def?.equip) return { ok: false, reason: 'Not equipment' };
  if (def.levelReq && state.level < def.levelReq) return { ok: false, reason: `Requires level ${def.levelReq}` };
  if (def.classReq && def.classReq.length && !def.classReq.includes(state.classId)) {
    return { ok: false, reason: 'Your class cannot use this' };
  }
  if (def.equip.weaponType) {
    const job = JOBS[state.jobId];
    const tier1 = JOBS[state.classId];
    const allowed = new Set<string>([...(job?.weaponTypes ?? []), ...(tier1?.weaponTypes ?? [])]);
    if (!allowed.has(def.equip.weaponType)) return { ok: false, reason: 'You cannot use this weapon type' };
  }
  return { ok: true };
}

/** Success chance (0..1) of enhancing inst with the given stone. */
export function enhanceChance(inst: ItemInstance, stoneItemId: string): number {
  const stars = inst.stars ?? 0;
  const base = ENHANCE_SUCCESS[Math.min(stars, ENHANCE_SUCCESS.length - 1)] ?? 0.1;
  const stone = ITEMS[stoneItemId];
  const tierBonus = stone?.enhanceStone ? stone.enhanceStone.tier * 0.03 : 0;
  return Math.min(0.99, Math.max(0.02, base + tierBonus));
}

/** Count of an item across inventory tabs. */
export function countItem(state: CharacterState, itemId: string): number {
  let n = 0;
  for (const tab of Object.values(state.inventory)) for (const s of tab) if (s && s.itemId === itemId) n += s.qty;
  return n;
}

/** Find an instance by uid in inventory or equipment. */
export function findInstance(state: CharacterState, uid: string): ItemInstance | null {
  for (const tab of Object.values(state.inventory)) for (const s of tab) if (s && s.uid === uid) return s;
  for (const s of Object.values(state.equipment)) if (s && s.uid === uid) return s;
  return null;
}

export function isQuestItem(itemId: string): boolean {
  return !!ITEMS[itemId]?.quest;
}

export function hasFreeSlot(state: CharacterState, tab: InventoryTab): boolean {
  return state.inventory[tab].some((s) => s === null);
}

/** Place an already-built ItemInstance into the first free slot of a tab (no stacking/uid churn). */
export function placeInInventory(state: CharacterState, inst: ItemInstance, tab: InventoryTab): { ok: boolean; error?: string } {
  const arr = state.inventory[tab];
  const idx = arr.findIndex((s) => s === null);
  if (idx === -1) return { ok: false, error: 'Inventory full' };
  arr[idx] = inst;
  return { ok: true };
}

/**
 * Shallow-clone just the inventory tabs (slot objects copied too, since addItem/removeItem
 * mutate `slot.qty` in place). Used to dry-run a batch of grants/removals against a scratch
 * copy of the inventory before committing them to real state, so a caller can check "will this
 * all fit?" without ever risking losing an item to a full inventory.
 */
export function cloneInventory(inv: CharacterState['inventory']): CharacterState['inventory'] {
  return {
    equip: inv.equip.map((s) => (s ? { ...s } : null)),
    use: inv.use.map((s) => (s ? { ...s } : null)),
    etc: inv.etc.map((s) => (s ? { ...s } : null)),
  };
}

export interface AddItemOpts { bonus?: StatMods; stars?: number; rarity?: Rarity; crafter?: string }

/**
 * Add `qty` of an item to the character's inventory, stacking into existing partial stacks first,
 * then filling free slots in the item's tab. Equipment / rolled instances never stack.
 * Mutates `state` in place (caller is expected to have cloned it already).
 */
export function addItem(state: CharacterState, itemId: string, qty: number, uidFn: () => string, opts?: AddItemOpts): { ok: boolean; error?: string } {
  const def = ITEMS[itemId];
  if (!def) return { ok: false, error: 'Unknown item' };
  if (qty <= 0) return { ok: true };
  const tab = state.inventory[def.category];
  const rolled = !!(opts && (opts.bonus || opts.stars || opts.rarity || opts.crafter));
  const isUnstackable = def.category === 'equip' || def.stack <= 1 || rolled;
  let remaining = qty;

  if (!isUnstackable) {
    for (let i = 0; i < tab.length && remaining > 0; i++) {
      const slot = tab[i];
      if (slot && slot.itemId === itemId && slot.qty < def.stack) {
        const can = Math.min(def.stack - slot.qty, remaining);
        slot.qty += can;
        remaining -= can;
      }
    }
  }

  while (remaining > 0) {
    const idx = tab.findIndex((s) => s === null);
    if (idx === -1) return { ok: false, error: 'Inventory full' };
    const putQty = isUnstackable ? 1 : Math.min(def.stack, remaining);
    tab[idx] = {
      uid: uidFn(), itemId, qty: putQty,
      bonus: opts?.bonus, stars: opts?.stars, rarity: opts?.rarity, crafter: opts?.crafter,
    };
    remaining -= putQty;
  }
  return { ok: true };
}

export interface RemoveItemOpts { itemId?: string; uid?: string; qty?: number }

/** Remove items by uid (exact slot) or by itemId (across tabs, cheapest stacks first). */
export function removeItem(state: CharacterState, opts: RemoveItemOpts): { ok: boolean; error?: string; removedQty: number } {
  const qtyWanted = opts.qty ?? 1;
  if (opts.uid) {
    for (const tabName of ['equip', 'use', 'etc'] as InventoryTab[]) {
      const tab = state.inventory[tabName];
      const idx = tab.findIndex((s) => s?.uid === opts.uid);
      if (idx !== -1) {
        const slot = tab[idx]!;
        const remove = Math.min(slot.qty, qtyWanted);
        slot.qty -= remove;
        if (slot.qty <= 0) tab[idx] = null;
        return { ok: true, removedQty: remove };
      }
    }
    return { ok: false, error: 'Item not found', removedQty: 0 };
  }
  if (opts.itemId) {
    let remaining = qtyWanted;
    for (const tabName of ['use', 'etc', 'equip'] as InventoryTab[]) {
      const tab = state.inventory[tabName];
      for (let i = 0; i < tab.length && remaining > 0; i++) {
        const slot = tab[i];
        if (slot && slot.itemId === opts.itemId) {
          const take = Math.min(slot.qty, remaining);
          slot.qty -= take;
          remaining -= take;
          if (slot.qty <= 0) tab[i] = null;
        }
      }
    }
    const removed = qtyWanted - remaining;
    if (removed <= 0) return { ok: false, error: 'Item not found', removedQty: 0 };
    return { ok: true, removedQty: removed };
  }
  return { ok: false, error: 'Nothing to remove', removedQty: 0 };
}
