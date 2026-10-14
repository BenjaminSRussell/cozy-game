import { describe, expect, it, vi } from 'vitest';

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

vi.mock('react-native', () => ({
  View: () => null,
  Text: () => null,
  TouchableOpacity: () => null,
  Pressable: () => null,
  ScrollView: () => null,
  Image: () => null,
  StyleSheet: { create: (styles: unknown) => styles },
  Dimensions: { get: () => ({ width: 800, height: 600 }) },
  Alert: { alert: () => undefined },
  Platform: { OS: 'web' },
  Animated: {
    View: () => null,
    Value: class AnimatedValue {
      constructor(public value: number) {}
    },
    spring: () => ({ start() {} }),
  },
}));

import {
  MOVEMENT_KEY_CODES,
  applyMovementKey,
  canOccupy,
  emptyMovementKeys,
  movementBlocks,
  movementInputVector,
  nextPlayerPosition,
  playerIsExhausted,
  settleStoppedVelocity,
  stepPlayerVelocity,
  type MovementKeyState,
  type PlayerVelocity,
} from './IsometricGameScreen';

const MAP = { minX: 0, minY: 0, maxX: 100, maxY: 100 };

function hold(codes: string[]): MovementKeyState {
  const keys = emptyMovementKeys();
  for (const code of codes) applyMovementKey(keys, code, true);
  return keys;
}

describe('WASD and arrow movement', () => {
  it('listens for WASD and the four arrow codes, and ignores every other key', () => {
    expect([...MOVEMENT_KEY_CODES]).toEqual([
      'KeyW',
      'KeyA',
      'KeyS',
      'KeyD',
      'ArrowUp',
      'ArrowDown',
      'ArrowLeft',
      'ArrowRight',
    ]);

    const keys = emptyMovementKeys();
    expect(applyMovementKey(keys, 'KeyE', true)).toBe(false);
    expect(applyMovementKey(keys, 'Space', true)).toBe(false);
    expect(keys).toEqual(emptyMovementKeys());

    expect(applyMovementKey(keys, 'KeyW', true)).toBe(true);
    expect(applyMovementKey(keys, 'ArrowLeft', true)).toBe(true);
    expect(movementInputVector(keys)).toEqual({ inputX: -1, inputY: 1 });
    expect(applyMovementKey(keys, 'KeyW', false)).toBe(true);
    expect(movementInputVector(keys)).toEqual({ inputX: -1, inputY: 0 });
  });

  it('builds a raw vector where opposing keys cancel and WASD matches the arrows', () => {
    expect(movementInputVector(hold(['KeyD']))).toEqual({ inputX: 1, inputY: 0 });
    expect(movementInputVector(hold(['ArrowRight']))).toEqual({ inputX: 1, inputY: 0 });
    expect(movementInputVector(hold(['KeyA', 'ArrowLeft']))).toEqual({ inputX: -1, inputY: 0 });
    expect(movementInputVector(hold(['KeyW', 'ArrowUp']))).toEqual({ inputX: 0, inputY: 1 });
    expect(movementInputVector(hold(['KeyS']))).toEqual({ inputX: 0, inputY: -1 });
    expect(movementInputVector(hold(['ArrowDown']))).toEqual({ inputX: 0, inputY: -1 });
    expect(movementInputVector(hold(['KeyW', 'KeyS', 'KeyA', 'KeyD']))).toEqual({ inputX: 0, inputY: 0 });
    expect(movementInputVector(hold(['KeyW', 'KeyD']))).toEqual({ inputX: 1, inputY: 1 });
  });

  it('lerps toward the isometric target at walk speed and at the exhausted speed', () => {
    const walking: PlayerVelocity = { vx: 0, vy: 0 };
    stepPlayerVelocity(walking, 1, 0);
    // targetVx = (1 - 0) * 4.5, targetVy = (1 + 0) * 2.25, then 20% of the gap
    expect(walking.vx).toBeCloseTo(0.9);
    expect(walking.vy).toBeCloseTo(0.45);

    stepPlayerVelocity(walking, 1, 0);
    expect(walking.vx).toBeCloseTo(1.62);
    expect(walking.vy).toBeCloseTo(0.81);

    const exhausted: PlayerVelocity = { vx: 0, vy: 0, exhausted: true };
    stepPlayerVelocity(exhausted, 0, 1);
    // speed 2: targetVx = -2, targetVy = 1
    expect(exhausted.vx).toBeCloseTo(-0.4);
    expect(exhausted.vy).toBeCloseTo(0.2);
    expect(playerIsExhausted({ exhausted: true })).toBe(true);
    expect(playerIsExhausted({ name: 'Ada' })).toBe(false);
  });

  it('decelerates to a full stop after the keys are released', () => {
    const velocity: PlayerVelocity = { vx: 1.62, vy: 0.81 };
    const before = Math.hypot(velocity.vx, velocity.vy);
    stepPlayerVelocity(velocity, 0, 0);
    expect(velocity.vx).toBeCloseTo(1.296);
    expect(velocity.vy).toBeCloseTo(0.648);
    expect(Math.hypot(velocity.vx, velocity.vy)).toBeLessThan(before);

    for (let step = 0; step < 40; step += 1) {
      stepPlayerVelocity(velocity, 0, 0);
    }
    settleStoppedVelocity(velocity, false);
    expect(velocity.vx).toBe(0);
    expect(velocity.vy).toBe(0);

    const stillHeld: PlayerVelocity = { vx: 0.001, vy: 0 };
    settleStoppedVelocity(stillHeld, true);
    expect(stillHeld.vx).toBeCloseTo(0.001);
  });

  it('refuses a step into a building or off the map and still slides along the free axis', () => {
    const blocks = movementBlocks({
      buildings: [{ position: { x: 11, y: 10 }, dimensions: { x: 2, y: 1 } }],
      homeBuildings: [{ position: { x: 4, y: 4 } }],
      damBuildings: [{ position: { x: 20, y: 20 }, size: { x: 2, y: 2 } }],
    });

    expect(canOccupy(11, 10, blocks, MAP)).toBe(false);
    expect(canOccupy(12.2, 10.9, blocks, MAP)).toBe(false);
    expect(canOccupy(13, 10, blocks, MAP)).toBe(true);
    expect(canOccupy(4.1, 4.1, blocks, MAP)).toBe(false);
    expect(canOccupy(21, 21, blocks, MAP)).toBe(false);
    expect(canOccupy(-0.1, 10, blocks, MAP)).toBe(false);
    expect(canOccupy(100, 10, blocks, MAP)).toBe(false);

    const intoWall = nextPlayerPosition(
      { x: 10, y: 10, z: 1 },
      { vx: 1, vy: 1 },
      1,
      blocks,
      MAP,
    );
    expect(intoWall).toEqual({ x: 10, y: 11, z: 1 });

    const open = nextPlayerPosition(
      { x: 10, y: 12, z: 1 },
      { vx: 0.9, vy: 0.45 },
      1,
      blocks,
      MAP,
    );
    expect(open).toEqual({ x: 10.9, y: 12.45, z: 1 });

    const offMap = nextPlayerPosition(
      { x: 99.5, y: 50, z: 1 },
      { vx: 4.5, vy: 0 },
      1,
      [],
      MAP,
    );
    expect(offMap.x).toBe(99.5);
    expect(offMap.y).toBe(50);
  });
});
