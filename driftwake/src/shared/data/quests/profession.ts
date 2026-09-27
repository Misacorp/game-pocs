import type { QuestDef } from '../../types';
import { xpToNext } from '../../constants';

const qxp = (level: number, frac = 0.22) => Math.round(xpToNext(level) * frac);
const qgold = (level: number, mult = 14) => Math.round(level * mult);

// ---------------------------------------------------------------------------
// SMITHING @ npc_brina
// ---------------------------------------------------------------------------

const SMITHING_QUESTS: QuestDef[] = [
  {
    id: 'pq_smithing_1',
    name: 'The Anvil Awaits',
    type: 'profession',
    giver: 'npc_brina',
    level: 2,
    reqs: [{ type: 'level', min: 1 }],
    summary: 'Learn smithing from Brina and forge your first item.',
    offer:
      "Brina eyes your grip like she's already grading it. \"Smithing. Ore in, tools out, no shortcuts. Want to learn? Fine — but you're crafting something before you leave this forge, understood?\"",
    progress: "\"Learn the trade, then prove it. Craft something, anything, to start.\"",
    complete: "\"Not bad, for a first swing. Keep at it and you'll be forging real gear before long.\"",
    objectives: [{ type: 'learnProfession' }, { type: 'craft', professionId: 'smithing', count: 1 }],
    rewards: { xp: qxp(2), gold: qgold(2), items: [{ itemId: 'mat_copper_ore', qty: 5 }] },
  },
  {
    id: 'pq_smithing_2',
    name: "A Proper Batch",
    type: 'profession',
    giver: 'npc_brina',
    level: 10,
    reqs: [{ type: 'profession', professionId: 'smithing', minLevel: 3 }],
    summary: 'Prove your growing smithing skill with a proper batch.',
    offer: "\"You've got the basics down. Time to put them to work — craft me a proper batch, and I'll know you're not just playing with hammers.\"",
    progress: "\"Keep the forge running. Five pieces, minimum.\"",
    complete: "\"Now that's a blacksmith's output. You're getting there.\"",
    objectives: [{ type: 'craft', professionId: 'smithing', count: 5 }],
    rewards: { xp: qxp(10), gold: qgold(10), items: [{ itemId: 'mat_enhance_stone_1', qty: 2 }] },
  },
  {
    id: 'pq_smithing_3',
    name: "A Master's Pace",
    type: 'profession',
    giver: 'npc_brina',
    level: 20,
    reqs: [{ type: 'profession', professionId: 'smithing', minLevel: 6 }],
    summary: 'Forge a heavier batch to prove your mastery of the anvil.',
    offer: "\"Storm-tempered steel, coralite, whatever's in your reach — I want to see real output, not apprentice work. Show me.\"",
    progress: "\"Eight pieces. I'm not counting your failures, just your finished ones.\"",
    complete: "\"That's a master's pace. Proud to have taught you — not that I'll admit that twice.\"",
    objectives: [{ type: 'craft', professionId: 'smithing', count: 8 }],
    rewards: { xp: qxp(20), gold: qgold(20), items: [{ itemId: 'mat_enhance_stone_2', qty: 2 }], recipes: ['rec_smith_enhance_stone_2'] },
  },
];

// ---------------------------------------------------------------------------
// ALCHEMY @ npc_juniper
// ---------------------------------------------------------------------------

const ALCHEMY_QUESTS: QuestDef[] = [
  {
    id: 'pq_alchemy_1',
    name: 'First Brew',
    type: 'profession',
    giver: 'npc_juniper',
    level: 2,
    reqs: [{ type: 'level', min: 1 }],
    summary: 'Learn alchemy from Juniper and brew your first potion.',
    offer: "Juniper's eyes light up like you've asked her the best possible question. \"Alchemy! Wonderful. Herbs, heat, a little patience, a little danger. Let's get you brewing.\"",
    progress: "\"Learn the basics, then brew something. Anything bubbling counts.\"",
    complete: "\"Look at that, still bubbling and everything! A fine first batch.\"",
    objectives: [{ type: 'learnProfession' }, { type: 'craft', professionId: 'alchemy', count: 1 }],
    rewards: { xp: qxp(2), gold: qgold(2), items: [{ itemId: 'mat_meadow_herb', qty: 5 }] },
  },
  {
    id: 'pq_alchemy_2',
    name: 'Stocking the Shelves',
    type: 'profession',
    giver: 'npc_juniper',
    level: 10,
    reqs: [{ type: 'profession', professionId: 'alchemy', minLevel: 3 }],
    summary: "Brew a larger batch of potions for Juniper's shelves.",
    offer: "\"My shelves are looking thin, and my customers are looking thirsty. Fancy brewing a proper batch?\"",
    progress: "\"Five potions, give or take an explosion.\"",
    complete: "\"Excellent! Well-balanced, good color, minimal smoke. You're a natural.\"",
    objectives: [{ type: 'craft', professionId: 'alchemy', count: 5 }],
    rewards: { xp: qxp(10), gold: qgold(10), items: [{ itemId: 'mat_enhance_stone_1', qty: 2 }] },
  },
  {
    id: 'pq_alchemy_3',
    name: 'The Good Stuff',
    type: 'profession',
    giver: 'npc_juniper',
    level: 20,
    reqs: [{ type: 'profession', professionId: 'alchemy', minLevel: 6 }],
    summary: 'Brew an advanced batch to prove your alchemical range.',
    offer: "\"Time to move past simple potions. Elixirs, tonics — the good stuff. Show me you can handle it.\"",
    progress: "\"Eight brews, of whatever complexity you can manage.\"",
    complete: "\"Marvelous work! You'll be outselling me at this rate. I'm delighted, genuinely.\"",
    objectives: [{ type: 'craft', professionId: 'alchemy', count: 8 }],
    rewards: { xp: qxp(20), gold: qgold(20), items: [{ itemId: 'mat_enhance_stone_2', qty: 2 }], recipes: ['rec_alchemy_elixir_iron_3'] },
  },
];

// ---------------------------------------------------------------------------
// COOKING @ npc_tobbin
// ---------------------------------------------------------------------------

const COOKING_QUESTS: QuestDef[] = [
  {
    id: 'pq_cooking_1',
    name: "Tobbin's Kitchen",
    type: 'profession',
    giver: 'npc_tobbin',
    level: 2,
    reqs: [{ type: 'level', min: 1 }],
    summary: 'Learn cooking from Tobbin and prepare your first dish.',
    offer:
      "Tobbin wipes flour on his apron and grins wide. \"Cooking! Best trade there is, if you ask me — everyone needs to eat, and everyone loves a good buff with their supper. Let's get you started.\"",
    progress: "\"Learn the ropes, then cook something. Doesn't have to be pretty.\"",
    complete: "\"Mm! Not bad at all for a first try. You've got the makings of a real cook.\"",
    objectives: [{ type: 'learnProfession' }, { type: 'craft', professionId: 'cooking', count: 1 }],
    rewards: { xp: qxp(2), gold: qgold(2), items: [{ itemId: 'mat_boar_meat', qty: 5 }] },
  },
  {
    id: 'pq_cooking_2',
    name: 'A Proper Spread',
    type: 'profession',
    giver: 'npc_tobbin',
    level: 10,
    reqs: [{ type: 'profession', professionId: 'cooking', minLevel: 3 }],
    summary: "Cook a full spread for Tobbin's kitchen.",
    offer: "\"Big appetite in town lately — adventurers, mostly. Cook up a proper spread and I'll pay you well for the trouble.\"",
    progress: "\"Five dishes. Doesn't have to be fancy, just filling.\"",
    complete: "\"Now THAT'S a spread. You'll have folks lining up for your cooking soon enough.\"",
    objectives: [{ type: 'craft', professionId: 'cooking', count: 5 }],
    rewards: { xp: qxp(10), gold: qgold(10), items: [{ itemId: 'mat_enhance_stone_1', qty: 2 }] },
  },
  {
    id: 'pq_cooking_3',
    name: 'The Feast',
    type: 'profession',
    giver: 'npc_tobbin',
    level: 20,
    reqs: [{ type: 'profession', professionId: 'cooking', minLevel: 6 }],
    summary: 'Prepare an advanced feast to prove your culinary mastery.',
    offer: "\"Time to cook something with real bite — the good buffs, the ones adventurers write home about. Think you're ready?\"",
    progress: "\"Eight dishes, the fancier kind.\"",
    complete: "\"A feast worthy of the harbor's best table. You've earned your apron, truly.\"",
    objectives: [{ type: 'craft', professionId: 'cooking', count: 8 }],
    rewards: { xp: qxp(20), gold: qgold(20), items: [{ itemId: 'mat_enhance_stone_2', qty: 2 }], recipes: ['rec_cook_skyegg_omelette'] },
  },
];

// ---------------------------------------------------------------------------
// JEWELCRAFTING @ npc_sera
// ---------------------------------------------------------------------------

const JEWELCRAFTING_QUESTS: QuestDef[] = [
  {
    id: 'pq_jewelcrafting_1',
    name: 'First Cut',
    type: 'profession',
    giver: 'npc_sera',
    level: 2,
    reqs: [{ type: 'level', min: 1 }],
    summary: 'Learn jewelcrafting from Sera and cut your first gem.',
    offer:
      "Sera holds a crystal up to the light, admiring it before you've even sat down. \"Jewelcrafting is patience given shape. Learn from me, and cut your first piece — carefully, please.\"",
    progress: "\"Learn the craft, then cut something. Mistakes are allowed. Encouraged, even, early on.\"",
    complete: "\"A clean cut, for a first attempt. You have an eye for this.\"",
    objectives: [{ type: 'learnProfession' }, { type: 'craft', professionId: 'jewelcrafting', count: 1 }],
    rewards: { xp: qxp(2), gold: qgold(2), items: [{ itemId: 'mat_quartz', qty: 5 }] },
  },
  {
    id: 'pq_jewelcrafting_2',
    name: 'The Display Case',
    type: 'profession',
    giver: 'npc_sera',
    level: 10,
    reqs: [{ type: 'profession', professionId: 'jewelcrafting', minLevel: 3 }],
    summary: "Cut a full set of pieces for Sera's display case.",
    offer: "\"My display case looks bare. Cut me a proper set, would you? Rings, amulets, whatever you're able.\"",
    progress: "\"Five pieces, cut clean.\"",
    complete: "\"Radiant. Truly. You've a gift for this — don't let it go to waste.\"",
    objectives: [{ type: 'craft', professionId: 'jewelcrafting', count: 5 }],
    rewards: { xp: qxp(10), gold: qgold(10), items: [{ itemId: 'mat_enhance_stone_1', qty: 2 }] },
  },
  {
    id: 'pq_jewelcrafting_3',
    name: 'Exquisite Work',
    type: 'profession',
    giver: 'npc_sera',
    level: 20,
    reqs: [{ type: 'profession', professionId: 'jewelcrafting', minLevel: 6 }],
    summary: 'Craft advanced jewelry to prove your mastery of the craft.',
    offer: "\"Time for the difficult pieces — the ones that separate a hobbyist from a jeweler. Show me what you've learned.\"",
    progress: "\"Eight pieces, no shortcuts.\"",
    complete: "\"Exquisite work. I'd wear these myself, and I don't say that lightly.\"",
    objectives: [{ type: 'craft', professionId: 'jewelcrafting', count: 8 }],
    rewards: { xp: qxp(20), gold: qgold(20), items: [{ itemId: 'mat_enhance_stone_2', qty: 2 }], recipes: ['rec_jewel_cut_heart_crystal'] },
  },
];

// ---------------------------------------------------------------------------
// ENHANCEMENT @ npc_brina
// ---------------------------------------------------------------------------

const ENHANCE_QUESTS: QuestDef[] = [
  {
    id: 'pq_enhance_intro',
    name: 'Risk and Power',
    type: 'profession',
    giver: 'npc_brina',
    level: 5,
    reqs: [{ type: 'level', min: 4 }],
    summary: "Learn to enhance gear with Brina's guidance.",
    offer:
      "Brina sets a small glowing stone on the anvil. \"Enhancement. Every star you add makes your gear hit harder, hold longer. Also every star risks breaking it a little. Try it — carefully. I'll cover you for the first one.\"",
    progress: "\"One star, on any piece you're willing to risk. I've got you covered.\"",
    complete: "\"There. Feel the difference? That's the whole trade, right there — risk, for power. Welcome to enhancing.\"",
    objectives: [{ type: 'enhance', stars: 1 }],
    rewards: { xp: qxp(5), gold: qgold(5), items: [{ itemId: 'mat_enhance_stone_1', qty: 3 }] },
  },
];

// ---------------------------------------------------------------------------
// GATHERING (mining + foraging) @ npc_rook_prospector
// ---------------------------------------------------------------------------

const GATHERING_QUESTS: QuestDef[] = [
  {
    id: 'pq_mining_1',
    name: 'Pick and Vein',
    type: 'profession',
    giver: 'npc_rook_prospector',
    level: 2,
    reqs: [{ type: 'level', min: 1 }],
    summary: 'Learn the pick from Dusty Fen and mine your first ore.',
    offer:
      "Dusty Fen thumps a pickaxe into your hands. \"Mining's simple. Find a vein, hit it, don't hit your foot. Copper's easiest around here — go get a feel for it.\"",
    progress: "\"Copper ore, from the nodes around the meadows and hills.\"",
    complete: "\"Good haul for a first swing. Keep at it and you'll never be short on ore again.\"",
    objectives: [{ type: 'gather', nodeId: 'node_copper', count: 8 }],
    rewards: { xp: qxp(2), gold: qgold(2), items: [{ itemId: 'mat_copper_ore', qty: 5 }] },
  },
  {
    id: 'pq_mining_2',
    name: 'Stormsteel',
    type: 'profession',
    giver: 'npc_rook_prospector',
    level: 18,
    reqs: [{ type: 'profession', professionId: 'mining', minLevel: 5 }],
    summary: 'Mine stormsteel ore from the high cliffs.',
    offer: "\"Ready for tougher rock? Stormsteel up in the cliffs'll test your grip. Good stuff, once you're used to it.\"",
    progress: "\"Stormsteel ore, from the veins up in Stormbreak.\"",
    complete: "\"Now you're mining like it means something. Stormsteel's not easy to come by.\"",
    objectives: [{ type: 'gather', nodeId: 'node_stormsteel', count: 10 }],
    rewards: { xp: qxp(18), gold: qgold(18), items: [{ itemId: 'mat_enhance_stone_1', qty: 1 }] },
  },
  {
    id: 'pq_foraging_1',
    name: 'A Good Eye',
    type: 'profession',
    giver: 'npc_rook_prospector',
    level: 2,
    reqs: [{ type: 'level', min: 1 }],
    summary: 'Learn foraging from Dusty Fen and gather your first herbs.',
    offer:
      "\"Foraging's the gentler cousin of mining,\" Fen says. \"No pick required, just a good eye. Meadow herbs are everywhere out there — go fill a satchel.\"",
    progress: "\"Meadow herbs, wherever they're growing.\"",
    complete: "\"Fine satchel. Foraging pays quiet dividends — you'll see.\"",
    objectives: [{ type: 'gather', nodeId: 'node_meadow_herb', count: 8 }],
    rewards: { xp: qxp(2), gold: qgold(2), items: [{ itemId: 'mat_meadow_herb', qty: 5 }] },
  },
  {
    id: 'pq_foraging_2',
    name: 'Windbloom',
    type: 'profession',
    giver: 'npc_rook_prospector',
    level: 18,
    reqs: [{ type: 'profession', professionId: 'foraging', minLevel: 5 }],
    summary: 'Gather windbloom from the storm cliffs.',
    offer:
      "\"Windbloom only grows where the wind never stops trying to rip it away. Stubborn little flower. Fitting, really. Go gather some.\"",
    progress: "\"Windbloom, from up in Stormbreak.\"",
    complete: "\"Good eye, finding those in this wind. Not everyone can.\"",
    objectives: [{ type: 'gather', nodeId: 'node_windbloom', count: 10 }],
    rewards: { xp: qxp(18), gold: qgold(18), items: [{ itemId: 'mat_enhance_stone_1', qty: 1 }] },
  },
];

export const PROFESSION_QUESTS: QuestDef[] = [
  ...SMITHING_QUESTS,
  ...ALCHEMY_QUESTS,
  ...COOKING_QUESTS,
  ...JEWELCRAFTING_QUESTS,
  ...ENHANCE_QUESTS,
  ...GATHERING_QUESTS,
];
