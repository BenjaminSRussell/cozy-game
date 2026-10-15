import { describe, expect, it } from 'vitest';
import type { LocalSaveSlot } from '../systems/PersistenceManager';
import { pickContinueSlot } from './titleMenu';

const save = (slotId: 1 | 2 | 3, savedAt?: number): LocalSaveSlot => ({
  slotId,
  worldId: `world_${slotId}`,
  ...(savedAt !== undefined ? { savedAt } : {}),
});

describe('pickContinueSlot', () => {
  it('returns null when no slot holds a save, which disables Continue', () => {
    expect(pickContinueSlot([null, null, null])).toBeNull();
  });

  it('picks the occupied slot saved most recently', () => {
    expect(pickContinueSlot([save(1, 100), null, save(3, 300)])?.slotId).toBe(3);
    expect(pickContinueSlot([save(1, 500), save(2, 200), save(3, 300)])?.slotId).toBe(1);
  });

  it('falls back to the first occupied slot when saves carry no timestamp', () => {
    expect(pickContinueSlot([null, save(2), save(3)])?.slotId).toBe(2);
  });

  it('ignores a card that has no world', () => {
    expect(pickContinueSlot([{ slotId: 1, playerName: 'Ren' }, null, null])).toBeNull();
  });
});
