import type { CharacterState, QuestDef } from '../types';

/** Quests this NPC can offer right now. STUB. */
export function questsOfferedBy(_state: CharacterState, _npcId: string): QuestDef[] { return []; }
/** Active quests whose turn-in NPC is this npc and all objectives are complete. STUB. */
export function questsReadyAt(_state: CharacterState, _npcId: string): QuestDef[] { return []; }
/** Active quests involving this NPC that aren't finished (for progress text). STUB. */
export function questsInProgressAt(_state: CharacterState, _npcId: string): QuestDef[] { return []; }
/** True if all objectives are met. STUB. */
export function isQuestReady(_state: CharacterState, _questId: string): boolean { return false; }
/** NPC marker for overhead icon: '!' available, '?' ready to turn in, '…' in progress, null none. STUB. */
export function npcQuestMarker(_state: CharacterState, _npcId: string): '!' | '?' | '…' | null { return null; }

export interface ObjectiveView { text: string; current: number; target: number; done: boolean }
/** Human-readable objective progress for the quest log / tracker. STUB. */
export function questObjectiveProgress(_state: CharacterState, _questId: string): ObjectiveView[] { return []; }
