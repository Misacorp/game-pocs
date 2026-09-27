import type { DialogueDef } from '../../types';

/**
 * Town NPC dialogue trees owned by the side-quest agent.
 * Shop / crafting / quest-offer / quest-turn-in buttons are added
 * automatically by the UI — these trees only hold personality, lore,
 * tips branches, and (for Tamsin and Wren) the special actions the
 * task brief calls for.
 */
export const TOWN_DIALOGUES: DialogueDef[] = [
  {
    id: 'dlg_brina',
    start: 'greeting',
    nodes: {
      greeting: {
        text: 'Brina wipes soot from her hands and nods toward you. "Need something forged, enhanced, or are you just here to admire the fire?"',
        options: [
          { text: 'How does smithing work?', next: 'smithing_info' },
          { text: 'How does enhancing gear work?', next: 'enhance_info' },
          { text: 'Any tips for someone just starting out?', next: 'tips' },
        ],
      },
      smithing_info: {
        text: '"Ore in, ingots out, ingots into gear. Mine or buy your ore, smelt it, then craft. Every region\'s ore makes stronger ingots than the last — copper, iron, stormsteel, coralite, voidstone, in that order. Recipes come as you level the trade, mostly automatic."',
      },
      enhance_info: {
        text: '"Enhancement stones add stars to your gear — more stars, more stats. Higher stars risk a failure, and past a point, failure knocks a star back off. Never destroys the item, just... humbles it. Start small."',
      },
      tips: {
        text: '"Don\'t dump every coin into the first sword you see. Save for something with room to grow — stars add up fast on a good base."',
      },
    },
  },
  {
    id: 'dlg_juniper',
    start: 'greeting',
    nodes: {
      greeting: {
        text: '"Oh! Hello. Are you here for potions, or for the... talking part? I do love the talking part."',
        options: [
          { text: 'What does alchemy make?', next: 'alchemy_info' },
          { text: 'Where do I find good herbs?', next: 'herb_tips' },
          { text: 'Got any advice?', next: 'advice' },
        ],
      },
      alchemy_info: {
        text: '"Potions, elixirs, tonics — anything brewed from herbs and, well, the occasional monster part. HP and MP potions are the bread and butter, but elixirs give a proper thirty-minute boost. Very popular before a boss fight."',
      },
      herb_tips: {
        text: '"Meadow herb and dewcap are everywhere in the meadows and hills — can\'t miss them if you\'re foraging. Kelp leaf and sporecap out in Finreach, windbloom once you\'re up in the storms. Each region grows stronger stock."',
      },
      advice: {
        text: '"Never taste-test your own experiments. I learned that one the hard way. Several times."',
      },
    },
  },
  {
    id: 'dlg_tobbin',
    start: 'greeting',
    nodes: {
      greeting: {
        text: '"Hungry? Course you are. Everyone\'s hungry. Sit, sit — or don\'t, I\'ll pack it to go."',
        options: [
          { text: 'What does cooking do?', next: 'cooking_info' },
          { text: 'What ingredients do I need?', next: 'ingredient_tips' },
          { text: 'Got a favorite recipe?', next: 'favorite' },
        ],
      },
      cooking_info: {
        text: '"Good food gives you a proper buff — extra experience, better drops, faster healing, quicker feet, depending what you cook. One food buff at a time, though, so choose wisely before a big fight."',
      },
      ingredient_tips: {
        text: '"Meat and fish from whatever you\'re hunting, herbs from whoever\'s foraging — mushrooms too, don\'t turn your nose up at mushrooms. Every region\'s got its own flavor, if you\'ll forgive the pun. I won\'t stop making it."',
      },
      favorite: {
        text: '"Boar stew, hands down. Simple, hearty, and it doesn\'t judge you for eating three bowls."',
      },
    },
  },
  {
    id: 'dlg_sera',
    start: 'greeting',
    nodes: {
      greeting: {
        text: '"Ah, a visitor. Sit, if you like — good light in here for admiring things."',
        options: [
          { text: 'What does jewelcrafting make?', next: 'jewel_info' },
          { text: 'Where do gems come from?', next: 'gem_tips' },
          { text: "What's the appeal of enhancement stones?", next: 'stone_tips' },
        ],
      },
      jewel_info: {
        text: '"Rings and amulets, mostly — the finest accessories in Driftwake don\'t come from monsters, they come from a steady hand and a good crystal. I also polish gems and cut the higher enhancement stones, when I\'ve the materials."',
      },
      gem_tips: {
        text: '"Quartz and amber close to home, sky crystal once you\'ve climbed to the storms, pearls out on the reef, heart crystal deep in... well, you\'ll know it when you find it. Mining, mostly, though some wash up with the tide."',
      },
      stone_tips: {
        text: '"Smithing makes the early stones. I cut the finer ones — jewelcrafting handles the higher tiers once ordinary stone won\'t cut it anymore, if you\'ll pardon the phrase."',
      },
    },
  },
  {
    id: 'dlg_rook_prospector',
    start: 'greeting',
    nodes: {
      greeting: {
        text: '"Dusty Fen, prospector, at your service — or thereabouts. Digging, digging, always digging. What can I do for you?"',
        options: [
          { text: 'Any gathering tips?', next: 'gather_tips' },
          { text: 'Where should I look for ore?', next: 'ore_tips' },
          { text: 'Where should I look for herbs?', next: 'herb_tips2' },
        ],
      },
      gather_tips: {
        text: '"Every node respawns eventually, so don\'t be shy about clearing one out. Higher-tier nodes need a higher gathering level — no shortcuts, just time and callouses."',
      },
      ore_tips: {
        text: "\"Copper's everywhere near town. Iron in the grotto. Stormsteel once you're up in the clouds proper. Coralite out on the reef, and voidstone... well, you'll know you've gone deep enough when you find it.\"",
      },
      herb_tips2: {
        text: '"Meadow herb and dewcap close to home, kelp leaf and sporecap out past the harbor, windbloom in the storms, glow coral and lantern moss on the reef, blightthorn if you\'re brave enough for the Hollow."',
      },
    },
  },
  {
    id: 'dlg_pim',
    start: 'greeting',
    nodes: {
      greeting: {
        text: "\"Welcome, welcome! Potions, scrolls, odds and ends — if I don't have it, you probably don't need it. Probably.\"",
        options: [
          { text: 'What does a return scroll do?', next: 'scroll_info' },
          { text: 'Any town gossip?', next: 'gossip' },
          { text: 'Tips for a new adventurer?', next: 'tips2' },
        ],
      },
      scroll_info: {
        text: '"Use a return scroll and you\'re whisked straight back to the last town you visited. Cheap, reliable, and a lot less embarrassing than walking back from wherever you died."',
      },
      gossip: {
        text: '"Between you and me, the ground\'s been shaking more than usual lately. Old Pell says it\'s nothing. Old Pell says a lot of things are nothing."',
      },
      tips2: {
        text: "\"Always keep a potion or two on your hotbar. I've sold a lot of potions to people who wished they had one five minutes earlier.\"",
      },
    },
  },
  {
    id: 'dlg_wren',
    start: 'greeting',
    nodes: {
      greeting: {
        text: '"Hi! Are you doing anything right now? Do you want to see a bug I found? It\'s a good bug."',
        options: [
          { text: 'Ask about the bug', next: 'bug_node' },
          { text: 'Ask what Wren does for fun', next: 'fun_node' },
          {
            text: '(Wren suddenly brightens, remembering something)',
            conditions: [
              { type: 'flag', flag: 'wren_full_return', value: true },
              { type: 'flag', flag: 'wren_gift_given', not: true },
            ],
            next: 'gift_node',
            actions: [
              { type: 'giveItem', itemId: 'use_hp_potion_s', qty: 3 },
              { type: 'setFlag', flag: 'wren_gift_given', value: true },
            ],
          },
        ],
      },
      bug_node: {
        text: 'Wren produces a very unimpressed-looking beetle from her pocket. "His name is Gerald. He\'s very brave."',
      },
      fun_node: {
        text: '"I collect shells, and feathers, and shiny rocks, and sometimes bugs. Mom says my room is \'a hazard.\' I think it\'s a museum."',
      },
      gift_node: {
        text: '"Here! I saved these from Pim\'s shop, for getting my kite back. You\'re the best big-kid friend I have."',
      },
    },
  },
  {
    id: 'dlg_ferry_tamsin',
    start: 'greeting',
    nodes: {
      greeting: {
        text: '"Skyferry\'s ready whenever you are! Winds are fair today — where are you headed?"',
        options: [
          { text: 'Tell me about the skyferry', next: 'ferry_info' },
          {
            text: 'Take me to Driftmoor',
            next: 'travel_done',
            actions: [{ type: 'teleport', mapId: 'driftmoor_town', cost: 0 }],
          },
          {
            text: 'Take me to Gale Outpost',
            next: 'travel_done',
            conditions: [{ type: 'quest', questId: 'mq_11_updraft', state: 'completed' }],
            actions: [{ type: 'teleport', mapId: 'gale_outpost', cost: 60 }],
          },
          {
            text: 'Take me to Glowtide Shallows',
            next: 'travel_done',
            conditions: [{ type: 'quest', questId: 'mq_13_glowtide', state: 'completed' }],
            actions: [{ type: 'teleport', mapId: 'glowtide_shallows', cost: 100 }],
          },
        ],
      },
      ferry_info: {
        text: '"Been flying this route for near twenty years. Started with my mother\'s old gondola, patched more times than I can count. She still flies true, though — mostly."',
      },
      travel_done: {
        text: '"Hold onto your hat!" The gondola lurches into the wind.',
      },
    },
  },
  {
    id: 'dlg_quill',
    start: 'greeting',
    nodes: {
      greeting: {
        text: '"Well well, a paying customer — or at least, someone who looks like they might be. What can I sell you? Or from you?"',
        options: [
          { text: 'Any trading tips?', next: 'trade_tips' },
          { text: "What's the deal with sky raiders?", next: 'raider_gossip' },
          { text: 'Anything I should know about the outpost?', next: 'outpost_tips' },
        ],
      },
      trade_tips: {
        text: '"Buy low, sell high, and never let anyone see you flinch at a price. Works in trading, works in life."',
      },
      raider_gossip: {
        text: '"Sky raiders used to just harass caravans. Lately they\'re after specific things — poached goods, mostly. Ugly business. I try to stay two steps removed from it, morally speaking."',
      },
      outpost_tips: {
        text: '"Storms roll in fast up here. If the wind changes color, get indoors. I mean that literally — the wind actually changes color before the bad ones."',
      },
    },
  },
];
