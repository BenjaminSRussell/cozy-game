import { Road, Vector2D } from '../types/game';

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
}
