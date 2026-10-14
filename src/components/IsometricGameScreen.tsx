/**
 * 2.5D Isometric Game Screen with Voxel Rendering
 * 
 * Beautiful isometric 3D view for your cozy farming game
 */

import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Alert } from 'react-native';
import { useGameStore } from '../store/gameStore';
import { CropStage, Season, ToolType } from '../types/game';
import { IsometricRenderer } from '../rendering/IsometricRenderer';
import { TextureManager } from '../rendering/TextureManager';
import { AssetManager } from '../systems/AssetManager';
import { CraftingMenu } from './CraftingMenu';
import { theme } from '../styles/theme';
import { CozyIconButton } from './CozyIconButton';
import { ShippingSummaryModal, useEndOfDayShipping } from './ShippingSummaryModal';
import { DialogueBox, type DialogueRequest } from './DialogueBox';
import { clearNotificationTimer, scheduleNotificationHide, type NotificationTimerId } from './notificationTimer';
import { lerp } from '../utils/math';
import { AudioManager, footstepSurfaceAt } from '../systems/AudioManager';
import { isPlayerIndoors, SeasonalAudioSystem } from '../systems/SeasonalAudioSystem';

const SCREEN_WIDTH = Dimensions.get('window').width;

/** KeyboardEvent.code values for walk input. Arrows move the player; on-screen buttons still pan the camera. */
export const MOVEMENT_KEY_CODES = [
  'KeyW',
  'KeyA',
  'KeyS',
  'KeyD',
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
] as const;

export type MovementKeyCode = (typeof MOVEMENT_KEY_CODES)[number];
export type MovementKeyState = Record<MovementKeyCode, boolean>;

/** Steady walk and exhausted walk, in world units per second. Lerp is the issue's 0.2 smoothing step. */
const WALK_SPEED = 4.5;
const EXHAUSTED_SPEED = 2.0;
const VELOCITY_LERP = 0.2;
/** Cap a late frame so a backgrounded tab cannot fling the player across the map. */
const MOVE_DT_CAP_SECONDS = 0.1;
/** Below this, a released key has stopped. The 0.2 lerp never reaches exact zero. */
const VELOCITY_STOP_EPSILON = 0.01;

export interface PlayerVelocity {
  vx: number;
  vy: number;
  exhausted?: boolean;
}

export interface MovementBlock {
  x: number;
  y: number;
  width?: number;
  height?: number;
}

export interface MovementBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

interface StructureFootprint {
  position: { x: number; y: number };
  dimensions?: { x: number; y: number };
  size?: { x: number; y: number };
}

export function emptyMovementKeys(): MovementKeyState {
  return {
    KeyW: false,
    KeyA: false,
    KeyS: false,
    KeyD: false,
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false,
  };
}

export function isMovementKey(code: string): code is MovementKeyCode {
  return (MOVEMENT_KEY_CODES as readonly string[]).includes(code);
}

/** Record a keydown or keyup. Returns false for every code this handler does not own. */
export function applyMovementKey(keys: MovementKeyState, code: string, down: boolean): boolean {
  if (!isMovementKey(code)) return false;
  keys[code] = down;
  return true;
}

/**
 * Raw cardinal vector. Right/D is +X, left/A is -X, up/W is +Y, down/S is -Y.
 * Opposing keys cancel. WASD and arrows share an axis instead of stacking.
 */
export function movementInputVector(keys: MovementKeyState): { inputX: number; inputY: number } {
  const inputX = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0);
  const inputY = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0);
  return { inputX, inputY };
}

/** Exhaustion is optional until the debuff exists on the player. A missing flag is a normal walk. */
export function playerIsExhausted(player: object): boolean {
  if (!('exhausted' in player)) return false;
  return (player as { exhausted?: unknown }).exhausted === true;
}

/**
 * One smoothing step toward the isometric target.
 * targetVx = (inputX - inputY) * speed
 * targetVy = (inputX + inputY) * (speed * 0.5)
 */
export function stepPlayerVelocity(
  player: PlayerVelocity,
  inputX: number,
  inputY: number,
): PlayerVelocity {
  const speed = player.exhausted ? EXHAUSTED_SPEED : WALK_SPEED;
  const targetVx = (inputX - inputY) * speed;
  const targetVy = (inputX + inputY) * (speed * 0.5);
  player.vx = lerp(player.vx, targetVx, VELOCITY_LERP);
  player.vy = lerp(player.vy, targetVy, VELOCITY_LERP);
  return player;
}

/** Snap a released stick to rest so the player does not creep after the lerp falls below the epsilon. */
export function settleStoppedVelocity(velocity: PlayerVelocity, hasInput: boolean): void {
  if (hasInput) return;
  if (Math.hypot(velocity.vx, velocity.vy) >= VELOCITY_STOP_EPSILON) return;
  velocity.vx = 0;
  velocity.vy = 0;
}

export function movementBlocks(world: {
  buildings?: readonly StructureFootprint[];
  homeBuildings?: readonly StructureFootprint[];
  damBuildings?: readonly StructureFootprint[];
}): MovementBlock[] {
  const lists = [world.buildings, world.homeBuildings, world.damBuildings];
  const blocks: MovementBlock[] = [];
  for (const list of lists) {
    if (!list) continue;
    for (const structure of list) {
      blocks.push({
        x: structure.position.x,
        y: structure.position.y,
        width: structure.dimensions?.x ?? structure.size?.x,
        height: structure.dimensions?.y ?? structure.size?.y,
      });
    }
  }
  return blocks;
}

/** True when the point is inside the map and its tile is not occupied by a structure. */
export function canOccupy(
  x: number,
  y: number,
  blocks: readonly MovementBlock[],
  bounds: MovementBounds,
): boolean {
  if (x < bounds.minX || y < bounds.minY || x >= bounds.maxX || y >= bounds.maxY) return false;
  const tx = Math.floor(x);
  const ty = Math.floor(y);
  return !blocks.some((block) => {
    const width = Math.max(1, Math.floor(block.width ?? 1));
    const height = Math.max(1, Math.floor(block.height ?? 1));
    const ox = Math.floor(block.x);
    const oy = Math.floor(block.y);
    return tx >= ox && tx < ox + width && ty >= oy && ty < oy + height;
  });
}

/**
 * Integrate velocity in world units per second, per axis.
 * A blocked axis stays put so a wall stops that component without cancelling the free one.
 */
export function nextPlayerPosition(
  position: { x: number; y: number; z: number },
  velocity: { vx: number; vy: number },
  dt: number,
  blocks: readonly MovementBlock[],
  bounds: MovementBounds,
): { x: number; y: number; z: number } {
  let x = position.x;
  let y = position.y;
  const tryX = position.x + velocity.vx * dt;
  if (canOccupy(tryX, position.y, blocks, bounds)) x = tryX;
  const tryY = position.y + velocity.vy * dt;
  if (canOccupy(x, tryY, blocks, bounds)) y = tryY;
  return { x, y, z: position.z };
}

/** Outer ring and inner nub. The ring is the full-deflection radius. */
export const JOYSTICK_OUTER_RADIUS = 60;
export const JOYSTICK_INNER_RADIUS = 25;
/** Resting ring sits this far from the bottom-left corner of the screen. */
export const JOYSTICK_EDGE_MARGIN = 16;
/** A shorter drag is still a tap, so the canvas click underneath can plant or harvest. */
export const JOYSTICK_TAP_SLOP = 10;

export interface TouchLike {
  clientX?: number;
  clientY?: number;
  pageX?: number;
  pageY?: number;
  identifier?: number;
}

export interface PointerSample {
  x: number;
  y: number;
  identifier: number;
}

export interface JoystickTouchEvent {
  touches?: ArrayLike<TouchLike> | null;
  changedTouches?: ArrayLike<TouchLike> | null;
  target?: EventTarget | null;
  cancelable?: boolean;
  preventDefault?: () => void;
  nativeEvent?: TouchLike & {
    touches?: ArrayLike<TouchLike> | null;
    changedTouches?: ArrayLike<TouchLike> | null;
  };
}

export interface JoystickAxes {
  dx: number;
  dy: number;
}

export interface JoystickReading extends JoystickAxes {
  magnitude: number;
  angle: number;
  /** Nub-center offset from the ring center. Screen Y grows downward. */
  nubX: number;
  nubY: number;
}

export interface JoystickGesture extends JoystickReading {
  activeId: number | null;
  originX: number;
  originY: number;
  dragged: boolean;
}

export function idleJoystickGesture(): JoystickGesture {
  return {
    activeId: null,
    originX: 0,
    originY: 0,
    dx: 0,
    dy: 0,
    magnitude: 0,
    angle: 0,
    nubX: 0,
    nubY: 0,
    dragged: false,
  };
}

/** Left half of the viewport, using client coordinates. The midline belongs to the right half. */
export function touchStartsOnLeftHalf(touchX: number, screenWidth: number): boolean {
  return screenWidth > 0 && touchX >= 0 && touchX < screenWidth * 0.5;
}

export function findTouch(
  touches: ArrayLike<TouchLike> | null | undefined,
  identifier?: number,
): PointerSample | null {
  if (!touches) return null;
  for (let i = 0; i < touches.length; i += 1) {
    const touch = touches[i];
    if (identifier !== undefined && touch.identifier !== identifier) continue;
    const x = touch.clientX ?? touch.pageX;
    const y = touch.clientY ?? touch.pageY;
    if (typeof x !== 'number' || typeof y !== 'number') continue;
    return { x, y, identifier: touch.identifier ?? 0 };
  }
  return null;
}

export function joystickPointFromEvent(
  event: JoystickTouchEvent,
  field: 'touches' | 'changedTouches',
  identifier?: number,
): PointerSample | null {
  const direct = findTouch(event[field], identifier);
  if (direct) return direct;
  const fromNative = findTouch(event.nativeEvent?.[field], identifier);
  if (fromNative) return fromNative;
  if (field === 'touches' && identifier === undefined && event.nativeEvent) {
    return findTouch([event.nativeEvent]);
  }
  return null;
}

/**
 * Normalized stick. Angle is atan2 of an up-positive Y, magnitude is clamped to 1,
 * and (dx, dy) = (cos(angle), sin(angle)) * magnitude so it matches keyboard inputX/inputY.
 * Screen Y grows downward, so the raw vertical delta is flipped before the angle.
 */
export function readJoystick(
  originX: number,
  originY: number,
  touchX: number,
  touchY: number,
  radius: number = JOYSTICK_OUTER_RADIUS,
): JoystickReading {
  const rawX = touchX - originX;
  const rawY = touchY - originY;
  const distance = Math.hypot(rawX, rawY);
  if (distance === 0 || radius <= 0) {
    return { dx: 0, dy: 0, magnitude: 0, angle: 0, nubX: 0, nubY: 0 };
  }
  const magnitude = Math.min(1, distance / radius);
  const angle = Math.atan2(-rawY, rawX);
  const travel = magnitude * radius;
  return {
    dx: Math.cos(angle) * magnitude,
    dy: Math.sin(angle) * magnitude,
    magnitude,
    angle,
    nubX: Math.cos(angle) * travel,
    nubY: -Math.sin(angle) * travel,
  };
}

export function joystickTouchStart(
  gesture: JoystickGesture,
  touch: PointerSample,
  screenWidth: number,
): JoystickGesture {
  if (gesture.activeId !== null) return gesture;
  if (!touchStartsOnLeftHalf(touch.x, screenWidth)) return gesture;
  return {
    ...idleJoystickGesture(),
    activeId: touch.identifier,
    originX: touch.x,
    originY: touch.y,
  };
}

export function joystickTouchMove(gesture: JoystickGesture, touch: PointerSample): JoystickGesture {
  if (gesture.activeId === null || touch.identifier !== gesture.activeId) return gesture;
  const reading = readJoystick(gesture.originX, gesture.originY, touch.x, touch.y);
  const distance = Math.hypot(touch.x - gesture.originX, touch.y - gesture.originY);
  return {
    ...gesture,
    ...reading,
    dragged: gesture.dragged || distance > JOYSTICK_TAP_SLOP,
  };
}

export function joystickTouchEnd(gesture: JoystickGesture, identifier: number): JoystickGesture {
  if (gesture.activeId !== identifier) return gesture;
  return idleJoystickGesture();
}

/** A centered or released stick leaves the keyboard vector untouched. A deflected stick replaces it. */
export function locomotionInput(
  keyX: number,
  keyY: number,
  stick: JoystickAxes,
): { inputX: number; inputY: number } {
  if (stick.dx === 0 && stick.dy === 0) return { inputX: keyX, inputY: keyY };
  return { inputX: stick.dx, inputY: stick.dy };
}

export function joystickRestPosition(): { left: number; bottom: number } {
  return { left: JOYSTICK_EDGE_MARGIN, bottom: JOYSTICK_EDGE_MARGIN };
}

export function joystickFloatPosition(originX: number, originY: number): { left: number; top: number } {
  return {
    left: originX - JOYSTICK_OUTER_RADIUS,
    top: originY - JOYSTICK_OUTER_RADIUS,
  };
}

export function applyJoystickPlacement(
  ring: { style: { left: string; top: string; bottom: string } },
  nub: { style: { transform: string } },
  gesture: JoystickGesture,
): void {
  if (gesture.activeId === null) {
    const rest = joystickRestPosition();
    ring.style.left = `${rest.left}px`;
    ring.style.top = 'auto';
    ring.style.bottom = `${rest.bottom}px`;
  } else {
    const floated = joystickFloatPosition(gesture.originX, gesture.originY);
    ring.style.left = `${floated.left}px`;
    ring.style.top = `${floated.top}px`;
    ring.style.bottom = 'auto';
  }
  nub.style.transform = `translate(${gesture.nubX}px, ${gesture.nubY}px)`;
}

/** Vertical stamina gauge on the isometric screen. Fill only — no regen. */
export const STAMINA_GAUGE_WIDTH = 24;
export const STAMINA_GAUGE_HEIGHT = 180;
export const STAMINA_GAUGE_RADIUS = 12;
export const STAMINA_PULSE_CLASS = 'stamina-gauge-pulse';
export const STAMINA_PULSE_ANIMATION = 'stamina-gauge-pulse 0.85s ease-in-out infinite';
export const STAMINA_PULSE_CSS = `@keyframes stamina-gauge-pulse{0%,100%{opacity:1}50%{opacity:.45}}.${STAMINA_PULSE_CLASS}{animation:${STAMINA_PULSE_ANIMATION}}`;

export interface StaminaGaugeView {
  width: number;
  height: number;
  borderRadius: number;
  /** (currentStamina / maxStamina) * 100, clamped to 0–100. */
  fillPercent: number;
  fillHeight: string;
  color: string;
  pulse: boolean;
  pulseClass: string;
  pulseStyle: { animation: string } | Record<string, never>;
  label: string;
}

/** Above 50% emerald, 20% through 50% amber, below 20% crimson and pulsing. */
export function staminaGaugeView(currentStamina: number, maxStamina: number): StaminaGaugeView {
  const current = Number.isFinite(currentStamina) ? currentStamina : 0;
  const max = Number.isFinite(maxStamina) && maxStamina > 0 ? maxStamina : 0;
  const fillPercent = max > 0 ? Math.min(100, Math.max(0, (current / max) * 100)) : 0;
  const pulse = fillPercent < 20;
  const color = fillPercent > 50
    ? theme.colors.staminaHigh
    : fillPercent >= 20
      ? theme.colors.staminaMid
      : theme.colors.staminaLow;
  return {
    width: STAMINA_GAUGE_WIDTH,
    height: STAMINA_GAUGE_HEIGHT,
    borderRadius: STAMINA_GAUGE_RADIUS,
    fillPercent,
    fillHeight: `${fillPercent}%`,
    color,
    pulse,
    pulseClass: pulse ? STAMINA_PULSE_CLASS : '',
    pulseStyle: pulse ? { animation: STAMINA_PULSE_ANIMATION } : {},
    label: `${Math.round(currentStamina)} / ${maxStamina}`,
  };
}

/** Monday is day 0 of the existing day counter. The number shown is that counter. */
const WEEKDAY_LABELS = ['Mon.', 'Tue.', 'Wed.', 'Thu.', 'Fri.', 'Sat.', 'Sun.'] as const;

/** world.season stays autumn; the badge says Fall. */
const SEASON_BADGES: Record<Season, string> = {
  spring: '🌸 Spring',
  summer: '☀️ Summer',
  autumn: '🍂 Fall',
  winter: '❄️ Winter',
};

export interface ClockHudInput {
  season: Season;
  /** Minutes since midnight. Same value GameEngine advances. */
  dayTime: number;
  /** Existing day counter (world.totalDaysPlayed). */
  day: number;
  coins: number;
}

export interface ClockHudView {
  weekdayDate: string;
  seasonBadge: string;
  clock: string;
  gold: string;
}

export function weekdayDateLabel(day: number): string {
  const dayNumber = Number.isFinite(day) ? Math.trunc(day) : 0;
  const index = ((dayNumber % 7) + 7) % 7;
  return `${WEEKDAY_LABELS[index]} ${dayNumber}`;
}

/**
 * Same wrap as TimeSystem.getTimeString (#112).
 * Reads minutes since midnight and does not advance them.
 */
export function formatDayTime(dayTime: number): string {
  const totalMins = dayTime % 1440;
  const hour = Math.floor(totalMins / 60) % 24;
  const minute = Math.floor(totalMins % 60);
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${String(minute).padStart(2, '0')} ${period}`;
}

export function formatGold(coins: number): string {
  const amount = Number.isFinite(coins) ? coins : 0;
  return `💰 ${amount.toLocaleString('en-US')}g`;
}

export function clockHudView(input: ClockHudInput): ClockHudView {
  return {
    weekdayDate: weekdayDateLabel(input.day),
    seasonBadge: SEASON_BADGES[input.season],
    clock: formatDayTime(input.dayTime),
    gold: formatGold(input.coins),
  };
}

/** Ten inventory slots. Keys 1–9 then 0 select indexes 0–9. */
export const HOTBAR_SLOT_COUNT = 10;
export const HOTBAR_SLOT_SIZE = 48;
export const HOTBAR_SLOT_GAP = 8;
export const HOTBAR_SELECTED_BORDER = theme.colors.hotbarSelected;
export const HOTBAR_KEY_CODES = [
  'Digit1',
  'Digit2',
  'Digit3',
  'Digit4',
  'Digit5',
  'Digit6',
  'Digit7',
  'Digit8',
  'Digit9',
  'Digit0',
] as const;

const HOTBAR_KEY_LABELS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'] as const;
const HOTBAR_TOOL_ORDER = [
  ToolType.HOE,
  ToolType.WATERING_CAN,
  ToolType.AXE,
  ToolType.PICKAXE,
  ToolType.SCYTHE,
] as const;
const HOTBAR_CODE_TO_SLOT = new Map<string, number>([
  ['Digit1', 0],
  ['Digit2', 1],
  ['Digit3', 2],
  ['Digit4', 3],
  ['Digit5', 4],
  ['Digit6', 5],
  ['Digit7', 6],
  ['Digit8', 7],
  ['Digit9', 8],
  ['Digit0', 9],
  ['Numpad1', 0],
  ['Numpad2', 1],
  ['Numpad3', 2],
  ['Numpad4', 3],
  ['Numpad5', 4],
  ['Numpad6', 5],
  ['Numpad7', 6],
  ['Numpad8', 7],
  ['Numpad9', 8],
  ['Numpad0', 9],
]);
const HOTBAR_TOOL_ICON_KEYS = ['watering_can', 'pickaxe', 'scythe', 'hoe', 'axe'] as const;
const HOTBAR_ICONS: Record<string, string> = {
  watering_can: '💧',
  pickaxe: '⛏️',
  scythe: '🌾',
  hoe: '🪴',
  axe: '🪓',
  hay: '🌾',
  wheat: '🌾',
  carrot: '🥕',
  tomato: '🍅',
  corn: '🌽',
  potato: '🥔',
  apple: '🍎',
  lettuce: '🥬',
  onion: '🧅',
  garlic: '🧄',
  pumpkin: '🎃',
  strawberry: '🍓',
  blueberries: '🫐',
  wood: '🪵',
  stone: '🪨',
  iron: '⚙️',
  gold: '✨',
  seed: '🌱',
  egg: '🥚',
  milk: '🥛',
  wool: '🧶',
  fertilizer: '🧪',
};

export interface HotbarSlotItem {
  id?: string;
  name?: string;
  quantity?: number;
  spriteId?: string;
  type?: string;
  toolType?: string;
  durability?: number;
  maxDurability?: number;
  waterLevel?: number;
  maxWater?: number;
}

export interface HotbarMeterView {
  kind: 'durability' | 'water';
  percent: number;
  width: string;
  color: string;
}

export interface HotbarSlotView {
  index: number;
  keyLabel: string;
  size: number;
  empty: boolean;
  selected: boolean;
  borderColor: string;
  icon: string | null;
  quantityLabel: string | null;
  quantityCorner: 'bottom-right';
  meter: HotbarMeterView | null;
  accessibilityLabel: string;
}

export interface HotbarLayout {
  slotCount: number;
  slotSize: number;
  gap: number;
  anchor: 'bottom';
  selectedBorder: string;
  slots: HotbarSlotView[];
}

function finiteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value));
}

function ratioPercent(current: number, max: number | undefined, fallbackMax: number): number {
  const cap = finiteNumber(max) && max > 0 ? max : fallbackMax;
  return clampPercent((current / cap) * 100);
}

/** Top-row 1–0 and numpad 1–0. Movement codes stay with the walk handler. */
export function hotbarSlotFromKey(code: string, key?: string): number | null {
  const fromCode = HOTBAR_CODE_TO_SLOT.get(code);
  if (fromCode !== undefined) return fromCode;
  if (key === '0') return 9;
  if (key !== undefined && key.length === 1 && key >= '1' && key <= '9') {
    return key.charCodeAt(0) - 49;
  }
  return null;
}

export function selectHotbarSlot(index: number): number {
  if (!Number.isFinite(index)) return 0;
  const slot = Math.trunc(index);
  if (slot < 0) return 0;
  if (slot >= HOTBAR_SLOT_COUNT) return HOTBAR_SLOT_COUNT - 1;
  return slot;
}

/** Positive deltaY (wheel down) is the next slot. Magnitude still moves one slot. */
export function hotbarWheelDelta(deltaY: number): number {
  if (!Number.isFinite(deltaY) || deltaY === 0) return 0;
  return deltaY > 0 ? 1 : -1;
}

export function cycleHotbarSlot(current: number, delta: number): number {
  if (!Number.isFinite(delta) || delta === 0) return selectHotbarSlot(current);
  const step = delta > 0 ? 1 : -1;
  return (selectHotbarSlot(current) + step + HOTBAR_SLOT_COUNT) % HOTBAR_SLOT_COUNT;
}

function isDirectIcon(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed || trimmed.includes('/') || trimmed.includes('.')) return false;
  return !/[a-z0-9]/i.test(trimmed);
}

export function hotbarItemIcon(item: HotbarSlotItem): string {
  const sprite = item.spriteId?.trim() ?? '';
  if (sprite && isDirectIcon(sprite)) return sprite;
  const fields = [item.toolType, item.spriteId, item.id, item.name];
  for (const field of fields) {
    if (!field) continue;
    const normalized = field.toLowerCase();
    for (const iconKey of HOTBAR_TOOL_ICON_KEYS) {
      if (normalized.includes(iconKey)) return HOTBAR_ICONS[iconKey];
    }
  }
  for (const field of fields) {
    if (!field) continue;
    const normalized = field.toLowerCase();
    if (HOTBAR_ICONS[normalized]) return HOTBAR_ICONS[normalized];
    const parts = normalized.split(/[^a-z0-9]+/).filter((part) => part.length > 0);
    for (const part of parts) {
      if (HOTBAR_ICONS[part]) return HOTBAR_ICONS[part];
    }
    for (const iconKey of Object.keys(HOTBAR_ICONS)) {
      if (iconKey.includes('_')) continue;
      if (normalized.includes(iconKey)) return HOTBAR_ICONS[iconKey];
    }
  }
  return '📦';
}

function isWaterContainer(item: HotbarSlotItem): boolean {
  if (item.toolType === ToolType.WATERING_CAN) return true;
  const blob = `${item.toolType ?? ''} ${item.spriteId ?? ''} ${item.name ?? ''} ${item.id ?? ''}`.toLowerCase();
  return blob.includes('watering');
}

/** Durability for tools. Watering cans and explicit waterLevel use the water bar. */
export function hotbarMeter(item: HotbarSlotItem): HotbarMeterView | null {
  if (finiteNumber(item.waterLevel)) {
    const percent = ratioPercent(item.waterLevel, item.maxWater, 100);
    return { kind: 'water', percent, width: `${percent}%`, color: theme.colors.sky };
  }
  if (!finiteNumber(item.durability)) return null;
  const percent = ratioPercent(item.durability, item.maxDurability, 100);
  if (isWaterContainer(item)) {
    return { kind: 'water', percent, width: `${percent}%`, color: theme.colors.sky };
  }
  return { kind: 'durability', percent, width: `${percent}%`, color: theme.colors.sage };
}

export function hotbarLayout(
  items: readonly (HotbarSlotItem | null | undefined)[],
  selectedIndex: number,
): HotbarLayout {
  const selected = selectHotbarSlot(selectedIndex);
  const slots = HOTBAR_KEY_LABELS.map((keyLabel, index): HotbarSlotView => {
    const item = items[index] ?? null;
    const selectedSlot = index === selected;
    const meter = item ? hotbarMeter(item) : null;
    const quantityLabel = item && finiteNumber(item.quantity)
      ? String(Math.max(0, Math.trunc(item.quantity)))
      : null;
    const name = item?.name?.trim() || (item ? 'item' : '');
    const detail = item
      ? `${name}${quantityLabel ? `, stack ${quantityLabel}` : ''}${meter ? `, ${meter.kind} ${Math.round(meter.percent)}%` : ''}`
      : 'empty';
    return {
      index,
      keyLabel,
      size: HOTBAR_SLOT_SIZE,
      empty: item == null,
      selected: selectedSlot,
      borderColor: selectedSlot ? HOTBAR_SELECTED_BORDER : theme.colors.glassBorder,
      icon: item ? hotbarItemIcon(item) : null,
      quantityLabel,
      quantityCorner: 'bottom-right',
      meter,
      accessibilityLabel: `Hotbar slot ${keyLabel}, ${detail}${selectedSlot ? ', selected' : ''}`,
    };
  });
  return {
    slotCount: HOTBAR_SLOT_COUNT,
    slotSize: HOTBAR_SLOT_SIZE,
    gap: HOTBAR_SLOT_GAP,
    anchor: 'bottom',
    selectedBorder: HOTBAR_SELECTED_BORDER,
    slots,
  };
}

/**
 * Inventory keeps its own indexes. Equipped tools fill leftover slots so a
 * durability or water bar is visible without a second inventory list.
 */
export function hotbarItemsFromPlayer(player: {
  inventory?: readonly HotbarSlotItem[] | null;
  tools?: Partial<Record<ToolType, HotbarSlotItem | undefined>> | null;
}): (HotbarSlotItem | null)[] {
  const inventory = player.inventory ?? [];
  const slots: (HotbarSlotItem | null)[] = Array.from({ length: HOTBAR_SLOT_COUNT }, (_, index) => {
    return inventory[index] ?? null;
  });
  const tools = HOTBAR_TOOL_ORDER
    .map((toolType) => player.tools?.[toolType])
    .filter((tool): tool is HotbarSlotItem => tool != null);
  let toolCursor = 0;
  for (let index = 0; index < HOTBAR_SLOT_COUNT && toolCursor < tools.length; index += 1) {
    if (slots[index] == null) {
      slots[index] = tools[toolCursor];
      toolCursor += 1;
    }
  }
  return slots;
}

/** Buttons keep their own presses. A touch on the canvas or empty left half still drives the stick. */
export function isJoystickIgnoredTarget(target: EventTarget | null): boolean {
  if (typeof Element === 'undefined') return false;
  const element = target instanceof Element
    ? target
    : typeof Node !== 'undefined' && target instanceof Node
      ? target.parentElement
      : null;
  if (!element) return false;
  return Boolean(element.closest('button, a, input, textarea, select, [role="button"]'));
}

type JoystickTouchHandlers = {
  onTouchStart?: (event: JoystickTouchEvent) => void;
  onTouchMove?: (event: JoystickTouchEvent) => void;
  onTouchEnd?: (event: JoystickTouchEvent) => void;
  onTouchCancel?: (event: JoystickTouchEvent) => void;
};

const JoystickTouchRoot = View as React.ComponentType<
  Omit<React.ComponentProps<typeof View>, 'onTouchStart' | 'onTouchMove' | 'onTouchEnd' | 'onTouchCancel'>
  & JoystickTouchHandlers
>;

function isTypingTarget(target: EventTarget | null): boolean {
  if (typeof HTMLElement === 'undefined' || !(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable;
}

interface IsometricGameScreenProps {
  onSave: () => void;
  /** Active line. Nothing is drawn when this is omitted. */
  dialogue?: DialogueRequest | null;
}

export const IsometricGameScreen: React.FC<IsometricGameScreenProps> = ({ onSave, dialogue = null }) => {
  const {
    world, plantCrop, harvestCrop, waterCrop, createFarmPlot, addCoins, addExperience,
    placeBuilding, createOreDeposit, mineOre, harvestWood,
    buildRoad, upgradeRoad, spawnVehicle, mountVehicle, dismountVehicle, movePlayer, applyFertilizer,
    advanceTime,
  } = useGameStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<IsometricRenderer | null>(null);
  const joystickRef = useRef<JoystickAxes>({ dx: 0, dy: 0 });
  const joystickGestureRef = useRef<JoystickGesture>(idleJoystickGesture());
  const joystickRingRef = useRef<HTMLDivElement>(null);
  const joystickNubRef = useRef<HTMLDivElement>(null);
  /** Ghost click after a drag is ignored until this time. A missing click must not swallow the next tap. */
  const suppressClickUntilRef = useRef(0);
  const [selectedAction, setSelectedAction] = useState<'plant' | 'water' | 'harvest' | 'build' | 'mine' | 'build_road' | 'spawn_vehicle' | 'fertilize' | null>(null);
  const [selectedCropType, setSelectedCropType] = useState<'wheat' | 'carrot' | 'tomato' | 'apple'>('wheat');
  const [selectedFertilizerType, setSelectedFertilizerType] = useState<'speed' | 'quality' | 'water'>('speed');
  const [selectedBuildingType, setSelectedBuildingType] = useState<'barn' | 'shed' | 'house'>('barn');
  const [selectedRoadType, setSelectedRoadType] = useState<'gravel' | 'paved'>('gravel');
  const [selectedVehicleType, setSelectedVehicleType] = useState<'tractor' | 'truck'>('tractor');
  const [notification, setNotification] = useState('');
  const notificationTimerRef = useRef<NotificationTimerId>(null);
  const [cameraOffset, setCameraOffset] = useState({ x: 0, y: 0 });
  const [showCrafting, setShowCrafting] = useState(false);
  const showCraftingRef = useRef(false);
  showCraftingRef.current = showCrafting;
  const [soundMuted, setSoundMuted] = useState(false);
  const seasonalRef = useRef<SeasonalAudioSystem | null>(null);
  const waterStopRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [selectedHotbarSlot, setSelectedHotbarSlot] = useState(0);

  const seasonalAudio = () => {
    if (!seasonalRef.current) seasonalRef.current = new SeasonalAudioSystem();
    return seasonalRef.current;
  };

  const toggleMute = () => {
    const seasonal = seasonalAudio();
    const audio = AudioManager.getInstance();
    const next = !soundMuted;
    if (next) {
      seasonal.mute();
      audio.muteAll();
    } else {
      seasonal.unmute();
      audio.unmuteAll();
    }
    setSoundMuted(next);
  };

  const startWaterSplash = () => {
    const audio = AudioManager.getInstance();
    audio.startWaterLoop();
    if (waterStopRef.current) clearTimeout(waterStopRef.current);
    waterStopRef.current = setTimeout(() => {
      audio.stopWaterLoop();
      waterStopRef.current = null;
    }, 700);
  };

  const toggleAction = (
    action: 'plant' | 'water' | 'harvest' | 'build' | 'mine' | 'build_road' | 'spawn_vehicle' | 'fertilize',
  ) => {
    AudioManager.getInstance().playMenuClick();
    setSelectedAction((current) => (current === action ? null : action));
  };

  const showNotification = (msg: string, durationMs = 2000) => {
    setNotification(msg);
    notificationTimerRef.current = scheduleNotificationHide(
      notificationTimerRef.current,
      () => setNotification(''),
      durationMs,
    );
  };

  useEffect(() => {
    return () => {
      clearNotificationTimer(notificationTimerRef.current);
    };
  }, []);

  // Held WASD / arrow keys, plus the floating stick. Velocity lerps each frame; collision is checked before movePlayer.
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const keys = emptyMovementKeys();
    const motion: PlayerVelocity = { vx: 0, vy: 0 };
    let frameId = 0;
    let lastTimestamp = 0;
    const seasonal = seasonalAudio();
    let stepCarry = 0;
    const resumeAudio = () => {
      seasonal.resume();
      AudioManager.getInstance().resumePlayback();
    };

    const blockScrollWhileDragging = (event: TouchEvent) => {
      if (!joystickGestureRef.current.dragged) return;
      if (event.cancelable) event.preventDefault();
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) return;
      if (!applyMovementKey(keys, event.code, true)) return;
      event.preventDefault();
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (!applyMovementKey(keys, event.code, false)) return;
      event.preventDefault();
    };
    const onBlur = () => {
      for (const code of MOVEMENT_KEY_CODES) keys[code] = false;
      joystickRef.current = { dx: 0, dy: 0 };
      joystickGestureRef.current = idleJoystickGesture();
      if (joystickRingRef.current && joystickNubRef.current) {
        applyJoystickPlacement(
          joystickRingRef.current,
          joystickNubRef.current,
          joystickGestureRef.current,
        );
      }
    };

    const tick = (timestamp: number) => {
      const dt = lastTimestamp === 0
        ? 0
        : Math.min((timestamp - lastTimestamp) / 1000, MOVE_DT_CAP_SECONDS);
      lastTimestamp = timestamp;

      const state = useGameStore.getState();
      const world = state.world;
      if (world) {
        const indoors = showCraftingRef.current || isPlayerIndoors(world.player.position, [
          ...(world.buildings ?? []),
          ...(world.homeBuildings ?? []),
        ]);
        seasonal.update({
          season: world.season,
          weather: world.currentWeather,
          hour: world.dayTime / 60,
          indoors,
        });

        if (dt > 0) {
          const player = world.player;
          const keysVector = movementInputVector(keys);
          const { inputX, inputY } = locomotionInput(keysVector.inputX, keysVector.inputY, joystickRef.current);
          motion.exhausted = playerIsExhausted(player);
          stepPlayerVelocity(motion, inputX, inputY);
          settleStoppedVelocity(motion, inputX !== 0 || inputY !== 0);

          if (motion.vx !== 0 || motion.vy !== 0) {
            const next = nextPlayerPosition(
              player.position,
              motion,
              dt,
              movementBlocks(world),
              { minX: 0, minY: 0, maxX: world.mapSize.x, maxY: world.mapSize.y },
            );
            if (next.x !== player.position.x || next.y !== player.position.y) {
              const traveled = Math.hypot(next.x - player.position.x, next.y - player.position.y);
              state.movePlayer(next);
              if (player.mountedVehicleId) {
                stepCarry = 0;
              } else {
                stepCarry += traveled;
                if (stepCarry >= 1.1) {
                  stepCarry = 0;
                  AudioManager.getInstance().playFootstep(footstepSurfaceAt({
                    x: next.x,
                    y: next.y,
                    weather: world.currentWeather,
                    roads: world.roads,
                    plots: world.farmPlots,
                    buildings: [...(world.buildings ?? []), ...(world.homeBuildings ?? [])],
                  }));
                }
              }
            }
          }
        }
      }

      frameId = window.requestAnimationFrame(tick);
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    window.addEventListener('pointerdown', resumeAudio);
    window.addEventListener('touchmove', blockScrollWhileDragging, { passive: false });
    frameId = window.requestAnimationFrame(tick);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('pointerdown', resumeAudio);
      window.removeEventListener('touchmove', blockScrollWhileDragging);
      window.cancelAnimationFrame(frameId);
      if (waterStopRef.current) {
        clearTimeout(waterStopRef.current);
        waterStopRef.current = null;
      }
      AudioManager.getInstance().stopWaterLoop();
      seasonal.stop();
    };
  }, []);

  // 1–0 selects a slot. The wheel moves one slot and wraps. Walk keys stay in the effect above.
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (isTypingTarget(event.target)) return;
      const slot = hotbarSlotFromKey(event.code, event.key);
      if (slot === null) return;
      event.preventDefault();
      setSelectedHotbarSlot(slot);
    };

    const onWheel = (event: WheelEvent) => {
      if (isTypingTarget(event.target)) return;
      const delta = hotbarWheelDelta(event.deltaY);
      if (delta === 0) return;
      setSelectedHotbarSlot((current) => cycleHotbarSlot(current, delta));
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('wheel', onWheel, { passive: true });
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('wheel', onWheel);
    };
  }, []);

  const CROP_TYPES = {
    wheat: { name: 'Wheat', emoji: '🌾', growthDays: 3, sellValue: 50, color: '#DAA520' },
    carrot: { name: 'Carrot', emoji: '🥕', growthDays: 2, sellValue: 40, color: '#FF8C00' },
    tomato: { name: 'Tomato', emoji: '🍅', growthDays: 4, sellValue: 60, color: '#DC143C' },
    apple: { name: 'Apple Tree', emoji: '🍎', growthDays: 5, sellValue: 100, color: '#D32F2F' },
  };

  const BUILDING_TYPES = {
    barn: { name: 'Barn', emoji: '🪜', cost: 200, color: '#8B4513' },
    shed: { name: 'Shed', emoji: '🏠', cost: 150, color: '#8B6914' },
    house: { name: 'House', emoji: '🏡', cost: 300, color: '#DEB887' },
  };

  const FERTILIZER_TYPES = {
    speed: { name: 'Speed-Grow', emoji: '⚡', description: '50% faster growth' },
    quality: { name: 'Quality', emoji: '⭐', description: 'Better crops' },
    water: { name: 'Retaining Soil', emoji: '💧', description: '50% less water' },
  };

  // Initialize isometric renderer and load assets
  useEffect(() => {
    const initializeGame = async () => {
      if (canvasRef.current && !rendererRef.current) {
        // Initialize renderer
        const renderer = new IsometricRenderer(canvasRef.current);
        rendererRef.current = renderer;

        // Initialize AssetManager to get all registered assets
        const assetManager = new AssetManager();
        const allAssets = assetManager.getAllAssets();

        // Filter for assets we want to preload
        const assetsToLoad = allAssets.filter(a =>
          ['tile', 'building', 'crop', 'decoration', 'vehicle'].includes(a.category)
        );

        const tm = TextureManager.getInstance();

        // Map to texture configs
        const textureConfigs = assetsToLoad.map(a => ({
          id: a.id,
          path: a.path as string,
        }));

        await tm.preloadTextures(textureConfigs);
        console.log(`Assets loaded! (${assetsToLoad.length} assets)`);
      }
    };

    initializeGame();
  }, []);

  // Render game world
  useEffect(() => {
    if (rendererRef.current && world) {
      rendererRef.current.render(world);
    }
  }, [world, cameraOffset]);

  const publishJoystick = (gesture: JoystickGesture) => {
    joystickGestureRef.current = gesture;
    joystickRef.current = { dx: gesture.dx, dy: gesture.dy };
    if (joystickRingRef.current && joystickNubRef.current) {
      applyJoystickPlacement(joystickRingRef.current, joystickNubRef.current, gesture);
    }
  };

  const onJoystickTouchStart = (event: JoystickTouchEvent) => {
    if (showCrafting) return;
    if (isJoystickIgnoredTarget(event.target ?? null)) return;
    const touch = joystickPointFromEvent(event, 'touches');
    if (!touch) return;
    const screenWidth = typeof window !== 'undefined' ? window.innerWidth : SCREEN_WIDTH;
    const next = joystickTouchStart(joystickGestureRef.current, touch, screenWidth);
    if (next === joystickGestureRef.current) return;
    publishJoystick(next);
  };

  const onJoystickTouchMove = (event: JoystickTouchEvent) => {
    const gesture = joystickGestureRef.current;
    if (gesture.activeId === null) return;
    const touch = joystickPointFromEvent(event, 'touches', gesture.activeId);
    if (!touch) return;
    publishJoystick(joystickTouchMove(gesture, touch));
  };

  const onJoystickTouchEnd = (event: JoystickTouchEvent) => {
    const gesture = joystickGestureRef.current;
    if (gesture.activeId === null) return;
    const touch = joystickPointFromEvent(event, 'changedTouches', gesture.activeId);
    if (!touch) return;
    if (gesture.dragged) suppressClickUntilRef.current = Date.now() + 400;
    publishJoystick(joystickTouchEnd(gesture, touch.identifier));
  };

  // Handle canvas click for voxel interaction
  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (Date.now() < suppressClickUntilRef.current) {
      suppressClickUntilRef.current = 0;
      return;
    }
    if (!rendererRef.current || !world) return;

    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const voxel = rendererRef.current.screenToVoxel(x, y);
    if (!voxel) return;

    // Find if there's a farm plot at this position
    const plot = world.farmPlots.find(p =>
      Math.floor(p.position.x) === voxel.x && Math.floor(p.position.y) === voxel.y
    );

    // Find vehicle
    const vehicle = world.vehicles.find(v =>
      Math.floor(v.position.x) === voxel.x && Math.floor(v.position.y) === voxel.y
    );

    const tree = world.woodSources?.find((source) =>
      Math.floor(source.position.x) === voxel.x && Math.floor(source.position.y) === voxel.y
    );
    if (tree && tree.health >= 50) {
      if (!checkTool(ToolType.AXE)) return;
      harvestWood(tree.id);
      const audio = AudioManager.getInstance();
      audio.playChopSound();
      audio.playPickupChime();
      return;
    }

    if (vehicle) {
      if (world.player.mountedVehicleId === vehicle.id) {
        dismountVehicle();
        setNotification('🚶 Dismounted');
      } else {
        mountVehicle(vehicle.id);
        setNotification(`🚜 Mounted ${vehicle.type}!`);
      }
      return;
    }

    if (plot) {
      handlePlotInteraction(plot);
    } else {
      handleEmptyVoxel(voxel);
    }
  };

  // Check tool availability
  const checkTool = (type: ToolType): boolean => {
    if (!world) return false;
    const tool = world.player.tools[type];
    if (!tool) {
      showNotification(`❌ No ${type} equipped!`);
      return false;
    }
    if (tool.durability <= 0) {
      showNotification(`❌ ${tool.name} is broken!`);
      return false;
    }
    return true;
  };

  const handlePlotInteraction = (plot: any) => {
    if (selectedAction === 'plant' && !plot.crop) {
      plantCrop(plot.id, selectedCropType);
      const cropInfo = CROP_TYPES[selectedCropType];
      showNotification(`🌱 Planted ${cropInfo.name}!`);
      addExperience(10);
      setSelectedAction(null);
    } else if (selectedAction === 'water' && plot.crop) {
      if (!checkTool(ToolType.WATERING_CAN)) return;
      waterCrop(plot.id);
      startWaterSplash();
      showNotification('💧 Watered crop!');
      addExperience(5);
      setSelectedAction(null);
    } else if (selectedAction === 'harvest' && plot.crop && plot.crop.stage === CropStage.HARVESTABLE) {
      const cropInfo = CROP_TYPES[selectedCropType];
      harvestCrop(plot.id);
      const audio = AudioManager.getInstance();
      audio.playScytheSound();
      audio.playHarvestPop();
      audio.playPickupChime();
      audio.playRegisterRattle();
      addCoins(cropInfo.sellValue);
      addExperience(25);
      showNotification(`🌾 Harvested ${plot.crop.type}! +${cropInfo.sellValue} coins!`);
      setSelectedAction(null);
    } else if (selectedAction === 'fertilize' && plot.tilled) {
      if (plot.fertilizerType) {
        showNotification('❌ Fertilizer already applied!');
        return;
      }

      // Find fertilizer in inventory
      const fertilizerItem = world?.player.inventory.find(i =>
        i.name.toLowerCase().includes(selectedFertilizerType) ||
        i.id.includes(selectedFertilizerType)
      );

      if (!fertilizerItem) {
        showNotification(`❌ No ${selectedFertilizerType} fertilizer!`);
        return;
      }

      applyFertilizer(
        { x: Math.floor(plot.position.x), y: Math.floor(plot.position.y) },
        selectedFertilizerType,
      );
      showNotification(`🩹 Applied ${selectedFertilizerType} fertilizer!`);
      setSelectedAction(null);
    } else if (plot.crop) {
      // Show crop info
      Alert.alert(
        'Crop Info',
        `Type: ${plot.crop.type}\nStage: ${CropStage[plot.crop.stage]}\nHealth: ${Math.round(plot.crop.health)}%\nWater: ${Math.round(plot.crop.waterLevel)}%`,
        [{ text: 'OK' }]
      );
    }
  };

  const handleEmptyVoxel = (voxel: { x: number; y: number }) => {
    if (selectedAction === 'build_road' && world) {
      const existingRoad = world.roads.find(r =>
        Math.floor(r.position.x) === voxel.x && Math.floor(r.position.y) === voxel.y
      );

      if (existingRoad) {
        upgradeRoad({ x: voxel.x, y: voxel.y });
        showNotification('✨ Road Upgraded!');
      } else {
        buildRoad({ x: voxel.x, y: voxel.y }, selectedRoadType, 1);
        showNotification(`🛣️ Built ${selectedRoadType} road!`);
        addExperience(5);
      }
      // Don't clear selectedAction so user can build multiple roads
    }
    else if (selectedAction === 'spawn_vehicle') {
      const cost = selectedVehicleType === 'tractor' ? 500 : 800;
      if (world && world.player.coins >= cost) {
        spawnVehicle(selectedVehicleType, { x: voxel.x, y: voxel.y, z: 0 });
        addCoins(-cost);
        AudioManager.getInstance().playRegisterRattle();
        setNotification(`🚜 Purchased ${selectedVehicleType}!`);
        setSelectedAction(null);
      } else {
        setNotification(`❌ Need ${cost} coins!`);
      }
    } else if (selectedAction === 'build') {
      const buildingInfo = BUILDING_TYPES[selectedBuildingType];
      if (world && world.player.coins < buildingInfo.cost) {
        showNotification(`❌ Not enough coins! Need ${buildingInfo.cost}`);
        return;
      }

      const newBuilding = {
        id: `building_${Date.now()}`,
        type: selectedBuildingType,
        position: { x: voxel.x, y: voxel.y, z: 0 },
        rotation: 0,
        unlocked: true,
        level: 1,
        spriteId: selectedBuildingType,
      };

      placeBuilding(newBuilding);
      addCoins(-buildingInfo.cost);
      AudioManager.getInstance().playRegisterRattle();
      addExperience(15);
      showNotification(`🏗️ Built ${buildingInfo.name}!`);
      setSelectedAction(null);
    } else if (selectedAction === 'mine') {
      createOreDeposit({ x: voxel.x, y: voxel.y }, 'copper', 1);
      showNotification('🌍 Created ore deposit!');
      setSelectedAction(null);
    } else if (selectedAction === 'plant') {
      // Plant action on empty soil -> Till
      if (!checkTool(ToolType.HOE)) return;
      createFarmPlot({ x: voxel.x, y: voxel.y });
      AudioManager.getInstance().playTillSound();
      showNotification('📍 Tilled soil!');
    }
  };

  const handleMining = () => {
    if (!world || world.oreDeposits.length === 0) {
      showNotification('❌ No ore deposits found!');
      return;
    }

    if (!checkTool(ToolType.PICKAXE)) return;

    const deposit = world.oreDeposits[Math.floor(Math.random() * world.oreDeposits.length)];
    if (deposit) {
      mineOre(deposit.id);
      const audio = AudioManager.getInstance();
      audio.playMineSound();
      audio.playPickupChime();
      audio.playRegisterRattle();
      addCoins(75);
      addExperience(20);
      showNotification(`⛏️ Mined ${deposit.oreType}! +75 coins`);
      setSelectedAction(null);
    }
  };

  // Camera controls
  const moveCamera = (dx: number, dy: number) => {
    if (rendererRef.current) {
      rendererRef.current.moveCamera(dx, dy, 0);
      setCameraOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
    }
  };

  const shipping = useEndOfDayShipping(world, advanceTime);

  if (!world) {
    return (
      <View style={styles.container}>
        <Text>Loading game...</Text>
      </View>
    );
  }

  const joystickRest = joystickRestPosition();
  const joystickSize = JOYSTICK_OUTER_RADIUS * 2;
  const staminaGauge = staminaGaugeView(world.player.stamina, world.player.maxStamina);
  const clockHud = clockHudView({
    season: world.season,
    dayTime: world.dayTime,
    day: world.totalDaysPlayed,
    coins: world.player.coins,
  });
  const hotbar = hotbarLayout(hotbarItemsFromPlayer(world.player), selectedHotbarSlot);

  return (
    <JoystickTouchRoot
      style={styles.gameContainer}
      onTouchStart={onJoystickTouchStart}
      onTouchMove={onJoystickTouchMove}
      onTouchEnd={onJoystickTouchEnd}
      onTouchCancel={onJoystickTouchEnd}
    >
      {showCrafting && (
        <CraftingMenu
          onClose={() => {
            AudioManager.getInstance().playMenuClick();
            setShowCrafting(false);
          }}
        />
      )}
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>🌾 Cozy Haven</Text>
          <Text style={styles.subtitle}>2.5D Isometric World</Text>
        </View>
        <View style={styles.headerAside}>
          <button
            type="button"
            data-cozy-audio-mute="true"
            aria-pressed={soundMuted}
            aria-label={soundMuted ? 'Unmute sound' : 'Mute sound'}
            onClick={toggleMute}
            style={{
              marginBottom: 8,
              padding: '6px 12px',
              borderRadius: 999,
              border: `2px solid ${theme.colors.cocoa}`,
              background: theme.colors.cream,
              color: theme.colors.cocoa,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {soundMuted ? '🔇 Unmute' : '🔊 Mute'}
          </button>
          <View style={styles.clockHud} accessibilityLabel="In-game clock">
            <Text style={styles.clockDate}>{clockHud.weekdayDate}</Text>
            <Text style={styles.clockSeason}>{clockHud.seasonBadge}</Text>
            <Text style={styles.clockTime}>{clockHud.clock}</Text>
            <Text style={styles.clockGold}>{clockHud.gold}</Text>
          </View>
          <View style={styles.statsContainer}>
            <View style={styles.statChip}>
              <Text style={styles.statText}>💰 {world.player.coins}</Text>
            </View>
            <View style={styles.statChip}>
              <Text style={styles.statText}>⭐ {world.player.level}</Text>
            </View>
            <View style={styles.statChip}>
              <Text style={styles.statText}>✨ {Math.floor(world.player.experience / 100)}</Text>
            </View>
          </View>
        </View>
      </View>

      {notification ? <Text style={styles.notification}>{notification}</Text> : null}

      {/* 3D Isometric Canvas */}
      <View style={styles.canvasContainer}>
        <canvas
          ref={canvasRef}
          width={SCREEN_WIDTH - 20}
          height={500}
          style={{
            border: '2px solid #8B4513',
            borderRadius: '12px',
            display: 'block',
            backgroundColor: '#87CEEB',
            cursor: 'crosshair'
          }}
          onClick={handleCanvasClick}
        />

        {/* Camera Controls */}
        <View style={styles.cameraControls}>
          <TouchableOpacity style={styles.cameraButton} onPress={() => moveCamera(0, -20)}>
            <Text style={styles.cameraArrow}>⬆️</Text>
          </TouchableOpacity>
          <View style={styles.cameraRow}>
            <TouchableOpacity style={styles.cameraButton} onPress={() => moveCamera(-20, 0)}>
              <Text style={styles.cameraArrow}>⬅️</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cameraButton} onPress={() => moveCamera(20, 0)}>
              <Text style={styles.cameraArrow}>➡️</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.cameraButton} onPress={() => moveCamera(0, 20)}>
            <Text style={styles.cameraArrow}>⬇️</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Action Buttons Row 1 */}
      <View style={styles.actionButtons}>
        <CozyIconButton
          emoji="🛣️"
          label="Road"
          isActive={selectedAction === 'build_road'}
          onPress={() => toggleAction('build_road')}
        />

        <CozyIconButton
          emoji="🚜"
          label="Vehicles"
          isActive={selectedAction === 'spawn_vehicle'}
          onPress={() => toggleAction('spawn_vehicle')}
        />
      </View>

      {/* Action Buttons Row 2 */}
      <View style={styles.actionButtons}>
        <CozyIconButton
          emoji="🌱"
          label="Plant"
          isActive={selectedAction === 'plant'}
          onPress={() => toggleAction('plant')}
          durability={world && world.player.tools[ToolType.HOE]
            ? world.player.tools[ToolType.HOE]!.durability / world.player.tools[ToolType.HOE]!.maxDurability
            : undefined}
        />

        <CozyIconButton
          emoji="💧"
          label="Water"
          isActive={selectedAction === 'water'}
          onPress={() => toggleAction('water')}
          durability={world && world.player.tools[ToolType.WATERING_CAN]
            ? world.player.tools[ToolType.WATERING_CAN]!.durability / world.player.tools[ToolType.WATERING_CAN]!.maxDurability
            : undefined}
        />

        <CozyIconButton
          emoji="🌾"
          label="Harvest"
          isActive={selectedAction === 'harvest'}
          onPress={() => toggleAction('harvest')}
        />

        <CozyIconButton
          emoji="🩹"
          label="Fertilize"
          isActive={selectedAction === 'fertilize'}
          onPress={() => toggleAction('fertilize')}
        />

        <CozyIconButton
          emoji="🏗️"
          label="Build"
          isActive={selectedAction === 'build'}
          onPress={() => toggleAction('build')}
        />

        <CozyIconButton
          emoji="⛏️"
          label="Mine"
          isActive={selectedAction === 'mine'}
          onPress={() => toggleAction('mine')}
          durability={world && world.player.tools[ToolType.PICKAXE]
            ? world.player.tools[ToolType.PICKAXE]!.durability / world.player.tools[ToolType.PICKAXE]!.maxDurability
            : undefined}
        />
      </View>

      {/* Selection Panels */}
      {selectedAction === 'plant' && (
        <View style={styles.selectionPanel}>
          <Text style={styles.selectionTitle}>Choose Crop:</Text>
          <View style={styles.selectionGrid}>
            {(Object.entries(CROP_TYPES) as Array<[keyof typeof CROP_TYPES, typeof CROP_TYPES.wheat]>).map(([cropType, cropInfo]) => (
              <TouchableOpacity
                key={cropType}
                style={[
                  styles.selectionOption,
                  selectedCropType === cropType && styles.selectionOptionSelected,
                ]}
                onPress={() => setSelectedCropType(cropType)}
              >
                <Text style={styles.selectionEmoji}>{cropInfo.emoji}</Text>
                <Text style={styles.selectionName}>{cropInfo.name}</Text>
                <Text style={styles.selectionDetails}>{cropInfo.growthDays}d • ${cropInfo.sellValue}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {selectedAction === 'fertilize' && (
        <View style={styles.selectionPanel}>
          <Text style={styles.selectionTitle}>Choose Fertilizer:</Text>
          <View style={styles.selectionGrid}>
            {(Object.entries(FERTILIZER_TYPES) as Array<[keyof typeof FERTILIZER_TYPES, typeof FERTILIZER_TYPES.speed]>).map(([fertType, fertInfo]) => {
              const count = world?.player.inventory.filter(i =>
                i.name.toLowerCase().includes(fertType) || i.id.includes(fertType)
              ).reduce((sum, i) => sum + i.quantity, 0) || 0;

              return (
                <TouchableOpacity
                  key={fertType}
                  style={[
                    styles.selectionOption,
                    selectedFertilizerType === fertType && styles.selectionOptionSelected,
                    count === 0 && styles.selectionOptionDisabled
                  ]}
                  onPress={() => setSelectedFertilizerType(fertType)}
                >
                  <Text style={styles.selectionEmoji}>{fertInfo.emoji}</Text>
                  <Text style={styles.selectionName}>{fertInfo.name}</Text>
                  <Text style={styles.selectionDetails}>{count > 0 ? `Have: ${count}` : 'Out of stock'}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      {selectedAction === 'build_road' && (
        <View style={styles.selectionPanel}>
          <Text style={styles.selectionTitle}>Choose Road Type:</Text>
          <View style={styles.selectionGrid}>
            <TouchableOpacity
              style={[
                styles.selectionOption,
                selectedRoadType === 'gravel' && styles.selectionOptionSelected,
              ]}
              onPress={() => setSelectedRoadType('gravel')}
            >
              <Text style={styles.selectionEmoji}>🟤</Text>
              <Text style={styles.selectionName}>Gravel Road</Text>
              <Text style={styles.selectionDetails}>Cheap</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.selectionOption,
                selectedRoadType === 'paved' && styles.selectionOptionSelected,
              ]}
              onPress={() => setSelectedRoadType('paved')}
            >
              <Text style={styles.selectionEmoji}>⬛</Text>
              <Text style={styles.selectionName}>Paved Road</Text>
              <Text style={styles.selectionDetails}>High Performance</Text>
            </TouchableOpacity>
          </View>
          <Text style={[styles.selectionDetails, { textAlign: 'center', marginTop: 10, fontStyle: 'italic' }]}>
            Tip: Click an existing road to upgrade it!
          </Text>
        </View>
      )}

      {selectedAction === 'spawn_vehicle' && (
        <View style={styles.selectionPanel}>
          <Text style={styles.selectionTitle}>Vehicle Shop (Click Map to Place):</Text>
          <View style={styles.selectionGrid}>
            <TouchableOpacity
              style={[
                styles.selectionOption,
                selectedVehicleType === 'tractor' && styles.selectionOptionSelected
              ]}
              onPress={() => setSelectedVehicleType('tractor')}
            >
              <Text style={styles.selectionEmoji}>🚜</Text>
              <Text style={styles.selectionName}>Tractor</Text>
              <Text style={styles.selectionDetails}>$500</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.selectionOption,
                selectedVehicleType === 'truck' && styles.selectionOptionSelected
              ]}
              onPress={() => setSelectedVehicleType('truck')}
            >
              <Text style={styles.selectionEmoji}>🚚</Text>
              <Text style={styles.selectionName}>Truck</Text>
              <Text style={styles.selectionDetails}>$800</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {selectedAction === 'build' && (
        <View style={styles.selectionPanel}>
          <Text style={styles.selectionTitle}>Choose Building:</Text>
          <View style={styles.selectionGrid}>
            {(Object.entries(BUILDING_TYPES) as Array<[keyof typeof BUILDING_TYPES, typeof BUILDING_TYPES.barn]>).map(([buildingType, buildingInfo]) => {
              const canAfford = world && world.player.coins >= buildingInfo.cost;
              return (
                <TouchableOpacity
                  key={buildingType}
                  style={[
                    styles.selectionOption,
                    selectedBuildingType === buildingType && styles.selectionOptionSelected,
                    !canAfford && styles.selectionOptionDisabled,
                  ]}
                  onPress={() => canAfford && setSelectedBuildingType(buildingType)}
                  disabled={!canAfford}
                >
                  <Text style={styles.selectionEmoji}>{buildingInfo.emoji}</Text>
                  <Text style={styles.selectionName}>{buildingInfo.name}</Text>
                  <Text style={styles.selectionDetails}>${buildingInfo.cost}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      {/* Crafting Button */}
      <TouchableOpacity
        style={[styles.saveButton, { backgroundColor: '#8FBC8F', marginBottom: 10 }]}
        onPress={() => {
          AudioManager.getInstance().playMenuClick();
          setShowCrafting(true);
        }}
      >
        <Text style={styles.saveText}>🔨 Craft & Upgrade</Text>
      </TouchableOpacity>

      {/* Save Button */}
      <TouchableOpacity style={styles.saveButton} onPress={onSave}>
        <Text style={styles.saveText}>💾 Save Game</Text>
      </TouchableOpacity>

      {/* Instructions */}
      <View style={styles.instructions}>
        <Text style={styles.instructionTitle}>🎮 How to Play:</Text>
        <Text style={styles.instructionText}>• Click on voxels to interact with them</Text>
        <Text style={styles.instructionText}>• Use arrow buttons to move camera</Text>
        <Text style={styles.instructionText}>• WASD or arrow keys walk across the farm</Text>
        <Text style={styles.instructionText}>• Keys 1-0, the scroll wheel, or a tap selects the hotbar</Text>
        <Text style={styles.instructionText}>• Drag the left half of the screen to walk</Text>
        <Text style={styles.instructionText}>• Select actions then click to place/build</Text>
        <Text style={styles.instructionText}>• Watch your crops grow in beautiful 3D!</Text>
      </View>

      <div
        ref={joystickRingRef}
        aria-hidden
        style={{
          position: 'fixed',
          left: joystickRest.left,
          bottom: joystickRest.bottom,
          width: joystickSize,
          height: joystickSize,
          borderRadius: JOYSTICK_OUTER_RADIUS,
          boxSizing: 'border-box',
          border: `3px solid ${theme.colors.cocoa}`,
          backgroundColor: 'rgba(253, 251, 247, 0.55)',
          zIndex: 30,
          pointerEvents: 'none',
          touchAction: 'none',
        }}
      >
        <div
          ref={joystickNubRef}
          style={{
            position: 'absolute',
            left: JOYSTICK_OUTER_RADIUS - JOYSTICK_INNER_RADIUS,
            top: JOYSTICK_OUTER_RADIUS - JOYSTICK_INNER_RADIUS,
            width: JOYSTICK_INNER_RADIUS * 2,
            height: JOYSTICK_INNER_RADIUS * 2,
            borderRadius: JOYSTICK_INNER_RADIUS,
            boxSizing: 'border-box',
            border: `2px solid ${theme.colors.cocoa}`,
            backgroundColor: theme.colors.sage,
            pointerEvents: 'none',
          }}
        />
      </div>

      <style>{STAMINA_PULSE_CSS}</style>
      <div
        aria-label="Stamina"
        style={{
          position: 'fixed',
          right: 16,
          bottom: 16,
          width: staminaGauge.width,
          height: staminaGauge.height,
          zIndex: 30,
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            width: staminaGauge.width,
            height: staminaGauge.height,
            borderRadius: staminaGauge.borderRadius,
            overflow: 'hidden',
            backgroundColor: 'rgba(93, 64, 55, 0.28)',
            boxSizing: 'border-box',
          }}
        >
          <div
            className={staminaGauge.pulseClass || undefined}
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              height: staminaGauge.fillHeight,
              backgroundColor: staminaGauge.color,
              borderRadius: staminaGauge.borderRadius,
              ...staminaGauge.pulseStyle,
            }}
          />
        </div>
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%) rotate(-90deg)',
            color: theme.colors.cream,
            fontSize: 12,
            fontWeight: 700,
            whiteSpace: 'nowrap',
            textShadow: '0 1px 2px rgba(0,0,0,0.7)',
          }}
        >
          {staminaGauge.label}
        </div>
      </div>

      <div
        aria-label="Hotbar"
        style={{
          position: 'fixed',
          left: '50%',
          bottom: 12,
          transform: 'translateX(-50%)',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          gap: hotbar.gap,
          maxWidth: 'calc(100% - 24px)',
          overflowX: 'auto',
          zIndex: 25,
          pointerEvents: 'auto',
        }}
      >
        {hotbar.slots.map((slot) => (
          <button
            key={slot.index}
            type="button"
            aria-label={slot.accessibilityLabel}
            aria-pressed={slot.selected}
            onClick={() => setSelectedHotbarSlot(selectHotbarSlot(slot.index))}
            style={{
              width: slot.size,
              height: slot.size,
              padding: 0,
              margin: 0,
              boxSizing: 'border-box',
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              borderRadius: 8,
              border: `2px solid ${slot.borderColor}`,
              background: theme.colors.glassBg,
              boxShadow: slot.selected ? `0 0 10px ${slot.borderColor}` : theme.shadows.crisp,
              cursor: 'pointer',
            }}
          >
            <span
              aria-hidden
              style={{
                position: 'absolute',
                top: 1,
                left: 3,
                fontSize: 9,
                fontWeight: 700,
                lineHeight: '10px',
                color: theme.colors.cocoa,
                opacity: 0.75,
              }}
            >
              {slot.keyLabel}
            </span>
            {slot.icon ? (
              <span aria-hidden style={{ fontSize: 22, lineHeight: '24px' }}>{slot.icon}</span>
            ) : null}
            {slot.quantityLabel !== null ? (
              <span
                aria-hidden
                style={{
                  position: 'absolute',
                  right: 2,
                  bottom: slot.meter ? 6 : 1,
                  fontSize: 10,
                  fontWeight: 700,
                  lineHeight: '12px',
                  color: theme.colors.cocoa,
                  textShadow: '0 0 2px #fff',
                }}
              >
                {slot.quantityLabel}
              </span>
            ) : null}
            {slot.meter ? (
              <span
                aria-hidden
                style={{
                  position: 'absolute',
                  left: 4,
                  right: 4,
                  bottom: 3,
                  height: 4,
                  borderRadius: 2,
                  background: 'rgba(93, 64, 55, 0.18)',
                  overflow: 'hidden',
                }}
              >
                <span
                  style={{
                    display: 'block',
                    height: '100%',
                    width: slot.meter.width,
                    background: slot.meter.color,
                  }}
                />
              </span>
            ) : null}
          </button>
        ))}
      </div>
      <ShippingSummaryModal
        visible={shipping.open}
        rows={shipping.rows}
        onContinue={shipping.onContinue}
      />
      {dialogue ? (
        <DialogueBox
          speaker={dialogue.speaker}
          line={dialogue.line}
          expression={dialogue.expression}
          options={dialogue.options}
          onContinue={dialogue.onContinue}
          onSelectOption={dialogue.onSelectOption}
        />
      ) : null}
    </JoystickTouchRoot>
  );
};

const styles = StyleSheet.create({
  gameContainer: {
    flex: 1,
    backgroundColor: theme.colors.cream,
    padding: 10,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.cream,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 15,
    marginBottom: 10,
  },
  titleContainer: {
    flexDirection: 'column',
  },
  title: {
    fontSize: 28,
    fontWeight: theme.typography.weights.bold as any,
    color: theme.colors.sage,
    textShadowColor: 'rgba(0,0,0,0.1)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.cocoa,
    opacity: 0.7,
    marginTop: 2,
    fontFamily: theme.typography.fontFamily,
  },
  headerAside: {
    alignItems: 'flex-end',
  },
  clockHud: {
    backgroundColor: theme.colors.cocoa,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: theme.colors.clay,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  clockDate: {
    color: theme.colors.cream,
    fontSize: 13,
    fontWeight: '600',
  },
  clockSeason: {
    color: theme.colors.cream,
    fontSize: 13,
    marginTop: 2,
  },
  clockTime: {
    color: theme.colors.cream,
    fontSize: 20,
    fontWeight: '700',
    marginTop: 2,
  },
  clockGold: {
    color: theme.colors.cream,
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  statChip: {
    backgroundColor: theme.colors.glassBg,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: theme.borderRadius.l,
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  statText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.cocoa,
  },
  notification: {
    position: 'absolute',
    top: 90,
    alignSelf: 'center',
    zIndex: 100,
    backgroundColor: theme.colors.glassBg,
    color: theme.colors.cocoa,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: theme.borderRadius.xl,
    borderWidth: 1,
    borderColor: theme.colors.success,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: 'bold',
    overflow: 'hidden',
    shadowColor: theme.colors.sage,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  canvasContainer: {
    position: 'relative',
    marginVertical: 10,
    alignItems: 'center',
    borderRadius: theme.borderRadius.m,
    overflow: 'hidden',
    borderWidth: 4,
    borderColor: theme.colors.cream,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  cameraControls: {
    position: 'absolute',
    right: 15,
    top: 15,
    backgroundColor: theme.colors.glassBg,
    borderRadius: theme.borderRadius.m,
    padding: 8,
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
  },
  cameraRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 2,
  },
  cameraButton: {
    width: 36,
    height: 36,
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: theme.borderRadius.s,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 2,
  },
  cameraArrow: {
    fontSize: 18,
    color: theme.colors.cocoa,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: 10,
    gap: 12,
    paddingHorizontal: 10,
  },
  selectionPanel: {
    backgroundColor: theme.colors.glassBg,
    borderRadius: theme.borderRadius.l,
    padding: 20,
    marginVertical: 10,
    marginHorizontal: 10,
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  selectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.cocoa,
    marginBottom: 15,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  selectionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
  },
  selectionOption: {
    width: '30%',
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderRadius: theme.borderRadius.m,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  selectionOptionSelected: {
    backgroundColor: 'white',
    borderColor: theme.colors.sage,
    borderWidth: 2,
    shadowColor: theme.colors.sage,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  selectionOptionDisabled: {
    opacity: 0.5,
    backgroundColor: '#eee',
  },
  selectionEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  selectionName: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.cocoa,
    marginBottom: 4,
    textAlign: 'center',
  },
  selectionDetails: {
    fontSize: 11,
    color: theme.colors.cocoa,
    opacity: 0.7,
    textAlign: 'center',
  },
  saveButton: {
    backgroundColor: theme.colors.clay,
    padding: 15,
    borderRadius: theme.borderRadius.xl,
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 5,
    shadowColor: theme.colors.clay,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  saveText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  instructionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.colors.cocoa,
    marginBottom: 5,
  },
  instructions: {
    marginTop: 20,
    padding: 15,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: theme.borderRadius.m,
  },
  instructionText: {
    fontSize: 12,
    color: theme.colors.cocoa,
    marginVertical: 2,
  },
});
