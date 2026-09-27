/**
 * LocalBackend — the "server" runs in the browser tab.
 * Uses the same shared reducer a real server would use, persists characters to localStorage.
 */
import type { CharacterState, CharacterSummary } from '@shared/types';
import type { ActionResult, ClientAction, CreateCharacterRequest, ChatMessage, PresenceUpdate } from '@shared/protocol';
import { createCharacter, summarize, migrateCharacter, handleAction, createSession, type SessionState, type ServerContext } from '@shared/logic';
import { makeUid } from '@shared/rng';
import type { Backend, BackendEvents } from './Backend';
import { WorldSimulation } from './simulation';

const STORAGE_PREFIX = 'driftwake:';
const INDEX_KEY = `${STORAGE_PREFIX}characters`;

type Listener = (payload: any) => void;

export class LocalBackend implements Backend {
  readonly kind = 'local' as const;
  private listeners = new Map<string, Set<Listener>>();
  private current: CharacterState | null = null;
  private session: SessionState = createSession();
  private saveTimer: number | null = null;
  /** Optional hook so a simulation layer (bots) can observe presence */
  onPresence?: (p: PresenceUpdate) => void;
  onChat?: (msg: ChatMessage) => void;
  /** Simulated "other players" that make the offline world feel alive (see simulation.ts). */
  private sim: WorldSimulation | null = null;

  async connect(): Promise<void> { /* nothing to do */ }

  private readIndex(): string[] {
    try { return JSON.parse(localStorage.getItem(INDEX_KEY) || '[]'); } catch { return []; }
  }
  private writeIndex(ids: string[]) { localStorage.setItem(INDEX_KEY, JSON.stringify(ids)); }
  private load(id: string): CharacterState | null {
    try {
      const raw = localStorage.getItem(`${STORAGE_PREFIX}char:${id}`);
      return raw ? migrateCharacter(JSON.parse(raw)) : null;
    } catch { return null; }
  }
  private persist(c: CharacterState) {
    localStorage.setItem(`${STORAGE_PREFIX}char:${c.id}`, JSON.stringify(c));
  }
  private schedulePersist() {
    if (this.saveTimer !== null) return;
    this.saveTimer = window.setTimeout(() => {
      this.saveTimer = null;
      if (this.current) this.persist(this.current);
    }, 400);
  }

  async listCharacters(): Promise<CharacterSummary[]> {
    return this.readIndex().map((id) => this.load(id)).filter((c): c is CharacterState => !!c).map(summarize)
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }

  async createCharacter(req: CreateCharacterRequest): Promise<CharacterState> {
    const name = req.name.trim();
    if (name.length < 2 || name.length > 14) throw new Error('Name must be 2-14 characters.');
    if (!/^[\p{L}\p{N} _'-]+$/u.test(name)) throw new Error('Name contains invalid characters.');
    const existing = await this.listCharacters();
    if (existing.some((c) => c.name.toLowerCase() === name.toLowerCase())) throw new Error('That name is taken.');
    const c = createCharacter({ ...req, name }, makeUid('c'), Date.now());
    this.persist(c);
    this.writeIndex([...this.readIndex(), c.id]);
    return c;
  }

  async deleteCharacter(id: string): Promise<void> {
    localStorage.removeItem(`${STORAGE_PREFIX}char:${id}`);
    this.writeIndex(this.readIndex().filter((x) => x !== id));
  }

  async enterWorld(characterId: string): Promise<CharacterState> {
    const c = this.load(characterId);
    if (!c) throw new Error('Character not found');
    this.current = c;
    this.session = createSession();
    this.sim?.dispose();
    this.sim = new WorldSimulation(this);
    this.onPresence = (p) => this.sim?.onMapChanged(p.mapId);
    this.onChat = (msg) => this.sim?.onPlayerChat(msg);
    this.sim.start(c.mapId, c.name);
    return structuredClone(c);
  }

  async leaveWorld(): Promise<void> {
    if (this.current) this.persist(this.current);
    this.current = null;
    this.sim?.dispose();
    this.sim = null;
    this.onPresence = undefined;
    this.onChat = undefined;
  }

  private ctx(): ServerContext {
    return { now: Date.now(), rng: Math.random, session: this.session, uid: () => makeUid('i') };
  }

  async send(action: ClientAction): Promise<ActionResult> {
    if (!this.current) return { ok: false, error: 'Not in world', events: [], state: null as unknown as CharacterState };
    let res;
    try {
      res = handleAction(this.current, action, this.ctx());
    } catch (e) {
      console.error('[LocalBackend] reducer crashed on', action, e);
      return { ok: false, error: 'Server error', events: [], state: structuredClone(this.current) };
    }
    if (res.ok) {
      this.current = res.state;
      this.schedulePersist();
      this.sim?.onMapChanged(this.current.mapId);
    }
    return { ok: res.ok, error: res.error, events: res.events, state: structuredClone(this.current) };
  }

  sendPresence(p: PresenceUpdate): void { this.onPresence?.(p); }

  sendChat(channel: ChatMessage['channel'], text: string): void {
    const msg: ChatMessage = { id: makeUid('m'), channel, from: this.current?.name ?? '?', text, at: Date.now() };
    this.emit('chat', msg);
    this.onChat?.(msg);
  }

  on<K extends keyof BackendEvents>(ev: K, fn: (payload: BackendEvents[K]) => void): () => void {
    let set = this.listeners.get(ev);
    if (!set) { set = new Set(); this.listeners.set(ev, set); }
    set.add(fn as Listener);
    return () => set!.delete(fn as Listener);
  }

  /** Public so simulation layers can inject remote players / chat. */
  emit<K extends keyof BackendEvents>(ev: K, payload: BackendEvents[K]) {
    const set = this.listeners.get(ev);
    if (set) for (const fn of [...set]) fn(payload);
  }

  /** Flush pending save (e.g. on page unload). */
  flush() { if (this.current) this.persist(this.current); }

  /**
   * DEV/QA ONLY: mutate the authoritative local character directly (e.g. set level, grant items).
   * Returns the new state; callers should pass it to session.applyState(). Not part of Backend.
   */
  devMutate(fn: (s: CharacterState) => void): CharacterState | null {
    if (!this.current) return null;
    const next = structuredClone(this.current);
    fn(next);
    this.current = next;
    this.schedulePersist();
    return structuredClone(next);
  }
}
