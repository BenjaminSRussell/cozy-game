import type { Building } from '../types/game';

/** Building type of the farmhouse. Walking up to it offers a night in bed. */
export const FARMHOUSE_TYPE = 'farmhouse';

/** Stage of the bed sequence. Only one stage is up at a time. */
export type BedStage = 'idle' | 'prompt' | 'fading' | 'summary';

/** Length of the fade-to-black before the day rolls. */
export const BED_FADE_MS = 500;

/**
 * The starting farmhouse: a solid one-tile building whose tile is the bed.
 * Clear of the starting player at (50, 50) and the garage at (55, 45).
 */
export function createStartingFarmhouse(): Building {
  return {
    id: 'starting_farmhouse',
    type: FARMHOUSE_TYPE,
    position: { x: 47, y: 47, z: 0 },
    rotation: 0,
    unlocked: true,
    level: 1,
    // house.svg is the closest existing art. The farmhouse has no sprite of its own yet.
    spriteId: 'building_house',
  };
}

/** The farmhouse, or undefined on a save made before it existed. */
export function findFarmhouse(buildings: readonly Building[] | null | undefined): Building | undefined {
  return buildings?.find((building) => building.type === FARMHOUSE_TYPE);
}

/**
 * True when the player's tile is the farmhouse tile or touches it, diagonals included.
 * The farmhouse is solid, so the player meets it from one of these tiles.
 */
export function isNextToFarmhouse(
  player: { x: number; y: number },
  farmhouse: Pick<Building, 'position'>,
): boolean {
  return (
    Math.abs(Math.floor(player.x) - Math.floor(farmhouse.position.x)) <= 1
    && Math.abs(Math.floor(player.y) - Math.floor(farmhouse.position.y)) <= 1
  );
}
