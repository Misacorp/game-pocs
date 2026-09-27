import type {
  PlatformDef, PlatformType, RopeDef, SpawnDef, GatherPlacement, DecorDef, DecorKind,
  MapNpcPlacement, PortalDef, Condition,
} from '../../types';

/** Full-width ground floor. */
export function ground(width: number, y: number): PlatformDef {
  return { x: 0, y, w: width, type: 'ground' };
}

export function plat(x: number, y: number, w: number, type: PlatformType = 'oneway'): PlatformDef {
  return { x, y, w, type };
}

/** A staircase of `n` small platforms climbing (or descending) from (x,y) by (dx,dy) each step. */
export function stairs(x: number, y: number, n: number, dx: number, dy: number, w: number, type: PlatformType = 'oneway'): PlatformDef[] {
  const out: PlatformDef[] = [];
  for (let i = 0; i < n; i++) out.push(plat(x + dx * i, y + dy * i, w, type));
  return out;
}

export function rope(x: number, top: number, bottom: number, kind: 'rope' | 'ladder' = 'rope'): RopeDef {
  return { x, top, bottom, kind };
}

export function mspawn(monsterId: string, count: number, opts?: { x1?: number; x2?: number; y1?: number; y2?: number; respawnMs?: number }): SpawnDef {
  return { monsterId, count, ...opts };
}

export function gnode(nodeId: string, x: number, y: number): GatherPlacement {
  return { nodeId, x, y };
}

export function decor(kind: DecorKind, x: number, y: number, opts?: { scale?: number; flip?: boolean; front?: boolean }): DecorDef {
  return { kind, x, y, ...opts };
}

export function placeNpc(npcId: string, x: number, y: number, flip?: boolean): MapNpcPlacement {
  return { npcId, x, y, flip };
}

export function portal(id: string, x: number, y: number, to: string, toPortal: string, opts?: { label?: string; reqs?: Condition[]; lockedText?: string }): PortalDef {
  return { id, x, y, to, toPortal, ...opts };
}

/** A row of decor spread evenly between xStart..xEnd along y, cycling through `kinds`. */
export function decorRow(kinds: DecorKind[], xStart: number, xEnd: number, y: number, opts?: { front?: boolean; scale?: number; step?: number }): DecorDef[] {
  const out: DecorDef[] = [];
  const step = opts?.step ?? 90;
  const n = Math.max(1, Math.round((xEnd - xStart) / step));
  for (let i = 0; i <= n; i++) {
    const x = xStart + (n === 0 ? 0 : (xEnd - xStart) * (i / n));
    const kind = kinds[i % kinds.length];
    out.push(decor(kind, Math.round(x), y, { front: opts?.front, scale: opts?.scale }));
  }
  return out;
}
