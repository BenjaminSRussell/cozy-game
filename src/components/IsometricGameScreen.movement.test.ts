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
  JOYSTICK_INNER_RADIUS,
  JOYSTICK_OUTER_RADIUS,
  JOYSTICK_TAP_SLOP,
  MOVEMENT_KEY_CODES,
  applyJoystickPlacement,
  applyMovementKey,
  canOccupy,
  emptyMovementKeys,
  findTouch,
  idleJoystickGesture,
  joystickFloatPosition,
  joystickPointFromEvent,
  joystickRestPosition,
  joystickTouchEnd,
  joystickTouchMove,
  joystickTouchStart,
  locomotionInput,
  movementBlocks,
  movementInputVector,
  nextPlayerPosition,
  EXHAUSTED_SPEED,
  EXHAUSTED_SPEED_MULTIPLIER,
  playerIsExhausted,
  readJoystick,
  WALK_SPEED,
  settleStoppedVelocity,
  stepPlayerVelocity,
  touchStartsOnLeftHalf,
  type JoystickGesture,
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
    // half of 4.5: targetVx = -2.25, targetVy = 1.125, then 20% of the gap
    expect(EXHAUSTED_SPEED_MULTIPLIER).toBe(0.5);
    expect(EXHAUSTED_SPEED).toBeCloseTo(WALK_SPEED * 0.5);
    expect(exhausted.vx).toBeCloseTo(-0.45);
    expect(exhausted.vy).toBeCloseTo(0.225);
    expect(playerIsExhausted({ exhausted: true })).toBe(true);
    expect(playerIsExhausted({ name: 'Ada' })).toBe(false);
    expect(playerIsExhausted({ stamina: 0 })).toBe(true);
    expect(playerIsExhausted({ stamina: 0, isExhausted: false })).toBe(true);
    expect(playerIsExhausted({ isExhausted: true, stamina: 40 })).toBe(true);
    expect(playerIsExhausted({ stamina: 1 })).toBe(false);
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

describe('floating touch joystick', () => {
  it('uses a 60px outer ring and a 25px nub parked at the bottom-left', () => {
    expect(JOYSTICK_OUTER_RADIUS).toBe(60);
    expect(JOYSTICK_INNER_RADIUS).toBe(25);
    expect(joystickRestPosition()).toEqual({ left: 16, bottom: 16 });
    expect(joystickFloatPosition(40, 500)).toEqual({ left: -20, top: 440 });

    const ring = { style: { left: '', top: '', bottom: '' } };
    const nub = { style: { transform: '' } };
    const resting = idleJoystickGesture();
    applyJoystickPlacement(ring, nub, resting);
    expect(ring.style).toEqual({ left: '16px', top: 'auto', bottom: '16px' });
    expect(nub.style.transform).toBe('translate(0px, 0px)');

    const floating: JoystickGesture = {
      ...resting,
      activeId: 1,
      originX: 40,
      originY: 500,
      dx: 0,
      dy: 1,
      magnitude: 1,
      angle: Math.PI / 2,
      nubX: 0,
      nubY: -60,
      dragged: true,
    };
    applyJoystickPlacement(ring, nub, floating);
    expect(ring.style).toEqual({ left: '-20px', top: '440px', bottom: 'auto' });
    expect(nub.style.transform).toBe('translate(0px, -60px)');
  });

  it('normalizes angle and magnitude into a stick vector no longer than 1', () => {
    const right = readJoystick(100, 100, 160, 100);
    expect(right.magnitude).toBeCloseTo(1);
    expect(right.angle).toBeCloseTo(0);
    expect(right.dx).toBeCloseTo(1);
    expect(right.dy).toBeCloseTo(0);
    expect(right.nubX).toBeCloseTo(60);
    expect(right.nubY).toBeCloseTo(0);

    const up = readJoystick(10, 80, 10, 20);
    expect(up.magnitude).toBeCloseTo(1);
    expect(up.angle).toBeCloseTo(Math.PI / 2);
    expect(up.dx).toBeCloseTo(0);
    expect(up.dy).toBeCloseTo(1);
    expect(up.nubY).toBeCloseTo(-60);

    const downRight = readJoystick(0, 0, 60, 60);
    expect(downRight.magnitude).toBeCloseTo(1);
    expect(Math.hypot(downRight.dx, downRight.dy)).toBeCloseTo(1);
    expect(downRight.dx).toBeCloseTo(Math.SQRT1_2);
    expect(downRight.dy).toBeCloseTo(-Math.SQRT1_2);
    expect(Math.hypot(downRight.nubX, downRight.nubY)).toBeCloseTo(JOYSTICK_OUTER_RADIUS);

    const halfUp = readJoystick(0, 0, 0, -30);
    expect(halfUp.magnitude).toBeCloseTo(0.5);
    expect(halfUp.dy).toBeCloseTo(0.5);
    expect(halfUp.dx).toBeCloseTo(0);
    expect(halfUp.nubY).toBeCloseTo(-30);

    const pastTheRing = readJoystick(0, 0, 300, 0);
    expect(pastTheRing.magnitude).toBe(1);
    expect(pastTheRing.dx).toBeCloseTo(1);
    expect(pastTheRing.nubX).toBeCloseTo(JOYSTICK_OUTER_RADIUS);

    expect(readJoystick(5, 5, 5, 5)).toEqual({
      dx: 0, dy: 0, magnitude: 0, angle: 0, nubX: 0, nubY: 0,
    });
    expect(readJoystick(0, 0, 10, 0, 0).magnitude).toBe(0);
  });

  it('starts only on the left half, follows that finger, and clears on release', () => {
    expect(touchStartsOnLeftHalf(0, 800)).toBe(true);
    expect(touchStartsOnLeftHalf(399.9, 800)).toBe(true);
    expect(touchStartsOnLeftHalf(400, 800)).toBe(false);
    expect(touchStartsOnLeftHalf(10, 0)).toBe(false);

    let gesture = joystickTouchStart(
      idleJoystickGesture(),
      { x: 700, y: 400, identifier: 1 },
      800,
    );
    expect(gesture.activeId).toBeNull();

    gesture = joystickTouchStart(gesture, { x: 40, y: 500, identifier: 2 }, 800);
    expect(gesture).toMatchObject({ activeId: 2, originX: 40, originY: 500, dx: 0, dy: 0 });
    const held = gesture;

    expect(joystickTouchStart(held, { x: 30, y: 30, identifier: 3 }, 800)).toBe(held);

    const nudge = joystickTouchMove(held, { x: 40 + JOYSTICK_TAP_SLOP, y: 500, identifier: 2 });
    expect(nudge.dragged).toBe(false);
    expect(nudge.dx).toBeCloseTo(JOYSTICK_TAP_SLOP / JOYSTICK_OUTER_RADIUS);

    gesture = joystickTouchMove(nudge, { x: 40, y: 440, identifier: 2 });
    expect(gesture.dragged).toBe(true);
    expect(gesture.dy).toBeCloseTo(1);
    expect(gesture.dx).toBeCloseTo(0);
    expect(gesture.nubY).toBeCloseTo(-60);

    expect(joystickTouchMove(gesture, { x: 10, y: 10, identifier: 9 })).toBe(gesture);
    expect(joystickTouchEnd(gesture, 9)).toBe(gesture);

    gesture = joystickTouchEnd(gesture, 2);
    expect(gesture).toEqual(idleJoystickGesture());
  });

  it('reads client or page coordinates and keeps keyboard movement when the stick is centered', () => {
    expect(findTouch([{ pageX: 12, pageY: 34, identifier: 3 }])).toEqual({
      x: 12, y: 34, identifier: 3,
    });
    expect(findTouch([
      { clientX: 1, clientY: 1, identifier: 1 },
      { clientX: 8, clientY: 9, identifier: 4 },
    ], 4)).toEqual({ x: 8, y: 9, identifier: 4 });
    expect(findTouch([], 1)).toBeNull();
    expect(joystickPointFromEvent({
      nativeEvent: { pageX: 15, pageY: 25, identifier: 6 },
    }, 'touches')).toEqual({ x: 15, y: 25, identifier: 6 });
    expect(joystickPointFromEvent({
      changedTouches: [{ clientX: 4, clientY: 5, identifier: 2 }],
    }, 'changedTouches', 2)?.x).toBe(4);

    expect(locomotionInput(0, 1, { dx: 0, dy: 0 })).toEqual({ inputX: 0, inputY: 1 });
    expect(locomotionInput(-1, 1, { dx: 0, dy: 0 })).toEqual({ inputX: -1, inputY: 1 });

    const stick = readJoystick(100, 100, 160, 100);
    expect(locomotionInput(1, 0, stick)).toEqual({ inputX: stick.dx, inputY: stick.dy });

    const walking: PlayerVelocity = { vx: 0, vy: 0 };
    const fromKeys: PlayerVelocity = { vx: 0, vy: 0 };
    const stickInput = locomotionInput(0, 0, readJoystick(0, 0, 30, 0));
    stepPlayerVelocity(walking, stickInput.inputX, stickInput.inputY);
    stepPlayerVelocity(fromKeys, 1, 0);
    expect(walking.vx).toBeCloseTo(0.45);
    expect(walking.vy).toBeCloseTo(0.225);
    expect(walking.vx).toBeLessThan(fromKeys.vx);

    const keyboard: PlayerVelocity = { vx: 0, vy: 0 };
    const keysOnly = locomotionInput(1, 0, { dx: 0, dy: 0 });
    stepPlayerVelocity(keyboard, keysOnly.inputX, keysOnly.inputY);
    expect(keyboard.vx).toBeCloseTo(0.9);
    expect(keyboard.vy).toBeCloseTo(0.45);
  });
});

describe('collision for trees and non-walkable soil tiles', () => {
  it('blocks the cell a tree stands on and leaves its neighbours open', () => {
    const blocks = movementBlocks({ woodSources: [{ position: { x: 6, y: 6 } }] });

    expect(canOccupy(6.5, 6.5, blocks, MAP)).toBe(false);
    expect(canOccupy(7.5, 6.5, blocks, MAP)).toBe(true);
    expect(canOccupy(5.5, 6.5, blocks, MAP)).toBe(true);
  });

  it('blocks only soil tiles marked walkable: false, the same rule movePlayer applies', () => {
    const blocks = movementBlocks({
      tiles: [
        { position: { x: 8, y: 2 }, walkable: false },
        { position: { x: 9, y: 2 } },
        { position: { x: 10, y: 2 }, walkable: true },
      ],
    });

    expect(canOccupy(8.5, 2.5, blocks, MAP)).toBe(false);
    expect(canOccupy(9.5, 2.5, blocks, MAP)).toBe(true);
    expect(canOccupy(10.5, 2.5, blocks, MAP)).toBe(true);
  });

  it('slides along a tree instead of walking through it', () => {
    const blocks = movementBlocks({ woodSources: [{ position: { x: 11, y: 10 } }] });

    // +x would enter the tree cell (11, 10), so x holds while y moves into the free row above.
    const next = nextPlayerPosition({ x: 10.5, y: 10.5, z: 1 }, { vx: 1, vy: 1 }, 0.5, blocks, MAP);
    expect(next).toEqual({ x: 10.5, y: 11, z: 1 });
  });
});
