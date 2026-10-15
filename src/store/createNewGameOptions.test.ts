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

import { DEFAULT_APPEARANCE, DEFAULT_FARM_NAME } from '../systems/characterAppearance';
import { useGameStore } from './gameStore';

describe('createNewGame with customizer options', () => {
  it('keeps the farm name, favorite animal and look the customizer chose', () => {
    const appearance = { ...DEFAULT_APPEARANCE, hairStyle: 'braid', shirtColor: '#4A90C2' };
    useGameStore.getState().createNewGame('Ren', { farmName: 'River Bend', favoriteAnimal: 'Goat', appearance });
    const world = useGameStore.getState().world;
    expect(world?.player.name).toBe('Ren');
    expect(world?.farmName).toBe('River Bend');
    expect(world?.favoriteAnimal).toBe('Goat');
    expect(world?.player.appearance).toEqual(appearance);
  });

  it('falls back to the default farm name and look when no options are given', () => {
    useGameStore.getState().createNewGame('Farmer');
    const world = useGameStore.getState().world;
    expect(world?.farmName).toBe(DEFAULT_FARM_NAME);
    expect(world?.favoriteAnimal).toBeUndefined();
    expect(world?.player.appearance).toEqual(DEFAULT_APPEARANCE);
  });
});
