import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Node's experimental localStorage has no methods unless --localstorage-file is set.
// gameStore persists through it, so install a memory shim before the store loads.
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

import { useGameStore } from '../store/gameStore';
import { IsometricRenderer } from './IsometricRenderer';

const TILE_SIZE = 64;

beforeEach(() => {
  vi.stubGlobal('window', { devicePixelRatio: 1 });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function canvasOf(
  width: number,
  height: number,
  scale: (x: number, y: number) => void = () => {}
): HTMLCanvasElement {
  return {
    width,
    height,
    style: {},
    getContext: () => ({ scale }),
    getBoundingClientRect: () => ({ width, height }),
  } as unknown as HTMLCanvasElement;
}

function rendererWithMap(width: number, height: number, mapSize: { x: number; y: number }) {
  const canvas = canvasOf(width, height);
  const renderer = new IsometricRenderer(canvas);
  (renderer as unknown as { mapSize: { x: number; y: number } }).mapSize = mapSize;
  return { canvas, renderer };
}

/** Forward projection matching worldToIsometric at z = 0. */
function tileToScreen(
  x: number,
  y: number,
  canvas: { width: number; height: number },
  camera: { x: number; y: number } = { x: 0, y: 0 }
) {
  const isoX = (x - y) * (TILE_SIZE / 2);
  const isoY = (x + y) * (TILE_SIZE / 4);
  return {
    x: isoX + canvas.width / 2 + camera.x,
    y: isoY + canvas.height / 3 + camera.y,
  };
}

describe('IsometricRenderer.screenToVoxel', () => {
  it('returns tile (3, 5) for that tile’s projected screen position', () => {
    const { canvas, renderer } = rendererWithMap(800, 600, { x: 100, y: 100 });
    const screen = tileToScreen(3, 5, canvas);
    expect(renderer.screenToVoxel(screen.x, screen.y)).toEqual({ x: 3, y: 5 });
  });

  it('round-trips the same tile after the camera moves', () => {
    const { canvas, renderer } = rendererWithMap(800, 600, { x: 100, y: 100 });
    const camera = { x: 40, y: -25 };
    renderer.setCamera(camera.x, camera.y, 0);
    const screen = tileToScreen(3, 5, canvas, camera);
    expect(renderer.screenToVoxel(screen.x, screen.y)).toEqual({ x: 3, y: 5 });
  });

  it('selects the centered diamond, not the floor of the continuous coordinate', () => {
    const { canvas, renderer } = rendererWithMap(800, 600, { x: 100, y: 100 });
    const inside = tileToScreen(2.6, 4.6, canvas);
    expect(renderer.screenToVoxel(inside.x, inside.y)).toEqual({ x: 3, y: 5 });
  });

  it('returns the map-center tile when the canvas center is aimed at it', () => {
    const mapSize = { x: 100, y: 100 };
    const { canvas, renderer } = rendererWithMap(800, 600, mapSize);
    const center = { x: mapSize.x / 2, y: mapSize.y / 2 };
    const projected = tileToScreen(center.x, center.y, canvas);
    renderer.setCamera(canvas.width / 2 - projected.x, canvas.height / 2 - projected.y, 0);
    expect(renderer.screenToVoxel(canvas.width / 2, canvas.height / 2)).toEqual(center);
  });

  it('returns null outside the map and keeps the last in-bounds tile', () => {
    const { canvas, renderer } = rendererWithMap(800, 600, { x: 100, y: 80 });
    const negative = tileToScreen(-1, 4, canvas);
    const pastX = tileToScreen(100, 0, canvas);
    const pastY = tileToScreen(0, 80, canvas);
    const last = tileToScreen(99, 79, canvas);
    expect(renderer.screenToVoxel(negative.x, negative.y)).toBeNull();
    expect(renderer.screenToVoxel(pastX.x, pastX.y)).toBeNull();
    expect(renderer.screenToVoxel(pastY.x, pastY.y)).toBeNull();
    expect(renderer.screenToVoxel(last.x, last.y)).toEqual({ x: 99, y: 79 });
  });
});

describe('IsometricRenderer devicePixelRatio', () => {
  it('sets canvas.width to rect.width * 2 when dpr is 2', () => {
    vi.stubGlobal('window', { devicePixelRatio: 2 });
    const rect = { width: 800, height: 600 };
    const scale = vi.fn();
    const canvas = canvasOf(rect.width, rect.height, scale);

    new IsometricRenderer(canvas);

    expect(canvas.width).toBe(rect.width * 2);
    expect(canvas.height).toBe(rect.height * 2);
    expect(canvas.style.width).toBe(`${rect.width}px`);
    expect(canvas.style.height).toBe(`${rect.height}px`);
    expect(scale).toHaveBeenCalledWith(2, 2);
  });

  it('sets canvas.width to rect.width when dpr is 1', () => {
    vi.stubGlobal('window', { devicePixelRatio: 1 });
    const rect = { width: 800, height: 600 };
    const canvas = canvasOf(rect.width, rect.height);

    new IsometricRenderer(canvas);

    expect(canvas.width).toBe(rect.width);
    expect(canvas.height).toBe(rect.height);
    expect(canvas.style.width).toBe(`${rect.width}px`);
    expect(canvas.style.height).toBe(`${rect.height}px`);
  });

  it('projects a tile from the CSS center at dpr 2 and rejects off-map clicks', () => {
    vi.stubGlobal('window', { devicePixelRatio: 2 });
    const rect = { width: 800, height: 600 };
    const canvas = canvasOf(rect.width, rect.height);
    const renderer = new IsometricRenderer(canvas);
    (renderer as unknown as { mapSize: { x: number; y: number } }).mapSize = { x: 100, y: 80 };

    const css = { width: rect.width, height: rect.height };
    const screen = tileToScreen(3, 5, css);
    expect(renderer.screenToVoxel(screen.x, screen.y)).toEqual({ x: 3, y: 5 });
    expect(renderer.screenToVoxel(tileToScreen(-1, 4, css).x, tileToScreen(-1, 4, css).y)).toBeNull();
    expect(renderer.screenToVoxel(tileToScreen(100, 0, css).x, tileToScreen(100, 0, css).y)).toBeNull();
  });
});

function renderCanvas(): HTMLCanvasElement {
  const gradient = { addColorStop: () => {} };
  const ctx = {
    scale: () => {},
    clearRect: () => {},
    createLinearGradient: () => gradient,
    fillRect: () => {},
    fillStyle: '',
  };
  return {
    width: 800,
    height: 600,
    style: {},
    getContext: () => ctx,
    getBoundingClientRect: () => ({ width: 800, height: 600 }),
  } as unknown as HTMLCanvasElement;
}

/** Enough world data for buildVoxelWorld to walk terrain, crops, and props. */
function staticWorld() {
  return {
    mapSize: { x: 10, y: 10 },
    farmPlots: [],
    buildings: [],
    oreDeposits: [],
    woodSources: [],
    animals: [],
    roads: [],
    vehicles: [],
    grassGrowth: {},
    player: { position: { x: 1, y: 2, z: 0 } },
  } as never;
}

describe('IsometricRenderer worldDirty', () => {
  const proto = IsometricRenderer.prototype as unknown as {
    buildVoxelWorld: (world: unknown) => void;
    drawVoxels: () => void;
    drawWindParticles: (world: unknown) => void;
    drawUI: (world: unknown) => void;
  };

  let drawVoxels: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    drawVoxels = vi.spyOn(proto, 'drawVoxels').mockImplementation(() => {});
    vi.spyOn(proto, 'drawWindParticles').mockImplementation(() => {});
    vi.spyOn(proto, 'drawUI').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('builds voxels once at startup and again only after markDirty', () => {
    const buildVoxelWorld = vi.spyOn(proto, 'buildVoxelWorld');
    const renderer = new IsometricRenderer(renderCanvas());
    const world = staticWorld();

    renderer.render(world);
    renderer.render(world);
    renderer.render(world);

    expect(buildVoxelWorld).toHaveBeenCalledTimes(1);
    expect(drawVoxels).toHaveBeenCalledTimes(3);

    renderer.markDirty();
    renderer.render(world);
    renderer.render(world);

    expect(buildVoxelWorld).toHaveBeenCalledTimes(2);
    expect(drawVoxels).toHaveBeenCalledTimes(5);
  });

  it('rebuilds after plantCrop and waterCrop replace the world, not on an unchanged render', () => {
    const buildVoxelWorld = vi.spyOn(proto, 'buildVoxelWorld');
    const renderer = new IsometricRenderer(renderCanvas());
    const world = staticWorld();

    renderer.render(world);
    expect(buildVoxelWorld).toHaveBeenCalledTimes(1);

    useGameStore.getState().createNewGame('DirtyFlag');
    renderer.render(world);
    renderer.render(world);
    expect(buildVoxelWorld).toHaveBeenCalledTimes(2);

    useGameStore.getState().plantCrop('no-such-plot', 'wheat');
    renderer.render(world);
    renderer.render(world);
    expect(buildVoxelWorld).toHaveBeenCalledTimes(3);

    useGameStore.getState().waterCrop('no-such-plot');
    renderer.render(world);
    renderer.render(world);
    expect(buildVoxelWorld).toHaveBeenCalledTimes(4);
  });
});

type PointerCanvas = HTMLCanvasElement & {
  emit: (type: string, event: { clientX: number; clientY: number }) => void;
};

function pointerCanvas(
  cssWidth: number,
  cssHeight: number,
  origin: { left: number; top: number } = { left: 0, top: 0 },
  ctx: object = { scale: () => {} }
): PointerCanvas {
  const listeners = new Map<string, Set<EventListener>>();
  const canvas = {
    width: cssWidth,
    height: cssHeight,
    style: {} as CSSStyleDeclaration,
    getContext: () => ctx,
    getBoundingClientRect: () => ({
      width: cssWidth,
      height: cssHeight,
      left: origin.left,
      top: origin.top,
    }),
    addEventListener(type: string, handler: EventListener) {
      const set = listeners.get(type) ?? new Set<EventListener>();
      set.add(handler);
      listeners.set(type, set);
    },
    removeEventListener(type: string, handler: EventListener) {
      listeners.get(type)?.delete(handler);
    },
    emit(type: string, event: { clientX: number; clientY: number }) {
      for (const handler of listeners.get(type) ?? []) {
        handler(event as unknown as Event);
      }
    },
  };
  return canvas as unknown as PointerCanvas;
}

describe('IsometricRenderer hoveredTile', () => {
  const proto = IsometricRenderer.prototype as unknown as {
    buildVoxelWorld: (world: unknown) => void;
    drawVoxels: () => void;
    drawWindParticles: (world: unknown) => void;
    drawUI: (world: unknown) => void;
  };

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sets hoveredTile from a pointer over a known tile and clears it off the map', () => {
    vi.stubGlobal('window', { devicePixelRatio: 2 });
    const css = { width: 800, height: 600 };
    const origin = { left: 80, top: 50 };
    const canvas = pointerCanvas(css.width, css.height, origin);
    const renderer = new IsometricRenderer(canvas);
    (renderer as unknown as { mapSize: { x: number; y: number } }).mapSize = { x: 100, y: 80 };

    // Backing store is dpr-scaled; the pointer stays in CSS pixels.
    expect(canvas.width).toBe(css.width * 2);
    expect(canvas.style.width).toBe(`${css.width}px`);

    const over = tileToScreen(2.6, 4.6, css);
    canvas.emit('pointermove', {
      clientX: over.x + origin.left,
      clientY: over.y + origin.top,
    });
    expect(renderer.hoveredTile).toEqual({ x: 3, y: 5 });

    const off = tileToScreen(100, 0, css);
    canvas.emit('pointermove', {
      clientX: off.x + origin.left,
      clientY: off.y + origin.top,
    });
    expect(renderer.hoveredTile).toBeNull();
  });

  it('draws a white diamond on the snapped tile and does not rebuild an unchanged hover', () => {
    const diamonds: Array<{
      stroke: string;
      fill: string;
      lineWidth: number;
      stroked: boolean;
      points: string;
    }> = [];
    const points: string[] = [];
    let stroked = false;
    const ctx = {
      scale: () => {},
      clearRect: () => {},
      createLinearGradient: () => ({ addColorStop: () => {} }),
      fillRect: () => {},
      fillStyle: '' as string | CanvasGradient,
      strokeStyle: '',
      lineWidth: 1,
      beginPath: () => {
        points.length = 0;
        stroked = false;
      },
      moveTo: (x: number, y: number) => {
        points.push(`M${x},${y}`);
      },
      lineTo: (x: number, y: number) => {
        points.push(`L${x},${y}`);
      },
      closePath: () => {
        points.push('Z');
      },
      stroke: () => {
        stroked = true;
      },
      fill: () => {
        diamonds.push({
          stroke: String(ctx.strokeStyle),
          fill: String(ctx.fillStyle),
          lineWidth: ctx.lineWidth,
          stroked,
          points: points.join(' '),
        });
      },
    };

    const css = { width: 800, height: 600 };
    const canvas = pointerCanvas(css.width, css.height, { left: 0, top: 0 }, ctx);
    const buildVoxelWorld = vi.spyOn(proto, 'buildVoxelWorld');
    const drawVoxels = vi.spyOn(proto, 'drawVoxels').mockImplementation(() => {});
    vi.spyOn(proto, 'drawWindParticles').mockImplementation(() => {});
    vi.spyOn(proto, 'drawUI').mockImplementation(() => {});

    const renderer = new IsometricRenderer(canvas);
    renderer.render(staticWorld());
    expect(buildVoxelWorld).toHaveBeenCalledTimes(1);
    expect(drawVoxels).toHaveBeenCalledTimes(1);
    expect(diamonds).toHaveLength(0);

    const center = tileToScreen(3, 5, css);
    const inside = tileToScreen(2.6, 4.6, css);
    canvas.emit('pointermove', { clientX: inside.x, clientY: inside.y });
    expect(renderer.hoveredTile).toEqual({ x: 3, y: 5 });
    expect(buildVoxelWorld).toHaveBeenCalledTimes(1);
    expect(drawVoxels).toHaveBeenCalledTimes(2);
    expect(diamonds).toEqual([
      {
        stroke: 'rgba(255, 255, 255, 0.8)',
        fill: 'rgba(255, 255, 255, 0.2)',
        lineWidth: 2,
        stroked: true,
        points: `M${center.x},${center.y - 16} L${center.x + 32},${center.y} L${center.x},${center.y + 16} L${center.x - 32},${center.y} Z`,
      },
    ]);

    canvas.emit('pointermove', { clientX: center.x, clientY: center.y });
    expect(renderer.hoveredTile).toEqual({ x: 3, y: 5 });
    expect(buildVoxelWorld).toHaveBeenCalledTimes(1);
    expect(drawVoxels).toHaveBeenCalledTimes(2);
    expect(diamonds).toHaveLength(1);

    const off = tileToScreen(-1, 4, css);
    canvas.emit('pointermove', { clientX: off.x, clientY: off.y });
    expect(renderer.hoveredTile).toBeNull();
    expect(buildVoxelWorld).toHaveBeenCalledTimes(1);
    expect(drawVoxels).toHaveBeenCalledTimes(3);
    expect(diamonds).toHaveLength(1);
  });
});

interface DepthQueueItem {
  kind: string;
  gridX: number;
  gridY: number;
  zLayer: number;
  depth: number;
}

/** World with a background tree, the player, and buildings in front of the player. */
function depthWorld() {
  return {
    mapSize: { x: 10, y: 10 },
    farmPlots: [
      {
        id: 'plot-1',
        position: { x: 1, y: 0 },
        size: { x: 1, y: 1 },
        tilled: true,
        crop: {
          id: 'crop-1',
          type: 'wheat',
          stage: 0,
          position: { x: 1, y: 0 },
          plantedTime: 0,
          waterLevel: 50,
          health: 100,
        },
      },
    ],
    buildings: [
      {
        id: 'coop',
        type: 'coop',
        position: { x: 3, y: 1, z: 0 },
        rotation: 0,
        unlocked: true,
        level: 1,
        spriteId: 'coop',
      },
      {
        id: 'barn',
        type: 'barn',
        position: { x: 4, y: 2, z: 0 },
        rotation: 0,
        unlocked: true,
        level: 1,
        spriteId: 'barn',
      },
    ],
    oreDeposits: [
      {
        id: 'ore-1',
        position: { x: 2, y: 2, z: 0 },
        oreType: 'copper',
        quantity: 1,
        durability: 100,
      },
    ],
    woodSources: [
      {
        id: 'tree-back',
        position: { x: 0, y: 0 },
        treeType: 'oak',
        health: 100,
        regrowthTime: 1,
        fruitStage: 0,
      },
      {
        id: 'tree-front',
        position: { x: 5, y: 5 },
        treeType: 'oak',
        health: 100,
        regrowthTime: 1,
        fruitStage: 3,
        fruitType: 'apple',
      },
      {
        id: 'stump',
        position: { x: 6, y: 6 },
        treeType: 'oak',
        health: 0,
        regrowthTime: 1,
      },
    ],
    animals: [
      {
        id: 'hen',
        type: 'chicken',
        name: 'Hen',
        buildingId: 'coop',
        hunger: 80,
        affection: 1,
        lastFedDay: 0,
        hasProduct: false,
        position: { x: 2, y: 0 },
        rotation: 0,
      },
    ],
    roads: [
      {
        id: 'road-1',
        type: 'dirt',
        grade: 'gravel',
        lanes: 1,
        position: { x: 1, y: 1 },
        connections: 0,
      },
    ],
    vehicles: [
      {
        id: 'truck-1',
        type: 'truck',
        position: { x: 4, y: 4, z: 1 },
        rotation: 0,
        speed: 0,
      },
    ],
    grassGrowth: {},
    player: {
      position: { x: 3, y: 1, z: 0 },
      coins: 0,
      level: 1,
      mountedVehicleId: undefined,
      animation: { action: 'idle', isPlaying: false },
    },
  } as never;
}

function depthCanvas(): HTMLCanvasElement {
  const ctx = {
    scale: () => {},
    save: () => {},
    restore: () => {},
    clearRect: () => {},
    createLinearGradient: () => ({ addColorStop: () => {} }),
    fillRect: () => {},
    fillStyle: '',
  };
  return {
    width: 800,
    height: 600,
    style: {},
    getContext: () => ctx,
    getBoundingClientRect: () => ({ width: 800, height: 600 }),
  } as unknown as HTMLCanvasElement;
}

describe('IsometricRenderer depth queue', () => {
  const proto = IsometricRenderer.prototype as unknown as {
    buildVoxelWorld: (world: unknown) => void;
    drawQueued: (item: DepthQueueItem) => void;
    drawTerrainTile: () => void;
    drawCrop: () => void;
    drawBuilding: () => void;
    drawAnimal: () => void;
    drawOre: () => void;
    drawPlayer: () => void;
    drawRoad: () => void;
    drawVehicle: () => void;
    drawTreeLayer: () => void;
    drawWindParticles: () => void;
    drawUI: () => void;
  };

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sorts by (gridX + gridY) * 1000 + zLayer so the player is behind a building and in front of a background tree', () => {
    const draws: string[] = [];
    const originalDrawQueued = proto.drawQueued;
    vi.spyOn(proto, 'drawQueued').mockImplementation(function (this: unknown, item: DepthQueueItem) {
      draws.push(`${item.kind}@${item.gridX},${item.gridY}`);
      originalDrawQueued.call(this, item);
    });
    vi.spyOn(proto, 'drawTerrainTile').mockImplementation(() => {});
    vi.spyOn(proto, 'drawCrop').mockImplementation(() => {});
    vi.spyOn(proto, 'drawBuilding').mockImplementation(() => {});
    vi.spyOn(proto, 'drawAnimal').mockImplementation(() => {});
    vi.spyOn(proto, 'drawOre').mockImplementation(() => {});
    vi.spyOn(proto, 'drawPlayer').mockImplementation(() => {});
    vi.spyOn(proto, 'drawRoad').mockImplementation(() => {});
    vi.spyOn(proto, 'drawVehicle').mockImplementation(() => {});
    vi.spyOn(proto, 'drawTreeLayer').mockImplementation(() => {});
    vi.spyOn(proto, 'drawWindParticles').mockImplementation(() => {});
    vi.spyOn(proto, 'drawUI').mockImplementation(() => {});
    const buildVoxelWorld = vi.spyOn(proto, 'buildVoxelWorld');

    const renderer = new IsometricRenderer(depthCanvas());
    expect((renderer as unknown as { tileSize: number }).tileSize).toBe(TILE_SIZE);
    renderer.render(depthWorld());

    const queue = (renderer as unknown as { renderQueue: DepthQueueItem[] }).renderQueue;
    const at = (kind: string, x: number, y: number) =>
      queue.findIndex((item) => item.kind === kind && item.gridX === x && item.gridY === y);

    expect(queue.filter((item) => item.kind === 'terrainDecal')).toHaveLength(900);
    expect(queue.filter((item) => item.kind === 'crop')).toHaveLength(1);
    expect(queue.filter((item) => item.kind === 'building')).toHaveLength(2);
    expect(queue.filter((item) => item.kind === 'player')).toHaveLength(1);
    expect(queue.filter((item) => item.kind === 'animal')).toHaveLength(1);
    expect(queue.filter((item) => item.kind === 'treeTrunk')).toHaveLength(2);
    expect(queue.filter((item) => item.kind === 'treeTop')).toHaveLength(2);
    expect(queue.filter((item) => item.kind === 'road')).toHaveLength(1);
    expect(queue.filter((item) => item.kind === 'ore')).toHaveLength(1);
    expect(queue.filter((item) => item.kind === 'vehicle')).toHaveLength(1);
    expect(queue.some((item) => item.gridX === 6 && item.gridY === 6 && item.kind !== 'terrainDecal')).toBe(false);

    for (const item of queue) {
      expect(item.depth).toBe((item.gridX + item.gridY) * 1000 + item.zLayer);
    }
    for (let i = 1; i < queue.length; i++) {
      expect(queue[i].depth).toBeGreaterThanOrEqual(queue[i - 1].depth);
    }

    const backTrunk = at('treeTrunk', 0, 0);
    const backTop = at('treeTop', 0, 0);
    const ownGround = at('terrainDecal', 3, 1);
    const player = at('player', 3, 1);
    const sameBuilding = at('building', 3, 1);
    const frontBuilding = at('building', 4, 2);
    const frontTrunk = at('treeTrunk', 5, 5);
    const frontTop = at('treeTop', 5, 5);
    const nearerGround = at('terrainDecal', 4, 1);

    expect(backTrunk).toBeGreaterThanOrEqual(0);
    expect(backTop).toBeGreaterThan(backTrunk);
    expect(ownGround).toBeLessThan(player);
    expect(player).toBeGreaterThan(backTop);
    expect(sameBuilding).toBeGreaterThan(player);
    expect(frontBuilding).toBeGreaterThan(sameBuilding);
    expect(frontTrunk).toBeGreaterThan(player);
    expect(frontTop).toBeGreaterThan(frontTrunk);
    expect(nearerGround).toBeGreaterThan(player);
    expect(queue[backTop].zLayer).toBeLessThan(1000);
    expect(queue[player].zLayer).toBeGreaterThan(queue[ownGround].zLayer);
    expect(queue[sameBuilding].zLayer).toBeGreaterThan(queue[player].zLayer);
    expect(queue[backTop].zLayer).toBeGreaterThan(queue[backTrunk].zLayer);

    const actors = [
      'treeTrunk@0,0',
      'treeTop@0,0',
      'player@3,1',
      'building@3,1',
      'building@4,2',
      'treeTrunk@5,5',
      'treeTop@5,5',
    ];
    const actorDraws = draws.filter((label) => actors.includes(label));
    expect(actorDraws).toEqual(actors);

    renderer.render(depthWorld());
    expect(buildVoxelWorld).toHaveBeenCalledTimes(1);
    const again = (renderer as unknown as { renderQueue: DepthQueueItem[] }).renderQueue;
    expect(again.map((item) => item.depth)).toEqual(queue.map((item) => item.depth));
  });
});
