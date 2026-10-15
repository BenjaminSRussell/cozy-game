import { describe, expect, it } from 'vitest';
import { assetUri } from './assetUri';

describe('assetUri', () => {
  it('returns a string path unchanged', () => {
    expect(assetUri('/assets/tiles/grass.svg#part')).toBe('/assets/tiles/grass.svg#part');
  });

  it('returns the uri of a web asset object from require()', () => {
    expect(assetUri({ uri: '/assets/tiles/grass.svg', width: 64, height: 64 })).toBe(
      '/assets/tiles/grass.svg',
    );
  });

  it('returns undefined for a native numeric asset id and for values with no uri', () => {
    expect(assetUri(42)).toBeUndefined();
    expect(assetUri({ width: 64 })).toBeUndefined();
    expect(assetUri({ uri: 7 })).toBeUndefined();
    expect(assetUri(null)).toBeUndefined();
    expect(assetUri(undefined)).toBeUndefined();
  });
});
