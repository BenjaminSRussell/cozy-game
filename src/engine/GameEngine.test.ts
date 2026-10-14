import { afterEach, describe, expect, it, vi } from 'vitest';

// The store persists through localStorage. Node's built-in one has no methods
// unless --localstorage-file is set, so install a memory shim before import.
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

import { useGameStore } from '../store/gameStore';
import { GameEngine } from './GameEngine';

function installFrames() {
  let pending: ((timestamp: number) => void) | null = null;
  let nextId = 1;
  const cancel = vi.fn();
  vi.stubGlobal('requestAnimationFrame', (callback: (timestamp: number) => void) => {
    pending = callback;
    const id = nextId;
    nextId += 1;
    return id;
  });
  vi.stubGlobal('cancelAnimationFrame', cancel);
  return {
    cancel,
    fire(timestamp: number) {
      const callback = pending;
      pending = null;
      if (!callback) throw new Error('no animation frame scheduled');
      callback(timestamp);
    },
    scheduled() {
      return pending !== null;
    },
  };
}

describe('GameEngine requestAnimationFrame loop', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('never lets deltaTime exceed 0.1s', () => {
    const frames = installFrames();
    vi.spyOn(performance, 'now').mockReturnValue(1_000);
    const engine = new GameEngine();
    engine.start();

    frames.fire(1_000);
    frames.fire(1_050);
    expect(engine.getStats().deltaTime).toBeCloseTo(0.05);

    // Five seconds late, as when a hidden tab becomes visible again.
    frames.fire(6_050);
    expect(engine.getStats().deltaTime).toBeCloseTo(0.1);
    expect(engine.getStats().deltaTime).toBeLessThanOrEqual(0.1);
    expect(engine.getGameTime()).toBeCloseTo(0.15);

    engine.stop();
  });

  it('cancels rafId on stop and ignores a frame that still runs', () => {
    const frames = installFrames();
    vi.spyOn(performance, 'now').mockReturnValue(1_000);
    const engine = new GameEngine();
    engine.start();

    const running = engine as unknown as { rafId: number };
    expect(running.rafId).toBe(1);

    engine.stop();
    expect(frames.cancel).toHaveBeenCalledWith(1);
    expect(running.rafId).toBe(0);

    frames.fire(20_000);
    expect(engine.getStats().deltaTime).toBe(0);
    expect(frames.scheduled()).toBe(false);
  });

  it('advances game time from animation frames instead of a React timer', () => {
    const frames = installFrames();
    vi.spyOn(performance, 'now').mockReturnValue(5_000);
    useGameStore.getState().createNewGame('Tester');
    const before = useGameStore.getState().world?.dayTime ?? 0;

    const engine = new GameEngine();
    engine.start();
    frames.fire(5_000);
    frames.fire(6_000);
    engine.stop();

    const after = useGameStore.getState().world?.dayTime ?? 0;
    // A 1s gap is clamped to 0.1s. update() applies 0.1 game minutes per real second.
    expect(after - before).toBeCloseTo(0.01);
    expect(engine.getStats().deltaTime).toBeLessThanOrEqual(0.1);
  });
});
