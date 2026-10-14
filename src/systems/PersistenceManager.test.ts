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
    await expect(manager.loadWorld('slot1')).resolves.toEqual({
      ...world,
      player: { name: 'Ben', level: 5, stamina: 100 },
      farmPlots: [],
      buildings: [],
    });

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

describe('PersistenceManager.loadWorld', () => {
  it('loads a save that omits stamina with stamina 100', async () => {
    const saved = {
      id: 'old-stamina',
      player: { name: 'Ben', level: 2 },
      farmPlots: [{ id: 'plot-1' }],
      buildings: [{ id: 'barn-1', type: 'barn' }],
    };
    localStorage.setItem('cozy_save_old-stamina', JSON.stringify(saved));

    const manager = new PersistenceManager();
    const loaded = await manager.loadWorld('old-stamina');

    expect(loaded).not.toBeNull();
    expect((loaded?.player as { stamina?: number }).stamina).toBe(100);
    expect(loaded?.buildings).toEqual([{ id: 'barn-1', type: 'barn' }]);
    expect(loaded?.farmPlots).toEqual([{ id: 'plot-1' }]);
  });

  it('loads a save that omits buildings with buildings []', async () => {
    const saved = {
      id: 'old-buildings',
      player: { name: 'Ada', level: 3, stamina: 40 },
      farmPlots: [{ id: 'plot-2' }],
    };
    localStorage.setItem('cozy_save_old-buildings', JSON.stringify(saved));

    const manager = new PersistenceManager();
    const loaded = await manager.loadWorld('old-buildings');

    expect(loaded?.buildings).toEqual([]);
    expect((loaded?.player as { stamina?: number }).stamina).toBe(40);
    expect(loaded?.farmPlots).toEqual([{ id: 'plot-2' }]);
  });

  it('returns null when the saved JSON is corrupted', async () => {
    localStorage.setItem('cozy_save_corrupt', '{not json');
    const manager = new PersistenceManager();
    const errorLog = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      await expect(manager.loadWorld('corrupt')).resolves.toBeNull();
    } finally {
      errorLog.mockRestore();
    }
  });
});

describe('PersistenceManager.listSlots', () => {
  it('returns player name and level from slot metadata without parsing the world blob', async () => {
    const world = {
      id: 's1',
      createdAt: 5,
      player: { name: 'Ben', level: 5 },
    } as unknown as GameWorld;

    const writer = new PersistenceManager();
    await writer.saveWorld(world);

    const metaRaw = localStorage.getItem('cozy_meta_s1');
    expect(metaRaw).toEqual(expect.any(String));
    expect(localStorage.getItem('cozy_save_s1')).toBe(JSON.stringify(world));
    localStorage.setItem('cozy_save_s1', '{not a world');

    const reader = new PersistenceManager();
    const parse = vi.spyOn(JSON, 'parse');
    try {
      const slots = reader.listSlots();
      expect(parse).toHaveBeenCalledTimes(1);
      expect(parse).toHaveBeenCalledWith(metaRaw);
      expect(slots).toEqual([
        expect.objectContaining({
          id: 's1',
          worldId: 's1',
          playerName: 'Ben',
          level: 5,
          playTime: 0,
        }),
      ]);
    } finally {
      parse.mockRestore();
    }

    expect(localStorage.getItem('cozy_save_s1')).toBe('{not a world');
  });

  it('keeps createdAt from an existing meta record', async () => {
    const world = {
      id: 's1',
      player: { name: 'Ben', level: 5 },
    } as unknown as GameWorld;

    const manager = new PersistenceManager();
    await manager.saveWorld(world);
    const createdAt = manager.listSlots()[0]?.createdAt;
    expect(createdAt).toEqual(expect.any(Number));

    await manager.saveWorld({
      ...world,
      player: { name: 'Ben', level: 8 },
    } as unknown as GameWorld);

    const slot = manager.listSlots()[0];
    expect(slot?.createdAt).toBe(createdAt);
    expect(slot).toMatchObject({
      id: 's1',
      worldId: 's1',
      playerName: 'Ben',
      level: 8,
      playTime: 0,
    });
    expect(slot?.lastPlayedAt).toBeGreaterThanOrEqual(createdAt as number);
  });
});
