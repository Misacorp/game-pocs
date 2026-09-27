import type { ProfessionDef } from '../types';
import { PROFESSION_MAX_LEVEL } from '../constants';

export const PROFESSION_LIST: ProfessionDef[] = [
  {
    id: 'mining',
    name: 'Mining',
    kind: 'gathering',
    description: 'Swing a pick at ore veins and crystal nodes scattered across every region, from meadow copper seams to voidstone in the Hollow.',
    benefit: 'Feeds Smithing (ingots) and Jewelcrafting (cut gems). Every character can gather regardless of chosen crafting professions, so a stray node is never wasted.',
    maxLevel: PROFESSION_MAX_LEVEL,
    icon: { shape: 'ore', colors: ['#8a8a8a', '#5a5a5a', '#c9c9c9'] },
  },
  {
    id: 'foraging',
    name: 'Foraging',
    kind: 'gathering',
    description: 'Pluck herbs, kelp leaves, mushrooms, coral sprigs and blightthorn blooms by hand across every region.',
    benefit: 'Feeds Alchemy (potions & elixirs) and Cooking (food buffs). A quiet, low-risk way to fund your potions between fights.',
    maxLevel: PROFESSION_MAX_LEVEL,
    icon: { shape: 'herb', colors: ['#7a9b5c', '#5a7a3c', '#c9e0a0'] },
  },
  {
    id: 'smithing',
    name: 'Smithing',
    kind: 'crafting',
    description: 'Smelt ore into ingots at Brina\'s forge and hammer out weapons, armor, whetstones and enhancement stones.',
    benefit: 'The most reliable way to gear up: smithed weapons and armor beat comparable world drops and come with a guaranteed minimum rarity, plus you can enhance-stone your own gear cheaply.',
    maxLevel: PROFESSION_MAX_LEVEL,
    icon: { shape: 'ingot', colors: ['#8a8a8a', '#5a5a5a', '#c9c9c9'] },
  },
  {
    id: 'alchemy',
    name: 'Alchemy',
    kind: 'crafting',
    description: 'Brew HP/MP tonics, combat elixirs and reset tonics from herbs and monster parts under Juniper\'s watchful eye.',
    benefit: 'Home-brewed potions are cheaper and stronger than the general store\'s, and only alchemists can brew the 30-minute combat elixirs that stack real power onto a build.',
    maxLevel: PROFESSION_MAX_LEVEL,
    icon: { shape: 'flask', colors: ['#c77dff', '#8855cc', '#ffffff'] },
  },
  {
    id: 'cooking',
    name: 'Cooking',
    kind: 'crafting',
    description: 'Turn meat, fish, eggs, mushrooms and herbs into hearty meals at Tobbin\'s stall — and the occasional dare-worthy dish.',
    benefit: 'The only source of the long-lasting Food buff, including the XP and drop-rate dishes that make grinding noticeably faster.',
    maxLevel: PROFESSION_MAX_LEVEL,
    icon: { shape: 'soup', colors: ['#8b6b4a', '#c9a869', '#7a9b5c'] },
  },
  {
    id: 'jewelcrafting',
    name: 'Jewelcrafting',
    kind: 'crafting',
    description: 'Cut raw gems into polished stones and set them into rings and amulets at Sera\'s bench.',
    benefit: 'The single best source of accessories in the game, plus the only way to craft the top two tiers of enhancement stones.',
    maxLevel: PROFESSION_MAX_LEVEL,
    icon: { shape: 'gem', colors: ['#c77dff', '#5aa9ff', '#ffffff'] },
  },
];
