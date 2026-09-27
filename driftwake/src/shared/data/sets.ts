import type { StatMods } from '../types';

/** Equipment set: bonuses unlock at piece counts. */
export interface SetDef {
  id: string;
  name: string;
  /** item ids in the set */
  pieces: string[];
  bonuses: { count: number; stats: StatMods }[];
}

export const SET_LIST: SetDef[] = [];
