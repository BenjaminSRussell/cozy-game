# Cozy Haven Rendering Pipeline

A comprehensive, high-performance rendering system built for the Cozy Haven farming game. This pipeline provides efficient rendering with texture management, sprite batching, camera controls, and performance monitoring.

## Features

- **🎨 Texture Management**: Automatic SVG loading and caching with fallback support
- **🚀 Sprite Batching**: Optimized rendering with texture batching for performance
- **📷 Camera System**: Smooth camera movement, zoom, and viewport culling
- **📚 Layer System**: Organized rendering with parallax and effects
- **📊 Performance Monitoring**: Real-time performance tracking and optimization
- **🌟 Particle Effects**: Built-in particle system for visual effects

## Quick Start

```typescript
import { createRenderer, loadCozyGameAssets } from './rendering';

// Get canvas element
const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;

// Create renderer
const renderer = createRenderer(canvas, {
  enablePerformanceMonitoring: true,
  textureQuality: 'high'
});

// Load game assets
const assets = loadCozyGameAssets();

// Initialize renderer
await renderer.initialize(assets);

// Render game world
renderer.render(gameWorld);
```

## Architecture

### Core Components

1. **RenderPipeline**: Main rendering engine with layer management
2. **TextureManager**: SVG loading, caching, and rasterization
3. **SpriteRenderer**: Sprite management with batching and animations
4. **CameraSystem**: Camera controls with viewport culling
5. **LayerSystem**: Layer-based rendering with effects
6. **PerformanceMonitor**: Performance tracking and optimization

### Rendering Layers

- `background` (zIndex: 0) - Sky, distant objects
- `far_background` (zIndex: 50) - Hills, distant trees
- `terrain` (zIndex: 100) - Ground, tiles, paths
- `buildings` (zIndex: 200) - Buildings, structures
- `objects` (zIndex: 300) - Crops, decorations, furniture
- `characters` (zIndex: 400) - Player, NPCs, animals
- `effects` (zIndex: 500) - Particles, highlights
- `ui` (zIndex: 1000) - HUD, menus, overlays

## Usage Examples

### Creating Sprites

```typescript
// Create a crop sprite
const cropSprite = renderer.getSpriteRenderer().createSprite(
  'wheat_crop_1',
  'objects',
  { x: 100, y: 150 },
  { x: 32, y: 32 },
  {
    textureId: 'wheat',
    opacity: 1.0
  }
);

// Update sprite position
renderer.getSpriteRenderer().setSpritePosition('wheat_crop_1', { x: 120, y: 150 });
```

### Camera Controls

```typescript
const camera = renderer.getCamera();

// Move camera
camera.moveTo({ x: 200, y: 300 });

// Zoom in/out
camera.zoomTo(1.5);
camera.zoomBy(0.1);

// Set bounds
camera.setBounds({
  min: { x: -500, y: -500 },
  max: { x: 500, y: 500 },
  enabled: true
});
```

### Particle Effects

```typescript
// Create harvest effect
const particles = renderer.createParticleEffect(
  { x: 100, y: 100 },
  'harvest',
  20
);
```

### Performance Monitoring

```typescript
// Get performance stats
const stats = renderer.getPerformanceStats();
console.log('Performance Grade:', stats.monitor.summary.grade);
console.log('FPS:', stats.monitor.metrics.fps);
console.log('Memory Usage:', stats.monitor.metrics.memoryUsage);
```

## Asset Management

### SVG Assets

The renderer automatically loads and rasterizes SVG assets:

```typescript
// Load custom texture
await renderer.getTextureManager().loadTexture({
  id: 'custom_building',
  path: '/assets/custom/building.svg',
  width: 128,
  height: 128
});
```

### Texture Variants

Create different sizes of the same texture:

```typescript
const smallTexture = await renderer.getTextureManager()
  .createTextureVariant('building', 'building_small', 64, 64);
```

## Performance Optimization

### Automatic Optimizations

- **Viewport Culling**: Only renders objects visible in camera view
- **Texture Batching**: Groups similar textures to reduce draw calls
- **Layer Culling**: Skips invisible layers
- **Memory Management**: Automatic texture cleanup and caching

### Performance Profiles

The system includes automatic optimization profiles:

- **Low FPS**: Reduces render quality and effects
- **High Memory**: Unloads unused textures
- **High Draw Calls**: Enables more aggressive batching

### Custom Optimization

```typescript
// Add custom optimization profile
renderer.getPerformanceMonitor().addOptimizationProfile({
  name: 'custom_optimization',
  enabled: true,
  priority: 1,
  conditions: (metrics) => metrics.fps < 45,
  apply: (metrics) => {
    // Custom optimization logic
    console.log('Applying custom optimization');
  }
});
```

## Configuration Options

```typescript
const config: RendererConfig = {
  canvas: gameCanvas,
  width: 800,
  height: 600,
  enablePerformanceMonitoring: true,
  enableBatching: true,
  enableCulling: true,
  maxTextures: 1000,
  textureQuality: 'medium' // 'low' | 'medium' | 'high'
};
```

## Integration with GameScreen

Replace the existing canvas rendering in GameScreen.tsx:

```typescript
import { createRenderer, loadCozyGameAssets } from '../rendering';

export const GameScreen: React.FC<GameScreenProps> = ({ onSave }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<GameRenderer | null>(null);

  useEffect(() => {
    if (canvasRef.current && !rendererRef.current) {
      // Initialize renderer
      rendererRef.current = createRenderer(canvasRef.current);
      
      // Load assets
      const assets = loadCozyGameAssets();
      rendererRef.current.initialize(assets);
    }
  }, []);

  // In your render loop:
  useEffect(() => {
    if (rendererRef.current && world) {
      rendererRef.current.render(world);
    }
  }, [world, redrawTrigger]);

  return (
    <canvas
      ref={canvasRef}
      width={SCREEN_WIDTH - 20}
      height={400}
      style={{
        border: '2px solid #8B4513',
        borderRadius: '8px',
        display: 'block',
      }}
    />
  );
};
```

## Performance Tips

1. **Enable Batching**: Always keep sprite batching enabled for better performance
2. **Use Viewport Culling**: Reduces rendering overhead for large worlds
3. **Monitor Memory**: Keep an eye on texture memory usage
4. **Optimize Layers**: Disable unused layers and effects
5. **Texture Quality**: Adjust based on device capabilities

## Troubleshooting

### Common Issues

- **SVG Not Loading**: Check file paths and ensure SVG files exist
- **Poor Performance**: Enable performance monitoring to identify bottlenecks
- **Memory Leaks**: Ensure proper cleanup when disposing renderer
- **Camera Issues**: Check bounds configuration and viewport settings

### Debug Mode

Enable debug mode for detailed performance information:

```typescript
const renderer = createRenderer(canvas, {
  enablePerformanceMonitoring: true
});

// Get detailed performance report
const report = renderer.getPerformanceStats();
console.log('Performance Report:', report);
```

## API Reference

### GameRenderer

Main renderer class that combines all systems.

#### Methods

- `initialize(assets: GameAsset[])`: Initialize with game assets
- `render(world: GameWorld)`: Render the game world
- `resize(width, height)`: Handle canvas resize
- `createParticleEffect(position, type, count)`: Create particle effects
- `getPerformanceStats()`: Get performance statistics
- `dispose()`: Clean up resources

### CameraSystem

Camera controls and viewport management.

#### Methods

- `moveTo(position)`: Move camera to position
- `zoomTo(level)`: Set zoom level
- `setBounds(bounds)`: Set movement bounds
- `worldToScreen(pos)`: Convert world to screen coordinates
- `screenToWorld(pos)`: Convert screen to world coordinates

### SpriteRenderer

Sprite management and rendering.

#### Methods

- `createSprite(id, layer, position, size, config)`: Create sprite
- `removeSprite(id)`: Remove sprite
- `setSpritePosition(id, position)`: Update sprite position
- `setSpriteAnimation(id, animationId)`: Play animation

## Contributing

When adding new features to the rendering pipeline:

1. Follow the existing architecture patterns
2. Add performance monitoring for new features
3. Include comprehensive TypeScript types
4. Add usage examples to documentation
5. Test with different device capabilities

## License

This rendering system is part of the Cozy Haven game project.
