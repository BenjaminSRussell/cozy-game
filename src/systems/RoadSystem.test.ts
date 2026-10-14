import { describe, expect, it } from 'vitest';
import type { Road } from '../types/game';
import { CONNECTION_MASK, RoadSystem } from './RoadSystem';

const water = { position: { x: 2, y: 3 }, type: 'water', walkable: false };
const grass = { position: { x: 4, y: 5 }, type: 'grass', walkable: true };
const blockedStone = { position: { x: 1, y: 1 }, type: 'stone', walkable: false };

describe('RoadSystem.buildRoad', () => {
  it('refuses a road on water', () => {
    const result = RoadSystem.buildRoad({ x: water.position.x, y: water.position.y }, 'gravel', {
      tiles: [water, grass],
      roads: [],
    });

    expect(result.success).toBe(false);
    expect(result.reason).toBe('Cannot build road on water');
    expect(result.road).toBeUndefined();
    expect(result.roads).toBeUndefined();
  });

  it('refuses a road on other non-walkable tiles', () => {
    const result = RoadSystem.buildRoad(
      { x: blockedStone.position.x, y: blockedStone.position.y },
      'gravel',
      { tiles: [blockedStone, grass] }
    );

    expect(result).toMatchObject({
      success: false,
      reason: 'Cannot build road on non-walkable tile',
    });
    expect(result.road).toBeUndefined();
  });

  it('refuses water even when the tile is marked walkable', () => {
    const result = RoadSystem.buildRoad({ x: 0, y: 0 }, 'paved', {
      tiles: [{ position: { x: 0, y: 0 }, type: 'water', walkable: true }],
    });

    expect(result.success).toBe(false);
    expect(result.reason).toBe('Cannot build road on water');
  });

  it('places a gravel road on grass and links it to a neighbor', () => {
    const neighbor: Road = {
      id: 'road_4_4',
      type: 'dirt',
      grade: 'gravel',
      lanes: 1,
      position: { x: grass.position.x, y: grass.position.y - 1 },
      connections: 0,
    };

    const result = RoadSystem.buildRoad(
      { x: grass.position.x, y: grass.position.y },
      'gravel',
      { tiles: [water, grass, blockedStone], roads: [neighbor] }
    );

    expect(result.success).toBe(true);
    expect(result.reason).toBeUndefined();
    expect(result.road).toMatchObject({
      type: 'dirt',
      grade: 'gravel',
      lanes: 1,
      position: { x: 4, y: 5 },
      connections: CONNECTION_MASK.TOP,
    });
    expect(result.roads).toHaveLength(2);
    expect(result.roads?.find((road) => road.id === neighbor.id)?.connections).toBe(
      CONNECTION_MASK.BOTTOM
    );
    expect(neighbor.connections).toBe(0);
  });
});
