import type { ItemDef } from '../../types';

const MIN = 60_000;

// ---------------------------------------------------------------------------
// HP / MP potions (registry ids, §11)
// ---------------------------------------------------------------------------

const POTIONS: ItemDef[] = [
  { id: 'use_hp_potion_s', name: 'Small Health Tonic', description: "Juniper's basic brew. Tastes like meadow herbs and regret.", category: 'use', rarity: 'common', icon: { shape: 'potion', colors: ['#ff5566', '#ff8899', '#ffffff'] }, stack: 99, sellPrice: 5, buyPrice: 20, use: { heal: { hp: 60 }, cooldownGroup: 'potion', cooldownMs: 800 } },
  { id: 'use_hp_potion_m', name: 'Health Tonic', description: 'A stronger red brew, bottled in Driftmoor.', category: 'use', rarity: 'common', icon: { shape: 'potion', colors: ['#ff3344', '#ff6677', '#ffffff'] }, stack: 99, sellPrice: 15, buyPrice: 60, levelReq: 8, use: { heal: { hp: 200 }, cooldownGroup: 'potion', cooldownMs: 800 } },
  { id: 'use_hp_potion_l', name: 'Large Health Tonic', description: 'Thick, dark red, and faintly kelp-flavored.', category: 'use', rarity: 'uncommon', icon: { shape: 'potion', colors: ['#dd1122', '#ff4455', '#ffffff'] }, stack: 99, sellPrice: 38, buyPrice: 150, levelReq: 16, use: { heal: { hp: 500 }, cooldownGroup: 'potion', cooldownMs: 800 } },
  { id: 'use_hp_potion_xl', name: 'Greater Health Tonic', description: "Sera-cut crystal dust stirred into the brew makes it burn going down.", category: 'use', rarity: 'rare', icon: { shape: 'potion', colors: ['#aa0011', '#dd3344', '#ffcc66' ] }, stack: 99, sellPrice: 88, buyPrice: 350, levelReq: 26, use: { heal: { hp: 1200 }, cooldownGroup: 'potion', cooldownMs: 800 } },

  { id: 'use_mp_potion_s', name: 'Small Mana Tonic', description: 'Cool blue and faintly sparkling. Stormcallers swear by it.', category: 'use', rarity: 'common', icon: { shape: 'potion', colors: ['#4488ff', '#77aaff', '#ffffff'] }, stack: 99, sellPrice: 5, buyPrice: 20, use: { heal: { mp: 40 }, cooldownGroup: 'potion', cooldownMs: 800 } },
  { id: 'use_mp_potion_m', name: 'Mana Tonic', description: 'A brighter blue, brewed with sky crystal shavings.', category: 'use', rarity: 'common', icon: { shape: 'potion', colors: ['#2266ff', '#5588ff', '#ffffff'] }, stack: 99, sellPrice: 15, buyPrice: 60, levelReq: 8, use: { heal: { mp: 120 }, cooldownGroup: 'potion', cooldownMs: 800 } },
  { id: 'use_mp_potion_l', name: 'Large Mana Tonic', description: 'Cold enough to fog the bottle glass.', category: 'use', rarity: 'uncommon', icon: { shape: 'potion', colors: ['#1144dd', '#3366ff', '#ffffff'] }, stack: 99, sellPrice: 38, buyPrice: 150, levelReq: 16, use: { heal: { mp: 300 }, cooldownGroup: 'potion', cooldownMs: 800 } },
  { id: 'use_mp_potion_xl', name: 'Greater Mana Tonic', description: 'Heart-crystal dust suspended in the liquid, still visibly swirling.', category: 'use', rarity: 'rare', icon: { shape: 'potion', colors: ['#0022aa', '#2244cc', '#88ccff'] }, stack: 99, sellPrice: 88, buyPrice: 350, levelReq: 26, use: { heal: { mp: 700 }, cooldownGroup: 'potion', cooldownMs: 800 } },

  { id: 'use_elixir_s', name: 'Elixir of Renewal', description: 'A shimmering draught that restores half of everything at once.', category: 'use', rarity: 'uncommon', icon: { shape: 'elixir', colors: ['#ffaa33', '#ff66aa', '#ffffff'] }, stack: 20, sellPrice: 50, buyPrice: 200, levelReq: 10, use: { heal: { hpPct: 0.5, mpPct: 0.5 }, cooldownGroup: 'potion', cooldownMs: 800 } },

  { id: 'use_return_scroll', name: 'Return Scroll', description: 'A single-use scroll, folded around a pinch of harbor sand. Reads itself back to town.', category: 'use', rarity: 'common', icon: { shape: 'scroll', colors: ['#e8dcc0', '#c9a869', '#8b6b4a'] }, stack: 20, sellPrice: 10, buyPrice: 50, use: { teleport: 'town' } },
  { id: 'use_stat_reset', name: 'Tonic of Second Thoughts', description: "Juniper's priciest brew — unwinds every ability point you've ever spent.", category: 'use', rarity: 'rare', icon: { shape: 'flask', colors: ['#c77dff', '#8855cc', '#ffffff'] }, stack: 5, sellPrice: 500, buyPrice: 5000, use: { resetStats: true } },
  { id: 'use_skill_reset', name: 'Tonic of Forgetting', description: 'Clears every skill point spent so you can start your build over.', category: 'use', rarity: 'rare', icon: { shape: 'flask', colors: ['#5aa9ff', '#3377cc', '#ffffff'] }, stack: 5, sellPrice: 500, buyPrice: 5000, use: { resetSkills: true } },
];

// ---------------------------------------------------------------------------
// Alchemy elixirs — 3 tiers each, same buff id per line so re-drinking upgrades.
// ---------------------------------------------------------------------------

interface ElixirTier { suffix: string; level: number; rarity: 'uncommon' | 'rare' | 'epic'; durationMs: number; buy: number }
const ELIXIR_TIERS: ElixirTier[] = [
  { suffix: '1', level: 5, rarity: 'uncommon', durationMs: 20 * MIN, buy: 80 },
  { suffix: '2', level: 15, rarity: 'rare', durationMs: 25 * MIN, buy: 200 },
  { suffix: '3', level: 28, rarity: 'epic', durationMs: 30 * MIN, buy: 450 },
];

function elixir(idBase: string, name: string, desc: string, colors: [string, string, string], statsByTier: Record<string, number>[]): ItemDef[] {
  return ELIXIR_TIERS.map((t, i) => {
    const price = Math.round(t.buy);
    return {
      id: `use_${idBase}_${t.suffix}`,
      name: `${name} ${'I'.repeat(i + 1)}`,
      description: desc,
      category: 'use' as const,
      rarity: t.rarity,
      icon: { shape: 'elixir' as const, colors },
      stack: 20,
      sellPrice: Math.round(price / 4),
      buyPrice: price,
      levelReq: t.level,
      use: {
        buff: { id: `elixir_${idBase}`, name, stats: statsByTier[i], durationMs: t.durationMs },
        cooldownGroup: undefined,
      },
    };
  });
}

const ELIXIRS: ItemDef[] = [
  ...elixir('might', 'Elixir of Might', 'Smells of iron filings. Your next swings hit noticeably harder.', ['#ff5544', '#dd3322', '#ffaa88'], [{ attack: 8 }, { attack: 16 }, { attack: 28 }]),
  ...elixir('arcana', 'Elixir of Arcana', 'Sparks faintly blue when uncorked, like bottled static.', ['#5a99ff', '#3366dd', '#aaccff'], [{ magicAttack: 8 }, { magicAttack: 16 }, { magicAttack: 28 }]),
  ...elixir('iron', 'Elixir of Iron Skin', "Thick and gritty — Brina's own recipe, minus the actual iron filings (probably).", ['#8899aa', '#5a6b7a', '#cfd8e0'], [{ defense: 5, maxHp: 30 }, { defense: 10, maxHp: 60 }, { defense: 18, maxHp: 110 }]),
  ...elixir('precision', 'Elixir of Precision', 'Clears the mind wonderfully. Every opening looks a little wider.', ['#ffd166', '#e0a833', '#fff0c0'], [{ critRate: 0.03 }, { critRate: 0.05 }, { critRate: 0.08 }]),
  ...elixir('swiftness', 'Elixir of Swiftness', "Fizzes on the tongue. You'll feel light on your feet for a while.", ['#66ddaa', '#33aa77', '#c0ffe6'], [{ speed: 5, jump: 3 }, { speed: 8, jump: 5 }, { speed: 12, jump: 8 }]),
];

// ---------------------------------------------------------------------------
// Whetstones (Smithing) — short attack buff, single stack.
// ---------------------------------------------------------------------------

const WHETSTONES: ItemDef[] = [
  { id: 'use_whetstone_1', name: 'Rough Whetstone', description: "A quick pass on a chipped stone. Won't last, but it edges the blade.", category: 'use', rarity: 'common', icon: { shape: 'stone', colors: ['#9a9a9a', '#6f6f6f', '#c9c9c9'] }, stack: 20, sellPrice: 8, buyPrice: 30, levelReq: 1, use: { buff: { id: 'whetstone', name: 'Whetted Edge', stats: { attack: 10 }, durationMs: 5 * MIN } } },
  { id: 'use_whetstone_2', name: 'Iron Whetstone', description: 'Fine-grained and even. Brina sells these by the crate.', category: 'use', rarity: 'common', icon: { shape: 'stone', colors: ['#7a8a9a', '#5a6b7a', '#c9c9c9'] }, stack: 20, sellPrice: 16, buyPrice: 60, levelReq: 10, use: { buff: { id: 'whetstone', name: 'Whetted Edge', stats: { attack: 20 }, durationMs: 5 * MIN } } },
  { id: 'use_whetstone_3', name: 'Stormsteel Whetstone', description: 'Charged faintly with lingering storm static.', category: 'use', rarity: 'uncommon', icon: { shape: 'stone', colors: ['#5a6b7a', '#4fd1ff', '#cfe0ee'] }, stack: 20, sellPrice: 32, buyPrice: 120, levelReq: 20, use: { buff: { id: 'whetstone', name: 'Whetted Edge', stats: { attack: 35 }, durationMs: 5 * MIN } } },
  { id: 'use_whetstone_4', name: 'Coralbright Whetstone', description: 'Grown, not quarried — Sera insists this makes it sharper.', category: 'use', rarity: 'uncommon', icon: { shape: 'stone', colors: ['#ff7f8a', '#3fe0c8', '#f0e6d2'] }, stack: 20, sellPrice: 60, buyPrice: 220, levelReq: 30, use: { buff: { id: 'whetstone', name: 'Whetted Edge', stats: { attack: 55 }, durationMs: 5 * MIN } } },
];

// ---------------------------------------------------------------------------
// Cooking — Food (single 'food' buff) + instant snacks
// ---------------------------------------------------------------------------

const FOODS: ItemDef[] = [
  { id: 'use_food_mossback_stew', name: 'Mossback Stew', description: "Tobbin's signature stew, thick with boar meat and meadow herbs. Warms you from the inside.", category: 'use', rarity: 'common', icon: { shape: 'soup', colors: ['#8b6b4a', '#c9a869', '#7a9b5c'] }, stack: 20, sellPrice: 20, buyPrice: 80, levelReq: 3, use: { buff: { id: 'food', name: 'Mossback Stew', stats: { hpRegen: 6, maxHp: 40 }, durationMs: 25 * MIN } } },
  { id: 'use_food_eel_skewer', name: 'Grilled Eel Skewer', description: 'Driftfin eel, charred just right over an open flame.', category: 'use', rarity: 'uncommon', icon: { shape: 'meat', colors: ['#d99a3c', '#8b5a2a', '#3f8f5c'] }, stack: 20, sellPrice: 35, buyPrice: 150, levelReq: 12, use: { buff: { id: 'food', name: 'Grilled Eel Skewer', stats: { attack: 8, magicAttack: 8 }, durationMs: 25 * MIN } } },
  { id: 'use_food_skyegg_omelette', name: 'Skyegg Omelette', description: "Fluffy, golden, and — according to Tobbin — 'unreasonably motivating.'", category: 'use', rarity: 'uncommon', icon: { shape: 'food', colors: ['#ffe27a', '#f0c070', '#ffffff'] }, stack: 20, sellPrice: 55, buyPrice: 220, levelReq: 19, use: { buff: { id: 'food', name: 'Skyegg Omelette', stats: { xpBonus: 0.10 }, durationMs: 30 * MIN } } },
  { id: 'use_food_glimmerfish_pie', name: 'Glimmerfish Pie', description: 'Glimmerscale glitters faintly through the crust. Somehow it makes loot easier to spot.', category: 'use', rarity: 'rare', icon: { shape: 'food', colors: ['#3fe0c8', '#f0e6d2', '#ff7f8a'] }, stack: 20, sellPrice: 90, buyPrice: 360, levelReq: 25, use: { buff: { id: 'food', name: 'Glimmerfish Pie', stats: { dropBonus: 0.15, goldBonus: 0.10 }, durationMs: 30 * MIN } } },
  { id: 'use_food_hollow_grub_surprise', name: 'Hollow Grub Surprise', description: "Tobbin swears it's delicious once you pick out the bristles. Somehow it works wonders.", category: 'use', rarity: 'epic', icon: { shape: 'food', colors: ['#5a3f7a', '#8a5fd0', '#3a1f4a'] }, stack: 20, sellPrice: 150, buyPrice: 600, levelReq: 32, use: { buff: { id: 'food', name: 'Hollow Grub Surprise', stats: { xpBonus: 0.20, damagePct: 0.05 }, durationMs: 30 * MIN } } },

  { id: 'use_snack_honeycake', name: 'Honeyed Meadow Cake', description: 'A dense little cake, sweet enough to make up for the trip up the hill.', category: 'use', rarity: 'common', icon: { shape: 'bread', colors: ['#e0a833', '#ffe27a', '#8b6b4a'] }, stack: 20, sellPrice: 12, buyPrice: 45, levelReq: 1, use: { heal: { hp: 150 } } },
  { id: 'use_snack_riceball', name: 'Kelp Rice Ball', description: 'Wrapped in dried kelp leaf; the salt cuts the plainness of the rice.', category: 'use', rarity: 'common', icon: { shape: 'food', colors: ['#3f8f5c', '#e8e8d0', '#1f6b45'] }, stack: 20, sellPrice: 22, buyPrice: 90, levelReq: 10, use: { heal: { hp: 300, mp: 100 } } },
  { id: 'use_snack_storm_jerky', name: 'Storm Jerky', description: 'Cured in the winds off Thunderhead Peaks. Tough, salty, effective.', category: 'use', rarity: 'uncommon', icon: { shape: 'meat', colors: ['#8b5a2a', '#5a6b7a', '#cfe0ee'] }, stack: 20, sellPrice: 35, buyPrice: 140, levelReq: 20, use: { heal: { hp: 400 } } },
  { id: 'use_snack_reef_chowder', name: 'Reef Chowder', description: 'Thick, creamy, and full of things Nell insists are edible.', category: 'use', rarity: 'uncommon', icon: { shape: 'soup', colors: ['#f0e6d2', '#ff7f8a', '#3fe0c8'] }, stack: 20, sellPrice: 55, buyPrice: 220, levelReq: 27, use: { heal: { hp: 600, mp: 200 } } },
];

// ---------------------------------------------------------------------------
// Recipe scrolls (rare recipes; use.learnRecipe). Sold in shops or quest rewards.
// ---------------------------------------------------------------------------

const RECIPE_SCROLLS: ItemDef[] = [
  { id: 'rec_scroll_stormsteel_blade', name: 'Smithing Plans: Stormsteel Blade', description: 'Brina traded a favor for this — proper diagrams for a stormsteel edge.', category: 'use', rarity: 'rare', icon: { shape: 'book', colors: ['#5a6b7a', '#cfe0ee', '#4fd1ff'] }, stack: 5, sellPrice: 40, buyPrice: 300, levelReq: 18, use: { learnRecipe: 'rec_smith_stormsteel_forged_weapons' } },
  { id: 'rec_scroll_precision_elixir', name: "Alchemist's Notes: Precision III", description: "Juniper's own handwriting, smudged with reagent stains.", category: 'use', rarity: 'rare', icon: { shape: 'book', colors: ['#ffd166', '#e0a833', '#fff0c0'] }, stack: 5, sellPrice: 40, buyPrice: 300, levelReq: 26, use: { learnRecipe: 'rec_alchemy_elixir_precision_3' } },
  { id: 'rec_scroll_heartcrystal_ring', name: "Jeweler's Secret: Heartcrystal Setting", description: "Sera only shares this with jewelers she trusts not to undercut her.", category: 'use', rarity: 'epic', icon: { shape: 'book', colors: ['#8a5fd0', '#3a1f4a', '#5a3f7a'] }, stack: 5, sellPrice: 60, buyPrice: 500, levelReq: 32, use: { learnRecipe: 'rec_jewel_heartcrystal_ring' } },
  { id: 'rec_scroll_hollow_grub_surprise', name: "Tobbin's Dare: Hollow Grub Surprise", description: "'If you can find someone brave enough to eat it, this recipe is yours.'", category: 'use', rarity: 'rare', icon: { shape: 'book', colors: ['#5a3f7a', '#8a5fd0', '#3a1f4a'] }, stack: 5, sellPrice: 40, buyPrice: 300, levelReq: 30, use: { learnRecipe: 'rec_cook_hollow_grub_surprise' } },
];

export const CONSUMABLE_ITEMS: ItemDef[] = [
  ...POTIONS,
  ...ELIXIRS,
  ...WHETSTONES,
  ...FOODS,
  ...RECIPE_SCROLLS,
];
