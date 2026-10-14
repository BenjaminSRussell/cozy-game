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

import type { Building, GameWorld, Vector3D } from '../types/game';
import { useGameStore } from './gameStore';

type TestTile = {
  position: { x: number; y: number };
  type?: string;
  walkable?: boolean;
};

const waterTile = { position: { x: 3, y: 4 }, type: 'water', walkable: false };
const grassTile = { position: { x: 6, y: 7 }, type: 'grass', walkable: true };

function playerPosition(): Vector3D {
  const position = useGameStore.getState().world?.player.position;
  if (!position) throw new Error('expected a player position');
  return position;
}

function setMovementWorld(patch: { tiles?: TestTile[] | null; buildings?: Building[] }) {
  useGameStore.setState((state) => {
    if (!state.world) return state;
    const world: GameWorld & { tiles?: TestTile[] | null } = { ...state.world };
    if (patch.buildings) world.buildings = patch.buildings;
    if ('tiles' in patch) world.tiles = patch.tiles;
    return { world };
  });
}

describe('movePlayer', () => {
  it('does not change position on an unwalkable water tile', () => {
    useGameStore.getState().createNewGame('Walker');
    const start = { ...playerPosition() };
    setMovementWorld({ tiles: [waterTile, grassTile] });

    useGameStore.getState().movePlayer({ x: waterTile.position.x, y: waterTile.position.y, z: 9 });

    expect(playerPosition()).toEqual(start);
  });

  it('does not change position when a building occupies the tile', () => {
    useGameStore.getState().createNewGame('Walker');
    const start = { ...playerPosition() };
    const building: Building = {
      id: 'barn_block',
      type: 'barn',
      position: { x: 12.8, y: 4.1, z: 0 },
      rotation: 0,
      unlocked: true,
      level: 1,
      spriteId: 'building_barn',
    };
    setMovementWorld({
      tiles: [{ position: { x: 12, y: 4 }, type: 'grass', walkable: true }],
      buildings: [building],
    });

    useGameStore.getState().movePlayer({ x: 12, y: 4, z: 3 });

    expect(playerPosition()).toEqual(start);
    expect(Math.floor(building.position.x)).toBe(12);
    expect(Math.floor(building.position.y)).toBe(4);

    useGameStore.getState().movePlayer({ x: building.position.x, y: building.position.y, z: 3 });

    expect(playerPosition()).toEqual({ x: 12.8, y: 4.1, z: 3 });
  });

  it('updates position on walkable grass with no building', () => {
    useGameStore.getState().createNewGame('Walker');
    setMovementWorld({ tiles: [waterTile, grassTile] });

    useGameStore.getState().movePlayer({ x: grassTile.position.x, y: grassTile.position.y, z: 1 });

    expect(playerPosition()).toEqual({ x: 6, y: 7, z: 1 });
  });

  it('does not crash when tiles are missing and still blocks buildings', () => {
    useGameStore.getState().createNewGame('Walker');
    const start = { ...playerPosition() };
    expect(useGameStore.getState().world).not.toHaveProperty('tiles');

    expect(() => {
      useGameStore.getState().movePlayer({ x: 55, y: 45, z: 2 });
    }).not.toThrow();
    expect(playerPosition()).toEqual(start);

    useGameStore.getState().movePlayer({ x: 8, y: 9, z: 2 });

    expect(playerPosition()).toEqual({ x: 8, y: 9, z: 2 });
  });
});
