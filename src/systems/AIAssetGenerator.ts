/**
 * AI Asset Generator for Cozy Haven
 *
 * Generates custom game assets using AI image generation.
 * Supports multiple providers for flexibility:
 * - Local ComfyUI (self-hosted, free, unlimited)
 * - Stability AI (cloud-based, API key required)
 * - OpenAI DALL-E (cloud-based, API key required)
 * - Hugging Face (cloud-based, API key required)
 *
 * Features:
 * - Queued generation (prevents API overload)
 * - Style customization (pixel, watercolor, painted, simple)
 * - Negative prompt support (reduce unwanted features)
 * - Seed-based reproducibility
 * - Category-specific generation (furniture, decoration, crop, building)
 * - Base64 to Blob conversion for asset storage
 *
 * Environment Variables:
 * - REACT_APP_STABILITY_API_KEY: For Stability AI provider
 * - REACT_APP_OPENAI_API_KEY: For OpenAI DALL-E provider
 * - REACT_APP_HUGGINGFACE_API_KEY: For Hugging Face provider
 *
 * Default: Uses local ComfyUI (requires local installation)
 */

/**
 * AI asset generation request parameters
 * Defines prompt, style, and parameters for image generation
 */
export interface AIGenerationRequest {
  /** Unique request identifier */
  id: string;
  /** User description of desired asset */
  prompt: string;
  /** Category of asset ('furniture', 'decoration', 'crop', 'building') */
  category: 'furniture' | 'decoration' | 'crop' | 'building';
  /** Visual style ('pixel', 'watercolor', 'painted', 'simple') */
  style: 'pixel' | 'watercolor' | 'painted' | 'simple';
  /** Optional color palette to guide generation */
  colorPalette?: string[];
  /** Optional seed for reproducible generations */
  seed?: number;
  /** Optional negative prompt to exclude unwanted features */
  negativePrompt?: string;
}

/**
 * Result of an AI asset generation request
 * Contains generated image and metadata
 */
export interface AIGenerationResult {
  /** Unique result identifier */
  id: string;
  /** ID of the request that generated this asset */
  requestId: string;
  /** Generated image data as Blob */
  imageData: Blob;
  /** User prompt that was used */
  prompt: string;
  /** Image width in pixels */
  width: number;
  /** Image height in pixels */
  height: number;
  /** Timestamp of generation */
  generatedAt: number;
  /** Name of AI model/provider used */
  model: string;
}

/** Supported AI providers for asset generation */
export type AIProvider = 'local-comfyui' | 'stabilityai' | 'openai' | 'huggingface';

/**
 * AI Asset Generator class
 * Manages AI-powered asset generation with queueing
 */
export class AIAssetGenerator {
  /** Current AI provider being used */
  private provider: AIProvider = 'local-comfyui';

  /** Queue of pending generation requests */
  private generationQueue: AIGenerationRequest[] = [];

  /** Whether currently processing queue */
  private isGenerating: boolean = false;

  /** Cache of completed generation results */
  private generatedAssets: Map<string, AIGenerationResult> = new Map();

  /**
   * Create AIAssetGenerator instance
   * @param provider - AI provider to use (default: 'local-comfyui')
   */
  constructor(provider: AIProvider = 'local-comfyui') {
    this.provider = provider;
  }

  /**
   * Queue an asset generation request
   * Adds request to queue and starts processing if not already running
   * Returns immediately with request ID (generation is asynchronous)
   * @param request - AIGenerationRequest with prompt and parameters
   * @returns Request ID for tracking the generation
   */
  async requestAssetGeneration(request: AIGenerationRequest): Promise<string> {
    this.generationQueue.push(request);

    if (!this.isGenerating) {
      this.processQueue();
    }

    return request.id;
  }

  /**
   * Process generation queue
   */
  private async processQueue(): Promise<void> {
    if (this.isGenerating || this.generationQueue.length === 0) return;

    this.isGenerating = true;

    while (this.generationQueue.length > 0) {
      const request = this.generationQueue.shift();
      if (request) {
        try {
          await this.generateAsset(request);
        } catch (error) {
          console.error('Asset generation failed:', error);
        }
      }
    }

    this.isGenerating = false;
  }

  /**
   * Generate asset using specified provider
   */
  private async generateAsset(request: AIGenerationRequest): Promise<void> {
    let result: AIGenerationResult | null = null;

    switch (this.provider) {
      case 'local-comfyui':
        result = await this.generateWithComfyUI(request);
        break;
      case 'stabilityai':
        result = await this.generateWithStabilityAI(request);
        break;
      case 'openai':
        result = await this.generateWithOpenAI(request);
        break;
      case 'huggingface':
        result = await this.generateWithHuggingFace(request);
        break;
    }

    if (result) {
      this.generatedAssets.set(request.id, result);
    }
  }

  /**
   * Generate with local ComfyUI instance
   */
  private async generateWithComfyUI(request: AIGenerationRequest): Promise<AIGenerationResult | null> {
    const endpoint = 'http://localhost:8188'; // Default ComfyUI port

    const payload = {
      prompt: this.formatPrompt(request),
      negative_prompt: request.negativePrompt || this.getDefaultNegativePrompt(request.category),
      style: request.style,
      width: 512,
      height: 512,
      steps: 20,
      seed: request.seed || Math.floor(Math.random() * 1000000),
    };

    try {
      const response = await fetch(`${endpoint}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`ComfyUI API error: ${response.statusText}`);
      }

      const data = await response.json();
      const imageBlob = await fetch(data.image_url).then((r) => r.blob());

      return {
        id: `gen_${Date.now()}`,
        requestId: request.id,
        imageData: imageBlob,
        prompt: request.prompt,
        width: 512,
        height: 512,
        generatedAt: Date.now(),
        model: 'ComfyUI (Local)',
      };
    } catch (error) {
      console.error('ComfyUI generation failed:', error);
      return null;
    }
  }

  /**
   * Generate with Stability AI API
   */
  private async generateWithStabilityAI(request: AIGenerationRequest): Promise<AIGenerationResult | null> {
    const apiKey = process.env.REACT_APP_STABILITY_API_KEY;
    if (!apiKey) {
      console.warn('Stability AI API key not configured');
      return null;
    }

    const endpoint = 'https://api.stability.ai/v1/generate';

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          text_prompts: [
            {
              text: this.formatPrompt(request),
              weight: 1,
            },
            {
              text: request.negativePrompt || this.getDefaultNegativePrompt(request.category),
              weight: -1,
            },
          ],
          height: 512,
          width: 512,
          steps: 20,
          seed: request.seed || Math.floor(Math.random() * 1000000),
          samples: 1,
        }),
      });

      if (!response.ok) {
        throw new Error(`Stability AI error: ${response.statusText}`);
      }

      const data = await response.json();
      const imageBase64 = data.artifacts[0].base64;
      const imageBlob = this.base64ToBlob(imageBase64, 'image/png');

      return {
        id: `gen_${Date.now()}`,
        requestId: request.id,
        imageData: imageBlob,
        prompt: request.prompt,
        width: 512,
        height: 512,
        generatedAt: Date.now(),
        model: 'Stability AI',
      };
    } catch (error) {
      console.error('Stability AI generation failed:', error);
      return null;
    }
  }

  /**
   * Generate with OpenAI DALL-E API
   */
  private async generateWithOpenAI(request: AIGenerationRequest): Promise<AIGenerationResult | null> {
    const apiKey = process.env.REACT_APP_OPENAI_API_KEY;
    if (!apiKey) {
      console.warn('OpenAI API key not configured');
      return null;
    }

    const endpoint = 'https://api.openai.com/v1/images/generations';

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          prompt: this.formatPrompt(request),
          n: 1,
          size: '512x512',
          response_format: 'b64_json',
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI error: ${response.statusText}`);
      }

      const data = await response.json();
      const imageBase64 = data.data[0].b64_json;
      const imageBlob = this.base64ToBlob(imageBase64, 'image/png');

      return {
        id: `gen_${Date.now()}`,
        requestId: request.id,
        imageData: imageBlob,
        prompt: request.prompt,
        width: 512,
        height: 512,
        generatedAt: Date.now(),
        model: 'DALL-E',
      };
    } catch (error) {
      console.error('OpenAI generation failed:', error);
      return null;
    }
  }

  /**
   * Generate with Hugging Face API
   */
  private async generateWithHuggingFace(request: AIGenerationRequest): Promise<AIGenerationResult | null> {
    const apiKey = process.env.REACT_APP_HUGGINGFACE_API_KEY;
    if (!apiKey) {
      console.warn('Hugging Face API key not configured');
      return null;
    }

    const endpoint = 'https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-2';

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: this.formatPrompt(request),
        }),
      });

      if (!response.ok) {
        throw new Error(`Hugging Face error: ${response.statusText}`);
      }

      const imageBlob = await response.blob();

      return {
        id: `gen_${Date.now()}`,
        requestId: request.id,
        imageData: imageBlob,
        prompt: request.prompt,
        width: 512,
        height: 512,
        generatedAt: Date.now(),
        model: 'Stable Diffusion (Hugging Face)',
      };
    } catch (error) {
      console.error('Hugging Face generation failed:', error);
      return null;
    }
  }

  /**
   * Format prompt with style and category context
   */
  private formatPrompt(request: AIGenerationRequest): string {
    const stylePrompt = this.getStylePrompt(request.style);
    const categoryPrompt = this.getCategoryPrompt(request.category);

    return `${request.prompt}, ${stylePrompt}, ${categoryPrompt}, cozy game art style, isometric perspective`;
  }

  /**
   * Get style-specific prompt additions
   */
  private getStylePrompt(style: string): string {
    const styles: Record<string, string> = {
      pixel: 'pixel art style, 32-bit graphics, retro',
      watercolor: 'watercolor painting, artistic, soft colors',
      painted: 'hand-painted, oil painting style',
      simple: 'simple cartoon style, minimalist',
    };
    return styles[style] || 'digital art';
  }

  /**
   * Get category-specific prompt additions
   */
  private getCategoryPrompt(category: string): string {
    const categories: Record<string, string> = {
      furniture: 'furniture design, home decor',
      decoration: 'decorative object, garden ornament',
      crop: 'plant, vegetable, farming theme',
      building: 'house, cottage, farm building',
    };
    return categories[category] || '';
  }

  /**
   * Get default negative prompt for category
   */
  private getDefaultNegativePrompt(category: string): string {
    return 'blurry, low quality, distorted, ugly, realistic photo, photograph, people, text, watermark';
  }

  /**
   * Convert base64 to Blob
   */
  private base64ToBlob(base64: string, mimeType: string): Blob {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);

    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    return new Blob([bytes], { type: mimeType });
  }

  /**
   * Get generated asset
   */
  getGeneratedAsset(id: string): AIGenerationResult | undefined {
    return this.generatedAssets.get(id);
  }

  /**
   * Get all generated assets
   */
  getAllGeneratedAssets(): AIGenerationResult[] {
    return Array.from(this.generatedAssets.values());
  }

  /**
   * Get generation queue status
   */
  getQueueStatus(): {
    queued: number;
    isGenerating: boolean;
  } {
    return {
      queued: this.generationQueue.length,
      isGenerating: this.isGenerating,
    };
  }
}
