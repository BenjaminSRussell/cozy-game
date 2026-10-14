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

import { TimeSystem, type DailyResetSystem, type GameTime } from '../systems/TimeSystem';
import { clockHudView } from './IsometricGameScreen';

function existingClock(totalMinutes: number): string {
  const system = new TimeSystem();
  const time: GameTime = {
    realTime: 0,
    gameTime: totalMinutes,
    day: 1,
    season: 'spring',
    year: 1,
    isNewDay: false,
  };
  const dailyReset: DailyResetSystem = {
    lastReset: 0,
    rockResources: [],
    fossilSpots: [],
    shopInventory: [],
    villagerDialogues: [],
  };
  system.load({ time, dailyReset });
  return system.getTimeString();
}

describe('in-game clock HUD', () => {
  it('renders a known season badge and gold, and matches the existing clock', () => {
    const dayTime = 360;
    const hud = clockHudView({
      season: 'spring',
      dayTime,
      day: 14,
      coins: 2450,
    });

    expect(hud.weekdayDate).toBe('Mon. 14');
    expect(hud.seasonBadge).toBe('🌸 Spring');
    expect(hud.gold).toBe('💰 2,450g');
    expect(hud.clock).toBe(existingClock(dayTime));
    expect(hud.clock).toBe('6:00 AM');

    expect(clockHudView({ season: 'summer', dayTime, day: 1, coins: 0 }).seasonBadge).toBe('☀️ Summer');
    expect(clockHudView({ season: 'autumn', dayTime, day: 2, coins: 0 }).seasonBadge).toBe('🍂 Fall');
    expect(clockHudView({ season: 'winter', dayTime, day: 3, coins: 0 }).seasonBadge).toBe('❄️ Winter');
    expect(clockHudView({ season: 'spring', dayTime: 839, day: 0, coins: 12 }).clock).toBe(existingClock(839));
    expect(clockHudView({ season: 'spring', dayTime: 840, day: 7, coins: 12 }).clock).toBe(existingClock(840));
    expect(clockHudView({ season: 'spring', dayTime: 840, day: 7, coins: 12 }).weekdayDate).toBe('Mon. 7');
  });
});
