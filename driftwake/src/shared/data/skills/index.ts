import type { SkillDef } from '../../types';
import { VANGUARD_SKILLS } from './vanguard';
import { STORMCALLER_SKILLS } from './stormcaller';
import { WINDRUNNER_SKILLS } from './windrunner';
import { SHADE_SKILLS } from './shade';

export const SKILL_LIST: SkillDef[] = [...VANGUARD_SKILLS, ...STORMCALLER_SKILLS, ...WINDRUNNER_SKILLS, ...SHADE_SKILLS];
