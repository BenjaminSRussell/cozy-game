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
import { localSlotCardContent, PersistenceManager } from './PersistenceManager';

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

function slotWorld(fields: Record<string, unknown>): GameWorld {
  return fields as unknown as GameWorld;
}

describe('PersistenceManager local save slots', () => {
  it('keeps three independent slots and still loads cozy_save_ and cozy_meta_', async () => {
    const legacySave = JSON.stringify({
      id: 'legacy',
      player: { name: 'Ren', coins: 80 },
      season: 'winter',
      totalDaysPlayed: 112,
    });
    const legacyMeta = JSON.stringify({
      id: 'legacy',
      worldId: 'legacy',
      playerName: 'Ren',
      createdAt: 1,
      lastPlayedAt: 9,
      playTime: 0,
      level: 2,
    });
    localStorage.setItem('cozy_save_legacy', legacySave);
    localStorage.setItem('cozy_meta_legacy', legacyMeta);
    localStorage.setItem('cozy_save_keep', JSON.stringify({ id: 'keep' }));

    const summer = slotWorld({
      id: 'world-summer',
      player: { name: 'Ren', level: 2, coins: 80, playTime: 180 },
      season: 'summer',
      totalDaysPlayed: 30,
      farmName: 'River Bend',
    });
    const autumn = slotWorld({
      id: 'world-autumn',
      player: { name: 'Quinn', level: 1, coins: 12, playTime: 60 },
      season: 'autumn',
      totalDaysPlayed: 0,
    });

    const manager = new PersistenceManager();
    const savedSummer = await manager.saveLocalSlot(1, summer, {
      thumbnailDataUrl: 'memory://slot-thumb',
    });
    const savedAutumn = await manager.saveLocalSlot(2, autumn);

    expect(savedSummer).toMatchObject({
      slotId: 1,
      worldId: 'world-summer',
      farmName: 'River Bend',
      playerName: 'Ren',
      date: 'Year 1, Summer 3',
      gold: 80,
      playTimeMinutes: 3,
      thumbnailDataUrl: 'memory://slot-thumb',
    });
    expect(savedAutumn).toMatchObject({
      slotId: 2,
      worldId: 'world-autumn',
      playerName: 'Quinn',
      date: 'Year 1, Autumn 1',
      gold: 12,
      playTimeMinutes: 1,
    });
    expect(savedAutumn && 'thumbnailDataUrl' in savedAutumn).toBe(false);
    expect(localStorage.getItem('cozy_save_world-summer')).not.toContain('memory://slot-thumb');
    expect(JSON.parse(localStorage.getItem('cozy_meta_world-summer') as string)).toMatchObject({
      worldId: 'world-summer',
      playerName: 'Ren',
      playTime: 0,
    });

    const cards = manager.listLocalSlots();
    expect(cards).toHaveLength(3);
    expect(cards[2]).toBeNull();
    expect(cards[0]).toMatchObject({ gold: 80, playTimeMinutes: 3, farmName: 'River Bend' });
    expect(localSlotCardContent(cards[0])).toMatchObject({
      occupied: true,
      title: 'River Bend',
      playerName: 'Ren',
      dateLabel: 'Date: Year 1, Summer 3',
      goldLabel: 'Gold: 80',
      playTimeLabel: 'Play time: 3 min',
      thumbnailDataUrl: 'memory://slot-thumb',
    });
    expect(localSlotCardContent(null)).toEqual({ occupied: false, title: 'Empty Slot' });

    const reloaded = new PersistenceManager();
    await expect(reloaded.loadLocalSlot(1)).resolves.toMatchObject({
      id: 'world-summer',
      player: { name: 'Ren', coins: 80 },
    });
    await expect(reloaded.loadLocalSlot(2)).resolves.toMatchObject({ id: 'world-autumn' });
    await expect(reloaded.loadLocalSlot(3)).resolves.toBeNull();
    await expect(reloaded.loadWorld('legacy')).resolves.toMatchObject({ id: 'legacy' });
    expect(localStorage.getItem('cozy_save_legacy')).toBe(legacySave);
    expect(localStorage.getItem('cozy_meta_legacy')).toBe(legacyMeta);

    await reloaded.deleteLocalSlot(1);
    expect(localStorage.getItem('cozy_slot_1')).toBeNull();
    expect(localStorage.getItem('cozy_save_world-summer')).toBeNull();
    expect(localStorage.getItem('cozy_meta_world-summer')).toBeNull();
    expect(localStorage.getItem('cozy_save_world-autumn')).toBeTruthy();
    expect(localStorage.getItem('cozy_meta_world-autumn')).toBeTruthy();
    expect(localStorage.getItem('cozy_slot_2')).toBeTruthy();
    expect(localStorage.getItem('cozy_save_legacy')).toBe(legacySave);
    expect(localStorage.getItem('cozy_save_keep')).toBeTruthy();
    await expect(reloaded.loadLocalSlot(2)).resolves.toMatchObject({ id: 'world-autumn' });
  });

  it('copies legacy meta into an empty slot without wiping the original keys', async () => {
    const saveRaw = JSON.stringify({
      id: 'legacy',
      farmName: 'River Bend',
      player: { name: 'Ren', coins: 80, playTime: 120 },
      season: 'winter',
      totalDaysPlayed: 112,
    });
    const metaRaw = JSON.stringify({
      id: 'legacy',
      worldId: 'legacy',
      playerName: 'Ren',
      createdAt: 1,
      lastPlayedAt: 4,
      playTime: 0,
      level: 2,
    });
    localStorage.setItem('cozy_save_legacy', saveRaw);
    localStorage.setItem('cozy_meta_legacy', metaRaw);
    localStorage.setItem(
      'cozy_meta_older',
      JSON.stringify({
        id: 'older',
        worldId: 'older',
        playerName: 'Quinn',
        createdAt: 1,
        lastPlayedAt: 1,
        playTime: 0,
        level: 1,
      }),
    );
    localStorage.setItem('cozy_save_older', JSON.stringify({ id: 'older', player: { name: 'Quinn', coins: 12 } }));

    const manager = new PersistenceManager();
    const cards = await manager.materializeSlotCards();
    expect(localStorage.getItem('cozy_save_legacy')).toBe(saveRaw);
    expect(localStorage.getItem('cozy_meta_legacy')).toBe(metaRaw);
    expect(cards[0]).toMatchObject({
      slotId: 1,
      worldId: 'legacy',
      farmName: 'River Bend',
      playerName: 'Ren',
      gold: 80,
      date: 'Year 2, Winter 1',
      playTimeMinutes: 2,
    });
    expect(cards[1]).toMatchObject({ slotId: 2, worldId: 'older', playerName: 'Quinn', gold: 12 });
    expect(cards[2]).toBeNull();
    expect(cards[0]?.thumbnailDataUrl).toBeUndefined();

    const slotRaw = localStorage.getItem('cozy_slot_1');
    await manager.materializeSlotCards();
    expect(localStorage.getItem('cozy_slot_1')).toBe(slotRaw);
    expect(localStorage.getItem('cozy_save_legacy')).toBe(saveRaw);
    expect(localStorage.getItem('cozy_meta_legacy')).toBe(metaRaw);

    await manager.deleteLocalSlot(1);
    expect(localStorage.getItem('cozy_save_legacy')).toBeNull();
    expect(localStorage.getItem('cozy_meta_legacy')).toBeNull();
    expect(localStorage.getItem('cozy_save_older')).toBeTruthy();
    expect(localStorage.getItem('cozy_meta_older')).toBeTruthy();
  });

  it('shows only metadata that is actually stored', async () => {
    localStorage.setItem('cozy_slot_2', JSON.stringify({ slotId: 2, playerName: 'Ren' }));
    localStorage.setItem('cozy_slot_1', '{not json');
    localStorage.setItem(
      'cozy_slot_3',
      JSON.stringify({
        slotId: 3,
        worldId: 'partial',
        playerName: 'Quinn',
        gold: 0,
        playTimeMinutes: 0,
        date: 'Market Day',
      }),
    );
    localStorage.setItem('cozy_save_partial', '{not json');
    localStorage.setItem('cozy_slot_4', JSON.stringify({ slotId: 4, playerName: 'Ren', gold: 80 }));

    const manager = new PersistenceManager();
    const cards = manager.listLocalSlots();
    expect(cards[0]).toBeNull();
    expect(cards[1]).toEqual({ slotId: 2, playerName: 'Ren' });
    expect(localSlotCardContent(cards[1])).toEqual({ occupied: true, title: 'Ren' });
    expect(cards[2]).toMatchObject({
      playerName: 'Quinn',
      gold: 0,
      playTimeMinutes: 0,
      date: 'Market Day',
    });
    expect(localSlotCardContent(cards[2]).goldLabel).toBe('Gold: 0');
    expect(localSlotCardContent(cards[2]).thumbnailDataUrl).toBeUndefined();
    expect(cards).toHaveLength(3);
    expect(localStorage.getItem('cozy_slot_4')).toContain('Ren');

    const minutesOnly = slotWorld({
      id: 'minutes',
      player: { name: 'Ren', stats: { total_play_time: 120000 } },
    });
    await manager.saveLocalSlot(1, minutesOnly);
    expect(manager.listLocalSlots()[0]?.playTimeMinutes).toBe(2);
    expect(manager.listLocalSlots()[0]?.gold).toBeUndefined();

    const explicit = slotWorld({
      id: 'dated',
      date: 'Harvest Eve',
      player: { name: 'Quinn', coins: 4, playTime: 0, stats: { total_play_time: 120000 } },
    });
    await manager.saveLocalSlot(1, explicit);
    expect(manager.listLocalSlots()[0]).toMatchObject({
      date: 'Harvest Eve',
      gold: 4,
      playTimeMinutes: 0,
    });
    await expect(manager.saveLocalSlot(4, explicit)).resolves.toBeNull();
    await expect(manager.loadLocalSlot(0)).resolves.toBeNull();
  });

  it('does not drop a shared world when another slot still points at it', async () => {
    const world = slotWorld({
      id: 'shared',
      player: { name: 'Ren', coins: 8, playTime: 60 },
      season: 'spring',
      totalDaysPlayed: 0,
    });
    const manager = new PersistenceManager();
    await manager.saveLocalSlot(1, world);
    localStorage.setItem(
      'cozy_slot_2',
      JSON.stringify({ slotId: 2, worldId: 'shared', playerName: 'Ren' }),
    );

    await manager.deleteLocalSlot(2);
    expect(localStorage.getItem('cozy_slot_2')).toBeNull();
    expect(localStorage.getItem('cozy_save_shared')).toBeTruthy();
    expect(localStorage.getItem('cozy_meta_shared')).toBeTruthy();
    await expect(manager.loadLocalSlot(1)).resolves.toMatchObject({ id: 'shared' });

    await manager.deleteLocalSlot(1);
    expect(localStorage.getItem('cozy_save_shared')).toBeNull();
    expect(localStorage.getItem('cozy_meta_shared')).toBeNull();
  });

  it('does not hardcode a sample farm, player, or gold amount', () => {
    const appPath = resolve(dirname(sourcePath), '../../App.tsx');
    const combined = `${readFileSync(sourcePath, 'utf8')}\n${readFileSync(appPath, 'utf8')}`;
    expect(combined).not.toContain('Sunny Farm');
    expect(combined).not.toContain('Alex');
    expect(combined).not.toContain('3450');
    expect(combined).not.toContain('expo-sqlite');
    expect(combined).not.toContain('expo-file-system');
  });
});

describe('PersistenceManager player.unlocks', () => {
  it('keeps unlocks as a Set through a save and load', async () => {
    const world = {
      id: 'unlocks-1',
      createdAt: 1,
      lastPlayedAt: 2,
      player: { name: 'Ben', level: 2, unlocks: new Set(['tractor']) },
    } as unknown as GameWorld;

    const manager = new PersistenceManager();
    await manager.saveWorld(world);
    const unlocks = (await manager.loadWorld('unlocks-1'))?.player.unlocks;

    expect(unlocks).toBeInstanceOf(Set);
    expect([...(unlocks ?? [])]).toEqual(['tractor']);
    unlocks?.add('greenhouse');
    expect(unlocks?.has('greenhouse')).toBe(true);
  });

  it('loads a save written before unlocks was a Set, with unlocks as an empty Set', async () => {
    localStorage.setItem(
      'cozy_save_legacy-unlocks',
      JSON.stringify({ id: 'legacy-unlocks', player: { name: 'Ada', level: 3, unlocks: {} } }),
    );

    const unlocks = (await new PersistenceManager().loadWorld('legacy-unlocks'))?.player.unlocks;

    expect(unlocks).toBeInstanceOf(Set);
    expect(unlocks?.size).toBe(0);
  });
});
