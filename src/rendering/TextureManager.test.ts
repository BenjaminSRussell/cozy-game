import { afterEach, describe, expect, it, vi } from 'vitest';
import { TextureManager } from './TextureManager';

describe('TextureManager preload 404', () => {
  afterEach(() => {
    TextureManager.getInstance().clearCache();
    vi.unstubAllGlobals();
  });

  it('does not throw and stores a 64x64 magenta fallback', async () => {
    const ctx = { fillStyle: '', fillRect() {} };
    const fetchMock = vi.fn(async () => ({ ok: false, status: 404 }));
    vi.stubGlobal('window', {});
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('Image', class { src = ''; });
    vi.stubGlobal('document', {
      createElement: () => ({
        width: 0,
        height: 0,
        getContext: () => ctx,
        toDataURL: () => 'data:image/png;base64,ff00ff',
      }),
    });

    const textures = TextureManager.getInstance();
    await expect(textures.preloadTextures([
      { id: 'missing-crop', path: '/assets/missing.svg' },
    ])).resolves.toBeUndefined();

    const loaded = textures.getTexture('missing-crop');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(loaded).toMatchObject({ width: 64, height: 64 });
    expect(ctx.fillStyle).toBe('#FF00FF');
    expect(loaded?.image.src).toContain('ff00ff');
  });
});
