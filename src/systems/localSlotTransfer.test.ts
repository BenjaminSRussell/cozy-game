import { beforeEach, describe, expect, it, vi } from 'vitest';

// Node's experimental localStorage has no methods unless --localstorage-file is set.
// Install an in-memory shim before the persistence code reads it.
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

import type { GameWorld } from '../types/game';
import {
  formatPlayTime,
  localSlotCardContent,
  PersistenceManager,
  SAVE_FILE_FORMAT,
  SAVE_FILE_VERSION,
} from './PersistenceManager';

function makeWorld(id: string): GameWorld {
  return {
    id,
    createdAt: 1,
    lastPlayedAt: 2,
    season: 'summer',
    dayTime: 360,
    totalDaysPlayed: 30,
    farmName: 'River Bend',
    player: {
      id: 'player_1',
      name: 'Ren',
      level: 2,
      coins: 80,
      playTime: 180,
      stamina: 100,
      stats: { farmingLevel: 1, buildingLevel: 1, diggingLevel: 1, total_play_time: 0 },
      inventory: [],
      tools: {},
      unlocks: {},
    },
    farmPlots: [{ id: 'plot_1' }],
    buildings: [],
  } as unknown as GameWorld;
}

beforeEach(() => {
  localStorage.clear();
});

describe('formatPlayTime', () => {
  it('shows minutes under an hour and hours from an hour on', () => {
    expect(formatPlayTime(3)).toBe('3 min');
    expect(formatPlayTime(59)).toBe('59 min');
    expect(formatPlayTime(60)).toBe('1.0 hr');
    expect(formatPlayTime(90)).toBe('1.5 hr');
    expect(formatPlayTime(119)).toBe('1.9 hr');
  });

  it('is the play time text on a slot card', () => {
    const card = localSlotCardContent({ slotId: 1, worldId: 'world_a', playTimeMinutes: 90 });
    expect(card.playTimeLabel).toBe('Play time: 1.5 hr');
  });
});

describe('save slot timestamps and thumbnails', () => {
  it('stamps savedAt and keeps the thumbnail passed to saveLocalSlot', async () => {
    const manager = new PersistenceManager();
    const before = Date.now();
    await manager.saveLocalSlot(1, makeWorld('world_a'), { thumbnailDataUrl: 'data:image/png;base64,AAAA' });
    const [card] = manager.listLocalSlots();
    expect(card?.savedAt).toBeGreaterThanOrEqual(before);
    expect(card?.thumbnailDataUrl).toBe('data:image/png;base64,AAAA');
  });
});

describe('exporting and importing a slot file', () => {
  async function seededManager(): Promise<PersistenceManager> {
    const manager = new PersistenceManager();
    await manager.saveLocalSlot(1, makeWorld('world_a'), { thumbnailDataUrl: 'data:image/png;base64,AAAA' });
    return manager;
  }

  it('writes a tagged JSON file that holds the world and the thumbnail', async () => {
    const manager = await seededManager();
    const text = await manager.exportLocalSlot(1);
    expect(text).not.toBeNull();
    const parsed = JSON.parse(text ?? '{}') as Record<string, unknown>;
    expect(parsed.format).toBe(SAVE_FILE_FORMAT);
    expect(parsed.version).toBe(SAVE_FILE_VERSION);
    expect((parsed.world as { player: { name: string } }).player.name).toBe('Ren');
    expect(parsed.thumbnailDataUrl).toBe('data:image/png;base64,AAAA');
  });

  it('returns null when the slot is empty', async () => {
    expect(await new PersistenceManager().exportLocalSlot(2)).toBeNull();
  });

  it('restores the file into an empty slot under a new world id', async () => {
    const manager = await seededManager();
    const text = (await manager.exportLocalSlot(1)) ?? '';
    const restored = await manager.importLocalSlot(2, text);
    expect(restored?.slotId).toBe(2);
    expect(restored?.worldId).toBeDefined();
    expect(restored?.worldId).not.toBe('world_a');
    expect(restored?.farmName).toBe('River Bend');
    expect(restored?.playerName).toBe('Ren');
    expect(restored?.thumbnailDataUrl).toBe('data:image/png;base64,AAAA');

    const world = await manager.loadLocalSlot(2);
    expect(world?.player.name).toBe('Ren');
    expect(world?.id).toBe(restored?.worldId);
    expect(manager.listLocalSlots()[0]?.worldId).toBe('world_a');
  });

  it('refuses to overwrite an occupied slot', async () => {
    const manager = await seededManager();
    const text = (await manager.exportLocalSlot(1)) ?? '';
    expect(await manager.importLocalSlot(1, text)).toBeNull();
    expect(manager.listLocalSlots()[0]?.worldId).toBe('world_a');
  });

  it('accepts a bare world JSON such as exportSave writes', async () => {
    const manager = new PersistenceManager();
    const restored = await manager.importLocalSlot(3, JSON.stringify(makeWorld('world_bare')));
    expect(restored?.slotId).toBe(3);
    expect(restored?.playerName).toBe('Ren');
    expect(restored?.worldId).not.toBe('world_bare');
  });

  it('rejects anything that is not a Cozy Haven save', async () => {
    const manager = new PersistenceManager();
    const wrongVersion = JSON.stringify({ format: SAVE_FILE_FORMAT, version: 99, world: makeWorld('w') });
    const noPlayer = JSON.stringify({ id: 'w', season: 'spring' });
    for (const text of ['not json', '[]', '{"format":"other"}', wrongVersion, noPlayer, '']) {
      expect(await manager.importLocalSlot(1, text)).toBeNull();
    }
    expect(manager.listLocalSlots()[0]).toBeNull();
  });
});
