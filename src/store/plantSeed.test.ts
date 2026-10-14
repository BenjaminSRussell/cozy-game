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

import { SEED_PACKETS } from '../components/MarketplaceScreen';
import { CropStage, ItemType, type Crop, type GameWorld, type Item, type Season } from '../types/game';
import { useGameStore } from './gameStore';

type SoilTile = {
  position: { x: number; y: number };
  state?: string;
  type?: string;
  walkable?: boolean;
  fertilizer?: Crop['fertilizer'];
  crop?: Crop | null;
};

function cornPacketFromCatalog() {
  const packet = SEED_PACKETS.find((entry) => entry.id === 'corn_seeds');
  if (!packet) throw new Error('corn_seeds is missing from SEED_PACKETS');
  return packet;
}

const cornPacket = cornPacketFromCatalog();

const blockedSeason = (['spring', 'summer', 'autumn', 'winter'] as const).find(
  (season) => !cornPacket.seasons.includes(season),
);
const allowedSeason = cornPacket.seasons[0];
if (!blockedSeason || !allowedSeason) throw new Error('corn_seeds has no season bounds');

function cornSeeds(quantity: number): Item {
  return {
    id: cornPacket.id,
    name: cornPacket.name,
    type: ItemType.SEED,
    quantity,
    sellValue: cornPacket.sellValue,
    spriteId: cornPacket.icon,
    rarity: cornPacket.rarity,
  };
}

function wheat(quantity: number): Item {
  return {
    id: 'wheat',
    name: 'Wheat',
    type: ItemType.CROP,
    quantity,
    sellValue: 10,
    spriteId: 'wheat',
    rarity: 'common',
  };
}

function livingCrop(): Crop {
  return {
    id: 'crop_already',
    type: 'wheat',
    stage: CropStage.GROWING,
    position: { x: 4, y: 5 },
    plantedTime: 1,
    waterLevel: 80,
    health: 90,
    currentDaysGrown: 2,
  };
}

function setFarm(tiles: SoilTile[], inventory: Item[], season?: Season) {
  useGameStore.setState((state) => {
    if (!state.world) return state;
    const world: GameWorld & { tiles: SoilTile[] } = {
      ...state.world,
      season: season ?? state.world.season,
      player: { ...state.world.player, inventory },
      tiles,
    };
    return { world };
  });
}

function tilesOf(): SoilTile[] {
  const world = useGameStore.getState().world as (GameWorld & { tiles?: SoilTile[] }) | null;
  return world?.tiles ?? [];
}

function seedQuantity(): number | undefined {
  return useGameStore.getState().world?.player.inventory.find((item) => item.id === cornPacket.id)?.quantity;
}

describe('plantSeed', () => {
  it('does not consume a seed on untilled soil', () => {
    useGameStore.getState().createNewGame('Planter');
    const grass: SoilTile = { position: { x: 4, y: 5 }, state: 'grass', walkable: true };
    const seeds = cornSeeds(3);
    setFarm([grass], [seeds, wheat(5)], allowedSeason);
    const worldBefore = useGameStore.getState().world;
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});

    useGameStore.getState().plantSeed(4, 5, cornPacket.id);

    expect(useGameStore.getState().world).toBe(worldBefore);
    expect(seedQuantity()).toBe(3);
    expect(tilesOf()[0]?.crop).toBeUndefined();
    expect(log).not.toHaveBeenCalledWith('Cannot plant in this season!');
    log.mockRestore();
  });

  it('does not consume a seed when the tile already has a crop', () => {
    useGameStore.getState().createNewGame('Planter');
    const crop = livingCrop();
    const occupied: SoilTile = {
      position: { x: 4, y: 5 },
      state: 'tilled_dry',
      walkable: true,
      fertilizer: 'quality',
      crop,
    };
    setFarm([occupied], [cornSeeds(3)], allowedSeason);
    const worldBefore = useGameStore.getState().world;

    useGameStore.getState().plantSeed(4, 5, cornPacket.id);

    expect(useGameStore.getState().world).toBe(worldBefore);
    expect(seedQuantity()).toBe(3);
    expect(tilesOf()[0]?.crop).toBe(crop);
    expect(tilesOf()[0]?.crop?.stage).toBe(CropStage.GROWING);
  });

  it('toasts and does not consume a seed in the wrong season', () => {
    useGameStore.getState().createNewGame('Planter');
    const soil: SoilTile = {
      position: { x: 4, y: 5 },
      state: 'tilled_dry',
      walkable: true,
      fertilizer: 'speed',
    };
    setFarm([soil], [cornSeeds(3), wheat(5)], blockedSeason);
    const worldBefore = useGameStore.getState().world;
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});

    useGameStore.getState().plantSeed(4, 5, cornPacket.id);

    expect(log).toHaveBeenCalledWith('Cannot plant in this season!');
    expect(useGameStore.getState().world).toBe(worldBefore);
    expect(seedQuantity()).toBe(3);
    expect(tilesOf()[0]?.crop).toBeUndefined();
    expect(useGameStore.getState().world?.player.inventory.find((item) => item.id === 'wheat')?.quantity).toBe(5);
    log.mockRestore();
  });

  it.each(['tilled_dry', 'tilled_wet'] as const)(
    'consumes one seed on %s and plants stage 0 with days 0 and the tile fertilizer',
    (soilState) => {
      useGameStore.getState().createNewGame('Planter');
      const neighbor: SoilTile = { position: { x: 1, y: 1 }, state: 'grass', walkable: true };
      const soil: SoilTile = {
        position: { x: 4, y: 5 },
        state: soilState,
        walkable: true,
        fertilizer: 'quality',
      };
      setFarm([neighbor, soil], [cornSeeds(3), wheat(5)], allowedSeason);
      const log = vi.spyOn(console, 'log').mockImplementation(() => {});

      useGameStore.getState().plantSeed(4, 5, cornPacket.id);

      const plantedTile = tilesOf().find((tile) => tile.position.x === 4 && tile.position.y === 5);
      const planted = plantedTile?.crop;
      expect(seedQuantity()).toBe(2);
      expect(useGameStore.getState().world?.player.inventory.find((item) => item.id === 'wheat')?.quantity).toBe(5);
      expect(planted?.type).toBe(cornPacket.cropId);
      expect(planted?.stage).toBe(0);
      expect(planted?.stage).toBe(CropStage.SEED);
      expect(planted?.currentDaysGrown).toBe(0);
      expect(planted?.fertilizer).toBe(soil.fertilizer);
      expect(planted?.fertilizer).toBe('quality');
      expect(tilesOf()[0]).toBe(neighbor);
      expect(log).not.toHaveBeenCalledWith('Cannot plant in this season!');
      log.mockRestore();
    },
  );

  it('does not plant when removeItem returns false', () => {
    useGameStore.getState().createNewGame('Planter');
    const soil: SoilTile = {
      position: { x: 4, y: 5 },
      state: 'tilled_wet',
      walkable: true,
      fertilizer: 'water',
    };
    setFarm([soil], [wheat(5)], allowedSeason);
    const worldBefore = useGameStore.getState().world;

    useGameStore.getState().plantSeed(4, 5, cornPacket.id);

    expect(useGameStore.getState().world).toBe(worldBefore);
    expect(seedQuantity()).toBeUndefined();
    expect(tilesOf()[0]?.crop).toBeUndefined();
    expect(useGameStore.getState().world?.player.inventory.find((item) => item.id === 'wheat')?.quantity).toBe(5);
  });
});
