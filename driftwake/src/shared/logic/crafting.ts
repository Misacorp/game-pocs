import type { CharacterState } from '../types';
import { RECIPES } from '../data';
import { countItem } from './items';

export interface RecipeCheck {
  canCraft: boolean;
  reason?: string;
  /** max times craftable with current materials (and gold) */
  maxQty: number;
  inputs: { itemId: string; have: number; need: number }[];
}

/** Can the character craft this recipe right now? */
export function recipeAvailability(state: CharacterState, recipeId: string): RecipeCheck {
  const def = RECIPES[recipeId];
  if (!def) return { canCraft: false, reason: 'Unknown recipe', maxQty: 0, inputs: [] };

  const inputs = def.inputs.map((i) => ({ itemId: i.itemId, have: countItem(state, i.itemId), need: i.qty }));

  if (!state.knownRecipes.includes(recipeId)) {
    return { canCraft: false, reason: 'Recipe not known', maxQty: 0, inputs };
  }
  const prof = state.professions[def.profession];
  if (!prof) return { canCraft: false, reason: 'Profession not learned', maxQty: 0, inputs };
  if (prof.level < def.level) return { canCraft: false, reason: `Requires ${def.profession} level ${def.level}`, maxQty: 0, inputs };

  let maxQty = Infinity;
  for (const inp of inputs) maxQty = Math.min(maxQty, Math.floor(inp.have / inp.need));
  if (def.goldCost) maxQty = Math.min(maxQty, Math.floor(state.gold / def.goldCost));
  if (!isFinite(maxQty) || maxQty < 0) maxQty = 0;

  const canCraft = maxQty > 0;
  return { canCraft, reason: canCraft ? undefined : 'Missing materials or gold', maxQty, inputs };
}
