import type { DialogueDef } from '../../types';
import { STORY_DIALOGUES } from './story';
import { TOWN_DIALOGUES } from './town';

export const DIALOGUE_LIST: DialogueDef[] = [...STORY_DIALOGUES, ...TOWN_DIALOGUES];
