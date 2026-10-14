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
  STAMINA_GAUGE_HEIGHT,
  STAMINA_GAUGE_RADIUS,
  STAMINA_GAUGE_WIDTH,
  STAMINA_PULSE_ANIMATION,
  STAMINA_PULSE_CLASS,
  STAMINA_PULSE_CSS,
  staminaGaugeView,
} from './IsometricGameScreen';

describe('stamina gauge', () => {
  it('fills by current/max and shifts emerald, amber, then crimson with a pulse below 20%', () => {
    expect(STAMINA_GAUGE_WIDTH).toBe(24);
    expect(STAMINA_GAUGE_HEIGHT).toBe(180);
    expect(STAMINA_GAUGE_RADIUS).toBe(12);
    expect(STAMINA_PULSE_CSS).toContain(`.${STAMINA_PULSE_CLASS}`);
    expect(STAMINA_PULSE_CSS).toContain('@keyframes stamina-gauge-pulse');

    const full = staminaGaugeView(100, 100);
    expect(full.width).toBe(24);
    expect(full.height).toBe(180);
    expect(full.borderRadius).toBe(12);
    expect(full.fillPercent).toBe(100);
    expect(full.fillHeight).toBe('100%');
    expect(full.color).toBe('#10B981');
    expect(full.pulse).toBe(false);
    expect(full.pulseClass).toBe('');
    expect(full.pulseStyle).toEqual({});
    expect(full.label).toBe('100 / 100');

    const justAbove = staminaGaugeView(50.001, 100);
    expect(justAbove.fillPercent).toBeCloseTo(50.001);
    expect(justAbove.fillHeight).toBe('50.001%');
    expect(justAbove.color).toBe('#10B981');
    expect(justAbove.pulseClass).toBe('');
    expect(justAbove.pulseStyle).toEqual({});

    const half = staminaGaugeView(50, 100);
    expect(half.fillPercent).toBe(50);
    expect(half.fillHeight).toBe('50%');
    expect(half.color).toBe('#F59E0B');
    expect(half.pulse).toBe(false);
    expect(half.pulseClass).toBe('');
    expect(half.label).toBe('50 / 100');

    const atTwenty = staminaGaugeView(10, 50);
    expect(atTwenty.fillPercent).toBe(20);
    expect(atTwenty.fillHeight).toBe('20%');
    expect(atTwenty.color).toBe('#F59E0B');
    expect(atTwenty.pulse).toBe(false);
    expect(atTwenty.pulseClass).toBe('');
    expect(atTwenty.pulseStyle).not.toHaveProperty('animation');
    expect(atTwenty.label).toBe('10 / 50');

    const low = staminaGaugeView(19.6, 100);
    expect(low.fillPercent).toBeCloseTo(19.6);
    expect(low.fillHeight).toBe('19.6%');
    expect(low.color).toBe('#EF4444');
    expect(low.pulse).toBe(true);
    expect(low.pulseClass).toBe(STAMINA_PULSE_CLASS);
    expect(low.pulseStyle).toEqual({ animation: STAMINA_PULSE_ANIMATION });
    expect(low.label).toBe('20 / 100');

    const empty = staminaGaugeView(0, 80);
    expect(empty.fillPercent).toBe(0);
    expect(empty.fillHeight).toBe('0%');
    expect(empty.color).toBe('#EF4444');
    expect(empty.pulseClass).toBe('stamina-gauge-pulse');
    expect(String(empty.pulseStyle.animation)).toContain('stamina-gauge-pulse');
    expect(empty.label).toBe('0 / 80');

    const rounded = staminaGaugeView(10.6, 40);
    expect(rounded.fillPercent).toBeCloseTo(26.5);
    expect(rounded.color).toBe('#F59E0B');
    expect(rounded.label).toBe('11 / 40');
    expect(rounded.pulse).toBe(false);
  });
});
