import type { MapDef } from '../../types';
import { ground, plat, stairs, rope, mspawn, gnode, decor, decorRow, placeNpc, portal } from './helpers';

// ---------------------------------------------------------------------------
// gale_outpost — town, 2nd job instructors.
// ---------------------------------------------------------------------------
function galeOutpost(): MapDef {
  const W = 2200, H = 600, groundY = H - 48; // 552
  return {
    id: 'gale_outpost',
    name: 'Gale Outpost',
    region: 'stormbreak',
    theme: 'galeoutpost',
    music: 'outpost',
    width: W,
    height: H,
    town: true,
    spawnPoint: { x: 140, y: groundY - 20 },
    platforms: [
      ground(W, groundY),
      plat(200, 440, 320, 'oneway'),
      plat(650, 440, 300, 'oneway'),
      plat(1100, 440, 380, 'oneway'),
      plat(1600, 440, 320, 'oneway'),
      plat(2000, 440, 250, 'oneway'),
    ],
    ropes: [
      rope(230, 440, groundY),
      rope(1120, 440, groundY),
      rope(2020, 440, groundY),
    ],
    portals: [
      portal('to_kelpwood', 50, groundY, 'kelpwood_deep', 'to_outpost', { label: 'Updraft Lift to Deep Kelpwood' }),
      portal('to_ledges', 2150, groundY, 'windswept_ledges', 'to_outpost', { label: 'To Windswept Ledges' }),
      portal('to_reef', 1600, 440, 'glowtide_shallows', 'to_outpost', {
        label: 'Skyship to Glowtide Shallows',
        reqs: [{ type: 'quest', questId: 'mq_12_kraelith', state: 'completed' }],
        lockedText: 'No skyship will risk the reef crossing while Kraelith still rules the storm.',
      }),
    ],
    npcs: [
      placeNpc('npc_borran', 250, groundY),
      placeNpc('npc_hale', 400, groundY),
      placeNpc('npc_ysolde', 550, groundY),
      placeNpc('npc_kestrel', 700, groundY),
      placeNpc('npc_whisper', 850, groundY),
      placeNpc('npc_quill', 1000, groundY),
      placeNpc('npc_ferry_tamsin', 1150, groundY),
    ],
    spawns: [],
    gather: [],
    decor: [
      ...decorRow(['tent', 'banner', 'windmill', 'campfire', 'crate'], 40, 2160, groundY, { step: 70 }),
      ...decorRow(['banner', 'windmill', 'lantern'], 200, 2000, 440, { step: 150, front: true }),
    ],
    weather: 'wind',
    subtitle: 'Gale Outpost — windswept cliffs, skyships creaking at anchor.',
  };
}

// ---------------------------------------------------------------------------
// windswept_ledges — faction camps (Grell / Aolani, travelled).
// ---------------------------------------------------------------------------
function windsweptLedges(): MapDef {
  const W = 2400, H = 620, groundY = H - 48; // 572
  return {
    id: 'windswept_ledges',
    name: 'Windswept Ledges',
    region: 'stormbreak',
    theme: 'stormspire',
    music: 'storm',
    width: W,
    height: H,
    levelRange: [16, 20],
    spawnPoint: { x: 120, y: groundY - 30 },
    platforms: [
      ground(W, groundY),
      plat(100, 520, 220), plat(420, 520, 180), plat(750, 520, 260), plat(1100, 520, 200), plat(1450, 520, 240), plat(1800, 520, 200), plat(2150, 520, 220),
      plat(250, 450, 180), plat(600, 450, 220), plat(950, 450, 160), plat(1300, 450, 200), plat(1650, 450, 180), plat(2000, 450, 200),
      plat(500, 350, 200), plat(1000, 350, 220), plat(1500, 350, 180), plat(2000, 350, 200),
      plat(2250, 250, 140), // secret ledge
      ...stairs(60, 565, 4, 42, -38, 75),
    ],
    ropes: [
      rope(300, 450, 520), rope(850, 450, 520), rope(1400, 450, 520), rope(2050, 450, 520),
      rope(550, 350, 450, 'ladder'), rope(1050, 350, 450, 'ladder'), rope(1550, 350, 450, 'ladder'), rope(2050, 350, 450, 'ladder'),
      rope(2270, 250, 350),
    ],
    portals: [
      portal('to_outpost', 50, groundY, 'gale_outpost', 'to_ledges', { label: 'To Gale Outpost' }),
      portal('to_peaks', 2350, groundY, 'thunderhead_peaks', 'to_ledges', { label: 'To Thunderhead Peaks' }),
    ],
    npcs: [
      placeNpc('npc_grell_camp', 220, groundY),
      placeNpc('npc_aolani_camp', 2180, groundY, true),
    ],
    spawns: [
      mspawn('gust_wisp', 9, { x1: 150, x2: 2300, y1: 240, y2: 520 }),
      mspawn('cloud_puff', 9, { x1: 150, x2: 2300, y1: 500, y2: groundY + 10 }),
      mspawn('stormhawk', 9, { x1: 150, x2: 2300, y1: 340, y2: 520 }),
    ],
    gather: [
      gnode('node_windbloom', 780, 520),
      gnode('node_skycrystal', 1350, 450),
      gnode('node_stormsteel', 2250, 250),
    ],
    decor: [
      ...decorRow(['rock', 'crystal', 'pillar'], 30, 2370, groundY, { step: 70 }),
      ...decorRow(['crystal', 'rock'], 100, 2150, 520, { step: 150, front: true }),
      decor('tent', 180, groundY),
      decor('campfire', 260, groundY, { front: true }),
      decor('tent', 2150, groundY, { flip: true }),
      decor('lantern', 2260, groundY, { front: true }),
    ],
    weather: 'wind',
    subtitle: 'Windswept Ledges — Harpooner and Tidekeeper camps, watching the storm.',
  };
}

// ---------------------------------------------------------------------------
// thunderhead_peaks
// ---------------------------------------------------------------------------
function thunderheadPeaks(): MapDef {
  const W = 2600, H = 700, groundY = H - 48; // 652
  return {
    id: 'thunderhead_peaks',
    name: 'Thunderhead Peaks',
    region: 'stormbreak',
    theme: 'stormspire',
    music: 'storm',
    width: W,
    height: H,
    levelRange: [19, 23],
    spawnPoint: { x: 120, y: groundY - 30 },
    platforms: [
      ground(W, groundY),
      plat(100, 600, 220), plat(420, 600, 180), plat(750, 600, 260), plat(1100, 600, 200), plat(1450, 600, 240), plat(1800, 600, 200), plat(2150, 600, 220), plat(2450, 600, 150),
      plat(250, 530, 180), plat(600, 530, 220), plat(950, 530, 160), plat(1300, 530, 200), plat(1650, 530, 180), plat(2000, 530, 200),
      plat(500, 430, 200), plat(1000, 430, 220), plat(1500, 430, 180), plat(2000, 430, 200),
      plat(2300, 320, 150), // secret ledge
      ...stairs(60, 645, 4, 42, -38, 75),
    ],
    ropes: [
      rope(300, 530, 600), rope(850, 530, 600), rope(1400, 530, 600), rope(2050, 530, 600),
      rope(550, 430, 530, 'ladder'), rope(1050, 430, 530, 'ladder'), rope(1550, 430, 530, 'ladder'), rope(2050, 430, 530, 'ladder'),
      rope(2320, 320, 430),
    ],
    portals: [
      portal('to_ledges', 50, groundY, 'windswept_ledges', 'to_peaks', { label: 'To Windswept Ledges' }),
      portal('to_nest', 2550, groundY, 'roc_nest', 'to_peaks', { label: "To Kraelith's Aerie" }),
    ],
    npcs: [],
    spawns: [
      mspawn('stormhawk', 7, { x1: 150, x2: 2400, y1: 300, y2: 530 }),
      mspawn('thunder_beetle', 7, { x1: 150, x2: 2400, y1: 590, y2: groundY + 10 }),
      mspawn('cliff_golem', 7, { x1: 200, x2: 2350, y1: 520, y2: 600 }),
      mspawn('sky_raider', 7, { x1: 200, x2: 2350, y1: 420, y2: 530 }),
    ],
    gather: [
      gnode('node_stormsteel', 800, 600),
      gnode('node_skycrystal', 1350, 530),
      gnode('node_windbloom', 1550, 430),
      gnode('node_skycrystal', 2350, 320),
    ],
    decor: [
      ...decorRow(['rock', 'crystal', 'pillar'], 30, 2570, groundY, { step: 75 }),
      ...decorRow(['pillar', 'rock', 'crystal'], 100, 2450, 600, { step: 150, front: true }),
    ],
    weather: 'storm',
    subtitle: 'Thunderhead Peaks — lightning splits the sky between jagged spires.',
  };
}

// ---------------------------------------------------------------------------
// roc_nest — Boss: Kraelith, the Storm Roc (L24)
// ---------------------------------------------------------------------------
function rocNest(): MapDef {
  const W = 1900, H = 620, groundY = H - 48; // 572
  return {
    id: 'roc_nest',
    name: "Kraelith's Aerie",
    region: 'stormbreak',
    theme: 'stormspire',
    music: 'boss',
    width: W,
    height: H,
    levelRange: [23, 24],
    spawnPoint: { x: 120, y: groundY - 30 },
    platforms: [
      ground(W, groundY),
      plat(100, 520, 220), plat(420, 520, 180), plat(750, 520, 260), plat(1100, 520, 200), plat(1450, 520, 220),
      plat(250, 450, 180), plat(600, 450, 220), plat(950, 450, 160), plat(1300, 450, 200),
      plat(1650, 340, 150), // secret ledge
      ...stairs(60, 565, 4, 40, -38, 70),
    ],
    ropes: [
      rope(300, 450, 520), rope(750, 450, 520), rope(1350, 450, 520),
      rope(1670, 340, 450),
    ],
    portals: [
      portal('to_peaks', 50, groundY, 'thunderhead_peaks', 'to_nest', { label: 'To Thunderhead Peaks' }),
    ],
    npcs: [],
    spawns: [
      mspawn('sky_raider', 9, { x1: 150, x2: 1800, y1: 430, y2: 520 }),
      mspawn('cliff_golem', 9, { x1: 150, x2: 1800, y1: 500, y2: groundY + 10 }),
    ],
    gather: [
      gnode('node_skycrystal', 780, 520),
      gnode('node_stormsteel', 1350, 450),
      gnode('node_windbloom', 1650, 340),
    ],
    decor: [
      ...decorRow(['rock', 'crystal', 'pillar'], 30, 1870, groundY, { step: 70 }),
      ...decorRow(['pillar', 'rock'], 100, 1450, 520, { step: 150, front: true }),
    ],
    boss: { monsterId: 'kraelith', x: 1750, y: groundY, respawnMs: 170000 },
    weather: 'storm',
    subtitle: "Kraelith's Aerie — the storm roc rules the highest crag.",
  };
}

export const STORMBREAK_MAPS: MapDef[] = [galeOutpost(), windsweptLedges(), thunderheadPeaks(), rocNest()];
