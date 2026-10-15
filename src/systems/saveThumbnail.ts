/** Edge length, in pixels, of the square thumbnail kept on a save slot card. */
export const SAVE_THUMBNAIL_SIZE = 144;

/** Largest centered square inside a source of the given size. */
export function centeredSquare(width: number, height: number): { sx: number; sy: number; side: number } {
  const side = Math.min(width, height);
  return { sx: (width - side) / 2, sy: (height - side) / 2, side };
}

/**
 * PNG data URL of the game canvas, cropped to a centered square.
 * Returns undefined when there is no browser canvas (native builds), the canvas is
 * empty, or the browser refuses to read it back.
 */
export function captureSaveThumbnail(): string | undefined {
  try {
    if (typeof document === 'undefined') return undefined;
    const source = document.querySelector('canvas');
    if (!source || source.width === 0 || source.height === 0) return undefined;
    const target = document.createElement('canvas');
    target.width = SAVE_THUMBNAIL_SIZE;
    target.height = SAVE_THUMBNAIL_SIZE;
    const context = target.getContext('2d');
    if (!context) return undefined;
    const { sx, sy, side } = centeredSquare(source.width, source.height);
    context.drawImage(source, sx, sy, side, side, 0, 0, SAVE_THUMBNAIL_SIZE, SAVE_THUMBNAIL_SIZE);
    return target.toDataURL('image/png');
  } catch {
    return undefined;
  }
}
