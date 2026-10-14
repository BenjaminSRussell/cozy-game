import React, { useEffect, useRef, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { GameWorld, ShippedTodayEntry } from '../types/game';
import {
  EMPTY_SHIPMENT_TALLY,
  continueEndOfDay,
  formatShipmentGold,
  isEndOfDay,
  prefersReducedMotion,
  rollingDisplayTotal,
  shippingSummaryView,
  shippingTotalLabel,
} from './shippingSummary';

export function useEndOfDayShipping(
  world: GameWorld | null,
  advanceTime: (minutes: number) => void,
): {
  open: boolean;
  rows: ShippedTodayEntry[];
  onContinue: () => void;
} {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<ShippedTodayEntry[]>([]);
  const openedDay = useRef<number | null>(null);
  const advancing = useRef(false);
  const dayTime = world?.dayTime;
  const day = world?.totalDaysPlayed;
  const shipped = world?.shippedToday;

  useEffect(() => {
    if (dayTime === undefined || day === undefined) return;
    const live = Array.isArray(shipped) ? shipped : [];
    if (open) {
      if (live.length > 0) setRows(live);
      return;
    }
    if (!isEndOfDay(dayTime)) return;
    if (openedDay.current === day) return;
    openedDay.current = day;
    advancing.current = false;
    setRows(live);
    setOpen(true);
  }, [open, dayTime, day, shipped]);

  const onContinue = () => {
    setOpen(false);
    if (dayTime === undefined || advancing.current) return;
    advancing.current = true;
    continueEndOfDay(dayTime, advanceTime);
  };

  return { open, rows, onContinue };
}

function useRollingShipmentTotal(target: number, active: boolean): number {
  const [shown, setShown] = useState(() => (prefersReducedMotion() ? target : 0));

  useEffect(() => {
    if (!active || prefersReducedMotion()) {
      setShown(target);
      return;
    }

    let current = 0;
    setShown(0);
    const host = globalThis as {
      requestAnimationFrame?: (cb: (time: number) => void) => number;
      cancelAnimationFrame?: (id: number) => void;
    };
    if (typeof host.requestAnimationFrame !== 'function') {
      setShown(target);
      return;
    }

    let frame = 0;
    const tick = () => {
      current = rollingDisplayTotal(current, target, false);
      setShown(current);
      if (current !== target && typeof host.requestAnimationFrame === 'function') {
        frame = host.requestAnimationFrame(tick);
      }
    };
    frame = host.requestAnimationFrame(tick);
    return () => {
      host.cancelAnimationFrame?.(frame);
    };
  }, [active, target]);

  return shown;
}

export function ShippingSummaryModal({
  visible,
  rows,
  onContinue,
}: {
  visible: boolean;
  rows: readonly ShippedTodayEntry[];
  onContinue: () => void;
}) {
  const view = shippingSummaryView(rows);
  const shown = useRollingShipmentTotal(view.total, visible);

  return (
    <Modal
      transparent={false}
      animationType="fade"
      visible={visible}
      onRequestClose={onContinue}
    >
      <View style={styles.page}>
        <View style={styles.card}>
          <Text style={styles.title}>Shipping Bin</Text>
          <ScrollView style={styles.tally} contentContainerStyle={styles.tallyContent}>
            {view.empty ? (
              <Text style={styles.empty}>{EMPTY_SHIPMENT_TALLY}</Text>
            ) : (
              view.lines.map((line, index) => (
                <Text key={`${line.name}-${index}`} style={styles.line}>
                  {line.label}
                </Text>
              ))
            )}
          </ScrollView>
          <Text style={styles.total} accessibilityLabel={shippingTotalLabel(rows)}>
            Total: +{formatShipmentGold(shown)}g
          </Text>
          <TouchableOpacity
            style={styles.continueButton}
            onPress={onContinue}
            accessibilityRole="button"
            accessibilityLabel="Continue"
          >
            <Text style={styles.continueText}>Continue</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#E7CFA3',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#F6E6C5',
    borderColor: '#8B5A2B',
    borderWidth: 3,
    borderRadius: 18,
    padding: 24,
    maxHeight: '90%',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#5C3B1E',
    textAlign: 'center',
    marginBottom: 16,
    fontFamily: 'Georgia, Palatino, serif',
  },
  tally: {
    flexGrow: 0,
  },
  tallyContent: {
    paddingVertical: 8,
  },
  line: {
    fontSize: 18,
    color: '#5C3B1E',
    marginBottom: 8,
    fontFamily: 'Georgia, Palatino, serif',
  },
  empty: {
    fontSize: 18,
    color: '#7A5A3A',
    textAlign: 'center',
    marginVertical: 12,
    fontFamily: 'Georgia, Palatino, serif',
  },
  total: {
    fontSize: 24,
    fontWeight: '700',
    color: '#5C3B1E',
    textAlign: 'right',
    marginTop: 12,
    fontFamily: 'Georgia, Palatino, serif',
  },
  continueButton: {
    marginTop: 20,
    backgroundColor: '#6B3E26',
    borderRadius: 12,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueText: {
    color: '#F6E6C5',
    fontSize: 18,
    fontWeight: '700',
  },
});
