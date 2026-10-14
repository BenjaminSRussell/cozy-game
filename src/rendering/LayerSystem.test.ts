import { describe, expect, it } from 'vitest';
import { CameraSystem } from './CameraSystem';
import { LayerConfig, LayerSystem } from './LayerSystem';
import { RenderPipeline } from './RenderPipeline';

function layerConfig(id: string, zIndex: number): LayerConfig {
  return {
    id,
    name: id,
    zIndex,
    visible: true,
    parallaxFactor: { x: 1, y: 1 },
    opacity: 1,
    blendMode: 'source-over',
    effects: [],
    cullingEnabled: false,
    batchingEnabled: true,
    renderOrder: 'back-to-front',
  };
}

function system(): LayerSystem {
  return new LayerSystem({} as RenderPipeline, new CameraSystem(800, 600));
}

function frameCtx(): CanvasRenderingContext2D {
  return {
    save() {},
    restore() {},
    globalAlpha: 1,
    globalCompositeOperation: 'source-over',
  } as CanvasRenderingContext2D;
}

describe('LayerSystem layer cap', () => {
  it('keeps at most 10 layers after 3600 frames and reuses layer 0', () => {
    const layers = system();
    const first = layers.getLayer('background');
    const ctx = frameCtx();

    for (let frame = 0; frame < 3600; frame++) {
      layers.render(ctx);
    }

    expect(layers.getSystemStats().totalLayers).toBeLessThanOrEqual(10);
    expect(layers.getLayer('background')).toBe(first);
  });

  it('returns the same layer object when an id is created again', () => {
    const layers = system();
    const terrain = layers.getLayer('terrain');
    expect(terrain).toBeDefined();

    const again = layers.createLayer(terrain!.config);

    expect(again).toBe(terrain);
    expect(layers.getSystemStats().totalLayers).toBeLessThanOrEqual(10);
  });

  it('refuses new layer ids once the cap is reached', () => {
    const layers = system();
    const starting = layers.getSystemStats().totalLayers;

    let created = 0;
    let rejected = false;
    for (let i = 0; i < 3600; i++) {
      try {
        layers.createLayer(layerConfig(`extra_${i}`, 2000 + i));
        created++;
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toMatch(/exceeds max \(10\)/);
        rejected = true;
        break;
      }
    }

    expect(rejected).toBe(true);
    expect(created).toBeGreaterThan(0);
    expect(layers.getSystemStats().totalLayers).toBe(starting + created);
    expect(layers.getSystemStats().totalLayers).toBeLessThanOrEqual(10);
    expect(layers.getSystemStats().totalLayers).toBe(10);
  });
});
