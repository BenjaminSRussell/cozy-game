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

import type { Vector3D, Vehicle } from '../types/game';
import { useGameStore } from './gameStore';

const tractorAt: Vector3D = { x: 1, y: 2, z: 0 };
const truckAt: Vector3D = { x: 3, y: 4, z: 0 };

function vehicleById(id: string): Vehicle & { isMounted?: boolean } {
  const vehicle = useGameStore.getState().world?.vehicles.find((entry) => entry.id === id);
  if (!vehicle) throw new Error(`missing ${id}`);
  return vehicle;
}

describe('mountVehicle', () => {
  it('dismounts vehicle_truck_1 before mounting vehicle_tractor_0', () => {
    useGameStore.getState().createNewGame('Farmer');
    useGameStore.getState().spawnVehicle('tractor', tractorAt);
    useGameStore.getState().spawnVehicle('truck', truckAt);

    useGameStore.getState().mountVehicle('vehicle_truck_1');
    expect(useGameStore.getState().world?.player.mountedVehicleId).toBe('vehicle_truck_1');
    expect(vehicleById('vehicle_truck_1').isMounted).toBe(true);

    useGameStore.getState().mountVehicle('vehicle_tractor_0');

    expect(vehicleById('vehicle_truck_1').isMounted).toBe(false);
    expect(vehicleById('vehicle_tractor_0').isMounted).toBe(true);
    expect(useGameStore.getState().world?.player.mountedVehicleId).toBe('vehicle_tractor_0');
    expect(vehicleById('vehicle_truck_1').mountedBy).toBeUndefined();
    expect(vehicleById('vehicle_tractor_0').mountedBy).toBe(useGameStore.getState().world?.player.id);
  });
});
