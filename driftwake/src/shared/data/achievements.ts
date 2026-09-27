/**
 * Achievement registry. Conditions are cheap and data-driven (see logic/achievements.ts, which
 * evaluates them against CharacterState after every successful reducer action).
 */
import type { AchievementDef } from '../types';

export const ACHIEVEMENT_LIST: AchievementDef[] = [
  // ---------------------------------------------------------------- Combat
  {
    id: 'ach_kills_100', name: 'Pest Control', description: 'Defeat 100 monsters.',
    category: 'combat', icon: { shape: 'slash', colors: ['#e8e8e8'] },
    condition: { type: 'kills', count: 100 }, reward: { gold: 100 },
  },
  {
    id: 'ach_kills_1000', name: 'Seasoned Adventurer', description: 'Defeat 1,000 monsters.',
    category: 'combat', icon: { shape: 'slash', colors: ['#5aa9ff'] },
    condition: { type: 'kills', count: 1000 }, reward: { gold: 500, title: 'Monster Hunter' },
  },
  {
    id: 'ach_kills_5000', name: "Whale-Back Legend", description: 'Defeat 5,000 monsters.',
    category: 'combat', icon: { shape: 'slash', colors: ['#ffb238'] },
    condition: { type: 'kills', count: 5000 }, reward: { gold: 2000, title: 'Legend of Oma' },
  },
  {
    id: 'ach_level_10', name: 'Growing Pains', description: 'Reach level 10.',
    category: 'combat', icon: { shape: 'star', colors: ['#6fdc6f'] },
    condition: { type: 'level', level: 10 }, reward: { gold: 50 },
  },
  {
    id: 'ach_level_20', name: 'Coming Into Your Own', description: 'Reach level 20.',
    category: 'combat', icon: { shape: 'star', colors: ['#5aa9ff'] },
    condition: { type: 'level', level: 20 }, reward: { gold: 150 },
  },
  {
    id: 'ach_level_30', name: 'Storm-Tested', description: 'Reach level 30.',
    category: 'combat', icon: { shape: 'star', colors: ['#c77dff'] },
    condition: { type: 'level', level: 30 }, reward: { gold: 400 },
  },
  {
    id: 'ach_level_40', name: 'Voice of the Deep', description: 'Reach the level cap, 40.',
    category: 'combat', icon: { shape: 'star', colors: ['#ffb238'] },
    condition: { type: 'level', level: 40 }, reward: { gold: 1000, title: 'Whale-Marked' },
  },
  {
    id: 'ach_boss_king_barnacle', name: 'Crack the Shell', description: 'Defeat King Barnacle.',
    category: 'combat', icon: { shape: 'shield', colors: ['#dd8855'] },
    condition: { type: 'bossKill', monsterId: 'king_barnacle' }, reward: { gold: 80 },
  },
  {
    id: 'ach_boss_old_tangle', name: 'Untangled', description: 'Defeat Old Tangle.',
    category: 'combat', icon: { shape: 'flame', colors: ['#7aa64a' ] },
    condition: { type: 'bossKill', monsterId: 'old_tangle' }, reward: { gold: 150 },
  },
  {
    id: 'ach_boss_kraelith', name: 'Stormbreaker', description: "Defeat Kraelith, the Storm Roc.",
    category: 'combat', icon: { shape: 'bolt', colors: ['#f0d060'] },
    condition: { type: 'bossKill', monsterId: 'kraelith' }, reward: { gold: 300 },
  },
  {
    id: 'ach_boss_captain_rook', name: "The Ghost Ship's End", description: 'Defeat Captain Vashti Rook.',
    category: 'combat', icon: { shape: 'skull', colors: ['#5adfff'] },
    condition: { type: 'bossKill', monsterId: 'captain_rook' }, reward: { gold: 450 },
  },
  {
    id: 'ach_boss_blight_heart', name: 'Heartbreaker', description: 'Defeat the Blight Heart.',
    category: 'combat', icon: { shape: 'heart', colors: ['#ff2f4f'] },
    condition: { type: 'bossKill', monsterId: 'blight_heart' }, reward: { gold: 800, title: 'Heart-Render' },
  },

  // ---------------------------------------------------------------- Exploration
  {
    id: 'ach_explore_driftmoor', name: 'Know Your Backyard', description: 'Discover every map in Driftmoor.',
    category: 'exploration', icon: { shape: 'trap', colors: ['#7aa64a'] },
    condition: { type: 'exploreRegion', region: 'driftmoor' }, reward: { gold: 40 },
  },
  {
    id: 'ach_explore_finreach', name: 'Kelp and Currents', description: 'Discover every map in Finreach.',
    category: 'exploration', icon: { shape: 'wave', colors: ['#4fd8c4'] },
    condition: { type: 'exploreRegion', region: 'finreach' }, reward: { gold: 60 },
  },
  {
    id: 'ach_explore_stormbreak', name: 'Eye of the Storm', description: 'Discover every map in Stormbreak.',
    category: 'exploration', icon: { shape: 'wind', colors: ['#cfe0ee'] },
    condition: { type: 'exploreRegion', region: 'stormbreak' }, reward: { gold: 90 },
  },
  {
    id: 'ach_explore_lanternreef', name: 'Bioluminescence', description: 'Discover every map in Lanternreef.',
    category: 'exploration', icon: { shape: 'orb', colors: ['#5adfff'] },
    condition: { type: 'exploreRegion', region: 'lanternreef' }, reward: { gold: 120 },
  },
  {
    id: 'ach_explore_hollow', name: 'Into the Hollow', description: 'Discover every map in the Hollow.',
    category: 'exploration', icon: { shape: 'eye', colors: ['#c85bff'] },
    condition: { type: 'exploreRegion', region: 'hollow' }, reward: { gold: 150 },
  },
  {
    id: 'ach_explore_all', name: 'Cartographer of Oma', description: 'Discover all 18 maps on the whale\'s back.',
    category: 'exploration', icon: { shape: 'star', colors: ['#ffe066'] },
    condition: { type: 'exploreAll' }, reward: { gold: 300, title: 'Cartographer' },
  },

  // ---------------------------------------------------------------- Professions
  {
    id: 'ach_prof_level5', name: 'Getting the Hang of It', description: 'Reach level 5 in any profession.',
    category: 'professions', icon: { shape: 'orb', colors: ['#e8c477'] },
    condition: { type: 'professionLevel', level: 5 }, reward: { gold: 60 },
  },
  {
    id: 'ach_prof_level10', name: 'Master of the Craft', description: 'Reach level 10 (max) in any profession.',
    category: 'professions', icon: { shape: 'orb', colors: ['#ffb238'] },
    condition: { type: 'professionLevel', level: 10 }, reward: { gold: 300, title: 'Master Crafter' },
  },
  {
    id: 'ach_craft_50', name: 'Assembly Line', description: 'Craft 50 items.',
    category: 'professions', icon: { shape: 'flame', colors: ['#ff9a52'] },
    condition: { type: 'crafted', count: 50 }, reward: { gold: 150 },
  },
  {
    id: 'ach_gather_200', name: 'Hands in the Dirt', description: 'Gather from nodes 200 times.',
    category: 'professions', icon: { shape: 'leaf', colors: ['#7aa64a'] },
    condition: { type: 'gathered', count: 200 }, reward: { gold: 150 },
  },
  {
    id: 'ach_enhance_5', name: 'Sharpened Edge', description: 'Enhance an item to +5 stars.',
    category: 'professions', icon: { shape: 'rune', colors: ['#5aa9ff'] },
    condition: { type: 'enhanceStars', stars: 5 }, reward: { gold: 100 },
  },
  {
    id: 'ach_enhance_10', name: 'Peak Enhancement', description: 'Enhance an item to +10 stars.',
    category: 'professions', icon: { shape: 'rune', colors: ['#c77dff'] },
    condition: { type: 'enhanceStars', stars: 10 }, reward: { gold: 500, title: 'Star-Forged' },
  },

  // ---------------------------------------------------------------- Quests
  {
    id: 'ach_main_story', name: "The Whale Remembers", description: 'Complete the main story.',
    category: 'quests', icon: { shape: 'moon', colors: ['#ffe066'] },
    condition: { type: 'questCompleted', questId: 'mq_19_heart' }, reward: { gold: 500 },
  },
  {
    id: 'ach_side_10', name: 'Helping Hand', description: 'Complete 10 side quests.',
    category: 'quests', icon: { shape: 'feather', colors: ['#a7b0c4'] },
    condition: { type: 'sideQuestCount', count: 10 }, reward: { gold: 60 },
  },
  {
    id: 'ach_side_25', name: 'Errand Runner', description: 'Complete 25 side quests.',
    category: 'quests', icon: { shape: 'feather', colors: ['#5aa9ff'] },
    condition: { type: 'sideQuestCount', count: 25 }, reward: { gold: 200 },
  },
  {
    id: 'ach_side_all', name: 'Everyone\'s Favorite', description: 'Complete every side quest.',
    category: 'quests', icon: { shape: 'feather', colors: ['#ffb238'] },
    condition: { type: 'allSideQuests' }, reward: { gold: 500, title: 'Friend to All' },
  },
  {
    id: 'ach_ending_harvest', name: 'Emberlord', description: 'End the story by harvesting the Ember.',
    category: 'quests', icon: { shape: 'flame', colors: ['#ff5544'] }, hidden: true,
    condition: { type: 'flag', flag: 'ending', value: 'harvest' }, reward: { gold: 200 },
  },
  {
    id: 'ach_ending_purify', name: 'Whale-Healer', description: 'End the story by purifying the Blight.',
    category: 'quests', icon: { shape: 'heart', colors: ['#6fdc6f'] }, hidden: true,
    condition: { type: 'flag', flag: 'ending', value: 'purify' }, reward: { gold: 200 },
  },
  {
    id: 'ach_ending_song', name: 'Songbound', description: 'End the story by singing together with Oma.',
    category: 'quests', icon: { shape: 'moon', colors: ['#c77dff'] }, hidden: true,
    condition: { type: 'flag', flag: 'ending', value: 'song' }, reward: { gold: 300 },
  },

  // ---------------------------------------------------------------- Collection
  {
    id: 'ach_bestiary_10', name: 'Field Notes', description: 'Encounter 10 different monster species.',
    category: 'collection', icon: { shape: 'eye', colors: ['#a7b0c4'] },
    condition: { type: 'bestiaryCount', count: 10 }, reward: { gold: 40 },
  },
  {
    id: 'ach_bestiary_25', name: 'Naturalist', description: 'Encounter 25 different monster species.',
    category: 'collection', icon: { shape: 'eye', colors: ['#5aa9ff'] },
    condition: { type: 'bestiaryCount', count: 25 }, reward: { gold: 120 },
  },
  {
    id: 'ach_bestiary_all', name: 'Complete Bestiary', description: 'Encounter every monster species on Oma\'s back.',
    category: 'collection', icon: { shape: 'eye', colors: ['#ffb238'] },
    condition: { type: 'allBestiary' }, reward: { gold: 400, title: 'Whale-Naturalist' },
  },

  // ---------------------------------------------------------------- Economy
  {
    id: 'ach_gold_10k', name: 'Modest Fortune', description: 'Earn 10,000 gold in total.',
    category: 'economy', icon: { shape: 'coin', colors: ['#ffd24a'] },
    condition: { type: 'goldEarned', amount: 10_000 }, reward: { gold: 200 },
  },

  // ---------------------------------------------------------------- Social
  {
    id: 'ach_petting_zoo', name: 'Petting Zoo', description: 'Own 3 different companion pets at once.',
    category: 'social', icon: { shape: 'heart', colors: ['#ff9ac1'] },
    condition: { type: 'petsOwned', count: 3 }, reward: { gold: 150 },
  },
];
