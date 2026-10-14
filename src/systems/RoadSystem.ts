import { Road, RoadGrade, Vector2D } from '../types/game';

/** Tile facts buildRoad needs. walkable false blocks even when the type is not water. */
export interface RoadPlacementTile {
    position: Vector2D;
    type?: string;
    walkable?: boolean;
}

export interface RoadPlacementWorld {
    tiles?: readonly RoadPlacementTile[];
    roads?: readonly Road[];
}

export interface RoadBuildResult {
    success: boolean;
    reason?: string;
    road?: Road;
    roads?: Road[];
}

// Bitmask constants for road connections
// 1 = Top, 2 = Right, 4 = Bottom, 8 = Left
export const CONNECTION_MASK = {
    TOP: 1,
    RIGHT: 2,
    BOTTOM: 4,
    LEFT: 8
};

export class RoadSystem {
    /**
     * Calculate connection bitmask for a road info
     */
    public static calculateConnections(road: Road, allRoads: Road[]): number {
        let connections = 0;
        const { x, y } = road.position;

        // Check neighbors
        if (this.hasRoadAt(allRoads, x, y - 1)) connections |= CONNECTION_MASK.TOP;
        if (this.hasRoadAt(allRoads, x + 1, y)) connections |= CONNECTION_MASK.RIGHT;
        if (this.hasRoadAt(allRoads, x, y + 1)) connections |= CONNECTION_MASK.BOTTOM;
        if (this.hasRoadAt(allRoads, x - 1, y)) connections |= CONNECTION_MASK.LEFT;

        return connections;
    }

    private static hasRoadAt(roads: Road[], x: number, y: number): boolean {
        return roads.some(r => r.position.x === x && r.position.y === y);
    }

    /**
     * Refreshes all connections for a set of roads
     * Use this when placing/removing roads to ensure neighbors update
     */
    public static refreshAllConnections(roads: Road[]): Road[] {
        return roads.map(road => ({
            ...road,
            connections: this.calculateConnections(road, roads)
        }));
    }

    /**
     * Place a road on a walkable tile.
     * Water is refused even if walkable is omitted. Other tiles are refused when walkable is false.
     * A missing tile is not treated as blocked.
     */
    public static buildRoad(
        position: Vector2D,
        grade: RoadGrade,
        world: RoadPlacementWorld = {}
    ): RoadBuildResult {
        const tile = world.tiles?.find(t => t.position.x === position.x && t.position.y === position.y);
        if (tile?.type === 'water' || tile?.walkable === false) {
            return {
                success: false,
                reason: tile?.type === 'water'
                    ? 'Cannot build road on water'
                    : 'Cannot build road on non-walkable tile'
            };
        }

        const road: Road = {
            id: `road_${position.x}_${position.y}`,
            type: grade === 'paved' ? 'paved' : 'dirt',
            grade,
            lanes: 1,
            position,
            connections: 0
        };

        const roads = this.refreshAllConnections([...(world.roads ?? []), road]);
        return {
            success: true,
            road: roads[roads.length - 1],
            roads
        };
    }
}
