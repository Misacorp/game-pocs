import type { CharacterState } from '../types';
import type { ClientAction, GameEvent } from '../protocol';
import type { ServerContext } from './context';

export interface ReducerResult { ok: boolean; error?: string; state: CharacterState; events: GameEvent[] }

/**
 * The authoritative action handler. Never mutates the input state (clone first).
 * STUB — replaced by the logic implementation.
 */
export function handleAction(state: CharacterState, action: ClientAction, ctx: ServerContext): ReducerResult {
  const s: CharacterState = structuredClone(state);
  const events: GameEvent[] = [];
  switch (action.type) {
    case 'syncVitals': s.hp = action.hp; s.mp = action.mp; s.position = { x: action.x, y: action.y }; break;
    case 'changeMap': s.mapId = action.mapId; events.push({ type: 'mapChanged', mapId: action.mapId, portalId: action.portalId, x: -1, y: -1 }); break;
    case 'killMonster': s.xp += 5; events.push({ type: 'xp', amount: 5 }); break;
    default: return { ok: false, error: `unhandled action ${action.type}`, state, events };
  }
  s.updatedAt = ctx.now;
  return { ok: true, state: s, events };
}
