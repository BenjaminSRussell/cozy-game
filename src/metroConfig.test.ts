import { createRequire } from 'node:module';
import { describe, expect, it, vi } from 'vitest';

type ResolveRequest = (context: unknown, moduleName: string, platform: string | null) => unknown;

// metro.config.js is CommonJS at the project root, outside src/.
const metroConfig = createRequire(import.meta.url)('../metro.config.js') as {
  resolver: { resolveRequest: ResolveRequest };
};

describe('metro.config.js', () => {
  it('resolves zustand and its subpaths to the CommonJS build, not the ESM build with import.meta', () => {
    const defaultResolve = vi.fn();
    const context = { resolveRequest: defaultResolve };

    for (const moduleName of ['zustand', 'zustand/middleware']) {
      const resolution = metroConfig.resolver.resolveRequest(context, moduleName, 'web') as {
        type: string;
        filePath: string;
      };
      expect(resolution.type).toBe('sourceFile');
      expect(resolution.filePath).toMatch(/[\\/]zustand[\\/](index|middleware)\.js$/);
    }
    expect(defaultResolve).not.toHaveBeenCalled();
  });

  it('leaves every other module to Expo default resolution', () => {
    const defaultResolve = vi.fn(() => ({ type: 'empty' }));
    const context = { resolveRequest: defaultResolve };

    expect(metroConfig.resolver.resolveRequest(context, 'react', 'web')).toEqual({ type: 'empty' });
    expect(defaultResolve).toHaveBeenCalledWith(context, 'react', 'web');
  });
});
