/**
 * Per-socket connection handler: hello/welcome handshake, request/reply correlation,
 * character CRUD, entering the world, running actions through the shared authoritative
 * reducer, and relaying presence + chat through Rooms.
 */
import type { WebSocket } from 'ws';
import type {
  WireClientMessage, WireServerMessage, ClientAction, ChatMessage, PresenceUpdate,
  CreateCharacterRequest, RemotePlayer,
} from '../src/shared/protocol';
import { PROTOCOL_VERSION } from '../src/shared/protocol';
import type { CharacterState } from '../src/shared/types';
import {
  createCharacter, summarize, migrateCharacter, handleAction, createSession,
  type SessionState, type ServerContext,
} from '../src/shared/logic';
import { makeUid } from '../src/shared/rng';
import type { Store } from './store';
import { Rooms, type RoomMember } from './rooms';
import { RateLimiter } from './rateLimit';

const MAX_CHAT_LEN = 240;
const SAVE_DEBOUNCE_MS = 500;
const NAME_RE = /^[\p{L}\p{N} _'-]+$/u;

function sanitizeChat(text: string): string {
  return text.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, MAX_CHAT_LEN);
}

function toRemotePlayer(id: string, c: CharacterState): RemotePlayer {
  return {
    id, name: c.name, classId: c.classId, jobId: c.jobId, level: c.level, appearance: c.appearance,
    weaponItemId: c.equipment.weapon?.itemId, armorItemId: c.equipment.armor?.itemId,
    helmetItemId: c.equipment.helmet?.itemId, mapId: c.mapId, x: c.position.x, y: c.position.y,
    vx: 0, vy: 0, facing: 1, anim: 'idle', title: c.activeTitle,
  };
}

export class Connection {
  readonly id = makeUid('conn');
  private token: string | null = null;
  private character: CharacterState | null = null;
  private session: SessionState = createSession();
  private member: RoomMember | null = null;
  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  private helloReceived = false;
  private closed = false;

  private readonly actionLimiter = new RateLimiter(40, 5000); // ~8/s sustained
  private readonly presenceLimiter = new RateLimiter(15, 1000); // 15Hz incoming
  private lastPresenceRelayAt = 0; // relay outgoing at <=10Hz

  constructor(private readonly ws: WebSocket, private readonly store: Store, private readonly rooms: Rooms) {
    ws.on('message', (raw) => this.onMessage(raw));
    ws.on('close', () => this.onClose());
    ws.on('error', () => { /* 'close' still fires; nothing extra to do */ });
  }

  private send(msg: WireServerMessage): void {
    if (this.ws.readyState !== this.ws.OPEN) return;
    this.ws.send(JSON.stringify(msg));
  }

  private reply(rid: number, ok: boolean, data?: unknown, error?: string): void {
    this.send({ t: 'reply', rid, ok, error, data });
  }

  private onMessage(raw: unknown): void {
    let msg: WireClientMessage;
    try {
      msg = JSON.parse(String(raw));
    } catch {
      return; // ignore malformed messages
    }
    if (!msg || typeof msg !== 'object' || typeof (msg as { t?: unknown }).t !== 'string') return;

    try {
      this.dispatch(msg);
    } catch (e) {
      console.error(`[conn ${this.id}] handler crashed on`, msg.t, e);
    }
  }

  private dispatch(msg: WireClientMessage): void {
    switch (msg.t) {
      case 'hello': return this.onHello(msg.token, msg.protocol);
      case 'listCharacters': return void this.onListCharacters(msg.rid);
      case 'createCharacter': return void this.onCreateCharacter(msg.rid, msg.req);
      case 'deleteCharacter': return void this.onDeleteCharacter(msg.rid, msg.id);
      case 'enterWorld': return void this.onEnterWorld(msg.rid, msg.characterId);
      case 'action': return this.onAction(msg.rid, msg.action);
      case 'presence': return this.onPresence(msg.p);
      case 'chat': return this.onChat(msg.channel, msg.text);
    }
  }

  private onHello(token: string | undefined, protocol: number): void {
    if (this.helloReceived) return;
    this.helloReceived = true;
    if (protocol !== PROTOCOL_VERSION) {
      this.send({ t: 'kick', reason: `Protocol mismatch: server=${PROTOCOL_VERSION} client=${protocol}` });
      this.ws.close();
      return;
    }
    this.token = (token && token.trim()) || makeUid('guest');
    this.send({ t: 'welcome', protocol: PROTOCOL_VERSION, serverTime: Date.now() });
  }

  private requireToken(rid: number): string | null {
    if (!this.token) {
      this.reply(rid, false, undefined, 'Not connected (missing hello)');
      return null;
    }
    return this.token;
  }

  private async onListCharacters(rid: number): Promise<void> {
    const token = this.requireToken(rid);
    if (!token) return;
    const ids = await this.store.getAccountCharacterIds(token);
    const chars = await Promise.all(ids.map((id) => this.store.loadCharacter(id)));
    const summaries = chars.filter((c): c is CharacterState => !!c).map((c) => summarize(migrateCharacter(c)))
      .sort((a, b) => b.updatedAt - a.updatedAt);
    this.reply(rid, true, summaries);
  }

  private async onCreateCharacter(rid: number, req: CreateCharacterRequest): Promise<void> {
    const token = this.requireToken(rid);
    if (!token) return;
    const name = (req?.name ?? '').trim();
    if (name.length < 2 || name.length > 14) return this.reply(rid, false, undefined, 'Name must be 2-14 characters.');
    if (!NAME_RE.test(name)) return this.reply(rid, false, undefined, 'Name contains invalid characters.');
    const ids = await this.store.getAccountCharacterIds(token);
    const existing = await Promise.all(ids.map((id) => this.store.loadCharacter(id)));
    if (existing.some((c) => c && c.name.toLowerCase() === name.toLowerCase())) {
      return this.reply(rid, false, undefined, 'That name is taken.');
    }
    const c = createCharacter({ ...req, name }, makeUid('c'), Date.now());
    await this.store.saveCharacter(c);
    await this.store.addCharacterToAccount(token, c.id);
    this.reply(rid, true, c);
  }

  private async onDeleteCharacter(rid: number, id: string): Promise<void> {
    const token = this.requireToken(rid);
    if (!token) return;
    const ids = await this.store.getAccountCharacterIds(token);
    if (!ids.includes(id)) return this.reply(rid, false, undefined, 'Character not found');
    await this.store.deleteCharacter(id);
    await this.store.removeCharacterFromAccount(token, id);
    this.reply(rid, true);
  }

  private async onEnterWorld(rid: number, characterId: string): Promise<void> {
    const token = this.requireToken(rid);
    if (!token) return;
    const ids = await this.store.getAccountCharacterIds(token);
    if (!ids.includes(characterId)) return this.reply(rid, false, undefined, 'Character not found');
    const raw = await this.store.loadCharacter(characterId);
    if (!raw) return this.reply(rid, false, undefined, 'Character not found');

    // Leave any previous world room this connection was in (e.g. re-entering with a different char).
    this.leaveRoom();

    this.character = migrateCharacter(raw);
    this.session = createSession();
    this.member = { id: this.id, ws: this.ws, mapId: this.character.mapId };
    this.rooms.join(this.member);
    this.rooms.broadcast(this.character.mapId, { t: 'playerJoined', player: toRemotePlayer(this.id, this.character) }, this.id);

    this.reply(rid, true, this.character);
    this.send({
      t: 'chat',
      msg: { id: makeUid('m'), channel: 'system', from: 'Driftwake', text: `Welcome to Driftwake, ${this.character.name}!`, at: Date.now() },
    });
  }

  private ctx(): ServerContext {
    return { now: Date.now(), rng: Math.random, session: this.session, uid: () => makeUid('i') };
  }

  private onAction(rid: number, action: ClientAction): void {
    if (!this.character) return this.reply(rid, false, undefined, 'Not in world');
    if (!this.actionLimiter.allow()) {
      this.send({ t: 'actionResult', rid, result: { ok: false, error: 'Rate limited', events: [], state: this.character } });
      return;
    }
    let result;
    try {
      result = handleAction(this.character, action, this.ctx());
    } catch (e) {
      console.error(`[conn ${this.id}] reducer crashed on`, action.type, e);
      this.send({ t: 'actionResult', rid, result: { ok: false, error: 'Server error', events: [], state: this.character } });
      return;
    }
    if (result.ok) {
      const prevMapId = this.character.mapId;
      this.character = result.state;
      this.schedulePersist();
      if (this.member && this.character.mapId !== prevMapId) this.moveRoom(this.character.mapId);
    }
    this.send({ t: 'actionResult', rid, result });
  }

  private onPresence(p: PresenceUpdate): void {
    if (!this.character || !this.member) return;
    if (!p || typeof p.x !== 'number' || typeof p.y !== 'number' || typeof p.mapId !== 'string') return;
    if (!this.presenceLimiter.allow()) return; // silently drop excess updates
    this.character.position = { x: p.x, y: p.y };
    if (p.mapId && p.mapId !== this.member.mapId) this.moveRoom(p.mapId);
    const now = Date.now();
    if (now - this.lastPresenceRelayAt < 100) return; // relay at <=10Hz
    this.lastPresenceRelayAt = now;
    this.rooms.broadcast(this.member.mapId, { t: 'playerMoved', id: this.id, p }, this.id);
  }

  private moveRoom(mapId: string): void {
    if (!this.member) return;
    const oldMapId = this.member.mapId;
    this.rooms.broadcast(oldMapId, { t: 'playerLeft', id: this.id }, this.id);
    this.rooms.move(this.member, mapId);
    if (this.character) {
      this.rooms.broadcast(mapId, { t: 'playerJoined', player: toRemotePlayer(this.id, this.character) }, this.id);
    }
  }

  private onChat(channel: ChatMessage['channel'], text: string): void {
    if (!this.character) return;
    // Only 'map' and 'world' are player-sendable; 'system' is server-only, 'party'/'whisper' aren't wired yet.
    if (channel !== 'map' && channel !== 'world') return;
    const clean = sanitizeChat(text);
    if (!clean) return;
    const msg: ChatMessage = { id: makeUid('m'), channel, from: this.character.name, text: clean, at: Date.now() };
    if (channel === 'world') {
      this.rooms.broadcastAll({ t: 'chat', msg });
    } else if (this.member) {
      this.rooms.broadcast(this.member.mapId, { t: 'chat', msg });
    }
  }

  private schedulePersist(): void {
    if (this.saveTimer) return;
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null;
      if (this.character) this.store.saveCharacter(this.character).catch((e) => console.error('[store] save failed', e));
    }, SAVE_DEBOUNCE_MS);
  }

  private leaveRoom(): void {
    if (this.member) {
      this.rooms.broadcast(this.member.mapId, { t: 'playerLeft', id: this.id }, this.id);
      this.rooms.leave(this.member);
      this.member = null;
    }
  }

  private onClose(): void {
    if (this.closed) return;
    this.closed = true;
    if (this.saveTimer) { clearTimeout(this.saveTimer); this.saveTimer = null; }
    if (this.character) this.store.saveCharacter(this.character).catch((e) => console.error('[store] save on disconnect failed', e));
    this.leaveRoom();
  }
}
