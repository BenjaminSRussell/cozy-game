import React, { useEffect, useRef, useState } from 'react';
import { TileMap, TileMapConfig } from '../engine/TileMap';
import { TileRenderer, TileRendererConfig } from '../engine/TileRenderer';
import { Camera } from '../engine/Renderer2D5';
import { Building } from '../types/game';

/**
 * Tile-based 2.5D Game Component
 * Demonstrates the new tile system with isometric rendering
 */

export const TileGameScreen: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tileMap, setTileMap] = useState<TileMap | null>(null);
  const [tileRenderer, setTileRenderer] = useState<TileRenderer | null>(null);
  const [camera, setCamera] = useState<Camera>({
    x: 0,
    y: 0,
    z: 0,
    scale: 1,
    rotation: 0,
  });
  const animationFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  // Initialize tile map and renderer
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = 800;
    canvas.height = 600;

    // Create tile map
    const tileMapConfig: TileMapConfig = {
      width: 50,
      height: 50,
      tileSize: 32,
      elevationScale: 8,
    };

    const map = new TileMap(tileMapConfig);
    setTileMap(map);

    // Create tile renderer
    const rendererConfig: TileRendererConfig = {
      tileSize: 32,
      enableShadows: true,
      enableAnimations: true,
      shadowOpacity: 0.3,
      shadowOffset: 4,
    };

    const gameCanvas = {
      context: ctx,
      width: canvas.width,
      height: canvas.height,
    };

    const renderer = new TileRenderer(gameCanvas, map, rendererConfig);
    setTileRenderer(renderer);

    // Add some sample buildings and crops
    addSampleContent(map);

    // Position camera in center of map
    setCamera({
      x: (tileMapConfig.width * tileMapConfig.tileSize) / 2,
      y: (tileMapConfig.height * tileMapConfig.tileSize) / 2,
      z: 0,
      scale: 1.5,
      rotation: 0,
    });

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Add sample buildings and crops to the map
  const addSampleContent = (map: TileMap) => {
    // Add some buildings
    const buildings: Building[] = [
      {
        id: 'house1',
        type: 'house',
        position: { x: 10, y: 10, z: 0 },
        rotation: 0,
        unlocked: true,
        level: 1,
        spriteId: 'house_sprite'
      },
      {
        id: 'barn1',
        type: 'barn',
        position: { x: 15, y: 12, z: 0 },
        rotation: 0,
        unlocked: true,
        level: 1,
        spriteId: 'barn_sprite'
      },
      {
        id: 'silo1',
        type: 'silo',
        position: { x: 8, y: 15, z: 0 },
        rotation: 0,
        unlocked: true,
        level: 1,
        spriteId: 'silo_sprite'
      },
    ];

    buildings.forEach(building => {
      map.placeBuilding(building.position.x, building.position.y, building);
    });

    // Add some crops
    const cropTypes = ['wheat', 'carrot', 'tomato', 'corn'] as const;
    for (let i = 0; i < 20; i++) {
      const x = 5 + Math.floor(Math.random() * 20);
      const y = 5 + Math.floor(Math.random() * 20);
      const cropType = cropTypes[Math.floor(Math.random() * cropTypes.length)];

      if (map.isWalkable(x, y)) {
        map.placeCrop(x, y, cropType);
      }
    }
  };

  // Game loop
  useEffect(() => {
    if (!tileRenderer) return;

    const gameLoop = (currentTime: number) => {
      const deltaTime = (currentTime - lastTimeRef.current) / 1000;
      lastTimeRef.current = currentTime;

      // Update renderer animations
      tileRenderer.update(deltaTime);

      // Render the scene
      tileRenderer.render(camera);

      animationFrameRef.current = requestAnimationFrame(gameLoop);
    };

    animationFrameRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [tileRenderer, camera]);

  // Handle mouse controls for camera
  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !tileRenderer) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Convert screen coordinates to world coordinates
    const worldPos = tileRenderer.getRenderer().screenToWorld({ x, y });

    // Center camera on clicked position
    setCamera(prev => ({
      ...prev,
      x: worldPos.x,
      y: worldPos.y,
    }));
  };

  // Handle zoom with mouse wheel
  const handleWheel = (event: React.WheelEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    const zoomDelta = event.deltaY > 0 ? 0.9 : 1.1;

    setCamera(prev => ({
      ...prev,
      scale: Math.max(0.5, Math.min(3, prev.scale * zoomDelta)),
    }));
  };

  // Handle keyboard controls
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const moveSpeed = 10;

      switch (event.key) {
        case 'ArrowUp':
        case 'w':
          setCamera(prev => ({ ...prev, y: prev.y - moveSpeed }));
          break;
        case 'ArrowDown':
        case 's':
          setCamera(prev => ({ ...prev, y: prev.y + moveSpeed }));
          break;
        case 'ArrowLeft':
        case 'a':
          setCamera(prev => ({ ...prev, x: prev.x - moveSpeed }));
          break;
        case 'ArrowRight':
        case 'd':
          setCamera(prev => ({ ...prev, x: prev.x + moveSpeed }));
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div style={{ padding: '20px', backgroundColor: '#2a2a2a', minHeight: '100vh' }}>
      <div style={{ marginBottom: '20px', color: 'white' }}>
        <h2>🎮 Tile-Based 2.5D Game Demo</h2>
        <p>Click to move camera • Scroll to zoom • Arrow keys/WASD to pan</p>
        <p>Camera: X={Math.round(camera.x)}, Y={Math.round(camera.y)}, Zoom={camera.scale.toFixed(2)}x</p>
      </div>

      <div style={{
        border: '2px solid #4a4a4a',
        borderRadius: '8px',
        overflow: 'hidden',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)'
      }}>
        <canvas
          ref={canvasRef}
          onClick={handleCanvasClick}
          onWheel={handleWheel}
          style={{
            display: 'block',
            cursor: 'pointer',
            backgroundColor: '#87CEEB'
          }}
        />
      </div>

      <div style={{ marginTop: '20px', color: '#ccc' }}>
        <h3>Features:</h3>
        <ul>
          <li>✅ Tile-based world generation with elevation</li>
          <li>✅ 2.5D isometric rendering</li>
          <li>✅ Proper depth sorting (y + z)</li>
          <li>✅ Animated crops and buildings</li>
          <li>✅ Dynamic shadows</li>
          <li>✅ Camera controls (pan, zoom)</li>
        </ul>
      </div>
    </div>
  );
};
