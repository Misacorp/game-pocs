import type { LootDrop } from '../protocol';
import type { Rng } from '../rng';

/** Per-connection transient server state (not persisted). */
export interface SessionState {
  pendingDrops: Record<string, { drop: LootDrop; mapId: string; expiresAt: number }>;
  /** nodeKey(mapId:index) -> ready time */
  nodeCooldowns: Record<string, number>;
  /** cooldown group -> ready time */
  itemCooldowns: Record<string, number>;
  /** bosses killed this session: monsterId -> time (for respawn gating) */
  bossKills: Record<string, number>;
  dropSeq: number;
}

export interface ServerContext {
  now: number;
  rng: Rng;
  session: SessionState;
  uid: () => string;
}

export function createSession(): SessionState {
  return { pendingDrops: {}, nodeCooldowns: {}, itemCooldowns: {}, bossKills: {}, dropSeq: 0 };
}
