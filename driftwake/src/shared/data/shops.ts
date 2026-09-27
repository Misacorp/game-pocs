import type { Condition, ShopDef } from '../types';

const WEAPON_TYPES = ['sword', 'axe', 'staff', 'wand', 'bow', 'gun', 'dagger', 'knives'];
const ARMOR_SLOTS = ['helmet', 'armor', 'gloves', 'boots'];

function lvl(min: number): Condition[] {
  return [{ type: 'level', min }];
}

function weaponSet(material: string, reqLevel?: number) {
  return WEAPON_TYPES.map((t) => ({ itemId: `eq_${t}_${material}`, reqs: reqLevel ? lvl(reqLevel) : undefined }));
}
function armorSet(materials: { plate: string; robe: string; leather: string }, reqLevel?: number) {
  const out: { itemId: string; reqs?: Condition[] }[] = [];
  for (const slot of ARMOR_SLOTS) {
    out.push({ itemId: `eq_${slot}_${materials.plate}`, reqs: reqLevel ? lvl(reqLevel) : undefined });
    out.push({ itemId: `eq_${slot}_${materials.robe}`, reqs: reqLevel ? lvl(reqLevel) : undefined });
    out.push({ itemId: `eq_${slot}_${materials.leather}`, reqs: reqLevel ? lvl(reqLevel) : undefined });
  }
  return out;
}

export const SHOP_LIST: ShopDef[] = [
  {
    id: 'shop_brina',
    name: "Brina's Forge",
    items: [
      ...weaponSet('driftwood'),
      ...weaponSet('barnacle', 5),
      ...weaponSet('kelpwoven', 10),
      ...weaponSet('amberlit', 15),
      ...armorSet({ plate: 'barnacle', robe: 'mossweave', leather: 'driftleather' }),
      ...armorSet({ plate: 'kelpshell', robe: 'tidewoven', leather: 'vinewrap' }, 10),
      { itemId: 'eq_armor_traveler' },
      { itemId: 'eq_boots_traveler' },
      { itemId: 'use_whetstone_1' },
      { itemId: 'use_whetstone_2', reqs: lvl(10) },
    ],
  },
  {
    id: 'shop_juniper',
    name: "Juniper's Apothecary",
    items: [
      { itemId: 'use_hp_potion_s' },
      { itemId: 'use_mp_potion_s' },
      { itemId: 'use_hp_potion_m', reqs: lvl(8) },
      { itemId: 'use_mp_potion_m', reqs: lvl(8) },
      { itemId: 'use_elixir_s', reqs: lvl(10) },
      { itemId: 'use_elixir_might_1', reqs: lvl(5) },
      { itemId: 'use_elixir_arcana_1', reqs: lvl(5) },
      { itemId: 'use_elixir_iron_1', reqs: lvl(5) },
      { itemId: 'use_elixir_precision_1', reqs: lvl(5) },
      { itemId: 'use_elixir_swiftness_1', reqs: lvl(5) },
      { itemId: 'rec_scroll_galewrought_saber', reqs: lvl(22) },
      { itemId: 'rec_scroll_precision_elixir', reqs: lvl(24) },
      { itemId: 'rec_scroll_heartcrystal_ring', reqs: lvl(30) },
      { itemId: 'rec_scroll_hollow_grub_surprise', reqs: lvl(28) },
    ],
  },
  {
    id: 'shop_tobbin',
    name: "Tobbin's Stall",
    items: [
      { itemId: 'use_snack_honeycake' },
      { itemId: 'use_food_mossback_stew' },
      { itemId: 'use_snack_riceball', reqs: lvl(8) },
      { itemId: 'use_food_eel_skewer', reqs: lvl(12) },
      { itemId: 'use_snack_storm_jerky', reqs: lvl(18) },
      { itemId: 'use_snack_reef_chowder', reqs: lvl(25) },
    ],
  },
  {
    id: 'shop_sera',
    name: "Sera's Bench",
    items: [
      { itemId: 'eq_ring_copper_band' },
      { itemId: 'eq_amulet_shell_pendant' },
      { itemId: 'mat_quartz' },
      { itemId: 'mat_cut_quartz', reqs: lvl(5) },
      { itemId: 'eq_ring_quartz_loop', reqs: lvl(3) },
      { itemId: 'eq_ring_amber_drop', reqs: lvl(8) },
      { itemId: 'eq_amulet_kelp_charm', reqs: lvl(9) },
      { itemId: 'eq_ring_tidepearl', reqs: lvl(12) },
    ],
  },
  {
    id: 'shop_dusty',
    name: "Dusty Fen's Tools",
    items: [
      { itemId: 'use_return_scroll' },
      { itemId: 'mat_enhance_stone_1', price: 250 },
    ],
  },
  {
    id: 'shop_pim',
    name: "Pim's General Goods",
    items: [
      { itemId: 'use_hp_potion_s' },
      { itemId: 'use_mp_potion_s' },
      { itemId: 'use_hp_potion_m', reqs: lvl(8) },
      { itemId: 'use_mp_potion_m', reqs: lvl(8) },
      { itemId: 'use_return_scroll' },
      { itemId: 'use_stat_reset' },
      { itemId: 'use_skill_reset' },
      { itemId: 'pet_puffling' },
    ],
  },
  {
    id: 'shop_quill',
    name: "Quill's Outpost Trade",
    items: [
      { itemId: 'use_hp_potion_m' },
      { itemId: 'use_mp_potion_m' },
      { itemId: 'use_hp_potion_l', reqs: lvl(16) },
      { itemId: 'use_mp_potion_l', reqs: lvl(16) },
      { itemId: 'use_return_scroll' },
      ...weaponSet('amberlit', 15),
      ...weaponSet('stormsteel', 20),
      ...weaponSet('galewrought', 25),
      ...armorSet({ plate: 'stormplate', robe: 'cloudsilk', leather: 'galehide' }, 20),
      { itemId: 'use_whetstone_3', reqs: lvl(20) },
    ],
  },
  {
    id: 'shop_nell',
    name: "Nell's Dive Shop",
    items: [
      { itemId: 'use_hp_potion_l' },
      { itemId: 'use_mp_potion_l' },
      { itemId: 'use_hp_potion_xl', reqs: lvl(26) },
      { itemId: 'use_mp_potion_xl', reqs: lvl(26) },
      { itemId: 'use_return_scroll' },
      ...weaponSet('galewrought', 25),
      ...weaponSet('coralbright', 30),
      ...weaponSet('voidforged', 35),
      ...armorSet({ plate: 'coralguard', robe: 'pearlsilk', leather: 'glowhide' }, 30),
      { itemId: 'use_whetstone_4', reqs: lvl(30) },
      { itemId: 'pet_lanternfish' },
    ],
  },
];
