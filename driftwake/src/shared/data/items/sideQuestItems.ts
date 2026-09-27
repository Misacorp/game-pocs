import type { ItemDef } from '../../types';

/**
 * Quest items owned by the SIDE-QUEST agent (side.ts / profession.ts / town.ts).
 * qi_wren_kite and qi_lost_locket are the two ids explicitly assigned to this
 * file by the task brief (they also appear in DESIGN.md §11's general
 * "quest agent" list — if the main-story agent also defines them in
 * questItems.ts, the lead should keep this copy and drop that one; flagged
 * in the final report).
 *
 * All quest items: category 'etc', quest:true (unsellable/undroppable),
 * stack 99, sellPrice 0.
 */
export const SIDE_QUEST_ITEMS: ItemDef[] = [
  {
    id: 'qi_wren_kite',
    name: "Wren's Kite",
    description: 'A patchwork kite in the shape of a grinning skywhale, badly tangled. Its string is still warm from someone gripping it too tight.',
    category: 'etc',
    rarity: 'common',
    icon: { shape: 'cloth', colors: ['#ff8fa3', '#ffd166'], glyph: '~' },
    stack: 99,
    sellPrice: 0,
    quest: true,
  },
  {
    id: 'qi_lost_locket',
    name: 'Tarnished Locket',
    description: 'A small silver locket, clasp rusted shut. Something about it feels like it was loved, once.',
    category: 'etc',
    rarity: 'common',
    icon: { shape: 'relic', colors: ['#c9c9d4', '#8a8aa0'] },
    stack: 99,
    sellPrice: 0,
    quest: true,
  },
  {
    id: 'qi_ghost_letter',
    name: "The Lamplighter's Letter",
    description: 'A folded letter, damp and sea-stained, sealed with a wax whale stamp. The ink has almost given up.',
    category: 'etc',
    rarity: 'common',
    icon: { shape: 'letter', colors: ['#e8dcc0', '#4fd1c5'] },
    stack: 99,
    sellPrice: 0,
    quest: true,
  },
  {
    id: 'qi_whalecalf_pearl',
    name: 'Whale-Calf Pearl',
    description: "An iridescent pearl, unnaturally large — the kind that only forms in a skywhale calf's ear, and only if the calf survives to adulthood. It shouldn't exist outside a living whale.",
    category: 'etc',
    rarity: 'uncommon',
    icon: { shape: 'pearl', colors: ['#f0f4ff', '#a0c4ff'] },
    stack: 99,
    sellPrice: 0,
    quest: true,
  },
  {
    id: 'qi_drowned_ring',
    name: "Drowned Sailor's Ring",
    description: 'A plain wedding band, greened with age, pried gently from cold fingers. There is a name engraved inside, worn nearly smooth.',
    category: 'etc',
    rarity: 'common',
    icon: { shape: 'ring', colors: ['#d4af37', '#6b8f8f'] },
    stack: 99,
    sellPrice: 0,
    quest: true,
  },
  {
    id: 'qi_raider_ledger',
    name: "Raider's Ledger",
    description: 'A thick, careful ledger of illegal trades, routes, and payoffs. Someone up on the ledges kept excellent records of some very bad business.',
    category: 'etc',
    rarity: 'uncommon',
    icon: { shape: 'book', colors: ['#6f6f6f', '#3a3a3a'] },
    stack: 99,
    sellPrice: 0,
    quest: true,
  },
  {
    id: 'qi_wreckers_signal_lantern',
    name: "Wrecker's Signal Lantern",
    description: 'A dockside lantern rigged to flash exactly wrong — built to lure ships onto the reef rocks on purpose.',
    category: 'etc',
    rarity: 'uncommon',
    icon: { shape: 'lantern', colors: ['#3fe0c8', '#1a3a3a'] },
    stack: 99,
    sellPrice: 0,
    quest: true,
  },
  {
    id: 'qi_stargazers_charm',
    name: "Stargazer's Charm",
    description: 'A small charm shaped like a whale mid-breach, strung on cord gone silver with age. Someone carried this a very long way.',
    category: 'etc',
    rarity: 'common',
    icon: { shape: 'relic', colors: ['#8ae0ff', '#ffd24a'] },
    stack: 99,
    sellPrice: 0,
    quest: true,
  },
];
