import type { MapDef } from '../../types';
import { DRIFTMOOR_MAPS } from './driftmoor';
import { FINREACH_MAPS } from './finreach';
import { STORMBREAK_MAPS } from './stormbreak';
import { LANTERNREEF_MAPS } from './lanternreef';
import { HOLLOW_MAPS } from './hollow';

export const MAP_LIST: MapDef[] = [...DRIFTMOOR_MAPS, ...FINREACH_MAPS, ...STORMBREAK_MAPS, ...LANTERNREEF_MAPS, ...HOLLOW_MAPS];
