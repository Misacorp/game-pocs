import type { MapDef } from '../../types';
import { ground, plat, stairs, rope, mspawn, gnode, decor, decorRow, placeNpc, portal } from './helpers';

// ---------------------------------------------------------------------------
// driftmoor_town — the hub. Harbor town on Grandmother Oma's back.
// ---------------------------------------------------------------------------
function driftmoorTown(): MapDef {
  const W = 2400, H = 640, groundY = H - 48; // 592
  return {
    id: 'driftmoor_town',
    name: 'Driftmoor',
    region: 'driftmoor',
    theme: 'driftmoor',
    music: 'town',
    width: W,
    height: H,
    town: true,
    spawnPoint: { x: 140, y: groundY - 20 },
    platforms: [
      ground(W, groundY),
      plat(200, 470, 350, 'oneway'),
      plat(650, 470, 300, 'oneway'),
      plat(1050, 470, 380, 'oneway'),
      plat(1550, 470, 320, 'oneway'),
      plat(1980, 470, 350, 'oneway'),
    ],
    ropes: [
      rope(230, 470, groundY),
      rope(1070, 470, groundY),
      rope(1600, 470, groundY),
      rope(2000, 470, groundY),
    ],
    portals: [
      portal('to_kelpwood', 50, groundY, 'kelpwood_edge', 'to_town', {
        label: 'To Kelpwood Edge',
        reqs: [{ type: 'quest', questId: 'mq_05_king_barnacle', state: 'completed' }],
        lockedText: 'The kelp-choked strait beyond the reef is thick with poachers and worse — Maren wants the Grotto\'s King Barnacle dealt with first.',
      }),
      portal('to_meadows', 2350, groundY, 'mossback_meadows', 'to_town', { label: 'To Mossback Meadows' }),
    ],
    npcs: [
      placeNpc('npc_pell', 220, groundY),
      placeNpc('npc_maren', 370, groundY),
      placeNpc('npc_pim', 520, groundY),
      placeNpc('npc_wren', 660, groundY),
      placeNpc('npc_brina', 810, groundY),
      placeNpc('npc_juniper', 960, groundY),
      placeNpc('npc_sera', 1110, groundY),
      placeNpc('npc_tobbin', 1260, groundY),
      placeNpc('npc_rook_prospector', 1410, groundY),
      placeNpc('npc_grell', 1560, groundY),
      placeNpc('npc_aolani', 1710, groundY, true),
      placeNpc('npc_ferry_tamsin', 1860, groundY),
    ],
    spawns: [],
    gather: [],
    decor: [
      ...decorRow(['house', 'shop', 'lamp', 'banner', 'crate', 'barrel', 'fence', 'well', 'windmill', 'mast', 'anchor'], 40, 2380, groundY, { step: 70 }),
      ...decorRow(['banner', 'lamp', 'lantern', 'sign'], 220, 2300, 470, { step: 150, front: true }),
    ],
    weather: 'none',
    subtitle: 'Driftmoor — home port on Grandmother Oma\'s back.',
  };
}

// ---------------------------------------------------------------------------
// mossback_meadows — tutorial field.
// ---------------------------------------------------------------------------
function mossbackMeadows(): MapDef {
  const W = 1800, H = 560, groundY = H - 48; // 512
  return {
    id: 'mossback_meadows',
    name: 'Mossback Meadows',
    region: 'driftmoor',
    theme: 'meadow',
    music: 'meadow',
    width: W,
    height: H,
    levelRange: [1, 4],
    spawnPoint: { x: 120, y: groundY - 30 },
    platforms: [
      ground(W, groundY),
      plat(120, 465, 220), plat(430, 465, 180), plat(760, 465, 260), plat(1150, 465, 200), plat(1500, 465, 220),
      plat(250, 415, 150), plat(600, 415, 200), plat(950, 415, 160), plat(1300, 415, 180),
      plat(700, 300, 140), // secret ledge
      plat(1600, 300, 120), // secret ledge
      ...stairs(1650, 505, 4, -40, -40, 70),
    ],
    ropes: [
      rope(720, 300, 415),
      rope(1620, 300, 465),
    ],
    portals: [
      portal('to_town', 50, groundY, 'driftmoor_town', 'to_meadows', { label: 'To Driftmoor' }),
      portal('to_hills', 1750, groundY, 'mossback_hills', 'to_meadows', { label: 'To Mossback Hills' }),
    ],
    npcs: [],
    spawns: [
      mspawn('puffmoss', 10, { x1: 150, x2: 700, y1: 490, y2: groundY + 10 }),
      mspawn('puffmoss', 4, { x1: 150, x2: 600, y1: 440, y2: 470 }),
      mspawn('shellsnail', 8, { x1: 700, x2: 1300, y1: 490, y2: groundY + 10 }),
      mspawn('shellsnail', 4, { x1: 600, x2: 1200, y1: 395, y2: 420 }),
      mspawn('sproutling', 6, { x1: 1300, x2: 1750, y1: 400, y2: groundY + 10 }),
    ],
    gather: [
      gnode('node_meadow_herb', 300, groundY),
      gnode('node_dewcap', 950, groundY),
      gnode('node_copper', 700, 300),
      gnode('node_meadow_herb', 1600, 300),
    ],
    decor: [
      ...decorRow(['tree', 'bush', 'flower', 'grass', 'rock', 'mushroom'], 40, 1760, groundY, { step: 60 }),
      ...decorRow(['bush', 'flower', 'tree'], 150, 1500, 465, { step: 150, front: true }),
    ],
    weather: 'leaves',
    subtitle: 'Mossback Meadows — where the whale\'s back turns soft and green.',
  };
}

// ---------------------------------------------------------------------------
// mossback_hills — ropes & ladders introduced.
// ---------------------------------------------------------------------------
function mossbackHills(): MapDef {
  const W = 2000, H = 600, groundY = H - 48; // 552
  return {
    id: 'mossback_hills',
    name: 'Mossback Hills',
    region: 'driftmoor',
    theme: 'meadow',
    music: 'meadow',
    width: W,
    height: H,
    levelRange: [3, 7],
    spawnPoint: { x: 120, y: groundY - 30 },
    platforms: [
      ground(W, groundY),
      plat(100, 500, 200), plat(400, 500, 150), plat(700, 500, 240), plat(1050, 500, 180), plat(1400, 500, 260), plat(1750, 500, 200),
      plat(250, 430, 180), plat(600, 430, 220), plat(950, 430, 160), plat(1300, 430, 200), plat(1650, 430, 180),
      plat(500, 340, 200), plat(1100, 340, 220), plat(1600, 340, 180),
      plat(1850, 250, 140), // secret ledge
      ...stairs(50, 545, 4, 45, -35, 80),
    ],
    ropes: [
      rope(300, 430, 500), rope(850, 430, 500), rope(1400, 430, 500),
      rope(550, 340, 430, 'ladder'), rope(1150, 340, 430, 'ladder'), rope(1650, 340, 430, 'ladder'),
      rope(1870, 250, 340),
    ],
    portals: [
      portal('to_meadows', 50, groundY, 'mossback_meadows', 'to_hills', { label: 'To Mossback Meadows' }),
      portal('to_grotto', 1950, groundY, 'barnacle_grotto', 'to_hills', { label: 'To Barnacle Grotto' }),
    ],
    npcs: [],
    spawns: [
      mspawn('sproutling', 8, { x1: 100, x2: 900, y1: 540, y2: groundY + 10 }),
      mspawn('sproutling', 4, { x1: 250, x2: 950, y1: 420, y2: 440 }),
      mspawn('dewbug', 8, { x1: 900, x2: 1750, y1: 540, y2: groundY + 10 }),
      mspawn('dewbug', 5, { x1: 600, x2: 1650, y1: 330, y2: 440 }),
      mspawn('mossback_boar', 6, { x1: 400, x2: 1900, y1: 490, y2: groundY + 10 }),
    ],
    gather: [
      gnode('node_copper', 700, 500),
      gnode('node_quartz', 1300, 430),
      gnode('node_dewcap', 1850, 250),
      gnode('node_meadow_herb', 200, groundY),
    ],
    decor: [
      ...decorRow(['tree', 'bush', 'flower', 'grass', 'rock', 'mushroom'], 30, 1970, groundY, { step: 65 }),
      ...decorRow(['rock', 'tree', 'bush'], 100, 1750, 500, { step: 140, front: true }),
    ],
    weather: 'leaves',
    subtitle: 'Mossback Hills — steep slopes where the ropes begin.',
  };
}

// ---------------------------------------------------------------------------
// barnacle_grotto — damp cave.
// ---------------------------------------------------------------------------
function barnacleGrotto(): MapDef {
  const W = 1800, H = 560, groundY = H - 48; // 512
  return {
    id: 'barnacle_grotto',
    name: 'Barnacle Grotto',
    region: 'driftmoor',
    theme: 'grotto',
    music: 'cave',
    width: W,
    height: H,
    levelRange: [6, 9],
    spawnPoint: { x: 120, y: groundY - 30 },
    platforms: [
      ground(W, groundY),
      plat(120, 460, 200), plat(420, 460, 160), plat(700, 460, 240), plat(1050, 460, 180), plat(1400, 460, 220),
      plat(250, 390, 180), plat(600, 390, 200), plat(950, 390, 160), plat(1300, 390, 200),
      plat(1650, 280, 140), // secret ledge
      ...stairs(60, 505, 4, 40, -38, 70),
    ],
    ropes: [
      rope(280, 390, 460), rope(750, 390, 460), rope(1350, 390, 460),
      rope(1670, 280, 390),
    ],
    portals: [
      portal('to_hills', 50, groundY, 'mossback_hills', 'to_grotto', { label: 'To Mossback Hills' }),
      portal('to_depths', 1750, groundY, 'grotto_depths', 'to_grotto', { label: 'To Grotto Depths' }),
    ],
    npcs: [],
    spawns: [
      mspawn('grotto_crab', 10, { x1: 100, x2: 1400, y1: 495, y2: groundY + 10 }),
      mspawn('grotto_crab', 4, { x1: 250, x2: 950, y1: 380, y2: 400 }),
      mspawn('barnacle_bat', 8, { x1: 200, x2: 1650, y1: 270, y2: 460 }),
      mspawn('glowjelly', 7, { x1: 400, x2: 1600, y1: 270, y2: 460 }),
    ],
    gather: [
      gnode('node_copper', 700, 460),
      gnode('node_quartz', 1300, 390),
      gnode('node_dewcap', 1650, 280),
    ],
    decor: [
      ...decorRow(['barnacle', 'crystal', 'rock', 'bones'], 30, 1770, groundY, { step: 70 }),
      ...decorRow(['crystal', 'barnacle'], 120, 1400, 460, { step: 150, front: true }),
    ],
    weather: 'none',
    dark: true,
    subtitle: 'Barnacle Grotto — damp stone and glowing shells.',
  };
}

// ---------------------------------------------------------------------------
// grotto_depths — Boss: King Barnacle (L11).
// ---------------------------------------------------------------------------
function grottoDepths(): MapDef {
  const W = 2000, H = 600, groundY = H - 48; // 552
  return {
    id: 'grotto_depths',
    name: 'Grotto Depths',
    region: 'driftmoor',
    theme: 'grotto',
    music: 'cave',
    width: W,
    height: H,
    levelRange: [8, 11],
    spawnPoint: { x: 120, y: groundY - 30 },
    platforms: [
      ground(W, groundY),
      plat(100, 500, 220), plat(420, 500, 180), plat(750, 500, 240), plat(1100, 500, 200), plat(1450, 500, 220), plat(1750, 500, 180),
      plat(250, 430, 180), plat(600, 430, 220), plat(950, 430, 160), plat(1350, 430, 200), plat(1650, 430, 180),
      plat(1900, 320, 150), // secret ledge
      ...stairs(60, 545, 4, 42, -38, 75),
    ],
    ropes: [
      rope(300, 430, 500), rope(850, 430, 500), rope(1400, 430, 500),
      rope(1920, 320, 430),
    ],
    portals: [
      portal('to_grotto', 50, groundY, 'barnacle_grotto', 'to_depths', { label: 'To Barnacle Grotto' }),
    ],
    npcs: [],
    spawns: [
      mspawn('barnacle_bat', 7, { x1: 150, x2: 1700, y1: 300, y2: 500 }),
      mspawn('glowjelly', 6, { x1: 150, x2: 1700, y1: 300, y2: 500 }),
      mspawn('rustclaw_crab', 9, { x1: 100, x2: 1800, y1: 540, y2: groundY + 10 }),
      mspawn('rustclaw_crab', 4, { x1: 250, x2: 1350, y1: 420, y2: 440 }),
    ],
    gather: [
      gnode('node_quartz', 750, 500),
      gnode('node_copper', 1350, 430),
      gnode('node_dewcap', 1900, 320),
    ],
    decor: [
      ...decorRow(['barnacle', 'crystal', 'rock', 'bones'], 30, 1970, groundY, { step: 70 }),
      ...decorRow(['crystal', 'barnacle', 'rock'], 100, 1750, 500, { step: 150, front: true }),
    ],
    boss: { monsterId: 'king_barnacle', x: 1850, y: groundY, respawnMs: 150000 , reqs: [{ type: 'quest', questId: 'mq_05_king_barnacle', state: ['active', 'ready', 'completed'] }] },
    weather: 'none',
    dark: true,
    subtitle: 'Grotto Depths — where the King Barnacle broods.',
  };
}

export const DRIFTMOOR_MAPS: MapDef[] = [driftmoorTown(), mossbackMeadows(), mossbackHills(), barnacleGrotto(), grottoDepths()];
