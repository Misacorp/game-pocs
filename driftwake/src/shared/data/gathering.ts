import type { GatherNodeDef } from '../types';

interface NodeTier { level: number; hits: number; xp: number; respawnMs: number }
const TIERS: NodeTier[] = [
  { level: 1, hits: 3, xp: 8, respawnMs: 25_000 },
  { level: 3, hits: 3, xp: 14, respawnMs: 28_000 },
  { level: 5, hits: 4, xp: 22, respawnMs: 31_000 },
  { level: 7, hits: 4, xp: 32, respawnMs: 35_000 },
  { level: 9, hits: 5, xp: 45, respawnMs: 40_000 },
];

function oreNode(id: string, name: string, tierIdx: number, matId: string, color: string, color2: string): GatherNodeDef {
  const t = TIERS[tierIdx];
  return {
    id, name, profession: 'mining', level: t.level, hits: t.hits, xp: t.xp, respawnMs: t.respawnMs,
    drops: [{ itemId: matId, chance: 1, min: 1, max: 3 }, { itemId: 'mat_enhance_stone_1', chance: 0.02, min: 1, max: 1 }],
    sprite: { base: 'ore', color, color2 },
  };
}
function crystalNode(id: string, name: string, tierIdx: number, matId: string, color: string, color2: string): GatherNodeDef {
  const t = TIERS[tierIdx];
  return {
    id, name, profession: 'mining', level: t.level, hits: t.hits, xp: t.xp, respawnMs: t.respawnMs,
    drops: [{ itemId: matId, chance: 1, min: 1, max: 2 }, { itemId: 'mat_enhance_stone_1', chance: 0.02, min: 1, max: 1 }],
    sprite: { base: 'crystal', color, color2 },
  };
}
function herbNode(id: string, name: string, tierIdx: number, matId: string, base: GatherNodeDef['sprite']['base'], color: string, color2: string, bonusMat?: string): GatherNodeDef {
  const t = TIERS[tierIdx];
  const drops: GatherNodeDef['drops'] = [{ itemId: matId, chance: 1, min: 1, max: 3 }];
  if (bonusMat) drops.push({ itemId: bonusMat, chance: 0.03, min: 1, max: 1 });
  return { id, name, profession: 'foraging', level: t.level, hits: t.hits, xp: t.xp, respawnMs: t.respawnMs, drops, sprite: { base, color, color2 } };
}

export const GATHER_NODE_LIST: GatherNodeDef[] = [
  // Ores (mining)
  oreNode('node_copper', 'Copper Vein', 0, 'mat_copper_ore', '#c98a4a', '#8b5a2a'),
  oreNode('node_iron', 'Iron Vein', 1, 'mat_iron_ore', '#8a8a8a', '#5a5a5a'),
  oreNode('node_stormsteel', 'Stormsteel Vein', 2, 'mat_stormsteel_ore', '#5a6b7a', '#4fd1ff'),
  oreNode('node_coralite', 'Coralite Deposit', 3, 'mat_coralite_ore', '#ff7f8a', '#cc4a58'),
  oreNode('node_voidstone', 'Voidstone Seam', 4, 'mat_voidstone_ore', '#5a3f7a', '#3a1f4a'),

  // Crystals (mining)
  crystalNode('node_quartz', 'Quartz Cluster', 0, 'mat_quartz', '#e8e8f0', '#c9c9e0'),
  crystalNode('node_amber', 'Amber Deposit', 1, 'mat_amber', '#d99a3c', '#f0c070'),
  crystalNode('node_skycrystal', 'Sky Crystal Cluster', 2, 'mat_sky_crystal', '#4fd1ff', '#cfe0ee'),
  crystalNode('node_pearl', 'Pearl Bed', 3, 'mat_pearl', '#f0e6d2', '#d8cdb0'),
  crystalNode('node_heartcrystal', 'Heart Crystal Vein', 4, 'mat_heart_crystal', '#8a5fd0', '#5a3f7a'),

  // Herbs (foraging)
  herbNode('node_meadow_herb', 'Meadow Herb Patch', 0, 'mat_meadow_herb', 'herb', '#7a9b5c', '#5a7a3c', 'mat_quartz'),
  herbNode('node_dewcap', 'Dewcap Cluster', 0, 'mat_dewcap', 'mushroom', '#a0d0e0', '#70a0c0'),
  herbNode('node_kelp', 'Kelp Frond', 1, 'mat_kelp_leaf', 'kelp', '#2f8f5c', '#1f6b45', 'mat_amber'),
  herbNode('node_sporecap', 'Sporecap Cluster', 1, 'mat_sporecap', 'mushroom', '#c9a869', '#8b6b4a'),
  herbNode('node_windbloom', 'Windbloom Patch', 2, 'mat_windbloom', 'herb', '#cfe0ee', '#4fd1ff', 'mat_sky_crystal'),
  herbNode('node_glowcoral', 'Glow Coral Bed', 3, 'mat_glow_coral', 'coral', '#3fe0c8', '#ff7f8a', 'mat_pearl'),
  herbNode('node_lanternmoss', 'Lantern Moss Patch', 3, 'mat_lantern_moss', 'herb', '#3fe0c8', '#1fa088'),
  herbNode('node_blightthorn', 'Blightthorn Patch', 4, 'mat_blightthorn', 'herb', '#5a3f7a', '#8a5fd0', 'mat_heart_crystal'),
];
