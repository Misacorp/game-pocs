/**
 * QA debug handle: window.__dw. Harmless helpers for manual testing — teleporting, spawning
 * monsters, toggling invincibility and inspecting state. Never called by game logic itself.
 */
import type Phaser from 'phaser';
import { MAPS, MONSTERS } from '@shared/data';
import { session } from '../session';
import { FIXTURE_IDS } from './fixtures';

let godmodeOn = false;
export function isGodmode(): boolean { return godmodeOn; }

interface WorldSceneDevApi {
  devSpawnMonster(monsterId: string, offsetX?: number): void;
  devTeleport(mapId: string, portalId?: string): void;
}

export function installDevHandle(game: Phaser.Game): void {
  const worldScene = () => game.scene.getScene('World') as unknown as WorldSceneDevApi | null;

  (window as unknown as { __dw: unknown }).__dw = {
    /** Change map immediately (goes through the normal changeMap action + mapChanged flow). */
    teleport(mapId: string, portalId?: string) { session.dispatch({ type: 'changeMap', mapId, portalId }); },
    /** Spawn a monster near the player (does not respawn on death). */
    spawnMonster(monsterId: string, offsetX = 60) { worldScene()?.devSpawnMonster(monsterId, offsetX); },
    /** Toggle (or force) invincibility. */
    godmode(on: boolean = !godmodeOn) { godmodeOn = on; console.log(`[dw] godmode ${on ? 'ON' : 'OFF'}`); return godmodeOn; },
    /** Print (and return) the live character state. */
    state() { console.log(session.state); return session.state; },
    stats() { console.log(session.stats); return session.stats; },
    /** List known map/monster ids (real data first, fixtures appended). */
    maps() { return [...Object.keys(MAPS), ...FIXTURE_IDS.maps.filter((id) => !MAPS[id])]; },
    monsters() { return [...Object.keys(MONSTERS), ...FIXTURE_IDS.monsters.filter((id) => !MONSTERS[id])]; },
    /** Give the player full HP/MP right now (client-side only; syncs on the next vitals sync). */
    heal() { session.setVitals(session.stats.maxHp, session.stats.maxMp); },
  };
  console.log('[dw] dev handle installed — window.__dw.{teleport,spawnMonster,godmode,state,stats,maps,monsters,heal}');
}
