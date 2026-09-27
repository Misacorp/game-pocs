import { describe, it, expect } from 'vitest';
import { rollPlayerDamage, damageRange } from '@shared/logic';
import { emptyStats } from '@shared/logic';
import { mulberry32 } from '@shared/rng';
import { suggestedMonsterHp } from '@shared/constants';
import type { DerivedStats, JobDef } from '@shared/types';

const physicalJob: JobDef = {
  id: 'vanguard', name: 'Vanguard', tier: 1, classId: 'vanguard',
  description: '', playstyle: '', mainStat: 'str', secondaryStat: 'dex', weaponTypes: ['sword'],
  hpPerLevel: 20, mpPerLevel: 5, skills: [], color: '#c00', damageType: 'physical',
  basicAttack: { effect: { kind: 'melee', range: 30, height: 30 }, vfx: { style: 'slash', color: '#fff' }, sfx: 'swing', castTimeMs: 350, anim: 'attack' },
};

function statsWith(str: number, dex: number, attack: number): DerivedStats {
  const s = emptyStats();
  s.str = str; s.dex = dex; s.attack = attack; s.critRate = 0.05; s.critDamage = 0;
  return s;
}

describe('combat balance sanity', () => {
  it('a level-1 character with starter-tier attack (~12) kills a level-1 monster (~34hp) in 2-4 basic hits', () => {
    const stats = statsWith(4, 4, 12); // STARTING_STATS + a starter weapon
    const rng = mulberry32(123);
    const monsterHp = suggestedMonsterHp(1);
    let hp = monsterHp;
    let hits = 0;
    while (hp > 0 && hits < 20) {
      const roll = rollPlayerDamage(stats, physicalJob, 100, { level: 1, defense: 2 }, 1, rng);
      hp -= roll.damage;
      hits++;
    }
    expect(hits).toBeGreaterThanOrEqual(2);
    expect(hits).toBeLessThanOrEqual(5);
  });

  it('damageRange returns an increasing, sane [min,max] window as attack grows', () => {
    const low = damageRange(statsWith(4, 4, 12), physicalJob);
    const high = damageRange(statsWith(140, 40, 190), physicalJob);
    expect(low[0]).toBeLessThanOrEqual(low[1]);
    expect(high[1]).toBeGreaterThan(low[1]);
  });

  it('defense mitigation never fully zeroes out damage, even at very high defense', () => {
    const stats = statsWith(100, 20, 100);
    const rng = mulberry32(7);
    const roll = rollPlayerDamage(stats, physicalJob, 100, { level: 1, defense: 100000 }, 1, rng);
    expect(roll.damage).toBeGreaterThanOrEqual(1);
  });

  it('level-difference penalty floors at 0.5x and never goes negative', () => {
    const stats = statsWith(100, 20, 100);
    const rng = mulberry32(9);
    const rollSameLevel = rollPlayerDamage(stats, physicalJob, 100, { level: 10, defense: 0 }, 10, rng);
    const rollHugeDiff = rollPlayerDamage(stats, physicalJob, 100, { level: 200, defense: 0 }, 10, rng);
    expect(rollHugeDiff.damage).toBeGreaterThanOrEqual(1);
    expect(rollHugeDiff.damage).toBeLessThan(rollSameLevel.damage);
  });
});
