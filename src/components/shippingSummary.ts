import type { ShippedTodayEntry } from '../types/game';

/** 6:00 AM. New games start here, and end-of-day Continue lands here. */
export const SUNRISE_MINUTE = 360;
export const DAY_MINUTES = 1440;
/** Last hour before the midnight day roll, while shippedToday is still this day's list. */
export const END_OF_DAY_MINUTE = 23 * 60;

export const EMPTY_SHIPMENT_TALLY = 'Nothing shipped today.';

export function normalizeDayTime(dayTime: number): number {
  if (!Number.isFinite(dayTime)) return 0;
  const wrapped = dayTime % DAY_MINUTES;
  return wrapped < 0 ? wrapped + DAY_MINUTES : wrapped;
}

export function isEndOfDay(dayTime: number): boolean {
  return normalizeDayTime(dayTime) >= END_OF_DAY_MINUTE;
}

/**
 * Minutes advanceTime needs to reach the next 6:00 AM.
 * At or after sunrise this crosses midnight, so the day rolls and the ledger clears.
 * After midnight and before 6:00 AM the day has already rolled, so this only reaches sunrise.
 */
export function minutesUntilNextSunrise(dayTime: number): number {
  const current = normalizeDayTime(dayTime);
  if (current < SUNRISE_MINUTE) return SUNRISE_MINUTE - current;
  return (DAY_MINUTES - current) + SUNRISE_MINUTE;
}

export function continueEndOfDay(
  dayTime: number,
  advanceTime: (minutes: number) => void,
): void {
  advanceTime(minutesUntilNextSunrise(dayTime));
}

export function shipmentGoldTotal(
  rows: readonly { gold: number }[] | null | undefined,
): number {
  if (!rows) return 0;
  return rows.reduce((sum, row) => sum + (Number.isFinite(row.gold) ? row.gold : 0), 0);
}

export function formatShipmentGold(gold: number): string {
  if (!Number.isFinite(gold)) return '0';
  const rounded = Math.round(gold * 100) / 100;
  return rounded.toLocaleString('en-US');
}

export interface ShippingSummaryLine {
  name: string;
  quantity: number;
  gold: number;
  label: string;
}

export interface ShippingSummaryView {
  lines: ShippingSummaryLine[];
  total: number;
  empty: boolean;
}

/** Item lines plus a total equal to the sum of row gold. An empty list stays empty. */
export function shippingSummaryView(
  rows: readonly ShippedTodayEntry[] | null | undefined,
): ShippingSummaryView {
  const list = rows ?? [];
  const lines = list.map((row) => ({
    name: row.name,
    quantity: row.quantity,
    gold: row.gold,
    label: `${row.quantity}x ${row.name}  +${formatShipmentGold(row.gold)}g`,
  }));
  return {
    lines,
    total: shipmentGoldTotal(list),
    empty: lines.length === 0,
  };
}

export function shippingTotalLabel(
  rows: readonly ShippedTodayEntry[] | null | undefined,
): string {
  return `Total: +${formatShipmentGold(shipmentGoldTotal(rows))}g`;
}

type MatchMedia = (query: string) => { matches?: boolean };

export function prefersReducedMotion(): boolean {
  const host = globalThis as { matchMedia?: MatchMedia };
  if (typeof host.matchMedia !== 'function') return false;
  return host.matchMedia('(prefers-reduced-motion: reduce)').matches === true;
}

/** One step of the total. Reduced motion jumps straight to the final number. */
export function nextRollingTotal(
  current: number,
  target: number,
  reducedMotion: boolean,
): number {
  if (reducedMotion || !Number.isFinite(target)) return target;
  if (!Number.isFinite(current) || current === target) return target;
  const delta = target - current;
  const step = Math.max(1, Math.abs(delta) / 20);
  const next = current + Math.sign(delta) * Math.min(step, Math.abs(delta));
  if (Math.abs(target - next) < 0.01) return target;
  return next;
}

export function rollingDisplayTotal(
  current: number,
  target: number,
  reducedMotion = prefersReducedMotion(),
): number {
  return nextRollingTotal(current, target, reducedMotion);
}
