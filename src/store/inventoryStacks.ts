import type { Item } from '../types/game';

/**
 * Two inventory entries are one stack when they share an id and quality.
 * A missing quality counts as 'normal', the same base rate the sell price uses.
 */
export function isSameInventoryStack(a: Item, b: Item): boolean {
  return a.id === b.id && (a.quality ?? 'normal') === (b.quality ?? 'normal');
}

/**
 * Drag the stack at `fromIndex` onto `toIndex`, in player inventory order.
 * - Same stack: merges into the target and removes the source.
 * - Different item: swaps the two entries.
 * - Index past the last entry (an empty or tool hotbar slot): moves the stack to the end.
 * Returns a new array, or null when the move would change nothing. The input is never mutated.
 */
export function moveInventoryStackInList(
  inventory: readonly Item[],
  fromIndex: number,
  toIndex: number,
): Item[] | null {
  const count = inventory.length;
  if (!Number.isInteger(fromIndex) || !Number.isInteger(toIndex)) return null;
  if (fromIndex < 0 || fromIndex >= count || toIndex < 0) return null;
  if (fromIndex === toIndex) return null;

  if (toIndex >= count) {
    if (fromIndex === count - 1) return null;
    return [...inventory.filter((_, index) => index !== fromIndex), inventory[fromIndex]];
  }

  const source = inventory[fromIndex];
  const target = inventory[toIndex];
  if (isSameInventoryStack(source, target)) {
    return inventory.flatMap<Item>((entry, index) => {
      if (index === fromIndex) return [];
      if (index === toIndex) return [{ ...entry, quantity: entry.quantity + source.quantity }];
      return [entry];
    });
  }

  const next = [...inventory];
  next[fromIndex] = target;
  next[toIndex] = source;
  return next;
}
