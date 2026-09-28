import type { QuestDef } from '../../types';

/**
 * JOB ADVANCEMENT QUESTS — two-step chain per class, both at Gale Outpost, level >= JOB_ADVANCE_LEVEL (15).
 * jq_<class>_1 is the instructor's test; jq_<class> is the final trial whose turn-in offers the tier-2 choice.
 */
export const JOB_QUESTS: QuestDef[] = [
  // ---------------------------------------------------------------- Vanguard (Commander Hale)
  {
    id: 'jq_vanguard_1',
    name: "The Instructor's Test",
    type: 'job',
    giver: 'npc_hale',
    level: 15,
    reqs: [{ type: 'class', classId: 'vanguard' }, { type: 'jobTier', tier: 1 }, { type: 'level', min: 15 }],
    summary: "Prove your mettle to Commander Hale.",
    offer:
      "Commander Hale doesn't so much greet recruits as inspect them. \"So you're the one who's been swinging that weapon around the outpost. Good instincts, terrible discipline. Let's fix that.\"\n\n\"Ten cloud puffs, direct engagement, no cheap tricks. And bring back thunder beetle carapace — five of them — so I know you can take a hit as well as give one.\"\n\n\"Report back when it's done. Don't die. That's an order, not a suggestion.\"",
    progress: 'Cloud puffs bounce with irritating cheerfulness even as you cut through their ranks.',
    complete:
      "Hale inspects your gear with a critical eye and, for the first time, something like approval. \"Not bad. You might actually be worth the trouble of finishing your training.\"",
    objectives: [
      { type: 'kill', monsterId: 'cloud_puff', count: 10 },
      { type: 'collect', itemId: 'mat_thunder_carapace', count: 5 },
      { type: 'talk', npcId: 'npc_hale' },
    ],
    rewards: { xp: 2280, gold: 375, items: [{ itemId: 'use_hp_potion_m', qty: 2 }] },
  },
  {
    id: 'jq_vanguard',
    name: 'Bulwark or Reaver',
    type: 'job',
    giver: 'npc_hale',
    level: 16,
    reqs: [{ type: 'quest', questId: 'jq_vanguard_1', state: 'completed' }, { type: 'class', classId: 'vanguard' }, { type: 'jobTier', tier: 1 }, { type: 'level', min: 15 }],
    summary: 'Face the final trial and choose your specialization.',
    offer:
      "\"Time for the real test,\" Hale says, cracking her knuckles. \"Twelve sky raiders — they fight dirty, ranged, and in numbers. If you can hold a line against that, you're ready to choose how you hold it from here on.\"\n\n\"Bring back their badges as proof. And think hard about what kind of frontline you want to be — because after this, there's no going back to just 'vanguard.'\"\n\n\"Go make me proud, recruit.\"",
    progress: "The sky raiders don't go down easy, but neither do you.",
    complete: "Hale looks over your battered gear and grins, sharp and genuine. \"You held. Good. Now — which line do you want to be, permanently?\"",
    objectives: [{ type: 'kill', monsterId: 'sky_raider', count: 12 }, { type: 'collect', itemId: 'mat_raider_badge', count: 6 }],
    rewards: { xp: 2900, gold: 450 },
    choices: [
      {
        id: 'bulwark',
        label: 'Bulwark',
        description:
          "A wall that doesn't break. Bulwarks trade damage output for damage denial — shields raised, counters timed, taunts drawing every hit away from allies who'd rather not eat it. If your idea of winning a fight is making sure your side simply doesn't lose, this is your calling.",
        jobAdvance: 'bulwark',
        rewards: {},
      },
      {
        id: 'reaver',
        label: 'Reaver',
        description:
          "A storm that doesn't ask permission. Reavers spend their own blood to fuel devastating cleaves and lifesteal that turns every wound into fuel for the next swing. It's reckless, it's exhausting, and against anything foolish enough to stand still, it's absolutely devastating.",
        jobAdvance: 'reaver',
        rewards: {},
      },
    ],
  },

  // ---------------------------------------------------------------- Stormcaller (Archmage Ysolde)
  {
    id: 'jq_stormcaller_1',
    name: "The Instructor's Test",
    type: 'job',
    giver: 'npc_ysolde',
    level: 15,
    reqs: [{ type: 'class', classId: 'stormcaller' }, { type: 'jobTier', tier: 1 }, { type: 'level', min: 15 }],
    summary: "Prove your control of the storm to Archmage Ysolde.",
    offer:
      "Archmage Ysolde is elbow-deep in a spellbook that's actively smoking slightly when you arrive. \"Oh — a student! Wonderful timing, I was just about to test whether this page combusts if I read it upside down. Later, perhaps.\"\n\n\"Your first trial: ten gust wisps, and I want them dead by spell, not by stick. Bring me five wisp essences too — I need fresh samples, mine keep evaporating before I can use them, which is either bad storage or a metaphor.\"\n\n\"Go on, go on. The wind won't cast itself.\"",
    progress: 'Gust wisps scatter and reform in the storm winds, tricky targets for anything but a well-aimed spell.',
    complete:
      "Ysolde examines the wisp essence with delight bordering on alarming. \"Excellent! Fresh, potent, barely evaporated at all. You have a knack for this. Ready for something with slightly more voltage?\"",
    objectives: [
      { type: 'kill', monsterId: 'gust_wisp', count: 10 },
      { type: 'collect', itemId: 'mat_wisp_essence', count: 5 },
      { type: 'talk', npcId: 'npc_ysolde' },
    ],
    rewards: { xp: 2280, gold: 375, items: [{ itemId: 'use_mp_potion_m', qty: 2 }] },
  },
  {
    id: 'jq_stormcaller',
    name: 'Tempest or Tidesinger',
    type: 'job',
    giver: 'npc_ysolde',
    level: 16,
    reqs: [{ type: 'quest', questId: 'jq_stormcaller_1', state: 'completed' }, { type: 'class', classId: 'stormcaller' }, { type: 'jobTier', tier: 1 }, { type: 'level', min: 15 }],
    summary: 'Face the final trial and choose your specialization.',
    offer:
      "\"Twelve thunder beetles,\" Ysolde announces, entirely too cheerfully. \"They're basically walking capacitors, which means they hit back hard if you get lazy with your positioning. Bring me their carapaces — six should do — and then we'll talk about which current you're meant to channel.\"\n\n\"Lightning, or water and ice. Storm's fury, or the sea's patience. Both very much mine to teach, both very much yours to become.\"\n\n\"Try not to electrocute yourself. Again.\"",
    progress: "The thunder beetles crackle warnings before they charge — warnings you're learning to read.",
    complete: "Ysolde claps sparks off her sleeves, beaming. \"Marvelous! Now — lightning's fury, or the tide's patience? Choose your current, apprentice.\"",
    objectives: [{ type: 'kill', monsterId: 'thunder_beetle', count: 12 }, { type: 'collect', itemId: 'mat_thunder_carapace', count: 6 }],
    rewards: { xp: 2900, gold: 450 },
    choices: [
      {
        id: 'tempest',
        label: 'Tempest',
        description:
          "Lightning and wind, unleashed without apology. Tempests chain lightning between enemies, summon storms overhead, and blink through the battlefield like the weather itself decided to take offense personally. Loud, fast, and utterly merciless.",
        jobAdvance: 'tempest',
        rewards: {},
      },
      {
        id: 'tidesinger',
        label: 'Tidesinger',
        description:
          "Water and ice, patient and precise. Tidesingers freeze enemies solid, carve out zones of lingering frost, and weave healing into every spell they cast. Where tempests overwhelm, tidesingers endure — and outlast.",
        jobAdvance: 'tidesinger',
        rewards: {},
      },
    ],
  },

  // ---------------------------------------------------------------- Windrunner (Ranger Kestrel)
  {
    id: 'jq_windrunner_1',
    name: "The Instructor's Test",
    type: 'job',
    giver: 'npc_kestrel',
    level: 15,
    reqs: [{ type: 'class', classId: 'windrunner' }, { type: 'jobTier', tier: 1 }, { type: 'level', min: 15 }],
    summary: 'Prove your aim to Ranger Kestrel.',
    offer:
      "Ranger Kestrel doesn't look up from restringing her bow. \"Heard you can hit a target. Prove it. Ten stormhawks, aerial, moving fast — no easy ground shots.\"\n\n\"Bring me five storm feathers while you're at it. Fletching material, and a decent test of whether you can actually track what you're shooting at up here.\"\n\n\"Come back when the sky's a little quieter.\"",
    progress: "Stormhawks wheel and dive through the ledges, fast and unpredictable — good practice for a steady hand.",
    complete:
      "Kestrel inspects the feathers, nods once. \"Clean work. Didn't expect that from someone who was swinging a training sword a month ago. Ready for the real test?\"",
    objectives: [
      { type: 'kill', monsterId: 'stormhawk', count: 10 },
      { type: 'collect', itemId: 'mat_storm_feather', count: 5 },
      { type: 'talk', npcId: 'npc_kestrel' },
    ],
    rewards: { xp: 2280, gold: 375, items: [{ itemId: 'use_hp_potion_m', qty: 2 }] },
  },
  {
    id: 'jq_windrunner',
    name: 'Skyhunter or Sparkgunner',
    type: 'job',
    giver: 'npc_kestrel',
    level: 16,
    reqs: [{ type: 'quest', questId: 'jq_windrunner_1', state: 'completed' }, { type: 'class', classId: 'windrunner' }, { type: 'jobTier', tier: 1 }, { type: 'level', min: 15 }],
    summary: 'Face the final trial and choose your specialization.',
    offer:
      "\"Twelve sky raiders, and these ones shoot back,\" Kestrel says, already nocking an arrow of her own out of habit. \"If you can out-range and out-think armed opponents, you've earned the right to specialize. Bring their badges back as proof, and we'll talk about precision versus firepower.\"\n\n\"Bow, or gun. Pierce, or explode. Both mine to teach. Only one's yours to master.\"",
    progress: "The sky raiders return fire, and you're learning exactly how far 'safe distance' really is.",
    complete: "Kestrel looks over the badges and allows herself something close to a smile. \"Good instincts. Precision, or firepower — which is it going to be?\"",
    objectives: [{ type: 'kill', monsterId: 'sky_raider', count: 12 }, { type: 'collect', itemId: 'mat_raider_badge', count: 6 }],
    rewards: { xp: 2900, gold: 450 },
    choices: [
      {
        id: 'skyhunter',
        label: 'Skyhunter',
        description:
          "Bow and pure precision. Skyhunters pierce through lines of enemies, loose devastating multishots, and call down arrow rain on anything foolish enough to cluster up. Every shot counts, and every shot lands.",
        jobAdvance: 'skyhunter',
        rewards: {},
      },
      {
        id: 'sparkgunner',
        label: 'Sparkgunner',
        description:
          "Flintlock and controlled chaos. Sparkgunners trade precision for raw stopping power — explosive shots, deployable turrets, and knockback that turns crowds into wide open space. Loud, messy, and extremely satisfying.",
        jobAdvance: 'sparkgunner',
        rewards: {},
      },
    ],
  },

  // ---------------------------------------------------------------- Shade (Whisper)
  {
    id: 'jq_shade_1',
    name: "The Instructor's Test",
    type: 'job',
    giver: 'npc_whisper',
    level: 15,
    reqs: [{ type: 'class', classId: 'shade' }, { type: 'jobTier', tier: 1 }, { type: 'level', min: 15 }],
    summary: 'Prove your discretion to Whisper.',
    offer:
      "Whisper says nothing at first — just studies you, head tilted, until it's almost uncomfortable. Then: \"Cloud puffs. Ten. No noise. No mess. I'll know if you were sloppy.\"\n\n\"Bring back fluff. Five. Proof you were there at all.\"\n\n\"Go.\"",
    progress: 'Cloud puffs drift lazily along the ledges, easy prey for anyone patient enough to wait for the opening.',
    complete: "Whisper turns the fluff over once, satisfied. \"Quiet enough. Barely. One more trial before you're worth my time properly.\"",
    objectives: [
      { type: 'kill', monsterId: 'cloud_puff', count: 10 },
      { type: 'collect', itemId: 'mat_cloud_fluff', count: 5 },
      { type: 'talk', npcId: 'npc_whisper' },
    ],
    rewards: { xp: 2280, gold: 375, items: [{ itemId: 'use_hp_potion_m', qty: 2 }] },
  },
  {
    id: 'jq_shade',
    name: 'Duskblade or Hexslinger',
    type: 'job',
    giver: 'npc_whisper',
    level: 16,
    reqs: [{ type: 'quest', questId: 'jq_shade_1', state: 'completed' }, { type: 'class', classId: 'shade' }, { type: 'jobTier', tier: 1 }, { type: 'level', min: 15 }],
    summary: 'Face the final trial and choose your specialization.',
    offer:
      "\"Twelve cliff golems,\" Whisper says. \"Slow. Hard-skinned. You'll need precision, not brute force, to bring them down clean. Bring me their cores — six — and then decide what kind of shadow you intend to become.\"\n\n\"Blades, or poison. Up close, or from a distance no one sees you leave. Both are mine. Choose.\"",
    progress: "The cliff golems are slow, but their hide turns aside anything less than a perfectly placed strike.",
    complete: "Whisper actually smiles — barely, but it counts. \"Good. Blade, or venom? Choose your shadow.\"",
    objectives: [{ type: 'kill', monsterId: 'cliff_golem', count: 12 }, { type: 'collect', itemId: 'mat_golem_core', count: 6 }],
    rewards: { xp: 2900, gold: 450 },
    choices: [
      {
        id: 'duskblade',
        label: 'Duskblade',
        description:
          "Dual daggers, relentless combos, and dashes that put you exactly where the fight is worst for your enemy and best for you. Duskblades bleed their targets dry up close, fast enough that distance never becomes their problem.",
        jobAdvance: 'duskblade',
        rewards: {},
      },
      {
        id: 'hexslinger',
        label: 'Hexslinger',
        description:
          "Thrown cursed blades, marks that make every subsequent hit worse, and shadow clones that make it very unclear which of you is actually the threat. Hexslingers unravel enemies from range, patiently, inevitably.",
        jobAdvance: 'hexslinger',
        rewards: {},
      },
    ],
  },
];
