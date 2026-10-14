import { describe, expect, it, vi } from 'vitest';
import type { GameWorld } from '../types/game';
import { PersistenceManager } from './PersistenceManager';

vi.mock('expo-sqlite', () => ({
  openDatabaseAsync: async () => null,
}));

vi.mock('expo-file-system', () => ({
  readAsStringAsync: async () => '',
}));

function managerWithDb(): { manager: PersistenceManager; savedJson: () => string | undefined } {
  const writes: unknown[][] = [];
  const manager = new PersistenceManager();
  (manager as unknown as { db: { runAsync: (sql: string, params?: unknown[]) => Promise<void> } }).db = {
    runAsync: async (_sql: string, params?: unknown[]) => {
      writes.push(params ?? []);
    },
  };
  return {
    manager,
    savedJson: () => (typeof writes[0]?.[1] === 'string' ? writes[0][1] : undefined),
  };
}

describe('PersistenceManager.saveWorld', () => {
  it('does not throw when a building points back at the world', async () => {
    const building: { id: string; type: string; world?: GameWorld } = {
      id: 'barn-1',
      type: 'barn',
    };
    const world = {
      id: 'world-1',
      createdAt: 10,
      player: { level: 2 },
      buildings: [building],
    } as unknown as GameWorld;
    building.world = world;

    expect(() => JSON.stringify(world)).toThrow(TypeError);

    const { manager, savedJson } = managerWithDb();
    const errorLog = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      await expect(manager.saveWorld(world)).resolves.toBeUndefined();
      expect(errorLog).not.toHaveBeenCalled();
    } finally {
      errorLog.mockRestore();
    }
    expect(building.world).toBe(world);
    const stored = savedJson();
    expect(stored).toBeTypeOf('string');
    const parsed = JSON.parse(stored as string) as {
      id: string;
      buildings: Array<{ id: string; type: string; world?: unknown }>;
    };
    expect(parsed.id).toBe('world-1');
    expect(parsed.buildings[0]).toMatchObject({ id: 'barn-1', type: 'barn' });
    expect(parsed.buildings[0]?.world).toBeUndefined();
  });

  it('stores an acyclic world as ordinary JSON', async () => {
    const world = {
      id: 'world-2',
      createdAt: 11,
      player: { level: 4, name: 'Ada' },
      buildings: [{ id: 'house-1', type: 'house' }],
    } as unknown as GameWorld;

    const { manager, savedJson } = managerWithDb();
    await expect(manager.saveWorld(world)).resolves.toBeUndefined();
    expect(savedJson()).toBe(JSON.stringify(world));
  });
});
