/**
 * Advanced Camera System with Viewport Culling
 * 
 * Provides smooth camera movement, zoom controls, and efficient viewport culling
 * to optimize rendering performance by only drawing visible objects.
 */

import { Vector2D, RenderObject } from './RenderPipeline';

export interface CameraBounds {
  min: Vector2D;
  max: Vector2D;
  enabled: boolean;
}

export interface CameraShake {
  intensity: number;
  duration: number;
  frequency: number;
  currentTime: number;
}

export interface CameraFollowTarget {
  position: Vector2D;
  offset?: Vector2D;
  smoothing?: number;
  bounds?: CameraBounds;
}

/** World-space edges of the farm. The camera view is kept inside this box. */
export interface FarmMapBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

// Screen-space box centered on the viewport midpoint. The camera chases only
// after the player leaves it. 0.08 is the per-update follow, not the moveTo smoother.
const DEADZONE_WIDTH = 80;
const DEADZONE_HEIGHT = 60;
const DEADZONE_FOLLOW = 0.08;

export interface ViewportCullingResult {
  visibleObjects: RenderObject[];
  culledObjects: RenderObject[];
  totalObjects: number;
  cullingRatio: number;
}

export class CameraSystem {
  public position: Vector2D;
  public zoom: number;
  public rotation: number;
  public viewport: Vector2D;
  public bounds: CameraBounds;
  
  private targetPosition: Vector2D;
  private targetZoom: number;
  private targetRotation: number;
  private followTarget?: CameraFollowTarget;
  private trackedPlayer?: Vector2D;
  private farmMap?: FarmMapBounds;
  private shake?: CameraShake;
  // Last frame's shake, removed before the follow lerp so it is not the new origin.
  private shakeOffset: Vector2D = { x: 0, y: 0 };
  private smoothing: number = 0.1;
  // 0.5 keeps 64px tiles at least 32px. 3× is already very close.
  private minZoom: number = 0.5;
  private maxZoom: number = 3.0;

  constructor(viewportWidth: number, viewportHeight: number) {
    this.position = { x: 0, y: 0 };
    this.targetPosition = { x: 0, y: 0 };
    this.zoom = 1.0;
    this.targetZoom = 1.0;
    this.rotation = 0;
    this.targetRotation = 0;
    this.viewport = { x: viewportWidth, y: viewportHeight };
    this.bounds = {
      min: { x: -Infinity, y: -Infinity },
      max: { x: Infinity, y: Infinity },
      enabled: false
    };
  }

  /**
   * Update camera with smooth interpolation
   */
  public update(deltaTime: number): void {
    // Shake is a temporary displacement. Drop it before the follow lerp so
    // the shaken position is not treated as the new origin.
    this.position.x -= this.shakeOffset.x;
    this.position.y -= this.shakeOffset.y;
    this.shakeOffset.x = 0;
    this.shakeOffset.y = 0;

    // smoothing 0.1 is one 60 FPS frame. Scale it by deltaTime so a fast
    // machine does not cover more ground per second than a slow one.
    // Snap inside a sub-pixel (zoom: 0.001) so the camera still arrives.
    const t = 1 - Math.pow(1 - this.smoothing, deltaTime * 60);
    const dx = this.targetPosition.x - this.position.x;
    const dy = this.targetPosition.y - this.position.y;
    this.position.x = Math.abs(dx) < 0.5 ? this.targetPosition.x : this.position.x + dx * t;
    this.position.y = Math.abs(dy) < 0.5 ? this.targetPosition.y : this.position.y + dy * t;

    const zoomDelta = this.targetZoom - this.zoom;
    this.zoom = Math.abs(zoomDelta) < 0.001 ? this.targetZoom : this.zoom + zoomDelta * t;

    // Smooth rotation interpolation
    this.rotation += (this.targetRotation - this.rotation) * this.smoothing;

    // Apply follow target if exists
    if (this.followTarget) {
      this.updateFollowTarget();
    }

    // Deadzone chase uses the unshaken origin. Shake is added below and must
    // not be written back into targetPosition.
    this.applyDeadzoneFollow();

    // Apply camera shake
    if (this.shake) {
      this.updateShake(deltaTime);
    }

    // Enforce bounds
    this.enforceBounds();
  }

  /**
   * Set camera position immediately
   */
  public setPosition(position: Vector2D): void {
    this.position = { ...position };
    this.targetPosition = { ...position };
    // Absolute placement. Do not subtract a stale shake offset next frame.
    this.shakeOffset.x = 0;
    this.shakeOffset.y = 0;
  }

  /**
   * Move camera to position with smoothing
   */
  public moveTo(position: Vector2D): void {
    this.targetPosition = { ...position };
  }

  /**
   * Move camera by offset
   */
  public moveBy(offset: Vector2D): void {
    this.targetPosition.x += offset.x;
    this.targetPosition.y += offset.y;
  }

  /**
   * Set zoom level immediately
   */
  public setZoom(zoom: number): void {
    this.targetZoom = Math.max(this.minZoom, Math.min(this.maxZoom, zoom));
    this.zoom = this.targetZoom;
  }

  /**
   * Zoom to level with smoothing
   */
  public zoomTo(zoom: number): void {
    this.targetZoom = Math.max(this.minZoom, Math.min(this.maxZoom, zoom));
  }

  /**
   * Zoom by factor
   */
  public zoomBy(factor: number): void {
    this.targetZoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.targetZoom * factor));
  }

  /**
   * Set camera rotation immediately
   */
  public setRotation(rotation: number): void {
    this.rotation = rotation;
    this.targetRotation = rotation;
  }

  /**
   * Rotate to angle with smoothing
   */
  public rotateTo(rotation: number): void {
    this.targetRotation = rotation;
  }

  /**
   * Rotate by angle
   */
  public rotateBy(angle: number): void {
    this.targetRotation += angle;
  }

  /**
   * Set camera to follow a target
   */
  public setFollowTarget(target: CameraFollowTarget): void {
    this.followTarget = target;
    if (target.bounds) {
      this.bounds = target.bounds;
    }
  }

  /**
   * Clear follow target
   */
  public clearFollowTarget(): void {
    this.followTarget = undefined;
  }

  /**
   * Follow the player in world space. Screen position is derived from the
   * unshaken camera: inside the 80×60 px deadzone the camera stays put, and
   * outside it this chases by 0.08. The view is then clamped to `farmMap`.
   */
  public followPlayer(player: Vector2D, farmMap: FarmMapBounds): void {
    this.trackedPlayer = { x: player.x, y: player.y };
    this.farmMap = { ...farmMap };
  }

  /**
   * Stop deadzone follow. moveTo smoothing applies again on the next update.
   */
  public clearPlayerFollow(): void {
    this.trackedPlayer = undefined;
    this.farmMap = undefined;
  }

  private applyDeadzoneFollow(): void {
    const player = this.trackedPlayer;
    const farmMap = this.farmMap;
    if (!player || !farmMap) return;

    const screen = this.worldToScreen(player);
    const midX = this.viewport.x / 2;
    const midY = this.viewport.y / 2;
    const outside =
      Math.abs(screen.x - midX) > DEADZONE_WIDTH / 2 ||
      Math.abs(screen.y - midY) > DEADZONE_HEIGHT / 2;

    const camera = this.position;
    if (outside) {
      // World-space chase. camera.x is the look-at point, so the follow target
      // is the player's world position (screen pixels only gate the deadzone).
      camera.x += (player.x - camera.x) * DEADZONE_FOLLOW;
      camera.y += (player.y - camera.y) * DEADZONE_FOLLOW;
    }

    this.clampViewToFarmMap(camera, farmMap);
    // Keep the moveTo smoother and the next shake removal on this origin.
    this.targetPosition.x = camera.x;
    this.targetPosition.y = camera.y;
  }

  private clampViewToFarmMap(camera: Vector2D, farmMap: FarmMapBounds): void {
    const halfW = this.viewport.x / (2 * this.zoom);
    const halfH = this.viewport.y / (2 * this.zoom);

    let minX = farmMap.minX + halfW;
    let maxX = farmMap.maxX - halfW;
    if (minX > maxX) {
      const mid = (farmMap.minX + farmMap.maxX) / 2;
      minX = mid;
      maxX = mid;
    }

    let minY = farmMap.minY + halfH;
    let maxY = farmMap.maxY - halfH;
    if (minY > maxY) {
      const mid = (farmMap.minY + farmMap.maxY) / 2;
      minY = mid;
      maxY = mid;
    }

    camera.x = Math.max(minX, Math.min(maxX, camera.x));
    camera.y = Math.max(minY, Math.min(maxY, camera.y));
  }

  private updateFollowTarget(): void {
    if (!this.followTarget) return;

    const target = this.followTarget;
    const offset = target.offset || { x: 0, y: 0 };
    const smoothing = target.smoothing || this.smoothing;

    // Calculate target position with offset
    const desiredPosition = {
      x: target.position.x + offset.x,
      y: target.position.y + offset.y
    };

    // Apply smoothing
    this.targetPosition.x += (desiredPosition.x - this.targetPosition.x) * smoothing;
    this.targetPosition.y += (desiredPosition.y - this.targetPosition.y) * smoothing;
  }

  /**
   * Start camera shake effect
   */
  public startShake(intensity: number, duration: number, frequency: number = 10): void {
    this.shake = {
      intensity,
      duration,
      frequency,
      currentTime: 0
    };
  }

  private updateShake(deltaTime: number): void {
    if (!this.shake) return;

    this.shake.currentTime += deltaTime;
    if (this.shake.currentTime >= this.shake.duration) {
      this.shake = undefined;
      return;
    }

    const progress = this.shake.currentTime / this.shake.duration;
    const decay = 1 - progress;
    const offsetX = Math.sin(this.shake.currentTime * this.shake.frequency) * this.shake.intensity * decay;
    const offsetY = Math.cos(this.shake.currentTime * this.shake.frequency * 1.3) * this.shake.intensity * decay;
    this.position.x += offsetX;
    this.position.y += offsetY;
    this.shakeOffset.x = offsetX;
    this.shakeOffset.y = offsetY;
  }

  /**
   * Convert world coordinates to screen coordinates
   */
  public worldToScreen(worldPos: Vector2D): Vector2D {
    // Apply rotation
    const cos = Math.cos(-this.rotation);
    const sin = Math.sin(-this.rotation);
    
    const translatedX = worldPos.x - this.position.x;
    const translatedY = worldPos.y - this.position.y;
    
    const rotatedX = translatedX * cos - translatedY * sin;
    const rotatedY = translatedX * sin + translatedY * cos;
    
    // Apply zoom and center
    return {
      x: rotatedX * this.zoom + this.viewport.x / 2,
      y: rotatedY * this.zoom + this.viewport.y / 2
    };
  }

  /**
   * Convert screen coordinates to world coordinates
   */
  public screenToWorld(screenPos: Vector2D): Vector2D {
    // Remove zoom and center
    const unzoomedX = (screenPos.x - this.viewport.x / 2) / this.zoom;
    const unzoomedY = (screenPos.y - this.viewport.y / 2) / this.zoom;
    
    // Apply inverse rotation
    const cos = Math.cos(this.rotation);
    const sin = Math.sin(this.rotation);
    
    const rotatedX = unzoomedX * cos - unzoomedY * sin;
    const rotatedY = unzoomedX * sin + unzoomedY * cos;
    
    // Add camera position
    return {
      x: rotatedX + this.position.x,
      y: rotatedY + this.position.y
    };
  }

  /**
   * Get visible world bounds
   */
  public getWorldBounds(): {
    min: Vector2D;
    max: Vector2D;
  } {
    const corners = [
      { x: 0, y: 0 },
      { x: this.viewport.x, y: 0 },
      { x: this.viewport.x, y: this.viewport.y },
      { x: 0, y: this.viewport.y }
    ];

    const worldCorners = corners.map(corner => this.screenToWorld(corner));

    const minX = Math.min(...worldCorners.map(c => c.x));
    const minY = Math.min(...worldCorners.map(c => c.y));
    const maxX = Math.max(...worldCorners.map(c => c.x));
    const maxY = Math.max(...worldCorners.map(c => c.y));

    return {
      min: { x: minX, y: minY },
      max: { x: maxX, y: maxY }
    };
  }

  /**
   * Check if an object is visible in the viewport
   */
  public isVisible(object: RenderObject, padding: number = 0): boolean {
    const objectBounds = this.getObjectBounds(object);
    const viewportBounds = this.getWorldBounds();

    // Expand viewport bounds by padding
    viewportBounds.min.x -= padding;
    viewportBounds.min.y -= padding;
    viewportBounds.max.x += padding;
    viewportBounds.max.y += padding;

    return !(
      objectBounds.max.x < viewportBounds.min.x ||
      objectBounds.min.x > viewportBounds.max.x ||
      objectBounds.max.y < viewportBounds.min.y ||
      objectBounds.min.y > viewportBounds.max.y
    );
  }

  /**
   * Get bounds of a render object
   */
  private getObjectBounds(object: RenderObject): {
    min: Vector2D;
    max: Vector2D;
  } {
    const scale = object.scale || { x: 1, y: 1 };
    const halfWidth = (object.size.x * scale.x) / 2;
    const halfHeight = (object.size.y * scale.y) / 2;

    return {
      min: {
        x: object.position.x - halfWidth,
        y: object.position.y - halfHeight
      },
      max: {
        x: object.position.x + halfWidth,
        y: object.position.y + halfHeight
      }
    };
  }

  /**
   * Perform viewport culling on a list of objects
   */
  public cullObjects(objects: RenderObject[], padding: number = 0): ViewportCullingResult {
    const visibleObjects: RenderObject[] = [];
    const culledObjects: RenderObject[] = [];

    for (const object of objects) {
      if (object.visible === false) {
        culledObjects.push(object);
      } else if (this.isVisible(object, padding)) {
        visibleObjects.push(object);
      } else {
        culledObjects.push(object);
      }
    }

    return {
      visibleObjects,
      culledObjects,
      totalObjects: objects.length,
      cullingRatio: culledObjects.length / objects.length
    };
  }

  /**
   * Set camera bounds
   */
  public setBounds(bounds: CameraBounds): void {
    this.bounds = bounds;
  }

  /**
   * Enable/disable bounds
   */
  public setBoundsEnabled(enabled: boolean): void {
    this.bounds.enabled = enabled;
  }

  private enforceBounds(): void {
    if (!this.bounds.enabled) return;

    const worldBounds = this.getWorldBounds();
    const currentBounds = this.bounds;

    // Check if camera is outside bounds and adjust
    if (worldBounds.min.x < currentBounds.min.x) {
      this.targetPosition.x += currentBounds.min.x - worldBounds.min.x;
    }
    if (worldBounds.max.x > currentBounds.max.x) {
      this.targetPosition.x -= worldBounds.max.x - currentBounds.max.x;
    }
    if (worldBounds.min.y < currentBounds.min.y) {
      this.targetPosition.y += currentBounds.min.y - worldBounds.min.y;
    }
    if (worldBounds.max.y > currentBounds.max.y) {
      this.targetPosition.y -= worldBounds.max.y - currentBounds.max.y;
    }
  }

  /**
   * Set smoothing factor for camera movement
   */
  public setSmoothing(smoothing: number): void {
    this.smoothing = Math.max(0, Math.min(1, smoothing));
  }

  /**
   * Set zoom limits
   */
  public setZoomLimits(minZoom: number, maxZoom: number): void {
    this.minZoom = Math.max(0.5, minZoom);
    this.maxZoom = Math.max(this.minZoom, maxZoom);
  }

  /**
   * Resize viewport
   */
  public resize(width: number, height: number): void {
    this.viewport = { x: width, y: height };
  }

  /**
   * Get camera matrix for transformations
   */
  public getMatrix(): number[] {
    const cos = Math.cos(-this.rotation);
    const sin = Math.sin(-this.rotation);
    
    return [
      cos * this.zoom, sin * this.zoom, 0,
      -sin * this.zoom, cos * this.zoom, 0,
      -this.position.x * this.zoom + this.viewport.x / 2,
      -this.position.y * this.zoom + this.viewport.y / 2,
      1
    ];
  }

  /**
   * Reset camera to default state
   */
  public reset(): void {
    this.position = { x: 0, y: 0 };
    this.targetPosition = { x: 0, y: 0 };
    this.zoom = 1.0;
    this.targetZoom = 1.0;
    this.rotation = 0;
    this.targetRotation = 0;
    this.followTarget = undefined;
    this.trackedPlayer = undefined;
    this.farmMap = undefined;
    this.shake = undefined;
    this.shakeOffset.x = 0;
    this.shakeOffset.y = 0;
  }
}
