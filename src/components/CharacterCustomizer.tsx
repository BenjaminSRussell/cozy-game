import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import {
  DEFAULT_APPEARANCE,
  DEFAULT_FARM_NAME,
  DEFAULT_PLAYER_NAME,
  HAIR_COLORS,
  HAIR_STYLES,
  MAX_FARM_NAME_LENGTH,
  MAX_FAVORITE_ANIMAL_LENGTH,
  MAX_PLAYER_NAME_LENGTH,
  PANTS_COLORS,
  SHIRT_COLORS,
  SKIN_TONES,
  resolveNewGame,
  type NewGameDraft,
} from '../systems/characterAppearance';
import type { NewGameOptions, PlayerAppearance } from '../types/game';

export interface CharacterCustomizerProps {
  onStart: (start: { playerName: string; options: NewGameOptions }) => void;
  onCancel: () => void;
}

/** Flat figure built from views so each pick shows at once. Stands in for the final sprite. */
function AppearancePreview({ appearance }: { appearance: PlayerAppearance }) {
  const hair = appearance.hairStyle;
  const longHair = hair === 'long' || hair === 'bob' || hair === 'curly';
  const hairTopHeight = hair === 'buzz' ? 8 : hair === 'long' || hair === 'curly' || hair === 'bob' ? 20 : 16;
  return (
    <View style={styles.preview} accessible accessibilityLabel="Character preview">
      {longHair ? <View style={[styles.hairBack, { backgroundColor: appearance.hairColor }]} /> : null}
      <View style={[styles.head, { backgroundColor: appearance.skinTone }]} />
      <View style={[styles.hairTop, { backgroundColor: appearance.hairColor, height: hairTopHeight }]} />
      {hair === 'bun' ? <View style={[styles.bun, { backgroundColor: appearance.hairColor }]} /> : null}
      <View style={[styles.shirt, { backgroundColor: appearance.shirtColor }]} />
      <View style={[styles.pants, { backgroundColor: appearance.pantsColor }]} />
    </View>
  );
}

interface SwatchRowProps {
  label: string;
  prefix: string;
  colors: readonly string[];
  selected: string;
  onSelect: (color: string) => void;
}

function SwatchRow({ label, prefix, colors, selected, onSelect }: SwatchRowProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{label}</Text>
      <View style={styles.row}>
        {colors.map((color, index) => {
          const isSelected = color === selected;
          return (
            <TouchableOpacity
              key={color}
              accessibilityRole="button"
              accessibilityLabel={`${prefix} ${index + 1}`}
              accessibilityState={{ selected: isSelected }}
              onPress={() => onSelect(color)}
              style={[styles.swatch, { backgroundColor: color }, isSelected && styles.swatchSelected]}
            />
          );
        })}
      </View>
    </View>
  );
}

/**
 * New Game character customizer. Shows over the title screen.
 * Start hands the choices to createNewGame. Blank names fall back to the defaults.
 */
export function CharacterCustomizer({ onStart, onCancel }: CharacterCustomizerProps) {
  const [draft, setDraft] = useState<NewGameDraft>(() => ({
    playerName: '',
    farmName: '',
    favoriteAnimal: '',
    appearance: { ...DEFAULT_APPEARANCE },
  }));

  const setAppearance = (patch: Partial<PlayerAppearance>) =>
    setDraft((prev) => ({ ...prev, appearance: { ...prev.appearance, ...patch } }));

  return (
    <View style={styles.overlay}>
      <View style={styles.card}>
        <Text style={styles.title}>Create your farmer</Text>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          <AppearancePreview appearance={draft.appearance} />

          <SwatchRow
            label="Skin tone"
            prefix="Skin tone"
            colors={SKIN_TONES}
            selected={draft.appearance.skinTone}
            onSelect={(skinTone) => setAppearance({ skinTone })}
          />

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Hair style</Text>
            <View style={styles.chipRow}>
              {HAIR_STYLES.map((style) => {
                const isSelected = style.id === draft.appearance.hairStyle;
                return (
                  <TouchableOpacity
                    key={style.id}
                    accessibilityRole="button"
                    accessibilityLabel={`Hair style ${style.label}`}
                    accessibilityState={{ selected: isSelected }}
                    onPress={() => setAppearance({ hairStyle: style.id })}
                    style={[styles.chip, isSelected && styles.chipSelected]}
                  >
                    <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>{style.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <SwatchRow
            label="Hair color"
            prefix="Hair color"
            colors={HAIR_COLORS}
            selected={draft.appearance.hairColor}
            onSelect={(hairColor) => setAppearance({ hairColor })}
          />
          <SwatchRow
            label="Shirt color"
            prefix="Shirt color"
            colors={SHIRT_COLORS}
            selected={draft.appearance.shirtColor}
            onSelect={(shirtColor) => setAppearance({ shirtColor })}
          />
          <SwatchRow
            label="Pants color"
            prefix="Pants color"
            colors={PANTS_COLORS}
            selected={draft.appearance.pantsColor}
            onSelect={(pantsColor) => setAppearance({ pantsColor })}
          />

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Your name</Text>
            <TextInput
              style={styles.input}
              value={draft.playerName}
              onChangeText={(playerName) => setDraft((prev) => ({ ...prev, playerName }))}
              placeholder={DEFAULT_PLAYER_NAME}
              maxLength={MAX_PLAYER_NAME_LENGTH}
              accessibilityLabel="Your name"
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Farm name</Text>
            <TextInput
              style={styles.input}
              value={draft.farmName}
              onChangeText={(farmName) => setDraft((prev) => ({ ...prev, farmName }))}
              placeholder={DEFAULT_FARM_NAME}
              maxLength={MAX_FARM_NAME_LENGTH}
              accessibilityLabel="Farm name"
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Favorite animal</Text>
            <TextInput
              style={styles.input}
              value={draft.favoriteAnimal}
              onChangeText={(favoriteAnimal) => setDraft((prev) => ({ ...prev, favoriteAnimal }))}
              placeholder="Chicken"
              maxLength={MAX_FAVORITE_ANIMAL_LENGTH}
              accessibilityLabel="Favorite animal"
            />
          </View>
        </ScrollView>

        <View style={styles.actions}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Back to title"
            onPress={onCancel}
            style={[styles.button, styles.secondaryButton]}
          >
            <Text style={styles.buttonText}>Back</Text>
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Start farming"
            onPress={() => onStart(resolveNewGame(draft))}
            style={styles.button}
          >
            <Text style={styles.buttonText}>Start Farming</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '92%',
    backgroundColor: '#FFF8DC',
    borderRadius: 16,
    padding: 18,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#8B4513',
    marginBottom: 8,
    textAlign: 'center',
  },
  scroll: {
    flexShrink: 1,
  },
  scrollContent: {
    paddingBottom: 8,
  },
  preview: {
    width: 96,
    height: 128,
    alignSelf: 'center',
    marginBottom: 8,
  },
  hairBack: {
    position: 'absolute',
    top: 12,
    left: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  head: {
    position: 'absolute',
    top: 16,
    left: 28,
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  hairTop: {
    position: 'absolute',
    top: 12,
    left: 26,
    width: 44,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
  },
  bun: {
    position: 'absolute',
    top: 2,
    left: 40,
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  shirt: {
    position: 'absolute',
    top: 58,
    left: 20,
    width: 56,
    height: 38,
    borderRadius: 10,
  },
  pants: {
    position: 'absolute',
    top: 96,
    left: 26,
    width: 44,
    height: 28,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },
  section: {
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#8B4513',
    marginBottom: 6,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  swatch: {
    width: 34,
    height: 34,
    borderRadius: 17,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  swatchSelected: {
    borderColor: '#8B4513',
    borderWidth: 3,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: '#F0E6D2',
    marginRight: 6,
    marginBottom: 6,
  },
  chipSelected: {
    backgroundColor: '#D4A574',
  },
  chipText: {
    fontSize: 13,
    color: '#654321',
  },
  chipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    fontSize: 15,
    color: '#654321',
    borderWidth: 1,
    borderColor: '#D9C7A4',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#D4A574',
    alignItems: 'center',
    marginHorizontal: 4,
  },
  secondaryButton: {
    backgroundColor: '#C19A6B',
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
