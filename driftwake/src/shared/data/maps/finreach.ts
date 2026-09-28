import type { MapDef } from '../../types';
import { ground, plat, stairs, rope, mspawn, gnode, decor, decorRow, placeNpc, portal } from './helpers';

// ---------------------------------------------------------------------------
// kelpwood_edge
// ---------------------------------------------------------------------------
function kelpwoodEdge(): MapDef {
  const W = 2200, H = 620, groundY = H - 48; // 572
  return {
    id: 'kelpwood_edge',
    name: 'Kelpwood Edge',
    region: 'finreach',
    theme: 'kelpwood',
    music: 'kelp',
    width: W,
    height: H,
    levelRange: [10, 13],
    spawnPoint: { x: 120, y: groundY - 30 },
    platforms: [
      ground(W, groundY),
      plat(120, 520, 220), plat(430, 520, 180), plat(760, 520, 260), plat(1100, 520, 200), plat(1450, 520, 240), plat(1800, 520, 200),
      plat(250, 450, 180), plat(600, 450, 220), plat(950, 450, 160), plat(1300, 450, 200), plat(1650, 450, 180),
      plat(500, 350, 200), plat(1000, 350, 220), plat(1500, 350, 180),
      plat(1950, 250, 140), // secret ledge
      ...stairs(60, 565, 4, 42, -38, 75),
    ],
    ropes: [
      rope(300, 450, 520), rope(750, 450, 520), rope(1350, 450, 520), rope(1750, 450, 520),
      rope(550, 350, 450, 'ladder'), rope(1050, 350, 450, 'ladder'), rope(1550, 350, 450, 'ladder'),
      rope(1970, 250, 350),
    ],
    portals: [
      portal('to_town', 50, groundY, 'driftmoor_town', 'to_kelpwood', { label: 'To Driftmoor' }),
      portal('to_deep', 2150, groundY, 'kelpwood_deep', 'to_edge', { label: 'To Deep Kelpwood' }),
    ],
    npcs: [
      placeNpc('npc_idris', 1880, groundY),
      placeNpc('npc_fenna', 2020, groundY),
      // Cooking moved out here from Driftmoor (see DESIGN.md "Onboarding curve") — gives Kelpwood
      // Edge its own reason to visit beyond the main quest, and thins Driftmoor's starting cast.
      placeNpc('npc_tobbin', 1750, groundY),
    ],
    spawns: [
      mspawn('kelp_sprite', 9, { x1: 150, x2: 2000, y1: 240, y2: 520 }),
      mspawn('tanglevine', 8, { x1: 200, x2: 1900, y1: 500, y2: groundY + 10 }),
      mspawn('driftfin_eel', 9, { x1: 150, x2: 2000, y1: 340, y2: 520 }),
    ],
    gather: [
      gnode('node_kelp', 700, 520),
      gnode('node_sporecap', 1300, 450),
      gnode('node_amber', 1950, 250),
    ],
    decor: [
      ...decorRow(['kelp', 'vine', 'pod', 'crystal'], 30, 2170, groundY, { step: 70 }),
      ...decorRow(['kelp', 'pod'], 120, 1800, 520, { step: 150, front: true }),
    ],
    weather: 'spores',
    subtitle: 'Kelpwood Edge — towering kelp stalks reach into golden light.',
  };
}

// ---------------------------------------------------------------------------
// kelpwood_deep — poacher camp; updraft lift to Gale Outpost.
// ---------------------------------------------------------------------------
function kelpwoodDeep(): MapDef {
  const W = 2600, H = 640, groundY = H - 48; // 592
  return {
    id: 'kelpwood_deep',
    name: 'Deep Kelpwood',
    region: 'finreach',
    theme: 'kelpwood',
    music: 'kelp',
    width: W,
    height: H,
    levelRange: [12, 16],
    spawnPoint: { x: 120, y: groundY - 30 },
    platforms: [
      ground(W, groundY),
      plat(100, 540, 220), plat(420, 540, 180), plat(750, 540, 260), plat(1100, 540, 200), plat(1450, 540, 240), plat(1800, 540, 200), plat(2150, 540, 220),
      plat(250, 470, 180), plat(600, 470, 220), plat(950, 470, 160), plat(1300, 470, 200), plat(1650, 470, 180), plat(2000, 470, 200),
      plat(500, 370, 200), plat(1000, 370, 220), plat(1500, 370, 180), plat(2000, 370, 200),
      plat(2300, 260, 150), // secret ledge
      ...stairs(60, 585, 4, 42, -38, 75),
    ],
    ropes: [
      rope(300, 470, 540), rope(850, 470, 540), rope(1400, 470, 540), rope(2050, 470, 540),
      rope(550, 370, 470, 'ladder'), rope(1050, 370, 470, 'ladder'), rope(1550, 370, 470, 'ladder'), rope(2050, 370, 470, 'ladder'),
      rope(2320, 260, 370),
    ],
    portals: [
      portal('to_edge', 50, groundY, 'kelpwood_edge', 'to_deep', { label: 'To Kelpwood Edge' }),
      portal('to_tangle', 2550, groundY, 'tangle_heart', 'to_deep', { label: 'To The Tangle Heart' }),
      portal('to_outpost', 1300, 470, 'gale_outpost', 'to_kelpwood', {
        label: 'Updraft Lift to Gale Outpost',
        reqs: [{ type: 'level', min: 15 }],
        lockedText: 'The updraft lift needs a sturdier frame under you — come back at level 15.',
      }),
    ],
    npcs: [
      placeNpc('npc_poacher_defector', 1750, groundY),
    ],
    spawns: [
      mspawn('tanglevine', 7, { x1: 150, x2: 2400, y1: 520, y2: groundY + 10 }),
      mspawn('spore_mushling', 7, { x1: 150, x2: 1900, y1: 460, y2: 560 }),
      mspawn('poacher', 7, { x1: 1400, x2: 2500, y1: 530, y2: groundY + 10 }),
      mspawn('kelp_spider', 7, { x1: 200, x2: 2300, y1: 350, y2: 470 }),
    ],
    gather: [
      gnode('node_iron', 700, 540),
      gnode('node_kelp', 1300, 470),
      gnode('node_amber', 2000, 370),
      gnode('node_sporecap', 2300, 260),
    ],
    decor: [
      ...decorRow(['kelp', 'vine', 'pod'], 30, 2570, groundY, { step: 70 }),
      ...decorRow(['kelp', 'pod', 'vine'], 100, 2150, 540, { step: 150, front: true }),
      decor('tent', 1700, groundY),
      decor('crate', 1780, groundY),
      decor('campfire', 1850, groundY, { front: true }),
      decor('tent', 1950, groundY, { flip: true }),
      decor('crate', 2020, groundY),
    ],
    weather: 'spores',
    subtitle: 'Deep Kelpwood — the poachers\' camp lurks in the murk.',
  };
}

// ---------------------------------------------------------------------------
// tangle_heart — Boss: Old Tangle (L17)
// ---------------------------------------------------------------------------
function tangleHeart(): MapDef {
  const W = 1800, H = 560, groundY = H - 48; // 512
  return {
    id: 'tangle_heart',
    name: 'The Tangle Heart',
    region: 'finreach',
    theme: 'kelpwood',
    music: 'boss',
    width: W,
    height: H,
    levelRange: [16, 18],
    spawnPoint: { x: 120, y: groundY - 30 },
    platforms: [
      ground(W, groundY),
      plat(100, 460, 220), plat(420, 460, 180), plat(750, 460, 260), plat(1100, 460, 200), plat(1450, 460, 220),
      plat(250, 390, 180), plat(600, 390, 220), plat(950, 390, 160), plat(1300, 390, 200),
      plat(1600, 280, 140), // secret ledge
      ...stairs(60, 505, 4, 40, -38, 70),
    ],
    ropes: [
      rope(300, 390, 460), rope(750, 390, 460), rope(1350, 390, 460),
      rope(1620, 280, 390),
    ],
    portals: [
      portal('to_deep', 50, groundY, 'kelpwood_deep', 'to_tangle', { label: 'To Deep Kelpwood' }),
    ],
    npcs: [],
    spawns: [
      mspawn('kelp_spider', 10, { x1: 150, x2: 1700, y1: 300, y2: groundY + 10 }),
      mspawn('tanglevine', 8, { x1: 200, x2: 1600, y1: 380, y2: 470 }),
    ],
    gather: [
      gnode('node_kelp', 700, 460),
      gnode('node_amber', 1300, 390),
      gnode('node_sporecap', 1600, 280),
    ],
    decor: [
      ...decorRow(['kelp', 'vine', 'pod'], 30, 1770, groundY, { step: 70 }),
      ...decorRow(['kelp', 'vine'], 100, 1450, 460, { step: 150, front: true }),
    ],
    boss: { monsterId: 'old_tangle', x: 1650, y: groundY, respawnMs: 160000 , reqs: [{ type: 'quest', questId: 'mq_10_old_tangle', state: ['active', 'ready', 'completed'] }] },
    weather: 'spores',
    subtitle: 'The Tangle Heart — ancient roots coil around a sleeping horror.',
  };
}

export const FINREACH_MAPS: MapDef[] = [kelpwoodEdge(), kelpwoodDeep(), tangleHeart()];
