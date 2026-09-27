/**
 * Status effect tracking for monsters (and occasionally the player, e.g. boss stuns).
 * Pure client-side, real-time; not persisted.
 */
import type { StatusKind, StatusOnHit } from '@shared/types';

export interface StatusInstance {
  kind: StatusKind;
  expiresAt: number;
  power: number;
  /** next dot tick timestamp (burn/poison/bleed) */
  nextTickAt: number;
}

/** Visual tint per status kind (0xRRGGBB), used to tint the sprite while active. */
export const STATUS_TINT: Record<StatusKind, number> = {
  slow: 0x88aaff,
  stun: 0xffe066,
  burn: 0xff6633,
  poison: 0x66dd55,
  freeze: 0x99e6ff,
  weaken: 0xbb88ff,
  bleed: 0xdd3355,
  mark: 0xff3388,
};

export class StatusEffects {
  private active = new Map<StatusKind, StatusInstance>();
  immune = new Set<StatusKind>();

  apply(kind: StatusKind, durationMs: number, power: number, now: number): boolean {
    if (this.immune.has(kind)) return false;
    const existing = this.active.get(kind);
    if (existing) {
      existing.expiresAt = Math.max(existing.expiresAt, now + durationMs);
      existing.power = Math.max(existing.power, power);
      return true;
    }
    this.active.set(kind, { kind, expiresAt: now + durationMs, power, nextTickAt: now + 1000 });
    return true;
  }

  /** Try to apply a StatusOnHit roll (chance check done by caller or here). */
  rollAndApply(status: StatusOnHit | undefined, now: number, rng: () => number = Math.random): void {
    if (!status) return;
    if (rng() > status.chance) return;
    this.apply(status.kind, status.durationMs, status.power ?? 0, now);
  }

  has(kind: StatusKind, now: number): boolean {
    const s = this.active.get(kind);
    return !!s && s.expiresAt > now;
  }

  isStunned(now: number): boolean {
    return this.has('stun', now) || this.has('freeze', now);
  }

  /** Movement speed multiplier from slow/freeze. */
  speedMult(now: number): number {
    let m = 1;
    const slow = this.active.get('slow');
    if (slow && slow.expiresAt > now) m *= 1 - Math.min(0.9, slow.power || 0.4);
    if (this.has('freeze', now)) m = 0;
    return m;
  }

  /** Extra damage-taken fraction from weaken/mark. */
  damageTakenBonus(now: number): number {
    let b = 0;
    const w = this.active.get('weaken');
    if (w && w.expiresAt > now) b += w.power || 0.2;
    const mk = this.active.get('mark');
    if (mk && mk.expiresAt > now) b += mk.power || 0.2;
    return b;
  }

  /** Advance dot ticks; calls onTick(kind, fractionPower) once per second while active. Returns total pending ticks handled. */
  update(now: number, onDotTick: (kind: StatusKind, power: number) => void): void {
    for (const [kind, s] of [...this.active]) {
      if (s.expiresAt <= now) { this.active.delete(kind); continue; }
      if ((kind === 'burn' || kind === 'poison' || kind === 'bleed') && now >= s.nextTickAt) {
        s.nextTickAt = now + 1000;
        onDotTick(kind, s.power);
      }
    }
  }

  /** Current tint to apply to the sprite, or null for none. Priority: freeze > stun > burn > poison > bleed > weaken/mark > slow. */
  currentTint(now: number): number | null {
    const order: StatusKind[] = ['freeze', 'stun', 'burn', 'poison', 'bleed', 'mark', 'weaken', 'slow'];
    for (const k of order) if (this.has(k, now)) return STATUS_TINT[k];
    return null;
  }

  list(now: number): StatusInstance[] {
    return [...this.active.values()].filter((s) => s.expiresAt > now);
  }

  clear(): void { this.active.clear(); }
}
