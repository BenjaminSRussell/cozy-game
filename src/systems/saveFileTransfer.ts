import { Share } from 'react-native';

/** File name offered for a slot export, such as cozy-haven-slot-2.json. */
export function saveFileName(slotId: number): string {
  return `cozy-haven-slot-${slotId}.json`;
}

/** Web builds can pick a file from disk. Native builds paste the text instead. */
export function canPickSaveFile(): boolean {
  return typeof document !== 'undefined';
}

/**
 * Web: downloads the JSON as a file. Native: opens the system share sheet with the JSON text.
 */
export async function shareSaveFile(text: string, fileName: string): Promise<void> {
  const canDownload =
    typeof document !== 'undefined' && typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function';
  if (canDownload) {
    const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
    return;
  }
  await Share.share({ title: fileName, message: text });
}

/**
 * Web only: opens the browser file picker and resolves with the chosen file's text.
 * Resolves null when there is no picker or the file cannot be read.
 */
export function pickSaveFileText(): Promise<string | null> {
  if (typeof document === 'undefined') return Promise.resolve(null);
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }
      file.text().then(resolve, () => resolve(null));
    };
    input.click();
  });
}
