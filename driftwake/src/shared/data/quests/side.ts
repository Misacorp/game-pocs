import type { QuestDef } from '../../types';
import { xpToNext } from '../../constants';

/** side/daily quest xp ~ 0.15-0.3x (dailies ~0.1-0.2x) of xpToNext(recommended level). */
const qxp = (level: number, frac = 0.22) => Math.round(xpToNext(level) * frac);
/** gold ~ level * 8..25 */
const qgold = (level: number, mult = 14) => Math.round(level * mult);

// ---------------------------------------------------------------------------
// DRIFTMOOR (levels 1-11)
// ---------------------------------------------------------------------------

const DRIFTMOOR_QUESTS: QuestDef[] = [
  {
    id: 'sq_driftmoor_pells_tea',
    name: "Pell's Aching Knees",
    type: 'side',
    giver: 'npc_pell',
    level: 2,
    reqs: [{ type: 'level', min: 1 }],
    summary: "Gather sproutling caps for Old Pell's knee tea.",
    offer:
      "\"Ah, hello there. Don't mind me, just creaking like an old ship's mast.\"\n\nOld Pell rubs his knee and nods at the meadow. \"There's a tea my grandmother swore by — sproutling cap, dried and steeped. If you're headed that way and don't mind an old man's aches, I'd be grateful for a handful.\"",
    progress: "\"Sproutling caps, when you get a chance. No rush — my knees have waited this long.\"",
    complete: "Pell sniffs the caps and beams. \"Perfect. Smells like my grandmother's kitchen already. Thank you, truly.\"",
    objectives: [{ type: 'collect', itemId: 'mat_sprout_cap', count: 5, desc: 'Sproutling caps from the meadow' }],
    rewards: { xp: qxp(2), gold: qgold(2), items: [{ itemId: 'use_hp_potion_s', qty: 2 }] },
  },
  {
    id: 'sq_driftmoor_wren_kite',
    name: "Wren's Kite",
    type: 'side',
    giver: 'npc_wren',
    level: 2,
    reqs: [{ type: 'level', min: 1 }],
    summary: "Fetch Wren's kite from the meadow willow — and decide what to tell her about it.",
    offer:
      "Wren is near tears, clutching a snapped kite string. \"My kite! The wind took it and now it's stuck in the big willow in the meadow and I'm too small to climb and Mom says I can't go alone and — will you get it? Please??\"\n\nShe sniffles. \"It's got my whole heart sewn into it. Also feathers. Mostly feathers.\"",
    progress: "\"Did you find the willow? It's the big bendy one, you can't miss it!\"",
    complete: 'Wren looks up at you, hopeful and impatient in equal measure.',
    objectives: [
      { type: 'visit', mapId: 'mossback_meadows', desc: 'Search the willow tree in the meadow' },
      { type: 'collect', itemId: 'qi_wren_kite', count: 1, desc: 'The tangled kite' },
    ],
    onAccept: [{ type: 'giveItem', itemId: 'qi_wren_kite', qty: 1 }],
    rewards: { xp: qxp(2), gold: qgold(2, 4) },
    choices: [
      {
        id: 'kite_honest',
        label: 'Give it back, no strings attached',
        description: 'Hand Wren her kite exactly as you found it.',
        completeText:
          '"You found it! You really found it!" Wren hugs the kite like it might fly away again. "You\'re the best. I mean it."',
        rewards: { xp: qxp(2, 0.15), gold: qgold(2, 3), flags: { wren_full_return: true } },
      },
      {
        id: 'kite_finder_fee',
        label: "Ask for a finder's fee first",
        description: 'Wren still gets her kite back — but only after some haggling.',
        completeText:
          'Wren scowls, digs in a coin purse shaped like a snail, and slaps a handful of copper into your palm. "Fine. FINE. Here. You\'re still kind of the best, I guess."',
        rewards: { xp: qxp(2, 0.1), gold: qgold(2, 10), flags: { wren_full_return: false } },
      },
    ],
  },
  {
    id: 'sq_driftmoor_pim_errand_1',
    name: "Pim's Sour Candies",
    type: 'side',
    giver: 'npc_pim',
    level: 3,
    reqs: [{ type: 'level', min: 2 }],
    summary: 'Deliver a bag of sour candies to Wren for Pim.',
    offer:
      "\"Say, you're heading out, yes? Do an old shopkeep a favor.\" Pim slides a paper bag across the counter. \"Sour candies for young Wren. Her mother says one a day, but between you and me, the girl negotiates.\"",
    progress: "\"Did Wren get her candies? Careful, she barters like a dockside smuggler.\"",
    complete: "\"Delivered, eh? Good. Wren's silence while chewing is worth more gold than I paid for this.\"",
    objectives: [{ type: 'talk', npcId: 'npc_wren', desc: 'Bring Wren her candies' }],
    rewards: { xp: qxp(3), gold: qgold(3) },
  },
  {
    id: 'sq_driftmoor_pim_errand_2',
    name: "Wren's Shell Chime",
    type: 'side',
    giver: 'npc_pim',
    level: 4,
    reqs: [{ type: 'quest', questId: 'sq_driftmoor_pim_errand_1', state: 'completed' }],
    summary: 'Collect the shells Wren gathered as a thank-you gift for Pim.',
    offer:
      "\"Back again? Wren sent something for me this time, if you can believe it.\" Pim looks touched despite himself. \"She's collecting snail shells for a windchime, apparently, and insists I need one for the shop. Would you fetch what she's gathered?\"",
    progress: "\"Wren should have a little pile of shells for me by now.\"",
    complete:
      'Pim hangs the tiny shell chime by the door. It clinks, off-key, every time the wind changes. "...I love it, actually. Don\'t tell her I said that."',
    objectives: [{ type: 'collect', itemId: 'mat_snail_shell', count: 5, desc: 'Shells Wren collected' }],
    rewards: { xp: qxp(4), gold: qgold(4), items: [{ itemId: 'use_return_scroll', qty: 1 }, { itemId: 'pet_shellsnail', qty: 1 }], chooseOne: [{ itemId: 'eq_armor_traveler' }, { itemId: 'eq_boots_traveler' }, { itemId: 'eq_ring_copper_band' }, { itemId: 'eq_amulet_shell_pendant' }] },
  },
  {
    id: 'sq_driftmoor_boar_trouble',
    name: 'Boar Trouble',
    type: 'side',
    giver: 'npc_pim',
    level: 5,
    reqs: [{ type: 'level', min: 4 }],
    summary: "Boars trampled Pim's stall goods — thin the herd.",
    offer:
      "\"Look at this mess!\" Pim gestures at overturned crates. \"Mossback boars, charging through like the meadow owes them money. Bad for business, worse for my nerves. Could you... discourage a few?\"",
    progress: "\"Fewer boars means fewer broken crates, my friend.\"",
    complete: "\"Peace and quiet. Well — as much peace and quiet as a harbor town gets. Here, for your trouble.\"",
    objectives: [
      { type: 'kill', monsterId: 'mossback_boar', count: 6 },
      { type: 'collect', itemId: 'mat_boar_hide', count: 3 },
    ],
    rewards: { xp: qxp(5), gold: qgold(5), items: [{ itemId: 'use_hp_potion_s', qty: 2 }] },
  },
  {
    id: 'sq_driftmoor_locket',
    name: "The Tarnished Locket",
    type: 'side',
    giver: 'npc_pell',
    level: 8,
    reqs: [{ type: 'level', min: 7 }],
    summary: 'Recover a locket lost long ago in the Barnacle Grotto — and decide its fate.',
    offer:
      "Pell goes quiet for a moment, looking out at the water. \"Years back, before the grotto turned unfriendly, I lost something down there. A locket. Silver, my wife's. I've never had the knees for climbing back after it... but you might.\"\n\nHe doesn't ask you to promise anything. Just looks hopeful.",
    progress: "\"Grotto crabs like shiny things. If it's still down there, it's probably tucked under one of them.\"",
    complete: 'You turn the tarnished locket over in your hand. It feels heavier than its size.',
    objectives: [
      { type: 'kill', monsterId: 'grotto_crab', count: 8 },
      { type: 'collect', itemId: 'qi_lost_locket', count: 1 },
    ],
    rewards: { xp: qxp(8, 0.12), gold: qgold(8, 6) },
    choices: [
      {
        id: 'locket_return',
        label: 'Return it to Pell',
        description: 'Give the locket back, tarnish and all.',
        completeText:
          "Pell holds the locket like it might vanish if he blinks. \"...Thank you. I didn't know how much I needed this back until you put it in my hand.\" He presses a keepsake into yours in return.",
        rewards: { xp: qxp(8, 0.18), gold: qgold(8, 4), flags: { locket_returned: true }, title: 'Keeper of Memories' },
      },
      {
        id: 'locket_sell',
        label: 'Sell it to Pim instead',
        description: 'Old silver fetches a fair price, and Pell never has to know.',
        completeText:
          'Pim turns the locket over in his fingers and pays well without asking questions — the mark of a good shopkeeper, or a discreet one. You decide not to mention it to Pell.',
        rewards: { xp: qxp(8, 0.1), gold: qgold(8, 20), flags: { locket_returned: false } },
      },
    ],
  },
  {
    id: 'sq_driftmoor_locket_2',
    name: 'Whole Again',
    type: 'side',
    giver: 'npc_pell',
    level: 9,
    reqs: [{ type: 'flag', flag: 'locket_returned', value: true }],
    summary: 'Gather a meadow bloom to leave with the returned locket.',
    offer:
      "Pell turns the locket over in his weathered hands. \"She always kept a meadow flower pressed inside it. Silly of me, maybe, but... would you fetch me a fresh one? Feels wrong to put it away empty.\"",
    progress: "\"Just one bloom, whenever you find a nice one.\"",
    complete: 'Pell tucks the herb into the locket and closes the clasp with a soft click. "There. Whole again." He wipes his eyes, insists it\'s pollen.',
    objectives: [{ type: 'collect', itemId: 'mat_meadow_herb', count: 1 }],
    rewards: { xp: qxp(9, 0.15), gold: qgold(9, 5), items: [{ itemId: 'use_hp_potion_m', qty: 1 }] },
  },
  {
    id: 'sq_driftmoor_bat_problem',
    name: 'Bats in the Belfry (Forge)',
    type: 'side',
    giver: 'npc_brina',
    level: 9,
    reqs: [{ type: 'level', min: 8 }],
    summary: "Barnacle bats keep raiding Brina's forge stockroom.",
    offer:
      "Brina slams a hammer down for emphasis. \"Bats. In my ingot stores. Third week running — they love the warmth off the forge, I think, but they're eating my inventory margins.\" She cracks her knuckles. \"You handle pest control, I'll handle payment.\"",
    progress: "\"Grotto's crawling with them. Swing first, ask questions never.\"",
    complete: "\"Quiet at last. Good work — here, tools of the trade.\" Brina tosses you a small bundle without looking up from the anvil.",
    objectives: [{ type: 'kill', monsterId: 'barnacle_bat', count: 10 }],
    rewards: { xp: qxp(9), gold: qgold(9), items: [{ itemId: 'mat_iron_ingot', qty: 3 }], chooseOne: [{ itemId: 'eq_armor_kelpshell' }, { itemId: 'eq_armor_tidewoven' }, { itemId: 'eq_armor_vinewrap' }, { itemId: 'eq_amulet_kelp_charm' }] },
  },
  {
    id: 'sq_driftmoor_souvenir_shells',
    name: "Genuine Depths Relics (Probably)",
    type: 'side',
    giver: 'npc_pim',
    level: 11,
    reqs: [{ type: 'level', min: 10 }],
    summary: "Collect Depths curiosities for Pim's souvenir shelf.",
    offer:
      "\"The depths past the grotto — dreadful place, I hear, all rust and pincers — but tourists love a good souvenir with a story. Bring me some of that rustclaw shell and I'll make it worth your while.\"",
    progress: "\"Rustclaw shells, and a story to go with them, that's the ticket.\"",
    complete:
      'Pim arranges the shells on a little velvet stand with a hand-lettered sign: GENUINE DEPTHS RELICS (PROBABLY). "Splendid. Here\'s your cut."',
    objectives: [
      { type: 'kill', monsterId: 'rustclaw_crab', count: 8 },
      { type: 'collect', itemId: 'mat_rust_shell', count: 6 },
      { type: 'visit', mapId: 'grotto_depths' },
    ],
    rewards: {
      xp: qxp(11),
      gold: qgold(11),
      items: [{ itemId: 'mat_enhance_stone_1', qty: 1 }, { itemId: 'use_hp_potion_m', qty: 1 }],
      chooseOne: [{ itemId: 'eq_sword_kelpwoven' }, { itemId: 'eq_staff_kelpwoven' }, { itemId: 'eq_bow_kelpwoven' }, { itemId: 'eq_dagger_kelpwoven' }],
    },
  },
];

// ---------------------------------------------------------------------------
// FINREACH (levels 10-18)
// ---------------------------------------------------------------------------

const FINREACH_QUESTS: QuestDef[] = [
  {
    id: 'sq_finreach_fennas_nets',
    name: "Fenna's Nets",
    type: 'side',
    giver: 'npc_fenna',
    level: 10,
    reqs: [{ type: 'level', min: 9 }],
    summary: "Clear kelp sprites tangling Fenna's nets and gather kelp essence.",
    offer:
      "Fenna's nets are a shredded mess of glowing fibers. \"Kelp sprites,\" she mutters. \"Cute from a distance. Absolute menaces up close. Clear a path and bring me some essence while you're at it — I can still salvage the good kelp.\"",
    progress: "\"Sprites first, essence second. In that order, preferably.\"",
    complete: '"Not bad for a landlubber." Fenna almost smiles. "Almost."',
    objectives: [
      { type: 'kill', monsterId: 'kelp_sprite', count: 8 },
      { type: 'collect', itemId: 'mat_kelp_essence', count: 5 },
    ],
    rewards: { xp: qxp(10), gold: qgold(10), items: [{ itemId: 'use_mp_potion_m', qty: 2 }, { itemId: 'pet_kelpfox', qty: 1 }] },
  },
  {
    id: 'sq_finreach_scholars_specimens',
    name: "Idris's Specimens",
    type: 'side',
    giver: 'npc_idris',
    level: 12,
    reqs: [{ type: 'level', min: 11 }],
    summary: "Collect tanglevine thorn samples for Scholar Idris's research.",
    offer:
      "Idris doesn't look up from his notes. \"Ah — you. Good. I require samples. Tanglevine thorns, specifically — I have a theory about the Blight's spread pattern, and thorns don't grow like that naturally. Six should do, for now.\"",
    progress: "\"Thorns, if you would. For science.\"",
    complete:
      'Idris examines the thorns with unsettling intensity. "As I suspected. Or feared. Possibly both. There is more to look into — return when you\'re able."',
    objectives: [
      { type: 'kill', monsterId: 'tanglevine', count: 6 },
      { type: 'collect', itemId: 'mat_vine_thorn', count: 6 },
    ],
    rewards: { xp: qxp(12), gold: qgold(12) },
  },
  {
    id: 'sq_finreach_scholars_expedition',
    name: "Into the Tangle Heart",
    type: 'side',
    giver: 'npc_idris',
    level: 13,
    reqs: [{ type: 'quest', questId: 'sq_finreach_scholars_specimens', state: 'completed' }],
    summary: 'Scout the Tangle Heart for Scholar Idris.',
    offer:
      "\"The pattern points deeper — into the Tangle Heart itself,\" Idris says, entirely too excited for someone about to send you somewhere dangerous. \"I need eyes on the ground. Or rather — your eyes. On my ground. Metaphorically.\"",
    progress: "\"Scout the Tangle Heart. Try not to become a specimen yourself.\"",
    complete:
      '"Fascinating. Genuinely fascinating." Idris hands over a small vial without further explanation, already scribbling new notes. "Thank you — properly, I mean it."',
    objectives: [
      { type: 'visit', mapId: 'tangle_heart' },
      { type: 'kill', monsterId: 'kelp_spider', count: 5 },
    ],
    rewards: { xp: qxp(13, 0.25), gold: qgold(13), items: [{ itemId: 'mat_enhance_stone_1', qty: 1 }], chooseOne: [{ itemId: 'eq_sword_amberlit' }, { itemId: 'eq_staff_amberlit' }, { itemId: 'eq_bow_amberlit' }, { itemId: 'eq_dagger_amberlit' }] },
  },
  {
    id: 'sq_finreach_eel_hunt',
    name: 'Eel Population Control',
    type: 'side',
    giver: 'npc_fenna',
    level: 13,
    reqs: [{ type: 'level', min: 12 }],
    summary: 'Thin the driftfin eel population choking the kelp beds.',
    offer:
      "\"Eels are breeding faster than the kelp can handle,\" Fenna says, hauling in a torn net. \"Thin them out, and Tobbin back in Driftmoor will pay well for fresh fillet, I'd wager.\"",
    progress: "\"Every eel you clear is kelp that gets to breathe again.\"",
    complete: '"That\'s more like it. The kelp beds thank you. So do I, honestly."',
    objectives: [
      { type: 'kill', monsterId: 'driftfin_eel', count: 10 },
      { type: 'collect', itemId: 'mat_eel_fillet', count: 8 },
    ],
    rewards: { xp: qxp(13), gold: qgold(13), items: [{ itemId: 'use_hp_potion_m', qty: 2 }] },
  },
  {
    id: 'sq_finreach_silk_run',
    name: 'The Silk Run',
    type: 'side',
    giver: 'npc_fenna',
    level: 16,
    reqs: [{ type: 'level', min: 15 }],
    summary: 'Harvest spider silk from the deep kelp for reinforced nets.',
    offer:
      "\"Kelp spiders spin silk stronger than any rope I can buy,\" Fenna says. \"If you can stomach getting close to them, I'd love a supply for the nets. Emphasis on 'if.'\"",
    progress: "\"Silk, please. As much as you can carry.\"",
    complete: "Fenna runs the silk through her fingers, impressed despite herself. \"This'll hold against anything short of a kraken. Thank you.\"",
    objectives: [
      { type: 'kill', monsterId: 'kelp_spider', count: 10 },
      { type: 'collect', itemId: 'mat_spider_silk', count: 6 },
    ],
    rewards: { xp: qxp(16), gold: qgold(16), items: [{ itemId: 'mat_enhance_stone_1', qty: 1 }], chooseOne: [{ itemId: 'eq_sword_amberlit' }, { itemId: 'eq_bow_amberlit' }, { itemId: 'eq_wand_amberlit' }, { itemId: 'eq_knives_amberlit' }] },
  },
  {
    id: 'sq_finreach_tangle_bloom',
    name: "The Tangle's Bloom",
    type: 'side',
    giver: 'npc_fenna',
    level: 17,
    reqs: [{ type: 'level', min: 16 }],
    summary: "Investigate strange spore blooms in the wake of Old Tangle's fall.",
    offer:
      "\"Since that old hydra went down, spores have been blooming everywhere back near the deep kelp,\" Fenna says, wrinkling her nose. \"Might be nothing. Might be the Blight again. Bring me samples so we can find out which.\"",
    progress: "\"Spore samples. Careful not to breathe them in.\"",
    complete:
      'Fenna studies the spores, frowning. "Nothing blighted, near as I can tell. Just... grief, maybe, growing where something big used to be. Thanks for checking."',
    objectives: [
      { type: 'kill', monsterId: 'spore_mushling', count: 8 },
      { type: 'collect', itemId: 'mat_spore_dust', count: 5 },
    ],
    rewards: { xp: qxp(17), gold: qgold(17), items: [{ itemId: 'use_hp_potion_l', qty: 1 }] },
  },
];

// ---------------------------------------------------------------------------
// STORMBREAK (levels 15-24)
// ---------------------------------------------------------------------------

const STORMBREAK_QUESTS: QuestDef[] = [
  {
    id: 'sq_stormbreak_borrans_welcome',
    name: "Borran's Welcome",
    type: 'side',
    giver: 'npc_borran',
    level: 16,
    reqs: [{ type: 'level', min: 15 }],
    summary: "Help secure Gale Outpost's perimeter from cloud puffs and gust wisps.",
    offer:
      "Chief Borran sizes you up. \"New blood. Good, we need it — the wind's been throwing more than weather at us lately. Puffs and wisps are getting bold near the outpost fences. Clear them out and I'll know what you're made of.\"",
    progress: "\"Fences first. Questions later.\"",
    complete: '"Solid work. You\'ll do fine up here." Borran almost smiles, which for him is practically a parade.',
    objectives: [
      { type: 'kill', monsterId: 'cloud_puff', count: 8 },
      { type: 'kill', monsterId: 'gust_wisp', count: 6 },
    ],
    rewards: { xp: qxp(16), gold: qgold(16), items: [{ itemId: 'use_hp_potion_m', qty: 2 }] },
  },
  {
    id: 'sq_stormbreak_quills_wares',
    name: "Quill's Wares",
    type: 'side',
    giver: 'npc_quill',
    level: 17,
    reqs: [{ type: 'level', min: 16 }],
    summary: "Gather storm feathers and cloud fluff for Quill's trade goods.",
    offer:
      "\"Storm feathers, cloud fluff — soft stuff, sells like crazy down in the towns where it never storms,\" Quill says, counting coins that aren't there yet. \"Bring me a haul and we split the profit. Well. Mostly I keep the profit. But you get paid too!\"",
    progress: "\"Feathers and fluff. The wares practically sell themselves once I've got stock.\"",
    complete: '"A businessman\'s dream supplier. Pleasure, as always." Quill flips you a pouch of coin with practiced ease.',
    objectives: [
      { type: 'kill', monsterId: 'stormhawk', count: 6 },
      { type: 'collect', itemId: 'mat_storm_feather', count: 6 },
      { type: 'collect', itemId: 'mat_cloud_fluff', count: 6 },
    ],
    rewards: { xp: qxp(17), gold: qgold(17, 18) },
  },
  {
    id: 'sq_stormbreak_whalecalf_pearl',
    name: 'The Whale-Calf Pearl',
    type: 'side',
    giver: 'npc_quill',
    level: 20,
    reqs: [{ type: 'level', min: 19 }],
    summary: 'Decide the fate of a poached whale-calf pearl recovered from raiders.',
    offer:
      "Quill's usual grin is missing. \"Sky raiders were fencing this through me before I knew what it was.\" He sets a huge, faintly warm pearl on the counter between you. \"It's from a calf. A living one. That's... not something I want on my conscience, but it's also worth a small fortune. I need someone else to decide what happens to it — clear the raiders still hunting for it, and it's yours to choose.\"",
    progress: "\"Raiders first. The pearl isn't going anywhere; it's practically humming.\"",
    complete: 'The pearl sits warm in your hand, entirely too alive-feeling for something that should be a gemstone.',
    objectives: [{ type: 'kill', monsterId: 'sky_raider', count: 5 }],
    onAccept: [{ type: 'giveItem', itemId: 'qi_whalecalf_pearl', qty: 1 }],
    rewards: { xp: qxp(20, 0.15), gold: qgold(20, 5) },
    choices: [
      {
        id: 'pearl_sell',
        label: 'Sell it to Quill',
        description: 'Cash in. The pearl fetches an enormous price on the quiet market.',
        completeText:
          'Quill pays out without meeting your eyes, then pours himself something strong. "Business is business," he mutters, not sounding convinced.',
        rewards: { xp: qxp(20, 0.15), gold: qgold(20, 20), flags: { pearl_returned: false } },
      },
      {
        id: 'pearl_return',
        label: 'Return it to the Tidekeepers',
        description: 'Carry the pearl to the Tidekeeper shrine on the Ledges, where it belongs.',
        completeText:
          "The Tidekeepers receive the pearl like a held breath finally released. Someone murmurs a small prayer for a calf they'll never meet. Quill, oddly, looks relieved too.",
        rewards: {
          xp: qxp(20, 0.2),
          gold: qgold(20, 8),
          reputation: { tidekeepers: 15 },
          flags: { pearl_returned: true },
          items: [{ itemId: 'use_elixir_s', qty: 2 }],
        },
      },
    ],
  },
  {
    id: 'sq_stormbreak_golem_cores_1',
    name: 'Golem Cores',
    type: 'side',
    giver: 'npc_borran',
    level: 21,
    reqs: [{ type: 'level', min: 20 }],
    summary: 'Gather golem cores from Thunderhead Peaks for outpost defenses.',
    offer:
      "\"Cliff golems drop cores when you finally put them down,\" Borran says, studying a schematic. \"Sturdy things. I want to reinforce the outpost gates before winter storms hit — bring me what you can find.\"",
    progress: "\"Cores, from cliff golems. Should be more than enough of them up there.\"",
    complete: "\"A good start. I'll need more before the gates hold properly, but — good start.\"",
    objectives: [
      { type: 'kill', monsterId: 'cliff_golem', count: 6 },
      { type: 'collect', itemId: 'mat_golem_core', count: 4 },
    ],
    rewards: { xp: qxp(21), gold: qgold(21) },
  },
  {
    id: 'sq_stormbreak_golem_cores_2',
    name: 'Reinforcing the Gates',
    type: 'side',
    giver: 'npc_borran',
    level: 22,
    reqs: [{ type: 'quest', questId: 'sq_stormbreak_golem_cores_1', state: 'completed' }],
    summary: 'Finish reinforcing the outpost gates with more golem cores.',
    offer:
      "\"Right, the real ask now,\" Borran says. \"Double what you brought before, and scout the Peaks proper while you're at it — I want to know what's stirring golems up so aggressively lately.\"",
    progress: "\"More cores. And keep your eyes open up there.\"",
    complete:
      "Borran runs a hand along the reinforced gate, satisfied. \"That'll hold. You've got a good eye for trouble — and for ending it. Take this, you've earned it.\"",
    objectives: [
      { type: 'kill', monsterId: 'cliff_golem', count: 10 },
      { type: 'collect', itemId: 'mat_golem_core', count: 8 },
      { type: 'visit', mapId: 'thunderhead_peaks' },
    ],
    rewards: { xp: qxp(22, 0.25), gold: qgold(22), items: [{ itemId: 'mat_enhance_stone_2', qty: 1 }], chooseOne: [{ itemId: 'eq_sword_stormsteel' }, { itemId: 'eq_staff_stormsteel' }, { itemId: 'eq_bow_stormsteel' }, { itemId: 'eq_amulet_thundercore' }] },
  },
  {
    id: 'sq_stormbreak_ferry_feathers',
    name: 'Feathers for the Ferry',
    type: 'side',
    giver: 'npc_ferry_tamsin',
    level: 19,
    reqs: [{ type: 'level', min: 18 }],
    summary: 'Collect stormhawk feathers to line the skyferry gondola.',
    offer:
      "Tamsin pats the side of her battered gondola fondly. \"She creaks in the cold. A good lining of stormhawk feather keeps the passengers from complaining — and believe me, they complain. Fancy a hunt?\"",
    progress: "\"Feathers, the softer the better. Stormhawks up on the ledges and peaks both.\"",
    complete: 'Tamsin tucks the feathers into the gondola\'s seams, humming. "Snug as a nest. Safe travels — on the house, next time you fly with me."',
    objectives: [
      { type: 'kill', monsterId: 'stormhawk', count: 8 },
      { type: 'collect', itemId: 'mat_storm_feather', count: 8 },
    ],
    rewards: { xp: qxp(19), gold: qgold(19), items: [{ itemId: 'use_return_scroll', qty: 2 }, { itemId: 'pet_stormkit', qty: 1 }], chooseOne: [{ itemId: 'eq_axe_amberlit' }, { itemId: 'eq_staff_stormsteel' }, { itemId: 'eq_gun_amberlit' }, { itemId: 'eq_amulet_stormplume' }] },
  },
  {
    id: 'sq_stormbreak_thunder_hunt',
    name: 'Thunder in the Gears',
    type: 'side',
    giver: 'npc_ferry_tamsin',
    level: 20,
    reqs: [{ type: 'level', min: 19 }],
    summary: "Collect thunder beetle carapace to reinforce the ferry's gearbox.",
    offer:
      "\"The gondola's gearbox keeps seizing up in the thunderheads,\" Tamsin says, wiping grease on her coat. \"Thunder beetle carapace, cracked right, makes a fine insulator. Interested in a hunt?\"",
    progress: "\"Beetles, up around the peaks. Their shells, specifically — try not to bring me the whole beetle.\"",
    complete:
      "Tamsin fits the carapace plating into the gearbox and gives it a satisfied thump. \"That'll stop the seizing. You've just made every future passenger's trip smoother, you know.\"",
    objectives: [
      { type: 'kill', monsterId: 'thunder_beetle', count: 10 },
      { type: 'collect', itemId: 'mat_thunder_carapace', count: 6 },
    ],
    rewards: { xp: qxp(20, 0.3), gold: qgold(20, 14), items: [{ itemId: 'mat_enhance_stone_1', qty: 1 }] },
  },
  {
    id: 'sq_stormbreak_raider_ledger',
    name: "The Raider's Ledger",
    type: 'side',
    giver: 'npc_quill',
    level: 21,
    reqs: [{ type: 'level', min: 20 }],
    summary: 'Break up a sky raider smuggling ring and decide what to do with their ledger.',
    offer:
      "Quill leans in conspiratorially. \"Word is the raiders up on the ledges are running a real operation now — organized, ledgers and everything. If you clear enough of them out, you're bound to find the paperwork. I'd... very much like to see it before anyone else does.\"",
    progress: "\"Raiders, however many it takes. The ledger will turn up.\"",
    complete: 'The ledger is thick, careful, and utterly damning. Someone kept excellent records of some very illegal business.',
    objectives: [{ type: 'kill', monsterId: 'sky_raider', count: 15 }],
    onAccept: [{ type: 'giveItem', itemId: 'qi_raider_ledger', qty: 1 }],
    rewards: { xp: qxp(21, 0.2), gold: qgold(21, 8) },
    choices: [
      {
        id: 'ledger_expose',
        label: 'Hand it to Borran',
        description: 'Let the Outpost crack down on the whole operation.',
        completeText:
          'Borran flips through the ledger, jaw tightening with every page. "This\'ll shut them down for good. Good work — the Outpost owes you."',
        rewards: {
          xp: qxp(21, 0.15),
          gold: qgold(21, 6),
          reputation: { harpooners: 10 },
          flags: { raider_ledger_handed: true },
          chooseOne: [
            { itemId: 'eq_sword_stormsteel' },
            { itemId: 'eq_staff_stormsteel' },
            { itemId: 'eq_bow_stormsteel' },
            { itemId: 'eq_dagger_stormsteel' },
          ],
        },
      },
      {
        id: 'ledger_sell',
        label: 'Sell its secrets quietly',
        description: 'Someone out there would pay handsomely to know what the raiders knew.',
        completeText: 'Quill counts out a small fortune, looking faintly guilty about it. "Don\'t ask who bought it. I didn\'t ask either."',
        rewards: { xp: qxp(21, 0.15), gold: qgold(21, 22), flags: { raider_ledger_handed: false } },
      },
    ],
  },
  {
    id: 'sq_stormbreak_raider_aftermath',
    name: 'Mopping Up',
    type: 'side',
    giver: 'npc_borran',
    level: 22,
    reqs: [{ type: 'flag', flag: 'raider_ledger_handed', value: true }],
    summary: 'Finish off the raider remnants named in the ledger.',
    offer:
      "\"The ledger named names, and locations,\" Borran says, already strapping on gear. \"Most of them scattered when the raid started. I want them gone, not just scattered.\"",
    progress: "\"Whatever's left of the raider network. Don't let them regroup.\"",
    complete:
      "\"That's the operation finished, properly this time. You've done more for this outpost's safety than half my garrison.\"",
    objectives: [{ type: 'kill', monsterId: 'sky_raider', count: 10 }],
    rewards: {
      xp: qxp(22, 0.3),
      gold: qgold(22, 15),
      items: [{ itemId: 'mat_enhance_stone_2', qty: 1 }],
      chooseOne: [{ itemId: 'eq_armor_stormplate' }, { itemId: 'eq_armor_cloudsilk' }, { itemId: 'eq_armor_galehide' }],
    },
  },
  {
    id: 'sq_stormbreak_cliffside_vigil',
    name: 'Cliffside Vigil',
    type: 'side',
    giver: 'npc_borran',
    level: 23,
    reqs: [{ type: 'level', min: 22 }],
    summary: "Scout the approach to Kraelith's Aerie and clear the cliffs of golems.",
    offer:
      "\"Before you go anywhere near that roc's nest, I want the approach cleared and scouted,\" Borran says, tracing a line on his map. \"Golems first. Then tell me what you see up there.\"",
    progress: "\"Cliff golems, and eyes on the nest itself.\"",
    complete: "\"Good. That's one less variable before the real fight.\" Borran nods, already planning three steps ahead.",
    objectives: [
      { type: 'kill', monsterId: 'cliff_golem', count: 8 },
      { type: 'visit', mapId: 'roc_nest' },
    ],
    rewards: {
      xp: qxp(23, 0.3),
      gold: qgold(23, 15),
      items: [{ itemId: 'mat_enhance_stone_1', qty: 2 }, { itemId: 'eq_amulet_thundercore', qty: 1 }],
    },
  },
];

// ---------------------------------------------------------------------------
// LANTERNREEF (levels 23-30)
// ---------------------------------------------------------------------------

const LANTERNREEF_QUESTS: QuestDef[] = [
  {
    id: 'sq_lanternreef_nells_errand',
    name: "Nell's Dive Routes",
    type: 'side',
    giver: 'npc_nell',
    level: 24,
    reqs: [{ type: 'level', min: 23 }],
    summary: "Clear reef crabs threatening Nell's dive routes.",
    offer:
      "Diver Nell checks her gear, unbothered by the eerie glow around her. \"Reef crabs have gotten territorial near my usual dive spots. Nothing personal, but they're either learning to share or learning to leave.\"",
    progress: "\"Reef crabs, and whatever claws they leave behind. Bring both.\"",
    complete: '"Dive routes are clear again. You\'ve got good hands for this — ever consider diving professionally?"',
    objectives: [
      { type: 'kill', monsterId: 'reef_crab', count: 8 },
      { type: 'collect', itemId: 'mat_reef_claw', count: 6 },
    ],
    rewards: { xp: qxp(24), gold: qgold(24), items: [{ itemId: 'use_hp_potion_l', qty: 2 }] },
  },
  {
    id: 'sq_lanternreef_glimmerfish_catch',
    name: 'The Glimmerfish Catch',
    type: 'side',
    giver: 'npc_nell',
    level: 25,
    reqs: [{ type: 'level', min: 24 }],
    summary: "Net glimmerfish scales for Nell's lantern-oil trade.",
    offer:
      "\"Glimmerfish scales catch the light beautifully — half the lanterns down here run on oil pressed from them,\" Nell explains. \"Good money in a good catch, if you don't mind wet boots.\"",
    progress: "\"Scales, from glimmerfish. They swarm, so bring a big net. Or, well, your weapon.\"",
    complete: '"Beautiful haul. The lanternmakers in town will love these." Nell tosses you a share of the profit.',
    objectives: [
      { type: 'kill', monsterId: 'glimmerfish', count: 10 },
      { type: 'collect', itemId: 'mat_glimmer_scale', count: 6 },
    ],
    rewards: { xp: qxp(25), gold: qgold(25), items: [{ itemId: 'mat_enhance_stone_1', qty: 1 }], chooseOne: [{ itemId: 'eq_axe_galewrought' }, { itemId: 'eq_wand_galewrought' }, { itemId: 'eq_gun_galewrought' }, { itemId: 'eq_dagger_galewrought' }] },
  },
  {
    id: 'sq_lanternreef_ghost_letter',
    name: "A Letter Unsent",
    type: 'side',
    giver: 'npc_lamplighter',
    level: 27,
    reqs: [{ type: 'level', min: 26 }],
    summary: "Carry an old letter from the Lamplighter's ghost back to Driftmoor — or don't.",
    offer:
      "The gentle ghost's lantern dims and brightens like a slow heartbeat. \"I wrote this... a very long time ago. Before the water. I never sent it.\" He presses a damp, sealed letter into your hands. \"Would you carry it to Driftmoor for me? Or — you may read it first. I understand if you'd rather not deliver a dead man's love letter to strangers.\"",
    progress: "\"The letter, whenever you pass through Driftmoor. No rush — I've waited this long.\"",
    complete: 'You still have the letter. The choice of what to do with it is entirely yours.',
    objectives: [
      { type: 'collect', itemId: 'qi_ghost_letter', count: 1 },
      { type: 'talk', npcId: 'npc_pim', desc: 'Leave the letter with someone in Driftmoor who might know the family' },
    ],
    onAccept: [{ type: 'giveItem', itemId: 'qi_ghost_letter', qty: 1 }],
    rewards: { xp: qxp(27, 0.15), gold: qgold(27, 6) },
    choices: [
      {
        id: 'letter_deliver',
        label: 'Deliver it, truly',
        description: 'Let Pim quietly track down whoever the letter was meant for.',
        completeText:
          'The Lamplighter\'s glow steadies, just slightly. "Then it\'s said, after all this time. Thank you — that\'s more peace than I expected to find down here."',
        rewards: {
          xp: qxp(27, 0.2),
          gold: qgold(27, 5),
          flags: { lamplighter_letter_delivered: true },
          items: [{ itemId: 'use_elixir_s', qty: 1 }],
        },
      },
      {
        id: 'letter_keep',
        label: 'Let it stay a memory',
        description: 'Some things are gentler left unsaid to the living.',
        completeText:
          '"...Perhaps that\'s wiser," the Lamplighter says softly, though something in his light dims again. "Some ghosts should stay ghosts. Keep the letter, if you like. I\'ve no use for paper anymore."',
        rewards: { xp: qxp(27, 0.15), gold: qgold(27, 12), flags: { lamplighter_letter_delivered: false } },
      },
    ],
  },
  {
    id: 'sq_lanternreef_ghost_peace',
    name: "An Old Ghost's Rest",
    type: 'side',
    giver: 'npc_lamplighter',
    level: 28,
    reqs: [{ type: 'flag', flag: 'lamplighter_letter_delivered', value: true }],
    summary: "Sit with the Lamplighter now that his letter has finally been sent.",
    offer:
      "\"Come sit a while, if you've a moment,\" the Lamplighter says, lantern glowing warm gold instead of its usual pale blue. \"I don't feel the cold quite so much anymore. I'd like to tell you about her, if you'll listen.\"",
    progress: "\"No task this time. Just — thank you for staying.\"",
    complete:
      "The Lamplighter's light settles, calm as still water. \"You've given an old ghost something like rest. That's a rare gift. Take this — I've no need for it, and you've more use for light where you're headed.\"",
    objectives: [{ type: 'talk', npcId: 'npc_lamplighter' }],
    rewards: {
      xp: qxp(28, 0.2),
      gold: qgold(28),
      items: [{ itemId: 'use_hp_potion_l', qty: 2 }],
      title: 'Friend of the Lamplighter',
      chooseOne: [{ itemId: 'eq_sword_galewrought' }, { itemId: 'eq_staff_galewrought' }, { itemId: 'eq_bow_galewrought' }, { itemId: 'eq_amulet_glimmerscale' }],
    },
  },
  {
    id: 'sq_lanternreef_sailors_ring',
    name: "A Ring From the Deep",
    type: 'side',
    giver: 'npc_nell',
    level: 26,
    reqs: [{ type: 'level', min: 25 }],
    summary: 'Decide what to do with a ring recovered from a drowned sailor.',
    offer:
      "Nell holds up a plain gold band, greened by years underwater. \"Pulled this off one of the drowned near the wreck routes. There's a name scratched inside — someone's still wearing black for whoever this was, somewhere in Driftmoor, probably. Your call what happens to it.\"",
    progress: "\"Deal with the drowned near the wreck routes, and the ring's story can finally end one way or another.\"",
    complete: 'The ring is small and plain and somehow the heaviest thing in your pack.',
    objectives: [
      { type: 'kill', monsterId: 'drowned_sailor', count: 6 },
      { type: 'collect', itemId: 'qi_drowned_ring', count: 1 },
    ],
    onAccept: [{ type: 'giveItem', itemId: 'qi_drowned_ring', qty: 1 }],
    rewards: { xp: qxp(26, 0.15), gold: qgold(26, 5) },
    choices: [
      {
        id: 'ring_return',
        label: "Track down the sailor's family",
        description: 'Some closure is worth more than gold.',
        completeText:
          "Word eventually comes back through the harbor grapevine: the ring found its way home. You'll never see the letter of thanks, but you feel the shape of it anyway.",
        rewards: {
          xp: qxp(26, 0.22),
          gold: qgold(26, 4),
          flags: { sailor_ring_returned: true },
          title: 'Bearer of Closure',
        },
      },
      {
        id: 'ring_sell',
        label: 'Sell it to Nell',
        description: 'A ring is a ring, and gold spends the same either way.',
        completeText: 'Nell pays fair price, though she\'s quiet about it after. "Hope whoever he was doesn\'t mind," she mutters, mostly to herself.',
        rewards: { xp: qxp(26, 0.15), gold: qgold(26, 18), flags: { sailor_ring_returned: false } },
      },
    ],
  },
  {
    id: 'sq_lanternreef_coral_bloom',
    name: 'Coral Before the Hollow',
    type: 'side',
    giver: 'npc_nell',
    level: 29,
    reqs: [{ type: 'level', min: 28 }],
    summary: 'Harvest coral chunks before descending into the Hollow.',
    offer:
      "\"Before you head into that whale's guts,\" Nell says, only half joking, \"do me one last favor. Coral golems nearby are dropping some unusually dense chunks — might be useful, might be worth studying. Either way, good excuse to stock up before the Hollow.\"",
    progress: "\"Coral golems, and whatever they're carrying inside that shell.\"",
    complete: '"Good haul. Stay sharp down there, alright? Come back and tell me it was all overblown."',
    objectives: [
      { type: 'kill', monsterId: 'coral_golem', count: 5 },
      { type: 'collect', itemId: 'mat_coral_chunk', count: 6 },
    ],
    rewards: { xp: qxp(29), gold: qgold(29), items: [{ itemId: 'mat_enhance_stone_2', qty: 1 }], chooseOne: [{ itemId: 'eq_sword_coralbright' }, { itemId: 'eq_wand_coralbright' }, { itemId: 'eq_gun_coralbright' }, { itemId: 'eq_knives_coralbright' }] },
  },
  {
    id: 'sq_lanternreef_fennas_warning',
    name: "Fenna's Warning",
    type: 'side',
    giver: 'npc_fenna',
    turnIn: 'npc_nell',
    level: 25,
    reqs: [{ type: 'level', min: 24 }],
    summary: "Carry Fenna's warning from Finreach to Diver Nell in Lanternreef.",
    offer:
      "Fenna scribbles a note in a hurry. \"Traders passing through mentioned trouble out on the reef — wrecks, drownings, more than usual. Nell should know before it gets worse. Would you carry word to her?\"",
    progress: "\"Find Nell out on the reef, whenever you're passing through.\"",
    complete: "Nell reads the note twice, frowning. \"Fenna's not wrong to worry. Thanks for carrying this all this way — means we can get ahead of it, maybe.\"",
    objectives: [{ type: 'talk', npcId: 'npc_nell', desc: "Deliver Fenna's warning" }],
    rewards: { xp: qxp(25, 0.28), gold: qgold(25, 10), items: [{ itemId: 'use_return_scroll', qty: 2 }] },
  },
  {
    id: 'sq_lanternreef_glimmerfish_roe',
    name: 'The Glimmerfish Roe',
    type: 'side',
    giver: 'npc_nell',
    level: 26,
    reqs: [{ type: 'level', min: 25 }],
    summary: 'Decide how much to harvest during the glimmerfish spawning season.',
    offer:
      "\"Spawning season,\" Nell says, watching the shallows glow brighter than usual. \"Glimmerfish roe sells for an obscene amount right now. Also, if we take too much, there might not be a next spawning season. Your call how hard we hit it.\"",
    progress: "\"Glimmerfish, thick in the shallows right now. However many you're comfortable with.\"",
    complete: 'The catch is heavy in your net, glowing faintly. It\'s your call what happens next.',
    objectives: [{ type: 'kill', monsterId: 'glimmerfish', count: 10 }],
    rewards: { xp: qxp(26, 0.2), gold: qgold(26, 8) },
    choices: [
      {
        id: 'roe_harvest',
        label: 'Harvest everything you can',
        description: 'Maximize the catch. The season will recover. Probably.',
        completeText:
          'The haul is enormous, and the coin is better. Nell counts it out without quite meeting your eyes. "Hope there\'s a next season," she mutters.',
        rewards: { xp: qxp(26, 0.15), gold: qgold(26, 25), flags: { glimmerfish_overharvested: true } },
      },
      {
        id: 'roe_sustainable',
        label: 'Take only what the reef can spare',
        description: 'Leave enough for the shallows to recover.',
        completeText: '"Good call," Nell says, quieter than usual. "Divers here for the long haul. Nice to be reminded someone else is too."',
        rewards: {
          xp: qxp(26, 0.2),
          gold: qgold(26, 10),
          flags: { glimmerfish_overharvested: false },
          items: [{ itemId: 'eq_amulet_glimmerscale', qty: 1 }],
          title: 'Reef Steward',
        },
      },
    ],
  },
  {
    id: 'sq_lanternreef_wreckers_bounty',
    name: 'Wreckers on the Reef',
    type: 'side',
    giver: 'npc_nell',
    level: 27,
    reqs: [{ type: 'level', min: 26 }],
    summary: "Investigate whether the reef's drowned are victims of deliberate wrecking.",
    offer:
      "Nell's usual grin is gone. \"Too many wrecks out past the shallows lately, and not from storms. Someone's luring ships onto the reef on purpose — the drowned you'll find are proof enough. Clear the wreck site, and you'll likely find whoever's signaling the ships in.\"",
    progress: "\"The drowned, out past the wreck routes. Careful — there are a lot of them.\"",
    complete: 'Among the wreckage you find a signal lantern, rigged to flash exactly wrong. Someone built this on purpose.',
    objectives: [{ type: 'kill', monsterId: 'drowned_sailor', count: 15 }],
    onAccept: [{ type: 'giveItem', itemId: 'qi_wreckers_signal_lantern', qty: 1 }],
    rewards: { xp: qxp(27, 0.2), gold: qgold(27, 8) },
    choices: [
      {
        id: 'wreckers_expose',
        label: 'Report it to the Outpost',
        description: 'Expose the wrecking scheme and let it be shut down properly.',
        completeText:
          'Word travels fast once the lantern reaches the right hands. Within days, the false signals stop. Nell claps you on the shoulder. "Divers everywhere owe you, even the ones who\'ll never know it."',
        rewards: {
          xp: qxp(27, 0.15),
          gold: qgold(27, 6),
          flags: { wreckers_exposed: true },
          chooseOne: [
            { itemId: 'eq_sword_galewrought' },
            { itemId: 'eq_staff_galewrought' },
            { itemId: 'eq_bow_galewrought' },
            { itemId: 'eq_dagger_galewrought' },
          ],
        },
      },
      {
        id: 'wreckers_quiet',
        label: 'Sell the salvage rights',
        description: 'Someone will pay well to keep salvaging that wreck site quietly.',
        completeText: "The coin is good. The ships will probably keep wrecking, somewhere, eventually. Nell doesn't ask, and you don't offer.",
        rewards: { xp: qxp(27, 0.15), gold: qgold(27, 24), flags: { wreckers_exposed: false } },
      },
    ],
  },
  {
    id: 'sq_lanternreef_wreckers_aftermath',
    name: 'Clearing the Wreck Site',
    type: 'side',
    giver: 'npc_nell',
    level: 28,
    reqs: [{ type: 'flag', flag: 'wreckers_exposed', value: true }],
    summary: 'Finish clearing the wreck site now that the wrecking scheme is exposed.',
    offer:
      "\"Now that word's out, I want that wreck site properly cleared — for the divers' sake, and so nothing else washes up unexpected,\" Nell says.",
    progress: "\"More of the drowned, unfortunately. Nearly done, though.\"",
    complete:
      "\"Site's clear. That's the last of it, I think — or at least, the last of it we can do anything about.\" Nell looks tired, but relieved.",
    objectives: [{ type: 'kill', monsterId: 'drowned_sailor', count: 10 }],
    rewards: {
      xp: qxp(28, 0.3),
      gold: qgold(28, 16),
      items: [{ itemId: 'mat_enhance_stone_2', qty: 1 }],
      chooseOne: [{ itemId: 'eq_armor_coralguard' }, { itemId: 'eq_armor_pearlsilk' }, { itemId: 'eq_armor_glowhide' }],
    },
  },
  {
    id: 'sq_lanternreef_abyss_watch',
    name: 'Watch in the Abyss',
    type: 'side',
    giver: 'npc_nell',
    level: 29,
    reqs: [{ type: 'level', min: 28 }],
    summary: 'Clear aggressive abyss eels from the deeper dive routes before the Hollow.',
    offer:
      "\"Abyss eels have gotten bolder the deeper you go,\" Nell says, checking a lantern's oil level. \"Before you head into the Hollow, help me clear the deep routes. Selfishly, I'd also like my divers to keep all their limbs.\"",
    progress: "\"Abyss eels, in the deeps. Mind the dark down there.\"",
    complete: "\"Routes are clear. You're going to do just fine wherever you're headed next, you know that?\"",
    objectives: [
      { type: 'kill', monsterId: 'abyss_eel', count: 10 },
      { type: 'visit', mapId: 'lantern_deeps' },
    ],
    rewards: {
      xp: qxp(29, 0.3),
      gold: qgold(29, 15),
      chooseOne: [
        { itemId: 'eq_sword_coralbright' },
        { itemId: 'eq_staff_coralbright' },
        { itemId: 'eq_bow_coralbright' },
        { itemId: 'eq_dagger_coralbright' },
      ],
    },
  },
];

// ---------------------------------------------------------------------------
// HOLLOW (levels 29-36)
// ---------------------------------------------------------------------------

const HOLLOW_QUESTS: QuestDef[] = [
  {
    id: 'sq_hollow_first_singers_task',
    name: "The Echo's First Task",
    type: 'side',
    giver: 'npc_first_singer',
    level: 30,
    reqs: [{ type: 'level', min: 29 }],
    summary: "Thin the Blight's first growths inside the Hollow Mouth.",
    offer:
      "The Echo of the First Singer flickers like candlelight underwater. \"You've come far, little wake-walker. The Blight thickens here — slimes and rotten caps choke every passage. Clear a way, and I will guide you further.\"",
    progress: "\"Slime and rot. The Blight's simplest children, but no less hungry.\"",
    complete: '"Well fought. The path opens a little wider." The Echo\'s light steadies around you like a held hand.',
    objectives: [
      { type: 'kill', monsterId: 'blight_slime', count: 8 },
      { type: 'kill', monsterId: 'rot_mushling', count: 6 },
    ],
    rewards: {
      xp: qxp(30),
      gold: qgold(30),
      items: [{ itemId: 'use_hp_potion_xl', qty: 1 }, { itemId: 'mat_enhance_stone_1', qty: 2 }],
      chooseOne: [{ itemId: 'eq_axe_coralbright' }, { itemId: 'eq_staff_coralbright' }, { itemId: 'eq_bow_coralbright' }, { itemId: 'eq_amulet_glimmerscale' }],
    },
  },
  {
    id: 'sq_hollow_wraith_choice',
    name: 'The Trapped Whisper',
    type: 'side',
    giver: 'npc_first_singer',
    level: 33,
    reqs: [{ type: 'level', min: 32 }],
    summary: 'Decide the fate of a whisper wraith trapped in the blighted veins.',
    offer:
      "\"There — do you feel it? A voice caught between song and static.\" The Echo points toward the Veins. \"A whisper wraith, once someone's spirit, now half-consumed. Weaken it, and you may choose: free what remains of them, or bind their voice into something you can carry.\"",
    progress: "\"Weaken the wraiths first. The choice comes after.\"",
    complete: 'The wraiths quiet, one by one, until only the trapped voice remains — waiting on your decision.',
    objectives: [{ type: 'kill', monsterId: 'whisper_wraith', count: 5 }],
    rewards: { xp: qxp(33, 0.15), gold: qgold(33, 5) },
    choices: [
      {
        id: 'wraith_free',
        label: 'Free the trapped spirit',
        description: 'Let whatever is left of them go, unbound.',
        completeText:
          "The wraith's shriek softens into something almost like a sigh, and then nothing at all — just quiet air. The Echo bows their head. \"Mercy costs us nothing we needed to keep.\"",
        rewards: {
          xp: qxp(33, 0.25),
          gold: qgold(33, 4),
          flags: { hollow_spirit_freed: true },
          items: [{ itemId: 'use_elixir_s', qty: 2 }],
        },
      },
      {
        id: 'wraith_bind',
        label: "Bind their voice into a relic",
        description: 'Their suffering becomes useful, at least.',
        completeText:
          "The wraith's scream folds down into a small, cold shard in your palm. It hums faintly, unhappily. The Echo says nothing, but their light dims a shade.",
        rewards: {
          xp: qxp(33, 0.15),
          gold: qgold(33, 10),
          flags: { hollow_spirit_freed: false },
          items: [{ itemId: 'mat_wraith_wisp', qty: 3 }, { itemId: 'mat_enhance_stone_2', qty: 1 }],
        },
      },
    ],
  },
  {
    id: 'sq_hollow_echo_gathering',
    name: "Runes for the Echo",
    type: 'side',
    giver: 'npc_first_singer',
    level: 32,
    reqs: [{ type: 'level', min: 31 }],
    summary: "Collect sentinel runes to strengthen the Echo's song.",
    offer:
      "\"The old sentinels carry runes older than the Blight itself,\" the Echo says. \"If you can pry them loose without waking every guardian on this level, I could use them to strengthen what little song I have left.\"",
    progress: "\"Runes, from the hollow sentinels. Carefully, if you can manage it.\"",
    complete:
      'The Echo turns each rune over like beads on a string, humming something older than words. "Yes. Yes, this helps. Thank you, truly."',
    objectives: [
      { type: 'kill', monsterId: 'hollow_sentinel', count: 6 },
      { type: 'collect', itemId: 'mat_sentinel_rune', count: 5 },
    ],
    rewards: { xp: qxp(32), gold: qgold(32), items: [{ itemId: 'mat_enhance_stone_2', qty: 1 }] },
  },
  {
    id: 'sq_hollow_final_respite',
    name: 'The Final Respite',
    type: 'side',
    giver: 'npc_first_singer',
    level: 35,
    reqs: [{ type: 'level', min: 34 }],
    summary: 'Scout the approach to the Heart of Oma before the end.',
    offer:
      "The Echo's light flickers, dimmer than before. \"We are close now. Too close for comfort, perhaps. Clear the way through the Veins, and look upon the Heart's chamber — just look. Not yet more than that.\"",
    progress: "\"The grubs guard the passage. The Heart waits beyond, regardless.\"",
    complete:
      "\"You've seen it, then. However this ends, wake-walker — I am glad it was you who came this far.\" The Echo's light brightens, just for a moment, like a held breath.",
    objectives: [
      { type: 'kill', monsterId: 'parasite_grub', count: 8 },
      { type: 'visit', mapId: 'heart_chamber' },
    ],
    rewards: {
      xp: qxp(35, 0.25),
      gold: qgold(35),
      items: [{ itemId: 'mat_enhance_stone_3', qty: 1 }, { itemId: 'use_hp_potion_xl', qty: 2 }],
      chooseOne: [{ itemId: 'eq_sword_voidforged' }, { itemId: 'eq_staff_voidforged' }, { itemId: 'eq_gun_voidforged' }, { itemId: 'eq_amulet_bloomthorn' }],
    },
  },
  {
    id: 'sq_hollow_sentinel_vigil',
    name: "The Sentinels' Vigil",
    type: 'side',
    giver: 'npc_first_singer',
    level: 31,
    reqs: [{ type: 'level', min: 30 }],
    summary: "Clear aggressive sentinels and blighted bats from the Veins' outer watch.",
    offer:
      "\"The old sentinels were never meant to be violent,\" the Echo says, sorrowful. \"The Blight has twisted their old purpose into something aggressive. Clear enough of them, along with the bats nesting in their ruins, and the passage will finally be safe to cross.\"",
    progress: "\"Sentinels and bats, both aggressive, both blighted. Take care.\"",
    complete: "\"The passage holds quiet again, for now.\" The Echo's light flickers gratefully.",
    objectives: [
      { type: 'kill', monsterId: 'hollow_sentinel', count: 10 },
      { type: 'kill', monsterId: 'blighted_bat', count: 8 },
    ],
    rewards: {
      xp: qxp(31, 0.3),
      gold: qgold(31, 15),
      items: [{ itemId: 'mat_enhance_stone_2', qty: 1 }],
      chooseOne: [{ itemId: 'eq_armor_coralguard' }, { itemId: 'eq_armor_pearlsilk' }, { itemId: 'eq_armor_glowhide' }],
    },
  },
  {
    id: 'sq_hollow_wraith_containment',
    name: 'Containing the Chorus',
    type: 'side',
    giver: 'npc_first_singer',
    level: 33,
    reqs: [{ type: 'level', min: 32 }],
    summary: "Contain the whisper wraiths' spreading chorus before it grows further.",
    offer:
      "\"The chorus grows louder every day,\" the Echo says, uneasy. \"More wraiths join it than fade from it. If we don't thin them, they'll spread through the whole of the Veins before long.\"",
    progress: "\"Wraiths, as many as you can manage. Slow the spread, if nothing else.\"",
    complete: '"That should hold them back a while longer." The Echo does not sound entirely certain, but sounds grateful all the same.',
    objectives: [{ type: 'kill', monsterId: 'whisper_wraith', count: 15 }],
    rewards: {
      xp: qxp(33, 0.3),
      gold: qgold(33, 15),
      items: [{ itemId: 'mat_enhance_stone_2', qty: 1 }],
      chooseOne: [
        { itemId: 'eq_sword_voidforged' },
        { itemId: 'eq_staff_voidforged' },
        { itemId: 'eq_bow_voidforged' },
        { itemId: 'eq_dagger_voidforged' },
      ],
    },
  },
  {
    id: 'sq_hollow_chorus_of_whispers',
    name: 'The Chorus of Whispers',
    type: 'side',
    giver: 'npc_first_singer',
    level: 34,
    reqs: [{ type: 'level', min: 33 }],
    summary: 'Quiet the wraiths\' collective chorus in the Blighted Veins — or let them keep singing.',
    offer:
      "\"Do you hear it? Not one voice — many, tangled together,\" the Echo says, listening to something you can barely perceive. \"The whisper wraiths sing as a chorus down here, mourning in unison. Weaken enough of them, and I can perform a rite to still it. Or... we could simply let grief be grief, and leave them be.\"",
    progress: "\"The chorus, wherever the wraiths gather thickest.\"",
    complete: 'The chorus falters, thinned but not yet silent. The choice of what comes next is still yours.',
    objectives: [{ type: 'kill', monsterId: 'whisper_wraith', count: 20 }],
    rewards: { xp: qxp(34, 0.2), gold: qgold(34, 10) },
    choices: [
      {
        id: 'chorus_silence',
        label: 'Perform the silencing rite',
        description: 'Quiet the chorus for good. Cleaner. Colder, maybe.',
        completeText:
          'The Echo sings a single, sharp note, and the chorus folds into silence all at once. The quiet that follows feels less like peace and more like absence. "It is done," the Echo says, and says nothing else for a while.',
        rewards: {
          xp: qxp(34, 0.3),
          gold: qgold(34, 12),
          flags: { hollow_chorus_silenced: true },
          chooseOne: [
            { itemId: 'eq_sword_voidforged' },
            { itemId: 'eq_staff_voidforged' },
            { itemId: 'eq_bow_voidforged' },
            { itemId: 'eq_dagger_voidforged' },
          ],
        },
      },
      {
        id: 'chorus_leave',
        label: 'Let them keep singing',
        description: 'Grief deserves to be heard, even in the dark.',
        completeText:
          'The Echo simply nods, and the chorus drifts on behind you, mournful and unresolved. "Perhaps that is kinder," the Echo says. "Not every wound needs closing by our hand."',
        rewards: { xp: qxp(34, 0.3), gold: qgold(34, 8), flags: { hollow_chorus_silenced: false }, items: [{ itemId: 'eq_ring_blightglass', qty: 1 }] },
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// DAILY / REPEATABLE (bounty board style)
// ---------------------------------------------------------------------------

const DAILY_QUESTS: QuestDef[] = [
  {
    id: 'dq_meadow_bounty',
    name: 'Bounty: Meadow Pests',
    type: 'daily',
    giver: 'npc_pim',
    level: 3,
    reqs: [{ type: 'level', min: 2 }],
    summary: 'Thin the meadow pest population for the bounty board.',
    offer: "A hand-scrawled notice pinned by Pim's counter: \"WANTED: fewer puffmoss, fewer shellsnails. Ask inside for details (and coin).\"",
    progress: '"Meadow pests, same as the board says."',
    complete: '"Board says done, coin says done. Pleasure doing business."',
    objectives: [
      { type: 'kill', monsterId: 'puffmoss', count: 10 },
      { type: 'kill', monsterId: 'shellsnail', count: 10 },
    ],
    rewards: { xp: qxp(3, 0.15), gold: qgold(3, 10) },
    repeatable: { cooldownMs: 2 * 3600 * 1000 },
  },
  {
    id: 'dq_grotto_bounty',
    name: 'Bounty: Grotto Cleanup',
    type: 'daily',
    giver: 'npc_pim',
    level: 8,
    reqs: [{ type: 'level', min: 7 }],
    summary: 'Grotto pest control for the bounty board.',
    offer: '"Bats and crabs, grotto-side. Same deal as always — clear the count, collect the coin."',
    progress: '"Bats and crabs. You know the drill."',
    complete: '"Another clean sweep. The board thanks you. So do I."',
    objectives: [
      { type: 'kill', monsterId: 'barnacle_bat', count: 10 },
      { type: 'kill', monsterId: 'grotto_crab', count: 8 },
    ],
    rewards: { xp: qxp(8, 0.15), gold: qgold(8, 12), items: [{ itemId: 'use_hp_potion_s', qty: 2 }] },
    repeatable: { cooldownMs: 4 * 3600 * 1000 },
  },
  {
    id: 'dq_kelpwood_bounty',
    name: 'Bounty: Kelp Bed Clearing',
    type: 'daily',
    giver: 'npc_fenna',
    level: 14,
    reqs: [{ type: 'level', min: 13 }],
    summary: 'Standing bounty on tanglevines and driftfin eels.',
    offer: '"Same request, different day," Fenna says. "Kelp beds need thinning, always. Standing offer, standing pay."',
    progress: '"Tanglevines and eels. You know where to find them by now."',
    complete: '"The kelp breathes a little easier. Until tomorrow, probably."',
    objectives: [
      { type: 'kill', monsterId: 'tanglevine', count: 8 },
      { type: 'kill', monsterId: 'driftfin_eel', count: 8 },
    ],
    rewards: { xp: qxp(14, 0.15), gold: qgold(14, 14), items: [{ itemId: 'mat_enhance_stone_1', qty: 1 }] },
    repeatable: { cooldownMs: 6 * 3600 * 1000 },
  },
  {
    id: 'dq_storm_bounty',
    name: 'Bounty: Storm Watch',
    type: 'daily',
    giver: 'npc_quill',
    level: 19,
    reqs: [{ type: 'level', min: 18 }],
    summary: 'Standing bounty on stormhawks and thunder beetles.',
    offer:
      '"Standing bounty, standing pay," Quill says, sliding a ledger across the counter. "Stormhawks and thunder beetles keep spooking the trade caravans. Handle it, get paid, repeat as needed."',
    progress: '"Same targets as always. The sky doesn\'t run out of them."',
    complete: '"Ledger\'s balanced. Come back whenever you\'re bored — or broke."',
    objectives: [
      { type: 'kill', monsterId: 'stormhawk', count: 10 },
      { type: 'kill', monsterId: 'thunder_beetle', count: 8 },
    ],
    rewards: { xp: qxp(19, 0.15), gold: qgold(19, 15), items: [{ itemId: 'mat_enhance_stone_1', qty: 1 }] },
    repeatable: { cooldownMs: 8 * 3600 * 1000 },
  },
  {
    id: 'dq_reef_bounty',
    name: 'Bounty: Reef Patrol',
    type: 'daily',
    giver: 'npc_nell',
    level: 25,
    reqs: [{ type: 'level', min: 24 }],
    summary: 'Standing bounty on reef crabs and abyss eels.',
    offer: '"Standing offer for standing pests," Nell says with a grin. "Reef crabs and abyss eels, same as ever. Divers will thank you, even if they never meet you."',
    progress: '"Same reef, same trouble. Business as usual."',
    complete: '"Routes are clear. Divers can breathe easy — well, figuratively."',
    objectives: [
      { type: 'kill', monsterId: 'reef_crab', count: 10 },
      { type: 'kill', monsterId: 'abyss_eel', count: 6 },
    ],
    rewards: { xp: qxp(25, 0.15), gold: qgold(25, 16), items: [{ itemId: 'mat_enhance_stone_2', qty: 1 }] },
    repeatable: { cooldownMs: 12 * 3600 * 1000 },
  },
  {
    id: 'dq_hollow_bounty',
    name: 'Bounty: Push Back the Blight',
    type: 'daily',
    giver: 'npc_first_singer',
    level: 31,
    reqs: [{ type: 'level', min: 30 }],
    summary: "Standing task: thin the Blight's crawling children.",
    offer:
      '"The Blight regrows faster than song can hold it back," the Echo says, weary but steady. "Thin its crawling children when you\'re able. It will need doing again. And again, likely."',
    progress: '"Grubs and sentinels. The Blight does not tire, so neither can we."',
    complete: '"Held back, for now. That is all any of us can promise down here."',
    objectives: [
      { type: 'kill', monsterId: 'parasite_grub', count: 10 },
      { type: 'kill', monsterId: 'hollow_sentinel', count: 6 },
    ],
    rewards: { xp: qxp(31, 0.15), gold: qgold(31, 18), items: [{ itemId: 'mat_enhance_stone_2', qty: 1 }] },
    repeatable: { cooldownMs: 20 * 3600 * 1000 },
  },
  {
    id: 'dq_hollow_whispers_bounty',
    name: 'Bounty: Silence the Chorus',
    type: 'daily',
    giver: 'npc_first_singer',
    level: 33,
    reqs: [{ type: 'level', min: 32 }],
    summary: 'Standing task: thin whisper wraiths and blighted bats in the Veins.',
    offer:
      '"The chorus never truly stops growing," the Echo says. "Wraiths and bats both, thicker in the Veins than anywhere else. A standing task, I\'m afraid — there\'s no clearing it for good."',
    progress: '"Wraiths and bats. The usual, unfortunately."',
    complete: '"Quieter, for now. Thank you — truly, every time."',
    objectives: [
      { type: 'kill', monsterId: 'whisper_wraith', count: 10 },
      { type: 'kill', monsterId: 'blighted_bat', count: 8 },
    ],
    rewards: { xp: qxp(33, 0.15), gold: qgold(33, 18), items: [{ itemId: 'mat_enhance_stone_2', qty: 1 }] },
    repeatable: { cooldownMs: 20 * 3600 * 1000 },
  },
  {
    id: 'dq_hollow_foraging_bounty',
    name: 'Bounty: Blightthorn Bloom',
    type: 'daily',
    giver: 'npc_rook_prospector',
    level: 33,
    reqs: [{ type: 'level', min: 31 }, { type: 'profession', professionId: 'foraging', minLevel: 9 }],
    summary: 'Standing task: gather blightthorn from the deep Hollow for Dusty Fen.',
    offer:
      "\"Blightthorn's the strangest thing I've ever asked anyone to pick for me,\" Dusty Fen admits. \"Dangerous ground for it, too. Standing order, if you're brave enough to keep making the trip.\"",
    progress: '"Blightthorn, from wherever it\'s still blooming down there."',
    complete: '"Every bit as unsettling as the last batch. Much obliged."',
    objectives: [{ type: 'gather', nodeId: 'node_blightthorn', count: 6 }],
    rewards: { xp: qxp(33, 0.15), gold: qgold(33, 18), items: [{ itemId: 'mat_enhance_stone_2', qty: 1 }] },
    repeatable: { cooldownMs: 20 * 3600 * 1000 },
  },
  {
    id: 'dq_prospectors_ore_bounty',
    name: "Bounty: Fresh Ore",
    type: 'daily',
    giver: 'npc_rook_prospector',
    level: 5,
    reqs: [{ type: 'level', min: 3 }],
    summary: 'Standing task: bring Dusty Fen a fresh batch of ore.',
    offer:
      "\"Always short on ore, never short on customers,\" Dusty Fen grumbles cheerfully. \"Bring me a fresh haul, whatever vein you can reach, and I'll make it worth the swing of your pick.\"",
    progress: '"Ore, from wherever you\'re digging these days."',
    complete: '"Good haul. Come back whenever your pack\'s got room for more."',
    objectives: [{ type: 'gather', professionId: 'mining', count: 10 }],
    rewards: { xp: qxp(5, 0.15), gold: qgold(5, 12), items: [{ itemId: 'mat_enhance_stone_1', qty: 1 }] },
    repeatable: { cooldownMs: 20 * 3600 * 1000 },
  },
  {
    id: 'dq_prospectors_herb_bounty',
    name: 'Bounty: Fresh Herbs',
    type: 'daily',
    giver: 'npc_rook_prospector',
    level: 5,
    reqs: [{ type: 'level', min: 3 }],
    summary: 'Standing task: bring Dusty Fen a fresh batch of herbs.',
    offer: '"Herbs go stale in my pack faster than you\'d think," Fen says. "Standing order, if you\'re passing through anywhere green — or kelpy, or coral, doesn\'t much matter."',
    progress: '"Herbs, whatever\'s growing where you are."',
    complete: '"That\'ll do nicely. Foraging\'s a patient trade — glad someone else has the patience for it today."',
    objectives: [{ type: 'gather', professionId: 'foraging', count: 10 }],
    rewards: { xp: qxp(5, 0.15), gold: qgold(5, 12), items: [{ itemId: 'mat_enhance_stone_1', qty: 1 }] },
    repeatable: { cooldownMs: 20 * 3600 * 1000 },
  },
];

export const SIDE_QUESTS: QuestDef[] = [
  ...DRIFTMOOR_QUESTS,
  ...FINREACH_QUESTS,
  ...STORMBREAK_QUESTS,
  ...LANTERNREEF_QUESTS,
  ...HOLLOW_QUESTS,
  ...DAILY_QUESTS,
];
