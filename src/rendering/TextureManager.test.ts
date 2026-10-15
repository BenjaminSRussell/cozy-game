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

describe('TextureManager emoji ids', () => {
  afterEach(() => {
    TextureManager.getInstance().clearCache();
    vi.unstubAllGlobals();
  });

  it('renders an emoji id to an image, returns the cached object, and leaves unknown paths missing', () => {
    const fillText = vi.fn();
    const ctx = {
      font: '',
      textAlign: 'start',
      textBaseline: 'alphabetic',
      fillText,
    };
    const canvas = {
      width: 0,
      height: 0,
      getContext: () => ctx,
      toDataURL: () => 'data:image/png;base64,emoji',
    };
    vi.stubGlobal('Image', class ImageStub {
      src = '';
    });
    vi.stubGlobal('document', {
      createElement: () => canvas,
    });

    const textures = TextureManager.getInstance();
    const first = textures.getTexture('🌾');
    const second = textures.getTexture('🌾');

    expect(first?.image).toBeInstanceOf(globalThis.Image);
    expect(first?.image.src).toContain('data:image/png');
    expect(canvas.width).toBe(64);
    expect(canvas.height).toBe(64);
    expect(first).toMatchObject({ width: 64, height: 64 });
    expect(ctx.font).toBe('51.2px serif');
    expect(ctx.textAlign).toBe('center');
    expect(ctx.textBaseline).toBe('middle');
    expect(fillText).toHaveBeenCalledTimes(1);
    expect(fillText).toHaveBeenCalledWith('🌾', 32, 32);
    expect(second).toBe(first);
    expect(second?.image).toBe(first?.image);
    expect(fillText).toHaveBeenCalledTimes(1);

    const codepoint = textures.getTexture('U+1F33E');
    expect(codepoint?.image).toBeInstanceOf(globalThis.Image);
    expect(textures.getTexture('U+1F33E')).toBe(codepoint);
    expect(fillText).toHaveBeenCalledWith('U+1F33E', 32, 32);

    // Not an emoji and not already cached: same miss as before this fallback.
    expect(textures.getTexture('grass_tile')).toBeUndefined();
    expect(textures.getTexture('assets/missing/crop.png')).toBeUndefined();
  });
});

describe('TextureManager Metro asset objects', () => {
  afterEach(() => {
    TextureManager.getInstance().clearCache();
    vi.unstubAllGlobals();
  });

  it('loads a web require() asset by its uri instead of falling back to magenta', async () => {
    // On web, require('x.svg') is { uri, width, height }. Loading used to throw on split().
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"></svg>',
    }));
    const ctx = { clearRect() {}, drawImage() {} };
    // Fires onload on the next microtask, after the loader has attached its handlers.
    class LoadingImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      private value = '';
      get src() {
        return this.value;
      }
      set src(value: string) {
        this.value = value;
        queueMicrotask(() => this.onload?.());
      }
    }
    vi.stubGlobal('window', {});
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('Image', LoadingImage);
    vi.stubGlobal('document', {
      createElement: () => ({
        width: 0,
        height: 0,
        getContext: () => ctx,
        toDataURL: () => 'data:image/png;base64,grass',
      }),
    });
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    try {
      const textures = TextureManager.getInstance();
      await textures.preloadTextures([
        {
          id: 'tile_grass',
          path: { uri: '/assets/tiles/grass.svg', width: 64, height: 64 } as unknown as string,
        },
      ]);

      expect(fetchMock).toHaveBeenCalledWith('/assets/tiles/grass.svg');
      expect(warn).not.toHaveBeenCalled();
      // The 64x64 magenta fallback is what a failed load stores.
      expect(textures.getTexture('tile_grass')).toMatchObject({ width: 128, height: 128 });
    } finally {
      warn.mockRestore();
    }
  });
});
