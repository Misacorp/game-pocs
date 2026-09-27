/** STUB — WebSocket backend adapter (implemented later). */
import type { Backend, BackendEvents } from './Backend';
import type { CharacterState, CharacterSummary } from '@shared/types';
import type { ActionResult, ClientAction, CreateCharacterRequest, ChatMessage, PresenceUpdate } from '@shared/protocol';

export class WsBackend implements Backend {
  readonly kind = 'ws' as const;
  constructor(readonly url: string) {}
  async connect(): Promise<void> { throw new Error('WsBackend not implemented yet'); }
  async listCharacters(): Promise<CharacterSummary[]> { return []; }
  async createCharacter(_req: CreateCharacterRequest): Promise<CharacterState> { throw new Error('nyi'); }
  async deleteCharacter(_id: string): Promise<void> {}
  async enterWorld(_id: string): Promise<CharacterState> { throw new Error('nyi'); }
  async leaveWorld(): Promise<void> {}
  async send(_a: ClientAction): Promise<ActionResult> { throw new Error('nyi'); }
  sendPresence(_p: PresenceUpdate): void {}
  sendChat(_c: ChatMessage['channel'], _t: string): void {}
  on<K extends keyof BackendEvents>(_ev: K, _fn: (p: BackendEvents[K]) => void): () => void { return () => {}; }
}
