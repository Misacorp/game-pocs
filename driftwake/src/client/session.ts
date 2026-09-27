/**
 * GameSession — the client's single source of truth for the logged-in character.
 *
 *  - Holds the latest authoritative CharacterState + derived stats.
 *  - `dispatch(action)` sends intents to the Backend and fans results out on the bus.
 *  - Holds engine-owned runtime vitals (hp/mp change every frame in combat; synced periodically).
 *  - Holds client-side cooldowns for skills/items.
 */
import type { CharacterState, DerivedStats, JobDef } from '@shared/types';
import type { ActionResult, ClientAction } from '@shared/protocol';
import { computeStats } from '@shared/logic';
import { JOBS } from '@shared/data';
import type { Backend } from './net';
import { bus } from './events';

export class GameSession {
  state!: CharacterState;
  stats!: DerivedStats;
  /** Runtime vitals — the engine mutates via setVitals(). */
  hp = 0;
  mp = 0;
  /** key -> {readyAt, duration} using performance.now() ms */
  cooldowns: Record<string, { readyAt: number; duration: number }> = {};
  private syncTimer: number | null = null;
  private queue: Promise<unknown> = Promise.resolve();

  constructor(readonly backend: Backend) {}

  get job(): JobDef { return JOBS[this.state.jobId]; }
  get inWorld(): boolean { return !!this.state; }

  async enter(characterId: string): Promise<void> {
    const st = await this.backend.enterWorld(characterId);
    this.applyState(st);
    this.hp = Math.min(st.hp > 0 ? st.hp : this.stats.maxHp, this.stats.maxHp);
    this.mp = Math.min(st.mp >= 0 ? st.mp : this.stats.maxMp, this.stats.maxMp);
    this.emitVitals();
    if (this.syncTimer !== null) clearInterval(this.syncTimer);
    this.syncTimer = window.setInterval(() => this.syncVitals(), 5000);
  }

  async leave(): Promise<void> {
    await this.syncVitals();
    if (this.syncTimer !== null) clearInterval(this.syncTimer);
    this.syncTimer = null;
    await this.backend.leaveWorld();
  }

  private lastSyncAt = performance.now();
  /** Engine-reported player position (updated by engine each frame). */
  position = { x: 0, y: 0 };

  async syncVitals(): Promise<void> {
    if (!this.state) return;
    const now = performance.now();
    const playTimeMs = Math.round(now - this.lastSyncAt);
    this.lastSyncAt = now;
    await this.dispatch({ type: 'syncVitals', hp: Math.round(this.hp), mp: Math.round(this.mp), x: Math.round(this.position.x), y: Math.round(this.position.y), playTimeMs }, { silent: true });
  }

  /**
   * Send an action. Actions are serialized (queued) so results apply in order.
   * silent: don't emit 'state' if nothing but vitals changed.
   */
  dispatch(action: ClientAction, opts: { silent?: boolean } = {}): Promise<ActionResult> {
    const p = this.queue.then(async () => {
      let res: ActionResult;
      try {
        res = await this.backend.send(action);
      } catch (e) {
        console.error('[session] dispatch failed', action, e);
        res = { ok: false, error: String((e as Error).message ?? e), events: [], state: this.state };
      }
      if (res.state) this.applyState(res.state, opts.silent && res.events.length === 0);
      for (const ev of res.events) {
        this.onGameEvent(ev);
        bus.emit('game', ev);
      }
      if (!res.ok && res.error && !opts.silent) bus.emit('ui:toast', { text: res.error, kind: 'error' });
      return res;
    });
    this.queue = p.catch(() => undefined);
    return p;
  }

  private onGameEvent(ev: import('@shared/protocol').GameEvent) {
    switch (ev.type) {
      case 'heal':
        this.hp = Math.min(this.stats.maxHp, this.hp + ev.hp);
        this.mp = Math.min(this.stats.maxMp, this.mp + ev.mp);
        this.emitVitals();
        break;
      case 'levelUp':
        this.hp = this.stats.maxHp;
        this.mp = this.stats.maxMp;
        this.emitVitals();
        break;
      case 'respawned':
        this.hp = this.state.hp > 0 ? this.state.hp : this.stats.maxHp;
        this.mp = this.state.mp;
        this.emitVitals();
        break;
      case 'itemUsed':
        if (ev.cooldownMs) this.setCooldown(`item:${ev.cooldownGroup ?? ev.itemId}`, ev.cooldownMs);
        break;
    }
  }

  applyState(st: CharacterState, silent = false) {
    this.state = st;
    this.stats = computeStats(st, Date.now());
    this.hp = Math.min(this.hp, this.stats.maxHp);
    this.mp = Math.min(this.mp, this.stats.maxMp);
    if (!silent) bus.emit('state', { state: st, stats: this.stats });
  }

  /** Recompute derived stats (e.g. buffs expired). */
  refreshStats() {
    this.applyState(this.state);
  }

  setVitals(hp: number, mp: number) {
    const nhp = Math.max(0, Math.min(this.stats.maxHp, hp));
    const nmp = Math.max(0, Math.min(this.stats.maxMp, mp));
    if (Math.round(nhp) !== Math.round(this.hp) || Math.round(nmp) !== Math.round(this.mp)) {
      this.hp = nhp; this.mp = nmp;
      this.emitVitals();
    } else {
      this.hp = nhp; this.mp = nmp;
    }
  }

  emitVitals() {
    bus.emit('vitals', { hp: this.hp, mp: this.mp, maxHp: this.stats.maxHp, maxMp: this.stats.maxMp });
  }

  setCooldown(key: string, durationMs: number) {
    this.cooldowns[key] = { readyAt: performance.now() + durationMs, duration: durationMs };
    bus.emit('cooldowns', this.cooldowns);
  }

  isReady(key: string): boolean {
    const c = this.cooldowns[key];
    return !c || c.readyAt <= performance.now();
  }
}

/** Global singleton, set in main.ts once the backend is created. */
export let session: GameSession;
export function setSession(s: GameSession) { session = s; }
