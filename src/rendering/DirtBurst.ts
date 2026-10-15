/**
 * Dirt grains thrown up when a hoe breaks ground.
 *
 * A small particle set with pure steps. The mounted isometric screen draws through
 * IsometricRenderer's 2D canvas, so the renderer owns one of these and draws it there.
 */

/** Grains thrown per swing. */
export const DIRT_BURST_GRAINS = 10;
/** Seconds a grain stays visible. */
export const DIRT_BURST_LIFE_SECONDS = 0.45;
/** Downward acceleration, in voxel heights per second squared. */
const GRAVITY = 12;
/** Horizontal slowdown per second, so grains skid to a stop. */
const DRAG = 3;

export interface DirtGrain {
  /** Grid position in tile units. A swing starts at the tile centre. */
  x: number;
  y: number;
  /** Height above the ground, in voxel heights. Never negative. */
  z: number;
  vx: number;
  vy: number;
  /** Vertical speed, in voxel heights per second. */
  vz: number;
  /** Seconds left before the grain is removed. */
  life: number;
  /** Radius in CSS pixels. */
  radius: number;
}

export class DirtBurstSystem {
  private grains: DirtGrain[] = [];

  /** `random` returns values in [0, 1). Tests pass a fixed sequence. */
  constructor(private readonly random: () => number = Math.random) {}

  /** Throw a burst of grains up from the centre of a tile. */
  spawn(gridX: number, gridY: number): void {
    for (let i = 0; i < DIRT_BURST_GRAINS; i++) {
      this.grains.push({
        x: gridX,
        y: gridY,
        z: 0,
        vx: (this.random() - 0.5) * 1.5,
        vy: (this.random() - 0.5) * 1.5,
        vz: 2 + this.random() * 2,
        life: DIRT_BURST_LIFE_SECONDS,
        radius: 1.5 + this.random() * 1.5,
      });
    }
  }

  /** Advance every grain by `dt` seconds and drop the spent ones. */
  update(dt: number): void {
    const drag = Math.max(0, 1 - DRAG * dt);
    this.grains = this.grains.flatMap((grain) => {
      const life = grain.life - dt;
      if (life <= 0) return [];

      let vz = grain.vz - GRAVITY * dt;
      let z = grain.z + vz * dt;
      if (z <= 0) {
        z = 0;
        vz = 0;
      }

      return [{
        ...grain,
        x: grain.x + grain.vx * dt,
        y: grain.y + grain.vy * dt,
        z,
        vx: grain.vx * drag,
        vy: grain.vy * drag,
        vz,
        life,
      }];
    });
  }

  /** Live grains, in spawn order. */
  getGrains(): readonly DirtGrain[] {
    return this.grains;
  }
}
