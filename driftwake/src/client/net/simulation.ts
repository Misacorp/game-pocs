/**
 * WorldSimulation — makes the offline LocalBackend feel like a live MMO.
 *
 * Spawns 3-6 fake "other players" (bots) on the real player's current map. They wander the
 * ground left/right (with occasional jumps/pauses), occasionally join/leave, and post
 * context-appropriate chat — including replying to the real player's own chat sometimes.
 * Everything is emitted through the *same* Backend events (`playerJoined`/`playerLeft`/
 * `playerMoved`/`chat`) a real WsBackend would emit, so the engine renders/handles them
 * identically whether the game is offline or online.
 *
 * Disable at runtime with `localStorage['driftwake:bots'] = 'off'`.
 */
import type { Appearance, ClassId } from '@shared/types';
import type { ChatMessage, PresenceUpdate, RemotePlayer } from '@shared/protocol';
import { MAPS } from '@shared/data';
import type { LocalBackend } from './LocalBackend';

const BOTS_KEY = 'driftwake:bots';
const TICK_MS = 125; // ~8Hz movement updates
const MIN_BOTS = 3;
const MAX_BOTS = 6;

function botsEnabled(): boolean {
  try { return localStorage.getItem(BOTS_KEY) !== 'off'; } catch { return true; }
}

const NAMES = [
  'Mossbeard', 'xXHarpoonXx', 'Lunalight', 'Pebble', 'SirSnailsalot', 'Glimmerpaw',
  'Tidebrine', 'Kelpo', 'Driftling', 'Aurelune', 'Barnaclejack', 'Windwhisper',
  'Sootpaw', 'Coralynn', 'Growlybits', 'Fennelwick',
];

const CLASS_IDS: ClassId[] = ['vanguard', 'stormcaller', 'windrunner', 'shade'];
const SKIN = ['#e8b98a', '#c98a5a', '#a5673c', '#f0d2a8', '#8a5a3a', '#7a4a2e'];
const HAIR = ['#3a2a1e', '#8a5a2a', '#d6c24a', '#5a3a5e', '#1a1a1a', '#c94a4a', '#e8e8e8'];
const EYES = ['#2a2a2a', '#3a6a8a', '#4a8a4a', '#8a5a2a', '#5a2a5e'];
const OUTFIT = ['#5a7a9a', '#9a5a5a', '#5a9a6a', '#8a7a4a', '#7a5a9a', '#4a4a5a'];

const TOWN_LINES = [
  'anyone selling copper ore?', 'wts Tangleroot Sword pm me', 'lfg grotto depths for the boss',
  'does anyone know where Brina is', 'back in town to restock potions', 'wtb enhance stones',
  'anyone doing the kelpwood quest line', 'gonna go turn in a bounty', 'this town theme never gets old',
  'lfm for old tangle, need one more', 'selling cheap whetstones, msg me',
];
const FIELD_LINES = [
  'these puffmoss are so cute', 'watch out for the boar lol', 'anyone else farming here',
  'finally got my drop', 'ouch that hopper got me', 'grinding to next level',
  'this meadow is so pretty ngl', 'anyone need a party for these mobs', 'just dinged!',
  'careful of the chargers up ahead',
];
const BOSS_LINES = [
  'gl!', 'here we go', 'pop your buffs', 'watch the telegraph', 'nice fight',
  'gg', 'almost got the drop last time', 'ready when you are', 'this boss hits hard',
];
const GREETING_WORDS = ['hi', 'hello', 'hey', 'sup', 'yo', 'howdy', 'hiya'];
const GREETING_REPLIES = ['hi!', 'hey there', 'o/', 'yo', 'sup', 'hiya!'];
const QUESTION_REPLIES = ["idk lol try asking Old Pell", 'no clue, sorry', 'good question honestly', 'not sure, check the quest log?'];
const WORLD_LINES = [
  '{name} has reached level {lvl}!', '{name} has defeated a fearsome boss!',
  '{name} discovered a new region!', '{name} found a legendary item!',
];

function pick<T>(arr: readonly T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function randRange(min: number, max: number): number { return min + Math.random() * (max - min); }
function randInt(min: number, max: number): number { return Math.floor(randRange(min, max + 1)); }

type BotMode = 'walk' | 'idle' | 'jump';

interface Bot {
  id: string;
  name: string;
  classId: ClassId;
  level: number;
  appearance: Appearance;
  x: number;
  y: number;
  vx: number;
  facing: 1 | -1;
  mode: BotMode;
  modeUntil: number;
  nextChatAt: number;
  minX: number;
  maxX: number;
  groundY: number;
}

function randomAppearance(): Appearance {
  return { skin: pick(SKIN), hair: pick(HAIR), hairStyle: randInt(0, 5), eyes: pick(EYES), outfit: pick(OUTFIT) };
}

function mapGroundY(mapId: string): { groundY: number; width: number } {
  const map = MAPS[mapId];
  const width = map?.width ?? 1600;
  const height = map?.height ?? 640;
  const grounds = map?.platforms?.filter((p) => p.type === 'ground') ?? [];
  const groundY = grounds.length ? Math.max(...grounds.map((p) => p.y)) : height - 48;
  return { groundY, width };
}

function mapCategory(mapId: string): 'town' | 'boss' | 'field' {
  const map = MAPS[mapId];
  if (!map) return mapId.includes('town') ? 'town' : 'field';
  if (map.town) return 'town';
  if (map.boss) return 'boss';
  return 'field';
}

function linesFor(mapId: string): readonly string[] {
  switch (mapCategory(mapId)) {
    case 'town': return TOWN_LINES;
    case 'boss': return BOSS_LINES;
    default: return FIELD_LINES;
  }
}

function makeId(): string { return `bot_${Math.random().toString(36).slice(2, 10)}`; }

export class WorldSimulation {
  private bots = new Map<string, Bot>();
  private mapId: string | null = null;
  private tickTimer: ReturnType<typeof setInterval> | null = null;
  private churnTimer: ReturnType<typeof setTimeout> | null = null;
  private worldChatTimer: ReturnType<typeof setTimeout> | null = null;
  private playerName = 'Adventurer';
  private disposed = false;

  constructor(private backend: LocalBackend) {}

  /** Begin simulating on the given map. Safe to call again on map change. */
  start(mapId: string, playerName?: string): void {
    if (playerName) this.playerName = playerName;
    if (!botsEnabled()) return;
    if (this.mapId === mapId && this.tickTimer) return; // already running here
    this.teardownMap();
    this.mapId = mapId;
    if (!this.tickTimer) {
      this.tickTimer = setInterval(() => this.tick(), TICK_MS);
      this.scheduleChurn();
      this.scheduleWorldChat();
    }
    const count = randInt(MIN_BOTS, MAX_BOTS);
    for (let i = 0; i < count; i++) this.spawnBot(mapId);
  }

  /** Call when the player changes maps so bots follow them there. */
  onMapChanged(mapId: string): void {
    if (!botsEnabled()) return;
    if (mapId === this.mapId) return;
    this.start(mapId);
  }

  /** Handle chat the real player sent, so bots can react. */
  onPlayerChat(msg: ChatMessage): void {
    if (!botsEnabled() || msg.channel === 'system') return;
    if (!this.bots.size) return;
    const lower = msg.text.toLowerCase().trim();
    const isGreeting = GREETING_WORDS.some((w) => lower === w || lower.startsWith(`${w} `) || lower.startsWith(`${w},`));
    const isQuestion = lower.endsWith('?') || /\b(anyone|does|how|where|know|can someone)\b/.test(lower);
    if (!isGreeting && !isQuestion) return;
    if (Math.random() > 0.55) return; // don't respond every time
    const bot = pick([...this.bots.values()]);
    const reply = isGreeting ? pick(GREETING_REPLIES) : pick(QUESTION_REPLIES);
    const delay = randRange(600, 2200);
    setTimeout(() => {
      if (this.disposed || !this.bots.has(bot.id)) return;
      this.say(bot, msg.channel === 'world' ? 'world' : 'map', reply);
    }, delay);
  }

  /** Stop everything and remove all bots (call from leaveWorld). */
  dispose(): void {
    this.disposed = true;
    this.teardownMap();
    if (this.tickTimer) { clearInterval(this.tickTimer); this.tickTimer = null; }
    if (this.churnTimer) { clearTimeout(this.churnTimer); this.churnTimer = null; }
    if (this.worldChatTimer) { clearTimeout(this.worldChatTimer); this.worldChatTimer = null; }
  }

  private teardownMap(): void {
    for (const bot of this.bots.values()) this.backend.emit('playerLeft', { id: bot.id });
    this.bots.clear();
  }

  private spawnBot(mapId: string): void {
    const { groundY, width } = mapGroundY(mapId);
    const minX = 48;
    const maxX = Math.max(minX + 40, width - 48);
    const classId = pick(CLASS_IDS);
    const map = MAPS[mapId];
    const [lo, hi] = map?.levelRange ?? [1, 36];
    const bot: Bot = {
      id: makeId(),
      name: pick(NAMES),
      classId,
      level: randInt(Math.max(1, lo), Math.max(lo, hi)),
      appearance: randomAppearance(),
      x: randRange(minX, maxX),
      y: groundY,
      vx: 0,
      facing: Math.random() < 0.5 ? -1 : 1,
      mode: 'idle',
      modeUntil: performance.now() + randRange(500, 2000),
      nextChatAt: performance.now() + randRange(4000, 20000),
      minX, maxX, groundY,
    };
    this.bots.set(bot.id, bot);
    const player: RemotePlayer = {
      id: bot.id, name: bot.name, classId: bot.classId, jobId: bot.classId, level: bot.level,
      appearance: bot.appearance, mapId, x: bot.x, y: bot.y, vx: 0, vy: 0, facing: bot.facing, anim: 'idle',
    };
    this.backend.emit('playerJoined', player);
  }

  private despawnRandomBot(): void {
    if (!this.bots.size) return;
    const bot = pick([...this.bots.values()]);
    this.bots.delete(bot.id);
    this.backend.emit('playerLeft', { id: bot.id });
  }

  private scheduleChurn(): void {
    if (this.disposed) return;
    this.churnTimer = setTimeout(() => {
      if (this.disposed || !this.mapId) return;
      if (Math.random() < 0.5 && this.bots.size > MIN_BOTS) {
        this.despawnRandomBot();
      } else if (this.bots.size < MAX_BOTS) {
        this.spawnBot(this.mapId);
      }
      this.scheduleChurn();
    }, randRange(30_000, 90_000));
  }

  private scheduleWorldChat(): void {
    if (this.disposed) return;
    this.worldChatTimer = setTimeout(() => {
      if (this.disposed) return;
      const name = pick(NAMES);
      const text = pick(WORLD_LINES).replace('{name}', name).replace('{lvl}', String(randInt(5, 36)));
      const msg: ChatMessage = { id: makeId(), channel: 'system', from: 'World', text: `[World] ${text}`, at: Date.now() };
      this.backend.emit('chat', msg);
      this.scheduleWorldChat();
    }, randRange(90_000, 240_000));
  }

  private say(bot: Bot, channel: ChatMessage['channel'], text: string): void {
    const msg: ChatMessage = { id: makeId(), channel, from: bot.name, text, at: Date.now() };
    this.backend.emit('chat', msg);
  }

  private tick(): void {
    if (!this.mapId) return;
    const now = performance.now();
    const dt = TICK_MS / 1000;
    for (const bot of this.bots.values()) {
      if (now >= bot.modeUntil) this.pickNewMode(bot, now);
      if (bot.mode === 'walk') {
        bot.x += bot.vx * dt;
        if (bot.x <= bot.minX) { bot.x = bot.minX; bot.facing = 1; bot.vx = Math.abs(bot.vx); }
        if (bot.x >= bot.maxX) { bot.x = bot.maxX; bot.facing = -1; bot.vx = -Math.abs(bot.vx); }
      }
      const anim = bot.mode === 'jump' ? 'jump' : bot.mode === 'walk' ? 'walk' : 'idle';
      const p: PresenceUpdate = { x: Math.round(bot.x), y: bot.y, vx: bot.mode === 'walk' ? bot.vx : 0, vy: 0, facing: bot.facing, anim, mapId: this.mapId };
      this.backend.emit('playerMoved', { id: bot.id, p });

      if (now >= bot.nextChatAt) {
        bot.nextChatAt = now + randRange(20_000, 55_000);
        if (Math.random() < 0.7) this.say(bot, 'map', pick(linesFor(this.mapId)));
      }
    }
  }

  private pickNewMode(bot: Bot, now: number): void {
    const roll = Math.random();
    if (roll < 0.55) {
      bot.mode = 'walk';
      const speed = randRange(35, 65);
      bot.vx = bot.facing * speed;
      bot.modeUntil = now + randRange(1500, 4500);
    } else if (roll < 0.8) {
      bot.mode = 'idle';
      bot.vx = 0;
      bot.modeUntil = now + randRange(1000, 3000);
    } else if (roll < 0.92) {
      bot.mode = 'jump';
      bot.modeUntil = now + randRange(400, 700);
    } else {
      bot.facing = bot.facing === 1 ? -1 : 1;
      bot.mode = 'idle';
      bot.vx = 0;
      bot.modeUntil = now + randRange(300, 900);
    }
  }
}
