import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { gridToScreen, screenToGrid } from '../engine/TileMap';
import { IsometricRenderer } from './IsometricRenderer';

const TILE_WIDTH = 64;
const TILE_HEIGHT = 32;

beforeEach(() => {
  vi.stubGlobal('window', { devicePixelRatio: 1 });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function canvasOf(width: number, height: number): HTMLCanvasElement {
  return {
    width,
    height,
    style: {},
    getContext: () => ({ scale: () => {} }),
    getBoundingClientRect: () => ({ width, height }),
  } as unknown as HTMLCanvasElement;
}

function project(renderer: IsometricRenderer, gridX: number, gridY: number) {
  const iso = (
    renderer as unknown as {
      worldToIsometric: (x: number, y: number, z: number) => { screenX: number; screenY: number };
    }
  ).worldToIsometric(gridX, gridY, 0);
  return { x: iso.screenX, y: iso.screenY };
}

describe('gridToScreen / screenToGrid', () => {
  it('round-trips the origin, a mid tile, and a far corner', () => {
    for (const [gridX, gridY] of [
      [0, 0],
      [8, 5],
      [99, 79],
    ] as const) {
      const screen = gridToScreen(gridX, gridY, TILE_WIDTH, TILE_HEIGHT);
      expect(screenToGrid(screen.x, screen.y, TILE_WIDTH, TILE_HEIGHT)).toEqual({ gridX, gridY });
    }
  });

  it('keeps a point just inside the cell off the next tile', () => {
    const screen = gridToScreen(3.75, 5.75, TILE_WIDTH, TILE_HEIGHT);
    expect(screenToGrid(screen.x, screen.y, TILE_WIDTH, TILE_HEIGHT)).toEqual({
      gridX: 3,
      gridY: 5,
    });
  });
});

describe('IsometricRenderer grid round trip', () => {
  it('round-trips through the camera and the HiDPI CSS origin', () => {
    vi.stubGlobal('window', { devicePixelRatio: 2 });
    const css = { width: 800, height: 600 };
    const canvas = canvasOf(css.width, css.height);
    const renderer = new IsometricRenderer(canvas);
    (renderer as unknown as { mapSize: { x: number; y: number } }).mapSize = { x: 100, y: 80 };
    renderer.setCamera(40, -25, 0);

    expect(canvas.width).toBe(css.width * 2);
    expect(canvas.style.width).toBe(`${css.width}px`);

    for (const [gridX, gridY] of [
      [0, 0],
      [8, 5],
      [99, 79],
    ] as const) {
      const screen = project(renderer, gridX, gridY);
      expect(renderer.screenToVoxel(screen.x, screen.y)).toEqual({ x: gridX, y: gridY });
    }

    const off = project(renderer, -1, 4);
    expect(renderer.screenToVoxel(off.x, off.y)).toBeNull();
  });

  it('does not send a point just inside the diamond to the neighbor', () => {
    vi.stubGlobal('window', { devicePixelRatio: 2 });
    const canvas = canvasOf(800, 600);
    const renderer = new IsometricRenderer(canvas);
    (renderer as unknown as { mapSize: { x: number; y: number } }).mapSize = { x: 100, y: 100 };
    renderer.setCamera(40, -25, 0);

    const inside = project(renderer, 2.75, 4.75);
    expect(renderer.screenToVoxel(inside.x, inside.y)).toEqual({ x: 3, y: 5 });
  });
});
