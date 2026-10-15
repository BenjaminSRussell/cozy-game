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

vi.mock('react-native', () => ({
  View: () => null,
  Text: () => null,
  StyleSheet: { create: (styles: Record<string, unknown>) => styles },
  TouchableOpacity: () => null,
  ScrollView: () => null,
  Modal: () => null,
  Alert: { alert: () => undefined },
}));

import type { GameWorld } from '../types/game';
import { PersistenceManager } from '../systems/PersistenceManager';
import { useGameStore } from './gameStore';

describe('unlockFeature', () => {
  it('unlocks a feature on a new game and still does after a save and load', async () => {
    useGameStore.getState().createNewGame('Ben');
    useGameStore.getState().unlockFeature('tractor');
    const world = useGameStore.getState().world as GameWorld;

    const manager = new PersistenceManager();
    await manager.saveWorld(world);
    const loaded = await manager.loadWorld(world.id);

    expect(loaded?.player.unlocks).toEqual(new Set(['tractor']));
    expect(() => loaded?.player.unlocks.add('greenhouse')).not.toThrow();
  });

  it('does not throw on a world restored from zustand persist, which stores unlocks as {}', () => {
    useGameStore.setState({
      world: { id: 'restored', player: { name: 'Farmer', unlocks: {} } } as unknown as GameWorld,
    });

    expect(() => useGameStore.getState().unlockFeature('tractor')).not.toThrow();
    expect(useGameStore.getState().world?.player.unlocks).toEqual(new Set(['tractor']));
  });
});
