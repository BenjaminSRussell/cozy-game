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

import { theme } from '../styles/theme';
import {
  HOTBAR_KEY_CODES,
  HOTBAR_SELECTED_BORDER,
  HOTBAR_SLOT_COUNT,
  HOTBAR_SLOT_GAP,
  HOTBAR_SLOT_SIZE,
  JOYSTICK_OUTER_RADIUS,
  MOVEMENT_KEY_CODES,
  STAMINA_GAUGE_HEIGHT,
  STAMINA_GAUGE_WIDTH,
  clockHudView,
  cycleHotbarSlot,
  formatDayTime,
  hotbarItemIcon,
  hotbarItemsFromPlayer,
  hotbarLayout,
  hotbarMeter,
  hotbarSlotFromKey,
  hotbarWheelDelta,
  selectHotbarSlot,
} from './IsometricGameScreen';

describe('bottom hotbar', () => {
  it('keeps the clock, stamina gauge, WASD, arrows, and joystick', () => {
    expect(MOVEMENT_KEY_CODES).toEqual([
      'KeyW',
      'KeyA',
      'KeyS',
      'KeyD',
      'ArrowUp',
      'ArrowDown',
      'ArrowLeft',
      'ArrowRight',
    ]);
    expect(JOYSTICK_OUTER_RADIUS).toBe(60);
    expect(STAMINA_GAUGE_WIDTH).toBe(24);
    expect(STAMINA_GAUGE_HEIGHT).toBe(180);
    expect(formatDayTime(360)).toBe('6:00 AM');
    expect(clockHudView({ season: 'spring', dayTime: 360, day: 1, coins: 12 }).clock).toBe('6:00 AM');
  });

  it('anchors 10 slots of 48px with an 8px gap and a #F59E0B selected border', () => {
    expect(HOTBAR_SLOT_COUNT).toBe(10);
    expect(HOTBAR_SLOT_SIZE).toBe(48);
    expect(HOTBAR_SLOT_GAP).toBe(8);
    expect(theme.colors.hotbarSelected).toBe('#F59E0B');
    expect(HOTBAR_SELECTED_BORDER).toBe('#F59E0B');

    const layout = hotbarLayout([], 0);
    expect(layout.anchor).toBe('bottom');
    expect(layout.slotCount).toBe(10);
    expect(layout.slotSize).toBe(48);
    expect(layout.gap).toBe(8);
    expect(layout.selectedBorder).toBe('#F59E0B');
    expect(layout.slots).toHaveLength(10);
    expect(layout.slots.map((slot) => slot.keyLabel)).toEqual(['1', '2', '3', '4', '5', '6', '7', '8', '9', '0']);
    expect(layout.slots.every((slot) => slot.size === 48 && slot.quantityCorner === 'bottom-right')).toBe(true);
    expect(layout.slots[0].selected).toBe(true);
    expect(layout.slots[0].borderColor).toBe('#F59E0B');
    expect(layout.slots[1].selected).toBe(false);
    expect(layout.slots[1].borderColor).not.toBe('#F59E0B');
    expect(layout.slots.every((slot) => slot.empty && slot.icon === null && slot.meter === null)).toBe(true);
  });

  it('binds 1-9 and 0 to slots 0-9 without taking movement keys', () => {
    expect(HOTBAR_KEY_CODES.map((code) => hotbarSlotFromKey(code))).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(hotbarSlotFromKey('Digit0')).toBe(9);
    expect(hotbarSlotFromKey('Numpad5')).toBe(4);
    expect(hotbarSlotFromKey('Numpad0')).toBe(9);
    expect(hotbarSlotFromKey('', '1')).toBe(0);
    expect(hotbarSlotFromKey('', '0')).toBe(9);
    for (const code of MOVEMENT_KEY_CODES) {
      expect(hotbarSlotFromKey(code)).toBeNull();
    }
    expect(selectHotbarSlot(4)).toBe(4);
    expect(selectHotbarSlot(-3)).toBe(0);
    expect(selectHotbarSlot(20)).toBe(9);
    expect(selectHotbarSlot(Number.NaN)).toBe(0);
  });

  it('cycles one slot per wheel notch and wraps at both ends', () => {
    expect(hotbarWheelDelta(0)).toBe(0);
    expect(hotbarWheelDelta(120)).toBe(1);
    expect(hotbarWheelDelta(-40)).toBe(-1);
    expect(cycleHotbarSlot(0, 1)).toBe(1);
    expect(cycleHotbarSlot(0, 120)).toBe(1);
    expect(cycleHotbarSlot(9, hotbarWheelDelta(100))).toBe(0);
    expect(cycleHotbarSlot(0, hotbarWheelDelta(-100))).toBe(9);
    expect(cycleHotbarSlot(3, -1)).toBe(2);

    let slot = 2;
    for (let step = 0; step < HOTBAR_SLOT_COUNT; step += 1) {
      slot = cycleHotbarSlot(slot, hotbarWheelDelta(100));
    }
    expect(slot).toBe(2);
  });

  it('shows the icon, bottom-right stack count, and a durability or water bar only when present', () => {
    const layout = hotbarLayout([
      { id: 'hay', name: 'Hay', quantity: 50, spriteId: 'hay' },
      {
        id: 'hoe',
        name: 'Wood Hoe',
        quantity: 1,
        spriteId: 'tool_hoe_wood',
        toolType: 'hoe',
        durability: 25,
        maxDurability: 50,
      },
      {
        id: 'can',
        name: 'Watering Can',
        quantity: 1,
        toolType: 'watering_can',
        durability: 40,
        maxDurability: 80,
      },
      { id: 'seeds', name: 'Wet Seeds', quantity: 3, spriteId: '🌱', waterLevel: 50 },
      {
        id: 'pick',
        name: 'Pick',
        quantity: 1,
        toolType: 'pickaxe',
        durability: 100,
        maxDurability: 100,
      },
      { id: 'axe', name: 'Axe', toolType: 'axe', durability: 0, maxDurability: 40, quantity: 2 },
      { id: 'mystery', name: 'Mystery', quantity: 4, spriteId: 'zzz' },
    ], 1);

    const [hay, hoe, can, wet, pick, axe, mystery] = layout.slots;
    expect(hay.icon).toBe('🌾');
    expect(hay.quantityLabel).toBe('50');
    expect(hay.quantityCorner).toBe('bottom-right');
    expect(hay.meter).toBeNull();
    expect(hoe.selected).toBe(true);
    expect(hoe.borderColor).toBe('#F59E0B');
    expect(hoe.icon).toBe('🪴');
    expect(hoe.quantityLabel).toBe('1');
    expect(hoe.meter).toEqual({
      kind: 'durability',
      percent: 50,
      width: '50%',
      color: theme.colors.sage,
    });
    expect(can.icon).toBe('💧');
    expect(can.meter).toEqual({
      kind: 'water',
      percent: 50,
      width: '50%',
      color: theme.colors.sky,
    });
    expect(wet.icon).toBe('🌱');
    expect(wet.quantityLabel).toBe('3');
    expect(wet.meter).toMatchObject({ kind: 'water', percent: 50, width: '50%', color: theme.colors.sky });
    expect(pick.meter).toMatchObject({ kind: 'durability', percent: 100, width: '100%' });
    expect(axe.meter).toMatchObject({ kind: 'durability', percent: 0, width: '0%' });
    expect(mystery.icon).toBe('📦');
    expect(mystery.quantityLabel).toBe('4');
    expect(mystery.meter).toBeNull();
    expect(layout.slots[9].empty).toBe(true);
    expect(layout.slots[9].quantityLabel).toBeNull();

    expect(hotbarMeter({ waterLevel: 40, maxWater: 80 })).toMatchObject({ kind: 'water', percent: 50 });
    expect(hotbarMeter({ durability: 80, maxDurability: 40, toolType: 'hoe' })?.percent).toBe(100);
    expect(hotbarItemIcon({ spriteId: 'item_hay_starting', name: 'Hay' })).toBe('🌾');
    expect(hotbarItemIcon({ name: 'Gold Hoe', toolType: 'hoe' })).toBe('🪴');
  });

  it('keeps inventory indexes and fills empty slots with equipped tools', () => {
    const full = hotbarItemsFromPlayer({
      inventory: Array.from({ length: 12 }, (_, index) => ({
        id: `item-${index}`,
        name: 'Wood',
        quantity: index + 1,
        spriteId: 'wood',
      })),
      tools: {
        hoe: { id: 'hoe', name: 'Hoe', toolType: 'hoe', durability: 10, maxDurability: 10, quantity: 1 },
      },
    });
    expect(full).toHaveLength(10);
    expect(full.map((item) => item?.id)).toEqual(Array.from({ length: 10 }, (_, index) => `item-${index}`));

    const mixed = hotbarItemsFromPlayer({
      inventory: [{ id: 'hay', name: 'Hay', quantity: 50, spriteId: 'hay' }],
      tools: {
        axe: { id: 'axe', name: 'Axe', toolType: 'axe', durability: 1, maxDurability: 10, quantity: 1 },
        watering_can: { id: 'can', name: 'Can', toolType: 'watering_can', durability: 8, maxDurability: 10, quantity: 1 },
        hoe: { id: 'hoe', name: 'Hoe', toolType: 'hoe', durability: 5, maxDurability: 10, quantity: 1 },
      },
    });
    expect(mixed[0]?.id).toBe('hay');
    expect(mixed[1]?.id).toBe('hoe');
    expect(mixed[2]?.id).toBe('can');
    expect(mixed[3]?.id).toBe('axe');
    expect(mixed[4]).toBeNull();
    expect(mixed).toHaveLength(10);

    const view = hotbarLayout(mixed, 2);
    expect(view.slots[0].icon).toBe('🌾');
    expect(view.slots[0].quantityLabel).toBe('50');
    expect(view.slots[2].meter?.kind).toBe('water');
    expect(view.slots[2].borderColor).toBe('#F59E0B');
    expect(view.slots[2].accessibilityLabel).toContain('selected');
  });

  it('stars silver, gold and iridium harvests and leaves normal and plain stacks bare', () => {
    const layout = hotbarLayout([
      { id: 'harvest_wheat_silver', name: 'Wheat (Silver)', quantity: 3, spriteId: 'wheat', quality: 'silver' },
      { id: 'harvest_wheat_gold', name: 'Wheat (Gold)', quantity: 2, spriteId: 'wheat', quality: 'gold' },
      { id: 'harvest_wheat_iridium', name: 'Wheat (Iridium)', quantity: 1, spriteId: 'wheat', quality: 'iridium' },
      { id: 'harvest_wheat_normal', name: 'Wheat (Normal)', quantity: 4, spriteId: 'wheat', quality: 'normal' },
      { id: 'wheat', name: 'Wheat', quantity: 1, spriteId: 'wheat' },
    ], 0);

    const [silver, gold, iridium, normal, plain] = layout.slots;
    expect(silver.qualityStarColor).toBe('#C0C0C0');
    expect(gold.qualityStarColor).toBe('#FFD700');
    expect(iridium.qualityStarColor).toBe('#B388FF');
    expect(normal.qualityStarColor).toBeNull();
    expect(plain.qualityStarColor).toBeNull();
    expect(layout.slots[5].qualityStarColor).toBeNull();
  });
});
