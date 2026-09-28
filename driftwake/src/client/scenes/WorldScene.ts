/**
 * WorldScene — the real-time gameplay scene. Started with { mapId, portalId?, x?, y? }.
 * Ties together terrain, player, monsters, npcs, gathering, portals, loot, combat, presence
 * and all engine <-> UI event-bus wiring described in DESIGN.md §10/§12.
 */
import Phaser from 'phaser';
import type { DerivedStats, MonsterDef, Rarity, StatMods } from '@shared/types';
import type { GameEvent } from '@shared/protocol';
import { HOTBAR_SIZE } from '@shared/constants';
import { npcQuestMarker } from '@shared/logic';
import { ITEMS, MONSTERS } from '@shared/data';
import { createParallax, createWeather, spawnVfx, type Parallax, type Weather } from '../gfx';
import { audio } from '../audio';
import { session } from '../session';
import { bus } from '../events';
import { getMapDefOrFallback, getJobDefOrFallback, getSkillDef, getNpcDef, getMonsterDef } from '../dev/fixtures';
import { Player, type PlayerInputState } from '../entities/Player';
import { NpcEntity } from '../entities/Npc';
import type { MonsterEntity } from '../entities/Monster';
import { DropManager } from '../entities/Drop';
import { Pet } from '../entities/Pet';
import { ProjectileManager } from '../entities/Projectile';
import { DamageTextPool } from '../combat/DamageText';
import { BuffManager } from '../combat/Buffs';
import { SkillRunner, buildBasicAttackDescriptor, buildSkillDescriptor, evalScalarMods, type SkillRunnerCtx } from '../combat/SkillRunner';
import { buildTerrain, onewayProcess, CAMERA_BOTTOM_SLACK, type Terrain } from './world/Terrain';
import { InputController } from './world/InputController';
import { Spawner } from './world/Spawner';
import { PortalManager } from './world/PortalManager';
import { GatherManager } from './world/GatherManager';
import { Presence } from './world/Presence';
import { DarkOverlay } from './world/DarkOverlay';

export interface WorldSceneData { mapId: string; portalId?: string; x?: number; y?: number }

const INTERACT_RANGE = 42;
const NPC_TITLE_RANGE = 100;
/** Shifts the follow target down so the player sits ~60% down the screen instead of dead-center,
 *  leaving headroom above and keeping the ground clear of the bottom HUD. */
const CAMERA_FOLLOW_OFFSET_Y = 40;
const HINT_NONE = null as { text: string } | null;

export class WorldScene extends Phaser.Scene {
  private map = getMapDefOrFallback('driftmoor_town');
  private terrain!: Terrain;
  private parallax!: Parallax;
  private weatherFx!: Weather;
  private darkOverlay?: DarkOverlay;
  private input2!: InputController;
  private player!: Player;
  private spawner!: Spawner;
  private npcs: NpcEntity[] = [];
  private gatherMgr!: GatherManager;
  private portalMgr!: PortalManager;
  private drops!: DropManager;
  private pet?: Pet;
  private projectiles!: ProjectileManager;
  private damageText!: DamageTextPool;
  private buffs!: BuffManager;
  private skillRunner!: SkillRunner;
  private presence!: Presence;

  private dropThroughUntil = 0;
  private minimapAccum = 0;
  private hitstopUntil = 0;
  private transitioning = false;
  private passiveMods: StatMods = {};
  private effectiveStats!: DerivedStats;
  private lastHint: { text: string } | null = HINT_NONE;
  private busOffs: (() => void)[] = [];

  constructor() { super('World'); }

  create(data: WorldSceneData): void {
    this.transitioning = false;
    this.hitstopUntil = 0;
    // Phaser reuses this same Scene instance for every future start (map change, or a full
    // quit-to-title + re-enter) — teardown()'s guard must reset here too, or the very next
    // 'shutdown' after the first one this instance ever sees becomes a silent no-op, leaking this
    // session's busOffs/input2/terrain/etc. forever (visible as bus subscriptions piling up across
    // repeated quit-to-title cycles).
    this.torndown = false;
    this.map = getMapDefOrFallback(data.mapId);

    this.physics.world.setBounds(0, 0, this.map.width, this.map.height + CAMERA_BOTTOM_SLACK);
    this.terrain = buildTerrain(this, this.map);

    this.parallax = createParallax(this, this.map.theme, this.map.width, this.map.height);
    this.weatherFx = createWeather(this, this.map.weather ?? 'none');
    this.darkOverlay = undefined;
    if (this.map.dark) this.darkOverlay = new DarkOverlay(this);

    this.damageText = new DamageTextPool(this);
    const spawnPos = this.resolveSpawnPos(data);
    this.player = new Player(this, spawnPos.x, spawnPos.y, {
      ropeAt: (x, y) => this.terrain.ropeAt(x, y),
      inTown: () => !!this.map.town,
      cameraShake: (ms, i) => this.cameraShake(ms, i),
      damageText: this.damageText,
    });

    this.projectiles = new ProjectileManager(this);
    this.buffs = new BuffManager();
    this.drops = new DropManager(this, (x, fromY) => this.terrain.groundYAt(x, fromY));

    const runnerCtx: SkillRunnerCtx = {
      getMonsters: () => this.spawner.monsters,
      getStats: () => this.effectiveStats,
      getJob: () => getJobDefOrFallback(session.state.jobId),
      getLevel: () => session.state.level,
      cameraShake: (ms, i) => this.cameraShake(ms, i),
      hitstop: (ms) => this.hitstop(ms),
      bounds: { width: this.map.width, height: this.map.height },
    };
    this.skillRunner = new SkillRunner(this, runnerCtx, this.projectiles, this.damageText, this.buffs);

    this.spawner = new Spawner(this, this.map, this.terrain, () => ({
      bounds: { width: this.map.width, height: this.map.height },
      getPlayer: () => ({ x: this.player.x, y: this.player.y, vy: this.player.vy, grounded: this.player.grounded }),
      isPlayerDodging: () => this.player.dead || this.player.isInvulnerable(),
      getPlayerStats: () => this.effectiveStats,
      getPlayerLevel: () => session.state.level,
      damagePlayer: (amount, dir) => this.player.takeDamage(amount, dir),
      projectiles: this.projectiles,
      damageText: this.damageText,
      cameraShake: (ms, i) => this.cameraShake(ms, i),
      hitstop: (ms) => this.hitstop(ms),
      groundYAt: (x, fromY) => this.terrain.groundYAt(x, fromY),
      spawnMonsterNear: (id, x, y) => this.spawner.spawnNear(id, x, y),
      rng: Math.random,
      queryPlayerHit: (x, y) => {
        const px = this.player.x, py = this.player.y - 20;
        return Math.hypot(x - px, y - py) < 18 ? { x: px, y: py, obj: 'player' } : null;
      },
    }), (m) => this.onMonsterDeath(m));
    this.spawner.init();

    this.npcs = this.map.npcs.map((p) => {
      const def = getNpcDef(p.npcId);
      if (!def) { console.warn(`[WorldScene] unknown npc id "${p.npcId}"`); return null; }
      return new NpcEntity(this, def, p.x, p.y, p.flip);
    }).filter((n): n is NpcEntity => !!n);
    this.refreshNpcMarkers();

    this.gatherMgr = new GatherManager(this, this.map);
    this.portalMgr = new PortalManager(this, this.map);
    this.presence = new Presence(this, this.map.id);

    this.physics.add.collider(this.player.sprite, this.terrain.solidGroup);
    this.physics.add.collider(this.player.sprite, this.terrain.onewayGroup, undefined, onewayProcess(() => this.dropThroughUntil));

    this.cameras.main.setZoom(2);
    // Camera bounds must never be smaller than the viewport (in world px, i.e. camera size / zoom) —
    // a map authored (or a dev/fixture map) smaller than that would otherwise hand Phaser bounds it
    // can't clamp scroll into cleanly, showing void past the edges instead of centering the map.
    const viewW = this.cameras.main.width / this.cameras.main.zoom;
    const viewH = this.cameras.main.height / this.cameras.main.zoom;
    const boundsW = Math.max(this.map.width, viewW);
    const boundsH = Math.max(this.map.height + CAMERA_BOTTOM_SLACK, viewH);
    this.cameras.main.setBounds(0, 0, boundsW, boundsH);
    this.cameras.main.startFollow(this.player.sprite, true, 0.12, 0.12, 0, CAMERA_FOLLOW_OFFSET_Y);
    this.cameras.main.setDeadzone(60, 36);
    this.cameras.main.setBackgroundColor(0x0b1020);

    this.input2 = new InputController();
    this.recomputePassives();
    this.syncPet();

    this.busOffs.push(
      bus.on('game', (ev) => this.onGameEvent(ev)),
      bus.on('state', () => { this.player.syncLook(); this.recomputePassives(); this.refreshNpcMarkers(); this.syncPet(); }),
      bus.on('player:respawn', () => session.dispatch({ type: 'respawn' })),
      bus.on('hotbar:activate', ({ index }) => this.tryActivateHotbar(index, false)),
    );

    audio.playMusic(this.map.music);
    this.cameras.main.fadeIn(280, 0, 0, 0);
    bus.emit('world:entered', { mapId: this.map.id });
    bus.emit('ui:banner', { title: this.map.name, subtitle: this.map.subtitle, kind: 'map' });

    this.events.once('shutdown', () => this.teardown());
  }

  private resolveSpawnPos(data: WorldSceneData): { x: number; y: number } {
    if (data.x !== undefined && data.x >= 0 && data.y !== undefined && data.y >= 0) return { x: data.x, y: data.y };
    if (data.portalId) {
      const p = this.map.portals.find((pp) => pp.id === data.portalId);
      if (p) return { x: p.x, y: p.y };
    }
    if (!data.portalId && session.state?.mapId === this.map.id && session.state.position.x >= 0) {
      return { x: session.state.position.x, y: session.state.position.y };
    }
    return { x: this.map.spawnPoint.x, y: this.map.spawnPoint.y };
  }

  // ---- per-frame -------------------------------------------------------------

  override update(_time: number, delta: number): void {
    const now = performance.now();
    const scale = now < this.hitstopUntil ? 0.12 : 1;
    const dt = delta * scale;

    this.effectiveStats = this.buffs.apply(BuffManager.mergeExtra(session.stats, this.passiveMods));
    this.buffs.update(now);

    const input: PlayerInputState = {
      left: this.input2.isDown('moveLeft'), right: this.input2.isDown('moveRight'),
      up: this.input2.isDown('up'), down: this.input2.isDown('down'),
      jumpPressed: this.input2.justPressed('jump'), jumpReleased: this.input2.justReleased('jump'),
      dashPressed: this.input2.justPressed('dash'),
    };
    if (input.down && input.jumpPressed && this.player.grounded) this.dropThroughUntil = now + 260;

    this.player.update(dt, input, this.effectiveStats);
    // A single monster's AI throwing (bad data, edge-case boss attack) must not freeze every other
    // monster or the whole frame loop — isolate each one.
    for (const m of this.spawner.monsters) {
      try { m.update(dt); } catch (e) { console.error(`[WorldScene] monster "${m.def.id}" update threw`, e); }
    }
    this.spawner.update();
    this.projectiles.update(dt);
    this.gatherMgr.update();

    try { this.handleCombatInput(now); } catch (e) { console.error('[WorldScene] combat input threw', e); }
    this.handlePanelKeys();
    this.handleInteraction(now);

    const pickups = this.drops.update(dt, this.player.x, this.player.y, this.input2.isDown('interact'));
    for (const id of pickups) session.dispatch({ type: 'pickup', dropId: id });
    this.updatePet(dt);

    for (const n of this.npcs) {
      n.update(now);
      n.setNear(Phaser.Math.Distance.Between(this.player.x, this.player.y, n.x, n.y) <= NPC_TITLE_RANGE);
    }

    this.parallax.update(this.cameras.main);
    this.weatherFx.update(this.cameras.main, dt);
    try { this.darkOverlay?.update(this.cameras.main, this.player.x, this.player.y); } catch (e) { console.error('[WorldScene] dark overlay update threw', e); this.darkOverlay = undefined; }

    this.presence.update(dt, this.player.x, this.player.y, this.player.vx, this.player.vy, this.player.facing, this.currentAnimName());

    this.minimapAccum += delta;
    if (this.minimapAccum >= 250) {
      this.minimapAccum = 0;
      bus.emit('world:minimap', {
        mapId: this.map.id, width: this.map.width, height: this.map.height,
        player: { x: this.player.x, y: this.player.y },
        npcs: this.npcs.map((n) => ({ x: n.x, y: n.y, id: n.id })),
        portals: this.portalMgr.positions(),
        monsters: this.spawner.monsters.filter((m) => !m.dead).map((m) => ({ x: m.sprite.x, y: m.sprite.y, boss: m.isBoss })),
        others: this.presence.positions(),
      });
    }

    this.input2.endFrame();
  }

  private currentAnimName(): string {
    return this.player.sprite.anims?.currentAnim?.key?.split(':').pop() ?? 'idle';
  }

  // ---- combat input -----------------------------------------------------------

  private handleCombatInput(now: number): void {
    if (this.player.dead || this.player.isCasting(now)) return;
    let didCast = false;
    if (this.input2.isDown('attack')) {
      const job = getJobDefOrFallback(session.state.jobId);
      didCast = this.skillRunner.cast(buildBasicAttackDescriptor(job), this.player, { silent: true });
    }
    if (!didCast) {
      for (let i = 0; i < HOTBAR_SIZE; i++) {
        const action = `hotbar${i}`;
        const entry = session.state.hotbar[i];
        if (!entry) continue;
        if (entry.kind === 'item') {
          if (this.input2.justPressed(action)) session.dispatch({ type: 'useItem', uid: entry.id });
          continue;
        }
        const skill = getSkillDef(entry.id);
        if (!skill) continue;
        const pressed = this.input2.justPressed(action);
        const held = this.input2.isDown(action);
        if (skill.channel ? held : pressed) { this.castSkillById(entry.id, { silent: !pressed }); break; }
      }
    }
  }

  private castSkillById(skillId: string, opts: { silent?: boolean } = {}): boolean {
    const skill = getSkillDef(skillId);
    if (!skill) return false;
    const level = session.state.skills[skillId] ?? 1;
    const desc = buildSkillDescriptor(skill, level, this.effectiveStats);
    return this.skillRunner.cast(desc, this.player, opts);
  }

  private tryActivateHotbar(index: number, fromKey: boolean): void {
    const entry = session.state.hotbar[index];
    if (!entry) return;
    if (this.player.dead || this.player.isCasting()) return;
    if (entry.kind === 'item') { session.dispatch({ type: 'useItem', uid: entry.id }); return; }
    this.castSkillById(entry.id, { silent: fromKey });
  }

  private recomputePassives(): void {
    const mods: StatMods = {};
    for (const skillId of Object.keys(session.state.skills)) {
      const lvl = session.state.skills[skillId];
      if (!lvl) continue;
      const def = getSkillDef(skillId);
      if (!def || def.type !== 'passive' || !def.passive) continue;
      const evaluated = evalScalarMods(def.passive.stats, lvl);
      for (const k in evaluated) {
        const key = k as keyof StatMods;
        mods[key] = (mods[key] ?? 0) + (evaluated[key] ?? 0);
      }
    }
    this.passiveMods = mods;
  }

  // ---- panels / interaction -----------------------------------------------

  private static readonly PANEL_KEYS = ['inventory', 'character', 'skills', 'quests', 'professions', 'map', 'bestiary', 'help', 'achievements'] as const;

  private handlePanelKeys(): void {
    for (const k of WorldScene.PANEL_KEYS) if (this.input2.justPressed(k)) bus.emit('ui:toggle', { panel: k });
    if (this.input2.justPressed('menu')) bus.emit('ui:toggle', { panel: 'menu' });
    if (this.input2.justPressed('chat')) bus.emit('ui:open', { panel: 'chat' });
  }

  private nearestNpc(range = INTERACT_RANGE): NpcEntity | null {
    let best: NpcEntity | null = null; let bestD = range;
    for (const n of this.npcs) {
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, n.x, n.y);
      if (d < bestD) { bestD = d; best = n; }
    }
    return best;
  }

  private handleInteraction(_now: number): void {
    const npc = this.nearestNpc();
    const portal = this.portalMgr.nearby(this.player.x, this.player.y);
    const node = this.gatherMgr.nearby(this.player.x, this.player.y);

    let hint: { text: string } | null = null;
    if (npc) hint = { text: `↑/Z Talk to ${npc.def.name}` };
    else if (portal) hint = { text: `↑ ${portal.label ?? 'Use portal'}` };
    else if (node) hint = { text: 'Z Gather' };
    if (hint?.text !== this.lastHint?.text) { this.lastHint = hint; bus.emit('ui:hint', hint); }

    const zPressed = this.input2.justPressed('interact');
    const upPressed = this.input2.justPressed('up');
    if (npc && (zPressed || upPressed)) { bus.emit('ui:dialogue', { npcId: npc.id }); return; }
    if (portal && upPressed) { this.portalMgr.use(portal); return; }
    if (node && zPressed) this.gatherMgr.interact(node);
  }

  // ---- pet -----------------------------------------------------------------

  /** Create/destroy the pet entity to match session.state.activePet (called on create + every 'state' event). */
  private syncPet(): void {
    const itemId = session.state.activePet;
    if (this.pet && this.pet.itemId === itemId) return;
    this.pet?.destroy();
    this.pet = undefined;
    if (!itemId) return;
    const def = ITEMS[itemId];
    if (!def?.pet) return;
    this.pet = new Pet(this, def, this.player.x, this.player.y);
  }

  private updatePet(dt: number): void {
    if (!this.pet) return;
    const reached = this.pet.update(dt, { x: this.player.x, y: this.player.y, facing: this.player.facing });
    if (reached) {
      if (this.drops.petPickup(reached, this.pet.sprite.x, this.pet.sprite.y)) session.dispatch({ type: 'pickup', dropId: reached });
    } else if (!this.pet.chasingDropId) {
      const found = this.drops.nearestTo(this.player.x, this.player.y, this.pet.lootRadius);
      if (found) this.pet.chase(found.dropId, found.x, found.y);
    }
  }

  // ---- monster death / loot ---------------------------------------------------

  private onMonsterDeath(m: MonsterEntity): void {
    session.dispatch({ type: 'killMonster', monsterId: m.def.id, mapId: this.map.id, x: m.sprite.x, y: m.sprite.y });
  }

  // ---- fx helpers --------------------------------------------------------------

  cameraShake(ms: number, intensity: number): void { this.cameras.main.shake(ms, intensity); }
  hitstop(ms: number): void { this.hitstopUntil = Math.max(this.hitstopUntil, performance.now() + ms); }

  // ---- game events / map transitions ------------------------------------------

  private refreshNpcMarkers(): void {
    for (const n of this.npcs) n.setMarker(npcQuestMarker(session.state, n.id));
  }

  private onGameEvent(ev: GameEvent): void {
    switch (ev.type) {
      case 'mapChanged':
        this.transitionTo(ev.mapId, ev.portalId, ev.x, ev.y);
        break;
      case 'respawned':
        this.transitionTo(ev.mapId, undefined, ev.x, ev.y);
        break;
      case 'lootDropped':
        this.drops.spawnMany(
          ev.drops, ev.x, ev.y,
          (itemId) => ITEMS[itemId],
          (d) => (d.rarity as Rarity | undefined) ?? (d.itemId ? ITEMS[d.itemId]?.rarity : undefined),
        );
        break;
      case 'xp':
        this.damageText.spawn(this.player.x, this.player.y - this.player.sprite.displayHeight - 10, `+${ev.amount} EXP`, 'xp');
        break;
      case 'levelUp':
        spawnVfx(this, 'holy', this.player.x, this.player.y - 20, { color: '#ffe066', width: 40, height: 90, durationMs: 700 });
        audio.playSfx('levelUp');
        bus.emit('ui:banner', { title: 'LEVEL UP!', subtitle: `Level ${ev.level}`, kind: 'level' });
        break;
      case 'jobAdvanced':
        spawnVfx(this, 'holy', this.player.x, this.player.y - 20, { color: '#c77dff', width: 50, height: 100, durationMs: 900 });
        audio.playSfx('jobAdvance');
        bus.emit('ui:banner', { title: 'Job Advancement!', subtitle: ev.jobId, kind: 'job' });
        break;
      case 'died':
        bus.emit('ui:death', { xpLost: ev.xpLost });
        break;
      default:
        break;
    }
  }

  private transitionTo(mapId: string, portalId: string | undefined, x: number, y: number): void {
    if (this.transitioning) return;
    this.transitioning = true;
    bus.emit('ui:bossBar', null);
    this.cameras.main.fadeOut(240, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      const next: WorldSceneData = { mapId, portalId, x, y };
      this.scene.restart(next);
    });
  }

  // ---- dev helpers (used by window.__dw) ---------------------------------------

  devSpawnMonster(monsterId: string, offsetX = 60): void {
    this.spawner.spawnNear(monsterId, this.player.x + offsetX, this.player.y);
  }

  /** Stationary, effectively unkillable target for testing skill visuals without it dying/fleeing. */
  devSpawnDummy(offsetX = 60): void {
    const base = getMonsterDef('shellsnail') ?? Object.values(MONSTERS)[0];
    if (!base) return;
    const dummy: MonsterDef = {
      ...base, id: 'dev_dummy', name: 'Training Dummy', hp: 9_999_999, attack: 0, defense: 0, speed: 0,
      behavior: 'stationary', aggressive: false, knockbackResist: 1, drops: [], attacks: undefined, phases: undefined, isBoss: false,
    };
    this.spawner.spawnOne(dummy, this.player.x + offsetX, this.player.y, false);
  }

  /** QA-only: inspect the active pet entity (species/position/chase target), or null if none. */
  devPetInfo(): { itemId: string; x: number; y: number; chasingDropId: string | null } | null {
    if (!this.pet) return null;
    return { itemId: this.pet.itemId, x: this.pet.sprite.x, y: this.pet.sprite.y, chasingDropId: this.pet.chasingDropId };
  }

  /**
   * QA-only: jump straight to a map, bypassing portal adjacency/reqs entirely (never dispatched
   * as a normal changeMap action). Also syncs the authoritative CharacterState.mapId via the
   * backend's devMutate() when available (LocalBackend) — the reducer's anti-cheat now rejects
   * killMonster/gather actions whose mapId doesn't match state.mapId, so without this a forced
   * map jump would silently break kill credit/loot/gathering on the destination map.
   */
  devForceMap(mapId: string, x?: number, y?: number): void {
    const mutated = (session.backend as any).devMutate?.((s: typeof session.state) => {
      s.mapId = mapId;
      if (!s.discoveredMaps.includes(mapId)) s.discoveredMaps.push(mapId);
      s.position = { x: x ?? -1, y: y ?? -1 };
    });
    if (mutated) session.applyState(mutated);
    else {
      // No devMutate support (e.g. WsBackend) — fall back to the old client-only mutation.
      session.state.mapId = mapId;
      session.state.position = { x: x ?? -1, y: y ?? -1 };
    }
    this.scene.restart({ mapId, x, y } satisfies WorldSceneData);
  }

  private torndown = false;

  /**
   * Idempotent, best-effort teardown: runs on every subsystem regardless of whether an earlier
   * one throws (a Phaser scene restart/stop can tear down physics groups on its own timing, so a
   * subsystem's own destroy() may run against already-gone internals — never let that abort the
   * rest of cleanup, e.g. Presence's bus listeners, or they leak into the next scene instance).
   */
  private teardown(): void {
    if (this.torndown) return;
    this.torndown = true;
    const safely = (label: string, fn: () => void) => { try { fn(); } catch (e) { console.warn(`[WorldScene] teardown step "${label}" failed (ignored)`, e); } };

    safely('busOffs', () => { for (const off of this.busOffs) off(); this.busOffs = []; });
    safely('input2', () => this.input2?.destroy());
    safely('terrain', () => this.terrain?.destroy());
    safely('parallax', () => this.parallax?.destroy());
    safely('weatherFx', () => this.weatherFx?.destroy());
    safely('darkOverlay', () => { this.darkOverlay?.destroy(); this.darkOverlay = undefined; });
    safely('spawner', () => this.spawner?.destroy());
    safely('npcs', () => { for (const n of this.npcs) n.destroy(); this.npcs = []; });
    safely('gatherMgr', () => this.gatherMgr?.destroy());
    safely('portalMgr', () => this.portalMgr?.destroy());
    safely('drops', () => this.drops?.destroy());
    safely('pet', () => { this.pet?.destroy(); this.pet = undefined; });
    safely('projectiles', () => this.projectiles?.destroy());
    safely('presence', () => this.presence?.destroy());
    safely('player', () => this.player?.destroy());
  }
}
