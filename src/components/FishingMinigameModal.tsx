import React, { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { FishingBite } from '../types/game';
import {
  FISH_SIZE,
  FISHING_BAR_HEIGHT,
  FISHING_CYLINDER_HEIGHT,
  FISHING_FRAME_SECONDS,
  createFishingMinigame,
  fishDisplayName,
  fishingHeadline,
  stepFishingMinigame,
  type FishingMinigameState,
} from './fishingMinigame';

/** Most real time one animation frame may simulate, so a backgrounded tab cannot fast-forward the fish. */
const MAX_CATCHUP_SECONDS = 0.1;

export type FishingOutcome = 'caught' | 'escaped';

/**
 * Tension-bar overlay for a fish on the line. Hold the pointer or Space to lift the green bar
 * and keep the fish inside it. A catch or an escape waits for Continue.
 */
export function FishingMinigameModal({
  bite,
  onResolve,
}: {
  bite: FishingBite | null;
  onResolve: (outcome: FishingOutcome) => void;
}) {
  if (bite === null) return null;
  // Keyed by bite, so every bite starts from a centred bar.
  return <FishingSession key={bite.startedAt} fishType={bite.fishType} onResolve={onResolve} />;
}

function FishingSession({
  fishType,
  onResolve,
}: {
  fishType: string;
  onResolve: (outcome: FishingOutcome) => void;
}) {
  const [game, setGame] = useState<FishingMinigameState>(() => createFishingMinigame());
  const gameRef = useRef(game);
  const holdingRef = useRef(false);
  const fishName = fishDisplayName(fishType);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const setHolding = (held: boolean) => (event: KeyboardEvent) => {
      if (event.code !== 'Space') return;
      event.preventDefault();
      holdingRef.current = held;
    };
    const onKeyDown = setHolding(true);
    const onKeyUp = setHolding(false);
    const onBlur = () => {
      holdingRef.current = false;
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, []);

  // Advance in fixed 60 Hz steps, so the physics does not depend on the display's refresh rate.
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    let frameId = 0;
    let lastTimestamp = 0;
    let carry = 0;
    const tick = (timestamp: number) => {
      const elapsed = lastTimestamp === 0
        ? 0
        : Math.min((timestamp - lastTimestamp) / 1000, MAX_CATCHUP_SECONDS);
      lastTimestamp = timestamp;
      carry += elapsed;

      let next = gameRef.current;
      let stepped = false;
      while (carry >= FISHING_FRAME_SECONDS && next.status === 'playing') {
        carry -= FISHING_FRAME_SECONDS;
        next = stepFishingMinigame(next, holdingRef.current);
        stepped = true;
      }
      if (stepped) {
        gameRef.current = next;
        setGame(next);
      }
      if (next.status === 'playing') frameId = window.requestAnimationFrame(tick);
    };
    frameId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frameId);
  }, []);

  const { status } = game;
  const outcome: FishingOutcome = status === 'caught' ? 'caught' : 'escaped';

  return (
    <Modal
      transparent
      animationType="fade"
      visible
      onRequestClose={() => onResolve(outcome)}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>{fishingHeadline(status, fishName)}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Hold to lift the catch bar"
            onPressIn={() => {
              holdingRef.current = true;
            }}
            onPressOut={() => {
              holdingRef.current = false;
            }}
            style={styles.column}
          >
            <View style={[styles.bar, { top: game.barTop }]} />
            <Text style={[styles.fish, { top: game.fishY - FISH_SIZE / 2 }]}>🐟</Text>
          </Pressable>
          <View style={styles.meter}>
            <View style={[styles.meterFill, { width: `${game.progress}%` }]} />
          </View>
          {status === 'playing' ? (
            <Text style={styles.hint}>Hold to lift the bar. Keep the fish inside the green bar.</Text>
          ) : (
            <>
              <Text style={styles.hint}>
                {status === 'caught' ? `${fishName} added to your inventory.` : 'Better luck on the next bite.'}
              </Text>
              <TouchableOpacity
                style={styles.continueButton}
                onPress={() => onResolve(outcome)}
                accessibilityRole="button"
                accessibilityLabel="Continue"
              >
                <Text style={styles.continueText}>Continue</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(40, 25, 15, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#F6E6C5',
    borderColor: '#8B5A2B',
    borderWidth: 3,
    borderRadius: 18,
    padding: 20,
    alignItems: 'center',
    maxWidth: 360,
    width: '100%',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#5C3B1E',
    textAlign: 'center',
    marginBottom: 12,
    fontFamily: 'Georgia, Palatino, serif',
  },
  column: {
    width: 64,
    height: FISHING_CYLINDER_HEIGHT,
    borderRadius: 32,
    borderWidth: 3,
    borderColor: '#8B5A2B',
    backgroundColor: '#E7CFA3',
    overflow: 'hidden',
    position: 'relative',
  },
  bar: {
    position: 'absolute',
    left: 6,
    right: 6,
    height: FISHING_BAR_HEIGHT,
    borderRadius: 10,
    backgroundColor: '#7BC47F',
    borderWidth: 2,
    borderColor: '#4E8F52',
  },
  fish: {
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: FISH_SIZE,
    lineHeight: FISH_SIZE,
  },
  meter: {
    width: '100%',
    height: 12,
    borderRadius: 6,
    marginTop: 16,
    backgroundColor: 'rgba(93, 64, 55, 0.18)',
    overflow: 'hidden',
  },
  meterFill: {
    height: '100%',
    backgroundColor: '#D9A441',
    borderRadius: 6,
  },
  hint: {
    fontSize: 16,
    color: '#5C3B1E',
    textAlign: 'center',
    marginTop: 12,
    fontFamily: 'Georgia, Palatino, serif',
  },
  continueButton: {
    marginTop: 16,
    alignSelf: 'stretch',
    minHeight: 48,
    paddingHorizontal: 16,
    backgroundColor: '#6B3E26',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueText: {
    color: '#F6E6C5',
    fontSize: 18,
    fontWeight: '700',
  },
});
