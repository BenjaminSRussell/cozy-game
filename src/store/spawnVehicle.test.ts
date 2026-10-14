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

import type { Vector3D } from '../types/game';
import { PersistenceManager } from '../systems/PersistenceManager';
import { useGameStore } from './gameStore';

const tractorAt: Vector3D = { x: 1, y: 2, z: 0 };
const truckAt: Vector3D = { x: 3, y: 4, z: 0 };

function vehicleIds(): string[] {
  return useGameStore.getState().world?.vehicles.map((vehicle) => vehicle.id) ?? [];
}

describe('spawnVehicle', () => {
  it('assigns vehicle_tractor_0 then vehicle_truck_1', () => {
    useGameStore.getState().createNewGame('Farmer');

    useGameStore.getState().spawnVehicle('tractor', tractorAt);
    useGameStore.getState().spawnVehicle('truck', truckAt);

    expect(vehicleIds()).toContain('vehicle_tractor_0');
    expect(vehicleIds()).toContain('vehicle_truck_1');
    expect(vehicleIds().filter((id) => id.startsWith('vehicle_'))).toEqual([
      'vehicle_tractor_0',
      'vehicle_truck_1',
    ]);
    expect(useGameStore.getState().nextVehicleId).toBe(2);
  });

  it('does not increment nextVehicleId when there is no world', () => {
    useGameStore.setState({ world: null, nextVehicleId: 4 });

    useGameStore.getState().spawnVehicle('tractor', tractorAt);

    expect(useGameStore.getState().world).toBeNull();
    expect(useGameStore.getState().nextVehicleId).toBe(4);
  });

  it('starts the sequence over for a new game', () => {
    useGameStore.getState().createNewGame('Farmer');
    useGameStore.getState().spawnVehicle('truck', truckAt);
    expect(useGameStore.getState().nextVehicleId).toBe(1);

    useGameStore.getState().createNewGame('Farmer');
    useGameStore.getState().spawnVehicle('tractor', tractorAt);

    expect(vehicleIds()).toContain('vehicle_tractor_0');
    expect(vehicleIds()).not.toContain('vehicle_truck_1');
    expect(useGameStore.getState().nextVehicleId).toBe(1);
  });

  it('keeps mountedVehicleId after save and load and does not reuse vehicle_tractor_0', async () => {
    useGameStore.getState().createNewGame('Farmer');
    useGameStore.getState().spawnVehicle('tractor', tractorAt);
    useGameStore.getState().spawnVehicle('truck', truckAt);
    useGameStore.getState().mountVehicle('vehicle_tractor_0');

    await useGameStore.getState().saveGame();
    const world = useGameStore.getState().world;
    expect(world?.player.mountedVehicleId).toBe('vehicle_tractor_0');
    expect((world as { nextVehicleId?: number } | null)?.nextVehicleId).toBe(2);

    const manager = new PersistenceManager();
    await manager.saveWorld(world!);
    const loaded = await manager.loadWorld(world!.id);

    expect(loaded?.player.mountedVehicleId).toBe('vehicle_tractor_0');
    expect(loaded?.vehicles.some((vehicle) => vehicle.id === loaded.player.mountedVehicleId)).toBe(true);
    expect(localStorage.getItem(`cozy_save_${world!.id}`)).toContain('"nextVehicleId":2');
    expect(localStorage.getItem(`cozy_meta_${world!.id}`)).toBeTruthy();

    useGameStore.setState({ world: loaded, nextVehicleId: 0 });
    useGameStore.getState().spawnVehicle('tractor', { x: 8, y: 8, z: 0 });

    const after = vehicleIds();
    expect(after.filter((id) => id === 'vehicle_tractor_0')).toHaveLength(1);
    expect(after.at(-1)).toBe('vehicle_tractor_2');
    expect(useGameStore.getState().nextVehicleId).toBe(3);
  });
});
