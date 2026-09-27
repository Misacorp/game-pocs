import type { MapDef } from '../../types';
import { ground, plat, stairs, rope, mspawn, gnode, decor, decorRow, placeNpc, portal } from './helpers';

// ---------------------------------------------------------------------------
// hollow_mouth — inside Oma.
// ---------------------------------------------------------------------------
function hollowMouth(): MapDef {
  const W = 2200, H = 620, groundY = H - 48; // 572
  return {
    id: 'hollow_mouth',
    name: 'The Hollow Mouth',
    region: 'hollow',
    theme: 'hollow',
    music: 'hollow',
    width: W,
    height: H,
    levelRange: [29, 32],
    spawnPoint: { x: 120, y: groundY - 30 },
    platforms: [
      ground(W, groundY),
      plat(100, 520, 220), plat(420, 520, 180), plat(750, 520, 260), plat(1100, 520, 200), plat(1450, 520, 240), plat(1800, 520, 200),
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
      portal('to_reef', 50, groundY, 'glowtide_shallows', 'to_hollow', { label: 'To Glowtide Shallows' }),
      portal('to_veins', 2150, groundY, 'blighted_veins', 'to_mouth', { label: 'To Blighted Veins' }),
    ],
    npcs: [
      placeNpc('npc_first_singer', 1200, groundY),
    ],
    spawns: [
      mspawn('blight_slime', 9, { x1: 150, x2: 2000, y1: 500, y2: groundY + 10 }),
      mspawn('rot_mushling', 9, { x1: 150, x2: 2000, y1: 440, y2: 520 }),
      mspawn('parasite_grub', 9, { x1: 150, x2: 2000, y1: 340, y2: 520 }),
    ],
    gather: [
      gnode('node_blightthorn', 780, 520),
      gnode('node_voidstone', 1350, 450),
      gnode('node_heartcrystal', 1950, 250),
    ],
    decor: [
      ...decorRow(['tendril', 'pod', 'ruin', 'pillar', 'statue', 'bones'], 30, 2170, groundY, { step: 70 }),
      ...decorRow(['tendril', 'pod', 'ruin'], 100, 1800, 520, { step: 150, front: true }),
    ],
    weather: 'spores',
    dark: true,
    subtitle: 'The Hollow Mouth — the whale\'s throat, thick with rot and old ruins.',
  };
}

// ---------------------------------------------------------------------------
// blighted_veins
// ---------------------------------------------------------------------------
function blightedVeins(): MapDef {
  const W = 2400, H = 640, groundY = H - 48; // 592
  return {
    id: 'blighted_veins',
    name: 'Blighted Veins',
    region: 'hollow',
    theme: 'hollow',
    music: 'hollow',
    width: W,
    height: H,
    levelRange: [31, 35],
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
      portal('to_mouth', 50, groundY, 'hollow_mouth', 'to_veins', { label: 'To The Hollow Mouth' }),
      portal('to_heart', 2350, groundY, 'heart_chamber', 'to_veins', { label: 'To Heart of Oma' }),
    ],
    npcs: [],
    spawns: [
      mspawn('parasite_grub', 7, { x1: 150, x2: 2300, y1: 520, y2: groundY + 10 }),
      mspawn('hollow_sentinel', 7, { x1: 150, x2: 2300, y1: 500, y2: 540 }),
      mspawn('blighted_bat', 7, { x1: 150, x2: 2300, y1: 340, y2: 540 }),
      mspawn('whisper_wraith', 7, { x1: 150, x2: 2300, y1: 340, y2: 470 }),
    ],
    gather: [
      gnode('node_voidstone', 780, 540),
      gnode('node_heartcrystal', 1350, 470),
      gnode('node_blightthorn', 2000, 370),
      gnode('node_voidstone', 2300, 260),
    ],
    decor: [
      ...decorRow(['tendril', 'pod', 'ruin', 'pillar', 'statue', 'bones'], 30, 2370, groundY, { step: 70 }),
      ...decorRow(['statue', 'pillar', 'tendril'], 100, 2150, 540, { step: 150, front: true }),
    ],
    weather: 'spores',
    dark: true,
    subtitle: 'Blighted Veins — the rot runs deep here.',
  };
}

// ---------------------------------------------------------------------------
// heart_chamber — FINAL BOSS: The Blight Heart (L36)
// ---------------------------------------------------------------------------
function heartChamber(): MapDef {
  const W = 1800, H = 600, groundY = H - 48; // 552
  return {
    id: 'heart_chamber',
    name: 'Heart of Oma',
    region: 'hollow',
    theme: 'heart',
    music: 'finalboss',
    width: W,
    height: H,
    levelRange: [35, 36],
    spawnPoint: { x: 120, y: groundY - 30 },
    platforms: [
      ground(W, groundY),
      plat(100, 500, 220), plat(420, 500, 180), plat(750, 500, 260), plat(1100, 500, 200), plat(1450, 500, 220),
      plat(250, 430, 180), plat(600, 430, 220), plat(950, 430, 160), plat(1300, 430, 200),
      plat(1650, 320, 150), // secret ledge
      ...stairs(60, 545, 4, 40, -38, 70),
    ],
    ropes: [
      rope(300, 430, 500), rope(750, 430, 500), rope(1350, 430, 500),
      rope(1670, 320, 430),
    ],
    portals: [
      portal('to_veins', 50, groundY, 'blighted_veins', 'to_heart', { label: 'To Blighted Veins' }),
    ],
    npcs: [],
    spawns: [
      mspawn('blighted_bat', 8, { x1: 150, x2: 1700, y1: 320, y2: 500 }),
      mspawn('whisper_wraith', 7, { x1: 150, x2: 1700, y1: 340, y2: 470 }),
    ],
    gather: [
      gnode('node_heartcrystal', 780, 500),
      gnode('node_voidstone', 1300, 430),
      gnode('node_heartcrystal', 1650, 320),
    ],
    decor: [
      ...decorRow(['tendril', 'pod', 'ruin', 'pillar', 'statue', 'bones'], 30, 1770, groundY, { step: 70 }),
      ...decorRow(['statue', 'pillar'], 100, 1450, 500, { step: 150, front: true }),
    ],
    boss: { monsterId: 'blight_heart', x: 1600, y: groundY, respawnMs: 180000 , reqs: [{ type: 'quest', questId: 'mq_19_heart', state: ['active', 'ready', 'completed'] }] },
    weather: 'embers',
    dark: true,
    subtitle: 'Heart of Oma — the ancient wound still beats.',
  };
}

export const HOLLOW_MAPS: MapDef[] = [hollowMouth(), blightedVeins(), heartChamber()];
