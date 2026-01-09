/**
 * Rendering System Exports
 * 
 * Central export point for all rendering components
 */

import { GameRenderer, RendererConfig, GameAsset } from './GameRenderer';

export { RenderPipeline, Vector2D, RenderObject, RenderLayer, Camera } from './RenderPipeline';
export { TextureManager, TextureConfig, LoadedTexture } from './TextureManager';
export { SpriteRenderer, Sprite, Particle, Animation, AnimationFrame } from './SpriteRenderer';
export { CameraSystem, CameraBounds, CameraFollowTarget } from './CameraSystem';
export { LayerSystem, Layer, LayerConfig, LayerEffect } from './LayerSystem';
export { PerformanceMonitor, PerformanceMetrics, PerformanceAlert } from './PerformanceMonitor';
export { GameRenderer, RendererConfig, GameAsset } from './GameRenderer';

/**
 * Quick setup function for creating a complete rendering system
 */
export function createRenderer(canvas: HTMLCanvasElement, config: Partial<RendererConfig> = {}): GameRenderer {
  const defaultConfig: RendererConfig = {
    canvas,
    width: canvas.width || 800,
    height: canvas.height || 600,
    enablePerformanceMonitoring: true,
    enableBatching: true,
    enableCulling: true,
    maxTextures: 1000,
    textureQuality: 'medium',
    ...config
  };

  return new GameRenderer(defaultConfig);
}

/**
 * Asset loading helper for cozy game assets
 */
export function loadCozyGameAssets(): GameAsset[] {
  return [
    // Terrain tiles
    { id: 'grass', type: 'texture', path: '/assets/tiles/grass.svg' },
    { id: 'dirt', type: 'texture', path: '/assets/tiles/dirt.svg' },
    { id: 'water', type: 'texture', path: '/assets/tiles/water.svg' },
    
    // Buildings
    { id: 'barn', type: 'texture', path: '/assets/buildings/barn.svg' },
    { id: 'house', type: 'texture', path: '/assets/buildings/house.svg' },
    { id: 'shed', type: 'texture', path: '/assets/buildings/shed.svg' },
    
    // Crops
    { id: 'wheat', type: 'texture', path: '/assets/crops/wheat.svg' },
    { id: 'carrot', type: 'texture', path: '/assets/crops/carrot.svg' },
    { id: 'tomato', type: 'texture', path: '/assets/crops/tomato.svg' },
    
    // Decorations
    { id: 'bench', type: 'texture', path: '/assets/decorations/bench.svg' },
    { id: 'lamp', type: 'texture', path: '/assets/decorations/lamp.svg' },
    { id: 'tree_oak', type: 'texture', path: '/assets/decorations/tree_oak.svg' },
    
    // UI elements
    { id: 'sky_gradient', type: 'texture', path: '/assets/ui/sky_gradient.svg' },
    { id: 'cloud', type: 'texture', path: '/assets/ui/cloud.svg' },
    
    // Particles
    { id: 'harvest_particle', type: 'texture', path: '/assets/particles/harvest.svg' },
    { id: 'plant_particle', type: 'texture', path: '/assets/particles/plant.svg' },
    { id: 'water_particle', type: 'texture', path: '/assets/particles/water.svg' },
    { id: 'build_particle', type: 'texture', path: '/assets/particles/build.svg' },
    { id: 'default_particle', type: 'texture', path: '/assets/particles/default.svg' }
  ];
}
