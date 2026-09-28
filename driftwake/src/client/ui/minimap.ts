import { el } from './dom';
import { bus } from '../events';
import { MAPS, QUESTS } from '@shared/data';
import { npcQuestMarker } from '@shared/logic';
import type { GameSession } from '../session';

const W = 190, H = 110;

export interface MinimapHandle { root: HTMLElement; cleanup: () => void }

/** Active quests' unresolved 'visit' objective target map ids — used to highlight the portal(s)
 *  that lead toward them, so the minimap can point at "where do I go next" and not just "where
 *  is everything". */
function questVisitTargetMaps(session: GameSession): Set<string> {
  const targets = new Set<string>();
  const st = session.state;
  for (const [questId, qp] of Object.entries(st.quests)) {
    if (qp.state !== 'active') continue;
    const def = QUESTS[questId];
    if (!def) continue;
    def.objectives.forEach((o, i) => {
      if (o.type === 'visit' && (qp.progress?.[i] ?? 0) < 1) targets.add(o.mapId);
    });
  }
  return targets;
}

export function createMinimap(session: GameSession): MinimapHandle {
  const nameEl = el('div', { class: 'dw-minimap-name' }, 'Unknown');
  const canvas = el('canvas', { width: W, height: H }) as HTMLCanvasElement;
  const root = el('div', { class: 'dw-panel dw-minimap' }, nameEl, canvas);
  const ctx = canvas.getContext('2d')!;

  const off = bus.on('world:minimap', (m) => {
    nameEl.textContent = MAPS[m.mapId]?.name ?? prettyMapName(m.mapId);
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(20,30,50,0.4)';
    ctx.fillRect(0, 0, W, H);
    const sx = (W - 8) / Math.max(1, m.width);
    const sy = (H - 8) / Math.max(1, m.height);
    const tx = (x: number) => 4 + x * sx;
    const ty = (y: number) => 4 + y * sy;

    ctx.strokeStyle = 'rgba(232,196,119,0.5)';
    ctx.strokeRect(2, 2, W - 4, H - 4);

    const pulse = 2 + Math.sin(performance.now() / 180) * 1.2;
    const visitTargets = questVisitTargetMaps(session);

    ctx.fillStyle = '#66ccff';
    for (const p of m.portals) {
      if (visitTargets.has(p.to)) {
        ctx.save();
        ctx.strokeStyle = '#7dffb3'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(tx(p.x), ty(p.y), 5 + pulse, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = '#7dffb3';
        ctx.beginPath(); ctx.arc(tx(p.x), ty(p.y), 3, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      } else {
        ctx.fillStyle = '#66ccff';
        ctx.fillRect(tx(p.x) - 2, ty(p.y) - 2, 4, 4);
      }
    }

    for (const n of m.npcs) {
      const marker = npcQuestMarker(session.state, n.id);
      if (marker) {
        ctx.save();
        ctx.strokeStyle = marker === '?' ? '#7dffb3' : marker === '…' ? '#9fd4ff' : '#ffe066';
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(tx(n.x), ty(n.y), 4.5 + pulse, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = ctx.strokeStyle as string;
        ctx.beginPath(); ctx.arc(tx(n.x), ty(n.y), 2.4, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      } else {
        ctx.fillStyle = '#e8c477';
        ctx.beginPath(); ctx.arc(tx(n.x), ty(n.y), 2, 0, Math.PI * 2); ctx.fill();
      }
    }

    for (const mo of m.monsters) {
      ctx.fillStyle = mo.boss ? '#ff5555' : '#ff9a9a';
      const r = mo.boss ? 3.5 : 1.6;
      ctx.beginPath(); ctx.arc(tx(mo.x), ty(mo.y), r, 0, Math.PI * 2); ctx.fill();
    }

    ctx.fillStyle = '#4fd8c4';
    for (const o of m.others) { ctx.beginPath(); ctx.arc(tx(o.x), ty(o.y), 1.8, 0, Math.PI * 2); ctx.fill(); }

    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(tx(m.player.x), ty(m.player.y), 2.6, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1;
    ctx.strokeRect(tx(m.player.x) - 4, ty(m.player.y) - 4, 8, 8);
  });
  return { root, cleanup: off };
}

function prettyMapName(id: string): string {
  return id.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
