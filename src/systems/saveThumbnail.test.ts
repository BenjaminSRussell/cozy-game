import { describe, expect, it } from 'vitest';
import { captureSaveThumbnail, centeredSquare, SAVE_THUMBNAIL_SIZE } from './saveThumbnail';

describe('centeredSquare', () => {
  it('crops the longer side evenly from both ends', () => {
    expect(centeredSquare(800, 500)).toEqual({ sx: 150, sy: 0, side: 500 });
    expect(centeredSquare(300, 600)).toEqual({ sx: 0, sy: 150, side: 300 });
  });

  it('leaves a square source whole', () => {
    expect(centeredSquare(256, 256)).toEqual({ sx: 0, sy: 0, side: 256 });
  });
});

describe('captureSaveThumbnail', () => {
  it('keeps the thumbnail edge at a fixed size', () => {
    expect(SAVE_THUMBNAIL_SIZE).toBe(144);
  });

  it('returns nothing when there is no game canvas to read', () => {
    // The node test environment has no canvas. Native builds take this path too.
    expect(captureSaveThumbnail()).toBeUndefined();
  });
});
