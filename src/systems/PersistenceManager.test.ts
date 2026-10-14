import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const nativeModules = vi.hoisted(() => ({ sqlite: 0, fileSystem: 0 }));

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

vi.mock('expo-sqlite', () => {
  nativeModules.sqlite += 1;
  return { openDatabaseAsync: async () => null };
});

vi.mock('expo-file-system', () => {
  nativeModules.fileSystem += 1;
  return { readAsStringAsync: async () => '' };
});

import type { GameWorld } from '../types/game';
import { PersistenceManager } from './PersistenceManager';

const sourcePath = resolve(dirname(fileURLToPath(import.meta.url)), 'PersistenceManager.ts');

beforeEach(() => {
  localStorage.clear();
});

describe('PersistenceManager web import', () => {
  it('does not require expo-sqlite at import time on the web path', () => {
    const source = readFileSync(sourcePath, 'utf8');
    expect(source).not.toContain('expo-sqlite');
    expect(source).not.toContain('expo-file-system');
    expect(source).not.toMatch(/from\s+['"]expo-sqlite['"]/);
    expect(source).not.toMatch(/import\s*\(\s*['"]expo-sqlite['"]/);
    expect(source).not.toMatch(/require\s*\(\s*['"]expo-sqlite['"]/);
    expect(nativeModules.sqlite).toBe(0);
    expect(nativeModules.fileSystem).toBe(0);
    expect(PersistenceManager).toBeTypeOf('function');
  });
});

describe('PersistenceManager localStorage', () => {
  it('saves and loads a world and lists its slot', async () => {
    const world = {
      id: 'slot1',
      createdAt: 5,
      lastPlayedAt: 6,
      player: { name: 'Ben', level: 5 },
    } as unknown as GameWorld;

    const manager = new PersistenceManager();
    await manager.initialize();
    await manager.saveWorld(world);

    expect(localStorage.getItem('cozy_save_slot1')).toBe(JSON.stringify(world));
    await expect(manager.loadWorld('slot1')).resolves.toEqual(world);

    await manager.createSaveSlot(world);
    const slots = await manager.getSaveSlots();
    expect(slots.map((slot) => slot.worldId)).toEqual(['slot1']);
    expect(slots[0]).toMatchObject({ playerName: 'Ben', level: 5 });
    expect(nativeModules.sqlite).toBe(0);
    expect(nativeModules.fileSystem).toBe(0);
  });
});

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

    const manager = new PersistenceManager();
    const errorLog = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      await expect(manager.saveWorld(world)).resolves.toBeUndefined();
      expect(errorLog).not.toHaveBeenCalled();
    } finally {
      errorLog.mockRestore();
    }
    expect(building.world).toBe(world);
    const stored = localStorage.getItem('cozy_save_world-1');
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

    const manager = new PersistenceManager();
    await expect(manager.saveWorld(world)).resolves.toBeUndefined();
    expect(localStorage.getItem('cozy_save_world-2')).toBe(JSON.stringify(world));
  });
});
