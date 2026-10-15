import type { LocalSaveSlot } from '../systems/PersistenceManager';

/**
 * The slot Continue opens: the occupied slot saved most recently.
 * Returns null when no slot holds a save, which leaves Continue disabled.
 */
export function pickContinueSlot(cards: ReadonlyArray<LocalSaveSlot | null>): LocalSaveSlot | null {
  let best: LocalSaveSlot | null = null;
  for (const card of cards) {
    if (!card?.worldId) continue;
    if (!best || (card.savedAt ?? 0) > (best.savedAt ?? 0)) best = card;
  }
  return best;
}
