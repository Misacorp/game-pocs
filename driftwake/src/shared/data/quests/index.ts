import type { QuestDef } from '../../types';
import { MAIN_QUESTS } from './main';
import { SIDE_QUESTS } from './side';
import { JOB_QUESTS } from './job';
import { PROFESSION_QUESTS } from './profession';
import { FACTION_QUESTS } from './faction';

export const QUEST_LIST: QuestDef[] = [...MAIN_QUESTS, ...SIDE_QUESTS, ...JOB_QUESTS, ...PROFESSION_QUESTS, ...FACTION_QUESTS];
