import React, { useEffect, useRef } from 'react';
import { Animated, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { prefersReducedMotion } from './shippingSummary';

/** Logo that drifts up and down. The loop is not started when the system asks for reduced motion. */
function FloatingLogo() {
  const float = useRef(new Animated.Value(0)).current;
  const reducedMotion = prefersReducedMotion();

  useEffect(() => {
    if (reducedMotion) return undefined;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(float, { toValue: 1, duration: 1600, useNativeDriver: true }),
        Animated.timing(float, { toValue: 0, duration: 1600, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [float, reducedMotion]);

  return (
    <Animated.View
      accessibilityRole="header"
      style={[
        styles.logo,
        { transform: [{ translateY: float.interpolate({ inputRange: [0, 1], outputRange: [0, -10] }) }] },
      ]}
    >
      <Text style={styles.logoText}>🌾 Cozy Haven 🏠</Text>
    </Animated.View>
  );
}

/** Decorative backdrop: sky, sun, two hills, a barn and a plowed field. Touches pass through it. */
function FarmScene() {
  return (
    <View pointerEvents="none" style={styles.scene} importantForAccessibility="no-hide-descendants">
      <View style={styles.sun} />
      <View style={styles.hillBack} />
      <View style={styles.hillFront} />
      <View style={styles.barn}>
        <View style={styles.barnRoof} />
        <View style={styles.barnDoor} />
      </View>
      <View style={styles.field}>
        <View style={styles.furrow} />
        <View style={styles.furrow} />
        <View style={styles.furrow} />
      </View>
    </View>
  );
}

interface MenuButtonProps {
  label: string;
  accessibilityLabel: string;
  onPress: () => void;
  secondary?: boolean;
  disabled?: boolean;
}

function MenuButton({ label, accessibilityLabel, onPress, secondary, disabled }: MenuButtonProps) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: disabled === true }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.button, secondary && styles.secondaryButton, disabled && styles.disabledButton]}
    >
      <Text style={styles.buttonText}>{label}</Text>
    </TouchableOpacity>
  );
}

export interface TitleScreenProps {
  /** False when no slot holds a save. Continue then shows disabled. */
  canContinue: boolean;
  onNewGame: () => void;
  onContinue: () => void;
  onLoadGame: () => void;
  onSettings: () => void;
}

export function TitleScreen({ canContinue, onNewGame, onContinue, onLoadGame, onSettings }: TitleScreenProps) {
  return (
    <View style={styles.root}>
      <FarmScene />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <FloatingLogo />
        <Text style={styles.subtitle}>A peaceful farming adventure</Text>
        <Text style={styles.description}>
          Plant crops, build your farm, and enjoy a relaxing life in the countryside.
        </Text>
        <MenuButton label="🎮 New Game" accessibilityLabel="New Game" onPress={onNewGame} />
        <MenuButton
          label="▶ Continue"
          accessibilityLabel="Continue"
          onPress={onContinue}
          disabled={!canContinue}
        />
        <MenuButton label="📂 Load Game" accessibilityLabel="Load Game" onPress={onLoadGame} secondary />
        <MenuButton label="⚙ Settings" accessibilityLabel="Settings" onPress={onSettings} secondary />

        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>How to Play:</Text>
          <Text style={styles.infoText}>• Tap "Plant" then click a plot to plant crops</Text>
          <Text style={styles.infoText}>• Tap "Water" to keep crops healthy</Text>
          <Text style={styles.infoText}>• Tap "Harvest" when crops are golden</Text>
          <Text style={styles.infoText}>• Sell crops to earn coins</Text>
          <Text style={styles.infoText}>• Build structures and expand your farm</Text>
        </View>
      </ScrollView>
    </View>
  );
}

export interface SettingsPanelProps {
  musicOn: boolean;
  onToggleMusic: () => void;
  onBack: () => void;
}

export function SettingsPanel({ musicOn, onToggleMusic, onBack }: SettingsPanelProps) {
  return (
    <View style={styles.root}>
      <FarmScene />
      <View style={styles.centered}>
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Settings</Text>
          <MenuButton
            label={musicOn ? '🎵 Music: On' : '🔈 Music: Off'}
            accessibilityLabel="Toggle music"
            onPress={onToggleMusic}
          />
          <MenuButton label="Back" accessibilityLabel="Back" onPress={onBack} secondary />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#BFE8F7',
  },
  scene: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  sun: {
    position: 'absolute',
    top: 48,
    right: 36,
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FFE38A',
  },
  hillBack: {
    position: 'absolute',
    bottom: 150,
    left: -80,
    width: 360,
    height: 260,
    borderRadius: 180,
    backgroundColor: '#A8DB8E',
  },
  hillFront: {
    position: 'absolute',
    bottom: 80,
    right: -120,
    width: 380,
    height: 260,
    borderRadius: 190,
    backgroundColor: '#8CC972',
  },
  barn: {
    position: 'absolute',
    bottom: 100,
    right: 48,
    width: 92,
    height: 74,
    backgroundColor: '#B5533C',
  },
  barnRoof: {
    position: 'absolute',
    top: -34,
    left: -10,
    width: 0,
    height: 0,
    borderLeftWidth: 56,
    borderRightWidth: 56,
    borderBottomWidth: 34,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#7A3B2A',
  },
  barnDoor: {
    position: 'absolute',
    bottom: 0,
    left: 34,
    width: 24,
    height: 36,
    backgroundColor: '#F4EBD9',
  },
  field: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 96,
    backgroundColor: '#D9B77A',
  },
  furrow: {
    height: 6,
    marginTop: 16,
    marginHorizontal: 18,
    borderRadius: 3,
    backgroundColor: '#C29A58',
  },
  scroll: {
    flex: 1,
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  logo: {
    marginTop: 16,
    marginBottom: 8,
    alignItems: 'center',
  },
  logoText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#8B4513',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: '#6B4A2B',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#6B4A2B',
    marginBottom: 16,
    textAlign: 'center',
    maxWidth: 300,
  },
  button: {
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 8,
    backgroundColor: '#D4A574',
    marginVertical: 8,
    minWidth: 220,
    alignItems: 'center',
  },
  secondaryButton: {
    backgroundColor: '#C19A6B',
  },
  disabledButton: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  infoBox: {
    marginTop: 24,
    backgroundColor: '#FFF8DC',
    padding: 16,
    borderRadius: 12,
    width: '90%',
    maxWidth: 360,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#8B4513',
    marginBottom: 10,
    textAlign: 'center',
  },
  infoText: {
    fontSize: 12,
    color: '#654321',
    marginVertical: 3,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  panel: {
    width: '90%',
    maxWidth: 360,
    backgroundColor: '#FFF8DC',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  panelTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#8B4513',
    marginBottom: 12,
  },
});
