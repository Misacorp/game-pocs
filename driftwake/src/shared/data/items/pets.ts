/**
 * Companion pet items (Maplestory-style). category 'use', stack 1 — summoned/dismissed via the
 * 'summonPet' action (double-click in inventory, or the Character window's pet slot), never
 * consumed. See logic/reducer.ts 'summonPet' and stats.ts for the small passive bonus while active.
 */
import type { ItemDef } from '../../types';

export const PET_ITEMS: ItemDef[] = [
  {
    id: 'pet_puffling', name: 'Puffling', description: 'A baby puffmoss, no bigger than a teacup. Bounces when happy.',
    category: 'use', rarity: 'common', icon: { shape: 'slime', colors: ['#8fd98f', '#5aa65a', '#ffffff'] },
    stack: 1, sellPrice: 20, buyPrice: 150,
    pet: { species: 'puffling', lootRadius: 90, stats: { dropBonus: 0.01 }, flavor: 'Hops along behind you, always a little out of breath.' },
  },
  {
    id: 'pet_shellsnail', name: 'Shellsnail', description: 'A very small, very slow, very devoted shellsnail.',
    category: 'use', rarity: 'uncommon', icon: { shape: 'shell', colors: ['#d9b98f', '#8a6a4a', '#ffffff'] },
    stack: 1, sellPrice: 30,
    pet: { species: 'shellsnail', lootRadius: 80, stats: { xpBonus: 0.01 }, flavor: "Leaves a faint trail of glitter. Don't ask why." },
  },
  {
    id: 'pet_kelpfox', name: 'Kelpfox', description: 'A fox-shaped tangle of living kelp, quick and curious.',
    category: 'use', rarity: 'uncommon', icon: { shape: 'leaf', colors: ['#4a9a5a', '#ff9a52', '#ffffff'] },
    stack: 1, sellPrice: 45,
    pet: { species: 'kelpfox', lootRadius: 110, stats: { dropBonus: 0.02, speed: 2 }, flavor: 'Darts after loot before you even notice it dropped.' },
  },
  {
    id: 'pet_stormkit', name: 'Stormkit', description: "A tiny roc chick, all fluff and static. Doesn't fly so much as flop.",
    category: 'use', rarity: 'rare', icon: { shape: 'feather', colors: ['#cfe0ee', '#5aa9ff', '#ffffff'] },
    stack: 1, sellPrice: 70,
    pet: { species: 'stormkit', lootRadius: 120, stats: { speed: 4, xpBonus: 0.01 }, flavor: 'Chirps with a tiny crack of thunder when excited.' },
  },
  {
    id: 'pet_lanternfish', name: 'Lanternfish', description: 'A small bioluminescent fish that floats in the air just fine, thank you.',
    category: 'use', rarity: 'rare', icon: { shape: 'lantern', colors: ['#5adfff', '#ffe066', '#ffffff'] },
    stack: 1, sellPrice: 80, buyPrice: 600,
    pet: { species: 'lanternfish', lootRadius: 100, stats: { dropBonus: 0.02, xpBonus: 0.01 }, flavor: 'Glows brighter the closer it gets to treasure.' },
  },
  {
    id: 'pet_whalecalf', name: 'Whalecalf', description: 'A tiny floating skywhale calf, barely the size of a loaf of bread. The rarest of companions.',
    category: 'use', rarity: 'legendary', icon: { shape: 'orb', colors: ['#5a99ff', '#ffe6a8', '#ffffff'] },
    stack: 1, sellPrice: 500,
    pet: { species: 'whalecalf', lootRadius: 160, stats: { dropBonus: 0.03, xpBonus: 0.03, speed: 3 }, flavor: 'Drifts beside you exactly like Oma does, just smaller and much less likely to sink a harbor.' },
  },
];
