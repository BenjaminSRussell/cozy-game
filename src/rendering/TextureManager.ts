/**
 * Texture Manager for SVG Assets
 * 
 * Handles loading, caching, and converting SVG assets to rasterized images
 * for optimal performance in the rendering pipeline.
 */

export interface TextureConfig {
  id: string;
  path: string;
  width?: number;
  height?: number;
  scale?: number;
  cacheKey?: string;
}

export interface LoadedTexture {
  id: string;
  image: HTMLImageElement;
  width: number;
  height: number;
  aspectRatio: number;
  loadTime: number;
  cacheKey: string;
}

export class TextureManager {
  private static instance: TextureManager;
  private textureCache: Map<string, LoadedTexture> = new Map();
  private loadingPromises: Map<string, Promise<LoadedTexture>> = new Map();
  private svgCache: Map<string, string> = new Map();
  private defaultSize = { width: 128, height: 128 };

  private constructor() { }

  public static getInstance(): TextureManager {
    if (!TextureManager.instance) {
      TextureManager.instance = new TextureManager();
    }
    return TextureManager.instance;
  }

  /**
   * Preload a list of textures.
   * A missing asset stores a magenta fallback and never rejects Promise.all.
   */
  public async preloadTextures(configs: TextureConfig[]): Promise<void> {
    const promises = configs.map(async (config) => {
      try {
        await this.loadTexture(config);
      } catch {
        const cacheKey = config.cacheKey || config.id;
        if (!this.textureCache.has(cacheKey)) {
          this.cacheFallbackTexture(config, cacheKey, 0);
        }
      }
    });
    await Promise.all(promises);
  }

  /**
   * Load a single texture from SVG path
   */
  public async loadTexture(config: TextureConfig): Promise<LoadedTexture> {
    const cacheKey = config.cacheKey || config.id;

    // Return from cache if already loaded
    if (this.textureCache.has(cacheKey)) {
      return this.textureCache.get(cacheKey)!;
    }

    // Return existing promise if currently loading
    if (this.loadingPromises.has(cacheKey)) {
      return this.loadingPromises.get(cacheKey)!;
    }

    // Start loading process
    const loadingPromise = this.doLoadTexture(config, cacheKey);
    this.loadingPromises.set(cacheKey, loadingPromise);

    try {
      const texture = await loadingPromise;
      this.textureCache.set(cacheKey, texture);
      return texture;
    } finally {
      this.loadingPromises.delete(cacheKey);
    }
  }

  private async doLoadTexture(config: TextureConfig, cacheKey: string): Promise<LoadedTexture> {
    const startTime = performance.now();

    try {
      const parts = config.path.split('#');
      const filePath = parts[0];
      const partId = parts[1];

      // Load SVG content
      const svgContent = await this.fetchSVGContent(filePath);

      const targetWidth = config.width || this.defaultSize.width;
      const targetHeight = config.height || this.defaultSize.height;
      const scale = config.scale || 1;
      const rasterized = partId
        ? await this.rasterizeSVGPart(svgContent, partId, targetWidth, targetHeight, scale)
        : await this.rasterizeSVG(svgContent, targetWidth, targetHeight, scale);

      // Image onerror resolves with missing:true instead of rejecting preload.
      if (rasterized.missing) {
        throw new Error('Failed to load SVG for rasterization');
      }

      const { image, width, height } = rasterized;
      const texture: LoadedTexture = {
        id: config.id,
        image,
        width,
        height,
        aspectRatio: width / height,
        loadTime: performance.now() - startTime,
        cacheKey
      };

      return texture;
    } catch (error) {
      console.warn(`[TextureManager] Failed to load texture: ${config.id} (${config.path})`);
      const fallback = this.cacheFallbackTexture(config, cacheKey, performance.now() - startTime);
      if (fallback) {
        return fallback;
      }
      throw error;
    }
  }

  private async fetchSVGContent(path: string): Promise<string> {
    // Check cache first
    if (this.svgCache.has(path)) {
      return this.svgCache.get(path)!;
    }

    // React Native has no DOM image loader; keep the placeholder SVG string.
    if (typeof window === 'undefined') {
      return this.createFallbackSVG();
    }

    const response = await fetch(path);
    if (!response.ok) {
      throw new Error(`Failed to fetch SVG: ${response.status}`);
    }

    const svgContent = await response.text();
    this.svgCache.set(path, svgContent);
    return svgContent;
  }

  private createFallbackSVG(): string {
    return `
      <svg width="64" height="64" xmlns="http://www.w3.org/2000/svg">
        <rect width="64" height="64" fill="#FFD700" stroke="#FFA500" stroke-width="2"/>
        <text x="32" y="32" text-anchor="middle" dominant-baseline="middle" 
              font-family="Arial" font-size="12" fill="#333">?</text>
      </svg>
    `;
  }

  private createFallbackTexture(): HTMLImageElement {
    const canvas = document.createElement('canvas');
    canvas.width = 64; canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#FF00FF'; // Magenta = missing texture indicator
    ctx.fillRect(0, 0, 64, 64);
    const img = new Image();
    img.src = canvas.toDataURL();
    return img;
  }

  private cacheFallbackTexture(
    config: TextureConfig,
    cacheKey: string,
    loadTime: number
  ): LoadedTexture | null {
    const cached = this.textureCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const texture: LoadedTexture = {
        id: config.id,
        image: this.createFallbackTexture(),
        width: 64,
        height: 64,
        aspectRatio: 1,
        loadTime,
        cacheKey
      };
      this.textureCache.set(cacheKey, texture);
      return texture;
    } catch {
      return null;
    }
  }

  private async rasterizeSVG(
    svgContent: string,
    targetWidth: number,
    targetHeight: number,
    scale: number
  ): Promise<{ image: HTMLImageElement; width: number; height: number; missing?: boolean }> {
    const finalWidth = Math.round(targetWidth * scale);
    const finalHeight = Math.round(targetHeight * scale);

    // Create offscreen canvas for rasterization
    const canvas = document.createElement('canvas');
    canvas.width = finalWidth;
    canvas.height = finalHeight;
    const ctx = canvas.getContext('2d')!;

    return this.renderSVGToCanvas(svgContent, canvas, ctx, finalWidth, finalHeight);
  }

  private async rasterizeSVGPart(
    svgContent: string,
    partId: string,
    targetWidth: number,
    targetHeight: number,
    scale: number
  ): Promise<{ image: HTMLImageElement; width: number; height: number; missing?: boolean }> {
    // Parse SVG to find the part
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgContent, 'image/svg+xml');

    const partElement = doc.getElementById(partId);
    if (!partElement) {
      throw new Error(`SVG part #${partId} not found`);
    }

    // Extract defs to keep gradients/filters
    let defsContent = '';
    const defs = doc.querySelector('defs');
    if (defs) {
      defsContent = defs.outerHTML;
    }

    // Create new SVG wrapping the part
    // We try to maintain the original viewBox if possible, or assume similar coordinate space
    const originalSvg = doc.querySelector('svg');
    const viewBox = originalSvg?.getAttribute('viewBox') || `0 0 ${targetWidth} ${targetHeight}`;
    const widthAttr = originalSvg?.getAttribute('width') || targetWidth.toString();
    const heightAttr = originalSvg?.getAttribute('height') || targetHeight.toString();

    const newSvgContent = `
      <svg width="${widthAttr}" height="${heightAttr}" viewBox="${viewBox}" xmlns="http://www.w3.org/2000/svg">
        ${defsContent}
        ${partElement.outerHTML}
      </svg>
    `;

    return this.rasterizeSVG(newSvgContent, targetWidth, targetHeight, scale);
  }

  private async renderSVGToCanvas(
    svgContent: string,
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number
  ): Promise<{ image: HTMLImageElement; width: number; height: number; missing?: boolean }> {
    // Create blob from SVG content
    const svgBlob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
    const svgUrl = URL.createObjectURL(svgBlob);

    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        // Draw SVG to canvas
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        // Clean up blob URL
        URL.revokeObjectURL(svgUrl);

        // Convert canvas to image
        const rasterizedImg = new Image();
        rasterizedImg.onload = () => {
          resolve({
            image: rasterizedImg,
            width,
            height
          });
        };
        rasterizedImg.onerror = () => {
          // A broken raster must not reject preloadTextures.
          resolve({
            image: rasterizedImg,
            width: 0,
            height: 0,
            missing: true
          });
        };
        rasterizedImg.src = canvas.toDataURL('image/png');
      };
      img.onerror = () => {
        URL.revokeObjectURL(svgUrl);
        // A 404 or undecodable asset resolves so Promise.all does not reject.
        resolve({
          image: img,
          width: 0,
          height: 0,
          missing: true
        });
      };
      img.src = svgUrl;
    });
  }

  /**
   * Get a loaded texture by ID.
   * An uncached single emoji, or an id that starts with "U+", is drawn onto a
   * 64×64 canvas, cached, and returned. Any other missing id stays unresolved.
   */
  public getTexture(id: string): LoadedTexture | undefined {
    const cached = this.textureCache.get(id);
    if (cached) {
      return cached;
    }

    if ([...id].length === 1 || id.startsWith('U+')) {
      return this.renderEmojiToImage(id);
    }

    return undefined;
  }

  private renderEmojiToImage(emoji: string): LoadedTexture {
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    ctx.font = `${size * 0.8}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emoji, size / 2, size / 2);

    const image = new Image();
    image.src = canvas.toDataURL();
    const texture: LoadedTexture = {
      id: emoji,
      image,
      width: size,
      height: size,
      aspectRatio: 1,
      loadTime: 0,
      cacheKey: emoji
    };
    this.textureCache.set(emoji, texture);
    return texture;
  }

  /**
   * Get a texture by cache key
   */
  public getTextureByCacheKey(cacheKey: string): LoadedTexture | undefined {
    return this.textureCache.get(cacheKey);
  }

  /**
   * Check if a texture is loaded
   */
  public isTextureLoaded(id: string): boolean {
    return this.textureCache.has(id);
  }

  /**
   * Remove a texture from cache
   */
  public removeTexture(id: string): boolean {
    const texture = this.textureCache.get(id);
    if (texture) {
      this.textureCache.delete(id);
      this.svgCache.delete(texture.cacheKey);
      return true;
    }
    return false;
  }

  /**
   * Clear all cached textures
   */
  public clearCache(): void {
    this.textureCache.clear();
    this.svgCache.clear();
    this.loadingPromises.clear();
  }

  /**
   * Get memory usage statistics
   */
  public getMemoryStats(): {
    textureCount: number;
    svgCacheCount: number;
    loadingCount: number;
    estimatedMemoryUsage: number;
  } {
    let estimatedMemoryUsage = 0;

    for (const texture of this.textureCache.values()) {
      // Rough estimation: width * height * 4 bytes (RGBA)
      estimatedMemoryUsage += texture.width * texture.height * 4;
    }

    return {
      textureCount: this.textureCache.size,
      svgCacheCount: this.svgCache.size,
      loadingCount: this.loadingPromises.size,
      estimatedMemoryUsage
    };
  }

  /**
   * Create a texture variant with different size
   */
  public async createTextureVariant(
    baseTextureId: string,
    variantId: string,
    width: number,
    height: number
  ): Promise<LoadedTexture> {
    const baseTexture = this.getTexture(baseTextureId);
    if (!baseTexture) {
      throw new Error(`Base texture ${baseTextureId} not found`);
    }

    // Create new canvas for variant
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;

    // Draw base texture scaled to new size
    ctx.drawImage(baseTexture.image, 0, 0, width, height);

    return new Promise((resolve, reject) => {
      const variantImg = new Image();
      variantImg.onload = () => {
        const variant: LoadedTexture = {
          id: variantId,
          image: variantImg,
          width,
          height,
          aspectRatio: width / height,
          loadTime: 0,
          cacheKey: `${baseTexture.cacheKey}_${variantId}`
        };

        this.textureCache.set(variantId, variant);
        resolve(variant);
      };
      variantImg.onerror = reject;
      variantImg.src = canvas.toDataURL('image/png');
    });
  }

  /**
   * Get all loaded texture IDs
   */
  public getLoadedTextureIds(): string[] {
    return Array.from(this.textureCache.keys());
  }

  /**
   * Set default texture size
   */
  public setDefaultSize(width: number, height: number): void {
    this.defaultSize = { width, height };
  }
}
