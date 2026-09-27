/**
 * Client-side transient skill buffs (e.g. war cries, elixir-like skill buffs), separate from
 * the persisted CharacterState.buffs which the server/session already folds into computeStats().
 * These are merged on top so combat math (damage/speed/etc) reacts instantly to a cast.
 */
import type { DerivedStats, StatMods, SkillIconSpec } from '@shared/types';
import { addMods, emptyStats } from '@shared/logic';
import { bus } from '../events';

export interface SkillBuff {
  id: string;
  name: string;
  stats: StatMods;
  expiresAt: number;
  icon?: SkillIconSpec;
}

export class BuffManager {
  private buffs = new Map<string, SkillBuff>();
  private dirty = true;

  add(buff: SkillBuff): void {
    this.buffs.set(buff.id, buff);
    this.dirty = true;
  }

  has(id: string): boolean { return this.buffs.has(id); }

  update(now: number): void {
    for (const [id, b] of [...this.buffs]) {
      if (b.expiresAt <= now) { this.buffs.delete(id); this.dirty = true; }
    }
    if (this.dirty) {
      this.dirty = false;
      bus.emit('buffs', [...this.buffs.values()].map((b) => ({ id: b.id, name: b.name, expiresAt: b.expiresAt, icon: b.icon })));
    }
  }

  /** Merge active buff stat mods on top of the given base stats (does not mutate base). */
  apply(base: DerivedStats): DerivedStats {
    if (this.buffs.size === 0) return base;
    const out: DerivedStats = { ...base };
    for (const b of this.buffs.values()) addMods(out, b.stats);
    return out;
  }

  /** Merge arbitrary extra mods (e.g. always-on passives) additively; used alongside apply(). */
  static mergeExtra(base: DerivedStats, extra: StatMods | undefined): DerivedStats {
    if (!extra) return base;
    const out: DerivedStats = { ...base };
    return addMods(out, extra);
  }

  static empty(): DerivedStats { return emptyStats(); }

  clear(): void { this.buffs.clear(); this.dirty = true; }
}
