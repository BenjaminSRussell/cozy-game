import React, { useEffect, useRef } from 'react';
import { Animated, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BED_FADE_MS } from '../systems/farmhouseBed';

/** Yes/No question shown when the player walks up to the farmhouse bed. */
export function FarmhouseBedPrompt({
  visible,
  onYes,
  onNo,
}: {
  visible: boolean;
  onYes: () => void;
  onNo: () => void;
}) {
  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onNo}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Go to bed for the night?</Text>
          <View style={styles.choices}>
            <TouchableOpacity
              style={[styles.choice, styles.yes]}
              onPress={onYes}
              accessibilityRole="button"
              accessibilityLabel="Yes"
            >
              <Text style={styles.choiceText}>Yes</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.choice, styles.no]}
              onPress={onNo}
              accessibilityRole="button"
              accessibilityLabel="No"
            >
              <Text style={styles.choiceText}>No</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

/** Black screen that fades in over BED_FADE_MS while the bed sequence runs. */
export function SleepFade({ active }: { active: boolean }) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!active) {
      opacity.setValue(0);
      return undefined;
    }
    const fade = Animated.timing(opacity, {
      toValue: 1,
      duration: BED_FADE_MS,
      useNativeDriver: false,
    });
    fade.start();
    return () => {
      fade.stop();
    };
  }, [active, opacity]);

  return (
    <Modal transparent animationType="none" visible={active}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.black, { opacity }]} />
    </Modal>
  );
}

const styles = StyleSheet.create({
  black: {
    backgroundColor: '#000',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#F6E6C5',
    borderColor: '#8B5A2B',
    borderWidth: 3,
    borderRadius: 18,
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#5C3B1E',
    textAlign: 'center',
    marginBottom: 20,
    fontFamily: 'Georgia, Palatino, serif',
  },
  choices: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  choice: {
    flex: 1,
    minHeight: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 6,
  },
  yes: {
    backgroundColor: '#6B3E26',
  },
  no: {
    backgroundColor: '#8B7355',
  },
  choiceText: {
    color: '#F6E6C5',
    fontSize: 18,
    fontWeight: '700',
  },
});
