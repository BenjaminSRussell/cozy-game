/**
 * Sprite Renderer with Batching
 * 
 * Optimized sprite rendering system that batches similar sprites together
 * to minimize draw calls and maximize performance.
 */

import { FacingDirection, PlayerAnimationState } from '../types/game';
import { RenderPipeline, Vector2D, RenderObject } from './RenderPipeline';
import { TextureManager, LoadedTexture } from './TextureManager';

/** Character sheet rows: Down=0, Left=1, Right=2, Up=3. */
export const CHARACTER_FACING_ROW: Record<FacingDirection, number> = {
  south: 0,
  west: 1,
  east: 2,
  north: 3,
};

const CHARACTER_ROWS: readonly FacingDirection[] = ['south', 'west', 'east', 'north'];
const CHARACTER_COLUMNS = 4;
const DEFAULT_FRAME_DURATION = 0.15;

export interface SpriteConfig {
  textureId: string;
  sourceRect?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  pivot?: Vector2D;
  tint?: string;
  opacity?: number;
  blendMode?: GlobalCompositeOperation;
}

export interface AnimationFrame {
  textureId: string;
  duration: number;
  sourceRect?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface Animation {
  id: string;
  frames: AnimationFrame[];
  loop: boolean;
  frameRate: number;
}

export interface Sprite extends RenderObject {
  currentAnimation?: string;
  animationTime: number;
  flipped: boolean;
  config: SpriteConfig;
}

export interface CharacterSheetCell {
  row: number;
  column: number;
  direction: FacingDirection;
  sourceRect: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface Particle {
  id: string;
  position: Vector2D;
  velocity: Vector2D;
  acceleration: Vector2D;
  life: number;
  maxLife: number;
  size: number;
  textureId: string;
  color?: string;
  opacity?: number;
  rotation?: number;
  rotationSpeed?: number;
}

export class SpriteRenderer {
  private pipeline: RenderPipeline;
  private textureManager: TextureManager;
  private sprites: Map<string, Sprite> = new Map();
  private animations: Map<string, Animation> = new Map();
  private particles: Particle[] = [];
  private particlePool: Particle[] = [];
  private maxParticles = 1000;

  constructor(pipeline: RenderPipeline) {
    this.pipeline = pipeline;
    this.textureManager = TextureManager.getInstance();
  }

  /**
   * Create a new sprite
   */
  public createSprite(
    id: string,
    layerId: string,
    position: Vector2D,
    size: Vector2D,
    config: SpriteConfig
  ): Sprite {
    const sprite: Sprite = {
      id,
      layerId,
      position,
      size,
      textureId: config.textureId,
      config,
      animationTime: 0,
      flipped: false,
      visible: true,
      opacity: config.opacity || 1,
      tint: config.tint
    };

    this.sprites.set(id, sprite);
    this.pipeline.addRenderObject(sprite);
    return sprite;
  }

  /**
   * Remove a sprite
   */
  public removeSprite(id: string): boolean {
    const sprite = this.sprites.get(id);
    if (sprite) {
      this.sprites.delete(id);
      this.pipeline.removeRenderObject(id);
      return true;
    }
    return false;
  }

  /**
   * Get a sprite by ID
   */
  public getSprite(id: string): Sprite | undefined {
    return this.sprites.get(id);
  }

  /**
   * Update sprite properties
   */
  public updateSprite(id: string, updates: Partial<Sprite>): void {
    const sprite = this.sprites.get(id);
    if (sprite) {
      Object.assign(sprite, updates);
      this.pipeline.updateRenderObject(id, sprite);
    }
  }

  /**
   * Set sprite position
   */
  public setSpritePosition(id: string, position: Vector2D): void {
    this.updateSprite(id, { position });
  }

  /**
   * Set sprite animation
   */
  public setSpriteAnimation(id: string, animationId: string): void {
    const sprite = this.sprites.get(id);
    if (sprite && this.animations.has(animationId)) {
      sprite.currentAnimation = animationId;
      sprite.animationTime = 0;
    }
  }

  /**
   * Flip sprite horizontally
   */
  public flipSprite(id: string, flipped: boolean): void {
    this.updateSprite(id, { flipped });
  }

  /**
   * Register a new animation
   */
  public registerAnimation(animation: Animation): void {
    this.animations.set(animation.id, animation);
  }

  /**
   * Update animations for all sprites
   */
  public updateAnimations(deltaTime: number): void {
    for (const sprite of this.sprites.values()) {
      if (sprite.currentAnimation) {
        const animation = this.animations.get(sprite.currentAnimation);
        if (animation) {
          sprite.animationTime += deltaTime;
          
          // Calculate current frame
          const frameDuration = 1000 / animation.frameRate;
          const frameIndex = Math.floor(sprite.animationTime / frameDuration);
          
          if (frameIndex >= animation.frames.length) {
            if (animation.loop) {
              sprite.animationTime = sprite.animationTime % (frameDuration * animation.frames.length);
            } else {
              sprite.currentAnimation = undefined;
              sprite.animationTime = 0;
            }
          } else {
            const frame = animation.frames[frameIndex];
            sprite.textureId = frame.textureId;
            if (frame.sourceRect) {
              // Update source rect if needed (requires texture atlas support)
            }
          }
        }
      }
    }
  }

  /**
   * Create a particle effect
   */
  public createParticle(config: Partial<Particle>): string {
    if (this.particles.length >= this.maxParticles) {
      return ''; // Max particles reached
    }

    const particle: Particle = {
      id: `particle_${Date.now()}_${Math.random()}`,
      position: config.position || { x: 0, y: 0 },
      velocity: config.velocity || { x: 0, y: 0 },
      acceleration: config.acceleration || { x: 0, y: 0 },
      life: config.life || 1000,
      maxLife: config.maxLife || 1000,
      size: config.size || 10,
      textureId: config.textureId || 'default_particle',
      color: config.color || '#FFFFFF',
      opacity: config.opacity || 1,
      rotation: config.rotation || 0,
      rotationSpeed: config.rotationSpeed || 0
    };

    this.particles.push(particle);
    return particle.id;
  }

  /**
   * Update particle system
   */
  public updateParticles(deltaTime: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i];
      
      // Update physics
      particle.velocity.x += particle.acceleration.x * deltaTime;
      particle.velocity.y += particle.acceleration.y * deltaTime;
      particle.position.x += particle.velocity.x * deltaTime;
      particle.position.y += particle.velocity.y * deltaTime;
      
      // Update rotation
      if (particle.rotationSpeed && particle.rotation !== undefined) {
        particle.rotation += particle.rotationSpeed * deltaTime;
      }
      
      // Update life
      particle.life -= deltaTime;
      
      // Remove dead particles
      if (particle.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  /**
   * Render particles
   */
  public renderParticles(): void {
    for (const particle of this.particles) {
      const lifeRatio = particle.life / particle.maxLife;
      const opacity = (particle.opacity || 1) * lifeRatio;
      
      const renderObject: RenderObject = {
        id: particle.id,
        layerId: 'effects',
        position: particle.position,
        size: { x: particle.size, y: particle.size },
        textureId: particle.textureId,
        opacity,
        rotation: particle.rotation,
        visible: true
      };

      // Add to pipeline for rendering
      this.pipeline.addRenderObject(renderObject);
    }
  }

  /**
   * Create a burst of particles
   */
  public createParticleBurst(
    position: Vector2D,
    count: number,
    config: Partial<Particle>
  ): string[] {
    const particleIds: string[] = [];
    
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count;
      const speed = 50 + Math.random() * 100;
      
      const particleConfig = {
        ...config,
        position,
        velocity: {
          x: Math.cos(angle) * speed,
          y: Math.sin(angle) * speed
        },
        life: (config.life || 1000) * (0.5 + Math.random() * 0.5),
        maxLife: config.maxLife || 1000
      };
      
      const id = this.createParticle(particleConfig);
      if (id) particleIds.push(id);
    }
    
    return particleIds;
  }

  /**
   * Create a simple sprite sheet animation
   */
  public createSpriteSheetAnimation(
    id: string,
    textureId: string,
    frameWidth: number,
    frameHeight: number,
    frames: number[],
    frameRate: number,
    loop: boolean = true
  ): void {
    const animationFrames: AnimationFrame[] = frames.map(frameIndex => ({
      textureId: `${textureId}_frame_${frameIndex}`,
      duration: 1000 / frameRate,
      sourceRect: {
        x: frameIndex * frameWidth,
        y: 0,
        width: frameWidth,
        height: frameHeight
      }
    }));

    this.registerAnimation({
      id,
      frames: animationFrames,
      loop,
      frameRate
    });
  }

  /**
   * Slice a character sheet into 4 rows (Down, Left, Right, Up) and 4 columns.
   */
  public sliceCharacterSheet(sheetWidth: number, sheetHeight: number): CharacterSheetCell[] {
    const frameWidth = sheetWidth / CHARACTER_COLUMNS;
    const frameHeight = sheetHeight / CHARACTER_ROWS.length;
    const cells: CharacterSheetCell[] = [];

    for (let row = 0; row < CHARACTER_ROWS.length; row++) {
      for (let column = 0; column < CHARACTER_COLUMNS; column++) {
        cells.push({
          row,
          column,
          direction: CHARACTER_ROWS[row],
          sourceRect: {
            x: column * frameWidth,
            y: row * frameHeight,
            width: frameWidth,
            height: frameHeight,
          },
        });
      }
    }

    return cells;
  }

  /**
   * Idle walk-cycle state. frameDuration is 0.15s and frameIndex starts at 0.
   */
  public createWalkCycle(direction: FacingDirection = 'south'): PlayerAnimationState {
    return {
      direction,
      frameIndex: 0,
      elapsedTime: 0,
      frameDuration: DEFAULT_FRAME_DURATION,
      isMoving: false,
    };
  }

  /**
   * While moving, frameIndex cycles 0 → 1 → 2 → 3 → 0 every frameDuration seconds.
   * When movement stops, frameIndex returns to 0 and the facing direction stays.
   */
  public updateWalkCycle(
    state: PlayerAnimationState,
    deltaTime: number,
    movement?: { isMoving: boolean; direction?: FacingDirection },
  ): PlayerAnimationState {
    const frameDuration = state.frameDuration > 0 ? state.frameDuration : DEFAULT_FRAME_DURATION;
    const isMoving = movement ? movement.isMoving : state.isMoving;

    if (!isMoving) {
      return {
        direction: state.direction,
        frameIndex: 0,
        elapsedTime: 0,
        frameDuration,
        isMoving: false,
      };
    }

    const direction = movement?.direction ?? state.direction;
    const durationMs = Math.max(1, Math.round(frameDuration * 1000));
    const previousMs = Math.max(0, Math.round(Number.isFinite(state.elapsedTime) ? state.elapsedTime * 1000 : 0));
    const deltaMs = Math.max(0, Math.round(Number.isFinite(deltaTime) ? deltaTime * 1000 : 0));
    const elapsedMs = previousMs + deltaMs;
    const steps = Math.floor(elapsedMs / durationMs);
    const baseFrame = ((state.frameIndex % CHARACTER_COLUMNS) + CHARACTER_COLUMNS) % CHARACTER_COLUMNS;

    return {
      direction,
      frameIndex: (baseFrame + steps) % CHARACTER_COLUMNS,
      elapsedTime: (elapsedMs - steps * durationMs) / 1000,
      frameDuration,
      isMoving: true,
    };
  }

  /**
   * Source rectangle for the current facing row and walk frame.
   */
  public characterFrameRect(
    state: PlayerAnimationState,
    sheetWidth: number,
    sheetHeight: number,
  ): CharacterSheetCell['sourceRect'] {
    const column = ((state.frameIndex % CHARACTER_COLUMNS) + CHARACTER_COLUMNS) % CHARACTER_COLUMNS;
    const row = CHARACTER_FACING_ROW[state.direction] ?? 0;
    const frameWidth = sheetWidth / CHARACTER_COLUMNS;
    const frameHeight = sheetHeight / CHARACTER_ROWS.length;

    return {
      x: column * frameWidth,
      y: row * frameHeight,
      width: frameWidth,
      height: frameHeight,
    };
  }

  /**
   * Get all sprites in a specific layer
   */
  public getSpritesInLayer(layerId: string): Sprite[] {
    return Array.from(this.sprites.values()).filter(sprite => sprite.layerId === layerId);
  }

  /**
   * Get sprites within a certain radius
   */
  public getSpritesInRadius(center: Vector2D, radius: number): Sprite[] {
    return Array.from(this.sprites.values()).filter(sprite => {
      const dx = sprite.position.x - center.x;
      const dy = sprite.position.y - center.y;
      return Math.sqrt(dx * dx + dy * dy) <= radius;
    });
  }

  /**
   * Clear all sprites
   */
  public clearSprites(): void {
    for (const spriteId of this.sprites.keys()) {
      this.pipeline.removeRenderObject(spriteId);
    }
    this.sprites.clear();
  }

  /**
   * Clear all particles
   */
  public clearParticles(): void {
    this.particles = [];
  }

  /**
   * Get performance statistics
   */
  public getStats(): {
    spriteCount: number;
    particleCount: number;
    animationCount: number;
    memoryUsage: number;
  } {
    return {
      spriteCount: this.sprites.size,
      particleCount: this.particles.length,
      animationCount: this.animations.size,
      memoryUsage: this.textureManager.getMemoryStats().estimatedMemoryUsage
    };
  }

  /**
   * Dispose of all resources
   */
  public dispose(): void {
    this.clearSprites();
    this.clearParticles();
    this.animations.clear();
  }
}
