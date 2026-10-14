import type { Item } from '../types/game';

type CraftingStack = Pick<Item, 'id' | 'type' | 'name' | 'quantity'>;

/**
 * Recipe keys are resource ids (`wood`, `stone`, `iron`).
 * Stack ids are often unique instances, so also accept `type` and display name.
 */
export function inventoryItemMatchesInput(
  item: Pick<Item, 'id' | 'type' | 'name'>,
  inputId: string,
): boolean {
  return (
    item.id === inputId ||
    item.type === inputId ||
    item.name?.toLowerCase() === inputId.toLowerCase()
  );
}

export function countCraftingInput(inventory: readonly CraftingStack[], inputId: string): number {
  return inventory.reduce((total, item) => {
    return total + (inventoryItemMatchesInput(item, inputId) ? item.quantity : 0);
  }, 0);
}

/**
 * Removes recipe inputs across every matching stack.
 * Returns null when the inventory cannot pay the full cost.
 */
export function consumeCraftingInputs<T extends CraftingStack>(
  inventory: readonly T[],
  inputs: Record<string, number>,
): T[] | null {
  const quantities = inventory.map((item) => item.quantity);

  for (const [inputId, required] of Object.entries(inputs)) {
    let needed = required;
    for (let index = 0; index < inventory.length && needed > 0; index += 1) {
      if (quantities[index] <= 0) continue;
      if (!inventoryItemMatchesInput(inventory[index], inputId)) continue;
      const take = Math.min(quantities[index], needed);
      quantities[index] -= take;
      needed -= take;
    }
    if (needed > 0) return null;
  }

  return inventory
    .map((item, index) => (
      quantities[index] === item.quantity ? item : { ...item, quantity: quantities[index] }
    ))
    .filter((item) => item.quantity > 0);
}

export function hasCraftingInputs(
  inventory: readonly CraftingStack[],
  inputs: Record<string, number>,
): boolean {
  return consumeCraftingInputs(inventory, inputs) !== null;
}
