import type { NewGameOptions, PlayerAppearance } from '../types/game';

/** Six skin tones, lightest first. */
export const SKIN_TONES = ['#FCE4CC', '#F6CBA3', '#E8A97A', '#C98A5B', '#9C6240', '#6B4228'] as const;

/** Eight hair styles. The id is what gets saved; the label is what the player sees. */
export const HAIR_STYLES = [
  { id: 'short', label: 'Short' },
  { id: 'long', label: 'Long' },
  { id: 'curly', label: 'Curly' },
  { id: 'bun', label: 'Bun' },
  { id: 'bob', label: 'Bob' },
  { id: 'braid', label: 'Braid' },
  { id: 'spiky', label: 'Spiky' },
  { id: 'buzz', label: 'Buzz' },
] as const;

export const HAIR_COLORS = ['#3B2A1E', '#8A5A2B', '#E0B25C', '#B4502F', '#2B2B2B', '#D9D4CC'] as const;

export const SHIRT_COLORS = ['#D9534F', '#4A90C2', '#5CB85C', '#F0AD4E', '#9B59B6', '#F4F1EA'] as const;

export const PANTS_COLORS = ['#5D4037', '#34495E', '#7F8C8D', '#2E4A2E', '#8B6F47', '#3E3E3E'] as const;

export const DEFAULT_APPEARANCE: PlayerAppearance = {
  skinTone: SKIN_TONES[1],
  hairStyle: 'short',
  hairColor: HAIR_COLORS[0],
  shirtColor: SHIRT_COLORS[1],
  pantsColor: PANTS_COLORS[1],
};

export const DEFAULT_PLAYER_NAME = 'Player';
export const DEFAULT_FARM_NAME = 'My Farm';
export const MAX_PLAYER_NAME_LENGTH = 20;
export const MAX_FARM_NAME_LENGTH = 24;
export const MAX_FAVORITE_ANIMAL_LENGTH = 20;

/** The customizer form before it is turned into createNewGame arguments. */
export interface NewGameDraft {
  playerName: string;
  farmName: string;
  favoriteAnimal: string;
  appearance: PlayerAppearance;
}

/** Collapses runs of whitespace, caps the length, then trims. Blank input returns ''. */
export function cleanText(value: string, maxLength: number): string {
  return value.replace(/\s+/g, ' ').slice(0, maxLength).trim();
}

function pickFrom(options: readonly string[], value: unknown, fallback: string): string {
  return typeof value === 'string' && options.includes(value) ? value : fallback;
}

/** Keeps palette values only. Anything unknown falls back to the default look. */
export function sanitizeAppearance(value: Partial<PlayerAppearance> | null | undefined): PlayerAppearance {
  return {
    skinTone: pickFrom(SKIN_TONES, value?.skinTone, DEFAULT_APPEARANCE.skinTone),
    hairStyle: pickFrom(
      HAIR_STYLES.map((style) => style.id),
      value?.hairStyle,
      DEFAULT_APPEARANCE.hairStyle,
    ),
    hairColor: pickFrom(HAIR_COLORS, value?.hairColor, DEFAULT_APPEARANCE.hairColor),
    shirtColor: pickFrom(SHIRT_COLORS, value?.shirtColor, DEFAULT_APPEARANCE.shirtColor),
    pantsColor: pickFrom(PANTS_COLORS, value?.pantsColor, DEFAULT_APPEARANCE.pantsColor),
  };
}

/** Turns the customizer form into createNewGame arguments. Blank names take the defaults. */
export function resolveNewGame(draft: NewGameDraft): { playerName: string; options: NewGameOptions } {
  const favoriteAnimal = cleanText(draft.favoriteAnimal, MAX_FAVORITE_ANIMAL_LENGTH);
  return {
    playerName: cleanText(draft.playerName, MAX_PLAYER_NAME_LENGTH) || DEFAULT_PLAYER_NAME,
    options: {
      farmName: cleanText(draft.farmName, MAX_FARM_NAME_LENGTH) || DEFAULT_FARM_NAME,
      ...(favoriteAnimal ? { favoriteAnimal } : {}),
      appearance: sanitizeAppearance(draft.appearance),
    },
  };
}
