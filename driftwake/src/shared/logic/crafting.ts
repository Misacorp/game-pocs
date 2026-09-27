import type { CharacterState } from '../types';

export interface RecipeCheck {
  canCraft: boolean;
  reason?: string;
  /** max times craftable with current materials */
  maxQty: number;
  inputs: { itemId: string; have: number; need: number }[];
}

/** Can the character craft this recipe right now? STUB. */
export function recipeAvailability(_state: CharacterState, _recipeId: string): RecipeCheck {
  return { canCraft: false, reason: 'Not implemented', maxQty: 0, inputs: [] };
}
