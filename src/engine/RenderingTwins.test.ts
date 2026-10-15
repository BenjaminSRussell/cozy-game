import { readdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const engineDir = dirname(fileURLToPath(import.meta.url));
const renderingDir = resolve(engineDir, '../rendering');

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).filter((name) => /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name));
}

function exportedClasses(dir: string): string[] {
  return sourceFiles(dir).flatMap((name) =>
    Array.from(
      readFileSync(resolve(dir, name), 'utf8').matchAll(/^export (?:abstract )?class (\w+)/gm),
      (match) => match[1],
    ),
  );
}

describe('src/engine and src/rendering share no system duplicates', () => {
  it('has no source file name present in both directories', () => {
    const engineFiles = new Set(sourceFiles(engineDir));
    expect(sourceFiles(renderingDir).filter((name) => engineFiles.has(name))).toEqual([]);
  });

  it('exports no class name from both directories', () => {
    const renderingClasses = new Set(exportedClasses(renderingDir));
    expect(exportedClasses(engineDir).filter((name) => renderingClasses.has(name))).toEqual([]);
  });
});
