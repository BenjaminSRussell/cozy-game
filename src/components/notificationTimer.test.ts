import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  clearNotificationTimer,
  scheduleNotificationHide,
  type NotificationTimerId,
} from './notificationTimer';

describe('notification timer', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('resets the timer on rapid successive calls so only the latest hide runs', () => {
    vi.useFakeTimers();
    const hidden: string[] = [];
    let current: NotificationTimerId = null;

    current = scheduleNotificationHide(current, () => hidden.push('first'), 2000);
    current = scheduleNotificationHide(current, () => hidden.push('second'), 2000);

    expect(vi.getTimerCount()).toBe(1);
    vi.advanceTimersByTime(1999);
    expect(hidden).toEqual([]);
    vi.advanceTimersByTime(1);
    expect(hidden).toEqual(['second']);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('does not hide after clear, which is the unmount path before 2s', () => {
    vi.useFakeTimers();
    const hidden: string[] = [];
    const current = scheduleNotificationHide(null, () => hidden.push('late'), 2000);

    clearNotificationTimer(current);
    vi.advanceTimersByTime(2000);

    expect(hidden).toEqual([]);
    expect(vi.getTimerCount()).toBe(0);
  });
});
