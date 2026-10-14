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
