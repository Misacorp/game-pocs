import type { QuestDef } from '../../types';

/**
 * MAIN STORY QUESTS — see DESIGN.md §6 for the binding chapter outline.
 * Chapters: 1 Driftmoor (The Stirring), 2 Finreach (Two Currents), 3 Stormbreak (Eye of the Storm),
 * 4 Lanternreef (The Drowned Wound), 5 Hollow (Heart of Oma), 6 Epilogue.
 */
export const MAIN_QUESTS: QuestDef[] = [
  // ---------------------------------------------------------------- Act 1
  {
    id: 'mq_01_welcome',
    name: 'Welcome to Driftmoor',
    type: 'main',
    chapter: 1,
    giver: 'npc_pell',
    turnIn: 'npc_maren',
    level: 1,
    reqs: [{ type: 'level', min: 1 }],
    summary: 'Deliver Old Pell’s letter to Captain Maren Holt, the Harbor Master.',
    offer:
      "Old Pell squints at you over his spyglass, the one with more scratches than glass left in it. \"Ah — new blood! Every drifting soul that steps onto Driftmoor's boards ought to introduce themselves to the Harbor Master, and you're no exception.\"\n\n\"Maren runs this whole harbor with a look and a ledger. Terrifying woman. Wonderful woman. Take her this letter — tell her old Pell sent you, and that I said the tremors are getting worse, not that she needs an old man reminding her.\"\n\n\"Go on, then. Down the boards, past Pim's shop, can't miss her — she's the one shouting at gulls.\"",
    progress: 'Pell watches you go, tapping his spyglass thoughtfully against the rail.',
    complete:
      "Maren breaks the wax seal without looking up from her ledger, reads it in about two seconds, and finally looks at you properly.\n\n\"Pell sent you himself? Hah. That old goat hasn't left his porch in a decade except to worry at me. Well — you're here now, welcome to Driftmoor. We can always use another pair of hands, especially with... well. You'll see.\"",
    objectives: [{ type: 'collect', itemId: 'qi_letter_maren', count: 1, desc: "Deliver Old Pell's letter to Captain Maren." }],
    onAccept: [{ type: 'giveItem', itemId: 'qi_letter_maren', qty: 1 }],
    rewards: { xp: 20, gold: 15, items: [{ itemId: 'use_hp_potion_s', qty: 2 }] },
  },
  {
    id: 'mq_02_tremors',
    name: 'The Tremors',
    type: 'main',
    chapter: 1,
    giver: 'npc_maren',
    level: 2,
    reqs: [{ type: 'quest', questId: 'mq_01_welcome', state: 'completed' }, { type: 'level', min: 1 }],
    summary: 'Clear puffmoss from the meadows and bring Juniper a fluff sample.',
    offer:
      '"Maren sets the letter down and drums her fingers on the harbor ledger. \\"You want work? Fine — Oma\'s been shivering more than usual this month, and the meadow critters have gone twitchy with it. Puffmoss everywhere, breeding like the tremors are a mating call.\\""\n\n"\\"Clear out eight of the little hoppers for me, and bring back some of that fluff they shed — Juniper wants to test it. Says something in it\'s \'off.\' Probably nothing. Probably.\\""\n\n"\\"Meadows are past the north gate. Try not to fall off the whale.\\""',
    progress: 'The meadow puffmoss bounce and squeak, oblivious to the tremors rattling the ground beneath them.',
    complete:
      "Maren turns the fluff over in her fingers, frowning. \"Huh. Feels warmer than it should. Good work — here, this'll cover your boots.\"",
    objectives: [
      { type: 'kill', monsterId: 'puffmoss', count: 8 },
      { type: 'collect', itemId: 'mat_puffmoss_fluff', count: 5 },
    ],
    rewards: { xp: 60, gold: 40, items: [{ itemId: 'use_hp_potion_s', qty: 3 }] },
  },
  {
    id: 'mq_03_strange_growth',
    name: 'Strange Growth',
    type: 'main',
    chapter: 1,
    giver: 'npc_maren',
    level: 4,
    reqs: [{ type: 'quest', questId: 'mq_02_tremors', state: 'completed' }, { type: 'level', min: 3 }],
    summary: 'Investigate Mossback Hills and collect spore samples.',
    offer:
      "\"That fluff wasn't nothing,\" Maren says, and for once she isn't smiling. \"Juniper found the same warmth in samples from the hills. Something's spreading, and it isn't puffmoss fuzz.\"\n\n\"Head up to Mossback Hills. Thin out the dewbugs — they've been chewing on something they shouldn't — and bring me back any of those purple spore-things you find. Careful with them. Don't breathe deep near the growths.\"\n\n\"I don't like this, but I like not knowing even less.\"",
    progress: 'Purple spores cling to bark and stone alike in the hills, faintly warm, faintly wrong.',
    complete:
      "Maren holds a spore up to the lamplight, and for a moment her harbor-master composure slips. \"That's not meadow rot. That's something in her.\"",
    objectives: [
      { type: 'visit', mapId: 'mossback_hills' },
      { type: 'kill', monsterId: 'dewbug', count: 6 },
      { type: 'collect', itemId: 'qi_blighted_spore', count: 3 },
    ],
    rewards: { xp: 200, gold: 100, items: [{ itemId: 'use_hp_potion_s', qty: 3 }, { itemId: 'use_mp_potion_s', qty: 2 }] },
  },
  {
    id: 'mq_04_into_the_grotto',
    name: 'Into the Grotto',
    type: 'main',
    chapter: 1,
    giver: 'npc_maren',
    turnIn: 'npc_juniper',
    level: 7,
    reqs: [{ type: 'quest', questId: 'mq_03_strange_growth', state: 'completed' }, { type: 'level', min: 6 }],
    summary: 'Bring Juniper fresh spore samples, then collect glowing barnacles from the grotto.',
    offer:
      '"Maren doesn\'t send you to Juniper\'s shop this time — she walks you there herself, spores wrapped in oilcloth like they might bite. \\"Juniper, tell them what you told me.\\""\n\n"Juniper\'s spectacles catch the lamplight. \\"These spores didn\'t grow on the surface. Whatever\'s under Driftmoor\'s skin, in the barnacle caves, it\'s older and deeper. I need fresh samples from the grotto — the glowing barnacles specifically. If the light in them has changed too, we\'ll know how far this has spread.\\""\n\n"\\"Six should do it. And — go carefully. Something\'s made those crabs bolder than usual.\\""',
    progress: "The grotto's glowing barnacles pulse gently in the dark, their light tinged faintly violet in places.",
    complete:
      "Juniper holds the barnacles up against a candle, comparing the glow. Her mouth goes tight and thin. \"It's not localized. It's in her, however deep 'in her' goes. I think we need to talk to Maren about King Barnacle.\"",
    objectives: [
      { type: 'talk', npcId: 'npc_juniper', desc: 'Bring the spore samples to Juniper.' },
      { type: 'visit', mapId: 'barnacle_grotto' },
      { type: 'collect', itemId: 'mat_glowing_barnacle', count: 6 },
    ],
    rewards: { xp: 600, gold: 180, items: [{ itemId: 'mat_enhance_stone_1', qty: 1 }, { itemId: 'use_hp_potion_m', qty: 2 }] },
  },
  {
    id: 'mq_05_king_barnacle',
    name: 'King of the Depths',
    type: 'main',
    chapter: 1,
    giver: 'npc_maren',
    level: 10,
    reqs: [{ type: 'quest', questId: 'mq_04_into_the_grotto', state: 'completed' }, { type: 'level', min: 9 }],
    summary: 'Defeat King Barnacle in the Grotto Depths and recover the blighted core within him.',
    offer:
      "\"Juniper says the grotto's oldest, biggest crab has been holed up in the depths hoarding blight like treasure,\" Maren says, checking the edge of a boarding axe like she means to use it. \"King Barnacle. Big, ugly, allegedly friendly once. If the blight's concentrated anywhere, it's in him.\"\n\n\"I need you to go down there and put an end to him — humanely, if you can manage it, but an end to him regardless. And bring back whatever's left of the growth. We need to know exactly what we're dealing with.\"\n\n\"This isn't a meadow hop-along anymore. Gear up.\"",
    progress: 'Somewhere deep in Grotto Depths, something enormous shifts in the dark.',
    complete:
      "Maren turns the blighted core over in gloved hands, and for the first time you've seen, she looks afraid — just for a second, gone as quick as it came. \"That's enough sitting on our hands. Pack light — we're going to need help from outside Driftmoor.\"",
    objectives: [
      { type: 'visit', mapId: 'grotto_depths' },
      { type: 'boss', monsterId: 'king_barnacle' },
      { type: 'collect', itemId: 'qi_blighted_core', count: 1, consume: false },
    ],
    rewards: { xp: 1400, gold: 300, items: [{ itemId: 'use_hp_potion_m', qty: 3 }, { itemId: 'mat_enhance_stone_1', qty: 2 }] },
  },

  // ---------------------------------------------------------------- Act 2
  {
    id: 'mq_06_the_scholar',
    name: 'The Scholar of Kelpwood',
    type: 'main',
    chapter: 2,
    giver: 'npc_maren',
    turnIn: 'npc_idris',
    level: 11,
    reqs: [{ type: 'quest', questId: 'mq_05_king_barnacle', state: 'completed' }, { type: 'level', min: 10 }],
    summary: 'Deliver the blighted core to Scholar Idris in Kelpwood Edge.',
    offer:
      "\"There's a scholar out past the kelp gardens — Idris, name rings a bell if you've read anything about whale biology. Prickly sort, brilliant sort. If anyone can make sense of this core, it's them.\"\n\n\"Take the boat out to Kelpwood Edge, find Idris, and don't take no for an answer. Tell them Maren sent you, and that I'm calling in the favor from the barnacle incident. They'll know what that means.\"\n\n\"Go on. I'll hold down the harbor.\"",
    progress: 'The core sits heavy in your pack, faintly warm no matter how far you carry it from the grotto.',
    complete:
      "Idris turns the core over exactly once before their eyebrows climb into their hairline. \"Oh, that's — oh, that's not good. That's a piece of the Ember's own rot, isn't it. Sit down. No — don't sit, we don't have time to sit. Tell me everything Maren told you, and then some.\"",
    objectives: [
      { type: 'visit', mapId: 'kelpwood_edge' },
      { type: 'collect', itemId: 'qi_blighted_core', count: 1 },
    ],
    rewards: { xp: 1400, gold: 280, items: [{ itemId: 'use_mp_potion_m', qty: 2 }] },
  },
  {
    id: 'mq_07_kelp_sickness',
    name: 'Kelp Sickness',
    type: 'main',
    chapter: 2,
    giver: 'npc_idris',
    level: 12,
    reqs: [{ type: 'quest', questId: 'mq_06_the_scholar', state: 'completed' }, { type: 'level', min: 11 }],
    summary: 'Collect samples from kelp sprites and tanglevines for Idris.',
    offer:
      "\"The kelp forest is sick too — I should have realized sooner,\" Idris mutters, already pulling books off a shelf that shouldn't structurally hold that many books. \"The sprites and tanglevines are agitated, aggressive even. If the blight's reached the kelp roots, it's traveling faster than I feared.\"\n\n\"I need combat samples — tissue from kelp sprites and tanglevines both, taken while the blight's still active in them. Unpleasant work, I know. Science rarely apologizes for that.\"\n\n\"Bring me what you can carry.\"",
    progress: "The kelp sprites flicker erratically, their usual playful glow gone sour and dim.",
    complete:
      "Idris spreads the samples across the desk like a very grim card game. \"Consistent contamination. Whatever this is, it isn't random, and it isn't slowing down. I need more eyes on this than mine.\"",
    objectives: [
      { type: 'kill', monsterId: 'kelp_sprite', count: 8 },
      { type: 'kill', monsterId: 'tanglevine', count: 6 },
      { type: 'collect', itemId: 'qi_kelp_sample', count: 5 },
    ],
    rewards: { xp: 1650, gold: 330, items: [{ itemId: 'use_hp_potion_m', qty: 3 }] },
  },
  {
    id: 'mq_08_two_currents',
    name: 'Two Currents',
    type: 'main',
    chapter: 2,
    giver: 'npc_idris',
    level: 13,
    reqs: [{ type: 'quest', questId: 'mq_07_kelp_sickness', state: 'completed' }, { type: 'level', min: 12 }],
    summary: "Hear out both the Harpooners and the Tidekeepers, then choose a side.",
    offer:
      "\"There are two people in Driftmoor who've spent their whole lives thinking about whales like Oma — really thinking, not just harbor-ledger thinking,\" Idris says. \"Harpoonmaster Grell will tell you to cut the rot out. Songkeeper Aolani will tell you to heal it. I need to hear both, and so, I think, do you.\"\n\n\"Go talk to them. Really talk — ask what they'd do, not just what they believe. And when you come back, I want your read on it, because I suspect this decision is going to matter more than either of them lets on.\"\n\n\"Take your time. This one isn't a fetch quest.\"",
    progress: 'Both the Harpoonmaster and the Songkeeper have made their case. The choice, it seems, is yours to carry back.',
    complete:
      '"Idris listens to your account without interrupting — a small miracle, for them. \\"So. Cut, or heal. Force, or faith. There\'s no clean answer, is there. But you\'ll need to pick a current to swim in, sooner or later. Which is it?\\""',
    objectives: [
      { type: 'visit', mapId: 'driftmoor_town' },
      { type: 'talk', npcId: 'npc_grell' },
      { type: 'talk', npcId: 'npc_aolani' },
    ],
    rewards: { xp: 1900, gold: 400, items: [{ itemId: 'use_return_scroll', qty: 2 }] },
    choices: [
      {
        id: 'harpooners',
        label: 'Side with the Harpooners',
        description:
          "Grell's people don't wait for permission from a whale the size of a mountain. Cut out the rot, harvest the Ember, steer Oma by main force if she won't steer herself. It's ugly, practical work — and it might be the only kind that's fast enough to matter. You'll wear the Harpooners' colors now, for better or worse.",
        rewards: { flags: { faction: 'harpooners' }, reputation: { harpooners: 500 }, items: [{ itemId: 'eq_armor_harpooner_coat' }] },
      },
      {
        id: 'tidekeepers',
        label: 'Side with the Tidekeepers',
        description:
          "Aolani's people believe Oma is not a ship to be steered but a soul to be listened to — that the Blight is a wound, not a resource, and wounds are healed, not harvested. It is slower work, and it asks you to trust a whale the size of a nation to choose her own course. You'll wear the Tidekeepers' colors now, for better or worse.",
        rewards: { flags: { faction: 'tidekeepers' }, reputation: { tidekeepers: 500 }, items: [{ itemId: 'eq_armor_tidekeeper_robe' }] },
      },
    ],
  },
  {
    id: 'mq_09_poacher_camp',
    name: 'The Poacher Camp',
    type: 'main',
    chapter: 2,
    giver: 'npc_fenna',
    level: 14,
    reqs: [{ type: 'quest', questId: 'mq_08_two_currents', state: 'completed' }, { type: 'level', min: 13 }],
    summary: 'Break up a poaching operation in Deep Kelpwood — and decide what to do with Jory.',
    offer:
      "Fenna doesn't so much greet you as size you up. \"Heard you've been running errands for the scholar. Good. I need hands that don't panic in the deep kelp — poachers have set up camp in Deep Kelpwood, cutting Oma's hide open for parts they sell to whoever pays.\"\n\n\"Thin them out. And there's a nervous one who hangs back from the fighting — name's Jory, apparently. Word is he's having second thoughts about his line of work. Talk to him before you decide what to do about that.\"\n\n\"Bring me proof of whatever orders they're working from, too. I want to know who's paying.\"",
    progress: "The poacher camp reeks of tar and cut kelp-flesh. Not everyone here looks happy to be doing this.",
    complete:
      "Fenna reads over the recovered orders, jaw tight. \"Contract work. Somebody with real coin wants Oma's hide stripped for parts. This isn't opportunists — this is a supply chain. Whatever you did about the nervous one, I hope it was the right call.\"",
    objectives: [
      { type: 'visit', mapId: 'kelpwood_deep' },
      { type: 'kill', monsterId: 'poacher', count: 8 },
      { type: 'talk', npcId: 'npc_poacher_defector' },
      { type: 'collect', itemId: 'qi_poacher_orders', count: 3 },
    ],
    rewards: { xp: 2200, gold: 420, items: [{ itemId: 'mat_enhance_stone_1', qty: 2 }] },
  },
  {
    id: 'mq_09b_jorys_fate',
    name: "Jory's Fate",
    type: 'main',
    chapter: 2,
    giver: 'npc_fenna',
    level: 15,
    reqs: [
      { type: 'quest', questId: 'mq_09_poacher_camp', state: 'completed' },
      { type: 'flag', flag: 'jory', value: 'spared' },
      { type: 'level', min: 14 },
    ],
    summary: 'Protect Jory from his old crew, who want him made an example of.',
    offer:
      "Fenna finds you before you find her, which is never a good sign. \"Word came in — Jory's old crew figured out he ran. They're hunting him through the deep kelp to make an example of him. Whatever you did back there, you made a promise you didn't mean to.\"\n\n\"He's hiding out past the old camp, and he's not much of a fighter. If you want that mercy to mean something, you'd best go make sure it sticks.\"\n\n\"Your call. It always was.\"",
    progress: 'Somewhere in the deep kelp, a frightened man is trying very hard not to be found.',
    complete:
      "Jory's hands are still shaking when it's over, but he's alive, and he knows exactly whose doing that is. \"I don't — I don't have the words for this. I'll find some way to pay it back. I swear it.\"",
    objectives: [
      { type: 'visit', mapId: 'kelpwood_deep' },
      { type: 'kill', monsterId: 'poacher', count: 4, desc: "Poachers are hunting Jory for turning his coat — thin their ranks." },
      { type: 'talk', npcId: 'npc_poacher_defector' },
    ],
    rewards: { xp: 2000, gold: 380, items: [{ itemId: 'use_hp_potion_m', qty: 2 }, { itemId: 'mat_enhance_stone_1', qty: 1 }] },
  },
  {
    id: 'mq_10_old_tangle',
    name: 'Old Tangle',
    type: 'main',
    chapter: 2,
    giver: 'npc_fenna',
    level: 17,
    reqs: [{ type: 'quest', questId: 'mq_09_poacher_camp', state: 'completed' }, { type: 'level', min: 16 }],
    summary: 'Defeat Old Tangle, guardian of the Tangle Heart.',
    offer:
      "\"There's one more thing rotting in that kelp forest, and it's older than the poachers, older than the blight, maybe older than Driftmoor itself,\" Fenna says, looking north like she can see it from here. \"Old Tangle. A hydra of root and vine that's guarded the Tangle Heart since before my grandmother's time.\"\n\n\"It's turned aggressive — attacking anything that gets close, which never used to happen. Whatever's happening to Oma, it's reached even the oldest, deepest roots.\"\n\n\"Bring it down. And take whatever weapon grows from its wreckage — you've earned it twice over.\"",
    progress: "Deep in the Tangle Heart, something ancient and many-headed stirs at your approach.",
    complete:
      "Fenna runs a hand along the still-warm wood of Old Tangle's remains. \"Even the roots aren't safe anymore. That's... that's further than I wanted this to go.\"",
    objectives: [{ type: 'visit', mapId: 'tangle_heart' }, { type: 'boss', monsterId: 'old_tangle' }],
    rewards: {
      xp: 4000,
      gold: 600,
      items: [{ itemId: 'mat_enhance_stone_2', qty: 1 }],
      chooseOne: [
        { itemId: 'eq_sword_tangleroot' },
        { itemId: 'eq_staff_tangleroot' },
        { itemId: 'eq_bow_tangleroot' },
        { itemId: 'eq_dagger_tangleroot' },
      ],
    },
  },

  // ---------------------------------------------------------------- Act 3
  {
    id: 'mq_11_updraft',
    name: 'The Updraft',
    type: 'main',
    chapter: 3,
    giver: 'npc_fenna',
    turnIn: 'npc_borran',
    level: 16,
    reqs: [{ type: 'quest', questId: 'mq_10_old_tangle', state: 'completed' }, { type: 'level', min: 15 }],
    summary: 'Ride the updraft lift to Gale Outpost and report to Chief Borran.',
    offer:
      "\"You've done more for this forest than most people born in it,\" Fenna says. \"But the trail doesn't end here. There's an updraft lift out past Deep Kelpwood that'll carry you up to Gale Outpost — Stormbreak territory, wind-folk, sky ports. Chief Borran runs the place, more or less.\"\n\n\"Go tell him what's happening down here. And — if you've got some fighting style you've been meaning to sharpen into something sharper, Gale Outpost keeps instructors for exactly that. Might be time.\"\n\n\"Safe winds.\"",
    progress: 'The updraft lift groans and rattles its way up through the clouds toward Stormbreak.',
    complete:
      "Borran claps you on the shoulder hard enough to stagger a smaller person. \"Fenna's messenger! Good, good — we've had our own troubles up here, storm's been getting meaner. Get yourself settled, and if you haven't picked a fighting style worth the name yet, go rattle one of our instructors' cages. They love new blood.\"",
    objectives: [{ type: 'visit', mapId: 'gale_outpost' }, { type: 'talk', npcId: 'npc_borran' }],
    rewards: { xp: 2300, gold: 380, items: [{ itemId: 'use_return_scroll', qty: 2 }] },
  },
  {
    id: 'mq_11b_skyships_down',
    name: 'Skyships Down',
    type: 'main',
    chapter: 3,
    giver: 'npc_borran',
    level: 18,
    reqs: [{ type: 'quest', questId: 'mq_11_updraft', state: 'completed' }, { type: 'level', min: 17 }],
    summary: 'Clear stormhawks and sky raiders harassing outpost shipping lanes.',
    offer:
      "\"Skyships going down left and right,\" Borran growls, slapping a wind-battered chart. \"Stormhawks and sky raiders both, harassing anything that flies near the ledges and the peaks. Losing cargo, losing people.\"\n\n\"I need the sky cleared, or as clear as one storm-choked outpost chief can ask for. Hunt the hawks and the raiders back from our shipping lanes.\"\n\n\"And listen — Grell's people have set up camp on the ledges, and so have Aolani's. Whichever banner you fly, go see your own. They'll have work suited to your colors.\"",
    progress: 'The wind over Windswept Ledges carries the cries of stormhawks and worse.',
    complete:
      "Borran surveys the cleared skies with grim satisfaction. \"Good. Breathing room. Won't last — nothing does lately — but I'll take it. Whatever your people asked of you up there, I hope it helped more than it cost.\"",
    objectives: [
      { type: 'visit', mapId: 'windswept_ledges' },
      { type: 'kill', monsterId: 'stormhawk', count: 10 },
      { type: 'kill', monsterId: 'sky_raider', count: 6 },
    ],
    rewards: { xp: 3700, gold: 540, items: [{ itemId: 'mat_enhance_stone_2', qty: 1 }] },
  },
  {
    id: 'mq_12_kraelith',
    name: 'The Storm Roc',
    type: 'main',
    chapter: 3,
    giver: 'npc_borran',
    level: 24,
    reqs: [{ type: 'quest', questId: 'mq_11b_skyships_down', state: 'completed' }, { type: 'level', min: 23 }],
    summary: "Defeat Kraelith, the maddened Storm Roc, and choose its fate.",
    offer:
      "\"There's a name behind half our storm troubles, and it isn't the storm itself,\" Borran says, quieter than usual. \"Kraelith. Storm Roc, old as the peaks, nests up in what we call the Aerie. Something's driven it half-mad — it's grounding ships out of pure rage now, not hunger.\"\n\n\"Whatever you find up there, whatever you decide to do about it — that's yours to carry. I've learned better than to tell people how to end a fight like that.\"\n\n\"Go on. And be careful. That's not a request.\"",
    progress: "Thunder rolls constantly over Kraelith's Aerie, long before you ever see the Roc itself.",
    complete: "Kraelith's storm finally breaks, and in the sudden quiet, you're left holding the weight of what comes next.",
    objectives: [{ type: 'visit', mapId: 'roc_nest' }, { type: 'boss', monsterId: 'kraelith' }],
    rewards: { xp: 7900, gold: 840 },
    choices: [
      {
        id: 'take_heart',
        label: 'Take the Storm Heart',
        description:
          "Kraelith's chest holds a crystallized knot of pure storm-force — the Storm Heart. Grell's people would call this the only sensible outcome: power, harnessed, put to use before it's wasted on a dead bird. It's a ruthless kind of practical. It's also very, very effective.",
        rewards: { items: [{ itemId: 'eq_amulet_storm_heart' }], reputation: { harpooners: 300 }, flags: { roc: 'taken' } },
      },
      {
        id: 'free_spirit',
        label: "Free the Roc's Spirit",
        description:
          "Instead of harvesting Kraelith's power, you release it — a long, keening note of wind that carries the Roc's spirit up past the storm clouds for good. Aolani's people would recognize this instantly: not every death needs a use. Some just need an ending. The spirit leaves you a single feather that never stops feeling faintly of wind.",
        rewards: { items: [{ itemId: 'eq_ring_roc_feather' }], reputation: { tidekeepers: 300 }, flags: { roc: 'freed' }, title: 'Stormfriend' },
      },
    ],
  },

  // ---------------------------------------------------------------- Act 4
  {
    id: 'mq_13_glowtide',
    name: 'Glowtide',
    type: 'main',
    chapter: 4,
    giver: 'npc_borran',
    turnIn: 'npc_nell',
    level: 24,
    reqs: [{ type: 'quest', questId: 'mq_12_kraelith', state: 'completed' }, { type: 'level', min: 23 }],
    summary: 'Travel down to Glowtide Shallows and find the diver Nell.',
    offer:
      "\"Storm's handled, for now — but I got word from the reef folk that things are worse down at Lanternreef,\" Borran says. \"Bioluminescent waters, sunken ships, and apparently a diver named Nell who knows the place better than anyone alive should want to.\"\n\n\"Head down to Glowtide Shallows, find her. If Kraelith was a symptom, I've got a feeling the reef's where we find the disease.\"\n\n\"Go carefully. Deep water's a different kind of dangerous.\"",
    progress: 'The waters of Glowtide Shallows glow faintly even at midday, beautiful and just slightly unsettling.',
    complete:
      "Nell grins at you around a mouthful of dried fish. \"An outpost referral! Fancy. Word is you've been chasing the blight all the way from Driftmoor — well, you've come to the right glowing swamp. Stick around, I've got just the thing to show you.\"",
    objectives: [{ type: 'visit', mapId: 'glowtide_shallows' }, { type: 'talk', npcId: 'npc_nell' }],
    rewards: { xp: 5300, gold: 650, items: [{ itemId: 'use_hp_potion_l', qty: 2 }] },
  },
  {
    id: 'mq_14_lamplighter',
    name: 'The Lamplighter',
    type: 'main',
    chapter: 4,
    giver: 'npc_nell',
    turnIn: 'npc_lamplighter',
    level: 26,
    reqs: [{ type: 'quest', questId: 'mq_13_glowtide', state: 'completed' }, { type: 'level', min: 25 }],
    summary: "Seek out the ghost known as the Lamplighter in Lantern Deeps.",
    offer:
      "\"There's a ghost out past the shallows,\" Nell says, entirely too casually for the sentence she just said. \"Lantern Deeps, in the dark part of the reef. Gentle sort, as ghosts go — calls himself the Lamplighter. Been haunting a wreck out there since before my grandmother dove these waters.\"\n\n\"He knows things. Old things. About the reef, about the wreck, maybe about what's happening to Oma. Go talk to him — bring a light, the Deeps don't do daytime.\"\n\n\"He won't hurt you. Probably.\"",
    progress: 'Lantern Deeps swallows sound and light alike, broken only by drifting motes of bioluminescence.',
    complete:
      '"The ghost\'s lantern flares brighter at your approach, warm despite the cold water around it. \\"Visitors. It has been some time. Sit, if drifting counts as sitting where you\'re from. I have a story, and I think — I think it is finally time someone heard it.\\""',
    objectives: [{ type: 'visit', mapId: 'lantern_deeps' }, { type: 'talk', npcId: 'npc_lamplighter' }],
    rewards: { xp: 6200, gold: 700, items: [{ itemId: 'use_mp_potion_l', qty: 2 }] },
  },
  {
    id: 'mq_15_logbook',
    name: 'The Logbook',
    type: 'main',
    chapter: 4,
    giver: 'npc_lamplighter',
    level: 27,
    reqs: [{ type: 'quest', questId: 'mq_14_lamplighter', state: 'completed' }, { type: 'level', min: 26 }],
    summary: 'Recover logbook pages from the drowned sailors of the reef.',
    offer:
      "\"My own logbook is long gone, scattered with the rest of the wreck,\" the Lamplighter says, voice like a held breath. \"But the sailors who went down with that ship — some still walk these waters, drowned and unaware. They carry the pages I cannot.\"\n\n\"Bring me what pages you can recover. I need to remember properly, before I can tell you the rest. Some truths deserve more than fragments.\"\n\n\"Please. It has been so very long.\"",
    progress: 'The drowned sailors clutch waterlogged fragments of a story none of them remember living.',
    complete:
      "The Lamplighter arranges the recovered pages with hands that aren't quite solid. \"There. Now I remember. Now — now I can tell you what really happened to Captain Vashti Rook, and to the harpoon she buried somewhere she should never have aimed it. Are you ready?\"",
    objectives: [{ type: 'collect', itemId: 'qi_logbook_page', count: 5 }],
    rewards: { xp: 8100, gold: 810, items: [{ itemId: 'mat_enhance_stone_2', qty: 1 }] },
  },
  {
    id: 'mq_16_captain',
    name: 'Captain Vashti Rook',
    type: 'main',
    chapter: 4,
    giver: 'npc_nell',
    level: 30,
    reqs: [{ type: 'quest', questId: 'mq_15_logbook', state: 'completed' }, { type: 'level', min: 29 }],
    summary: 'Defeat the ghost of Captain Vashti Rook aboard the Sunken Galleon, and decide the fate of her harpoon.',
    offer:
      "\"Captain Rook speared Oma's heart, generations ago, to force her to change course during a storm that would have killed everyone aboard,\" the Lamplighter says, and for a ghost, he sounds almost apologetic on her behalf. \"She saved her crew. She wounded a god to do it. The Blight is that wound, still bleeding, all these years later.\"\n\n\"Her ghost still walks the Sunken Galleon, harpoon in hand, unable to let go of a choice she can't take back. Someone needs to end that. Gently, if you can manage it. Or not, if you can't.\"\n\n\"I cannot go with you. I am sorry for that, more than you know.\"",
    progress: 'The Sunken Galleon creaks with the weight of a captain who never truly left.',
    complete: "Whatever you chose to do with Captain Rook's harpoon, the galleon falls silent in a way it hasn't in decades.",
    objectives: [{ type: 'visit', mapId: 'sunken_galleon' }, { type: 'boss', monsterId: 'captain_rook' }],
    rewards: { xp: 12200, gold: 1050 },
    choices: [
      {
        id: 'claim_harpoon',
        label: 'Claim the Harpoon',
        description:
          "You pry the harpoon from the Captain's spectral grip and keep it — a weapon forged from the very wound that started all of this, terrible and undeniably powerful. Rook's ghost does not thank you for it. She simply fades, still cursed, still unfinished, leaving the choice's weight entirely on you now.",
        rewards: { items: [{ itemId: 'eq_amulet_rook_harpoon' }], flags: { rook: 'claimed' } },
      },
      {
        id: 'lay_to_rest',
        label: 'Lay Her to Rest',
        description:
          "You carry the harpoon back to the Lamplighter instead, and something in the deep water finally, finally exhales. Rook's ghost goes still, at peace for the first time since the storm that made her a legend and a tragedy in the same breath. He gives you a lantern that never quite goes dark.",
        rewards: { items: [{ itemId: 'eq_ring_lamplight' }], flags: { rook: 'rested' }, title: 'Lightbearer' },
      },
    ],
  },

  // ---------------------------------------------------------------- Act 5
  {
    id: 'mq_17_inside',
    name: 'Into the Hollow',
    type: 'main',
    chapter: 5,
    giver: 'npc_nell',
    turnIn: 'npc_first_singer',
    level: 30,
    reqs: [{ type: 'quest', questId: 'mq_16_captain', state: 'completed' }, { type: 'level', min: 29 }],
    summary: 'Enter the Hollow Mouth and find the Echo of the First Singer.',
    offer:
      "Nell's usual grin is gone when you find her. \"The Lamplighter told me. All of it. Oma's heart, the old wound, the Blight bleeding out of it for generations... there's a way in, if you're brave or foolish enough. The Hollow Mouth, deep past the shallows, leads inside her.\"\n\n\"There's supposedly something living down there that remembers further back than any of us. An echo of the very first whalesong. If Oma can be healed at all, that's where you'll learn how.\"\n\n\"I wish I could go with you. I really do. Someone should mind the shallows, though. Go. Find the First Singer.\"",
    progress: 'The Hollow Mouth breathes around you, warm and wet and unmistakably alive.',
    complete:
      "A voice made of overlapping harmonies fills the cavern before any shape does. \"Small one. Small, brave, foolish one. You carry the weight of choices made and unmade. Come closer. Let us see what remains to be done.\"",
    objectives: [{ type: 'visit', mapId: 'hollow_mouth' }, { type: 'talk', npcId: 'npc_first_singer' }],
    rewards: { xp: 8300, gold: 800, items: [{ itemId: 'use_hp_potion_xl', qty: 1 }] },
  },
  {
    id: 'mq_18_echoes',
    name: 'Echoes of the Song',
    type: 'main',
    chapter: 5,
    giver: 'npc_first_singer',
    level: 32,
    reqs: [{ type: 'quest', questId: 'mq_17_inside', state: 'completed' }, { type: 'level', min: 31 }],
    summary: 'Gather echo shards from the twisted creatures of the Blighted Veins.',
    offer:
      "\"The Blight has reached even here, into her deepest chambers,\" the First Singer says, sorrow layered under every syllable. \"The old songs that once kept her whole have shattered into echoes — fragments of melody caught in the wraiths and sentinels the rot has twisted.\"\n\n\"Gather what echoes you can. Not by force alone — by listening, though I know your kind mostly knows the sword. Six shards should be enough to begin reweaving what's left of the song.\"\n\n\"Go gently, if gently is a thing you have in you.\"",
    progress: 'Fragments of an impossibly old song drift loose from the twisted things in the Blighted Veins.',
    complete:
      "The First Singer gathers the echo shards into something almost resembling a chord. \"Yes. Yes, this is enough. Now — now we go to her heart, and you decide what kind of ending this whale, and this world, deserves.\"",
    objectives: [{ type: 'visit', mapId: 'blighted_veins' }, { type: 'collect', itemId: 'qi_echo_shard', count: 6 }],
    rewards: { xp: 11300, gold: 960, items: [{ itemId: 'mat_enhance_stone_3', qty: 1 }] },
  },
  {
    id: 'mq_19_heart',
    name: 'Heart of Oma',
    type: 'main',
    chapter: 5,
    giver: 'npc_first_singer',
    level: 36,
    reqs: [{ type: 'quest', questId: 'mq_18_echoes', state: 'completed' }, { type: 'level', min: 35 }],
    summary: 'Defeat the Blight Heart and choose how this all ends.',
    offer:
      "\"Her heart lies just beyond, small one, and it is no longer only a heart,\" the First Singer says. \"The Blight has made of it something that fights back — a wound grown teeth. Beyond it waits your choice: to harvest what power remains in her Ember, to purify the rot and let her heal on her own terms, or — if you have walked gently enough on the paths behind you — to do both, and sing this ending together with her.\"\n\n\"I cannot choose for you. No one ever could, in the end — not Rook, not Grell, not Aolani, not even Oma herself. Only you, standing at the center of everything.\"\n\n\"Go. Whatever comes of this, I will remember the song of it.\"",
    progress: "The Heart of Oma pulses ahead, violet and burning, alive in a way that shouldn't still be possible.",
    complete: "The Blight Heart falls silent at last, and the whole vast body of Oma seems to hold its breath around you, waiting to hear what you've decided.",
    objectives: [
      { type: 'visit', mapId: 'heart_chamber' },
      { type: 'boss', monsterId: 'blight_heart' },
      { type: 'collect', itemId: 'qi_ember_fragment', count: 1 },
    ],
    rewards: { xp: 19000, gold: 1440 },
    choices: [
      {
        id: 'harvest',
        label: 'Harvest the Ember',
        description:
          "You take the Blight Heart's burning core into your own hands and claim its power outright — the Harpooners' answer, given form. Oma will live, changed and scarred, steered now as much by the Ember's new master as by her own currents. Grell would call this the only ending strong enough to matter.",
        rewards: { items: [{ itemId: 'eq_amulet_ember_harvest' }], flags: { ending: 'harvest' }, title: 'Emberlord', reputation: { harpooners: 400 } },
      },
      {
        id: 'purify',
        label: 'Purify the Blight',
        description:
          "You pour every ounce of song and stillness you've gathered into the wound instead, cleansing rather than claiming. It is slow, and it hurts, and it is exactly the answer Aolani always believed in: that Oma deserved healing, not harvesting, however long that healing takes to hold.",
        rewards: { items: [{ itemId: 'eq_amulet_oma_purified' }], flags: { ending: 'purify' }, title: 'Whale-Healer', reputation: { tidekeepers: 400 } },
      },
      {
        id: 'sing_together',
        label: 'Sing Together',
        description:
          "Because you freed a storm spirit instead of caging it, and laid a captain's grief to rest instead of claiming her weapon, something rarer opens to you now: not harvest, not purification alone, but a true duet between whale and rider, wound and witness. Oma's heart answers your voice as if it had been waiting, all these years, for someone to simply ask.",
        reqs: [{ type: 'flag', flag: 'roc', value: 'freed' }, { type: 'flag', flag: 'rook', value: 'rested' }],
        lockedHint: "This ending remembers mercy: only those who freed Kraelith's spirit and laid Captain Rook to rest may sing it.",
        rewards: { items: [{ itemId: 'eq_ring_songbound' }], flags: { ending: 'song' }, title: 'Songbound' },
      },
    ],
  },

  // ---------------------------------------------------------------- Epilogue
  {
    id: 'mq_20_epilogue',
    name: 'What the Whale Remembers',
    type: 'main',
    chapter: 6,
    giver: 'npc_maren',
    level: 36,
    reqs: [{ type: 'quest', questId: 'mq_19_heart', state: 'completed' }],
    summary: 'Return to Maren in Driftmoor and tell her how it ended.',
    offer:
      "Maren meets you at the harbor same as always, except the harbor itself feels different now — quieter, or maybe just calmer. \"So. You did it. Whatever 'it' ended up meaning. Driftmoor's still drifting, last I checked, which is more than I'd have bet on some weeks back.\"\n\n\"Come here. Let me actually look at you before you run off toward the next horizon — because I know you will, that's just the shape of people like you.\"\n\n\"Tell me how it went. All of it.\"",
    progress: 'Driftmoor goes on around you, ordinary and impossibly precious for it.',
    complete:
      "Maren listens to the whole story without once reaching for her ledger, which might be the highest compliment she's ever paid anyone. \"Well. However this ends up being remembered — I'm glad you were the one standing where you stood. Go on, then. Rest, if you remember how. You've earned it twice over.\"",
    objectives: [{ type: 'talk', npcId: 'npc_maren' }],
    rewards: { xp: 1500, gold: 500, items: [{ itemId: 'use_elixir_s', qty: 3 }] },
  },
];
