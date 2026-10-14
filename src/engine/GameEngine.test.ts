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
import type { GameCanvas } from './Renderer2D5';

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

  it('clamps a late frame to 0.25s before the fixed step', () => {
    const frames = installFrames();
    vi.spyOn(performance, 'now').mockReturnValue(1_000);
    const engine = new GameEngine();
    engine.start();

    frames.fire(1_000);
    frames.fire(1_050);
    expect(engine.getStats().deltaTime).toBeCloseTo(0.05);

    // Five seconds late, as when a hidden tab becomes visible again.
    frames.fire(6_050);
    expect(engine.getStats().deltaTime).toBeCloseTo(0.25);
    expect(engine.getStats().deltaTime).toBeLessThanOrEqual(0.25);
    expect(engine.getGameTime()).toBeCloseTo(0.3);

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
    // A 1s gap is clamped to 0.25s and consumed in 1/60s steps.
    // Time progression applies 0.1 game minutes per real second.
    expect(after - before).toBeCloseTo(0.025);
    expect(engine.getStats().deltaTime).toBeLessThanOrEqual(0.25);
  });

  it('runs a 0.1s frame as several 60Hz steps and clamps 0.5s to 0.25s', () => {
    const frames = installFrames();
    vi.spyOn(performance, 'now').mockReturnValue(1_000);
    useGameStore.getState().createNewGame('Tester');
    const cropSteps: number[] = [];
    const originalGrowth = useGameStore.getState().updateCropGrowth;
    useGameStore.setState({
      updateCropGrowth: (deltaTime: number) => {
        cropSteps.push(deltaTime);
        originalGrowth(deltaTime);
      },
    });

    const engine = new GameEngine();
    const stepped: number[] = [];
    const internal = engine as unknown as { fixedUpdate(step: number): void };
    const originalStep = internal.fixedUpdate.bind(engine);
    internal.fixedUpdate = (step: number) => {
      stepped.push(step);
      originalStep(step);
    };

    const step = 1 / 60;
    try {
      engine.start();
      frames.fire(1_000);

      frames.fire(1_100);
      expect(stepped.length).toBeGreaterThan(1);
      expect(stepped).toHaveLength(6);
      expect(stepped.every((value) => value === step)).toBe(true);
      expect(stepped).not.toContain(0.1);
      expect(cropSteps).toEqual(stepped);
      expect(engine.getGameTime()).toBeCloseTo(0.1);

      stepped.length = 0;
      cropSteps.length = 0;
      frames.fire(1_600);
      expect(engine.getStats().deltaTime).toBeCloseTo(0.25);
      expect(engine.getStats().deltaTime).toBeLessThanOrEqual(0.25);
      expect(stepped).toHaveLength(15);
      expect(stepped.every((value) => value === step)).toBe(true);
      expect(stepped.reduce((sum, value) => sum + value, 0)).toBeCloseTo(0.25);
      expect(stepped).not.toContain(0.5);
      expect(stepped).not.toContain(0.25);
      expect(cropSteps).toEqual(stepped);
      expect(engine.getGameTime()).toBeCloseTo(0.35);
    } finally {
      engine.stop();
      useGameStore.setState({ updateCropGrowth: originalGrowth });
    }
  });

  it('steps twice at 30 FPS and every other frame at 120 FPS', () => {
    const frames = installFrames();
    vi.spyOn(performance, 'now').mockReturnValue(0);

    const countSteps = (stamps: number[]) => {
      const engine = new GameEngine();
      const counts: number[] = [];
      const internal = engine as unknown as { fixedUpdate(step: number): void };
      const originalStep = internal.fixedUpdate.bind(engine);
      let pending = 0;
      internal.fixedUpdate = (step: number) => {
        pending += 1;
        originalStep(step);
      };
      engine.start();
      for (const stamp of stamps) {
        pending = 0;
        frames.fire(stamp);
        counts.push(pending);
      }
      engine.stop();
      return counts;
    };

    // One 30 FPS frame from a fresh clock is two 1/60 steps.
    expect(countSteps([0, 1000 / 30]).slice(1)).toEqual([2]);
    // 120 FPS frames alternate between zero and one step.
    expect(countSteps([0, 1000 / 120, 2000 / 120, 3000 / 120, 4000 / 120]).slice(1)).toEqual([
      0, 1, 0, 1,
    ]);
  });
});

type ListenerCall = { op: 'add' | 'remove'; type: string; handler: EventListener };

function createListenerCanvas() {
  const attached: { type: string; handler: EventListener }[] = [];
  const calls: ListenerCall[] = [];
  const canvas = {
    addEventListener(type: string, handler: EventListener) {
      calls.push({ op: 'add', type, handler });
      attached.push({ type, handler });
    },
    removeEventListener(type: string, handler: EventListener) {
      calls.push({ op: 'remove', type, handler });
      const index = attached.findIndex((entry) => entry.type === type && entry.handler === handler);
      if (index >= 0) attached.splice(index, 1);
    },
    dispatch(type: string, event: Event) {
      for (const entry of attached.filter((item) => item.type === type)) {
        entry.handler(event);
      }
    },
    count(type: string) {
      return attached.filter((entry) => entry.type === type).length;
    },
  };
  const context = {
    canvas,
    save() {},
    restore() {},
    fillRect() {},
    createLinearGradient() {
      return { addColorStop() {} };
    },
  } as unknown as CanvasRenderingContext2D;
  const gameCanvas: GameCanvas = { context, width: 1, height: 1 };
  return { canvas, gameCanvas, calls };
}

describe('GameEngine canvas listeners', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('removes the same handler references on stop and does not double-fire on the next start', () => {
    installFrames();
    const { canvas, gameCanvas, calls } = createListenerCanvas();
    const engine = new GameEngine(gameCanvas);
    const bound = engine as unknown as {
      _onTouchStart: (e: TouchEvent) => void;
      _onTouchMove: (e: TouchEvent) => void;
      _onTouchEnd: (e: TouchEvent) => void;
      _onMouseDown: (e: MouseEvent) => void;
    };
    const expected: Record<string, EventListener> = {
      touchstart: bound._onTouchStart as EventListener,
      touchmove: bound._onTouchMove as EventListener,
      touchend: bound._onTouchEnd as EventListener,
      mousedown: bound._onMouseDown as EventListener,
    };

    let touchStarts = 0;
    let mouseDowns = 0;
    engine.onInput('probe', (kind: string) => {
      if (kind === 'touchstart') touchStarts += 1;
      if (kind === 'mousedown') mouseDowns += 1;
    });

    engine.start();
    for (const type of Object.keys(expected)) {
      expect(canvas.count(type)).toBe(1);
      const added = calls.filter((call) => call.op === 'add' && call.type === type);
      expect(added).toHaveLength(1);
      expect(added[0].handler).toBe(expected[type]);
    }

    const touch = { touches: [{ clientX: 4, clientY: 8 }] } as unknown as Event;
    const mouse = { clientX: 3, clientY: 5 } as unknown as Event;
    canvas.dispatch('touchstart', touch);
    canvas.dispatch('mousedown', mouse);
    expect(touchStarts).toBe(1);
    expect(mouseDowns).toBe(1);

    engine.stop();
    for (const type of Object.keys(expected)) {
      expect(canvas.count(type)).toBe(0);
      const removed = calls.filter((call) => call.op === 'remove' && call.type === type);
      expect(removed).toHaveLength(1);
      expect(removed[0].handler).toBe(expected[type]);
    }

    engine.start();
    for (const type of Object.keys(expected)) {
      expect(canvas.count(type)).toBe(1);
      const added = calls.filter((call) => call.op === 'add' && call.type === type);
      expect(added).toHaveLength(2);
      expect(added[1].handler).toBe(expected[type]);
    }

    canvas.dispatch('touchstart', touch);
    canvas.dispatch('mousedown', mouse);
    expect(touchStarts).toBe(2);
    expect(mouseDowns).toBe(2);

    engine.start();
    expect(canvas.count('touchstart')).toBe(1);
    expect(calls.filter((call) => call.op === 'add' && call.type === 'touchstart')).toHaveLength(2);

    engine.stop();
  });
});
