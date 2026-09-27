import type { QuestDef } from '../../types';

/**
 * FACTION QUESTS — gated by the `faction` flag set at mq_08_two_currents.
 * fq_h_* (Harpooners): npc_grell (driftmoor_town) for 1-2, npc_grell_camp (windswept_ledges) for 3-4.
 * fq_t_* (Tidekeepers): npc_aolani (driftmoor_town) for 1-2, npc_aolani_camp (windswept_ledges) for 3-4.
 */
export const FACTION_QUESTS: QuestDef[] = [
  // ---------------------------------------------------------------- Harpooners
  {
    id: 'fq_h_1',
    name: 'Cut the Competition',
    type: 'faction',
    giver: 'npc_grell',
    level: 13,
    reqs: [{ type: 'flag', flag: 'faction', value: 'harpooners' }, { type: 'level', min: 13 }],
    summary: "Cull rustclaw crabs fouling the Guild's grotto harvest.",
    offer:
      "Harpoonmaster Grell doesn't waste time on pleasantries. \"You're wearing our colors now, good. Means you work. Rustclaw crabs have been fouling our harvest lines in the grotto depths, snapping at anything that gets near the good barnacle beds.\"\n\n\"Clear them out. Bring back shells — we melt them down for hull plating, waste not.\"\n\n\"Guild pays its own. Don't forget that.\"",
    progress: 'The rustclaw crabs snap and skitter through the depths, guarding barnacle beds that don’t belong to them anyway.',
    complete: "Grell weighs the shells in one hand, grunts approval. \"Good haul. Guild remembers who pulls their weight.\"",
    objectives: [{ type: 'kill', monsterId: 'rustclaw_crab', count: 8 }, { type: 'collect', itemId: 'mat_rust_shell', count: 6 }],
    rewards: { xp: 1300, gold: 260, reputation: { harpooners: 150 }, items: [{ itemId: 'use_hp_potion_m', qty: 2 }, { itemId: 'mat_enhance_stone_1', qty: 1 }] },
  },
  {
    id: 'fq_h_2',
    name: 'Guild Ledgers',
    type: 'faction',
    giver: 'npc_grell',
    level: 15,
    reqs: [{ type: 'flag', flag: 'faction', value: 'harpooners' }, { type: 'level', min: 15 }],
    summary: 'Reclaim disputed kelp routes in Kelpwood Edge for the Guild.',
    offer:
      "\"Rival outfits are poaching our kelp routes in Kelpwood Edge,\" Grell growls, unrolling a chart with more red ink than blue. \"Tanglevines are guarding groves that used to be ours before some upstart crew moved in. Reclaim the territory.\"\n\n\"Bring back kelp essence — proof of the harvest, and product besides. Two birds.\"\n\n\"Kelpwood Edge. Go remind them whose banner flies there.\"",
    progress: 'The tanglevines lash out at anything approaching the disputed kelp groves.',
    complete: "Grell examines the kelp essence with a satisfied nod. \"Route's ours again. Good work — Guild doesn't forget.\"",
    objectives: [
      { type: 'visit', mapId: 'kelpwood_edge' },
      { type: 'kill', monsterId: 'tanglevine', count: 8 },
      { type: 'collect', itemId: 'mat_kelp_essence', count: 6 },
    ],
    rewards: { xp: 1700, gold: 300, reputation: { harpooners: 180 }, items: [{ itemId: 'use_hp_potion_m', qty: 2 }, { itemId: 'mat_enhance_stone_1', qty: 1 }] },
  },
  {
    id: 'fq_h_3',
    name: 'Grounding the Storm-Hawks',
    type: 'faction',
    giver: 'npc_grell_camp',
    level: 19,
    reqs: [{ type: 'flag', flag: 'faction', value: 'harpooners' }, { type: 'level', min: 19 }],
    summary: 'Hunt stormhawks diving on Guild supply skiffs.',
    offer:
      "Grell's camp on the ledges is louder, grittier, more shipyard than shrine. \"Stormhawks have been diving our supply skiffs out of the sky. Can't run a Guild on wreckage. Hunt them down.\"\n\n\"Bring back feathers — good for fletching, better as proof you did the job.\"\n\n\"Storm's getting worse. Move fast.\"",
    progress: 'Stormhawks circle the ledges, diving on anything that looks like Guild cargo.',
    complete: "Grell counts the feathers, satisfied. \"Sky's ours again, for now. Guild remembers.\"",
    objectives: [{ type: 'kill', monsterId: 'stormhawk', count: 10 }, { type: 'collect', itemId: 'mat_storm_feather', count: 6 }],
    rewards: { xp: 2700, gold: 380, reputation: { harpooners: 220 }, items: [{ itemId: 'use_hp_potion_l', qty: 2 }, { itemId: 'mat_enhance_stone_2', qty: 1 }] },
  },
  {
    id: 'fq_h_4',
    name: 'The Long Harvest',
    type: 'faction',
    giver: 'npc_grell_camp',
    level: 22,
    reqs: [{ type: 'flag', flag: 'faction', value: 'harpooners' }, { type: 'level', min: 22 }],
    summary: 'Break cliff golems for ore cores and drive off rival sky raiders.',
    offer:
      "\"Cliff golems are sitting on ore veins we need for the next hull run, and sky raiders are trying to jump our claim while we clear them,\" Grell says, checking a tally sheet. \"Two problems, one trip. Break the golems for their cores, and put down any raider stupid enough to interfere.\"\n\n\"Guild doesn't share what it's already paid for in blood and coin.\"\n\n\"Go.\"",
    progress: 'Cliff golems guard the ore veins with slow, grinding patience — patience the sky raiders clearly don’t share.',
    complete: "Grell inspects the cores and nods, actually looking tired for once. \"Solid work. This war's costing more than I'd like. Keep it up regardless.\"",
    objectives: [
      { type: 'kill', monsterId: 'cliff_golem', count: 8 },
      { type: 'collect', itemId: 'mat_golem_core', count: 6 },
      { type: 'kill', monsterId: 'sky_raider', count: 5 },
    ],
    rewards: { xp: 3600, gold: 440, reputation: { harpooners: 260 }, items: [{ itemId: 'use_hp_potion_l', qty: 2 }, { itemId: 'mat_enhance_stone_2', qty: 1 }] },
  },

  // ---------------------------------------------------------------- Tidekeepers
  {
    id: 'fq_t_1',
    name: 'Songs for the Sick',
    type: 'faction',
    giver: 'npc_aolani',
    level: 13,
    reqs: [{ type: 'flag', flag: 'faction', value: 'tidekeepers' }, { type: 'level', min: 13 }],
    summary: 'Ease the suffering of the grotto’s ailing glowjellies.',
    offer:
      "Songkeeper Aolani speaks the way water moves — unhurried, certain of where it's going. \"The glowjellies in the grotto are suffering, their light gone dim and pained. A gentle ending, or a gentle harvest of what eases their pain — either is a mercy, if done with care.\"\n\n\"Bring me their essence. I'll weave it into something that soothes rather than merely treats.\"\n\n\"Go with a light hand, child.\"",
    progress: 'The glowjellies drift weakly through the grotto, their glow flickering like a candle in wind.',
    complete: 'Aolani accepts the jelly essence with quiet thanks. "Every small mercy matters. Thank you for remembering that."',
    objectives: [{ type: 'kill', monsterId: 'glowjelly', count: 8 }, { type: 'collect', itemId: 'mat_jelly_goo', count: 5 }],
    rewards: { xp: 1300, gold: 260, reputation: { tidekeepers: 150 }, items: [{ itemId: 'use_mp_potion_m', qty: 2 }, { itemId: 'mat_enhance_stone_1', qty: 1 }] },
  },
  {
    id: 'fq_t_2',
    name: 'Whalesong Herbs',
    type: 'faction',
    giver: 'npc_aolani',
    level: 15,
    reqs: [{ type: 'flag', flag: 'faction', value: 'tidekeepers' }, { type: 'level', min: 15 }],
    summary: 'Gather meadow herbs and dewcap for a Tidekeeper ritual.',
    offer:
      "\"The meadow herbs carry old songs in their roots, older than either of us,\" Aolani says. \"I need meadow herb and dewcap both, gathered gently, roots left whole where you can manage it. They'll steady a ritual I've been preparing for some time now.\"\n\n\"Take your time with the gathering. Rushed hands bruise the song right out of a plant.\"\n\n\"The meadows will guide you, if you let them.\"",
    progress: 'The meadow herbs sway gently, as if listening for something in the wind.',
    complete: 'Aolani weaves the gathered herbs into a small charm, humming under her breath. "Beautifully done. This will help more than you know."',
    objectives: [
      { type: 'gather', nodeId: 'node_meadow_herb', count: 5 },
      { type: 'gather', nodeId: 'node_dewcap', count: 5 },
    ],
    rewards: { xp: 1700, gold: 300, reputation: { tidekeepers: 180 }, items: [{ itemId: 'use_mp_potion_m', qty: 2 }, { itemId: 'mat_enhance_stone_1', qty: 1 }] },
  },
  {
    id: 'fq_t_3',
    name: 'Windbloom Rite',
    type: 'faction',
    giver: 'npc_aolani_camp',
    level: 19,
    reqs: [{ type: 'flag', flag: 'faction', value: 'tidekeepers' }, { type: 'level', min: 19 }],
    summary: 'Gather windbloom for a Rite at the ledge shrine.',
    offer:
      "Aolani's shrine on the ledges is little more than a circle of stones and wind chimes, and somehow it feels like the calmest place in Stormbreak. \"Windbloom grows wild up here, feeding on the very storms that trouble this land. Gather it for me — enough for a proper Rite.\"\n\n\"The Rite calls for calm hands in an uncalm place. See if you can manage both.\"\n\n\"Eight stems should suffice.\"",
    progress: 'Windbloom sways impossibly steady even as the storm rages around it.',
    complete: 'Aolani arranges the windbloom into a careful spiral, and for a moment, the wind itself seems to pause to listen. "There. The Rite is stronger for your patience."',
    objectives: [{ type: 'gather', nodeId: 'node_windbloom', count: 8 }],
    rewards: { xp: 2700, gold: 380, reputation: { tidekeepers: 220 }, items: [{ itemId: 'use_mp_potion_l', qty: 2 }, { itemId: 'mat_enhance_stone_2', qty: 1 }] },
  },
  {
    id: 'fq_t_4',
    name: "Calming the Storm's Heart",
    type: 'faction',
    giver: 'npc_aolani_camp',
    level: 22,
    reqs: [{ type: 'flag', flag: 'faction', value: 'tidekeepers' }, { type: 'level', min: 22 }],
    summary: 'Ease the suffering of the peaks’ frightened creatures.',
    offer:
      "\"The cloud puffs up here have grown frightened rather than fierce, and frightened things lash out,\" Aolani says, sorrow threading her calm. \"Ease their passing where you must, but gather their down gently — it makes for good bedding in a grieving world. Storm feathers too, offered rather than torn, if you can manage the distinction.\"\n\n\"Not everything the storm has broken can be saved. But we try anyway. That's rather the point.\"\n\n\"Go gently.\"",
    progress: 'The frightened creatures of the peaks lash out less at a hand that moves slowly and speaks softly.',
    complete: 'Aolani accepts the offerings with a small, tired smile. "Thank you. Gentleness is its own kind of strength, even when the world forgets that."',
    objectives: [
      { type: 'kill', monsterId: 'cloud_puff', count: 8 },
      { type: 'collect', itemId: 'mat_cloud_fluff', count: 6 },
      { type: 'collect', itemId: 'mat_storm_feather', count: 4 },
    ],
    rewards: { xp: 3600, gold: 440, reputation: { tidekeepers: 260 }, items: [{ itemId: 'use_mp_potion_l', qty: 2 }, { itemId: 'mat_enhance_stone_2', qty: 1 }] },
  },
];
