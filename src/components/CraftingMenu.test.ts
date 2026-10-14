import { describe, expect, it, vi } from 'vitest';

// Node's experimental localStorage has no methods unless --localstorage-file is set.
// The game store persists through it, so install a memory shim before the store loads.
vi.hoisted(() => {
  const memory = new Map<string, string>();
  const storage: Storage = {
    getItem: (key) => memory.get(key) ?? null,
    setItem: (key, value) => {
      memory.set(key, String(value));
    },
    removeItem: (key) => {
      memory.delete(key);
    },
    clear: () => {
      memory.clear();
    },
    key: (index) => Array.from(memory.keys())[index] ?? null,
    get length() {
      return memory.size;
    },
  };
  Object.defineProperty(globalThis, 'localStorage', {
    value: storage,
    configurable: true,
  });
});

import { CRAFTING_RECIPES } from '../store/gameStore';
import { filterCraftingRecipesByLevel, recipesAvailableLabel } from './craftingRecipeFilter';

function shownIds(level: number | null | undefined): string[] {
  return filterCraftingRecipesByLevel(CRAFTING_RECIPES, level).map((recipe) => recipe.id);
}

describe('crafting menu level filter', () => {
  it('shows only recipes at or below level 1', () => {
    const shown = filterCraftingRecipesByLevel(CRAFTING_RECIPES, 1);
    const expected = CRAFTING_RECIPES.filter((recipe) => recipe.requiredLevel <= 1);

    expect(shown.map((recipe) => recipe.id)).toEqual(expected.map((recipe) => recipe.id));
    expect(shown.every((recipe) => recipe.requiredLevel <= 1)).toBe(true);
    expect(CRAFTING_RECIPES.some((recipe) => recipe.requiredLevel > 1)).toBe(true);
    expect(shown.find((recipe) => recipe.requiredLevel > 1)).toBeUndefined();
    expect(recipesAvailableLabel(shown.length)).toBe(`${shown.length} recipes available`);
  });

  it('shows recipes at or below level 5 and hides higher ones', () => {
    const shown = filterCraftingRecipesByLevel(CRAFTING_RECIPES, 5);
    const expected = CRAFTING_RECIPES.filter((recipe) => recipe.requiredLevel <= 5);

    expect(shown.map((recipe) => recipe.id)).toEqual(expected.map((recipe) => recipe.id));
    expect(shown.find((recipe) => recipe.id === 'upgrade_hoe_iron')?.requiredLevel).toBe(5);
    expect(shown.find((recipe) => recipe.id === 'craft_sprinkler_quality')).toBeUndefined();
    expect(shown.find((recipe) => recipe.id === 'craft_keg')).toBeUndefined();
    expect(shown.length).toBeLessThan(CRAFTING_RECIPES.length);
    expect(recipesAvailableLabel(shown.length)).toBe(`${shown.length} recipes available`);
  });

  it('shows every recipe at a high level', () => {
    const shown = filterCraftingRecipesByLevel(CRAFTING_RECIPES, 99);

    expect(shown.map((recipe) => recipe.id)).toEqual(CRAFTING_RECIPES.map((recipe) => recipe.id));
    expect(shown).toHaveLength(CRAFTING_RECIPES.length);
    expect(shownIds(99)).toEqual(CRAFTING_RECIPES.map((recipe) => recipe.id));
    expect(recipesAvailableLabel(shown.length)).toBe(`${CRAFTING_RECIPES.length} recipes available`);
  });

  it('treats a missing player level as level 1', () => {
    expect(shownIds(undefined)).toEqual(shownIds(1));
    expect(shownIds(null)).toEqual(shownIds(1));
  });
});
