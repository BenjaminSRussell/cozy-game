export type NotificationTimerId = ReturnType<typeof setTimeout> | null;

export function scheduleNotificationHide(
  current: NotificationTimerId,
  hide: () => void,
  durationMs: number,
): NotificationTimerId {
  if (current) clearTimeout(current);
  return setTimeout(hide, durationMs);
}

export function clearNotificationTimer(current: NotificationTimerId): void {
  if (current) clearTimeout(current);
}
