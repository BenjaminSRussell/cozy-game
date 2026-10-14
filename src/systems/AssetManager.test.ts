import { describe, expect, it } from 'vitest';
import type { SpriteAsset } from '../types/game';
import { AssetManager } from './AssetManager';

function sprite(
  id: string,
  name: string,
  category: SpriteAsset['category'] = 'decoration'
): SpriteAsset {
  return {
    id,
    name,
    category,
    source: 'free',
    path: `${id}.svg`,
    isAnimated: false,
    scale: 1,
    tags: ['test'],
  };
}

describe('AssetManager.getAllAssets', () => {
  it('returns a repeated asset id only once', () => {
    const manager = new AssetManager({ loadBuiltinAssets: false });
    manager.registerFreeAsset(sprite('bench_custom', 'Bench'));
    manager.registerFreeAsset(sprite('bench_custom', 'Bench v2'));

    const matches = manager.getAllAssets().filter((asset) => asset.id === 'bench_custom');
    expect(matches).toHaveLength(1);
    expect(matches[0]?.name).toBe('Bench v2');
    expect(
      manager.getAssetsByCategory('decoration').filter((asset) => asset.id === 'bench_custom')
    ).toHaveLength(1);
  });

  it('returns both assets when their ids differ', () => {
    const manager = new AssetManager({ loadBuiltinAssets: false });
    manager.registerFreeAsset(sprite('lamp_custom', 'Lamp'));
    manager.registerFreeAsset(sprite('bench_custom', 'Bench'));

    const ids = manager.getAllAssets().map((asset) => asset.id);
    expect(ids).toEqual(['lamp_custom', 'bench_custom']);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('does not keep the old category copy when an id is registered again', () => {
    const manager = new AssetManager({ loadBuiltinAssets: false });
    manager.registerFreeAsset(sprite('lamp_custom', 'Lamp', 'decoration'));
    manager.registerFreeAsset(sprite('lamp_custom', 'Lamp', 'item'));

    expect(manager.getAllAssets().filter((asset) => asset.id === 'lamp_custom')).toHaveLength(1);
    expect(
      manager.getAssetsByCategory('decoration').some((asset) => asset.id === 'lamp_custom')
    ).toBe(false);
    expect(
      manager.getAssetsByCategory('item').filter((asset) => asset.id === 'lamp_custom')
    ).toHaveLength(1);
  });
});
