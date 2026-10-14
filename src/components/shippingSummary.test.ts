import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ShippedTodayEntry } from '../types/game';
import {
  EMPTY_SHIPMENT_TALLY,
  continueEndOfDay,
  minutesUntilNextSunrise,
  prefersReducedMotion,
  rollingDisplayTotal,
  shipmentGoldTotal,
  shippingSummaryView,
  shippingTotalLabel,
} from './shippingSummary';

const rows: ShippedTodayEntry[] = [
  { name: 'Wheat', quantity: 2, gold: 30 },
  { name: 'Milk (silver)', quantity: 1, gold: 125 },
];

describe('shipping summary modal', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sets the total to the sum of row gold', () => {
    const view = shippingSummaryView(rows);
    const sum = rows.reduce((total, row) => total + row.gold, 0);

    expect(view.lines).toHaveLength(rows.length);
    expect(shipmentGoldTotal(rows)).toBe(sum);
    expect(view.total).toBe(sum);
    expect(view.lines.reduce((total, line) => total + line.gold, 0)).toBe(view.total);
    expect(shippingTotalLabel(rows)).toBe(`Total: +${sum}g`);
    expect(view.lines[0].label).toContain('Wheat');
    expect(view.lines[0].label).toContain('30');
    expect(view.lines[1].label).toContain('125');
    expect(view.empty).toBe(false);
  });

  it('shows an empty tally instead of sample shipment lines', () => {
    const view = shippingSummaryView([]);

    expect(view.empty).toBe(true);
    expect(view.lines).toEqual([]);
    expect(view.total).toBe(0);
    expect(shippingTotalLabel([])).toBe('Total: +0g');
    expect(shippingTotalLabel(undefined)).toBe('Total: +0g');
    expect(EMPTY_SHIPMENT_TALLY).not.toMatch(/tomato|ruby|bass/i);
    expect(JSON.stringify(view)).not.toMatch(/tomato|ruby|bass/i);
  });

  it('jumps the rolling total to the final sum when reduced motion is set', () => {
    const sum = shipmentGoldTotal(rows);
    vi.stubGlobal('matchMedia', () => ({ matches: true }));

    expect(prefersReducedMotion()).toBe(true);
    expect(rollingDisplayTotal(0, sum)).toBe(sum);

    vi.stubGlobal('matchMedia', () => ({ matches: false }));
    expect(prefersReducedMotion()).toBe(false);
    expect(rollingDisplayTotal(0, sum)).toBeLessThan(sum);
    expect(rollingDisplayTotal(0, sum)).toBeGreaterThan(0);
  });

  it('continues by advancing to the next sunrise', () => {
    const calls: number[] = [];
    expect(minutesUntilNextSunrise(23 * 60)).toBe(420);
    continueEndOfDay(23 * 60, (minutes) => calls.push(minutes));
    expect(calls).toEqual([420]);
  });
});
