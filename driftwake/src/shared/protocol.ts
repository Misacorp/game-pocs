/**
 * Client <-> Backend protocol.
 *
 * The client sends ClientActions (intents). The backend (LocalBackend in-browser today,
 * a Node WebSocket server tomorrow) validates them with the shared reducer in
 * src/shared/logic and replies with an ActionResult containing GameEvents and the
 * new authoritative CharacterState.
 *
 * Real-time simulation (movement, monster AI, hit detection) runs on the client for now;
 * the backend is authoritative over persistent state: xp, loot, inventory, quests,
 * crafting, currency, progression.
 */
import type {
  CharacterState, CharacterSummary, ClassId, Appearance, EquipSlot, InventoryTab,
  StatKey, HotbarEntry, CraftingProfessionId, DialogueAction, AdvancedJobId, ItemInstance, StatMods,
} from './types';

export type ClientAction =
  // combat / world
  | { type: 'killMonster'; monsterId: string; mapId: string; x: number; y: number }
  | { type: 'pickup'; dropId: string }
  | { type: 'gather'; nodeId: string; mapId: string }
  | { type: 'changeMap'; mapId: string; portalId?: string; fromPortalId?: string }
  | { type: 'syncVitals'; hp: number; mp: number; x: number; y: number; playTimeMs?: number }
  | { type: 'die' }
  | { type: 'respawn' }
  // inventory
  | { type: 'equip'; uid: string }
  | { type: 'unequip'; slot: EquipSlot }
  | { type: 'useItem'; uid?: string; itemId?: string }
  | { type: 'discardItem'; uid: string; qty?: number }
  | { type: 'moveItem'; tab: InventoryTab; from: number; to: number }
  | { type: 'sortInventory'; tab: InventoryTab }
  // progression
  | { type: 'allocateStat'; stat: StatKey; amount: number }
  | { type: 'learnSkill'; skillId: string }
  | { type: 'setHotbar'; index: number; entry: HotbarEntry | null }
  | { type: 'jobAdvance'; jobId: AdvancedJobId }
  | { type: 'setTitle'; title: string | null }
  // quests & npcs
  | { type: 'acceptQuest'; questId: string }
  | { type: 'abandonQuest'; questId: string }
  | { type: 'completeQuest'; questId: string; choiceId?: string; chooseIndex?: number }
  | { type: 'talk'; npcId: string }
  | { type: 'dialogueAction'; npcId: string; action: DialogueAction }
  // economy
  | { type: 'buy'; shopId: string; itemId: string; qty: number }
  | { type: 'sell'; uid: string; qty?: number }
  | { type: 'buyRecipe'; recipeId: string }
  // professions
  | { type: 'learnProfession'; professionId: CraftingProfessionId }
  | { type: 'unlearnProfession'; professionId: CraftingProfessionId }
  | { type: 'craft'; recipeId: string; qty?: number }
  | { type: 'salvage'; uid: string }
  | { type: 'enhance'; uid: string; stoneItemId: string }
  // pets
  | { type: 'summonPet'; itemId: string | null };

export type ActionType = ClientAction['type'];

export interface LootDrop {
  dropId: string;
  /** Either an item or gold */
  itemId?: string;
  qty: number;
  gold?: number;
  /** Pre-rolled instance data for equipment */
  instance?: ItemInstance;
  rarity?: string;
}

export type NotifyKind = 'info' | 'good' | 'warn' | 'error' | 'loot' | 'quest' | 'system';

export type GameEvent =
  | { type: 'xp'; amount: number; bonus?: number }
  | { type: 'levelUp'; level: number; ap: number; sp: number }
  | { type: 'gold'; amount: number }
  | { type: 'itemAdded'; itemId: string; qty: number; uid?: string; rarity?: string }
  | { type: 'itemRemoved'; itemId: string; qty: number }
  | { type: 'lootDropped'; drops: LootDrop[]; x: number; y: number }
  | { type: 'questAccepted'; questId: string }
  | { type: 'questProgress'; questId: string; objective: number; value: number; target: number }
  | { type: 'questReady'; questId: string }
  | { type: 'questCompleted'; questId: string; choiceId?: string }
  | { type: 'questAbandoned'; questId: string }
  | { type: 'notify'; text: string; kind: NotifyKind }
  | { type: 'buffApplied'; buffId: string; name: string; durationMs: number }
  | { type: 'heal'; hp: number; mp: number }
  | { type: 'itemUsed'; itemId: string; cooldownGroup?: string; cooldownMs?: number }
  | { type: 'professionXp'; professionId: string; amount: number }
  | { type: 'professionLevelUp'; professionId: string; level: number }
  | { type: 'professionLearned'; professionId: string }
  | { type: 'recipeLearned'; recipeId: string }
  | { type: 'crafted'; itemId: string; qty: number; rarity?: string }
  | { type: 'skillLearned'; skillId: string; level: number }
  | { type: 'jobAdvanced'; jobId: string }
  | { type: 'enhanceResult'; success: boolean; stars: number; itemId: string; destroyed?: boolean }
  | { type: 'mapChanged'; mapId: string; portalId?: string; x: number; y: number }
  | { type: 'reputation'; faction: string; amount: number; total: number }
  | { type: 'equipChanged' }
  | { type: 'statsChanged' }
  | { type: 'died'; xpLost: number }
  | { type: 'respawned'; mapId: string; x: number; y: number }
  | { type: 'titleUnlocked'; title: string }
  | { type: 'gathered'; nodeId: string }
  | { type: 'flagSet'; flag: string; value: boolean | number | string }
  | { type: 'openUi'; panel: 'shop' | 'crafting'; id?: string }
  | { type: 'bossDefeated'; monsterId: string }
  | { type: 'petChanged'; itemId: string | null }
  | { type: 'achievementUnlocked'; id: string };

export interface ActionResult {
  ok: boolean;
  error?: string;
  events: GameEvent[];
  /** Authoritative state after the action (full snapshot; a network backend may send patches). */
  state: CharacterState;
}

export interface CreateCharacterRequest {
  name: string;
  classId: ClassId;
  appearance: Appearance;
}

// ---- Real-time / social (presence of other players) ----------------------

export interface RemotePlayer {
  id: string;
  name: string;
  classId: ClassId;
  jobId: string;
  level: number;
  appearance: Appearance;
  /** Equipment summary for rendering */
  weaponItemId?: string;
  armorItemId?: string;
  helmetItemId?: string;
  mapId: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: 1 | -1;
  anim: string;
  title?: string;
}

export interface ChatMessage {
  id: string;
  channel: 'map' | 'world' | 'system' | 'party' | 'whisper';
  from: string;
  text: string;
  at: number;
}

export interface PresenceUpdate {
  x: number; y: number; vx: number; vy: number; facing: 1 | -1; anim: string; mapId: string;
}

// ---- Wire envelope for the future WebSocket backend ------------------------

export type WireClientMessage =
  | { t: 'hello'; token?: string; protocol: number }
  | { t: 'listCharacters'; rid: number }
  | { t: 'createCharacter'; rid: number; req: CreateCharacterRequest }
  | { t: 'deleteCharacter'; rid: number; id: string }
  | { t: 'enterWorld'; rid: number; characterId: string }
  | { t: 'action'; rid: number; action: ClientAction }
  | { t: 'presence'; p: PresenceUpdate }
  | { t: 'chat'; channel: ChatMessage['channel']; text: string };

export type WireServerMessage =
  | { t: 'welcome'; protocol: number; serverTime: number }
  | { t: 'reply'; rid: number; ok: boolean; error?: string; data?: unknown }
  | { t: 'actionResult'; rid: number; result: ActionResult }
  | { t: 'playerJoined'; player: RemotePlayer }
  | { t: 'playerLeft'; id: string }
  | { t: 'playerMoved'; id: string; p: PresenceUpdate }
  | { t: 'chat'; msg: ChatMessage }
  | { t: 'kick'; reason: string };

export const PROTOCOL_VERSION = 1;

export type { CharacterSummary, StatMods };
