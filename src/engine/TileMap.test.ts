import { describe, expect, it } from 'vitest';
import type { Building } from '../types/game';
import { TileMap } from './TileMap';

function house(x: number, y: number): Building {
  return {
    id: 'house-1',
    type: 'house',
    position: { x, y, z: 0 },
    rotation: 0,
    unlocked: true,
    level: 1,
    spriteId: 'house',
  };
}

describe('TileMap', () => {
  const config = { width: 3, height: 2, tileSize: 16, elevationScale: 8 };

  it('creates one tile for every grid cell', () => {
    const map = new TileMap(config);
    expect(map.getAllTiles()).toHaveLength(config.width * config.height);
    expect(map.getTile(0, 0)).toBeDefined();
    expect(map.getTile(3, 0)).toBeNull();
    expect(map.isWalkable(-1, 0)).toBe(false);
  });

  it('returns null for out-of-range coordinates without throwing', () => {
    const map = new TileMap(config);
    expect(map.getTile(-1, 5)).toBeNull();
    expect(map.getTile(0, -1)).toBeNull();
    expect(map.getTile(-1, 0)).toBeNull();
    expect(map.getTile(config.width, 0)).toBeNull();
    expect(map.getTile(0, config.height)).toBeNull();
    expect(map.getTile(9999, 9999)).toBeNull();
    const origin = map.getTile(0, 0);
    expect(origin).not.toBeNull();
    expect(origin?.position).toEqual({ x: 0, y: 0 });
    expect(origin?.walkable).toEqual(expect.any(Boolean));
  });

  it('returns a copy of its config', () => {
    const map = new TileMap(config);
    const copy = map.getConfig();
    copy.width = 99;
    expect(map.getConfig().width).toBe(3);
  });

  it('projects tile coordinates into world space and back', () => {
    const map = new TileMap(config);
    map.setTile(1, 1, { elevation: 2 });
    const tile = map.getTile(1, 1);
    expect(tile).toBeDefined();
    if (!tile) return;
    const world = map.tileToWorldPosition(tile);
    expect(world).toEqual({ x: 16, y: 0, z: 2 });
    expect(map.worldToTilePosition({ x: world.x + 15, y: 31 })).toEqual({ x: 1, y: 1 });
  });

  it('refuses crops and buildings that are off-map or unwalkable', () => {
    const map = new TileMap(config);
    map.setTile(0, 0, { type: 'water', walkable: false, building: undefined, crop: undefined });
    expect(map.placeCrop(0, 0, 'wheat')).toBe(false);
    expect(map.placeBuilding(0, 0, house(0, 0))).toBe(false);
    expect(map.placeCrop(9, 9, 'wheat')).toBe(false);
    expect(map.getTile(0, 0)?.crop).toBeUndefined();
  });

  it('places a crop, then a building that blocks the tile', () => {
    const map = new TileMap(config);
    map.setTile(1, 0, {
      type: 'grass',
      walkable: true,
      elevation: 1,
      building: undefined,
      crop: undefined,
    });
    expect(map.placeCrop(1, 0, 'carrot')).toBe(true);
    expect(map.getTile(1, 0)).toMatchObject({ crop: 'carrot', cropStage: 0, walkable: true });
    expect(map.placeBuilding(1, 0, house(1, 0))).toBe(true);
    const blocked = map.getTile(1, 0);
    expect(blocked?.walkable).toBe(false);
    expect(blocked?.building?.id).toBe('house-1');
    expect(map.isWalkable(1, 0)).toBe(false);
    expect(map.placeCrop(1, 0, 'wheat')).toBe(false);
    expect(map.getTile(1, 0)?.crop).toBe('carrot');
  });

  it('picks the same variant for a coordinate every time', () => {
    const wide = { width: 4, height: 3, tileSize: 16, elevationScale: 8 };
    const first = new TileMap(wide);
    const second = new TileMap(wide);
    for (let x = 0; x < wide.width; x++) {
      for (let y = 0; y < wide.height; y++) {
        const a = first.getTile(x, y);
        const b = second.getTile(x, y);
        expect(a?.variant).toBe(b?.variant);
        expect(a?.variant).toBeGreaterThanOrEqual(0);
        expect(a?.variant).toBeLessThan(4);
        expect(Number.isInteger(a?.variant)).toBe(true);
      }
    }
    expect(first.getTile(0, 0)?.variant).toBe(0);
    expect(second.getTile(0, 0)?.variant).toBe(0);
    expect(first.getTile(2, 0)?.variant).toBe(3);
  });

  it('keeps hashed elevation stable, non-negative, and smooth between neighbors', () => {
    const wide = { width: 16, height: 16, tileSize: 16, elevationScale: 8 };
    const first = new TileMap(wide);
    const second = new TileMap(wide);
    const origin = first.getTile(0, 0);
    const again = second.getTile(0, 0);
    expect(origin).not.toBeNull();
    expect(again).not.toBeNull();
    if (!origin || !again) return;
    expect(origin.elevation).toBe(again.elevation);
    expect(Number.isFinite(origin.elevation)).toBe(true);
    expect(origin.elevation).toBeGreaterThanOrEqual(0);
    expect(origin.elevation).toBeLessThanOrEqual(4);

    for (let y = 0; y < wide.height; y++) {
      for (let x = 0; x < wide.width; x++) {
        const tile = first.getTile(x, y);
        const twin = second.getTile(x, y);
        expect(tile).not.toBeNull();
        if (!tile || !twin) return;
        expect(tile.elevation).toBe(twin.elevation);
        expect(tile.elevation).toBeGreaterThanOrEqual(0);
        expect(tile.elevation).toBeLessThanOrEqual(4);
        const right = x + 1 < wide.width ? first.getTile(x + 1, y) : null;
        const down = y + 1 < wide.height ? first.getTile(x, y + 1) : null;
        if (right) {
          expect(Math.abs(tile.elevation - right.elevation)).toBeLessThanOrEqual(1.5);
        }
        if (down) {
          expect(Math.abs(tile.elevation - down.elevation)).toBeLessThanOrEqual(1.5);
        }
      }
    }
  });

  it('returns only tiles inside the requested radius', () => {
    const map = new TileMap({ width: 5, height: 5, tileSize: 16, elevationScale: 8 });
    const positions = map.getTilesInRange(2, 2, 1).map((tile) => `${tile.position.x},${tile.position.y}`);
    expect(positions).toContain('2,2');
    expect(positions).toContain('3,2');
    expect(positions).not.toContain('4,2');
    expect(positions).not.toContain('0,0');
  });
});
