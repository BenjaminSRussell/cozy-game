import { describe, expect, it } from 'vitest';
import { RenderPipeline } from './RenderPipeline';
import { CHARACTER_FACING_ROW, SpriteRenderer } from './SpriteRenderer';

function renderer(): SpriteRenderer {
  return new SpriteRenderer({} as RenderPipeline);
}

describe('SpriteRenderer character sheet', () => {
  it('slices four facing rows and four walk columns', () => {
    expect(CHARACTER_FACING_ROW).toEqual({ south: 0, west: 1, east: 2, north: 3 });

    const cells = renderer().sliceCharacterSheet(80, 160);

    expect(cells).toHaveLength(16);
    expect(cells.map(cell => cell.row)).toEqual([
      0, 0, 0, 0,
      1, 1, 1, 1,
      2, 2, 2, 2,
      3, 3, 3, 3,
    ]);
    expect(cells.map(cell => cell.column)).toEqual([
      0, 1, 2, 3,
      0, 1, 2, 3,
      0, 1, 2, 3,
      0, 1, 2, 3,
    ]);
    expect(cells.map(cell => cell.direction)).toEqual([
      'south', 'south', 'south', 'south',
      'west', 'west', 'west', 'west',
      'east', 'east', 'east', 'east',
      'north', 'north', 'north', 'north',
    ]);
    expect(cells[0].sourceRect).toEqual({ x: 0, y: 0, width: 20, height: 40 });
    expect(cells[5].sourceRect).toEqual({ x: 20, y: 40, width: 20, height: 40 });
    expect(cells[15].sourceRect).toEqual({ x: 60, y: 120, width: 20, height: 40 });
  });
});

describe('SpriteRenderer walk cycle', () => {
  it('cycles frames 0, 1, 2, 3, 0 every 0.15s while moving', () => {
    const sprites = renderer();
    let state = sprites.createWalkCycle('north');

    expect(state).toEqual({
      direction: 'north',
      frameIndex: 0,
      elapsedTime: 0,
      frameDuration: 0.15,
      isMoving: false,
    });

    const frames: number[] = [];
    state = sprites.updateWalkCycle(state, 0, { isMoving: true, direction: 'east' });
    frames.push(state.frameIndex);
    for (let step = 0; step < 4; step++) {
      state = sprites.updateWalkCycle(state, 0.15);
      frames.push(state.frameIndex);
    }

    expect(frames).toEqual([0, 1, 2, 3, 0]);
    expect(state.direction).toBe('east');
    expect(state.isMoving).toBe(true);
    expect(state.frameDuration).toBe(0.15);
    expect(state.elapsedTime).toBe(0);

    state = sprites.updateWalkCycle(state, 0.15);
    expect(state.frameIndex).toBe(1);
    expect(sprites.characterFrameRect(state, 80, 160)).toEqual({
      x: 20,
      y: 80,
      width: 20,
      height: 40,
    });
  });

  it('returns to frame 0 when movement stops and keeps the facing direction', () => {
    const sprites = renderer();
    let state = sprites.createWalkCycle('west');
    state = sprites.updateWalkCycle(state, 0.3, { isMoving: true });

    expect(state.frameIndex).toBe(2);
    expect(state.direction).toBe('west');

    state = sprites.updateWalkCycle(state, 1, { isMoving: false, direction: 'north' });

    expect(state.frameIndex).toBe(0);
    expect(state.elapsedTime).toBe(0);
    expect(state.isMoving).toBe(false);
    expect(state.direction).toBe('west');
    expect(sprites.characterFrameRect(state, 80, 160)).toEqual({
      x: 0,
      y: 40,
      width: 20,
      height: 40,
    });

    state = sprites.updateWalkCycle(state, 0.6);
    expect(state.frameIndex).toBe(0);
    expect(state.direction).toBe('west');
  });

  it('advances multiple frames in one moving update and honors frameDuration', () => {
    const sprites = renderer();
    let state = sprites.createWalkCycle('south');
    state = sprites.updateWalkCycle(state, 0.6, { isMoving: true });
    expect(state.frameIndex).toBe(0);
    expect(state.elapsedTime).toBe(0);

    state = sprites.updateWalkCycle(state, 0.75);
    expect(state.frameIndex).toBe(1);

    state = { ...state, frameDuration: 0.3, elapsedTime: 0, frameIndex: 0 };
    state = sprites.updateWalkCycle(state, 0.3);
    expect(state.frameIndex).toBe(1);
    expect(state.direction).toBe('south');
  });
});
