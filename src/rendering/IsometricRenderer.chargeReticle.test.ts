import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Node's experimental localStorage has no methods unless --localstorage-file is set.
// The renderer's singletons load the store, so install a memory shim before they load.
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

import { IsometricRenderer } from './IsometricRenderer';

beforeEach(() => {
  vi.stubGlobal('window', { devicePixelRatio: 1 });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function recordingContext() {
  const stroke = vi.fn();
  const ctx = {
    scale: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    closePath: vi.fn(),
    fill: vi.fn(),
    stroke,
  };
  return { ctx, stroke };
}

function rendererOn(ctx: object, mapSize: { x: number; y: number }) {
  const canvas = {
    width: 800,
    height: 600,
    style: {},
    getContext: () => ctx,
    getBoundingClientRect: () => ({ width: 800, height: 600 }),
  } as unknown as HTMLCanvasElement;
  const renderer = new IsometricRenderer(canvas);
  (renderer as unknown as { mapSize: { x: number; y: number } }).mapSize = mapSize;
  return renderer;
}

function drawReticle(renderer: IsometricRenderer): void {
  (renderer as unknown as { drawChargeReticle(): void }).drawChargeReticle();
}

describe('IsometricRenderer charge reticle', () => {
  it('outlines each on-map charged cell and skips cells off the map', () => {
    const { ctx, stroke } = recordingContext();
    const renderer = rendererOn(ctx, { x: 20, y: 20 });

    renderer.setChargeReticle([{ x: 3, y: 4 }, { x: 4, y: 4 }, { x: 25, y: 4 }]);
    drawReticle(renderer);

    expect(stroke).toHaveBeenCalledTimes(2);
  });

  it('draws nothing once the reticle is cleared', () => {
    const { ctx, stroke } = recordingContext();
    const renderer = rendererOn(ctx, { x: 20, y: 20 });

    renderer.setChargeReticle([{ x: 3, y: 4 }]);
    renderer.setChargeReticle(null);
    drawReticle(renderer);

    expect(stroke).not.toHaveBeenCalled();
  });

  it('keeps its own copy of the cells, so a later mutation of the input does not change the reticle', () => {
    const { ctx, stroke } = recordingContext();
    const renderer = rendererOn(ctx, { x: 20, y: 20 });
    const cells = [{ x: 3, y: 4 }];

    renderer.setChargeReticle(cells);
    cells.push({ x: 5, y: 5 });
    drawReticle(renderer);

    expect(stroke).toHaveBeenCalledTimes(1);
  });
});
