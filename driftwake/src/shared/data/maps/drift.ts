import type { MapDef } from '../../types';
import { ground, plat, stairs, rope, mspawn, gnode, decor, decorRow, placeNpc, portal } from './helpers';

/**
 * ACT VI — THE DRIFT BEYOND (post-game, levels 36-41).
 * After the Blight Heart falls, Oma's awakening sends a shockwave through the sky-sea; a second,
 * never-seen Skywhale — the Leviathan Vesper, older than Oma — surfaces from the clouds, bearing
 * a drowned-star observatory city of the First Singers on her back. Region is authored as
 * `hollow` (types.ts RegionId is fixed); maps carry distinct names/subtitles instead.
 * Reached via the Skyferry (dlg_ferry_tamsin, gated on mq_20_epilogue) rather than a new RegionId.
 */

// ---------------------------------------------------------------------------
// vesper_landing — camp/town on the Vesper's back.
// ---------------------------------------------------------------------------
function vesperLanding(): MapDef {
  const W = 1600, H = 520, groundY = H - 48; // 472
  return {
    id: 'vesper_landing',
    name: "Vesper's Landing",
    region: 'hollow',
    theme: 'galeoutpost',
    music: 'outpost',
    width: W,
    height: H,
    town: true,
    spawnPoint: { x: 140, y: groundY - 20 },
    platforms: [
      ground(W, groundY),
      plat(200, 400, 260, 'oneway'),
      plat(560, 400, 260, 'oneway'),
      plat(920, 400, 260, 'oneway'),
      plat(1280, 400, 260, 'oneway'),
    ],
    ropes: [
      rope(230, 400, groundY),
      rope(940, 400, groundY),
      rope(1300, 400, groundY),
    ],
    portals: [
      portal('to_ruins', 1550, groundY, 'starfall_ruins', 'to_landing', { label: 'To Starfall Ruins' }),
    ],
    npcs: [
      placeNpc('npc_archivist_lume', 260, groundY),
      placeNpc('npc_vane', 460, groundY),
      placeNpc('npc_cantor_rell', 660, groundY, true),
      placeNpc('npc_bryn_wick', 900, groundY),
      placeNpc('npc_ferry_tamsin', 1120, groundY),
    ],
    spawns: [],
    gather: [
      gnode('node_voidstone', 640, 400),
      gnode('node_heartcrystal', 1000, 400),
    ],
    decor: [
      ...decorRow(['tent', 'crate', 'campfire', 'banner', 'lantern'], 40, 1560, groundY, { step: 80 }),
      ...decorRow(['pillar', 'statue', 'ruin'], 200, 1300, 400, { step: 220, front: true }),
    ],
    weather: 'wind',
    subtitle: "Vesper's Landing — a hasty camp on the back of a whale older than Oma.",
  };
}

// ---------------------------------------------------------------------------
// starfall_ruins — the drowned-star observatory city (L36-38).
// ---------------------------------------------------------------------------
function starfallRuins(): MapDef {
  const W = 2400, H = 640, groundY = H - 48; // 592
  return {
    id: 'starfall_ruins',
    name: 'Starfall Ruins',
    region: 'hollow',
    theme: 'lanternreef',
    music: 'reef',
    width: W,
    height: H,
    levelRange: [36, 38],
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
      portal('to_landing', 50, groundY, 'vesper_landing', 'to_ruins', { label: "To Vesper's Landing" }),
      portal('to_spire', 2350, groundY, 'singers_spire', 'to_ruins', { label: "To Singer's Spire" }),
    ],
    npcs: [],
    spawns: [
      mspawn('star_jelly', 8, { x1: 150, x2: 2300, y1: 340, y2: 540 }),
      mspawn('nebula_wisp', 7, { x1: 150, x2: 2300, y1: 340, y2: 540 }),
      mspawn('void_ray', 6, { x1: 150, x2: 2300, y1: 500, y2: groundY + 10 }),
    ],
    gather: [
      gnode('node_voidstone', 780, 540),
      gnode('node_heartcrystal', 1350, 470),
      gnode('node_voidstone', 2300, 260),
    ],
    decor: [
      ...decorRow(['ruin', 'pillar', 'statue', 'ruin', 'pillar', 'bones'], 30, 2370, groundY, { step: 70 }),
      ...decorRow(['pillar', 'statue', 'ruin'], 100, 2150, 540, { step: 150, front: true }),
    ],
    weather: 'embers',
    dark: true,
    subtitle: "Starfall Ruins — a drowned observatory city, still charting stars no one living can see.",
  };
}

// ---------------------------------------------------------------------------
// singers_spire — the First Singers' watchtower (L38-40).
// ---------------------------------------------------------------------------
function singersSpire(): MapDef {
  const W = 2400, H = 660, groundY = H - 48; // 612
  return {
    id: 'singers_spire',
    name: "Singer's Spire",
    region: 'hollow',
    theme: 'stormspire',
    music: 'storm',
    width: W,
    height: H,
    levelRange: [38, 40],
    spawnPoint: { x: 120, y: groundY - 30 },
    platforms: [
      ground(W, groundY),
      plat(100, 550, 220), plat(420, 550, 180), plat(750, 550, 260), plat(1100, 550, 200), plat(1450, 550, 240), plat(1800, 550, 200), plat(2150, 550, 220),
      plat(250, 480, 180), plat(600, 480, 220), plat(950, 480, 160), plat(1300, 480, 200), plat(1650, 480, 180), plat(2000, 480, 200),
      plat(500, 380, 200), plat(1000, 380, 220), plat(1500, 380, 180), plat(2000, 380, 200),
      plat(2300, 270, 150), // secret ledge
      ...stairs(60, 595, 4, 42, -38, 75),
    ],
    ropes: [
      rope(300, 480, 550), rope(850, 480, 550), rope(1400, 480, 550), rope(2050, 480, 550),
      rope(550, 380, 480, 'ladder'), rope(1050, 380, 480, 'ladder'), rope(1550, 380, 480, 'ladder'), rope(2050, 380, 480, 'ladder'),
      rope(2320, 270, 380),
    ],
    portals: [
      portal('to_ruins', 50, groundY, 'starfall_ruins', 'to_spire', { label: 'To Starfall Ruins' }),
      portal('to_core', 2350, groundY, 'vesper_core', 'to_spire', {
        label: "To the Vesper's Core",
        reqs: [{ type: 'quest', questId: 'mq_26_the_calling', state: 'completed' }],
        lockedText: "The way down is sealed until the choir's fragments have been gathered and heard.",
      }),
    ],
    npcs: [],
    spawns: [
      mspawn('singer_construct', 7, { x1: 150, x2: 2300, y1: 500, y2: groundY + 10 }),
      mspawn('echo_knight', 7, { x1: 150, x2: 2300, y1: 460, y2: 550 }),
      mspawn('comet_beetle', 6, { x1: 150, x2: 2300, y1: 340, y2: 480 }),
    ],
    gather: [
      gnode('node_heartcrystal', 780, 550),
      gnode('node_voidstone', 1350, 480),
      gnode('node_heartcrystal', 2300, 270),
    ],
    decor: [
      ...decorRow(['pillar', 'statue', 'ruin', 'pillar', 'statue', 'banner'], 30, 2370, groundY, { step: 70 }),
      ...decorRow(['pillar', 'banner', 'statue'], 100, 2150, 550, { step: 150, front: true }),
    ],
    weather: 'storm',
    subtitle: "Singer's Spire — a watchtower that never stopped listening for a whale that never came.",
  };
}

// ---------------------------------------------------------------------------
// vesper_core — SUPERBOSS: The Vesper Heartsong (L41).
// ---------------------------------------------------------------------------
function vesperCore(): MapDef {
  const W = 1800, H = 600, groundY = H - 48; // 552
  return {
    id: 'vesper_core',
    name: "The Vesper's Core",
    region: 'hollow',
    theme: 'heart',
    music: 'finalboss',
    width: W,
    height: H,
    levelRange: [40, 41],
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
      portal('to_spire', 50, groundY, 'singers_spire', 'to_core', { label: "To Singer's Spire" }),
    ],
    npcs: [],
    spawns: [
      mspawn('comet_beetle', 5, { x1: 150, x2: 1700, y1: 320, y2: 500 }),
      mspawn('echo_knight', 4, { x1: 150, x2: 1700, y1: 340, y2: 470 }),
    ],
    gather: [
      gnode('node_heartcrystal', 780, 500),
      gnode('node_voidstone', 1300, 430),
      gnode('node_heartcrystal', 1650, 320),
    ],
    decor: [
      ...decorRow(['pillar', 'statue', 'ruin', 'pillar', 'statue', 'banner'], 30, 1770, groundY, { step: 70 }),
      ...decorRow(['statue', 'pillar'], 100, 1450, 500, { step: 150, front: true }),
    ],
    boss: { monsterId: 'vesper_heartsong', x: 1600, y: groundY, respawnMs: 200000, reqs: [{ type: 'quest', questId: 'mq_27_vesper_heartsong', state: ['active', 'ready', 'completed'] }] },
    weather: 'embers',
    dark: true,
    subtitle: "The Vesper's Core — an old wound of light, still singing.",
  };
}

export const DRIFT_MAPS: MapDef[] = [vesperLanding(), starfallRuins(), singersSpire(), vesperCore()];
