/**
 * Client-side typed event bus connecting engine (Phaser scenes), UI (DOM) and session.
 */
import type { CharacterState, DerivedStats, StatMods, SkillIconSpec } from '@shared/types';
import type { GameEvent, ChatMessage, NotifyKind } from '@shared/protocol';

export type PanelId =
  | 'inventory' | 'character' | 'skills' | 'quests' | 'professions' | 'map' | 'settings' | 'menu'
  | 'bestiary' | 'chat' | 'help' | 'achievements';

export interface ClientEventMap {
  /** Authoritative character state replaced (after any action). */
  state: { state: CharacterState; stats: DerivedStats };
  /** Every GameEvent from the backend, in order. */
  game: GameEvent;
  /** Runtime vitals changed (engine-owned hp/mp between syncs). */
  vitals: { hp: number; mp: number; maxHp: number; maxMp: number };
  /** Skill/item cooldowns: key -> readyAt timestamp (performance.now()-based ms) */
  cooldowns: Record<string, { readyAt: number; duration: number }>;
  /** Engine-side skill buffs (war cries etc). `expiresAt` is performance.now()-based ms — distinct
   *  from CharacterState.buffs (food/elixirs), whose `expiresAt` is Date.now()-based; the top buff
   *  bar (buffbar.ts) merges both, converting each to its own clock. `stats` lets the buff bar's
   *  tooltip show what the buff actually does (see combat/Buffs.ts's emit). */
  buffs: { id: string; name: string; expiresAt: number; icon?: SkillIconSpec; stats?: StatMods }[];

  // --- engine -> UI
  'ui:dialogue': { npcId: string };
  'ui:toggle': { panel: PanelId };
  'ui:open': { panel: PanelId };
  'ui:closeAll': void;
  'ui:shop': { shopId: string; npcId?: string };
  'ui:crafting': { professionId?: string; npcId?: string };
  'ui:toast': { text: string; kind: NotifyKind };
  /** Big centered banner, e.g. map name, "LEVEL UP!", boss name */
  'ui:banner': { title: string; subtitle?: string; kind?: 'map' | 'level' | 'boss' | 'quest' | 'job' | 'achievement' };
  'ui:bossBar': { name: string; title?: string; hp: number; maxHp: number } | null;
  /** Show interaction hint near bottom ("↑ Talk to Pell") or null */
  'ui:hint': { text: string } | null;
  'ui:death': { xpLost: number };
  'world:entered': { mapId: string };
  /** Minimap data (engine publishes each ~250ms) */
  'world:minimap': { mapId: string; width: number; height: number; player: { x: number; y: number }; npcs: { x: number; y: number; id: string }[]; portals: { x: number; y: number; to: string }[]; monsters: { x: number; y: number; boss?: boolean }[]; others: { x: number; y: number }[] };
  chat: ChatMessage;

  // --- UI -> engine
  /** UI grabbed keyboard focus (typing in chat / modal open). Engine ignores game input while true. */
  'input:capture': boolean;
  /** Activate hotbar slot (clicked in UI) */
  'hotbar:activate': { index: number };
  /** Request respawn after death dialog */
  'player:respawn': void;
  /** Keybinds changed in settings */
  'keybinds:changed': void;
  /** Settings changed (volume etc.) */
  'settings:changed': void;
  /** Quit to title */
  'game:quit': void;
  /** UI-only: which quests are pinned to the right-side tracker changed (Quest Log pin toggle).
   *  Not part of CharacterState — purely a per-client display preference (see ui/state.ts). The
   *  quest tracker listens for this to re-render without waiting for the next 'state' event. */
  'ui:questPinsChanged': void;
}

type Handler<T> = (payload: T) => void;

class EventBus {
  private handlers = new Map<string, Set<Handler<any>>>();

  on<K extends keyof ClientEventMap>(ev: K, fn: Handler<ClientEventMap[K]>): () => void {
    let set = this.handlers.get(ev as string);
    if (!set) { set = new Set(); this.handlers.set(ev as string, set); }
    set.add(fn);
    return () => set!.delete(fn);
  }

  emit<K extends keyof ClientEventMap>(ev: K, ...payload: ClientEventMap[K] extends void ? [] : [ClientEventMap[K]]): void {
    const set = this.handlers.get(ev as string);
    if (!set) return;
    for (const fn of [...set]) {
      try { fn(payload[0] as any); } catch (e) { console.error(`[bus] handler error for ${String(ev)}`, e); }
    }
  }
}

export const bus = new EventBus();
