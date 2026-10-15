/**
 * Tension-bar catching mini-game: the physics behind the fishing catch.
 *
 * Pure and frame-based. One call to stepFishingMinigame is one 60 Hz frame, so the
 * constants are per-frame values, as the design states them. The modal feeds it fixed
 * steps. Coordinates are screen pixels inside the cylinder, with y growing downward.
 */

/** Height of the catching cylinder, px. */
export const FISHING_CYLINDER_HEIGHT = 300;
/** Height of the green catch bar, px. The design leaves it open, so it is a fifth of the cylinder. */
export const FISHING_BAR_HEIGHT = 60;
/** Downward acceleration of the bar, px per frame squared. */
export const FISHING_GRAVITY = 0.4;
/** Upward acceleration while the pointer is held, px per frame squared. */
export const FISHING_THRUST = -0.8;
/** Share of the bar's speed kept after it bounces off the top or bottom bound. */
export const FISHING_BOUNCE_DAMPING = 0.5;
/** Largest random step the fish target takes each frame, px. */
export const FISH_WANDER_STEP = 8;
/** Share of the gap to the fish target closed each frame. Keeps the darting smooth. */
export const FISH_EASE = 0.1;
/** Fish sprite size, px. The fish centre stays half a sprite from each end of the cylinder. */
export const FISH_SIZE = 28;
/** Catch progress gained per frame while the fish is inside the bar, in percent. */
export const FISHING_PROGRESS_GAIN = 0.5;
/** Catch progress lost per frame while the fish is outside the bar, in percent. */
export const FISHING_PROGRESS_LOSS = 0.3;
/** Catch progress when the fish first bites, in percent. Leaves room to recover from a slow start. */
export const FISHING_PROGRESS_START = 30;
/** Simulated time per frame, in seconds. */
export const FISHING_FRAME_SECONDS = 1 / 60;

export type FishingStatus = 'playing' | 'caught' | 'escaped';

export interface FishingMinigameState {
  /** Top edge of the green bar, px from the top of the cylinder. */
  barTop: number;
  /** Bar speed, px per frame. Positive moves the bar down. */
  barVelocity: number;
  /** Where the fish is swimming toward. A Brownian walk moves it. */
  fishTargetY: number;
  /** Fish centre, px from the top of the cylinder. */
  fishY: number;
  /** Catch progress, 0 to 100. */
  progress: number;
  status: FishingStatus;
}

/** Random source in [0, 1). Injected so a session can be replayed in tests. */
export type FishingRandom = () => number;

const FISH_MIN_Y = FISH_SIZE / 2;
const FISH_MAX_Y = FISHING_CYLINDER_HEIGHT - FISH_SIZE / 2;
const BAR_MAX_TOP = FISHING_CYLINDER_HEIGHT - FISHING_BAR_HEIGHT;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** A new game: bar centred, fish mid-column, progress at its starting value. */
export function createFishingMinigame(random: FishingRandom = Math.random): FishingMinigameState {
  return {
    barTop: BAR_MAX_TOP / 2,
    barVelocity: 0,
    fishTargetY: FISH_MIN_Y + random() * (FISH_MAX_Y - FISH_MIN_Y),
    fishY: FISHING_CYLINDER_HEIGHT / 2,
    progress: FISHING_PROGRESS_START,
    status: 'playing',
  };
}

/**
 * Advance one frame. Gravity always pulls the bar down, and holding adds thrust upward.
 * Hitting the top or bottom reflects the bar with damping. The fish target takes a random
 * step, and the fish eases toward it. Progress rises while the fish sits inside the bar and
 * falls otherwise. Reaching 100 catches the fish, and reaching 0 loses it. A resolved game
 * is returned unchanged.
 */
export function stepFishingMinigame(
  state: FishingMinigameState,
  holding: boolean,
  random: FishingRandom = Math.random,
): FishingMinigameState {
  if (state.status !== 'playing') return state;

  let barVelocity = state.barVelocity + FISHING_GRAVITY + (holding ? FISHING_THRUST : 0);
  let barTop = state.barTop + barVelocity;
  if (barTop < 0) {
    barTop = 0;
    barVelocity = -barVelocity * FISHING_BOUNCE_DAMPING;
  } else if (barTop > BAR_MAX_TOP) {
    barTop = BAR_MAX_TOP;
    barVelocity = -barVelocity * FISHING_BOUNCE_DAMPING;
  }

  const wandered = state.fishTargetY + (random() * 2 - 1) * FISH_WANDER_STEP;
  const fishTargetY = clamp(wandered, FISH_MIN_Y, FISH_MAX_Y);
  const fishY = state.fishY + (fishTargetY - state.fishY) * FISH_EASE;

  const inside = fishY >= barTop && fishY <= barTop + FISHING_BAR_HEIGHT;
  const progress = clamp(
    state.progress + (inside ? FISHING_PROGRESS_GAIN : -FISHING_PROGRESS_LOSS),
    0,
    100,
  );
  const status: FishingStatus = progress >= 100 ? 'caught' : progress <= 0 ? 'escaped' : 'playing';

  return { barTop, barVelocity, fishTargetY, fishY, progress, status };
}

/** Title for the overlay. While the fish is on the line it names the fish. */
export function fishingHeadline(status: FishingStatus, fishName: string): string {
  switch (status) {
    case 'caught': return 'Catch!';
    case 'escaped': return 'The fish got away...';
    case 'playing':
    default: return `Hooked a ${fishName}!`;
  }
}

/** Species id to the name shown to the player, such as 'bass' to 'Bass'. */
export function fishDisplayName(fishType: string): string {
  return fishType.charAt(0).toUpperCase() + fishType.slice(1);
}
