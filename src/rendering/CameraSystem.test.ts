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
