/**
 * Backend adapter contract. The game only talks to the "server" through this interface.
 *  - LocalBackend: runs the shared authoritative reducer in-browser, persists to localStorage,
 *    and simulates a few wandering "other players" + chat so the world feels alive.
 *  - WsBackend: speaks the wire protocol (src/shared/protocol.ts) to a Node server (server/).
 */
import type { CharacterState, CharacterSummary } from '@shared/types';
import type { ActionResult, ClientAction, CreateCharacterRequest, RemotePlayer, ChatMessage, PresenceUpdate } from '@shared/protocol';

export interface BackendEvents {
  playerJoined: RemotePlayer;
  playerLeft: { id: string };
  playerMoved: { id: string; p: PresenceUpdate };
  chat: ChatMessage;
  disconnected: { reason: string };
}

export interface Backend {
  readonly kind: 'local' | 'ws';
  connect(): Promise<void>;
  listCharacters(): Promise<CharacterSummary[]>;
  createCharacter(req: CreateCharacterRequest): Promise<CharacterState>;
  deleteCharacter(id: string): Promise<void>;
  /** Load a character and join the world with it. */
  enterWorld(characterId: string): Promise<CharacterState>;
  leaveWorld(): Promise<void>;
  /** Send an intent; resolves with the authoritative result. */
  send(action: ClientAction): Promise<ActionResult>;
  /** Fire-and-forget realtime position updates (throttled by caller). */
  sendPresence(p: PresenceUpdate): void;
  sendChat(channel: ChatMessage['channel'], text: string): void;
  on<K extends keyof BackendEvents>(ev: K, fn: (payload: BackendEvents[K]) => void): () => void;
}
