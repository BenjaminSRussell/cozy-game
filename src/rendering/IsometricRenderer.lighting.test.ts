import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PLACED_LIGHT_RADIUS } from '../engine/LightingSystem';
import { IsometricRenderer } from './IsometricRenderer';

beforeEach(() => {
  vi.stubGlobal('window', { devicePixelRatio: 1 });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function worldAt(dayTime: number, withLights: boolean) {
  return {
    mapSize: { x: 10, y: 10 },
    dayTime,
    farmPlots: [],
    buildings: withLights
      ? [
          { type: 'barn', position: { x: 1, y: 1, z: 0 } },
          { type: 'lantern', position: { x: 3, y: 5, z: 0 } },
          { type: 'torch', position: { x: 4, y: 2, z: 0 } },
        ]
      : [],
    homeBuildings: withLights
      ? [{ type: 'lamp', position: { x: 2, y: 2, z: 0 } }]
      : [],
    oreDeposits: [],
    woodSources: [],
    animals: [],
    roads: [],
    vehicles: [],
    grassGrowth: {},
    player: { position: { x: 0, y: 0, z: 0 }, coins: 1, level: 1 },
  } as never;
}

describe('IsometricRenderer day/night overlay', () => {
  const proto = IsometricRenderer.prototype as unknown as {
    drawVoxels: () => void;
    drawWindParticles: () => void;
    drawUI: () => void;
    drawHoveredTile: () => void;
  };

  beforeEach(() => {
    vi.spyOn(proto, 'drawVoxels').mockImplementation(() => {});
    vi.spyOn(proto, 'drawWindParticles').mockImplementation(() => {});
    vi.spyOn(proto, 'drawUI').mockImplementation(() => {});
    vi.spyOn(proto, 'drawHoveredTile').mockImplementation(() => {});
  });

  it('overlays the sunset tint and cuts radial holes for placed lights', () => {
    const stops: string[] = [];
    const arcs: Array<{ x: number; y: number; r: number; op: string }> = [];
    const layerFills: string[] = [];
    const layer = {
      setTransform: () => {},
      clearRect: () => {},
      fillRect: () => {
        layerFills.push(`${layer.globalCompositeOperation}:${String(layer.fillStyle)}`);
      },
      fillStyle: '' as string | object,
      globalCompositeOperation: 'source-over',
      createRadialGradient: () => ({
        addColorStop: (offset: number, color: string) => {
          stops.push(`${offset}:${color}`);
        },
      }),
      beginPath: () => {},
      arc: (x: number, y: number, r: number) => {
        arcs.push({ x, y, r, op: layer.globalCompositeOperation });
      },
      fill: () => {},
    };
    let created = 0;
    const surface = {
      width: 0,
      height: 0,
      getContext: () => layer,
    };
    vi.stubGlobal('document', {
      createElement: () => {
        created += 1;
        return surface;
      },
    });
    vi.stubGlobal('matchMedia', () => ({ matches: true, media: '(prefers-reduced-motion: reduce)' }));

    const draws: string[] = [];
    const main = {
      scale: () => {},
      clearRect: () => {},
      createLinearGradient: () => ({ addColorStop: () => {} }),
      fillRect: () => {},
      fillStyle: '',
      globalCompositeOperation: 'source-over',
      drawImage: () => {
        draws.push(main.globalCompositeOperation);
      },
    };
    const canvas = {
      width: 800,
      height: 600,
      style: {},
      getContext: () => main,
      getBoundingClientRect: () => ({ width: 800, height: 600 }),
    } as unknown as HTMLCanvasElement;

    const renderer = new IsometricRenderer(canvas);
    const project = (x: number, y: number) =>
      (renderer as unknown as {
        worldToIsometric: (gx: number, gy: number, gz: number) => { screenX: number; screenY: number };
      }).worldToIsometric(x, y, 0);

    renderer.render(worldAt(12 * 60, true));
    expect(draws).toEqual([]);
    expect(layerFills).toEqual([]);

    renderer.render(worldAt(20 * 60, true));
    renderer.render(worldAt(20 * 60, true));
    expect(created).toBe(1);
    expect(draws).toEqual(['overlay', 'overlay']);
    expect(main.globalCompositeOperation).toBe('source-over');
    expect(layerFills).toEqual([
      'source-over:rgba(255, 120, 50, 0.25)',
      'source-over:rgba(255, 120, 50, 0.25)',
    ]);
    expect(surface.width).toBe(800);
    expect(surface.height).toBe(600);

    const lantern = project(3, 5);
    const torch = project(4, 2);
    const lamp = project(2, 2);
    const barn = project(1, 1);
    expect(arcs).toEqual([
      { x: lantern.screenX, y: lantern.screenY, r: PLACED_LIGHT_RADIUS.lantern, op: 'destination-out' },
      { x: torch.screenX, y: torch.screenY, r: PLACED_LIGHT_RADIUS.torch, op: 'destination-out' },
      { x: lamp.screenX, y: lamp.screenY, r: PLACED_LIGHT_RADIUS.lamp, op: 'destination-out' },
      { x: lantern.screenX, y: lantern.screenY, r: PLACED_LIGHT_RADIUS.lantern, op: 'destination-out' },
      { x: torch.screenX, y: torch.screenY, r: PLACED_LIGHT_RADIUS.torch, op: 'destination-out' },
      { x: lamp.screenX, y: lamp.screenY, r: PLACED_LIGHT_RADIUS.lamp, op: 'destination-out' },
    ]);
    expect(arcs.some((arc) => arc.x === barn.screenX && arc.y === barn.screenY)).toBe(false);
    expect(stops.filter((_, index) => index < 3)).toEqual([
      '0:rgba(0, 0, 0, 1)',
      '0.55:rgba(0, 0, 0, 0.72)',
      '1:rgba(0, 0, 0, 0)',
    ]);
  });

  it('still paints the navy tint when there is no offscreen canvas', () => {
    const rects: Array<{ style: string; op: string }> = [];
    const main = {
      scale: () => {},
      clearRect: () => {},
      createLinearGradient: () => ({ addColorStop: () => {} }),
      fillRect: () => {
        rects.push({ style: String(main.fillStyle), op: main.globalCompositeOperation });
      },
      fillStyle: '',
      globalCompositeOperation: 'source-over',
    };
    const canvas = {
      width: 800,
      height: 600,
      style: {},
      getContext: () => main,
      getBoundingClientRect: () => ({ width: 800, height: 600 }),
    } as unknown as HTMLCanvasElement;

    const renderer = new IsometricRenderer(canvas);
    renderer.render(worldAt(2 * 60, true));
    expect(rects).toContainEqual({ style: 'rgba(15, 20, 60, 0.6)', op: 'overlay' });
    expect(main.globalCompositeOperation).toBe('source-over');
  });
});
