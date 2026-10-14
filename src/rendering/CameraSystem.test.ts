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
