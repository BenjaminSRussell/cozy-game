import { describe, expect, it } from 'vitest';
import { CameraSystem } from './CameraSystem';

function step(camera: CameraSystem, frames: number): void {
  for (let i = 0; i < frames; i++) {
    camera.update(1 / 60);
  }
}

describe('CameraSystem arrival snap', () => {
  it('reaches the move target exactly after 1000 frames', () => {
    const camera = new CameraSystem(800, 600);
    camera.moveTo({ x: 240, y: -80 });

    step(camera, 1);
    expect(camera.position.x).not.toBe(240);
    expect(camera.position.y).not.toBe(-80);

    step(camera, 999);
    expect(camera.position.x).toBe(240);
    expect(camera.position.y).toBe(-80);
  });

  it('snaps movements smaller than half a pixel on the next frame', () => {
    const camera = new CameraSystem(800, 600);
    camera.moveTo({ x: 0.4, y: -0.49 });
    step(camera, 1);
    expect(camera.position).toEqual({ x: 0.4, y: -0.49 });
  });

  it('reaches the zoom target exactly and snaps sub-threshold zoom', () => {
    const camera = new CameraSystem(800, 600);
    camera.zoomTo(2);
    step(camera, 1);
    expect(camera.zoom).not.toBe(2);
    step(camera, 999);
    expect(camera.zoom).toBe(2);

    camera.setZoom(1);
    camera.zoomTo(1.0005);
    step(camera, 1);
    expect(camera.zoom).toBe(1.0005);
  });
});

describe('CameraSystem frame-rate independent smoothing', () => {
  function stepAt(dt: number): { x: number; y: number; zoom: number } {
    const camera = new CameraSystem(800, 600);
    camera.moveTo({ x: 200, y: -80 });
    camera.zoomTo(2);
    camera.update(dt);
    return { x: camera.position.x, y: camera.position.y, zoom: camera.zoom };
  }

  it('matches the original 0.1 step at 60 FPS and about half of that at 120 FPS', () => {
    const at60 = stepAt(0.0167);
    expect(at60.x / 200).toBeCloseTo(0.1, 3);
    expect(at60.y / -80).toBeCloseTo(0.1, 3);
    expect((at60.zoom - 1) / 1).toBeCloseTo(0.1, 3);

    const at120 = stepAt(0.0083);
    expect(at120.x / 200).toBeCloseTo(0.053, 2);
    expect(at120.y / -80).toBeCloseTo(0.053, 2);
    expect(at120.zoom - 1).toBeCloseTo(0.053, 2);
    expect(at120.x).toBeLessThan(at60.x / 1.5);
  });

  it('covers the same distance in the same real time at 30 FPS and 120 FPS', () => {
    const travel = (dt: number, seconds: number) => {
      const camera = new CameraSystem(800, 600);
      camera.moveTo({ x: 1000, y: -400 });
      camera.zoomTo(3);
      const frames = Math.round(seconds / dt);
      for (let i = 0; i < frames; i++) {
        camera.update(dt);
      }
      return camera;
    };

    const slow = travel(1 / 30, 0.5);
    const fast = travel(1 / 120, 0.5);
    expect(fast.position.x).toBeCloseTo(slow.position.x, 4);
    expect(fast.position.y).toBeCloseTo(slow.position.y, 4);
    expect(fast.zoom).toBeCloseTo(slow.zoom, 4);
    expect(slow.position.x).toBeGreaterThan(900);
    expect(slow.position.x).toBeLessThan(1000);
  });
});

function targetZoomOf(camera: CameraSystem): number {
  return (camera as unknown as { targetZoom: number }).targetZoom;
}

describe('CameraSystem zoom limits', () => {
  it('cannot zoom below 0.5', () => {
    const camera = new CameraSystem(800, 600);

    camera.setZoom(0.1);
    expect(camera.zoom).toBe(0.5);
    expect(targetZoomOf(camera)).toBe(0.5);

    camera.setZoom(10);
    expect(camera.zoom).toBe(3);
    expect(targetZoomOf(camera)).toBe(3);

    camera.setZoom(1.5);
    expect(camera.zoom).toBe(1.5);
    expect(targetZoomOf(camera)).toBe(1.5);

    camera.zoomTo(0.01);
    expect(targetZoomOf(camera)).toBe(0.5);
    step(camera, 1000);
    expect(camera.zoom).toBeGreaterThanOrEqual(0.5);
    expect(camera.zoom).toBe(0.5);

    camera.setZoomLimits(0.1, 5);
    camera.setZoom(0.1);
    expect(camera.zoom).toBe(0.5);
    expect(targetZoomOf(camera)).toBe(0.5);
  });
});

function shakeOf(camera: CameraSystem): { currentTime: number } | undefined {
  return (camera as unknown as { shake?: { currentTime: number } }).shake;
}

describe('CameraSystem shake', () => {
  it('offsets the camera during a 0.5s shake and clears it afterwards', () => {
    const camera = new CameraSystem(800, 600);
    camera.startShake(10, 0.5, 20);

    const dt = 0.1;
    for (let elapsed = 0; elapsed + dt < 0.5; elapsed += dt) {
      camera.update(dt);
      const time = elapsed + dt;
      const decay = 1 - time / 0.5;
      const offsetX = Math.sin(time * 20) * 10 * decay;
      const offsetY = Math.cos(time * 20 * 1.3) * 10 * decay;
      expect(offsetX).not.toBe(0);
      expect(offsetY).not.toBe(0);
      // Stationary follow origin is (0, 0); the public position is only the offset.
      expect(camera.position.x).toBeCloseTo(offsetX, 8);
      expect(camera.position.y).toBeCloseTo(offsetY, 8);
      expect(shakeOf(camera)).toBeDefined();
    }

    camera.update(dt);
    expect(shakeOf(camera)).toBeUndefined();
    expect(camera.position).toEqual({ x: 0, y: 0 });
  });

  it('keeps the follow lerp on the unshaken position', () => {
    const shaken = new CameraSystem(800, 600);
    const calm = new CameraSystem(800, 600);
    shaken.moveTo({ x: 240, y: -80 });
    calm.moveTo({ x: 240, y: -80 });
    shaken.startShake(10, 0.5, 20);

    const dt = 0.1;
    for (let elapsed = 0; elapsed + dt < 0.5; elapsed += dt) {
      shaken.update(dt);
      calm.update(dt);
      expect(shaken.position.x).not.toBe(calm.position.x);
      expect(shaken.position.y).not.toBe(calm.position.y);
      expect(shakeOf(shaken)).toBeDefined();
    }

    shaken.update(dt);
    calm.update(dt);
    expect(shakeOf(shaken)).toBeUndefined();
    expect(shaken.position.x).toBeCloseTo(calm.position.x, 6);
    expect(shaken.position.y).toBeCloseTo(calm.position.y, 6);

    step(shaken, 1000);
    step(calm, 1000);
    expect(shaken.position).toEqual({ x: 240, y: -80 });
    expect(calm.position).toEqual({ x: 240, y: -80 });
  });
});

const openFarm = { minX: -100000, minY: -100000, maxX: 100000, maxY: 100000 };

describe('CameraSystem deadzone follow', () => {
  it('stays put while the player is inside the 80×60 deadzone', () => {
    const camera = new CameraSystem(800, 600);
    camera.setPosition({ x: 0, y: 0 });
    // Corner of the box centered on the screen midpoint (half of 80×60).
    camera.followPlayer({ x: 40, y: -30 }, openFarm);

    step(camera, 30);
    expect(camera.position).toEqual({ x: 0, y: 0 });
  });

  it('moves toward the player once they leave the deadzone', () => {
    const camera = new CameraSystem(800, 600);
    camera.setPosition({ x: 0, y: 0 });
    camera.followPlayer({ x: 80, y: -80 }, openFarm);

    camera.update(1 / 60);
    expect(camera.position.x).toBeCloseTo(80 * 0.08, 8);
    expect(camera.position.y).toBeCloseTo(-80 * 0.08, 8);

    const afterOne = { x: camera.position.x, y: camera.position.y };
    camera.update(1 / 60);
    expect(camera.position.x).toBeCloseTo(afterOne.x + (80 - afterOne.x) * 0.08, 8);
    expect(camera.position.y).toBeCloseTo(afterOne.y + (-80 - afterOne.y) * 0.08, 8);
    expect(camera.position.x).toBeGreaterThan(afterOne.x);
    expect(camera.position.y).toBeLessThan(afterOne.y);

    // 25 world units at zoom 2 is 50 px, past the 40 px horizontal edge.
    const zoomed = new CameraSystem(800, 600);
    zoomed.setZoom(2);
    zoomed.setPosition({ x: 0, y: 0 });
    zoomed.followPlayer({ x: 25, y: 0 }, openFarm);
    zoomed.update(1 / 60);
    expect(zoomed.position.x).toBeCloseTo(25 * 0.08, 8);
    expect(zoomed.position.y).toBe(0);
  });

  it('clamps the camera so the view stays inside the farm map', () => {
    const camera = new CameraSystem(800, 600);
    const farm = { minX: 0, minY: 0, maxX: 800, maxY: 600 };
    camera.setZoom(2);
    camera.setPosition({ x: 400, y: 300 });
    camera.followPlayer({ x: 10000, y: -10000 }, farm);

    camera.update(1 / 60);

    // Zoom 2 shows 400×300 world units, so the look-at cannot sit on the map edge.
    expect(camera.position.x).toBeCloseTo(600, 8);
    expect(camera.position.y).toBeCloseTo(150, 8);

    const view = camera.getWorldBounds();
    expect(view.min.x).toBeGreaterThanOrEqual(farm.minX - 1e-6);
    expect(view.max.x).toBeLessThanOrEqual(farm.maxX + 1e-6);
    expect(view.min.y).toBeGreaterThanOrEqual(farm.minY - 1e-6);
    expect(view.max.y).toBeLessThanOrEqual(farm.maxY + 1e-6);

    step(camera, 30);
    expect(camera.position.x).toBeCloseTo(600, 8);
    expect(camera.position.y).toBeCloseTo(150, 8);
  });
});
