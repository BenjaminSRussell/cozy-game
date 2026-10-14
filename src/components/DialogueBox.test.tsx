import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  DIALOGUE_CHARS_PER_SECOND,
  DIALOGUE_CHAR_MS,
  DIALOGUE_CONTINUE_CUE,
  EXPRESSION_LETTER,
  dialogueCharsForElapsed,
  dialogueOptionLabel,
  dialoguePressResult,
  nextTypedCount,
  revealedDialogueText,
} from './dialogueScript';
import { prefersReducedMotion } from './shippingSummary';

vi.mock('react-native', () => {
  const ReactActual = require('react') as typeof import('react');

  const host = (tag: string) =>
    function Host(props: { children?: React.ReactNode } & Record<string, unknown>) {
      const attrs: Record<string, unknown> = {};
      if (typeof props.accessibilityLabel === 'string') {
        attrs['data-accessibility-label'] = props.accessibilityLabel;
      }
      if (typeof props.accessibilityRole === 'string') {
        attrs['data-accessibility-role'] = props.accessibilityRole;
      }
      return ReactActual.createElement(tag, attrs, props.children);
    };

  return {
    View: host('view'),
    Text: host('text'),
    TouchableOpacity: host('button'),
    StyleSheet: {
      create<T>(styles: T): T {
        return styles;
      },
    },
    Animated: {
      View: host('animated-view'),
      Value: class AnimatedValue {
        constructor(public value: number) {}
        setValue(next: number) {
          this.value = next;
        }
        interpolate() {
          return 0;
        }
      },
      timing: () => ({ start() {} }),
      sequence: (steps: unknown) => steps,
      loop: () => ({ start() {}, stop() {} }),
    },
  };
});

import {
  DIALOGUE_DOCK_STYLE,
  DIALOGUE_NAME_COLOR,
  DIALOGUE_PORTRAIT_SIZE,
  DIALOGUE_WOOD_COLOR,
  DialogueBox,
  dialogueBoxStyles,
} from './DialogueBox';

const LINE = 'abcdefghijklmnopqrstuvwxyz0123';

describe('dialogue box', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('types at 30 characters per second and does not rewind a skip', () => {
    expect(DIALOGUE_CHARS_PER_SECOND).toBe(30);
    expect(DIALOGUE_CHAR_MS).toBeCloseTo(1000 / 30);
    expect(LINE).toHaveLength(30);
    expect(dialogueCharsForElapsed(0)).toBe(0);
    expect(dialogueCharsForElapsed(-5)).toBe(0);
    expect(dialogueCharsForElapsed(Number.NaN)).toBe(0);
    expect(dialogueCharsForElapsed(500)).toBe(15);
    expect(dialogueCharsForElapsed(999)).toBe(29);
    expect(dialogueCharsForElapsed(1000)).toBe(30);
    expect(revealedDialogueText(LINE, dialogueCharsForElapsed(500), false)).toHaveLength(15);
    expect(revealedDialogueText(LINE, dialogueCharsForElapsed(1000), false)).toBe(LINE);
    expect(revealedDialogueText(LINE, 0, true)).toBe(LINE);
    expect(revealedDialogueText(LINE, 4, false)).toBe('abcd');
    expect(nextTypedCount(30, 5, 30)).toBe(30);
    expect(nextTypedCount(4, 5, 30)).toBe(5);
  });

  it('finishes a line on press, then continues only when there is no branch', () => {
    expect(dialoguePressResult(4, 30, false)).toEqual({ typed: 30, continue: false });
    expect(dialoguePressResult(30, 30, false)).toEqual({ typed: 30, continue: true });
    expect(dialoguePressResult(30, 30, true)).toEqual({ typed: 30, continue: false });
    expect(dialogueOptionLabel(0, 'First branch')).toBe('1. First branch');
    expect(dialogueOptionLabel(1, 'Second branch')).toBe('2. Second branch');
    expect(EXPRESSION_LETTER).toEqual({
      neutral: 'N',
      happy: 'H',
      surprised: '!',
      sad: 'S',
    });
  });

  it('docks a wooden box and shows the passed line, name, expression, and options', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    expect(prefersReducedMotion()).toBe(true);

    const html = renderToStaticMarkup(
      <DialogueBox
        speaker="Speaker"
        line="Passed line only."
        expression="happy"
        options={[
          { id: 'a', label: 'First branch' },
          { id: 'b', label: 'Second branch' },
        ]}
      />,
    );

    expect(DIALOGUE_DOCK_STYLE.position).toBe('fixed');
    expect(DIALOGUE_DOCK_STYLE.bottom).toBe(0);
    expect(html).toContain('position:fixed');
    expect(html).toContain('bottom:0');
    expect(dialogueBoxStyles.panel.backgroundColor).toBe(DIALOGUE_WOOD_COLOR);
    expect(dialogueBoxStyles.speaker.color).toBe(DIALOGUE_NAME_COLOR);
    expect(dialogueBoxStyles.speaker.fontWeight).toBe('700');
    expect(dialogueBoxStyles.portrait.width).toBe(DIALOGUE_PORTRAIT_SIZE);
    expect(dialogueBoxStyles.portrait.height).toBe(80);
    expect(html).toContain('Dialogue with Speaker');
    expect(html).toContain('Speaker');
    expect(html).toContain('Passed line only.');
    expect(html).toContain('data-accessibility-label="Happy expression"');
    expect(html).toContain('>H<');
    expect(html).toContain('<svg');
    expect(html).toContain('1. First branch');
    expect(html).toContain('2. Second branch');
    expect(html).not.toContain('Ask about crops');
    expect(html).not.toContain(DIALOGUE_CONTINUE_CUE);
  });

  it('shows the full line and continue cue immediately when reduced motion is set', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }));

    const html = renderToStaticMarkup(
      <DialogueBox speaker="Speaker" line={LINE} />,
    );

    expect(html).toContain(LINE);
    expect(html).toContain(DIALOGUE_CONTINUE_CUE);
    expect(html).toContain('▼');
    expect(html).toContain('data-accessibility-label="Neutral expression"');
    expect(html).toContain('>N<');
  });

  it('starts the typewriter blank and hides options until the line is revealed', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false }));
    expect(prefersReducedMotion()).toBe(false);

    const html = renderToStaticMarkup(
      <DialogueBox
        speaker="Speaker"
        line={LINE}
        expression="sad"
        options={[{ id: 'a', label: 'First branch' }]}
      />,
    );

    expect(html).toContain('Speaker');
    expect(html).not.toContain(LINE);
    expect(html).not.toContain('1. First branch');
    expect(html).not.toContain(DIALOGUE_CONTINUE_CUE);
    expect(html).toContain('data-accessibility-label="Sad expression"');
    expect(html).toContain('>S<');
  });
});
