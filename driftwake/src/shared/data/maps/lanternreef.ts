import type { MapDef } from '../../types';
import { ground, plat, stairs, rope, mspawn, gnode, decor, decorRow, placeNpc, portal } from './helpers';

// ---------------------------------------------------------------------------
// glowtide_shallows — diver camp.
// ---------------------------------------------------------------------------
function glowtideShallows(): MapDef {
  const W = 2200, H = 620, groundY = H - 48; // 572
  return {
    id: 'glowtide_shallows',
    name: 'Glowtide Shallows',
    region: 'lanternreef',
    theme: 'lanternreef',
    music: 'reef',
    width: W,
    height: H,
    levelRange: [23, 26],
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
      portal('to_outpost', 50, groundY, 'gale_outpost', 'to_reef', { label: 'To Gale Outpost' }),
      portal('to_deeps', 2150, groundY, 'lantern_deeps', 'to_shallows', { label: 'To Lantern Deeps' }),
      portal('to_hollow', 1300, 450, 'hollow_mouth', 'to_reef', {
        label: 'The Shimmering Rift',
        reqs: [{ type: 'quest', questId: 'mq_16_captain', state: 'completed' }],
        lockedText: 'The rift into the Hollow will not open while Captain Rook still haunts these waters.',
      }),
    ],
    npcs: [
      placeNpc('npc_nell', 1900, groundY),
    ],
    spawns: [
      mspawn('lantern_jelly', 9, { x1: 150, x2: 2000, y1: 240, y2: 520 }),
      mspawn('reef_crab', 9, { x1: 150, x2: 2000, y1: 500, y2: groundY + 10 }),
      mspawn('glimmerfish', 9, { x1: 150, x2: 2000, y1: 340, y2: 520 }),
    ],
    gather: [
      gnode('node_coralite', 780, 520),
      gnode('node_glowcoral', 1350, 450),
      gnode('node_pearl', 1950, 250),
    ],
    decor: [
      ...decorRow(['coral', 'shell', 'lantern', 'crystal'], 30, 2170, groundY, { step: 70 }),
      ...decorRow(['coral', 'shell'], 100, 1800, 520, { step: 150, front: true }),
      decor('lantern', 1850, groundY, { front: true }),
      decor('shell', 1930, groundY),
      decor('crate', 2000, groundY),
    ],
    weather: 'bubbles',
    subtitle: 'Glowtide Shallows — bioluminescent reef, divers at work.',
  };
}

// ---------------------------------------------------------------------------
// lantern_deeps — dark; the Lamplighter's haunt.
// ---------------------------------------------------------------------------
function lanternDeeps(): MapDef {
  const W = 2400, H = 640, groundY = H - 48; // 592
  return {
    id: 'lantern_deeps',
    name: 'Lantern Deeps',
    region: 'lanternreef',
    theme: 'lanternreef',
    music: 'reef',
    width: W,
    height: H,
    levelRange: [26, 29],
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
      portal('to_shallows', 50, groundY, 'glowtide_shallows', 'to_deeps', { label: 'To Glowtide Shallows' }),
      portal('to_galleon', 2350, groundY, 'sunken_galleon', 'to_deeps', { label: 'To The Sunken Galleon' }),
    ],
    npcs: [
      placeNpc('npc_lamplighter', 1200, groundY),
    ],
    spawns: [
      mspawn('glimmerfish', 7, { x1: 150, x2: 2300, y1: 340, y2: 470 }),
      mspawn('coral_golem', 7, { x1: 150, x2: 2300, y1: 520, y2: groundY + 10 }),
      mspawn('abyss_eel', 7, { x1: 150, x2: 2300, y1: 350, y2: 540 }),
      mspawn('drowned_sailor', 7, { x1: 1400, x2: 2350, y1: 520, y2: groundY + 10 }),
    ],
    gather: [
      gnode('node_pearl', 780, 540),
      gnode('node_lanternmoss', 1350, 470),
      gnode('node_coralite', 2000, 370),
      gnode('node_pearl', 2300, 260),
    ],
    decor: [
      ...decorRow(['coral', 'shell', 'lantern', 'crystal'], 30, 2370, groundY, { step: 70 }),
      ...decorRow(['lantern', 'coral', 'shell'], 100, 2150, 540, { step: 150, front: true }),
    ],
    weather: 'bubbles',
    dark: true,
    subtitle: 'Lantern Deeps — cold water and a lone drifting light.',
  };
}

// ---------------------------------------------------------------------------
// sunken_galleon — Boss: Captain Vashti Rook (L30)
// ---------------------------------------------------------------------------
function sunkenGalleon(): MapDef {
  const W = 2000, H = 620, groundY = H - 48; // 572
  return {
    id: 'sunken_galleon',
    name: 'The Sunken Galleon',
    region: 'lanternreef',
    theme: 'galleon',
    music: 'galleon',
    width: W,
    height: H,
    levelRange: [29, 30],
    spawnPoint: { x: 120, y: groundY - 30 },
    platforms: [
      ground(W, groundY),
      plat(100, 520, 220), plat(420, 520, 180), plat(750, 520, 260), plat(1100, 520, 200), plat(1450, 520, 220),
      plat(250, 450, 180), plat(600, 450, 220), plat(950, 450, 160), plat(1300, 450, 200),
      plat(1750, 340, 150), // secret ledge
      ...stairs(60, 565, 4, 40, -38, 70),
    ],
    ropes: [
      rope(300, 450, 520), rope(750, 450, 520), rope(1350, 450, 520),
      rope(1770, 340, 450),
    ],
    portals: [
      portal('to_deeps', 50, groundY, 'lantern_deeps', 'to_galleon', { label: 'To Lantern Deeps' }),
    ],
    npcs: [],
    spawns: [
      mspawn('drowned_sailor', 12, { x1: 150, x2: 1900, y1: 430, y2: groundY + 10 }),
      mspawn('abyss_eel', 6, { x1: 200, x2: 1800, y1: 340, y2: 520 }),
    ],
    gather: [
      gnode('node_pearl', 780, 520),
      gnode('node_lanternmoss', 1350, 450),
      gnode('node_coralite', 1750, 340),
    ],
    decor: [
      ...decorRow(['mast', 'barrel', 'chest', 'anchor', 'bones'], 30, 1970, groundY, { step: 70 }),
      ...decorRow(['mast', 'barrel'], 100, 1450, 520, { step: 150, front: true }),
    ],
    boss: { monsterId: 'captain_rook', x: 1850, y: groundY, respawnMs: 180000 , reqs: [{ type: 'quest', questId: 'mq_16_captain', state: ['active', 'ready', 'completed'] }] },
    weather: 'fireflies',
    dark: true,
    subtitle: 'The Sunken Galleon — Captain Rook still walks her decks.',
  };
}

export const LANTERNREEF_MAPS: MapDef[] = [glowtideShallows(), lanternDeeps(), sunkenGalleon()];
