/**
 * WsBackend — talks to the Node authoritative server (server/) over WebSocket using the
 * wire protocol in src/shared/protocol.ts (WireClientMessage / WireServerMessage).
 *
 * Handshake: on socket open we send `hello` (with a persisted guest token + PROTOCOL_VERSION)
 * and wait for `welcome` before resolving connect().
 * Request/response correlation: every request carries a numeric `rid`; the matching reply
 * (`reply` or `actionResult`) resolves/rejects the pending promise. Requests time out after 10s.
 * Reconnection: on an unexpected close, we reconnect with exponential backoff (capped), replaying
 * the hello handshake. If reconnection gives up (too many attempts), we emit 'disconnected'.
 */
import type { Backend, BackendEvents } from './Backend';
import type { CharacterState, CharacterSummary } from '@shared/types';
import type {
  ActionResult, ClientAction, CreateCharacterRequest, ChatMessage, PresenceUpdate,
  WireClientMessage, WireServerMessage,
} from '@shared/protocol';
import { PROTOCOL_VERSION } from '@shared/protocol';

const TOKEN_KEY = 'driftwake:token';
const REQUEST_TIMEOUT_MS = 10_000;
const MAX_BACKOFF_MS = 15_000;
const MAX_RECONNECT_ATTEMPTS = 8;

type Listener = (payload: any) => void;

function getOrCreateToken(): string {
  try {
    const existing = localStorage.getItem(TOKEN_KEY);
    if (existing) return existing;
    const t = `guest_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
    localStorage.setItem(TOKEN_KEY, t);
    return t;
  } catch {
    // localStorage unavailable (private mode edge cases) — fall back to a session-only token.
    return `guest_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
  }
}

interface Pending {
  resolve: (v: any) => void;
  reject: (e: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

export class WsBackend implements Backend {
  readonly kind = 'ws' as const;
  private ws: WebSocket | null = null;
  private listeners = new Map<string, Set<Listener>>();
  private pending = new Map<number, Pending>();
  private ridSeq = 1;
  private token: string;
  private connectPromise: Promise<void> | null = null;
  private hardDisconnected = false;
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private manuallyClosed = false;
  private characterId: string | null = null;
  /** Resolved once the current socket has completed the hello/welcome handshake. */
  private welcomeResolvers: Array<() => void> = [];
  private welcomed = false;

  constructor(readonly url: string) {
    this.token = getOrCreateToken();
  }

  async connect(): Promise<void> {
    this.manuallyClosed = false;
    if (this.connectPromise) return this.connectPromise;
    this.connectPromise = this.openSocket();
    try {
      await this.connectPromise;
    } finally {
      this.connectPromise = null;
    }
  }

  private openSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.welcomed = false;
      let settled = false;
      let ws: WebSocket;
      try {
        ws = new WebSocket(this.url);
      } catch (e) {
        reject(e instanceof Error ? e : new Error(String(e)));
        return;
      }
      this.ws = ws;

      const onWelcome = () => {
        if (settled) return;
        settled = true;
        this.reconnectAttempts = 0;
        resolve();
      };
      this.welcomeResolvers.push(onWelcome);

      ws.addEventListener('open', () => {
        this.wireSend({ t: 'hello', token: this.token, protocol: PROTOCOL_VERSION });
      });

      ws.addEventListener('message', (ev) => this.handleMessage(ev));

      ws.addEventListener('error', () => {
        if (!settled) {
          settled = true;
          reject(new Error('WebSocket error'));
        }
      });

      ws.addEventListener('close', () => {
        this.ws = null;
        this.rejectAllPending(new Error('Connection closed'));
        if (!settled) {
          settled = true;
          reject(new Error('Connection closed before handshake'));
        }
        if (!this.manuallyClosed) this.scheduleReconnect();
      });
    });
  }

  private scheduleReconnect(): void {
    if (this.hardDisconnected || this.manuallyClosed) return;
    if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      this.hardDisconnected = true;
      this.emit('disconnected', { reason: 'Could not reconnect to server' });
      return;
    }
    this.reconnectAttempts++;
    const backoff = Math.min(MAX_BACKOFF_MS, 500 * 2 ** this.reconnectAttempts) + Math.random() * 250;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      this.openSocket()
        .then(async () => {
          // Rejoin the world we were in, if any, so presence/session resume cleanly.
          if (this.characterId) {
            try { await this.enterWorld(this.characterId); } catch { /* best effort */ }
          }
        })
        .catch(() => this.scheduleReconnect());
    }, backoff);
  }

  private wireSend(msg: WireClientMessage): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify(msg));
  }

  private request<T = unknown>(build: (rid: number) => WireClientMessage): Promise<T> {
    const rid = this.ridSeq++;
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(rid);
        reject(new Error('Request timed out'));
      }, REQUEST_TIMEOUT_MS);
      this.pending.set(rid, { resolve, reject, timer });
      this.wireSend(build(rid));
    });
  }

  private rejectAllPending(err: Error): void {
    for (const [, p] of this.pending) {
      clearTimeout(p.timer);
      p.reject(err);
    }
    this.pending.clear();
  }

  private handleMessage(ev: MessageEvent): void {
    let msg: WireServerMessage;
    try {
      msg = JSON.parse(typeof ev.data === 'string' ? ev.data : '');
    } catch {
      return;
    }
    switch (msg.t) {
      case 'welcome': {
        this.welcomed = true;
        const resolvers = this.welcomeResolvers;
        this.welcomeResolvers = [];
        for (const r of resolvers) r();
        break;
      }
      case 'reply': {
        const p = this.pending.get(msg.rid);
        if (!p) return;
        this.pending.delete(msg.rid);
        clearTimeout(p.timer);
        if (msg.ok) p.resolve(msg.data);
        else p.reject(new Error(msg.error ?? 'Request failed'));
        break;
      }
      case 'actionResult': {
        const p = this.pending.get(msg.rid);
        if (!p) return;
        this.pending.delete(msg.rid);
        clearTimeout(p.timer);
        p.resolve(msg.result);
        break;
      }
      case 'playerJoined':
        this.emit('playerJoined', msg.player);
        break;
      case 'playerLeft':
        this.emit('playerLeft', { id: msg.id });
        break;
      case 'playerMoved':
        this.emit('playerMoved', { id: msg.id, p: msg.p });
        break;
      case 'chat':
        this.emit('chat', msg.msg);
        break;
      case 'kick':
        this.hardDisconnected = true;
        this.manuallyClosed = true;
        this.emit('disconnected', { reason: msg.reason });
        this.ws?.close();
        break;
    }
  }

  async listCharacters(): Promise<CharacterSummary[]> {
    return this.request<CharacterSummary[]>((rid) => ({ t: 'listCharacters', rid }));
  }

  async createCharacter(req: CreateCharacterRequest): Promise<CharacterState> {
    return this.request<CharacterState>((rid) => ({ t: 'createCharacter', rid, req }));
  }

  async deleteCharacter(id: string): Promise<void> {
    await this.request<void>((rid) => ({ t: 'deleteCharacter', rid, id }));
  }

  async enterWorld(characterId: string): Promise<CharacterState> {
    const state = await this.request<CharacterState>((rid) => ({ t: 'enterWorld', rid, characterId }));
    this.characterId = characterId;
    return state;
  }

  async leaveWorld(): Promise<void> {
    this.characterId = null;
    // No explicit leave message in the wire protocol; the server detects it from socket close
    // or the next enterWorld call. Nothing to await here.
  }

  async send(action: ClientAction): Promise<ActionResult> {
    return this.request<ActionResult>((rid) => ({ t: 'action', rid, action }));
  }

  sendPresence(p: PresenceUpdate): void {
    this.wireSend({ t: 'presence', p });
  }

  sendChat(channel: ChatMessage['channel'], text: string): void {
    this.wireSend({ t: 'chat', channel, text });
  }

  on<K extends keyof BackendEvents>(ev: K, fn: (payload: BackendEvents[K]) => void): () => void {
    let set = this.listeners.get(ev);
    if (!set) { set = new Set(); this.listeners.set(ev, set); }
    set.add(fn as Listener);
    return () => set!.delete(fn as Listener);
  }

  private emit<K extends keyof BackendEvents>(ev: K, payload: BackendEvents[K]): void {
    const set = this.listeners.get(ev);
    if (set) for (const fn of [...set]) fn(payload);
  }

  /** Close the socket for good (e.g. returning to title screen / quitting). */
  close(): void {
    this.manuallyClosed = true;
    this.hardDisconnected = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.ws?.close();
  }
}
