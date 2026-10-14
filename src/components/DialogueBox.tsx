import React, { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import {
  DIALOGUE_CHAR_MS,
  DIALOGUE_CONTINUE_CUE,
  EXPRESSION_LETTER,
  EXPRESSION_NAME,
  dialogueExpression,
  dialogueOptionLabel,
  dialoguePressResult,
  dialogueCharsForElapsed,
  nextTypedCount,
  revealedDialogueText,
  type DialogueBoxProps,
  type DialogueExpression,
} from './dialogueScript';
import { prefersReducedMotion } from './shippingSummary';

export type { DialogueBoxProps, DialogueExpression, DialogueOption, DialogueRequest } from './dialogueScript';

/** Fixed to the viewport, above the hotbar (z-index 25). */
export const DIALOGUE_DOCK_STYLE: CSSProperties = {
  position: 'fixed',
  left: 0,
  right: 0,
  bottom: 0,
  zIndex: 50,
  padding: 12,
  boxSizing: 'border-box',
  pointerEvents: 'auto',
};

export const DIALOGUE_PORTRAIT_SIZE = 80;
export const DIALOGUE_NAME_COLOR = '#E6B325';
export const DIALOGUE_WOOD_COLOR = '#8B5A2B';
export const DIALOGUE_WOOD_EDGE = '#5C3317';

const MOUTH: Record<DialogueExpression, string> = {
  neutral: 'M26 54 h28',
  happy: 'M22 48 Q40 66 58 48',
  surprised: 'M33 48 h14 v14 h-14 Z',
  sad: 'M22 60 Q40 46 58 60',
};

const BROWS: Record<DialogueExpression, string> = {
  neutral: 'M24 28 h12 M44 28 h12',
  happy: 'M24 30 Q30 24 36 30 M44 30 Q50 24 56 30',
  surprised: 'M22 22 h14 M44 22 h14',
  sad: 'M24 26 L34 32 M56 26 L46 32',
};

function ExpressionFace({ expression }: { expression: DialogueExpression }) {
  const eye = expression === 'surprised' ? 5 : 3;
  return (
    <svg width={DIALOGUE_PORTRAIT_SIZE} height={DIALOGUE_PORTRAIT_SIZE} viewBox="0 0 80 80" aria-hidden="true">
      <circle cx="40" cy="40" r="30" fill="#F6E6C5" stroke={DIALOGUE_WOOD_EDGE} strokeWidth="3" />
      <circle cx="30" cy="36" r={eye} fill={DIALOGUE_WOOD_EDGE} />
      <circle cx="50" cy="36" r={eye} fill={DIALOGUE_WOOD_EDGE} />
      <path d={BROWS[expression]} fill="none" stroke={DIALOGUE_WOOD_EDGE} strokeWidth="2" strokeLinecap="round" />
      <path
        d={MOUTH[expression]}
        fill={expression === 'surprised' ? DIALOGUE_WOOD_EDGE : 'none'}
        stroke={DIALOGUE_WOOD_EDGE}
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

function usePulse(active: boolean): Animated.Value {
  const value = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!active) {
      value.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(value, { toValue: 1, duration: 420, useNativeDriver: false }),
        Animated.timing(value, { toValue: 0, duration: 420, useNativeDriver: false }),
      ]),
    );
    loop.start();
    return () => {
      loop.stop();
    };
  }, [active, value]);

  return value;
}

export function DialogueBox({
  speaker,
  line,
  expression,
  options,
  onContinue,
  onSelectOption,
  visible = true,
}: DialogueBoxProps): React.ReactElement | null {
  const face = dialogueExpression(expression);
  const reducedMotion = prefersReducedMotion();
  const choiceCount = options?.length ?? 0;
  const script = `${speaker}\0${line}`;
  const [trackedScript, setTrackedScript] = useState(script);
  const [typed, setTyped] = useState(0);
  const finishedRef = useRef(false);

  if (script !== trackedScript) {
    setTrackedScript(script);
    setTyped(0);
  }

  useEffect(() => {
    finishedRef.current = !visible || reducedMotion || line.length === 0;
    if (!visible || reducedMotion || line.length === 0) return;
    const startedAt = Date.now();
    const timer = setInterval(() => {
      if (finishedRef.current) {
        clearInterval(timer);
        return;
      }
      const elapsed = dialogueCharsForElapsed(Date.now() - startedAt);
      if (elapsed >= line.length) finishedRef.current = true;
      setTyped((current) => nextTypedCount(current, elapsed, line.length));
      if (finishedRef.current) clearInterval(timer);
    }, DIALOGUE_CHAR_MS);
    return () => clearInterval(timer);
  }, [line, reducedMotion, speaker, visible]);

  const shown = revealedDialogueText(line, typed, reducedMotion);
  const complete = shown.length >= line.length;
  const showOptions = complete && choiceCount > 0;
  const showContinue = complete && choiceCount === 0;
  const portraitPulse = usePulse(visible && !reducedMotion);
  const cuePulse = usePulse(visible && showContinue && !reducedMotion);

  if (!visible) return null;

  const onPressLine = () => {
    const result = dialoguePressResult(shown.length, line.length, choiceCount > 0);
    if (result.typed >= line.length) finishedRef.current = true;
    setTyped((current) => nextTypedCount(current, result.typed, line.length));
    if (result.continue) onContinue?.();
  };

  const portraitShift = portraitPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -4],
  });
  const cueShift = cuePulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 6],
  });
  const cueOpacity = cuePulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.35],
  });

  return (
    <div role="dialog" aria-label={`Dialogue with ${speaker}`} style={DIALOGUE_DOCK_STYLE}>
      <View style={dialogueBoxStyles.frame}>
        <View style={dialogueBoxStyles.panel}>
          <Animated.View
            style={[dialogueBoxStyles.portrait, { transform: [{ translateY: portraitShift }] }]}
            accessibilityRole="image"
            accessibilityLabel={`${EXPRESSION_NAME[face]} expression`}
          >
            <ExpressionFace expression={face} />
            <Text
              style={dialogueBoxStyles.expressionLetter}
              accessibilityElementsHidden
              importantForAccessibility="no"
            >
              {EXPRESSION_LETTER[face]}
            </Text>
          </Animated.View>
          <View style={dialogueBoxStyles.body}>
            <Text style={dialogueBoxStyles.speaker}>{speaker}</Text>
            <TouchableOpacity
              onPress={onPressLine}
              accessibilityRole="button"
              accessibilityLabel={showContinue ? DIALOGUE_CONTINUE_CUE : 'Dialogue line'}
              style={dialogueBoxStyles.lineButton}
            >
              <Text style={dialogueBoxStyles.line}>{shown}</Text>
              {showContinue ? (
                <Animated.View
                  style={[
                    dialogueBoxStyles.cue,
                    { opacity: cueOpacity, transform: [{ translateY: cueShift }] },
                  ]}
                >
                  <Text style={dialogueBoxStyles.cueText} accessibilityLabel={DIALOGUE_CONTINUE_CUE}>
                    {DIALOGUE_CONTINUE_CUE} ▼
                  </Text>
                </Animated.View>
              ) : null}
            </TouchableOpacity>
            {showOptions ? (
              <View style={dialogueBoxStyles.options}>
                {options?.map((option, index) => {
                  const numbered = dialogueOptionLabel(index, option.label);
                  return (
                    <TouchableOpacity
                      key={`${option.id}-${index}`}
                      onPress={() => onSelectOption?.(option)}
                      accessibilityRole="button"
                      accessibilityLabel={numbered}
                      style={dialogueBoxStyles.option}
                    >
                      <Text style={dialogueBoxStyles.optionText}>{numbered}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : null}
          </View>
        </View>
      </View>
    </div>
  );
}

export const dialogueBoxStyles = StyleSheet.create({
  frame: {
    backgroundColor: DIALOGUE_WOOD_EDGE,
    borderRadius: 16,
    padding: 4,
  },
  panel: {
    backgroundColor: DIALOGUE_WOOD_COLOR,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#C4A574',
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  portrait: {
    width: DIALOGUE_PORTRAIT_SIZE,
    height: DIALOGUE_PORTRAIT_SIZE,
    borderRadius: 8,
    backgroundColor: '#F6E6C5',
    borderWidth: 2,
    borderColor: DIALOGUE_WOOD_EDGE,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  expressionLetter: {
    position: 'absolute',
    top: 2,
    left: 4,
    color: DIALOGUE_WOOD_EDGE,
    fontSize: 12,
    fontWeight: '700',
  },
  body: {
    flex: 1,
    marginLeft: 12,
  },
  speaker: {
    color: DIALOGUE_NAME_COLOR,
    fontWeight: '700',
    fontSize: 18,
    fontFamily: 'Georgia, Palatino, serif',
    marginBottom: 4,
  },
  lineButton: {
    alignItems: 'stretch',
  },
  line: {
    color: '#F6E6C5',
    fontSize: 16,
    lineHeight: 22,
    minHeight: 22,
    fontFamily: 'Georgia, Palatino, serif',
  },
  cue: {
    alignSelf: 'flex-end',
    marginTop: 6,
  },
  cueText: {
    color: DIALOGUE_NAME_COLOR,
    fontWeight: '700',
    fontSize: 14,
  },
  options: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  option: {
    backgroundColor: '#F3E2C4',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 8,
    marginTop: 8,
  },
  optionText: {
    color: DIALOGUE_WOOD_EDGE,
    fontWeight: '700',
    fontSize: 14,
  },
});
