/** Characters revealed each second while a line types on. */
export const DIALOGUE_CHARS_PER_SECOND = 30;

/** One typewriter step. 1000/30 ms keeps the rate at 30 characters per second. */
export const DIALOGUE_CHAR_MS = 1000 / DIALOGUE_CHARS_PER_SECOND;

export const DIALOGUE_CONTINUE_CUE = 'Click to continue';

export const DIALOGUE_EXPRESSIONS = ['neutral', 'happy', 'surprised', 'sad'] as const;

export type DialogueExpression = (typeof DIALOGUE_EXPRESSIONS)[number];

/** Letter drawn on the expression marker. No portrait image is shipped. */
export const EXPRESSION_LETTER: Record<DialogueExpression, string> = {
  neutral: 'N',
  happy: 'H',
  surprised: '!',
  sad: 'S',
};

export const EXPRESSION_NAME: Record<DialogueExpression, string> = {
  neutral: 'Neutral',
  happy: 'Happy',
  surprised: 'Surprised',
  sad: 'Sad',
};

export interface DialogueOption {
  id: string;
  label: string;
}

/** One spoken line. Callers pass the copy. The box does not carry a story. */
export interface DialogueRequest {
  speaker: string;
  line: string;
  expression?: DialogueExpression;
  options?: readonly DialogueOption[];
  onContinue?: () => void;
  onSelectOption?: (option: DialogueOption) => void;
}

export interface DialogueBoxProps extends DialogueRequest {
  visible?: boolean;
}

export function dialogueExpression(value: DialogueExpression | undefined): DialogueExpression {
  if (value === 'happy' || value === 'surprised' || value === 'sad') return value;
  return 'neutral';
}

export function dialogueCharsForElapsed(elapsedMs: number): number {
  if (!Number.isFinite(elapsedMs) || elapsedMs <= 0) return 0;
  return Math.floor((elapsedMs * DIALOGUE_CHARS_PER_SECOND) / 1000);
}

/** Revealed slice of a line. Reduced motion shows the whole line at once. */
export function revealedDialogueText(
  line: string,
  typed: number,
  reducedMotion: boolean,
): string {
  if (reducedMotion) return line;
  if (!Number.isFinite(typed) || typed <= 0) return '';
  return line.slice(0, Math.min(line.length, Math.floor(typed)));
}

export function dialogueOptionLabel(index: number, label: string): string {
  return `${index + 1}. ${label}`;
}

/**
 * A press mid-line finishes the line. A press on a finished line continues,
 * unless branching options are the way forward.
 */
export function dialoguePressResult(
  revealed: number,
  lineLength: number,
  hasOptions: boolean,
): { typed: number; continue: boolean } {
  const length = Math.max(0, Math.floor(lineLength));
  const shown = Number.isFinite(revealed)
    ? Math.min(length, Math.max(0, Math.floor(revealed)))
    : 0;
  if (shown < length) return { typed: length, continue: false };
  return { typed: length, continue: !hasOptions };
}

/** Elapsed typewriter count. Never rewinds a line that was skipped ahead. */
export function nextTypedCount(
  current: number,
  elapsedCount: number,
  lineLength: number,
): number {
  const length = Math.max(0, Math.floor(lineLength));
  const safeCurrent = Number.isFinite(current)
    ? Math.min(length, Math.max(0, Math.floor(current)))
    : 0;
  const safeElapsed = Number.isFinite(elapsedCount)
    ? Math.min(length, Math.max(0, Math.floor(elapsedCount)))
    : 0;
  return Math.max(safeCurrent, safeElapsed);
}
