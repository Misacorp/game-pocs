import type { IconShape, ItemDef, Rarity } from '../../types';

function mat(
  id: string,
  name: string,
  rarity: Rarity,
  sellPrice: number,
  description: string,
  shape: IconShape,
  colors: [string, string, string],
  extra?: Partial<ItemDef>,
): ItemDef {
  return { id, name, description, category: 'etc', rarity, icon: { shape, colors }, stack: 200, sellPrice, ...extra };
}

// ---------------------------------------------------------------------------
// Monster materials — Driftmoor (L1-11)
// ---------------------------------------------------------------------------

const DRIFTMOOR_MATS: ItemDef[] = [
  mat('mat_puffmoss_fluff', 'Puffmoss Fluff', 'common', 2, 'Soft, faintly sweet-smelling fluff shed by puffmoss when startled.', 'slime', ['#c9e0a0', '#a0c070', '#ffffff']),
  mat('mat_snail_shell', 'Snail Shell', 'common', 2, 'A spiral shell, still slightly damp.', 'shell', ['#c9a869', '#8b6b4a', '#e8dcc0']),
  mat('mat_sprout_cap', 'Sprout Cap', 'common', 2, 'A tiny mushroom cap, still twitching faintly if you look away.', 'mushroom', ['#e07850', '#c9a869', '#7a9b5c']),
  mat('mat_dewbug_wing', 'Dewbug Wing', 'common', 3, 'Translucent and dew-slicked, it beads water long after the bug is gone.', 'feather', ['#a0d0e0', '#70a0c0', '#ffffff']),
  mat('mat_boar_hide', 'Boar Hide', 'common', 3, 'Coarse, mossy hide, tough enough for basic leatherwork.', 'leather', ['#7a5a3a', '#5a4028', '#a08060']),
  mat('mat_boar_meat', 'Boar Meat', 'common', 3, 'A fair-sized cut. Tobbin says it stews well.', 'meat', ['#c9503a', '#8b3020', '#e0a080']),
  mat('mat_crab_claw', 'Crab Claw', 'common', 3, 'A single grotto-crab claw, still faintly clacking on reflex.', 'claw', ['#c96040', '#8b4020', '#e0a080']),
  mat('mat_bat_wing', 'Bat Wing', 'common', 3, 'Thin, leathery, and surprisingly quiet even detached.', 'feather', ['#5a4a5a', '#3a2a3a', '#8a7a8a']),
  mat('mat_jelly_goo', 'Glowjelly Goo', 'common', 3, 'Wobbles in the jar. Faintly luminous even after the jelly is gone.', 'slime', ['#a0ffcf', '#60cc9f', '#ffffff']),
  mat('mat_glowing_barnacle', 'Glowing Barnacle', 'uncommon', 5, 'Pried carefully off the grotto walls; it keeps glowing for days.', 'shell', ['#a0ffcf', '#60cc9f', '#e8dcc0']),
  mat('mat_rust_shell', 'Rustclaw Shell Plate', 'uncommon', 5, 'Reddish and pitted, from the more aggressive crabs deeper in the grotto.', 'shell', ['#a05a3a', '#7a3a20', '#c98a5a']),
];

// ---------------------------------------------------------------------------
// Monster materials — Finreach (L10-18)
// ---------------------------------------------------------------------------

const FINREACH_MATS: ItemDef[] = [
  mat('mat_kelp_essence', 'Kelp Essence', 'common', 4, 'A vial of concentrated kelp-sprite glow, still faintly wisping.', 'essence', ['#2f8f5c', '#1f6b45', '#a0ffcf']),
  mat('mat_vine_thorn', 'Vine Thorn', 'common', 4, "One of a tanglevine's barbed thorns, sap still weeping from the base.", 'claw', ['#5a7a3c', '#3f8f5c', '#d99a3c']),
  mat('mat_eel_fillet', 'Driftfin Eel Fillet', 'common', 4, 'Oily and iridescent. Good eating, if you can stand the smell first.', 'fish', ['#3a6a8a', '#5a9ac0', '#e8e8e8']),
  mat('mat_spore_dust', 'Spore Dust', 'common', 4, 'Fine dust that makes you sneeze if you jar it too hard.', 'dust', ['#c9a869', '#8b6b4a', '#e8dcc0']),
  mat('mat_poacher_cloth', 'Poacher Cloth', 'common', 5, 'A scrap of oilcloth torn from a Harpooner poacher\'s coat.', 'cloth', ['#5a6b7a', '#8b6b4a', '#3a4a5a']),
  mat('mat_spider_silk', 'Kelp Spider Silk', 'uncommon', 6, 'Impossibly strong for how little it weighs.', 'cloth', ['#d0e0d0', '#a0c0a0', '#ffffff']),
];

// ---------------------------------------------------------------------------
// Monster materials — Stormbreak (L15-24)
// ---------------------------------------------------------------------------

const STORMBREAK_MATS: ItemDef[] = [
  mat('mat_wisp_essence', 'Gust Wisp Essence', 'common', 6, 'A captured swirl of wind, faintly cool to the touch.', 'essence', ['#cfe0ee', '#8fb8d8', '#ffffff']),
  mat('mat_cloud_fluff', 'Cloud Puff Fluff', 'common', 6, "Weighs almost nothing. It's hard to keep it in a bag.", 'slime', ['#f0f4ff', '#cfe0ee', '#ffffff']),
  mat('mat_storm_feather', 'Stormhawk Feather', 'common', 6, 'Crackles faintly with static when you run a thumb along it.', 'feather', ['#5a6b7a', '#cfe0ee', '#4fd1ff']),
  mat('mat_thunder_carapace', 'Thunder Beetle Carapace', 'uncommon', 8, 'Hard as stormsteel and just as conductive.', 'shell', ['#4a3a2a', '#8b6b4a', '#4fd1ff']),
  mat('mat_golem_core', 'Cliff Golem Core', 'uncommon', 9, 'A fist-sized chunk of animated stone, cool and inert now.', 'core', ['#7a7a7a', '#4a4a4a', '#cfe0ee']),
  mat('mat_raider_badge', 'Sky Raider Badge', 'uncommon', 9, 'A crude tin badge stamped with a raider crew\'s sigil.', 'core', ['#8b6b4a', '#5a4028', '#c9a869']),
  mat('mat_sky_egg', 'Sky Egg', 'uncommon', 10, 'Small, speckled, and warm — best not to ask which bird laid it.', 'orb', ['#f0e4c0', '#d9c090', '#ffffff']),
];

// ---------------------------------------------------------------------------
// Monster materials — Lanternreef (L23-30)
// ---------------------------------------------------------------------------

const LANTERNREEF_MATS: ItemDef[] = [
  mat('mat_lantern_goo', 'Lantern Jelly Goo', 'common', 9, 'Glows a soft green in the dark, even weeks after collection.', 'slime', ['#3fe0c8', '#1fa088', '#ffffff']),
  mat('mat_reef_claw', 'Reef Crab Claw', 'common', 9, 'Heavier and sharper-edged than its grotto cousins.', 'claw', ['#ff7f8a', '#cc4a58', '#f0e6d2']),
  mat('mat_glimmer_scale', 'Glimmerfish Scale', 'uncommon', 11, 'Catches light like a held mirror, even in the deep dark.', 'scale', ['#3fe0c8', '#ff7f8a', '#f0e6d2']),
  mat('mat_fish_fillet', 'Reef Fish Fillet', 'common', 9, 'Fresh, pale, and prized by Tobbin for chowder.', 'fish', ['#f0e6d2', '#ff9fa8', '#ffffff']),
  mat('mat_coral_chunk', 'Coral Chunk', 'common', 10, 'Broken from a golem\'s hide, still faintly warm.', 'coral', ['#ff7f8a', '#3fe0c8', '#f0e6d2']),
  mat('mat_abyss_fang', 'Abyss Eel Fang', 'uncommon', 12, 'Needle-thin and faintly venomous even removed from the eel.', 'fang', ['#3a1f4a', '#5a3f7a', '#f0e6d2']),
  mat('mat_drowned_cloth', "Drowned Sailor's Cloth", 'uncommon', 12, 'Waterlogged wool that somehow never fully dries.', 'cloth', ['#3fe0c8', '#5a6b7a', '#8b6b4a']),
];

// ---------------------------------------------------------------------------
// Monster materials — Hollow (L29-36)
// ---------------------------------------------------------------------------

const HOLLOW_MATS: ItemDef[] = [
  mat('mat_blight_goo', 'Blight Slime Goo', 'uncommon', 13, "Sticky and faintly violet. Wash your hands after, twice.", 'slime', ['#5a3f7a', '#3a1f4a', '#8a5fd0']),
  mat('mat_rot_cap', 'Rot Mushling Cap', 'uncommon', 13, 'Squishy and discolored, but Tobbin insists it\'s "structurally interesting."', 'mushroom', ['#7a5a3a', '#5a3f7a', '#8a5fd0']),
  mat('mat_grub_meat', 'Parasite Grub Meat', 'uncommon', 14, "Tobbin swears it's delicious once you pick out the bristles.", 'meat', ['#8a5fd0', '#5a3f7a', '#c9c9a0']),
  mat('mat_sentinel_rune', 'Hollow Sentinel Rune', 'rare', 18, 'Etched stone, still faintly warm from whatever animates the golem.', 'stone', ['#5a3f7a', '#8a5fd0', '#3a1f4a']),
  mat('mat_blighted_wing', 'Blighted Bat Wing', 'uncommon', 15, 'Leathery and mottled with dark violet veining.', 'feather', ['#3a1f4a', '#5a3f7a', '#8a5fd0']),
  mat('mat_wraith_wisp', 'Whisper Wraith Wisp', 'rare', 19, "A captured fragment of a wraith's whisper. It never quite stops murmuring.", 'essence', ['#8a5fd0', '#3a1f4a', '#e8e0ff']),
];

// ---------------------------------------------------------------------------
// Boss materials
// ---------------------------------------------------------------------------

const BOSS_MATS: ItemDef[] = [
  mat('mat_king_barnacle_shell', "King Barnacle's Shell Plate", 'rare', 35, "A slab from the crab king's own shell, thick enough to stop a spear.", 'shell', ['#6f8f8a', '#8b6b4a', '#d8cdb0']),
  mat('mat_tangle_heartwood', 'Tangle Heartwood', 'rare', 40, "Cut from Old Tangle's living core. It's still faintly growing.", 'wood', ['#1f6b45', '#2f8f5c', '#d99a3c']),
  mat('mat_storm_plume', "Kraelith's Storm Plume", 'rare', 48, "A single unbroken feather from the storm roc's wing, humming with charge.", 'feather', ['#cfe0ee', '#4fd1ff', '#5a6b7a']),
  mat('mat_captain_doubloon', "Captain Rook's Doubloon", 'rare', 55, "An old harpooner's coin, corroded green but still recognizably a whale-and-harpoon.", 'coin', ['#3fe0c8', '#f0e6d2', '#ff7f8a']),
  mat('mat_heart_ember', "Ember of the Blight Heart", 'epic', 70, "A cooling coal-red fragment of the Blight Heart itself. It pulses, very faintly, still.", 'core', ['#8a5fd0', '#3a1f4a', '#ff8844']),
];

// ---------------------------------------------------------------------------
// Salvage
// ---------------------------------------------------------------------------

const SALVAGE_MATS: ItemDef[] = [
  mat('mat_scrap_iron', 'Iron Scrap', 'common', 3, 'Salvaged from common or uncommon gear. Brina melts it right back down.', 'ore', ['#8a8a8a', '#5a5a5a', '#c9c9c9']),
  mat('mat_scrap_fine', 'Fine Scrap', 'uncommon', 10, 'Salvaged from rare-grade gear. Worth more than it looks.', 'ore', ['#5aa9ff', '#3377cc', '#c9c9c9']),
  mat('mat_scrap_arcane', 'Arcane Scrap', 'rare', 25, 'Salvaged from epic-grade gear or better, faintly humming with leftover enchantment.', 'ore', ['#c77dff', '#8855cc', '#e8e8e8']),
];

// ---------------------------------------------------------------------------
// Enhancement stones
// ---------------------------------------------------------------------------

const ENHANCE_MATS: ItemDef[] = [
  mat('mat_enhance_stone_1', 'Enhancement Stone I', 'uncommon', 40, 'A rough-cut stone that lets a smith push gear up to +5 stars.', 'gem', ['#c9c9c9', '#8a8a8a', '#ffffff'], { enhanceStone: { tier: 1, maxStarsUsable: 5 } }),
  mat('mat_enhance_stone_2', 'Enhancement Stone II', 'rare', 120, 'A denser, more stable stone — safe up to +10 stars.', 'gem', ['#5aa9ff', '#3377cc', '#e8e8e8'], { enhanceStone: { tier: 2, maxStarsUsable: 10 } }),
  mat('mat_enhance_stone_3', 'Enhancement Stone III', 'epic', 400, 'Jewelcrafted from heart-crystal dust; the only stone rated for +15.', 'gem', ['#c77dff', '#8855cc', '#ffffff'], { enhanceStone: { tier: 3, maxStarsUsable: 15 } }),
];

// ---------------------------------------------------------------------------
// Gathered raws — ores, crystals, herbs
// ---------------------------------------------------------------------------

const ORES: ItemDef[] = [
  mat('mat_copper_ore', 'Copper Ore', 'common', 3, 'Soft, reddish ore veined through the meadow rock.', 'ore', ['#c98a4a', '#8b5a2a', '#e0a868']),
  mat('mat_iron_ore', 'Iron Ore', 'common', 5, 'Dull grey ore, heavier than it looks.', 'ore', ['#8a8a8a', '#5a5a5a', '#c9c9c9']),
  mat('mat_stormsteel_ore', 'Stormsteel Ore', 'uncommon', 8, 'Veined with faint blue lightning-scarring.', 'ore', ['#5a6b7a', '#4fd1ff', '#cfe0ee']),
  mat('mat_coralite_ore', 'Coralite Ore', 'uncommon', 12, 'Fossilized reef coral, dense and faintly pink.', 'ore', ['#ff7f8a', '#cc4a58', '#f0e6d2']),
  mat('mat_voidstone_ore', 'Voidstone Ore', 'rare', 18, 'Unnervingly light for its size, and cold no matter how long you hold it.', 'ore', ['#5a3f7a', '#3a1f4a', '#8a5fd0']),
];

const CRYSTALS: ItemDef[] = [
  mat('mat_quartz', 'Rough Quartz', 'common', 4, 'Clear, cheap, common. Every fledgling jeweler starts here.', 'crystal', ['#e8e8f0', '#c9c9e0', '#ffffff']),
  mat('mat_amber', 'Raw Amber', 'common', 6, "Warm gold, sometimes with a trapped bug — Sera pays extra for those.", 'crystal', ['#d99a3c', '#f0c070', '#8b5a2a']),
  mat('mat_sky_crystal', 'Sky Crystal Shard', 'uncommon', 9, 'Hums faintly, as if still catching a distant storm.', 'crystal', ['#4fd1ff', '#cfe0ee', '#ffffff']),
  mat('mat_pearl', 'Raw Pearl', 'uncommon', 13, 'Rough and unpolished, plucked straight from a reef oyster.', 'pearl', ['#f0e6d2', '#d8cdb0', '#ffffff']),
  mat('mat_heart_crystal', 'Heart Crystal Shard', 'rare', 20, "A splinter of crystal grown near Oma's own heart-ember, warm to the touch.", 'crystal', ['#8a5fd0', '#5a3f7a', '#ff8844']),
];

const HERBS: ItemDef[] = [
  mat('mat_meadow_herb', 'Meadow Herb', 'common', 3, 'Common, fragrant, and Juniper\'s favorite base ingredient.', 'herb', ['#7a9b5c', '#5a7a3c', '#c9e0a0']),
  mat('mat_dewcap', 'Dewcap Mushroom', 'common', 3, 'Always damp, no matter how dry the day.', 'mushroom', ['#a0d0e0', '#70a0c0', '#ffffff']),
  mat('mat_kelp_leaf', 'Kelp Leaf', 'common', 4, 'Broad and rubbery, harvested from the upper kelp canopy.', 'leaf', ['#2f8f5c', '#1f6b45', '#d99a3c']),
  mat('mat_sporecap', 'Sporecap Mushroom', 'common', 4, 'Releases a fine dust if you squeeze it — don\'t squeeze it indoors.', 'mushroom', ['#c9a869', '#8b6b4a', '#e0a080']),
  mat('mat_windbloom', 'Windbloom', 'uncommon', 7, "A flower that never quite stops trembling, even indoors.", 'flower', ['#cfe0ee', '#4fd1ff', '#ffffff']),
  mat('mat_glow_coral', 'Glow Coral Sprig', 'uncommon', 10, 'Snapped from a living reef branch; keeps glowing for a week.', 'coral', ['#3fe0c8', '#ff7f8a', '#f0e6d2']),
  mat('mat_lantern_moss', 'Lantern Moss', 'uncommon', 10, 'Soft moss that gives off a gentle bioluminescent light.', 'leaf', ['#3fe0c8', '#1fa088', '#f0e6d2']),
  mat('mat_blightthorn', 'Blightthorn', 'rare', 15, 'A thorned violet bloom that thrives in corrupted soil.', 'flower', ['#5a3f7a', '#8a5fd0', '#3a1f4a']),
];

// ---------------------------------------------------------------------------
// Refined materials (crafted from raws)
// ---------------------------------------------------------------------------

const REFINED: ItemDef[] = [
  mat('mat_copper_ingot', 'Copper Ingot', 'common', 8, 'Smelted and poured into a clean bar.', 'ingot', ['#c98a4a', '#8b5a2a', '#e0a868']),
  mat('mat_iron_ingot', 'Iron Ingot', 'common', 13, 'A dense, dull-grey bar, ready for the anvil.', 'ingot', ['#8a8a8a', '#5a5a5a', '#c9c9c9']),
  mat('mat_stormsteel_ingot', 'Stormsteel Ingot', 'uncommon', 20, 'Quenched mid-squall; it still crackles faintly under a hammer.', 'ingot', ['#5a6b7a', '#4fd1ff', '#cfe0ee']),
  mat('mat_coralite_ingot', 'Coralite Ingot', 'uncommon', 28, 'Fused reef-coral, cast into a workable bar.', 'ingot', ['#ff7f8a', '#cc4a58', '#f0e6d2']),
  mat('mat_voidstone_ingot', 'Voidstone Ingot', 'rare', 42, 'Unsettling to hold — it seems to absorb the forge-light around it.', 'ingot', ['#5a3f7a', '#3a1f4a', '#8a5fd0']),
  mat('mat_cut_quartz', 'Cut Quartz', 'common', 10, 'Faceted and polished; catches candlelight nicely.', 'gem', ['#e8e8f0', '#c9c9e0', '#ffffff']),
  mat('mat_cut_amber', 'Cut Amber', 'uncommon', 16, 'Faceted gold, warm even in a cold room.', 'gem', ['#d99a3c', '#f0c070', '#8b5a2a']),
  mat('mat_cut_sky_crystal', 'Cut Sky Crystal', 'uncommon', 24, 'Faceted to catch and hold a static charge.', 'gem', ['#4fd1ff', '#cfe0ee', '#ffffff']),
  mat('mat_polished_pearl', 'Polished Pearl', 'rare', 32, 'Buffed to a perfect, glossy sheen.', 'pearl', ['#f0e6d2', '#d8cdb0', '#ffffff']),
  mat('mat_cut_heart_crystal', 'Cut Heart Crystal', 'epic', 55, "Faceted with painstaking care — Sera calls this her masterwork cut.", 'gem', ['#8a5fd0', '#5a3f7a', '#ff8844']),
];

export const MATERIAL_ITEMS: ItemDef[] = [
  ...DRIFTMOOR_MATS,
  ...FINREACH_MATS,
  ...STORMBREAK_MATS,
  ...LANTERNREEF_MATS,
  ...HOLLOW_MATS,
  ...BOSS_MATS,
  ...SALVAGE_MATS,
  ...ENHANCE_MATS,
  ...ORES,
  ...CRYSTALS,
  ...HERBS,
  ...REFINED,
];
