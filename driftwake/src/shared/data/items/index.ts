import type { ItemDef } from '../../types';
import { EQUIPMENT_ITEMS } from './equipment';
import { CONSUMABLE_ITEMS } from './consumables';
import { MATERIAL_ITEMS } from './materials';
import { QUEST_ITEMS } from './questItems';
import { SIDE_QUEST_ITEMS } from './sideQuestItems';

export const ITEM_LIST: ItemDef[] = [...EQUIPMENT_ITEMS, ...CONSUMABLE_ITEMS, ...MATERIAL_ITEMS, ...QUEST_ITEMS, ...SIDE_QUEST_ITEMS];
