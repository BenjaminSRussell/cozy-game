/**
 * Generate simple game assets as data URLs
 * Since we don't have actual image files, we create them programmatically
 */

export const generateAssets = () => {
  return {
    // Terrain tiles
    grass: createGrassSprite(),
    dirt: createDirtSprite(),
    water: createWaterSprite(),

    // Crops
    wheat_seed: createSeedSprite('#FFD700'),
    wheat_sprout: createCropSprite('#90EE90', 0.3),
    wheat_growing: createCropSprite('#7CB342', 0.6),
    wheat_mature: createCropSprite('#558B2F', 0.9),
    wheat_harvestable: createCropSprite('#DAA520', 1),

    // Buildings
    barn: createBuildingSprite('#8B4513', '#D2B48C'),
    shed: createBuildingSprite('#A0522D', '#CD853F'),
    house: createBuildingSprite('#654321', '#DEB887'),

    // Decorations
    tree_oak: createTreeSprite(),
    bench: createBenchSprite(),
    lamp: createLampSprite(),
  };
};

function createCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function createGrassSprite(): string {
  const canvas = createCanvas(32, 32);
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#90EE90';
  ctx.fillRect(0, 0, 32, 32);

  ctx.fillStyle = '#7CB342';
  ctx.fillRect(2, 8, 4, 3);
  ctx.fillRect(12, 10, 4, 3);
  ctx.fillRect(22, 12, 4, 2);
  ctx.fillRect(8, 20, 5, 3);

  return canvas.toDataURL();
}

function createDirtSprite(): string {
  const canvas = createCanvas(32, 32);
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#8B7355';
  ctx.fillRect(0, 0, 32, 32);

  ctx.fillStyle = '#A0826D';
  for (let i = 0; i < 5; i++) {
    ctx.fillRect(Math.random() * 32, Math.random() * 32, 2, 2);
  }

  return canvas.toDataURL();
}

function createWaterSprite(): string {
  const canvas = createCanvas(32, 32);
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#4A90E2';
  ctx.fillRect(0, 0, 32, 32);

  ctx.strokeStyle = '#2E5C8A';
  ctx.lineWidth = 1;
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.arc(8 + i * 8, 8, 3, 0, Math.PI * 2);
    ctx.stroke();
  }

  return canvas.toDataURL();
}

function createSeedSprite(color: string): string {
  const canvas = createCanvas(32, 32);
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(16, 16, 3, 0, Math.PI * 2);
  ctx.fill();

  return canvas.toDataURL();
}

function createCropSprite(color: string, height: number): string {
  const canvas = createCanvas(32, 32);
  const ctx = canvas.getContext('2d')!;

  const cropHeight = 20 * height;

  // Stem
  ctx.strokeStyle = '#228B22';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(16, 32);
  ctx.lineTo(16, 32 - cropHeight);
  ctx.stroke();

  // Leaves
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(12, 24 - cropHeight / 2, 4, 3, -0.3, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.ellipse(20, 24 - cropHeight / 2, 4, 3, 0.3, 0, Math.PI * 2);
  ctx.fill();

  return canvas.toDataURL();
}

function createBuildingSprite(mainColor: string, trimColor: string): string {
  const canvas = createCanvas(48, 48);
  const ctx = canvas.getContext('2d')!;

  // Main building
  ctx.fillStyle = mainColor;
  ctx.fillRect(8, 16, 32, 24);

  // Roof
  ctx.fillStyle = '#A52A2A';
  ctx.beginPath();
  ctx.moveTo(8, 16);
  ctx.lineTo(24, 4);
  ctx.lineTo(40, 16);
  ctx.fill();

  // Door
  ctx.fillStyle = '#654321';
  ctx.fillRect(20, 28, 8, 12);

  // Window
  ctx.fillStyle = '#87CEEB';
  ctx.fillRect(12, 20, 6, 6);
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 1;
  ctx.strokeRect(12, 20, 6, 6);
  ctx.beginPath();
  ctx.moveTo(15, 20);
  ctx.lineTo(15, 26);
  ctx.moveTo(12, 23);
  ctx.lineTo(18, 23);
  ctx.stroke();

  // Window 2
  ctx.fillStyle = '#87CEEB';
  ctx.fillRect(30, 20, 6, 6);
  ctx.strokeRect(30, 20, 6, 6);
  ctx.beginPath();
  ctx.moveTo(33, 20);
  ctx.lineTo(33, 26);
  ctx.moveTo(30, 23);
  ctx.lineTo(36, 23);
  ctx.stroke();

  return canvas.toDataURL();
}

function createTreeSprite(): string {
  const canvas = createCanvas(40, 48);
  const ctx = canvas.getContext('2d')!;

  // Trunk
  ctx.fillStyle = '#8B4513';
  ctx.fillRect(16, 32, 8, 16);

  // Foliage
  ctx.fillStyle = '#228B22';
  ctx.beginPath();
  ctx.arc(20, 24, 12, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#32CD32';
  ctx.beginPath();
  ctx.arc(20, 20, 10, 0, Math.PI * 2);
  ctx.fill();

  return canvas.toDataURL();
}

function createBenchSprite(): string {
  const canvas = createCanvas(32, 20);
  const ctx = canvas.getContext('2d')!;

  // Seat
  ctx.fillStyle = '#8B4513';
  ctx.fillRect(4, 8, 24, 4);

  // Legs
  ctx.fillStyle = '#654321';
  ctx.fillRect(6, 12, 2, 6);
  ctx.fillRect(24, 12, 2, 6);

  return canvas.toDataURL();
}

function createLampSprite(): string {
  const canvas = createCanvas(16, 32);
  const ctx = canvas.getContext('2d')!;

  // Post
  ctx.fillStyle = '#333';
  ctx.fillRect(6, 12, 4, 16);

  // Bulb
  ctx.fillStyle = '#FFD700';
  ctx.beginPath();
  ctx.arc(8, 10, 4, 0, Math.PI * 2);
  ctx.fill();

  // Light glow
  ctx.fillStyle = 'rgba(255, 215, 0, 0.3)';
  ctx.beginPath();
  ctx.arc(8, 10, 8, 0, Math.PI * 2);
  ctx.fill();

  return canvas.toDataURL();
}
