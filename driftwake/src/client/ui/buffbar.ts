/**
 * Top-center buff bar (PLAYTEST feedback #4): every active buff — engine-side skill buffs (bus
 * 'buffs') AND persisted food/elixir buffs (CharacterState.buffs) — as a round glass bead with a
 * radial remaining-time ring, a Pixelify countdown, and a tooltip with its name/stats/exact time.
 * Sorted soonest-expiry-first; beads blink in their last 5 seconds.
 *
 * The two sources use different clocks (engine buffs: performance.now(); state buffs: Date.now())
 * — rather than mixing them, each buff's remaining time is captured once at merge time against
 * whichever clock produced it, then ticked forward purely via performance.now() deltas (a
 * monotonic clock either way), so no wall-clock/monotonic mismatch is possible.
 */
import { el, clamp } from './dom';
import { bus } from '../events';
import type { GameSession } from '../session';
import type { StatMods, SkillIconSpec } from '@shared/types';
import { safeSkillIcon } from './icons';
import { attachTooltip } from './tooltip';
import { statLabel, formatStatValue } from './statsFormat';

interface RawBuff { id: string; name: string; icon?: SkillIconSpec; stats?: StatMods }

interface BuffView extends RawBuff {
  /** Remaining ms as of `mergedAtPerf` (performance.now()) — ticked forward from there. */
  remainingAtMerge: number;
  mergedAtPerf: number;
  /** Best-known total duration, for the ring fraction — see file doc comment. */
  totalMs: number;
}

function fmtCountdown(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

export function createBuffBar(_session: GameSession): { root: HTMLElement; cleanup: () => void } {
  const root = el('div', { class: 'dw-buffbar' });

  let engineBuffs: { id: string; name: string; expiresAt: number; icon?: SkillIconSpec; stats?: StatMods }[] = [];
  let stateBuffs: { id: string; name: string; expiresAt: number; icon?: SkillIconSpec }[] = [];
  const totalDurations = new Map<string, number>();
  let views: BuffView[] = [];

  function merge() {
    const now = performance.now();
    const wall = Date.now();
    const raw: (RawBuff & { remaining: number })[] = [
      ...engineBuffs.map((b) => ({ id: b.id, name: b.name, icon: b.icon, stats: b.stats, remaining: b.expiresAt - now })),
      ...stateBuffs.map((b) => ({ id: b.id, name: b.name, icon: b.icon, remaining: b.expiresAt - wall })),
    ].filter((b) => b.remaining > 0);
    views = raw
      .map((b) => {
        const prevTotal = totalDurations.get(b.id) ?? 0;
        const total = Math.max(prevTotal, b.remaining);
        totalDurations.set(b.id, total);
        return { id: b.id, name: b.name, icon: b.icon, stats: b.stats, remainingAtMerge: b.remaining, mergedAtPerf: now, totalMs: total };
      })
      .sort((a, b) => a.remainingAtMerge - b.remainingAtMerge);
    // Drop stale total-duration bookkeeping for buffs no longer present, so a later re-application
    // of the same id is treated as a fresh duration rather than compared against the old one.
    const liveIds = new Set(views.map((v) => v.id));
    for (const id of [...totalDurations.keys()]) if (!liveIds.has(id)) totalDurations.delete(id);
    renderBeads();
  }

  const beadEls = new Map<string, { root: HTMLElement; ring: HTMLElement; time: HTMLElement }>();
  function renderBeads() {
    const liveIds = new Set(views.map((v) => v.id));
    for (const [id, b] of [...beadEls]) if (!liveIds.has(id)) { b.root.remove(); beadEls.delete(id); }
    root.innerHTML = '';
    for (const v of views) {
      let bead = beadEls.get(v.id);
      if (!bead) {
        const ring = el('div', { class: 'dw-buffbead-ring' });
        const time = el('div', { class: 'dw-buffbead-time' });
        const img = el('img', { src: safeSkillIcon(v.icon ? { id: v.id, icon: v.icon } : undefined) });
        const beadRoot = el('div', { class: 'dw-buffbead' }, ring, img, time);
        attachTooltip(beadRoot, () => {
          const view = views.find((x) => x.id === v.id);
          if (!view) return null;
          const remaining = view.remainingAtMerge - (performance.now() - view.mergedAtPerf);
          const nodes: (Node | string)[] = [el('div', { class: 'dw-tt-name' }, view.name)];
          if (view.stats && Object.keys(view.stats).length) {
            nodes.push(el('hr'));
            for (const k in view.stats) {
              const val = (view.stats as any)[k];
              if (!val) continue;
              nodes.push(el('div', { class: 'dw-stat-row' }, el('span', null, statLabel(k as any)), el('span', null, formatStatValue(k as any, val, true))));
            }
          }
          nodes.push(el('div', { class: 'dw-tt-sub', style: { marginTop: '6px' } }, `${fmtCountdown(Math.max(0, remaining))} remaining`));
          return nodes;
        });
        bead = { root: beadRoot, ring, time };
        beadEls.set(v.id, bead);
      }
      root.appendChild(bead.root);
    }
  }

  let raf = 0;
  function tick() {
    const now = performance.now();
    for (const v of views) {
      const bead = beadEls.get(v.id);
      if (!bead) continue;
      const remaining = v.remainingAtMerge - (now - v.mergedAtPerf);
      const pct = clamp((remaining / Math.max(1, v.totalMs)) * 100, 0, 100);
      bead.ring.style.setProperty('--p', String(pct));
      bead.time.textContent = fmtCountdown(Math.max(0, remaining));
      bead.root.classList.toggle('dw-buffbead-blink', remaining <= 5000);
    }
    raf = requestAnimationFrame(tick);
  }
  raf = requestAnimationFrame(tick);

  const offs = [
    bus.on('buffs', (b) => { engineBuffs = b; merge(); }),
    bus.on('state', ({ state }) => { stateBuffs = state.buffs ?? []; merge(); }),
  ];

  return { root, cleanup: () => { offs.forEach((o) => o()); cancelAnimationFrame(raf); } };
}
