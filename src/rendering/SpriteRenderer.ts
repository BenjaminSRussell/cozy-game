/**
 * Sprite Renderer with Batching
 * 
 * Optimized sprite rendering system that batches similar sprites together
 * to minimize draw calls and maximize performance.
 */

import { RenderPipeline, Vector2D, RenderObject } from './RenderPipeline';
import { TextureManager, LoadedTexture } from './TextureManager';

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
