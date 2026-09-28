import type { RecipeDef, WeaponType } from '../types';

const RECIPES: RecipeDef[] = [];
function add(r: RecipeDef) { RECIPES.push(r); }

// ---------------------------------------------------------------------------
// SMITHING
// ---------------------------------------------------------------------------

// Smelting: ore -> ingot, one per region tier.
const SMELT = [
  { level: 1, ore: 'mat_copper_ore', ingot: 'mat_copper_ingot', xp: 10 },
  { level: 3, ore: 'mat_iron_ore', ingot: 'mat_iron_ingot', xp: 18 },
  { level: 5, ore: 'mat_stormsteel_ore', ingot: 'mat_stormsteel_ingot', xp: 30 },
  { level: 7, ore: 'mat_coralite_ore', ingot: 'mat_coralite_ingot', xp: 45 },
  { level: 9, ore: 'mat_voidstone_ore', ingot: 'mat_voidstone_ingot', xp: 65 },
];
for (const s of SMELT) {
  add({ id: `rec_smith_smelt_${s.ingot.replace('mat_', '').replace('_ingot', '')}`, profession: 'smithing', level: s.level, inputs: [{ itemId: s.ore, qty: 3 }], output: { itemId: s.ingot, qty: 1 }, xp: s.xp, learn: 'auto' });
}

// Forged weapons: 8 types x 4 tiers (barnacle L5 / amberlit L15 / galewrought L25 / voidforged L35).
const WEAPON_TYPES: WeaponType[] = ['sword', 'axe', 'staff', 'wand', 'bow', 'gun', 'dagger', 'knives'];
interface ForgeTier {
  material: string; profLevel: number; ingot: string; ingotQty: number; monsterMat: string; scrap: string;
  xp: number; gold: number; minRarity: RecipeDef['minRarity']; learn: RecipeDef['learn']; trainerCost?: number;
}
const FORGE_TIERS: ForgeTier[] = [
  { material: 'barnacle', profLevel: 2, ingot: 'mat_copper_ingot', ingotQty: 2, monsterMat: 'mat_boar_hide', scrap: 'mat_scrap_iron', xp: 25, gold: 20, minRarity: 'uncommon', learn: 'auto' },
  { material: 'amberlit', profLevel: 5, ingot: 'mat_iron_ingot', ingotQty: 3, monsterMat: 'mat_kelp_essence', scrap: 'mat_scrap_iron', xp: 40, gold: 40, minRarity: 'uncommon', learn: 'auto' },
  { material: 'galewrought', profLevel: 8, ingot: 'mat_stormsteel_ingot', ingotQty: 3, monsterMat: 'mat_storm_feather', scrap: 'mat_scrap_fine', xp: 60, gold: 70, minRarity: 'rare', learn: 'trainer', trainerCost: 300 },
  { material: 'voidforged', profLevel: 10, ingot: 'mat_voidstone_ingot', ingotQty: 4, monsterMat: 'mat_wraith_wisp', scrap: 'mat_scrap_arcane', xp: 90, gold: 120, minRarity: 'rare', learn: 'trainer', trainerCost: 600 },
  { material: 'starforged', profLevel: 10, ingot: 'mat_voidstone_ingot', ingotQty: 5, monsterMat: 'mat_singer_core', scrap: 'mat_scrap_arcane', xp: 130, gold: 220, minRarity: 'rare', learn: 'trainer', trainerCost: 900 },
];
for (const tier of FORGE_TIERS) {
  for (const type of WEAPON_TYPES) {
    const id = `rec_smith_${type}_${tier.material}_forged`;
    const output = `eq_${type}_${tier.material}_forged`;
    let learn = tier.learn;
    let trainerCost = tier.trainerCost;
    // The Galewrought Saber is taught only from a rare recipe scroll instead of the trainer.
    if (id === 'rec_smith_sword_galewrought_forged') { learn = 'item'; trainerCost = undefined; }
    add({
      id, profession: 'smithing', level: tier.profLevel,
      inputs: [{ itemId: tier.ingot, qty: tier.ingotQty }, { itemId: tier.monsterMat, qty: 2 }, { itemId: tier.scrap, qty: 1 }],
      output: { itemId: output, qty: 1 }, goldCost: tier.gold, xp: tier.xp, learn, trainerCost, minRarity: tier.minRarity,
    });
  }
}

// Forged armor: Plate & Leather, tier 20 (Stormplate / Galehide), 4 slots each.
const ARMOR_SLOTS = ['helmet', 'armor', 'gloves', 'boots'] as const;
for (const slot of ARMOR_SLOTS) {
  add({
    id: `rec_smith_${slot}_stormplate_forged`, profession: 'smithing', level: 6,
    inputs: [{ itemId: 'mat_stormsteel_ingot', qty: 2 }, { itemId: 'mat_thunder_carapace', qty: 1 }, { itemId: 'mat_scrap_iron', qty: 1 }],
    output: { itemId: `eq_${slot}_stormplate_forged`, qty: 1 }, goldCost: 50, xp: 50, learn: 'trainer', trainerCost: 250, minRarity: 'rare',
  });
  add({
    id: `rec_smith_${slot}_galehide_forged`, profession: 'smithing', level: 6,
    inputs: [{ itemId: 'mat_stormsteel_ingot', qty: 2 }, { itemId: 'mat_storm_feather', qty: 1 }, { itemId: 'mat_scrap_iron', qty: 1 }],
    output: { itemId: `eq_${slot}_galehide_forged`, qty: 1 }, goldCost: 50, xp: 50, learn: 'trainer', trainerCost: 250, minRarity: 'rare',
  });
}

// Act VI armor chest pieces (Smithing, profession level 10, new materials).
add({
  id: 'rec_smith_armor_starguard', profession: 'smithing', level: 10,
  inputs: [{ itemId: 'mat_voidstone_ingot', qty: 3 }, { itemId: 'mat_singer_core', qty: 1 }, { itemId: 'mat_scrap_arcane', qty: 1 }],
  output: { itemId: 'eq_armor_starguard', qty: 1 }, goldCost: 260, xp: 110, learn: 'trainer', trainerCost: 800, minRarity: 'epic',
});
add({
  id: 'rec_smith_armor_voidsilk', profession: 'smithing', level: 10,
  inputs: [{ itemId: 'mat_voidstone_ingot', qty: 2 }, { itemId: 'mat_void_scale', qty: 2 }, { itemId: 'mat_scrap_arcane', qty: 1 }],
  output: { itemId: 'eq_armor_voidsilk', qty: 1 }, goldCost: 260, xp: 110, learn: 'trainer', trainerCost: 800, minRarity: 'epic',
});
add({
  id: 'rec_smith_armor_choirhide', profession: 'smithing', level: 10,
  inputs: [{ itemId: 'mat_voidstone_ingot', qty: 2 }, { itemId: 'mat_star_shard', qty: 2 }, { itemId: 'mat_scrap_arcane', qty: 1 }],
  output: { itemId: 'eq_armor_choirhide', qty: 1 }, goldCost: 260, xp: 110, learn: 'trainer', trainerCost: 800, minRarity: 'epic',
});

// Whetstones
const WHETSTONE_RECIPES = [
  { level: 1, id: 1, input: 'mat_copper_ore', qty: 2, extra: undefined as string | undefined, xp: 8 },
  { level: 3, id: 2, input: 'mat_iron_ore', qty: 2, extra: 'mat_scrap_iron', xp: 14 },
  { level: 5, id: 3, input: 'mat_stormsteel_ore', qty: 2, extra: 'mat_scrap_iron', xp: 22 },
  { level: 7, id: 4, input: 'mat_coralite_ore', qty: 2, extra: 'mat_scrap_fine', xp: 32 },
];
for (const w of WHETSTONE_RECIPES) {
  const inputs: RecipeDef['inputs'] = [{ itemId: w.input, qty: w.qty }];
  if (w.extra) inputs.push({ itemId: w.extra, qty: 1 });
  add({ id: `rec_smith_whetstone_${w.id}`, profession: 'smithing', level: w.level, inputs, output: { itemId: `use_whetstone_${w.id}`, qty: 2 }, xp: w.xp, learn: 'auto' });
}

// Enhancement Stones (Smithing path: tier 1 & 2)
add({ id: 'rec_smith_enhance_stone_1', profession: 'smithing', level: 4, inputs: [{ itemId: 'mat_scrap_iron', qty: 3 }, { itemId: 'mat_copper_ingot', qty: 2 }], output: { itemId: 'mat_enhance_stone_1', qty: 1 }, xp: 30, learn: 'trainer', trainerCost: 150 });
add({ id: 'rec_smith_enhance_stone_2', profession: 'smithing', level: 8, inputs: [{ itemId: 'mat_scrap_fine', qty: 3 }, { itemId: 'mat_stormsteel_ingot', qty: 2 }], output: { itemId: 'mat_enhance_stone_2', qty: 1 }, xp: 60, learn: 'quest' });

// ---------------------------------------------------------------------------
// ALCHEMY
// ---------------------------------------------------------------------------

const POTION_RECIPES: { id: string; level: number; a: string; b: string; out: string; qty: number; xp: number }[] = [
  { id: 'rec_alchemy_hp_potion_s', level: 1, a: 'mat_meadow_herb', b: 'mat_puffmoss_fluff', out: 'use_hp_potion_s', qty: 3, xp: 8 },
  { id: 'rec_alchemy_hp_potion_m', level: 3, a: 'mat_dewcap', b: 'mat_jelly_goo', out: 'use_hp_potion_m', qty: 2, xp: 16 },
  { id: 'rec_alchemy_hp_potion_l', level: 6, a: 'mat_kelp_essence', b: 'mat_eel_fillet', out: 'use_hp_potion_l', qty: 2, xp: 30 },
  { id: 'rec_alchemy_hp_potion_xl', level: 9, a: 'mat_lantern_moss', b: 'mat_lantern_goo', out: 'use_hp_potion_xl', qty: 1, xp: 55 },
  { id: 'rec_alchemy_mp_potion_s', level: 1, a: 'mat_quartz', b: 'mat_dewcap', out: 'use_mp_potion_s', qty: 3, xp: 8 },
  { id: 'rec_alchemy_mp_potion_m', level: 3, a: 'mat_amber', b: 'mat_sporecap', out: 'use_mp_potion_m', qty: 2, xp: 16 },
  { id: 'rec_alchemy_mp_potion_l', level: 6, a: 'mat_sky_crystal', b: 'mat_windbloom', out: 'use_mp_potion_l', qty: 2, xp: 30 },
  { id: 'rec_alchemy_mp_potion_xl', level: 9, a: 'mat_heart_crystal', b: 'mat_blightthorn', out: 'use_mp_potion_xl', qty: 1, xp: 55 },
];
for (const p of POTION_RECIPES) {
  add({ id: p.id, profession: 'alchemy', level: p.level, inputs: [{ itemId: p.a, qty: 2 }, { itemId: p.b, qty: 1 }], output: { itemId: p.out, qty: p.qty }, xp: p.xp, learn: 'auto' });
}

add({ id: 'rec_alchemy_elixir_s', profession: 'alchemy', level: 5, inputs: [{ itemId: 'mat_kelp_essence', qty: 2 }, { itemId: 'mat_sky_crystal', qty: 2 }, { itemId: 'mat_scrap_iron', qty: 1 }], output: { itemId: 'use_elixir_s', qty: 1 }, xp: 25, learn: 'trainer', trainerCost: 100 });

interface ElixirLine { key: string; tier1: [string, string]; tier2: [string, string]; tier3: [string, string]; tier3Learn: RecipeDef['learn'] }
const ELIXIR_LINES: ElixirLine[] = [
  { key: 'might', tier1: ['mat_boar_meat', 'mat_meadow_herb'], tier2: ['mat_thunder_carapace', 'mat_windbloom'], tier3: ['mat_abyss_fang', 'mat_glow_coral'], tier3Learn: 'trainer' },
  { key: 'arcana', tier1: ['mat_glowing_barnacle', 'mat_meadow_herb'], tier2: ['mat_wisp_essence', 'mat_windbloom'], tier3: ['mat_wraith_wisp', 'mat_lantern_moss'], tier3Learn: 'trainer' },
  { key: 'iron', tier1: ['mat_snail_shell', 'mat_meadow_herb'], tier2: ['mat_golem_core', 'mat_windbloom'], tier3: ['mat_sentinel_rune', 'mat_blightthorn'], tier3Learn: 'quest' },
  { key: 'precision', tier1: ['mat_crab_claw', 'mat_dewcap'], tier2: ['mat_spider_silk', 'mat_sporecap'], tier3: ['mat_glimmer_scale', 'mat_glow_coral'], tier3Learn: 'item' },
  { key: 'swiftness', tier1: ['mat_dewbug_wing', 'mat_meadow_herb'], tier2: ['mat_cloud_fluff', 'mat_windbloom'], tier3: ['mat_storm_plume', 'mat_glow_coral'], tier3Learn: 'trainer' },
];
for (const line of ELIXIR_LINES) {
  add({ id: `rec_alchemy_elixir_${line.key}_1`, profession: 'alchemy', level: 2, inputs: [{ itemId: line.tier1[0], qty: 2 }, { itemId: line.tier1[1], qty: 1 }], output: { itemId: `use_elixir_${line.key}_1`, qty: 1 }, xp: 15, learn: 'auto' });
  add({ id: `rec_alchemy_elixir_${line.key}_2`, profession: 'alchemy', level: 5, inputs: [{ itemId: line.tier2[0], qty: 2 }, { itemId: line.tier2[1], qty: 1 }], output: { itemId: `use_elixir_${line.key}_2`, qty: 1 }, xp: 35, learn: 'trainer', trainerCost: 120 });
  add({
    id: `rec_alchemy_elixir_${line.key}_3`, profession: 'alchemy', level: 8,
    inputs: [{ itemId: line.tier3[0], qty: 2 }, { itemId: line.tier3[1], qty: 1 }],
    output: { itemId: `use_elixir_${line.key}_3`, qty: 1 }, xp: 70,
    learn: line.tier3Learn, trainerCost: line.tier3Learn === 'trainer' ? 300 : undefined,
  });
}

add({ id: 'rec_alchemy_stat_reset', profession: 'alchemy', level: 9, inputs: [{ itemId: 'mat_heart_crystal', qty: 3 }, { itemId: 'mat_scrap_arcane', qty: 2 }], output: { itemId: 'use_stat_reset', qty: 1 }, goldCost: 500, xp: 80, learn: 'trainer', trainerCost: 1000 });
add({ id: 'rec_alchemy_skill_reset', profession: 'alchemy', level: 9, inputs: [{ itemId: 'mat_heart_crystal', qty: 3 }, { itemId: 'mat_scrap_arcane', qty: 2 }], output: { itemId: 'use_skill_reset', qty: 1 }, goldCost: 500, xp: 80, learn: 'trainer', trainerCost: 1000 });

// ---------------------------------------------------------------------------
// COOKING
// ---------------------------------------------------------------------------

add({ id: 'rec_cook_mossback_stew', profession: 'cooking', level: 1, inputs: [{ itemId: 'mat_boar_meat', qty: 2 }, { itemId: 'mat_meadow_herb', qty: 1 }], output: { itemId: 'use_food_mossback_stew', qty: 2 }, xp: 12, learn: 'auto' });
add({ id: 'rec_cook_eel_skewer', profession: 'cooking', level: 4, inputs: [{ itemId: 'mat_eel_fillet', qty: 2 }, { itemId: 'mat_kelp_leaf', qty: 1 }], output: { itemId: 'use_food_eel_skewer', qty: 2 }, xp: 22, learn: 'auto' });
add({ id: 'rec_cook_skyegg_omelette', profession: 'cooking', level: 6, inputs: [{ itemId: 'mat_sky_egg', qty: 2 }, { itemId: 'mat_windbloom', qty: 1 }], output: { itemId: 'use_food_skyegg_omelette', qty: 2 }, xp: 35, learn: 'quest' });
add({ id: 'rec_cook_glimmerfish_pie', profession: 'cooking', level: 8, inputs: [{ itemId: 'mat_glimmer_scale', qty: 2 }, { itemId: 'mat_fish_fillet', qty: 1 }, { itemId: 'mat_glow_coral', qty: 1 }], output: { itemId: 'use_food_glimmerfish_pie', qty: 2 }, xp: 55, learn: 'trainer', trainerCost: 300 });
add({ id: 'rec_cook_hollow_grub_surprise', profession: 'cooking', level: 9, inputs: [{ itemId: 'mat_grub_meat', qty: 2 }, { itemId: 'mat_rot_cap', qty: 1 }], output: { itemId: 'use_food_hollow_grub_surprise', qty: 2 }, xp: 70, learn: 'item' });

add({ id: 'rec_cook_honeycake', profession: 'cooking', level: 1, inputs: [{ itemId: 'mat_meadow_herb', qty: 2 }, { itemId: 'mat_sprout_cap', qty: 1 }], output: { itemId: 'use_snack_honeycake', qty: 3 }, xp: 8, learn: 'auto' });
add({ id: 'rec_cook_riceball', profession: 'cooking', level: 3, inputs: [{ itemId: 'mat_kelp_leaf', qty: 2 }, { itemId: 'mat_eel_fillet', qty: 1 }], output: { itemId: 'use_snack_riceball', qty: 3 }, xp: 16, learn: 'auto' });
add({ id: 'rec_cook_storm_jerky', profession: 'cooking', level: 5, inputs: [{ itemId: 'mat_boar_meat', qty: 2 }, { itemId: 'mat_storm_feather', qty: 1 }], output: { itemId: 'use_snack_storm_jerky', qty: 3 }, xp: 28, learn: 'auto' });
add({ id: 'rec_cook_reef_chowder', profession: 'cooking', level: 7, inputs: [{ itemId: 'mat_fish_fillet', qty: 2 }, { itemId: 'mat_coral_chunk', qty: 1 }], output: { itemId: 'use_snack_reef_chowder', qty: 3 }, xp: 42, learn: 'trainer', trainerCost: 150 });

// ---------------------------------------------------------------------------
// JEWELCRAFTING
// ---------------------------------------------------------------------------

const CUT_GEM_RECIPES: { id: string; level: number; raw: string; out: string; xp: number; learn: RecipeDef['learn'] }[] = [
  { id: 'rec_jewel_cut_quartz', level: 1, raw: 'mat_quartz', out: 'mat_cut_quartz', xp: 10, learn: 'auto' },
  { id: 'rec_jewel_cut_amber', level: 3, raw: 'mat_amber', out: 'mat_cut_amber', xp: 18, learn: 'auto' },
  { id: 'rec_jewel_cut_skycrystal', level: 5, raw: 'mat_sky_crystal', out: 'mat_cut_sky_crystal', xp: 30, learn: 'auto' },
  { id: 'rec_jewel_polish_pearl', level: 7, raw: 'mat_pearl', out: 'mat_polished_pearl', xp: 45, learn: 'auto' },
  { id: 'rec_jewel_cut_heart_crystal', level: 9, raw: 'mat_heart_crystal', out: 'mat_cut_heart_crystal', xp: 65, learn: 'quest' },
];
for (const g of CUT_GEM_RECIPES) {
  add({ id: g.id, profession: 'jewelcrafting', level: g.level, inputs: [{ itemId: g.raw, qty: 2 }], output: { itemId: g.out, qty: 1 }, xp: g.xp, learn: g.learn });
}

add({ id: 'rec_jewel_ring_quartz_loop', profession: 'jewelcrafting', level: 1, inputs: [{ itemId: 'mat_cut_quartz', qty: 1 }, { itemId: 'mat_copper_ore', qty: 1 }], output: { itemId: 'eq_ring_quartz_loop', qty: 1 }, xp: 12, learn: 'auto', minRarity: 'common' });
add({ id: 'rec_jewel_ring_amber_drop', profession: 'jewelcrafting', level: 3, inputs: [{ itemId: 'mat_cut_amber', qty: 1 }, { itemId: 'mat_iron_ore', qty: 1 }], output: { itemId: 'eq_ring_amber_drop', qty: 1 }, xp: 20, learn: 'auto', minRarity: 'uncommon' });
add({ id: 'rec_jewel_ring_tidepearl', profession: 'jewelcrafting', level: 4, inputs: [{ itemId: 'mat_pearl', qty: 1 }, { itemId: 'mat_kelp_essence', qty: 1 }], output: { itemId: 'eq_ring_tidepearl', qty: 1 }, xp: 26, learn: 'auto', minRarity: 'uncommon' });
add({ id: 'rec_jewel_ring_skycrystal', profession: 'jewelcrafting', level: 5, inputs: [{ itemId: 'mat_cut_sky_crystal', qty: 1 }, { itemId: 'mat_wisp_essence', qty: 1 }], output: { itemId: 'eq_ring_skycrystal', qty: 1 }, xp: 32, learn: 'trainer', trainerCost: 150, minRarity: 'uncommon' });
add({ id: 'rec_jewel_ring_galewind', profession: 'jewelcrafting', level: 6, inputs: [{ itemId: 'mat_cut_sky_crystal', qty: 1 }, { itemId: 'mat_storm_feather', qty: 1 }, { itemId: 'mat_scrap_fine', qty: 1 }], output: { itemId: 'eq_ring_galewind', qty: 1 }, xp: 40, learn: 'trainer', trainerCost: 200, minRarity: 'rare' });
add({ id: 'rec_jewel_ring_pearl_halo', profession: 'jewelcrafting', level: 7, inputs: [{ itemId: 'mat_polished_pearl', qty: 1 }, { itemId: 'mat_glimmer_scale', qty: 1 }], output: { itemId: 'eq_ring_pearl_halo', qty: 1 }, xp: 48, learn: 'trainer', trainerCost: 220, minRarity: 'rare' });
add({ id: 'rec_jewel_ring_reeftide', profession: 'jewelcrafting', level: 7, inputs: [{ itemId: 'mat_polished_pearl', qty: 1 }, { itemId: 'mat_coral_chunk', qty: 1 }], output: { itemId: 'eq_ring_reeftide', qty: 1 }, xp: 48, learn: 'trainer', trainerCost: 220, minRarity: 'rare' });
add({ id: 'rec_jewel_amulet_coralheart', profession: 'jewelcrafting', level: 8, inputs: [{ itemId: 'mat_coralite_ingot', qty: 1 }, { itemId: 'mat_polished_pearl', qty: 1 }, { itemId: 'mat_abyss_fang', qty: 1 }], output: { itemId: 'eq_amulet_coralheart', qty: 1 }, xp: 58, learn: 'trainer', trainerCost: 280, minRarity: 'rare' });
add({ id: 'rec_jewel_ring_voidglass', profession: 'jewelcrafting', level: 8, inputs: [{ itemId: 'mat_voidstone_ore', qty: 1 }, { itemId: 'mat_blight_goo', qty: 1 }], output: { itemId: 'eq_ring_voidglass', qty: 1 }, xp: 58, learn: 'trainer', trainerCost: 280, minRarity: 'rare' });
add({ id: 'rec_jewel_heartcrystal_ring', profession: 'jewelcrafting', level: 9, inputs: [{ itemId: 'mat_cut_heart_crystal', qty: 1 }, { itemId: 'mat_voidstone_ingot', qty: 1 }], output: { itemId: 'eq_ring_heartcrystal', qty: 1 }, xp: 70, learn: 'item', minRarity: 'epic' });
add({ id: 'rec_jewel_amulet_hollow_lantern', profession: 'jewelcrafting', level: 9, inputs: [{ itemId: 'mat_cut_heart_crystal', qty: 1 }, { itemId: 'mat_wraith_wisp', qty: 1 }, { itemId: 'mat_lantern_moss', qty: 1 }], output: { itemId: 'eq_amulet_hollow_lantern', qty: 1 }, xp: 70, learn: 'trainer', trainerCost: 350, minRarity: 'epic' });

add({ id: 'rec_jewel_enhance_stone_2', profession: 'jewelcrafting', level: 7, inputs: [{ itemId: 'mat_cut_amber', qty: 2 }, { itemId: 'mat_scrap_fine', qty: 2 }], output: { itemId: 'mat_enhance_stone_2', qty: 1 }, xp: 50, learn: 'trainer', trainerCost: 250 });
add({ id: 'rec_jewel_enhance_stone_3', profession: 'jewelcrafting', level: 10, inputs: [{ itemId: 'mat_cut_heart_crystal', qty: 2 }, { itemId: 'mat_scrap_arcane', qty: 2 }], output: { itemId: 'mat_enhance_stone_3', qty: 1 }, xp: 90, learn: 'trainer', trainerCost: 500 });

// Act VI accessories (Jewelcrafting, profession level 10, new materials).
add({ id: 'rec_jewel_ring_starlight_signet', profession: 'jewelcrafting', level: 10, inputs: [{ itemId: 'mat_star_shard', qty: 2 }, { itemId: 'mat_cut_heart_crystal', qty: 1 }], output: { itemId: 'eq_ring_starlight_signet', qty: 1 }, xp: 95, learn: 'trainer', trainerCost: 450, minRarity: 'epic' });
add({ id: 'rec_jewel_amulet_vesper_chorus', profession: 'jewelcrafting', level: 10, inputs: [{ itemId: 'mat_void_scale', qty: 2 }, { itemId: 'mat_singer_core', qty: 1 }], output: { itemId: 'eq_amulet_vesper_chorus', qty: 1 }, xp: 95, learn: 'trainer', trainerCost: 450, minRarity: 'epic' });

export const RECIPE_LIST: RecipeDef[] = RECIPES;
