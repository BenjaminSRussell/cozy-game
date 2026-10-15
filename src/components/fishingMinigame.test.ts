import { describe, expect, it } from 'vitest';
import {
  FISH_EASE,
  FISH_SIZE,
  FISHING_BAR_HEIGHT,
  FISHING_BOUNCE_DAMPING,
  FISHING_CYLINDER_HEIGHT,
  FISHING_GRAVITY,
  FISHING_PROGRESS_GAIN,
  FISHING_PROGRESS_LOSS,
  FISHING_PROGRESS_START,
  FISHING_THRUST,
  type FishingMinigameState,
  createFishingMinigame,
  fishDisplayName,
  fishingHeadline,
  stepFishingMinigame,
} from './fishingMinigame';

/** Seeded random source (mulberry32), so a session can be replayed exactly. */
function seededRandom(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/** 0.5 makes the Brownian step zero, so the fish target stays where it was put. */
const stillRandom = () => 0.5;

const BAR_MAX_TOP = FISHING_CYLINDER_HEIGHT - FISHING_BAR_HEIGHT;

function gameAt(overrides: Partial<FishingMinigameState> = {}): FishingMinigameState {
  return {
    barTop: 100,
    barVelocity: 0,
    fishTargetY: 150,
    fishY: 150,
    progress: 50,
    status: 'playing',
    ...overrides,
  };
}

describe('tension bar constants', () => {
  it('match the design numbers', () => {
    expect(FISHING_CYLINDER_HEIGHT).toBe(300);
    expect(FISHING_GRAVITY).toBe(0.4);
    expect(FISHING_THRUST).toBe(-0.8);
    expect(FISHING_PROGRESS_GAIN).toBe(0.5);
    expect(FISHING_PROGRESS_LOSS).toBe(0.3);
  });
});

describe('createFishingMinigame', () => {
  it('starts playing with the bar centred and the fish mid-column', () => {
    const start = createFishingMinigame(stillRandom);
    expect(start.status).toBe('playing');
    expect(start.barTop).toBe(BAR_MAX_TOP / 2);
    expect(start.barVelocity).toBe(0);
    expect(start.fishY).toBe(FISHING_CYLINDER_HEIGHT / 2);
    expect(start.progress).toBe(FISHING_PROGRESS_START);
  });

  it('keeps the fish target inside the cylinder', () => {
    for (let seed = 1; seed <= 50; seed += 1) {
      const { fishTargetY } = createFishingMinigame(seededRandom(seed));
      expect(fishTargetY).toBeGreaterThanOrEqual(FISH_SIZE / 2);
      expect(fishTargetY).toBeLessThanOrEqual(FISHING_CYLINDER_HEIGHT - FISH_SIZE / 2);
    }
  });
});

describe('bar physics', () => {
  it('falls under gravity while the pointer is up', () => {
    const next = stepFishingMinigame(gameAt({ barTop: 100 }), false, stillRandom);
    expect(next.barVelocity).toBeCloseTo(FISHING_GRAVITY);
    expect(next.barTop).toBeCloseTo(100 + FISHING_GRAVITY);
  });

  it('rises while held, because thrust outweighs gravity', () => {
    const next = stepFishingMinigame(gameAt({ barTop: 100 }), true, stillRandom);
    expect(next.barVelocity).toBeCloseTo(FISHING_GRAVITY + FISHING_THRUST);
    expect(next.barTop).toBeCloseTo(100 + FISHING_GRAVITY + FISHING_THRUST);
    expect(next.barTop).toBeLessThan(100);
  });

  it('reflects off the bottom bound with damping', () => {
    const next = stepFishingMinigame(gameAt({ barTop: BAR_MAX_TOP, barVelocity: 10 }), false, stillRandom);
    expect(next.barTop).toBe(BAR_MAX_TOP);
    expect(next.barVelocity).toBeCloseTo(-(10 + FISHING_GRAVITY) * FISHING_BOUNCE_DAMPING);
  });

  it('reflects off the top bound with damping', () => {
    const next = stepFishingMinigame(gameAt({ barTop: 0, barVelocity: -10 }), false, stillRandom);
    expect(next.barTop).toBe(0);
    expect(next.barVelocity).toBeCloseTo(-(-10 + FISHING_GRAVITY) * FISHING_BOUNCE_DAMPING);
  });

  it('keeps the bar inside the cylinder through a long random session', () => {
    const random = seededRandom(7);
    let state = createFishingMinigame(random);
    for (let frame = 0; frame < 3000 && state.status === 'playing'; frame += 1) {
      state = stepFishingMinigame(state, random() < 0.5, random);
      expect(state.barTop).toBeGreaterThanOrEqual(0);
      expect(state.barTop).toBeLessThanOrEqual(BAR_MAX_TOP);
    }
  });
});

describe('fish random walk', () => {
  it('eases toward its target instead of snapping to it', () => {
    const next = stepFishingMinigame(gameAt({ fishY: 100, fishTargetY: 200 }), false, stillRandom);
    expect(next.fishY).toBeCloseTo(100 + (200 - 100) * FISH_EASE);
  });

  it('wanders across the column and stays inside the margins', () => {
    const random = seededRandom(42);
    let state = createFishingMinigame(random);
    let lowest = state.fishTargetY;
    let highest = state.fishTargetY;
    for (let frame = 0; frame < 2000; frame += 1) {
      // Hold progress mid-range so the walk runs for the whole window.
      state = { ...stepFishingMinigame(state, false, random), progress: 50, status: 'playing' };
      expect(state.fishTargetY).toBeGreaterThanOrEqual(FISH_SIZE / 2);
      expect(state.fishTargetY).toBeLessThanOrEqual(FISHING_CYLINDER_HEIGHT - FISH_SIZE / 2);
      lowest = Math.min(lowest, state.fishTargetY);
      highest = Math.max(highest, state.fishTargetY);
    }
    expect(highest - lowest).toBeGreaterThan(FISHING_CYLINDER_HEIGHT / 2);
  });
});

describe('catch progress', () => {
  it('gains while the fish sits inside the bar', () => {
    // The bar falls to 100.4, spanning 100.4 to 160.4, and the fish at 150 is inside.
    const next = stepFishingMinigame(gameAt({ barTop: 100, fishY: 150, fishTargetY: 150, progress: 50 }), false, stillRandom);
    expect(next.progress).toBeCloseTo(50 + FISHING_PROGRESS_GAIN);
    expect(next.status).toBe('playing');
  });

  it('loses while the fish is outside the bar', () => {
    const next = stepFishingMinigame(gameAt({ barTop: 100, fishY: 20, fishTargetY: 20, progress: 50 }), false, stillRandom);
    expect(next.progress).toBeCloseTo(50 - FISHING_PROGRESS_LOSS);
    expect(next.status).toBe('playing');
  });

  it('counts the bar edge as inside', () => {
    // After the fall the bar top is 100.4, so a fish exactly there is inside.
    const next = stepFishingMinigame(gameAt({ barTop: 100, fishY: 100.4, fishTargetY: 100.4, progress: 50 }), false, stillRandom);
    expect(next.progress).toBeCloseTo(50 + FISHING_PROGRESS_GAIN);
  });

  it('catches the fish once progress reaches 100', () => {
    const next = stepFishingMinigame(gameAt({ barTop: 100, fishY: 150, fishTargetY: 150, progress: 99.9 }), false, stillRandom);
    expect(next.progress).toBe(100);
    expect(next.status).toBe('caught');
  });

  it('loses the fish once progress reaches 0', () => {
    const next = stepFishingMinigame(gameAt({ barTop: 100, fishY: 20, fishTargetY: 20, progress: 0.1 }), false, stillRandom);
    expect(next.progress).toBe(0);
    expect(next.status).toBe('escaped');
  });

  it('returns a resolved game unchanged', () => {
    const caught = gameAt({ progress: 100, status: 'caught' });
    expect(stepFishingMinigame(caught, true, stillRandom)).toBe(caught);
    const escaped = gameAt({ progress: 0, status: 'escaped' });
    expect(stepFishingMinigame(escaped, false, stillRandom)).toBe(escaped);
  });

  it('can be won by a player who tracks the fish', () => {
    // Lift whenever the fish is above the bar's centre, and let go when it is below.
    for (const seed of [1, 2, 3]) {
      const random = seededRandom(seed);
      let state = createFishingMinigame(random);
      for (let frame = 0; frame < 6000 && state.status === 'playing'; frame += 1) {
        const barCentre = state.barTop + FISHING_BAR_HEIGHT / 2;
        state = stepFishingMinigame(state, state.fishY < barCentre, random);
      }
      expect(state.status).toBe('caught');
    }
  });
});

describe('fishing copy', () => {
  it('names the fish and picks the headline for each status', () => {
    expect(fishDisplayName('bass')).toBe('Bass');
    expect(fishingHeadline('playing', 'Bass')).toBe('Hooked a Bass!');
    expect(fishingHeadline('caught', 'Bass')).toBe('Catch!');
    expect(fishingHeadline('escaped', 'Bass')).toBe('The fish got away...');
  });
});
