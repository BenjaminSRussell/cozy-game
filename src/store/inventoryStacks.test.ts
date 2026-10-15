import { describe, expect, it } from 'vitest';
import { ItemType, type Item } from '../types/game';
import { isSameInventoryStack, moveInventoryStackInList } from './inventoryStacks';

function item(id: string, quantity: number, quality?: Item['quality']): Item {
  return {
    id,
    name: id,
    type: ItemType.CROP,
    quantity,
    sellValue: 1,
    spriteId: id,
    rarity: 'common',
    ...(quality ? { quality } : {}),
  };
}

describe('isSameInventoryStack', () => {
  it('matches on id and treats a missing quality as normal', () => {
    expect(isSameInventoryStack(item('wheat', 1), item('wheat', 4))).toBe(true);
    expect(isSameInventoryStack(item('wheat', 1), item('wheat', 1, 'normal'))).toBe(true);
  });

  it('keeps different ids and different qualities apart', () => {
    expect(isSameInventoryStack(item('wheat', 1), item('corn', 1))).toBe(false);
    expect(isSameInventoryStack(item('wheat', 1), item('wheat', 1, 'gold'))).toBe(false);
  });
});

describe('moveInventoryStackInList', () => {
  it('merges a matching stack into an earlier target and drops the source', () => {
    const inventory = [item('wheat', 2), item('stone', 5), item('wheat', 3)];

    expect(moveInventoryStackInList(inventory, 2, 0)).toEqual([
      expect.objectContaining({ id: 'wheat', quantity: 5 }),
      expect.objectContaining({ id: 'stone', quantity: 5 }),
    ]);
  });

  it('merges into a later target and keeps that target in its slot', () => {
    const inventory = [item('stone', 5), item('wheat', 3), item('wheat', 2)];

    expect(moveInventoryStackInList(inventory, 1, 2)).toEqual([
      expect.objectContaining({ id: 'stone', quantity: 5 }),
      expect.objectContaining({ id: 'wheat', quantity: 5 }),
    ]);
  });

  it('swaps two different items and leaves the rest in place', () => {
    const inventory = [item('wheat', 2), item('stone', 5), item('corn', 1)];

    expect(moveInventoryStackInList(inventory, 0, 2)).toEqual([
      expect.objectContaining({ id: 'corn', quantity: 1 }),
      expect.objectContaining({ id: 'stone', quantity: 5 }),
      expect.objectContaining({ id: 'wheat', quantity: 2 }),
    ]);
  });

  it('swaps items that share an id but differ in quality instead of merging', () => {
    const gold = item('wheat', 1, 'gold');

    expect(moveInventoryStackInList([item('wheat', 2), gold], 0, 1)).toEqual([
      gold,
      item('wheat', 2),
    ]);
  });

  it('moves a stack to the end when the target is past the last entry', () => {
    const inventory = [item('wheat', 2), item('stone', 5)];

    expect(moveInventoryStackInList(inventory, 0, 7)).toEqual([
      expect.objectContaining({ id: 'stone', quantity: 5 }),
      expect.objectContaining({ id: 'wheat', quantity: 2 }),
    ]);
  });

  it('returns null when the move would change nothing or is not a valid index', () => {
    const inventory = [item('wheat', 2), item('stone', 5)];

    expect(moveInventoryStackInList(inventory, 0, 0)).toBeNull();
    expect(moveInventoryStackInList(inventory, 1, 7)).toBeNull();
    expect(moveInventoryStackInList(inventory, 2, 0)).toBeNull();
    expect(moveInventoryStackInList(inventory, -1, 0)).toBeNull();
    expect(moveInventoryStackInList(inventory, 0, -1)).toBeNull();
    expect(moveInventoryStackInList(inventory, 0.5, 1)).toBeNull();
    expect(moveInventoryStackInList([], 0, 0)).toBeNull();
  });

  it('does not mutate the inventory it was given', () => {
    const inventory = [item('wheat', 2), item('wheat', 3)];
    const before = JSON.stringify(inventory);

    expect(moveInventoryStackInList(inventory, 1, 0)).toEqual([
      expect.objectContaining({ id: 'wheat', quantity: 5 }),
    ]);
    expect(JSON.stringify(inventory)).toBe(before);
  });
});
