/**
 * QA debug handle: window.__dw. Harmless helpers for manual testing — teleporting, spawning
 * monsters, toggling invincibility and inspecting state. Never called by game logic itself.
 */
import type Phaser from 'phaser';
import type { HotbarEntry, JobId } from '@shared/types';
import { HOTBAR_SIZE } from '@shared/constants';
import { MAPS, MONSTERS, JOB_LIST } from '@shared/data';
import { session } from '../session';
import { bus } from '../events';
import { FIXTURE_IDS, getJobDefOrFallback, getSkillDef } from './fixtures';

let godmodeOn = false;
export function isGodmode(): boolean { return godmodeOn; }

interface WorldSceneDevApi {
  devSpawnMonster(monsterId: string, offsetX?: number): void;
  devSpawnDummy(offsetX?: number): void;
  devForceMap(mapId: string, x?: number, y?: number): void;
}

export function installDevHandle(game: Phaser.Game): void {
  const worldScene = () => game.scene.getScene('World') as unknown as WorldSceneDevApi | null;

  (window as unknown as { __dw: unknown }).__dw = {
    /** Change map immediately (goes through the normal changeMap action + mapChanged flow — respects portal reqs). */
    teleport(mapId: string, portalId?: string) { session.dispatch({ type: 'changeMap', mapId, portalId }); },
    /** QA-only: jump straight to any map bypassing portal adjacency/reqs (e.g. to reach a boss map directly). */
    forceMap(mapId: string, x?: number, y?: number) { worldScene()?.devForceMap(mapId, x, y); },
    /** Spawn a monster near the player (does not respawn on death). */
    spawnMonster(monsterId: string, offsetX = 60) { worldScene()?.devSpawnMonster(monsterId, offsetX); },
    /** Spawn a stationary, unkillable training dummy near the player — safe target for testing every skill. */
    dummy(offsetX = 60) { worldScene()?.devSpawnDummy(offsetX); },
    /** Toggle (or force) invincibility. */
    godmode(on: boolean = !godmodeOn) { godmodeOn = on; console.log(`[dw] godmode ${on ? 'ON' : 'OFF'}`); return godmodeOn; },
    /** Print (and return) the live character state. */
    state() { console.log(session.state); return session.state; },
    stats() { console.log(session.stats); return session.stats; },
    /** List known map/monster ids (real data first, fixtures appended). */
    maps() { return [...Object.keys(MAPS), ...FIXTURE_IDS.maps.filter((id) => !MAPS[id])]; },
    monsters() { return [...Object.keys(MONSTERS), ...FIXTURE_IDS.monsters.filter((id) => !MONSTERS[id])]; },
    jobs() { return JOB_LIST.map((j) => j.id); },
    /** Give the player full HP/MP right now (client-side only; syncs on the next vitals sync). */
    heal() { session.setVitals(session.stats.maxHp, session.stats.maxMp); },
    /**
     * QA-only: force the live character straight into a job (tier1 or tier2), bypassing the level-15
     * job-advance quest gate, and wipes learned skills (so passives/flash-jump detection reflect only
     * the new job). Client-side session mutation only — never dispatched to the reducer.
     */
    setJob(jobId: JobId) {
      const def = getJobDefOrFallback(jobId);
      const s = session.state;
      s.classId = def.classId; s.jobId = jobId; s.skills = {};
      if (s.level < (def.tier === 2 ? 25 : 5)) s.level = def.tier === 2 ? 25 : 5;
      session.applyState(s);
      session.setVitals(session.stats.maxHp, session.stats.maxMp);
      console.log(`[dw] job set to ${jobId} (${def.name}, tier ${def.tier})`);
    },
    /** QA-only: set character level directly (recomputes stats, heals to full). */
    setLevel(n: number) {
      session.state.level = Math.max(1, Math.round(n));
      session.applyState(session.state);
      session.setVitals(session.stats.maxHp, session.stats.maxMp);
    },
    /** QA-only: learn every skill of the CURRENT job at max level. */
    learnAll() {
      const def = getJobDefOrFallback(session.state.jobId);
      for (const id of def.skills) {
        const skill = getSkillDef(id);
        session.state.skills[id] = skill?.maxLevel ?? 10;
      }
      session.applyState(session.state);
      console.log(`[dw] learned all ${def.skills.length} skills for ${def.id}`);
    },
    /** QA-only: fill the hotbar with the current job's skills in order (so real hotbar-key casting can be tested). */
    fillHotbar() {
      const def = getJobDefOrFallback(session.state.jobId);
      const entries: (HotbarEntry | null)[] = Array.from({ length: HOTBAR_SIZE }, (_, i) => (def.skills[i] ? { kind: 'skill', id: def.skills[i] } : null));
      session.state.hotbar = entries;
      session.applyState(session.state);
    },
    /** Convenience: setJob + learnAll + fillHotbar + full heal, in one call. */
    /** QA-only: the event bus, so a test script can subscribe to e.g. 'ui:bossBar'/'ui:banner'. */
    bus,
    async prepJob(jobId: JobId) {
      const dw = (window as any).__dw;
      dw.setJob(jobId);
      dw.learnAll();
      dw.fillHotbar();
      dw.heal();
    },
  };
  console.log('[dw] dev handle installed — window.__dw.{teleport,forceMap,spawnMonster,dummy,godmode,state,stats,maps,monsters,jobs,heal,setJob,setLevel,learnAll,fillHotbar,prepJob}');
}
