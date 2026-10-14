import type { CraftingRecipe } from '../types/game';

/** Hide recipes above the player's level. A missing level is treated as 1. */
export function filterCraftingRecipesByLevel(
  recipes: readonly CraftingRecipe[],
  playerLevel: number | null | undefined,
): CraftingRecipe[] {
  return recipes.filter((recipe) => recipe.requiredLevel <= (playerLevel ?? 1));
}

export function recipesAvailableLabel(count: number): string {
  return `${count} recipes available`;
}
