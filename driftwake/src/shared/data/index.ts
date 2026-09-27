/**
 * Content registry. Each content file exports an array; this module indexes them by id.
 * Import registries from here (never from individual files) so validation stays central.
 */
import type {
  ItemDef, MonsterDef, SkillDef, JobDef, MapDef, NpcDef, QuestDef, DialogueDef,
  RecipeDef, ProfessionDef, GatherNodeDef, ShopDef, AchievementDef,
} from '../types';

import { ITEM_LIST } from './items';
import { ACHIEVEMENT_LIST } from './achievements';
import { MONSTER_LIST } from './monsters';
import { SKILL_LIST } from './skills';
import { JOB_LIST } from './classes';
import { MAP_LIST } from './maps';
import { NPC_LIST } from './npcs';
import { QUEST_LIST } from './quests';
import { DIALOGUE_LIST } from './dialogues';
import { RECIPE_LIST } from './recipes';
import { PROFESSION_LIST } from './professions';
import { GATHER_NODE_LIST } from './gathering';
import { SHOP_LIST } from './shops';
import { SET_LIST, type SetDef } from './sets';

function index<T extends { id: string }>(list: T[], label: string): Record<string, T> {
  const out: Record<string, T> = {};
  for (const e of list) {
    if (out[e.id]) console.warn(`[data] duplicate ${label} id: ${e.id}`);
    out[e.id] = e;
  }
  return out;
}

export const ITEMS = index<ItemDef>(ITEM_LIST, 'item');
export const MONSTERS = index<MonsterDef>(MONSTER_LIST, 'monster');
export const SKILLS = index<SkillDef>(SKILL_LIST, 'skill');
export const JOBS = index<JobDef>(JOB_LIST, 'job');
export const MAPS = index<MapDef>(MAP_LIST, 'map');
export const NPCS = index<NpcDef>(NPC_LIST, 'npc');
export const QUESTS = index<QuestDef>(QUEST_LIST, 'quest');
export const DIALOGUES = index<DialogueDef>(DIALOGUE_LIST, 'dialogue');
export const RECIPES = index<RecipeDef>(RECIPE_LIST, 'recipe');
export const PROFESSIONS = index<ProfessionDef>(PROFESSION_LIST, 'profession');
export const GATHER_NODES = index<GatherNodeDef>(GATHER_NODE_LIST, 'gatherNode');
export const SHOPS = index<ShopDef>(SHOP_LIST, 'shop');
export const SETS = index<SetDef>(SET_LIST, 'set');
export const ACHIEVEMENTS = index<AchievementDef>(ACHIEVEMENT_LIST, 'achievement');

export type { SetDef };
export {
  ITEM_LIST, MONSTER_LIST, SKILL_LIST, JOB_LIST, MAP_LIST, NPC_LIST, QUEST_LIST, DIALOGUE_LIST,
  RECIPE_LIST, PROFESSION_LIST, GATHER_NODE_LIST, SHOP_LIST, SET_LIST, ACHIEVEMENT_LIST,
};
