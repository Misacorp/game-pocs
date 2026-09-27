import type { MapDef } from '../../types';
import { DRIFTMOOR_MAPS } from './driftmoor';
import { FINREACH_MAPS } from './finreach';
import { STORMBREAK_MAPS } from './stormbreak';
import { LANTERNREEF_MAPS } from './lanternreef';
import { HOLLOW_MAPS } from './hollow';

/**
 * Geometry normalization applied to every authored map so small authoring slips can't
 * make a map untraversable:
 *  - platforms are clamped inside the map bounds;
 *  - every rope/ladder's bottom is extended down to the nearest platform surface beneath it,
 *    so the player can always grab it from the floor below.
 */
function normalizeMap(m: MapDef): MapDef {
  const platforms = m.platforms.map((p) => {
    const x = Math.max(0, Math.min(p.x, m.width - 16));
    const w = Math.max(16, Math.min(p.w, m.width - x));
    return x === p.x && w === p.w ? p : { ...p, x, w };
  });
  const ropes = m.ropes.map((r) => {
    const below = platforms
      .filter((p) => r.x >= p.x && r.x <= p.x + p.w && p.y >= r.bottom - 4)
      .sort((a, b) => a.y - b.y)[0];
    return below && below.y !== r.bottom ? { ...r, bottom: below.y } : r;
  });
  return { ...m, platforms, ropes };
}

export const MAP_LIST: MapDef[] = [...DRIFTMOOR_MAPS, ...FINREACH_MAPS, ...STORMBREAK_MAPS, ...LANTERNREEF_MAPS, ...HOLLOW_MAPS].map(normalizeMap);
