import type { ClassId, EquipSlot, ItemDef, Rarity, StatKey, WeaponType } from '../../types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const RARITY_MULT: Record<Rarity, number> = { common: 1, uncommon: 1.3, rare: 1.7, epic: 2.4, legendary: 3.6 };
const RANDOM_LINES: Record<Rarity, number> = { common: 0, uncommon: 1, rare: 2, epic: 2, legendary: 2 };

function sell(level: number, rarity: Rarity): number {
  return Math.round((5 + level * 6) * RARITY_MULT[rarity]);
}
function buy(sellPrice: number): number {
  return sellPrice * 5;
}
function physAtk(level: number, mult = 1): number {
  return Math.round((10 + 2.0 * level) * mult);
}
function magAtk(level: number): number {
  return Math.round(12 + 2.3 * level);
}
function statBonus(level: number): number {
  return Math.max(1, Math.round(level / 5));
}

const CLASS_MAIN: Record<ClassId, StatKey> = { vanguard: 'str', stormcaller: 'int', windrunner: 'dex', shade: 'luk' };
const CLASS_SECOND: Record<ClassId, StatKey> = { vanguard: 'dex', stormcaller: 'luk', windrunner: 'str', shade: 'dex' };

// ---------------------------------------------------------------------------
// Weapon tiers (region material progression)
// ---------------------------------------------------------------------------

interface WeaponTier {
  level: number;
  material: string;
  rarity: Rarity;
  colors: [string, string, string];
  flavor: string;
}

const WEAPON_TIERS: WeaponTier[] = [
  { level: 1, material: 'Driftwood', rarity: 'common', colors: ['#8b6b4a', '#6f9b7a', '#c9a869'], flavor: "Whittled from Oma's own driftwood, still smelling faintly of salt." },
  { level: 5, material: 'Barnacle', rarity: 'common', colors: ['#6f8f8a', '#8b6b4a', '#d8cdb0'], flavor: 'Barnacle-crusted and sea-worn, tougher than it looks.' },
  { level: 10, material: 'Kelpwoven', rarity: 'uncommon', colors: ['#2f8f5c', '#d99a3c', '#1f6b45'], flavor: 'Woven from living kelp fibers that never quite stop swaying.' },
  { level: 15, material: 'Amberlit', rarity: 'uncommon', colors: ['#d99a3c', '#5a7a3c', '#f0c070'], flavor: 'Set with beads of hardened amber, warm to the touch.' },
  { level: 20, material: 'Stormsteel', rarity: 'uncommon', colors: ['#5a6b7a', '#cfe0ee', '#4fd1ff'], flavor: 'Forged from stormsteel quenched mid-squall on the Gale cliffs.' },
  { level: 25, material: 'Galewrought', rarity: 'rare', colors: ['#cfe0ee', '#5a6b7a', '#4fd1ff'], flavor: 'Fitted with storm-roc feathers that hum faintly in high wind.' },
  { level: 30, material: 'Coralbright', rarity: 'rare', colors: ['#ff7f8a', '#3fe0c8', '#f0e6d2'], flavor: 'Grown from living reef coral, faintly bioluminescent in the dark.' },
  { level: 35, material: 'Voidforged', rarity: 'rare', colors: ['#5a3f7a', '#3a1f4a', '#8a5fd0'], flavor: 'Shaped from voidstone pulled out of the Hollow, humming with quiet dread.' },
];

interface WeaponTypeCfg {
  type: WeaponType;
  noun: string;
  classId: ClassId;
  magic?: boolean;
  mult?: number;
}

const WEAPON_TYPES: WeaponTypeCfg[] = [
  { type: 'sword', noun: 'Saber', classId: 'vanguard' },
  { type: 'axe', noun: 'Cleaver', classId: 'vanguard', mult: 1.10 },
  { type: 'staff', noun: 'Staff', classId: 'stormcaller', magic: true },
  { type: 'wand', noun: 'Wand', classId: 'stormcaller', magic: true },
  { type: 'bow', noun: 'Bow', classId: 'windrunner' },
  { type: 'gun', noun: 'Flinter', classId: 'windrunner', mult: 1.08 },
  { type: 'dagger', noun: 'Fang', classId: 'shade' },
  { type: 'knives', noun: 'Knives', classId: 'shade' },
];

function weaponIcon(type: WeaponType, colors: [string, string, string]) {
  return { shape: type, colors };
}

function baseWeaponStats(level: number, cfg: WeaponTypeCfg) {
  const stats: Record<string, number> = {};
  const mainStat = CLASS_MAIN[cfg.classId];
  const bonus = statBonus(level);
  if (cfg.magic) {
    stats.magicAttack = magAtk(level);
    stats.attack = Math.max(1, Math.round(level * 0.3));
    if (cfg.type === 'wand') stats.int = bonus; // wand gets an extra INT line
  } else {
    stats.attack = physAtk(level, cfg.mult ?? 1);
  }
  stats[mainStat] = (stats[mainStat] ?? 0) + bonus;
  if (level >= 20) {
    const secondStat = CLASS_SECOND[cfg.classId];
    stats[secondStat] = (stats[secondStat] ?? 0) + Math.max(1, Math.floor(bonus / 2));
  }
  return stats;
}

const WORLD_WEAPONS: ItemDef[] = [];
for (const tier of WEAPON_TIERS) {
  for (const wt of WEAPON_TYPES) {
    const id = `eq_${wt.type}_${tier.material.toLowerCase()}`;
    const name = `${tier.material} ${wt.noun}`;
    const sellPrice = sell(tier.level, tier.rarity);
    WORLD_WEAPONS.push({
      id,
      name,
      description: `${tier.flavor} A ${wt.type} favored by ${wt.classId}s who've passed through the region.`,
      category: 'equip',
      rarity: tier.rarity,
      icon: weaponIcon(wt.type, tier.colors),
      stack: 1,
      sellPrice,
      buyPrice: buy(sellPrice),
      levelReq: tier.level,
      classReq: [wt.classId],
      equip: {
        slot: 'weapon',
        weaponType: wt.type,
        stats: baseWeaponStats(tier.level, wt),
        randomLines: RANDOM_LINES[tier.rarity],
      },
      tags: ['worlddrop'],
    });
  }
}

// Crafted weapon upgrades (Smithing), at tiers 5/15/25/35, +15% stats, better min rarity.
const CRAFTED_WEAPON_TIERS = WEAPON_TIERS.filter((t) => [5, 15, 25, 35].includes(t.level));
const CRAFTED_WEAPONS: ItemDef[] = [];
for (const tier of CRAFTED_WEAPON_TIERS) {
  for (const wt of WEAPON_TYPES) {
    const id = `eq_${wt.type}_${tier.material.toLowerCase()}_forged`;
    const name = `Forged ${tier.material} ${wt.noun}`;
    const craftedRarity: Rarity = tier.level >= 25 ? 'rare' : 'uncommon';
    const base = baseWeaponStats(tier.level, wt);
    const stats: Record<string, number> = {};
    for (const k of Object.keys(base)) stats[k] = Math.round(base[k] * 1.15);
    const sellPrice = sell(tier.level, craftedRarity);
    CRAFTED_WEAPONS.push({
      id,
      name,
      description: `A masterwork ${wt.type}, reforged and tempered by a Driftmoor smith beyond what nature alone provides.`,
      category: 'equip',
      rarity: craftedRarity,
      icon: weaponIcon(wt.type, tier.colors),
      stack: 1,
      sellPrice,
      buyPrice: buy(sellPrice),
      levelReq: tier.level,
      classReq: [wt.classId],
      equip: {
        slot: 'weapon',
        weaponType: wt.type,
        stats,
        randomLines: RANDOM_LINES[craftedRarity] + 1,
      },
      tags: ['crafted'],
    });
  }
}

// Starter weapons (referenced by classes.ts starterItems)
const STARTER_WEAPONS: ItemDef[] = [
  { id: 'eq_sword_training', name: 'Training Sword', description: 'A dull practice blade every Vanguard recruit swings first.', category: 'equip', rarity: 'common', icon: { shape: 'sword', colors: ['#9a9a9a', '#6f6f6f', '#c9c9c9'] }, stack: 1, sellPrice: 1, levelReq: 1, classReq: ['vanguard'], equip: { slot: 'weapon', weaponType: 'sword', stats: { attack: 10 } }, tags: ['worlddrop'] },
  { id: 'eq_staff_training', name: 'Training Staff', description: 'A knobbly branch that barely holds a spark, but it holds one.', category: 'equip', rarity: 'common', icon: { shape: 'staff', colors: ['#9a9a9a', '#6f6f6f', '#c9c9c9'] }, stack: 1, sellPrice: 1, levelReq: 1, classReq: ['stormcaller'], equip: { slot: 'weapon', weaponType: 'staff', stats: { magicAttack: 12 } }, tags: ['worlddrop'] },
  { id: 'eq_bow_training', name: 'Training Bow', description: 'Strung with plain cord; Kestrel says the arrows are the important part.', category: 'equip', rarity: 'common', icon: { shape: 'bow', colors: ['#9a9a9a', '#6f6f6f', '#c9c9c9'] }, stack: 1, sellPrice: 1, levelReq: 1, classReq: ['windrunner'], equip: { slot: 'weapon', weaponType: 'bow', stats: { attack: 10 } }, tags: ['worlddrop'] },
  { id: 'eq_dagger_training', name: 'Training Dagger', description: 'Blunted on purpose. Whisper insists you still find a way to draw blood.', category: 'equip', rarity: 'common', icon: { shape: 'dagger', colors: ['#9a9a9a', '#6f6f6f', '#c9c9c9'] }, stack: 1, sellPrice: 1, levelReq: 1, classReq: ['shade'], equip: { slot: 'weapon', weaponType: 'dagger', stats: { attack: 10 } }, tags: ['worlddrop'] },
];

// ---------------------------------------------------------------------------
// Armor (Plate / Robe / Leather archetypes at tiers 1, 10, 20, 30)
// ---------------------------------------------------------------------------

interface ArmorTier {
  level: number;
  rarity: Rarity;
  flavor: string;
  plate: { mat: string; colors: [string, string, string] };
  robe: { mat: string; colors: [string, string, string] };
  leather: { mat: string; colors: [string, string, string] };
}

const ARMOR_TIERS: ArmorTier[] = [
  {
    level: 1, rarity: 'common', flavor: 'Driftmoor-made, patched with whatever the tidewrack offered.',
    plate: { mat: 'Barnacle', colors: ['#6f8f8a', '#8b6b4a', '#d8cdb0'] },
    robe: { mat: 'Mossweave', colors: ['#7a9b5c', '#8b6b4a', '#c9a869'] },
    leather: { mat: 'Driftleather', colors: ['#8b6b4a', '#6f9b7a', '#c9a869'] },
  },
  {
    level: 10, rarity: 'uncommon', flavor: 'Cut and stitched from Finreach kelp-forest harvests.',
    plate: { mat: 'Kelpshell', colors: ['#2f8f5c', '#1f6b45', '#d99a3c'] },
    robe: { mat: 'Tidewoven', colors: ['#3f8f5c', '#d99a3c', '#2f6b45'] },
    leather: { mat: 'Vinewrap', colors: ['#5a7a3c', '#3f8f5c', '#d99a3c'] },
  },
  {
    level: 20, rarity: 'uncommon', flavor: 'Riveted stormsteel and windproofed cloth from Gale Outpost.',
    plate: { mat: 'Stormplate', colors: ['#5a6b7a', '#4fd1ff', '#cfe0ee'] },
    robe: { mat: 'Cloudsilk', colors: ['#cfe0ee', '#5a6b7a', '#4fd1ff'] },
    leather: { mat: 'Galehide', colors: ['#cfe0ee', '#5a6b7a', '#4fd1ff'] },
  },
  {
    level: 30, rarity: 'rare', flavor: 'Set with living coral and pearl, faintly warm even in the dark reef.',
    plate: { mat: 'Coralguard', colors: ['#ff7f8a', '#3fe0c8', '#f0e6d2'] },
    robe: { mat: 'Pearlsilk', colors: ['#f0e6d2', '#ff7f8a', '#3fe0c8'] },
    leather: { mat: 'Glowhide', colors: ['#3fe0c8', '#ff7f8a', '#f0e6d2'] },
  },
];

const SLOT_MULT: Record<Extract<EquipSlot, 'helmet' | 'armor' | 'gloves' | 'boots'>, number> = {
  helmet: 1.0, armor: 1.6, gloves: 0.7, boots: 0.7,
};
const ARMOR_SLOTS: Extract<EquipSlot, 'helmet' | 'armor' | 'gloves' | 'boots'>[] = ['helmet', 'armor', 'gloves', 'boots'];

function defenseFor(level: number, slot: string): number {
  return Math.max(1, Math.round((2 + 0.9 * level) * SLOT_MULT[slot as keyof typeof SLOT_MULT]));
}

const ARMOR_ITEMS: ItemDef[] = [];
const CRAFTED_ARMOR: ItemDef[] = [];

for (const tier of ARMOR_TIERS) {
  const bonus = statBonus(tier.level);
  for (const slot of ARMOR_SLOTS) {
    const def = defenseFor(tier.level, slot);
    const sellPrice = sell(tier.level, tier.rarity);

    // Plate (vanguard): defense + maxHp
    const plateHp = slot === 'armor' ? Math.round(tier.level * 2) : slot === 'helmet' ? Math.round(tier.level * 1) : Math.round(tier.level * 0.6);
    ARMOR_ITEMS.push({
      id: `eq_${slot}_${tier.plate.mat.toLowerCase()}`,
      name: `${tier.plate.mat} ${slotName(slot)}`,
      description: `${tier.flavor} Heavy vanguard plate, riveted for the front line.`,
      category: 'equip', rarity: tier.rarity, icon: { shape: slot, colors: tier.plate.colors }, stack: 1,
      sellPrice, buyPrice: buy(sellPrice), levelReq: tier.level, classReq: ['vanguard'],
      equip: { slot, stats: { defense: def, maxHp: plateHp }, randomLines: RANDOM_LINES[tier.rarity] },
      tags: ['worlddrop'],
    });

    // Robe (stormcaller): defense + maxMp + small int
    const robeMp = slot === 'armor' ? Math.round(tier.level * 2) : slot === 'helmet' ? Math.round(tier.level * 1) : Math.round(tier.level * 0.6);
    ARMOR_ITEMS.push({
      id: `eq_${slot}_${tier.robe.mat.toLowerCase()}`,
      name: `${tier.robe.mat} ${slotName(slot)}`,
      description: `${tier.flavor} Light robing that keeps a caster's channel steady.`,
      category: 'equip', rarity: tier.rarity, icon: { shape: slot, colors: tier.robe.colors }, stack: 1,
      sellPrice, buyPrice: buy(sellPrice), levelReq: tier.level, classReq: ['stormcaller'],
      equip: { slot, stats: { defense: Math.max(1, Math.round(def * 0.8)), maxMp: robeMp, int: Math.max(1, Math.floor(bonus / 2)) }, randomLines: RANDOM_LINES[tier.rarity] },
      tags: ['worlddrop'],
    });

    // Leather (windrunner & shade): defense + dex + speed/avoid flavor
    const leatherStats: Record<string, number> = { defense: Math.max(1, Math.round(def * 0.9)), dex: bonus };
    if (slot === 'boots') leatherStats.speed = Math.round(tier.level / 4);
    if (slot === 'gloves') leatherStats.critRate = Math.round(tier.level * 0.08) / 100;
    ARMOR_ITEMS.push({
      id: `eq_${slot}_${tier.leather.mat.toLowerCase()}`,
      name: `${tier.leather.mat} ${slotName(slot)}`,
      description: `${tier.flavor} Supple leatherwork built for quiet footing.`,
      category: 'equip', rarity: tier.rarity, icon: { shape: slot, colors: tier.leather.colors }, stack: 1,
      sellPrice, buyPrice: buy(sellPrice), levelReq: tier.level, classReq: ['windrunner', 'shade'],
      equip: { slot, stats: leatherStats, randomLines: RANDOM_LINES[tier.rarity] },
      tags: ['worlddrop'],
    });
  }
}

function slotName(slot: string): string {
  switch (slot) {
    case 'helmet': return 'Helm';
    case 'armor': return 'Chestwrap';
    case 'gloves': return 'Gloves';
    case 'boots': return 'Boots';
    default: return slot;
  }
}

// Crafted armor (Smithing): Plate & Leather at tier 20 only, +15% stats.
const T20 = ARMOR_TIERS.find((t) => t.level === 20)!;
for (const slot of ARMOR_SLOTS) {
  const def = Math.round(defenseFor(20, slot) * 1.15);
  const hp = Math.round((slot === 'armor' ? 20 * 2 : slot === 'helmet' ? 20 : 20 * 0.6) * 1.15);
  const sellPrice = sell(20, 'rare');
  CRAFTED_ARMOR.push({
    id: `eq_${slot}_${T20.plate.mat.toLowerCase()}_forged`,
    name: `Reinforced ${T20.plate.mat} ${slotName(slot)}`,
    description: 'Smithed and double-riveted at Brina\'s forge; sturdier than anything the field turns up.',
    category: 'equip', rarity: 'rare', icon: { shape: slot, colors: T20.plate.colors }, stack: 1,
    sellPrice, buyPrice: buy(sellPrice), levelReq: 20, classReq: ['vanguard'],
    equip: { slot, stats: { defense: def, maxHp: hp }, randomLines: RANDOM_LINES.rare + 1 },
    tags: ['crafted'],
  });
  const leatherDef = Math.round(defenseFor(20, slot) * 0.9 * 1.15);
  const leatherStats: Record<string, number> = { defense: leatherDef, dex: statBonus(20) + 1 };
  if (slot === 'boots') leatherStats.speed = Math.round(20 / 4) + 2;
  if (slot === 'gloves') leatherStats.critRate = Math.round(20 * 0.08) / 100 + 0.01;
  CRAFTED_ARMOR.push({
    id: `eq_${slot}_${T20.leather.mat.toLowerCase()}_forged`,
    name: `Reinforced ${T20.leather.mat} ${slotName(slot)}`,
    description: 'Re-tanned and lined at Brina\'s forge for the outpost\'s scouts and skirmishers.',
    category: 'equip', rarity: 'rare', icon: { shape: slot, colors: T20.leather.colors }, stack: 1,
    sellPrice, buyPrice: buy(sellPrice), levelReq: 20, classReq: ['windrunner', 'shade'],
    equip: { slot, stats: leatherStats, randomLines: RANDOM_LINES.rare + 1 },
    tags: ['crafted'],
  });
}

// Traveler set (everyone, level 1)
const TRAVELER: ItemDef[] = [
  { id: 'eq_armor_traveler', name: "Traveler's Tunic", description: "Plain and durable — Pell hands one to every kid who leaves the meadows.", category: 'equip', rarity: 'common', icon: { shape: 'armor', colors: ['#8b6b4a', '#c9a869', '#6f9b7a'] }, stack: 1, sellPrice: 3, buyPrice: 15, levelReq: 1, equip: { slot: 'armor', stats: { defense: 3 } }, tags: ['worlddrop'] },
  { id: 'eq_boots_traveler', name: "Traveler's Boots", description: 'Broken in over a hundred meadow trails.', category: 'equip', rarity: 'common', icon: { shape: 'boots', colors: ['#8b6b4a', '#c9a869', '#6f9b7a'] }, stack: 1, sellPrice: 2, buyPrice: 10, levelReq: 1, equip: { slot: 'boots', stats: { defense: 2 } }, tags: ['worlddrop'] },
];

// ---------------------------------------------------------------------------
// Accessories (rings & amulets, no classReq)
// ---------------------------------------------------------------------------

const ACCESSORIES: ItemDef[] = [
  { id: 'eq_ring_copper_band', name: 'Copper Band', description: 'A plain ring hammered from copper scrap. Better than bare fingers.', category: 'equip', rarity: 'common', icon: { shape: 'ring', colors: ['#c98a4a', '#e0a868', '#8b5a2a'] }, stack: 1, sellPrice: sell(2, 'common'), buyPrice: buy(sell(2, 'common')), levelReq: 2, equip: { slot: 'ring', stats: { critRate: 0.02 } }, tags: ['worlddrop'] },
  { id: 'eq_ring_quartz_loop', name: 'Quartz Loop', description: 'Sera\'s first attempt at cutting stone — she keeps selling the "practice pieces."', category: 'equip', rarity: 'common', icon: { shape: 'ring', colors: ['#e8e8f0', '#c9c9e0', '#a0a0d0'] }, stack: 1, sellPrice: sell(3, 'common'), buyPrice: buy(sell(3, 'common')), levelReq: 3, equip: { slot: 'ring', stats: { str: 1, dex: 1, int: 1, luk: 1 } }, tags: ['crafted'] },
  { id: 'eq_amulet_shell_pendant', name: 'Shell Pendant', description: 'A snail shell on a cord. Dewbugs seem to leave you alone while you wear it.', category: 'equip', rarity: 'common', icon: { shape: 'amulet', colors: ['#d8cdb0', '#8b6b4a', '#c9a869'] }, stack: 1, sellPrice: sell(4, 'common'), buyPrice: buy(sell(4, 'common')), levelReq: 4, equip: { slot: 'amulet', stats: { maxHp: 15 } }, tags: ['worlddrop'] },
  { id: 'eq_ring_amber_drop', name: 'Amber Drop Ring', description: 'A single kelpwood-amber bead, cold and clear.', category: 'equip', rarity: 'uncommon', icon: { shape: 'ring', colors: ['#d99a3c', '#f0c070', '#8b5a2a'] }, stack: 1, sellPrice: sell(8, 'uncommon'), buyPrice: buy(sell(8, 'uncommon')), levelReq: 8, equip: { slot: 'ring', stats: { critRate: 0.03, dex: 2 }, randomLines: 1 }, tags: ['crafted'] },
  { id: 'eq_amulet_kelp_charm', name: 'Kelp Charm', description: 'Braided kelp fiber knotted around a chip of sky crystal.', category: 'equip', rarity: 'uncommon', icon: { shape: 'amulet', colors: ['#2f8f5c', '#1f6b45', '#d99a3c'] }, stack: 1, sellPrice: sell(9, 'uncommon'), buyPrice: buy(sell(9, 'uncommon')), levelReq: 9, equip: { slot: 'amulet', stats: { maxMp: 20, int: 2 }, randomLines: 1 }, tags: ['worlddrop'] },
  { id: 'eq_ring_tidepearl', name: 'Tidepearl Ring', description: 'A river-smooth pearl polished by Sera to catch the light just so.', category: 'equip', rarity: 'uncommon', icon: { shape: 'ring', colors: ['#f0e6d2', '#ff7f8a', '#3fe0c8'] }, stack: 1, sellPrice: sell(12, 'uncommon'), buyPrice: buy(sell(12, 'uncommon')), levelReq: 12, equip: { slot: 'ring', stats: { dropBonus: 0.03 }, randomLines: 1 }, tags: ['crafted'] },
  { id: 'eq_amulet_windbloom', name: 'Windbloom Pendant', description: 'A pressed windbloom flower sealed in resin; it never stops trembling slightly.', category: 'equip', rarity: 'uncommon', icon: { shape: 'amulet', colors: ['#cfe0ee', '#4fd1ff', '#5a6b7a'] }, stack: 1, sellPrice: sell(14, 'uncommon'), buyPrice: buy(sell(14, 'uncommon')), levelReq: 14, equip: { slot: 'amulet', stats: { speed: 3, jump: 2 }, randomLines: 1 }, tags: ['worlddrop'] },
  { id: 'eq_ring_skycrystal', name: 'Sky Crystal Ring', description: 'A shard of storm-charged crystal set in stormsteel banding.', category: 'equip', rarity: 'uncommon', icon: { shape: 'ring', colors: ['#4fd1ff', '#cfe0ee', '#5a6b7a'] }, stack: 1, sellPrice: sell(18, 'uncommon'), buyPrice: buy(sell(18, 'uncommon')), levelReq: 18, equip: { slot: 'ring', stats: { critRate: 0.04, critDamage: 0.03 }, randomLines: 1 }, tags: ['crafted'] },
  { id: 'eq_amulet_stormplume', name: 'Stormplume Amulet', description: 'A single storm-roc feather that never quite lies flat.', category: 'equip', rarity: 'uncommon', icon: { shape: 'amulet', colors: ['#cfe0ee', '#5a6b7a', '#4fd1ff'] }, stack: 1, sellPrice: sell(19, 'uncommon'), buyPrice: buy(sell(19, 'uncommon')), levelReq: 19, equip: { slot: 'amulet', stats: { attack: 6, magicAttack: 6 }, randomLines: 1 }, tags: ['worlddrop'] },
  { id: 'eq_ring_galewind', name: 'Galewind Band', description: 'Thin stormsteel wire twisted so tight it hums when you run.', category: 'equip', rarity: 'rare', icon: { shape: 'ring', colors: ['#cfe0ee', '#4fd1ff', '#5a6b7a'] }, stack: 1, sellPrice: sell(21, 'rare'), buyPrice: buy(sell(21, 'rare')), levelReq: 21, equip: { slot: 'ring', stats: { speed: 5, avoid: 0.03 }, randomLines: 2 }, tags: ['crafted'] },
  { id: 'eq_amulet_thundercore', name: 'Thundercore Pendant', description: 'A cracked golem-core still faintly warm, strung on chain.', category: 'equip', rarity: 'rare', icon: { shape: 'amulet', colors: ['#5a6b7a', '#4fd1ff', '#cfe0ee'] }, stack: 1, sellPrice: sell(22, 'rare'), buyPrice: buy(sell(22, 'rare')), levelReq: 22, equip: { slot: 'amulet', stats: { maxHp: 40, defense: 5 }, randomLines: 2 }, tags: ['worlddrop'] },
  { id: 'eq_ring_pearl_halo', name: 'Pearl Halo Ring', description: 'A ring of polished pearls, each catching bioluminescent light.', category: 'equip', rarity: 'rare', icon: { shape: 'ring', colors: ['#f0e6d2', '#ff7f8a', '#3fe0c8'] }, stack: 1, sellPrice: sell(26, 'rare'), buyPrice: buy(sell(26, 'rare')), levelReq: 26, equip: { slot: 'ring', stats: { xpBonus: 0.03 }, randomLines: 2 }, tags: ['crafted'] },
  { id: 'eq_amulet_glimmerscale', name: 'Glimmerscale Amulet', description: 'Glimmerfish scales layered like fine armor plate, edges razor-thin.', category: 'equip', rarity: 'rare', icon: { shape: 'amulet', colors: ['#3fe0c8', '#ff7f8a', '#f0e6d2'] }, stack: 1, sellPrice: sell(27, 'rare'), buyPrice: buy(sell(27, 'rare')), levelReq: 27, equip: { slot: 'amulet', stats: { critDamage: 0.05 }, randomLines: 2 }, tags: ['worlddrop'] },
  { id: 'eq_ring_reeftide', name: 'Reeftide Ring', description: 'Coral and pearl in one setting, cool no matter how deep you go.', category: 'equip', rarity: 'rare', icon: { shape: 'ring', colors: ['#ff7f8a', '#f0e6d2', '#3fe0c8'] }, stack: 1, sellPrice: sell(28, 'rare'), buyPrice: buy(sell(28, 'rare')), levelReq: 28, equip: { slot: 'ring', stats: { maxHp: 30, maxMp: 30 }, randomLines: 2 }, tags: ['crafted'] },
  { id: 'eq_amulet_coralheart', name: 'Coralheart Amulet', description: 'A living coral node still slowly beating, warm against the skin.', category: 'equip', rarity: 'rare', icon: { shape: 'amulet', colors: ['#ff7f8a', '#3fe0c8', '#f0e6d2'] }, stack: 1, sellPrice: sell(29, 'rare'), buyPrice: buy(sell(29, 'rare')), levelReq: 29, equip: { slot: 'amulet', stats: { attack: 10, magicAttack: 10, critRate: 0.02 }, randomLines: 2 }, tags: ['crafted'] },
  { id: 'eq_ring_voidglass', name: 'Voidglass Ring', description: 'Blighted sand fused to black glass; Sera refuses to cut a second one.', category: 'equip', rarity: 'rare', icon: { shape: 'ring', colors: ['#3a1f4a', '#5a3f7a', '#8a5fd0'] }, stack: 1, sellPrice: sell(32, 'rare'), buyPrice: buy(sell(32, 'rare')), levelReq: 32, equip: { slot: 'ring', stats: { dropBonus: 0.05 }, randomLines: 2 }, tags: ['crafted'] },
  { id: 'eq_amulet_bloomthorn', name: 'Bloomthorn Charm', description: 'A blightthorn bloom pressed flat, still faintly luminous violet.', category: 'equip', rarity: 'rare', icon: { shape: 'amulet', colors: ['#5a3f7a', '#8a5fd0', '#3a1f4a'] }, stack: 1, sellPrice: sell(33, 'rare'), buyPrice: buy(sell(33, 'rare')), levelReq: 33, equip: { slot: 'amulet', stats: { luk: 6, critRate: 0.03 }, randomLines: 2 }, tags: ['worlddrop'] },
  { id: 'eq_ring_heartcrystal', name: 'Heartcrystal Ring', description: "Sera's finest cut: a sliver of Oma's own heart-crystal, ringed in voidforged silver.", category: 'equip', rarity: 'epic', icon: { shape: 'ring', colors: ['#8a5fd0', '#3a1f4a', '#5a3f7a'] }, stack: 1, sellPrice: sell(34, 'epic'), buyPrice: buy(sell(34, 'epic')), levelReq: 34, equip: { slot: 'ring', stats: { attack: 8, magicAttack: 8, critRate: 0.03, critDamage: 0.05 }, randomLines: 2 }, tags: ['crafted'] },
  { id: 'eq_amulet_hollow_lantern', name: 'Hollow Lantern Amulet', description: 'A bottled will-o-wisp that never gutters, even in the Hollow\'s deep dark.', category: 'equip', rarity: 'epic', icon: { shape: 'amulet', colors: ['#3fe0c8', '#3a1f4a', '#8a5fd0'] }, stack: 1, sellPrice: sell(35, 'epic'), buyPrice: buy(sell(35, 'epic')), levelReq: 35, equip: { slot: 'amulet', stats: { hpRegen: 8, mpRegen: 8, dropBonus: 0.04 }, randomLines: 2 }, tags: ['crafted'] },
  { id: 'eq_ring_blightglass', name: 'Blightglass Signet', description: 'Cooled blight-glass, unnervingly warm at the core. It should not still be beating.', category: 'equip', rarity: 'epic', icon: { shape: 'ring', colors: ['#3a1f4a', '#5a3f7a', '#8a5fd0'] }, stack: 1, sellPrice: sell(36, 'epic'), buyPrice: buy(sell(36, 'epic')), levelReq: 36, equip: { slot: 'ring', stats: { damagePct: 0.03, defense: 8 }, randomLines: 2 }, tags: ['worlddrop'] },
];

// ---------------------------------------------------------------------------
// Boss-exclusive gear (tag 'bossdrop:<monsterId>')
// ---------------------------------------------------------------------------

const BOSS_ITEMS: ItemDef[] = [
  // King Barnacle (L11) — rare
  { id: 'eq_sword_kingsbarnacle', name: "King Barnacle's Edge", description: "Broken from the king crab's own claw-blade and reforged into a sword.", category: 'equip', rarity: 'rare', icon: { shape: 'sword', colors: ['#6f8f8a', '#8b6b4a', '#d8cdb0'] }, stack: 1, sellPrice: sell(11, 'rare'), levelReq: 11, classReq: ['vanguard'], equip: { slot: 'weapon', weaponType: 'sword', stats: { attack: physAtk(11) + 12, defense: 4 }, randomLines: 2 }, tags: ['bossdrop:king_barnacle'] },
  { id: 'eq_bow_barnacleking', name: "Barnacle King's Recurve", description: 'Carved from shell-hardened grotto wood, strung with crab tendon.', category: 'equip', rarity: 'rare', icon: { shape: 'bow', colors: ['#6f8f8a', '#8b6b4a', '#d8cdb0'] }, stack: 1, sellPrice: sell(11, 'rare'), levelReq: 11, classReq: ['windrunner'], equip: { slot: 'weapon', weaponType: 'bow', stats: { attack: physAtk(11) + 12, critRate: 0.02 }, randomLines: 2 }, tags: ['bossdrop:king_barnacle'] },
  { id: 'eq_armor_barnaclekingplate', name: "Barnacle King's Carapace", description: "A breastplate hewn from the king's own shell, still faintly briny.", category: 'equip', rarity: 'rare', icon: { shape: 'armor', colors: ['#6f8f8a', '#8b6b4a', '#d8cdb0'] }, stack: 1, sellPrice: sell(11, 'rare'), levelReq: 11, classReq: ['vanguard'], equip: { slot: 'armor', stats: { defense: defenseFor(11, 'armor') + 4, maxHp: 30 }, randomLines: 2, setId: 'set_kingsbarnacle' }, tags: ['bossdrop:king_barnacle'] },
  { id: 'eq_amulet_barnacle_pearl', name: 'Barnacle Pearl Amulet', description: 'A cave pearl found lodged deep in the crab king\'s shell.', category: 'equip', rarity: 'rare', icon: { shape: 'amulet', colors: ['#d8cdb0', '#6f8f8a', '#8b6b4a'] }, stack: 1, sellPrice: sell(11, 'rare'), levelReq: 11, equip: { slot: 'amulet', stats: { maxHp: 25, defense: 3 }, randomLines: 2, setId: 'set_kingsbarnacle' }, tags: ['bossdrop:king_barnacle'] },

  // Old Tangle (L17) — rare/epic
  { id: 'eq_staff_tangleheart', name: 'Tangleheart Staff', description: "A living branch cut from the hydra-plant's own core, still slowly growing.", category: 'equip', rarity: 'epic', icon: { shape: 'staff', colors: ['#2f8f5c', '#1f6b45', '#d99a3c'] }, stack: 1, sellPrice: sell(17, 'epic'), levelReq: 17, classReq: ['stormcaller'], equip: { slot: 'weapon', weaponType: 'staff', stats: { magicAttack: magAtk(17) + 14, int: 3 }, randomLines: 2 }, tags: ['bossdrop:old_tangle'] },
  { id: 'eq_dagger_tanglefang', name: 'Tanglefang', description: "One of Old Tangle's thorn-fangs, hollowed and gripped in vinewrap leather.", category: 'equip', rarity: 'rare', icon: { shape: 'dagger', colors: ['#2f8f5c', '#1f6b45', '#d99a3c'] }, stack: 1, sellPrice: sell(17, 'rare'), levelReq: 17, classReq: ['shade'], equip: { slot: 'weapon', weaponType: 'dagger', stats: { attack: physAtk(17) + 12, critRate: 0.03 }, randomLines: 2 }, tags: ['bossdrop:old_tangle'] },
  { id: 'eq_gloves_tanglevine', name: 'Tanglevine Gloves', description: 'Living vine wrapped tight around the knuckles; it still tries to root.', category: 'equip', rarity: 'rare', icon: { shape: 'gloves', colors: ['#5a7a3c', '#3f8f5c', '#d99a3c'] }, stack: 1, sellPrice: sell(17, 'rare'), levelReq: 17, classReq: ['windrunner', 'shade'], equip: { slot: 'gloves', stats: { defense: defenseFor(17, 'gloves') + 3, dex: 4 }, randomLines: 2, setId: 'set_oldtangle' }, tags: ['bossdrop:old_tangle'] },
  { id: 'eq_ring_tangleroot', name: 'Tangleroot Ring', description: "A hoop of hardened root, warm and slightly sticky with sap.", category: 'equip', rarity: 'rare', icon: { shape: 'ring', colors: ['#1f6b45', '#2f8f5c', '#d99a3c'] }, stack: 1, sellPrice: sell(17, 'rare'), levelReq: 17, equip: { slot: 'ring', stats: { maxMp: 30, magicAttack: 6 }, randomLines: 2, setId: 'set_oldtangle' }, tags: ['bossdrop:old_tangle'] },

  // Kraelith, the Storm Roc (L24) — epic
  { id: 'eq_bow_kraelith_gale', name: "Kraelith's Galebow", description: "Fletched with the storm roc's own primaries; arrows loose faster than thought.", category: 'equip', rarity: 'epic', icon: { shape: 'bow', colors: ['#cfe0ee', '#5a6b7a', '#4fd1ff'] }, stack: 1, sellPrice: sell(24, 'epic'), levelReq: 24, classReq: ['windrunner'], equip: { slot: 'weapon', weaponType: 'bow', stats: { attack: physAtk(24) + 16, critRate: 0.03 }, randomLines: 2 }, tags: ['bossdrop:kraelith'] },
  { id: 'eq_wand_stormroc', name: 'Stormroc Wand', description: "A hollow roc-bone wand that crackles with leftover static.", category: 'equip', rarity: 'epic', icon: { shape: 'wand', colors: ['#cfe0ee', '#4fd1ff', '#5a6b7a'] }, stack: 1, sellPrice: sell(24, 'epic'), levelReq: 24, classReq: ['stormcaller'], equip: { slot: 'weapon', weaponType: 'wand', stats: { magicAttack: magAtk(24) + 16, int: 4 }, randomLines: 2 }, tags: ['bossdrop:kraelith'] },
  { id: 'eq_helmet_rocfeather', name: 'Roc-Feather Helm', description: "A stormsteel helm crested with a single unbroken roc feather.", category: 'equip', rarity: 'epic', icon: { shape: 'helmet', colors: ['#5a6b7a', '#cfe0ee', '#4fd1ff'] }, stack: 1, sellPrice: sell(24, 'epic'), levelReq: 24, classReq: ['vanguard'], equip: { slot: 'helmet', stats: { defense: defenseFor(24, 'helmet') + 6, maxHp: 30 }, randomLines: 2, setId: 'set_kraelith' }, tags: ['bossdrop:kraelith'] },
  { id: 'eq_amulet_kraelith_eye', name: "Kraelith's Eye", description: "A storm-glass bead that watches the wind before it turns.", category: 'equip', rarity: 'epic', icon: { shape: 'amulet', colors: ['#4fd1ff', '#cfe0ee', '#5a6b7a'] }, stack: 1, sellPrice: sell(24, 'epic'), levelReq: 24, equip: { slot: 'amulet', stats: { critRate: 0.03, speed: 4 }, randomLines: 2, setId: 'set_kraelith' }, tags: ['bossdrop:kraelith'] },

  // Captain Vashti Rook (L30) — epic
  { id: 'eq_sword_rooksedge', name: "Rook's Cutlass", description: "The ghost captain's own blade, still dripping cold seawater that never lands.", category: 'equip', rarity: 'epic', icon: { shape: 'sword', colors: ['#3fe0c8', '#ff7f8a', '#f0e6d2'] }, stack: 1, sellPrice: sell(30, 'epic'), levelReq: 30, classReq: ['vanguard'], equip: { slot: 'weapon', weaponType: 'sword', stats: { attack: physAtk(30) + 18, critDamage: 0.04 }, randomLines: 2 }, tags: ['bossdrop:captain_rook'] },
  { id: 'eq_gun_ghostpistol', name: 'Ghostlight Pistol', description: "Fires a shot that leaves a trail of drowned-green light.", category: 'equip', rarity: 'epic', icon: { shape: 'gun', colors: ['#3fe0c8', '#f0e6d2', '#ff7f8a'] }, stack: 1, sellPrice: sell(30, 'epic'), levelReq: 30, classReq: ['windrunner'], equip: { slot: 'weapon', weaponType: 'gun', stats: { attack: physAtk(30, 1.08) + 18, critRate: 0.03 }, randomLines: 2 }, tags: ['bossdrop:captain_rook'] },
  { id: 'eq_boots_drownedsailor', name: "Drowned Sailor's Boots", description: "Salt-warped leather that never quite dries. They fit perfectly.", category: 'equip', rarity: 'epic', icon: { shape: 'boots', colors: ['#3fe0c8', '#ff7f8a', '#f0e6d2'] }, stack: 1, sellPrice: sell(30, 'epic'), levelReq: 30, classReq: ['windrunner', 'shade'], equip: { slot: 'boots', stats: { defense: defenseFor(30, 'boots') + 4, speed: 6 }, randomLines: 2, setId: 'set_captainrook' }, tags: ['bossdrop:captain_rook'] },
  { id: 'eq_ring_rook_signet', name: "Rook's Signet", description: "The captain's own signet ring, engraved with a harpoon and a whale.", category: 'equip', rarity: 'epic', icon: { shape: 'ring', colors: ['#f0e6d2', '#3fe0c8', '#ff7f8a'] }, stack: 1, sellPrice: sell(30, 'epic'), levelReq: 30, equip: { slot: 'ring', stats: { attack: 8, magicAttack: 8, bossDamagePct: 0.03 }, randomLines: 2, setId: 'set_captainrook' }, tags: ['bossdrop:captain_rook'] },

  // The Blight Heart (L36, final boss) — epic/legendary
  { id: 'eq_staff_blightcore', name: 'Blightcore Staff', description: "A shard of the heart itself, still pulsing faint violet even severed.", category: 'equip', rarity: 'legendary', icon: { shape: 'staff', colors: ['#5a3f7a', '#3a1f4a', '#8a5fd0'] }, stack: 1, sellPrice: sell(36, 'legendary'), levelReq: 36, classReq: ['stormcaller'], equip: { slot: 'weapon', weaponType: 'staff', stats: { magicAttack: magAtk(36) + 24, int: 6, damagePct: 0.03 }, randomLines: 2 }, tags: ['bossdrop:blight_heart'] },
  { id: 'eq_knives_blightfang', name: 'Blightfang Knives', description: "Twin knives grown from crystallized blight-rot. They never dull.", category: 'equip', rarity: 'epic', icon: { shape: 'knives', colors: ['#5a3f7a', '#8a5fd0', '#3a1f4a'] }, stack: 1, sellPrice: sell(36, 'epic'), levelReq: 36, classReq: ['shade'], equip: { slot: 'weapon', weaponType: 'knives', stats: { attack: physAtk(36) + 22, critRate: 0.04 }, randomLines: 2 }, tags: ['bossdrop:blight_heart'] },
  { id: 'eq_armor_blightplate', name: 'Blight-Purified Plate', description: "Voidstone armor cleansed of its rot, humming faintly with clean light instead.", category: 'equip', rarity: 'epic', icon: { shape: 'armor', colors: ['#5a3f7a', '#8a5fd0', '#3a1f4a'] }, stack: 1, sellPrice: sell(36, 'epic'), levelReq: 36, classReq: ['vanguard'], equip: { slot: 'armor', stats: { defense: defenseFor(36, 'armor') + 10, maxHp: 70 }, randomLines: 2, setId: 'set_blightheart' }, tags: ['bossdrop:blight_heart'] },
  { id: 'eq_amulet_blightheart_core', name: 'Blight Heart Core', description: "The last ember of the heart's corruption, cold now, and quiet.", category: 'equip', rarity: 'epic', icon: { shape: 'amulet', colors: ['#8a5fd0', '#3a1f4a', '#5a3f7a'] }, stack: 1, sellPrice: sell(36, 'epic'), levelReq: 36, equip: { slot: 'amulet', stats: { attack: 10, magicAttack: 10, damagePct: 0.04 }, randomLines: 2, setId: 'set_blightheart' }, tags: ['bossdrop:blight_heart'] },
];

// ---------------------------------------------------------------------------
// Quest-reward registry items (epic/legendary, tag 'questreward')
// ---------------------------------------------------------------------------

const QUEST_REWARD_GEAR: ItemDef[] = [
  { id: 'eq_sword_tangleroot', name: 'Tangleroot Blade', description: "Grown and shaped by Fenna's kelp-wardens from Old Tangle's own heartwood.", category: 'equip', rarity: 'epic', icon: { shape: 'sword', colors: ['#2f8f5c', '#1f6b45', '#d99a3c'] }, stack: 1, sellPrice: sell(17, 'epic'), levelReq: 17, classReq: ['vanguard'], equip: { slot: 'weapon', weaponType: 'sword', stats: { attack: physAtk(17) + 16, str: 3 }, randomLines: 2 }, tags: ['questreward'] },
  { id: 'eq_staff_tangleroot', name: 'Tangleroot Staff', description: "The heartwood channels magic even better than it channels sap.", category: 'equip', rarity: 'epic', icon: { shape: 'staff', colors: ['#2f8f5c', '#1f6b45', '#d99a3c'] }, stack: 1, sellPrice: sell(17, 'epic'), levelReq: 17, classReq: ['stormcaller'], equip: { slot: 'weapon', weaponType: 'staff', stats: { magicAttack: magAtk(17) + 16, int: 3 }, randomLines: 2 }, tags: ['questreward'] },
  { id: 'eq_bow_tangleroot', name: 'Tangleroot Bow', description: "Strung taut from Old Tangle's own vine-sinew.", category: 'equip', rarity: 'epic', icon: { shape: 'bow', colors: ['#2f8f5c', '#1f6b45', '#d99a3c'] }, stack: 1, sellPrice: sell(17, 'epic'), levelReq: 17, classReq: ['windrunner'], equip: { slot: 'weapon', weaponType: 'bow', stats: { attack: physAtk(17) + 16, dex: 3 }, randomLines: 2 }, tags: ['questreward'] },
  { id: 'eq_dagger_tangleroot', name: 'Tangleroot Dagger', description: "Light, quick, and still faintly warm from the heartwood's core.", category: 'equip', rarity: 'epic', icon: { shape: 'dagger', colors: ['#2f8f5c', '#1f6b45', '#d99a3c'] }, stack: 1, sellPrice: sell(17, 'epic'), levelReq: 17, classReq: ['shade'], equip: { slot: 'weapon', weaponType: 'dagger', stats: { attack: physAtk(17) + 16, luk: 3 }, randomLines: 2 }, tags: ['questreward'] },

  { id: 'eq_armor_harpooner_coat', name: "Harpooner's Coat", description: "Grell's guild coat, oilcloth and stormsteel buckles — the Harpooners look after their own.", category: 'equip', rarity: 'rare', icon: { shape: 'armor', colors: ['#5a6b7a', '#4fd1ff', '#8b6b4a'] }, stack: 1, sellPrice: sell(13, 'rare'), levelReq: 13, equip: { slot: 'armor', stats: { attack: 6, defense: defenseFor(13, 'armor'), goldBonus: 0.03 }, randomLines: 1 }, tags: ['questreward'] },
  { id: 'eq_armor_tidekeeper_robe', name: "Tidekeeper's Robe", description: "Aolani's own blessing woven into the seams; it moves like water.", category: 'equip', rarity: 'rare', icon: { shape: 'armor', colors: ['#3f8f5c', '#d99a3c', '#f0e6d2'] }, stack: 1, sellPrice: sell(13, 'rare'), levelReq: 13, equip: { slot: 'armor', stats: { magicAttack: 6, maxMp: 25, hpRegen: 4 }, randomLines: 1 }, tags: ['questreward'] },

  { id: 'eq_amulet_storm_heart', name: 'Storm Heart', description: "Kraelith's own heart-ember, harvested and bound in stormsteel. It never stops crackling.", category: 'equip', rarity: 'epic', icon: { shape: 'amulet', colors: ['#4fd1ff', '#cfe0ee', '#5a6b7a'] }, stack: 1, sellPrice: sell(24, 'epic'), levelReq: 24, equip: { slot: 'amulet', stats: { attack: 14, magicAttack: 14, critDamage: 0.06 }, randomLines: 2 }, tags: ['questreward'] },
  { id: 'eq_ring_roc_feather', name: "Roc's Feather Ring", description: "A gift from the freed storm-roc spirit, light as the wind it rides.", category: 'equip', rarity: 'epic', icon: { shape: 'ring', colors: ['#cfe0ee', '#4fd1ff', '#f0e6d2'] }, stack: 1, sellPrice: sell(24, 'epic'), levelReq: 24, equip: { slot: 'ring', stats: { speed: 6, jump: 4, xpBonus: 0.05, avoid: 0.03 }, randomLines: 2 }, tags: ['questreward'] },

  { id: 'eq_amulet_rook_harpoon', name: "Rook's Harpoon Shard", description: "A splinter of the cursed harpoon, claimed instead of returned. It pulls toward bosses.", category: 'equip', rarity: 'epic', icon: { shape: 'amulet', colors: ['#3fe0c8', '#ff7f8a', '#5a3f7a'] }, stack: 1, sellPrice: sell(30, 'epic'), levelReq: 30, equip: { slot: 'amulet', stats: { attack: 12, bossDamagePct: 0.08 }, randomLines: 2 }, tags: ['questreward'] },
  { id: 'eq_ring_lamplight', name: 'Lamplight Ring', description: "A gift from the grateful Lamplighter, glowing gently once the captain was laid to rest.", category: 'equip', rarity: 'epic', icon: { shape: 'ring', colors: ['#f0e6d2', '#3fe0c8', '#ff7f8a'] }, stack: 1, sellPrice: sell(30, 'epic'), levelReq: 30, equip: { slot: 'ring', stats: { hpRegen: 10, mpRegen: 10, dropBonus: 0.04 }, randomLines: 2 }, tags: ['questreward'] },

  { id: 'eq_amulet_ember_harvest', name: "Oma's Harvested Ember", description: "The whale's own heart-ember, cut free and bound to serve the Harpooners' cause. Legendary and terrible.", category: 'equip', rarity: 'legendary', icon: { shape: 'amulet', colors: ['#ff8844', '#5a3f7a', '#8a5fd0'] }, stack: 1, sellPrice: sell(36, 'legendary'), levelReq: 36, equip: { slot: 'amulet', stats: { attack: 20, magicAttack: 20, damagePct: 0.06, critDamage: 0.06 }, randomLines: 2 }, tags: ['questreward'] },
  { id: 'eq_amulet_oma_purified', name: "Oma's Purified Heart", description: "The Blight burned away by the Tidekeepers' song; the ember beats clean and warm again.", category: 'equip', rarity: 'legendary', icon: { shape: 'amulet', colors: ['#3fe0c8', '#f0e6d2', '#ffb238'] }, stack: 1, sellPrice: sell(36, 'legendary'), levelReq: 36, equip: { slot: 'amulet', stats: { maxHp: 80, maxMp: 80, hpRegen: 12, mpRegen: 12, xpBonus: 0.06 }, randomLines: 2 }, tags: ['questreward'] },
  { id: 'eq_ring_songbound', name: 'Songbound Ring', description: "Worn by whoever sang Oma back from the brink — Harpooner steel and Tidekeeper song, together at last.", category: 'equip', rarity: 'legendary', icon: { shape: 'ring', colors: ['#ffb238', '#3fe0c8', '#8a5fd0'] }, stack: 1, sellPrice: sell(36, 'legendary'), levelReq: 36, equip: { slot: 'ring', stats: { attack: 12, magicAttack: 12, critRate: 0.04, xpBonus: 0.04, dropBonus: 0.04 }, randomLines: 2 }, tags: ['questreward'] },
];

export const EQUIPMENT_ITEMS: ItemDef[] = [
  ...STARTER_WEAPONS,
  ...TRAVELER,
  ...WORLD_WEAPONS,
  ...CRAFTED_WEAPONS,
  ...ARMOR_ITEMS,
  ...CRAFTED_ARMOR,
  ...ACCESSORIES,
  ...BOSS_ITEMS,
  ...QUEST_REWARD_GEAR,
];
