import { describe, expect, it } from 'vitest';
import {
  DEFAULT_APPEARANCE,
  DEFAULT_FARM_NAME,
  DEFAULT_PLAYER_NAME,
  HAIR_COLORS,
  HAIR_STYLES,
  MAX_FARM_NAME_LENGTH,
  MAX_PLAYER_NAME_LENGTH,
  PANTS_COLORS,
  SHIRT_COLORS,
  SKIN_TONES,
  cleanText,
  resolveNewGame,
  sanitizeAppearance,
  type NewGameDraft,
} from './characterAppearance';

const blank: NewGameDraft = {
  playerName: '',
  farmName: '',
  favoriteAnimal: '',
  appearance: { ...DEFAULT_APPEARANCE },
};

describe('character customizer palettes', () => {
  it('offers six skin tones, eight hair styles and six colors for each color picker', () => {
    expect(SKIN_TONES).toHaveLength(6);
    expect(HAIR_STYLES).toHaveLength(8);
    expect(new Set(HAIR_STYLES.map((style) => style.id)).size).toBe(8);
    expect(HAIR_COLORS).toHaveLength(6);
    expect(SHIRT_COLORS).toHaveLength(6);
    expect(PANTS_COLORS).toHaveLength(6);
  });

  it('starts from a look made only of palette values', () => {
    expect(sanitizeAppearance(DEFAULT_APPEARANCE)).toEqual(DEFAULT_APPEARANCE);
    expect(SKIN_TONES).toContain(DEFAULT_APPEARANCE.skinTone);
    expect(HAIR_COLORS).toContain(DEFAULT_APPEARANCE.hairColor);
    expect(SHIRT_COLORS).toContain(DEFAULT_APPEARANCE.shirtColor);
    expect(PANTS_COLORS).toContain(DEFAULT_APPEARANCE.pantsColor);
  });
});

describe('sanitizeAppearance', () => {
  it('replaces unknown values with the default look and keeps valid ones', () => {
    expect(sanitizeAppearance(undefined)).toEqual(DEFAULT_APPEARANCE);
    const mixed = sanitizeAppearance({ ...DEFAULT_APPEARANCE, skinTone: '#123456', hairStyle: 'mohawk' });
    expect(mixed).toEqual(DEFAULT_APPEARANCE);
    expect(sanitizeAppearance({ hairStyle: 'buzz' }).hairStyle).toBe('buzz');
  });
});

describe('cleanText', () => {
  it('collapses spaces, caps the length and trims the result', () => {
    expect(cleanText('  Ren   the  Great  ', 20)).toBe('Ren the Great');
    expect(cleanText('abc def', 4)).toBe('abc');
    expect(cleanText('   ', 5)).toBe('');
  });
});

describe('resolveNewGame', () => {
  it('uses the default names when the name fields are blank', () => {
    const { playerName, options } = resolveNewGame(blank);
    expect(playerName).toBe(DEFAULT_PLAYER_NAME);
    expect(options.farmName).toBe(DEFAULT_FARM_NAME);
    expect(options).not.toHaveProperty('favoriteAnimal');
    expect(options.appearance).toEqual(DEFAULT_APPEARANCE);
  });

  it('trims the names, caps their length and keeps the favorite animal', () => {
    const { playerName, options } = resolveNewGame({
      ...blank,
      playerName: '  Ren   the Great of the Valley  ',
      farmName: `  River    Bend ${'x'.repeat(40)}  `,
      favoriteAnimal: '  Goat  ',
    });
    expect(playerName).toBe('Ren the Great of th');
    expect(playerName.length).toBeLessThanOrEqual(MAX_PLAYER_NAME_LENGTH);
    expect(options.farmName?.startsWith('River Bend ')).toBe(true);
    expect(options.farmName?.length ?? 0).toBeLessThanOrEqual(MAX_FARM_NAME_LENGTH);
    expect(options.favoriteAnimal).toBe('Goat');
  });
});
