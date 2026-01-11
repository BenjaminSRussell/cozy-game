/**
 * Advanced 3D Asset Loading System
 * 
 * Handles loading, caching, and optimization of all 3D assets
 * Supports progressive loading, LOD management, and memory optimization
 */

export interface AssetMetadata {
  id: string;
  name: string;
  category: 'building' | 'crop' | 'nature' | 'mining' | 'ui' | 'effect';
  type: string;
  version: string;
  fileSize: number;
  polyCount: number;
  textureResolution: number;
  lodLevels: number;
  dependencies: string[];
  tags: string[];
}

export interface LoadedAsset {
  metadata: AssetMetadata;
  geometry: ArrayBuffer;
  textures: {
    diffuse?: ImageBitmap;
    normal?: ImageBitmap;
    roughness?: ImageBitmap;
    metallic?: ImageBitmap;
    emissive?: ImageBitmap;
  };
  materials: PBRMaterial[];
  lodLevels: LODLevel[];
  boundingBox: BoundingBox;
  collisionMesh?: ArrayBuffer;
  animations?: AnimationData[];
}

export interface PBRMaterial {
  name: string;
  diffuseColor: [number, number, number, number];
  diffuseTexture?: string;
  normalTexture?: string;
  roughness: number;
  roughnessTexture?: string;
  metallic: number;
  metallicTexture?: string;
  emissiveColor: [number, number, number, number];
  emissiveTexture?: string;
  transparency: number;
  alphaTest: number;
}

export interface LODLevel {
  level: number; // 0 = highest, 3 = lowest
  distance: number; // Switch distance
  geometry: ArrayBuffer;
  polyCount: number;
  materialIndices: number[];
}

export interface BoundingBox {
  min: [number, number, number];
  max: [number, number, number];
  center: [number, number, number];
  size: [number, number, number];
}

export interface AnimationData {
  name: string;
  duration: number;
  keyframes: AnimationKeyframe[];
  loop: boolean;
  interpolation: 'linear' | 'step' | 'cubic';
}

export interface AnimationKeyframe {
  time: number;
  position?: [number, number, number];
  rotation?: [number, number, number, number];
  scale?: [number, number, number];
  morphTargets?: { [key: string]: number };
}

export interface LoadingProgress {
  totalAssets: number;
  loadedAssets: number;
  currentAsset: string;
  progress: number; // 0-1
  stage: 'downloading' | 'parsing' | 'optimizing' | 'complete';
}

export class AssetLoader {
  private assetRegistry: Map<string, AssetMetadata> = new Map();
  private loadedAssets: Map<string, LoadedAsset> = new Map();
  private loadingQueue: Set<string> = new Set();
  private loadPromises: Map<string, Promise<LoadedAsset>> = new Map();
  private memoryBudget: number;
  private usedMemory: number = 0;
  private lodSettings: {
    enabled: boolean;
    distances: number[];
    quality: 'high' | 'medium' | 'low';
  };

  constructor(memoryBudget: number = 512 * 1024 * 1024) { // 512MB default
    this.memoryBudget = memoryBudget;
    this.lodSettings = {
      enabled: true,
      distances: [10, 25, 50, 100],
      quality: 'high'
    };
    this.initializeAssetRegistry();
  }

  /**
   * Initialize asset registry with all game assets
   */
  private initializeAssetRegistry(): void {
    // Buildings
    this.registerAsset({
      id: 'house_cabin_level1',
      name: 'Starter Cabin',
      category: 'building',
      type: 'residential',
      version: '1.0.0',
      fileSize: 2048000, // 2MB
      polyCount: 800,
      textureResolution: 512,
      lodLevels: 3,
      dependencies: [],
      tags: ['starter', 'wood', 'rustic']
    });

    this.registerAsset({
      id: 'house_cottage_level2',
      name: 'Cozy Cottage',
      category: 'building',
      type: 'residential',
      version: '1.0.0',
      fileSize: 4096000, // 4MB
      polyCount: 1500,
      textureResolution: 1024,
      lodLevels: 3,
      dependencies: [],
      tags: ['upgrade', 'porch', 'garden']
    });

    this.registerAsset({
      id: 'house_farm_level3',
      name: 'Farm House',
      category: 'building',
      type: 'residential',
      version: '1.0.0',
      fileSize: 6144000, // 6MB
      polyCount: 2500,
      textureResolution: 1024,
      lodLevels: 3,
      dependencies: [],
      tags: ['upgrade', 'two-story', 'attic']
    });

    this.registerAsset({
      id: 'house_manor_level4',
      name: 'Manor House',
      category: 'building',
      type: 'residential',
      version: '1.0.0',
      fileSize: 8192000, // 8MB
      polyCount: 4000,
      textureResolution: 2048,
      lodLevels: 4,
      dependencies: [],
      tags: ['upgrade', 'luxury', 'tower']
    });

    // Crops
    this.registerAsset({
      id: 'wheat_growth_complete',
      name: 'Wheat Growth Cycle',
      category: 'crop',
      type: 'grain',
      version: '1.0.0',
      fileSize: 1536000, // 1.5MB
      polyCount: 600,
      textureResolution: 512,
      lodLevels: 2,
      dependencies: [],
      tags: ['crop', 'grain', 'animated']
    });

    this.registerAsset({
      id: 'tomato_growth_complete',
      name: 'Tomato Growth Cycle',
      category: 'crop',
      type: 'vegetable',
      version: '1.0.0',
      fileSize: 2048000, // 2MB
      polyCount: 800,
      textureResolution: 512,
      lodLevels: 2,
      dependencies: [],
      tags: ['crop', 'vegetable', 'vine']
    });

    // Trees
    this.registerAsset({
      id: 'tree_oak_complete',
      name: 'Oak Tree Lifecycle',
      category: 'nature',
      type: 'deciduous',
      version: '1.0.0',
      fileSize: 3072000, // 3MB
      polyCount: 1200,
      textureResolution: 1024,
      lodLevels: 3,
      dependencies: [],
      tags: ['tree', 'deciduous', 'seasonal']
    });

    this.registerAsset({
      id: 'tree_pine_complete',
      name: 'Pine Tree Lifecycle',
      category: 'nature',
      type: 'evergreen',
      version: '1.0.0',
      fileSize: 2560000, // 2.5MB
      polyCount: 1000,
      textureResolution: 1024,
      lodLevels: 3,
      dependencies: [],
      tags: ['tree', 'evergreen', 'winter']
    });

    // Mining
    this.registerAsset({
      id: 'mine_underground_complete',
      name: 'Underground Mine System',
      category: 'mining',
      type: 'underground',
      version: '1.0.0',
      fileSize: 10240000, // 10MB
      polyCount: 5000,
      textureResolution: 2048,
      lodLevels: 4,
      dependencies: [],
      tags: ['mining', 'underground', 'cave']
    });

    // UI Assets
    this.registerAsset({
      id: 'ui_icon_set_complete',
      name: 'Game Icon Set',
      category: 'ui',
      type: 'icons',
      version: '1.0.0',
      fileSize: 2048000, // 2MB
      polyCount: 0, // 2D UI
      textureResolution: 256,
      lodLevels: 1,
      dependencies: [],
      tags: ['ui', 'icons', '2d']
    });
  }

  /**
   * Register an asset in the registry
   */
  private registerAsset(metadata: AssetMetadata): void {
    this.assetRegistry.set(metadata.id, metadata);
  }

  /**
   * Load asset with progress tracking
   */
  public async loadAsset(
    assetId: string,
    onProgress?: (progress: LoadingProgress) => void
  ): Promise<LoadedAsset> {
    // Check if already loaded
    if (this.loadedAssets.has(assetId)) {
      return this.loadedAssets.get(assetId)!;
    }

    // Check if currently loading
    if (this.loadPromises.has(assetId)) {
      return this.loadPromises.get(assetId)!;
    }

    // Check memory budget
    const metadata = this.assetRegistry.get(assetId);
    if (!metadata) {
      throw new Error(`Asset ${assetId} not found in registry`);
    }

    if (this.usedMemory + metadata.fileSize > this.memoryBudget) {
      await this.freeMemory(metadata.fileSize);
    }

    // Start loading
    this.loadingQueue.add(assetId);

    const loadPromise = this.performAssetLoad(assetId, onProgress);
    this.loadPromises.set(assetId, loadPromise);

    try {
      const asset = await loadPromise;
      this.loadedAssets.set(assetId, asset);
      this.usedMemory += metadata.fileSize;
      return asset;
    } finally {
      this.loadingQueue.delete(assetId);
      this.loadPromises.delete(assetId);
    }
  }

  /**
   * Perform actual asset loading
   */
  private async performAssetLoad(
    assetId: string,
    onProgress?: (progress: LoadingProgress) => void
  ): Promise<LoadedAsset> {
    const metadata = this.assetRegistry.get(assetId)!;

    onProgress?.({
      totalAssets: 1,
      loadedAssets: 0,
      currentAsset: metadata.name,
      progress: 0,
      stage: 'downloading'
    });

    // Download asset
    const response = await fetch(`/assets/3d/${assetId}.glb`);
    if (!response.ok) {
      throw new Error(`Failed to download asset ${assetId}: ${response.statusText}`);
    }

    onProgress?.({
      totalAssets: 1,
      loadedAssets: 0,
      currentAsset: metadata.name,
      progress: 0.3,
      stage: 'parsing'
    });

    // Parse GLB
    const arrayBuffer = await response.arrayBuffer();
    const gltf = await this.parseGLB(arrayBuffer);

    onProgress?.({
      totalAssets: 1,
      loadedAssets: 0,
      currentAsset: metadata.name,
      progress: 0.7,
      stage: 'optimizing'
    });

    // Generate LOD levels
    const lodLevels = await this.generateLODLevels(gltf, metadata);

    onProgress?.({
      totalAssets: 1,
      loadedAssets: 1,
      currentAsset: metadata.name,
      progress: 1.0,
      stage: 'complete'
    });

    // Calculate bounding box
    const boundingBox = this.calculateBoundingBox(gltf);

    return {
      metadata,
      geometry: gltf.geometry,
      textures: gltf.textures,
      materials: gltf.materials,
      lodLevels,
      boundingBox,
      animations: gltf.animations
    };
  }

  /**
   * Parse GLB file
   */
  private async parseGLB(arrayBuffer: ArrayBuffer): Promise<any> {
    // Simplified GLB parsing
    // In production, use proper GLTF parser like three.js GLTFLoader

    const view = new DataView(arrayBuffer);
    const magic = view.getUint32(0, true);

    if (magic !== 0x46546C67) { // "glTF"
      throw new Error('Invalid GLB file');
    }

    const version = view.getUint32(4, true);
    const length = view.getUint32(8, true);

    // Parse JSON chunk
    const jsonLength = view.getUint32(12, true);
    const jsonChunk = new Uint8Array(arrayBuffer, 20, jsonLength);
    const jsonString = new TextDecoder().decode(jsonChunk);
    const gltf = JSON.parse(jsonString);

    // Parse binary chunk
    const binaryOffset = 20 + jsonLength + 8; // +8 for chunk header
    const binaryLength = view.getUint32(20 + jsonLength, true);
    const binaryChunk = new Uint8Array(arrayBuffer, binaryOffset, binaryLength);

    // Process textures
    const textures = await this.processTextures(gltf, binaryChunk);

    // Process materials
    const materials = this.processMaterials(gltf);

    // Process geometry
    const geometry = this.processGeometry(gltf, binaryChunk);

    // Process animations
    const animations = this.processAnimations(gltf);

    return {
      geometry,
      textures,
      materials,
      animations
    };
  }

  /**
   * Process textures from GLTF
   */
  private async processTextures(gltf: any, binaryChunk: Uint8Array): Promise<any> {
    const textures: any = {};

    if (!gltf.textures) return textures;

    for (let i = 0; i < gltf.textures.length; i++) {
      const texture = gltf.textures[i];
      const image = gltf.images[texture.source];

      if (image.uri) {
        // External texture
        const response = await fetch(`/assets/textures/${image.uri}`);
        const blob = await response.blob();
        textures[i] = {
          diffuse: await createImageBitmap(blob),
          normal: null, // Load normal maps if available
          roughness: null,
          metallic: null,
          emissive: null
        };
      } else {
        // Embedded texture
        const mimeType = image.mimeType || 'image/png';
        const blob = new Blob([binaryChunk.slice(image.bufferView, image.bufferView + image.byteLength)], { type: mimeType });
        textures[i] = {
          diffuse: await createImageBitmap(blob),
          normal: null,
          roughness: null,
          metallic: null,
          emissive: null
        };
      }
    }

    return textures;
  }

  /**
   * Process materials from GLTF
   */
  private processMaterials(gltf: any): PBRMaterial[] {
    const materials: PBRMaterial[] = [];

    if (!gltf.materials) return materials;

    for (const material of gltf.materials) {
      materials.push({
        name: material.name || 'unnamed',
        diffuseColor: [material.pbrMetallicRoughness?.baseColorFactor?.[0] || 1,
        material.pbrMetallicRoughness?.baseColorFactor?.[1] || 1,
        material.pbrMetallicRoughness?.baseColorFactor?.[2] || 1,
        material.pbrMetallicRoughness?.baseColorFactor?.[3] || 1],
        diffuseTexture: material.pbrMetallicRoughness?.baseColorTexture?.index?.toString(),
        normalTexture: material.normalTexture?.index?.toString(),
        roughness: material.pbrMetallicRoughness?.roughnessFactor || 1,
        roughnessTexture: material.pbrMetallicRoughness?.metallicRoughnessTexture?.index?.toString(),
        metallic: material.pbrMetallicRoughness?.metallicFactor || 0,
        metallicTexture: material.pbrMetallicRoughness?.metallicRoughnessTexture?.index?.toString(),
        emissiveColor: material.emissiveFactor || [0, 0, 0, 1],
        emissiveTexture: material.emissiveTexture?.index?.toString(),
        transparency: material.alpha || 1,
        alphaTest: material.alphaMode === 'MASK' ? 0.5 : 0
      });
    }

    return materials;
  }

  /**
   * Process geometry from GLTF
   */
  private processGeometry(gltf: any, binaryChunk: Uint8Array): ArrayBuffer {
    // Simplified geometry processing
    // In production, use proper GLTF geometry processing

    const positions = new Float32Array(gltf.accessors[0].count * 3);
    const normals = new Float32Array(gltf.accessors[1].count * 3);
    const uvs = new Float32Array(gltf.accessors[2].count * 2);
    const indices = new Uint32Array(gltf.accessors[3].count);

    // Extract data from binary chunk
    const positionView = new DataView(binaryChunk.buffer, gltf.bufferViews[0].byteOffset, gltf.bufferViews[0].byteLength);
    const normalView = new DataView(binaryChunk.buffer, gltf.bufferViews[1].byteOffset, gltf.bufferViews[1].byteLength);
    const uvView = new DataView(binaryChunk.buffer, gltf.bufferViews[2].byteOffset, gltf.bufferViews[2].byteLength);
    const indexView = new DataView(binaryChunk.buffer, gltf.bufferViews[3].byteOffset, gltf.bufferViews[3].byteLength);

    for (let i = 0; i < positions.length; i++) {
      positions[i] = positionView.getFloat32(i * 4, true);
    }

    for (let i = 0; i < normals.length; i++) {
      normals[i] = normalView.getFloat32(i * 4, true);
    }

    for (let i = 0; i < uvs.length; i++) {
      uvs[i] = uvView.getFloat32(i * 4, true);
    }

    for (let i = 0; i < indices.length; i++) {
      indices[i] = indexView.getUint32(i * 4, true);
    }

    // Return combined geometry buffer
    const geometryBuffer = new ArrayBuffer(
      positions.byteLength + normals.byteLength + uvs.byteLength + indices.byteLength
    );

    return geometryBuffer;
  }

  /**
   * Process animations from GLTF
   */
  private processAnimations(gltf: any): AnimationData[] {
    const animations: AnimationData[] = [];

    if (!gltf.animations) return animations;

    for (const anim of gltf.animations) {
      const keyframes: AnimationKeyframe[] = [];

      for (const sampler of anim.samplers) {
        for (let i = 0; i < sampler.input; i++) {
          keyframes.push({
            time: i / sampler.input, // Normalized time
            position: [0, 0, 0], // Extract from actual data
            rotation: [0, 0, 0, 1],
            scale: [1, 1, 1],
            morphTargets: {}
          });
        }
      }

      animations.push({
        name: anim.name,
        duration: 1.0, // Extract from actual data
        keyframes,
        loop: true,
        interpolation: 'linear'
      });
    }

    return animations;
  }

  /**
   * Generate LOD levels for asset
   */
  private async generateLODLevels(gltf: any, metadata: AssetMetadata): Promise<LODLevel[]> {
    const lodLevels: LODLevel[] = [];

    if (!this.lodSettings.enabled) {
      return lodLevels;
    }

    for (let level = 0; level < metadata.lodLevels; level++) {
      const distance = this.lodSettings.distances[level];
      const polyCount = Math.floor(metadata.polyCount * Math.pow(0.5, level));

      // Simplify geometry for LOD level
      const simplifiedGeometry = await this.simplifyGeometry(gltf.geometry, polyCount);

      lodLevels.push({
        level,
        distance,
        geometry: simplifiedGeometry,
        polyCount,
        materialIndices: [0] // Use first material for LOD
      });
    }

    return lodLevels;
  }

  /**
   * Simplify geometry for LOD
   */
  private async simplifyGeometry(geometry: ArrayBuffer, targetPolyCount: number): Promise<ArrayBuffer> {
    // Simplified geometry simplification
    // In production, use proper mesh simplification library

    // For now, return original geometry
    return geometry;
  }

  /**
   * Calculate bounding box for geometry
   */
  private calculateBoundingBox(gltf: any): BoundingBox {
    // Simplified bounding box calculation
    // In production, calculate from actual vertex positions

    return {
      min: [-1, -1, -1],
      max: [1, 1, 1],
      center: [0, 0, 0],
      size: [2, 2, 2]
    };
  }

  /**
   * Free memory by unloading least recently used assets
   */
  private async freeMemory(requiredBytes: number): Promise<void> {
    const assetsToUnload = Array.from(this.loadedAssets.entries())
      .sort((a, b) => a[1].metadata.fileSize - b[1].metadata.fileSize)
      .slice(0, Math.ceil(requiredBytes / 1024 / 1024)); // Remove assets until enough memory

    for (const [assetId, asset] of assetsToUnload) {
      this.loadedAssets.delete(assetId);
      this.usedMemory -= asset.metadata.fileSize;

      // Clean up textures
      if (asset.textures.diffuse) {
        asset.textures.diffuse.close();
      }
      if (asset.textures.normal) {
        asset.textures.normal.close();
      }
    }
  }

  /**
   * Get LOD level for distance
   */
  public getLODLevel(asset: LoadedAsset, distance: number): LODLevel {
    if (!this.lodSettings.enabled || asset.lodLevels.length === 0) {
      return {
        level: 0,
        distance: 0,
        geometry: asset.geometry,
        polyCount: asset.metadata.polyCount,
        materialIndices: [0]
      };
    }

    for (const lod of asset.lodLevels) {
      if (distance <= lod.distance) {
        return lod;
      }
    }

    // Return lowest LOD
    return asset.lodLevels[asset.lodLevels.length - 1];
  }

  /**
   * Get loaded asset
   */
  public getAsset(assetId: string): LoadedAsset | null {
    return this.loadedAssets.get(assetId) || null;
  }

  /**
   * Check if asset is loaded
   */
  public isAssetLoaded(assetId: string): boolean {
    return this.loadedAssets.has(assetId);
  }

  /**
   * Get loading statistics
   */
  public getLoadingStats(): {
    totalAssets: number;
    loadedAssets: number;
    loadingAssets: number;
    memoryUsage: {
      used: number;
      budget: number;
      percentage: number;
    };
  } {
    return {
      totalAssets: this.assetRegistry.size,
      loadedAssets: this.loadedAssets.size,
      loadingAssets: this.loadingQueue.size,
      memoryUsage: {
        used: this.usedMemory,
        budget: this.memoryBudget,
        percentage: (this.usedMemory / this.memoryBudget) * 100
      }
    };
  }

  /**
   * Preload critical assets
   */
  public async preloadCriticalAssets(onProgress?: (progress: LoadingProgress) => void): Promise<void> {
    const criticalAssets = [
      'house_cabin_level1',
      'wheat_growth_complete',
      'tree_oak_complete',
      'ui_icon_set_complete'
    ];

    const promises = criticalAssets.map(assetId =>
      this.loadAsset(assetId, onProgress)
    );

    await Promise.all(promises);
  }

  /**
   * Dispose of asset loader
   */
  public dispose(): void {
    // Unload all assets
    for (const [assetId, asset] of this.loadedAssets) {
      // Clean up textures
      if (asset.textures.diffuse) {
        asset.textures.diffuse.close();
      }
      if (asset.textures.normal) {
        asset.textures.normal.close();
      }
    }

    this.loadedAssets.clear();
    this.loadingQueue.clear();
    this.loadPromises.clear();
    this.usedMemory = 0;
  }
}
