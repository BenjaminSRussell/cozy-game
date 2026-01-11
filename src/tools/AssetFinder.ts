/**
 * Asset Finder & Evaluation Tool
 * 
 * Automated system to search, evaluate, and acquire 3D assets
 * from multiple marketplaces and sources
 */

export interface AssetSource {
  id: string;
  name: string;
  url: string;
  type: 'marketplace' | 'free' | 'commission' | 'custom';
  categories: string[];
  priceRange: { min: number; max: number };
  quality: 'low' | 'medium' | 'high' | 'premium';
  license: string;
  apiAvailable: boolean;
}

export interface AssetRequirement {
  category: string;
  type: string;
  style: 'realistic' | 'stylized' | 'cartoon' | 'low_poly' | 'functional' | 'particle' | 'colorful' | 'atmospheric' | 'glowing';
  polyCount: { min: number; max: number };
  textureResolution: number;
  lodRequired: boolean;
  animationRequired: boolean;
  priority: 'critical' | 'high' | 'medium' | 'low';
  budget: number;
}

export interface AssetCandidate {
  id: string;
  source: AssetSource;
  name: string;
  description: string;
  url: string;
  price: number;
  license: string;
  quality: number; // 0-100 score
  compatibility: number; // 0-100 score
  requirements: AssetRequirement;
  preview: {
    images: string[];
    videos: string[];
    model3d?: string;
  };
  metadata: {
    polyCount: number;
    textureResolution: number;
    fileFormats: string[];
    fileSize: number;
    animations: string[];
    lodLevels: number;
  };
  evaluation: {
    technicalScore: number;
    artisticScore: number;
    performanceScore: number;
    licenseScore: number;
    overallScore: number;
  };
}

export interface AssetSearchResult {
  query: string;
  requirements: AssetRequirement;
  candidates: AssetCandidate[];
  totalCount: number;
  searchTime: number;
  recommendations: AssetCandidate[];
}

export class AssetFinder {
  private sources: Map<string, AssetSource> = new Map();
  private requirements: Map<string, AssetRequirement> = new Map();
  private searchHistory: AssetSearchResult[] = [];
  private evaluationWeights = {
    technical: 0.3,
    artistic: 0.25,
    performance: 0.25,
    license: 0.1,
    price: 0.1
  };

  constructor() {
    this.initializeSources();
    this.initializeRequirements();
  }

  /**
   * Initialize asset sources
   */
  private initializeSources(): void {
    const sources: AssetSource[] = [
      // Premium Marketplaces
      {
        id: 'unity_asset_store',
        name: 'Unity Asset Store',
        url: 'https://assetstore.unity.com',
        type: 'marketplace',
        categories: ['3d', 'buildings', 'nature', 'tools', 'characters'],
        priceRange: { min: 5, max: 200 },
        quality: 'high',
        license: 'Unity Asset Store EULA',
        apiAvailable: true
      },
      {
        id: 'unreal_marketplace',
        name: 'Unreal Engine Marketplace',
        url: 'https://www.unrealengine.com/marketplace',
        type: 'marketplace',
        categories: ['3d', 'environments', 'props', 'materials'],
        priceRange: { min: 0, max: 300 },
        quality: 'premium',
        license: 'Unreal Engine Marketplace Terms',
        apiAvailable: true
      },
      {
        id: 'sketchfab',
        name: 'Sketchfab',
        url: 'https://sketchfab.com',
        type: 'marketplace',
        categories: ['3d', 'models', 'characters', 'environments'],
        priceRange: { min: 5, max: 100 },
        quality: 'medium',
        license: 'Varies per model',
        apiAvailable: true
      },
      {
        id: 'turbosquid',
        name: 'TurboSquid',
        url: 'https://www.turbosquid.com',
        type: 'marketplace',
        categories: ['3d', 'models', 'textures', 'animations'],
        priceRange: { min: 15, max: 500 },
        quality: 'high',
        license: 'TurboSquid License Agreement',
        apiAvailable: true
      },

      // Free Sources
      {
        id: 'opengameart',
        name: 'OpenGameArt.org',
        url: 'https://opengameart.org',
        type: 'free',
        categories: ['3d', 'textures', 'sounds', 'models'],
        priceRange: { min: 0, max: 0 },
        quality: 'medium',
        license: 'Various Open Source',
        apiAvailable: false
      },
      {
        id: 'kenney',
        name: 'Kenney.nl',
        url: 'https://kenney.nl/assets',
        type: 'free',
        categories: ['3d', '2d', 'ui', 'textures'],
        priceRange: { min: 0, max: 0 },
        quality: 'medium',
        license: 'CC0 / Custom',
        apiAvailable: false
      },
      {
        id: 'polyhaven',
        name: 'Poly Haven',
        url: 'https://polyhaven.com',
        type: 'free',
        categories: ['textures', 'models', 'hdris'],
        priceRange: { min: 0, max: 0 },
        quality: 'premium',
        license: 'CC0',
        apiAvailable: true
      },

      // Commission Platforms
      {
        id: 'fiverr',
        name: 'Fiverr',
        url: 'https://www.fiverr.com',
        type: 'commission',
        categories: ['3d', 'modeling', 'texturing', 'animation'],
        priceRange: { min: 50, max: 500 },
        quality: 'medium',
        license: 'Custom Agreement',
        apiAvailable: false
      },
      {
        id: 'upwork',
        name: 'Upwork',
        url: 'https://www.upwork.com',
        type: 'commission',
        categories: ['3d', 'art', 'modeling', 'texturing'],
        priceRange: { min: 500, max: 2000 },
        quality: 'high',
        license: 'Custom Agreement',
        apiAvailable: false
      },
      {
        id: 'artstation',
        name: 'ArtStation',
        url: 'https://www.artstation.com',
        type: 'commission',
        categories: ['3d', 'art', 'characters', 'environments'],
        priceRange: { min: 1000, max: 5000 },
        quality: 'premium',
        license: 'Custom Agreement',
        apiAvailable: false
      }
    ];

    sources.forEach(source => {
      this.sources.set(source.id, source);
    });
  }

  /**
   * Initialize asset requirements
   */
  private initializeRequirements(): void {
    const requirements: AssetRequirement[] = [
      // Buildings
      {
        category: 'buildings',
        type: 'residential',
        style: 'stylized',
        polyCount: { min: 500, max: 2000 },
        textureResolution: 1024,
        lodRequired: true,
        animationRequired: true,
        priority: 'critical',
        budget: 200
      },
      {
        category: 'buildings',
        type: 'agricultural',
        style: 'stylized',
        polyCount: { min: 800, max: 2500 },
        textureResolution: 1024,
        lodRequired: true,
        animationRequired: true,
        priority: 'critical',
        budget: 300
      },
      {
        category: 'buildings',
        type: 'industrial',
        style: 'functional',
        polyCount: { min: 1000, max: 3000 },
        textureResolution: 1024,
        lodRequired: true,
        animationRequired: true,
        priority: 'medium',
        budget: 250
      },

      // Crops
      {
        category: 'crops',
        type: 'growth_stages',
        style: 'stylized',
        polyCount: { min: 50, max: 200 },
        textureResolution: 512,
        lodRequired: true,
        animationRequired: true,
        priority: 'critical',
        budget: 100
      },
      {
        category: 'crops',
        type: 'effects',
        style: 'particle',
        polyCount: { min: 10, max: 100 },
        textureResolution: 256,
        lodRequired: false,
        animationRequired: true,
        priority: 'medium',
        budget: 50
      },

      // Nature
      {
        category: 'nature',
        type: 'trees',
        style: 'stylized',
        polyCount: { min: 300, max: 800 },
        textureResolution: 1024,
        lodRequired: true,
        animationRequired: true,
        priority: 'high',
        budget: 150
      },
      {
        category: 'nature',
        type: 'flowers',
        style: 'colorful',
        polyCount: { min: 20, max: 100 },
        textureResolution: 512,
        lodRequired: false,
        animationRequired: true,
        priority: 'medium',
        budget: 50
      },

      // Mining
      {
        category: 'mining',
        type: 'underground',
        style: 'atmospheric',
        polyCount: { min: 2000, max: 5000 },
        textureResolution: 1024,
        lodRequired: true,
        animationRequired: false,
        priority: 'medium',
        budget: 400
      },
      {
        category: 'mining',
        type: 'ores',
        style: 'glowing',
        polyCount: { min: 100, max: 500 },
        textureResolution: 512,
        lodRequired: false,
        animationRequired: true,
        priority: 'high',
        budget: 100
      }
    ];

    requirements.forEach((req, index) => {
      this.requirements.set(`req_${index}`, req);
    });
  }

  /**
   * Search for assets across all sources
   */
  public async searchAssets(
    query: string,
    requirements: AssetRequirement,
    maxResults: number = 50
  ): Promise<AssetSearchResult> {
    const startTime = performance.now();
    const candidates: AssetCandidate[] = [];

    // Search across all relevant sources
    for (const source of this.sources.values()) {
      if (this.isSourceRelevant(source, requirements)) {
        const sourceCandidates = await this.searchSource(source, query, requirements, maxResults);
        candidates.push(...sourceCandidates);
      }
    }

    // Evaluate and rank candidates
    const evaluatedCandidates = candidates.map(candidate => ({
      ...candidate,
      evaluation: this.evaluateAsset(candidate, requirements)
    }));

    // Sort by overall score
    evaluatedCandidates.sort((a, b) => b.evaluation.overallScore - a.evaluation.overallScore);

    // Get top recommendations
    const recommendations = evaluatedCandidates
      .filter(candidate => candidate.evaluation.overallScore >= 70)
      .slice(0, 5);

    const result: AssetSearchResult = {
      query,
      requirements,
      candidates: evaluatedCandidates.slice(0, maxResults),
      totalCount: candidates.length,
      searchTime: performance.now() - startTime,
      recommendations
    };

    this.searchHistory.push(result);
    return result;
  }

  /**
   * Check if source is relevant for requirements
   */
  private isSourceRelevant(source: AssetSource, requirements: AssetRequirement): boolean {
    // Check category match
    if (!source.categories.includes(requirements.category)) {
      return false;
    }

    // Check budget compatibility
    if (requirements.budget < source.priceRange.min ||
      (requirements.budget > 0 && requirements.budget < source.priceRange.max)) {
      return false;
    }

    // Check quality requirements
    if (requirements.priority === 'critical' && source.quality === 'low') {
      return false;
    }

    return true;
  }

  /**
   * Search specific source
   */
  private async searchSource(
    source: AssetSource,
    query: string,
    requirements: AssetRequirement,
    maxResults: number
  ): Promise<AssetCandidate[]> {
    const candidates: AssetCandidate[] = [];

    if (source.apiAvailable) {
      // Use API if available
      const apiCandidates = await this.searchSourceAPI(source, query, requirements, maxResults);
      candidates.push(...apiCandidates);
    } else {
      // Use web scraping or manual search
      const webCandidates = await this.searchSourceWeb(source, query, requirements, maxResults);
      candidates.push(...webCandidates);
    }

    return candidates;
  }

  /**
   * Search source via API
   */
  private async searchSourceAPI(
    source: AssetSource,
    query: string,
    requirements: AssetRequirement,
    maxResults: number
  ): Promise<AssetCandidate[]> {
    const candidates: AssetCandidate[] = [];

    switch (source.id) {
      case 'unity_asset_store':
        candidates.push(...await this.searchUnityAssetStore(query, requirements, maxResults));
        break;
      case 'unreal_marketplace':
        candidates.push(...await this.searchUnrealMarketplace(query, requirements, maxResults));
        break;
      case 'sketchfab':
        candidates.push(...await this.searchSketchfab(query, requirements, maxResults));
        break;
      case 'turbosquid':
        candidates.push(...await this.searchTurboSquid(query, requirements, maxResults));
        break;
      case 'polyhaven':
        candidates.push(...await this.searchPolyHaven(query, requirements, maxResults));
        break;
    }

    return candidates;
  }

  /**
   * Search Unity Asset Store
   */
  private async searchUnityAssetStore(
    query: string,
    requirements: AssetRequirement,
    maxResults: number
  ): Promise<AssetCandidate[]> {
    // Simulated Unity Asset Store API search
    const candidates: AssetCandidate[] = [];

    // In production, this would use actual Unity Asset Store API
    const mockResults = [
      {
        name: 'Cozy Farm Pack',
        description: 'Complete farm environment with buildings, crops, and tools',
        price: 150,
        polyCount: 1200,
        textureResolution: 1024,
        lodLevels: 3,
        animations: ['door', 'window', 'windmill'],
        fileFormats: ['fbx', 'obj', 'unitypackage'],
        fileSize: 250000000, // 250MB
        images: ['preview1.jpg', 'preview2.jpg'],
        videos: ['demo.mp4']
      },
      {
        name: 'Stylized Nature Collection',
        description: 'Trees, plants, and flowers for cozy games',
        price: 80,
        polyCount: 600,
        textureResolution: 512,
        lodLevels: 2,
        animations: ['sway', 'growth'],
        fileFormats: ['fbx', 'obj'],
        fileSize: 150000000, // 150MB
        images: ['preview1.jpg', 'preview2.jpg'],
        videos: ['demo.mp4']
      }
    ];

    for (const result of mockResults) {
      const candidate: AssetCandidate = {
        id: `unity_${Date.now()}_${Math.random()}`,
        source: this.sources.get('unity_asset_store')!,
        name: result.name,
        description: result.description,
        url: 'https://assetstore.unity.com/packages/example',
        price: result.price,
        license: 'Unity Asset Store EULA',
        quality: 85,
        compatibility: 90,
        requirements,
        preview: {
          images: result.images,
          videos: result.videos
        },
        metadata: {
          polyCount: result.polyCount,
          textureResolution: result.textureResolution,
          fileFormats: result.fileFormats,
          fileSize: result.fileSize,
          animations: result.animations,
          lodLevels: result.lodLevels
        },
        evaluation: {
          technicalScore: 0,
          artisticScore: 0,
          performanceScore: 0,
          licenseScore: 0,
          overallScore: 0
        }
      };

      candidates.push(candidate);
    }

    return candidates.slice(0, maxResults);
  }

  /**
   * Search Unreal Marketplace
   */
  private async searchUnrealMarketplace(
    query: string,
    requirements: AssetRequirement,
    maxResults: number
  ): Promise<AssetCandidate[]> {
    // Simulated Unreal Marketplace API search
    const candidates: AssetCandidate[] = [];

    // Mock results for Unreal Marketplace
    const mockResults = [
      {
        name: 'Farm Life Collection',
        description: 'AAA-quality farm assets with PBR materials',
        price: 200,
        polyCount: 2000,
        textureResolution: 2048,
        lodLevels: 4,
        animations: ['complex', 'realistic'],
        fileFormats: ['ue4', 'fbx'],
        fileSize: 500000000, // 500MB
        images: ['preview1.jpg', 'preview2.jpg'],
        videos: ['demo.mp4']
      }
    ];

    for (const result of mockResults) {
      const candidate: AssetCandidate = {
        id: `unreal_${Date.now()}_${Math.random()}`,
        source: this.sources.get('unreal_marketplace')!,
        name: result.name,
        description: result.description,
        url: 'https://www.unrealengine.com/marketplace/example',
        price: result.price,
        license: 'Unreal Engine Marketplace Terms',
        quality: 95,
        compatibility: 85,
        requirements,
        preview: {
          images: result.images,
          videos: result.videos
        },
        metadata: {
          polyCount: result.polyCount,
          textureResolution: result.textureResolution,
          fileFormats: result.fileFormats,
          fileSize: result.fileSize,
          animations: result.animations,
          lodLevels: result.lodLevels
        },
        evaluation: {
          technicalScore: 0,
          artisticScore: 0,
          performanceScore: 0,
          licenseScore: 0,
          overallScore: 0
        }
      };

      candidates.push(candidate);
    }

    return candidates.slice(0, maxResults);
  }

  /**
   * Search Sketchfab
   */
  private async searchSketchfab(
    query: string,
    requirements: AssetRequirement,
    maxResults: number
  ): Promise<AssetCandidate[]> {
    // Simulated Sketchfab API search
    const candidates: AssetCandidate[] = [];

    // Mock results for Sketchfab
    const mockResults = [
      {
        name: 'Cartoon Farm Buildings',
        description: 'Stylized farm buildings by independent artist',
        price: 75,
        polyCount: 800,
        textureResolution: 1024,
        lodLevels: 2,
        animations: ['basic'],
        fileFormats: ['obj', 'fbx', 'dae'],
        fileSize: 100000000, // 100MB
        images: ['preview1.jpg'],
        videos: []
      }
    ];

    for (const result of mockResults) {
      const candidate: AssetCandidate = {
        id: `sketchfab_${Date.now()}_${Math.random()}`,
        source: this.sources.get('sketchfab')!,
        name: result.name,
        description: result.description,
        url: 'https://sketchfab.com/models/example',
        price: result.price,
        license: 'Custom License',
        quality: 75,
        compatibility: 80,
        requirements,
        preview: {
          images: result.images,
          videos: result.videos
        },
        metadata: {
          polyCount: result.polyCount,
          textureResolution: result.textureResolution,
          fileFormats: result.fileFormats,
          fileSize: result.fileSize,
          animations: result.animations,
          lodLevels: result.lodLevels
        },
        evaluation: {
          technicalScore: 0,
          artisticScore: 0,
          performanceScore: 0,
          licenseScore: 0,
          overallScore: 0
        }
      };

      candidates.push(candidate);
    }

    return candidates.slice(0, maxResults);
  }

  /**
   * Search TurboSquid
   */
  private async searchTurboSquid(
    query: string,
    requirements: AssetRequirement,
    maxResults: number
  ): Promise<AssetCandidate[]> {
    // Simulated TurboSquid API search
    const candidates: AssetCandidate[] = [];

    // Mock results for TurboSquid
    const mockResults = [
      {
        name: 'Professional Farm Equipment',
        description: 'High-detail farming tools and machinery',
        price: 250,
        polyCount: 1500,
        textureResolution: 2048,
        lodLevels: 3,
        animations: ['mechanical'],
        fileFormats: ['max', 'obj', 'fbx'],
        fileSize: 300000000, // 300MB
        images: ['preview1.jpg', 'preview2.jpg'],
        videos: ['demo.mp4']
      }
    ];

    for (const result of mockResults) {
      const candidate: AssetCandidate = {
        id: `turbosquid_${Date.now()}_${Math.random()}`,
        source: this.sources.get('turbosquid')!,
        name: result.name,
        description: result.description,
        url: 'https://www.turbosquid.com/models/example',
        price: result.price,
        license: 'TurboSquid License',
        quality: 90,
        compatibility: 85,
        requirements,
        preview: {
          images: result.images,
          videos: result.videos
        },
        metadata: {
          polyCount: result.polyCount,
          textureResolution: result.textureResolution,
          fileFormats: result.fileFormats,
          fileSize: result.fileSize,
          animations: result.animations,
          lodLevels: result.lodLevels
        },
        evaluation: {
          technicalScore: 0,
          artisticScore: 0,
          performanceScore: 0,
          licenseScore: 0,
          overallScore: 0
        }
      };

      candidates.push(candidate);
    }

    return candidates.slice(0, maxResults);
  }

  /**
   * Search Poly Haven
   */
  private async searchPolyHaven(
    query: string,
    requirements: AssetRequirement,
    maxResults: number
  ): Promise<AssetCandidate[]> {
    // Simulated Poly Haven API search
    const candidates: AssetCandidate[] = [];

    // Mock results for Poly Haven
    const mockResults = [
      {
        name: 'Nature Textures Pack',
        description: 'High-quality PBR textures for natural environments',
        price: 0,
        polyCount: 0,
        textureResolution: 4096,
        lodLevels: 0,
        animations: [],
        fileFormats: ['jpg', 'png', 'exr'],
        fileSize: 50000000, // 50MB
        images: ['preview1.jpg'],
        videos: []
      }
    ];

    for (const result of mockResults) {
      const candidate: AssetCandidate = {
        id: `polyhaven_${Date.now()}_${Math.random()}`,
        source: this.sources.get('polyhaven')!,
        name: result.name,
        description: result.description,
        url: 'https://polyhaven.com/assets/example',
        price: result.price,
        license: 'CC0',
        quality: 95,
        compatibility: 90,
        requirements,
        preview: {
          images: result.images,
          videos: result.videos
        },
        metadata: {
          polyCount: result.polyCount,
          textureResolution: result.textureResolution,
          fileFormats: result.fileFormats,
          fileSize: result.fileSize,
          animations: result.animations,
          lodLevels: result.lodLevels
        },
        evaluation: {
          technicalScore: 0,
          artisticScore: 0,
          performanceScore: 0,
          licenseScore: 0,
          overallScore: 0
        }
      };

      candidates.push(candidate);
    }

    return candidates.slice(0, maxResults);
  }

  /**
   * Search source via web scraping (fallback)
   */
  private async searchSourceWeb(
    source: AssetSource,
    query: string,
    requirements: AssetRequirement,
    maxResults: number
  ): Promise<AssetCandidate[]> {
    // Web scraping implementation for sources without APIs
    // This would use web scraping libraries or manual search
    return [];
  }

  /**
   * Evaluate asset against requirements
   */
  private evaluateAsset(candidate: AssetCandidate, requirements: AssetRequirement): AssetCandidate['evaluation'] {
    const evaluation = {
      technicalScore: this.calculateTechnicalScore(candidate, requirements),
      artisticScore: this.calculateArtisticScore(candidate, requirements),
      performanceScore: this.calculatePerformanceScore(candidate, requirements),
      licenseScore: this.calculateLicenseScore(candidate, requirements),
      overallScore: 0
    };

    // Calculate weighted overall score
    evaluation.overallScore =
      evaluation.technicalScore * this.evaluationWeights.technical +
      evaluation.artisticScore * this.evaluationWeights.artistic +
      evaluation.performanceScore * this.evaluationWeights.performance +
      evaluation.licenseScore * this.evaluationWeights.license +
      this.calculatePriceScore(candidate, requirements) * this.evaluationWeights.price;

    return evaluation;
  }

  /**
   * Calculate technical score
   */
  private calculateTechnicalScore(candidate: AssetCandidate, requirements: AssetRequirement): number {
    let score = 100;

    // Poly count compatibility
    if (candidate.metadata.polyCount < requirements.polyCount.min ||
      candidate.metadata.polyCount > requirements.polyCount.max) {
      score -= 20;
    }

    // Texture resolution compatibility
    if (candidate.metadata.textureResolution < requirements.textureResolution) {
      score -= 15;
    }

    // LOD requirement
    if (requirements.lodRequired && candidate.metadata.lodLevels < 2) {
      score -= 25;
    }

    // Animation requirement
    if (requirements.animationRequired && candidate.metadata.animations.length === 0) {
      score -= 20;
    }

    // File format compatibility
    const requiredFormats = ['fbx', 'obj', 'glb'];
    const hasRequiredFormat = requiredFormats.some(format =>
      candidate.metadata.fileFormats.includes(format)
    );
    if (!hasRequiredFormat) {
      score -= 10;
    }

    return Math.max(0, score);
  }

  /**
   * Calculate artistic score
   */
  private calculateArtisticScore(candidate: AssetCandidate, requirements: AssetRequirement): number {
    let score = candidate.quality;

    // Style compatibility
    if (candidate.source.quality === 'premium' && requirements.priority === 'critical') {
      score += 10;
    } else if (candidate.source.quality === 'low' && requirements.priority === 'critical') {
      score -= 20;
    }

    // Preview quality
    if (candidate.preview.images.length >= 3) {
      score += 5;
    }
    if (candidate.preview.videos.length > 0) {
      score += 10;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Calculate performance score
   */
  private calculatePerformanceScore(candidate: AssetCandidate, requirements: AssetRequirement): number {
    let score = 100;

    // File size impact
    const fileSizeMB = candidate.metadata.fileSize / (1024 * 1024);
    if (fileSizeMB > 100) {
      score -= 20;
    } else if (fileSizeMB > 50) {
      score -= 10;
    }

    // Poly count impact
    if (candidate.metadata.polyCount > 2000) {
      score -= 15;
    } else if (candidate.metadata.polyCount > 1000) {
      score -= 5;
    }

    // LOD benefit
    if (candidate.metadata.lodLevels >= 3) {
      score += 15;
    } else if (candidate.metadata.lodLevels >= 2) {
      score += 10;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Calculate license score
   */
  private calculateLicenseScore(candidate: AssetCandidate, requirements: AssetRequirement): number {
    let score = 100;

    // License type scoring
    if (candidate.license.includes('CC0')) {
      score += 10;
    } else if (candidate.license.includes('MIT')) {
      score += 5;
    } else if (candidate.license.includes('Custom')) {
      score -= 10;
    }

    // Commercial use
    if (!candidate.license.includes('Commercial') && !candidate.license.includes('CC0')) {
      score -= 20;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Calculate price score
   */
  private calculatePriceScore(candidate: AssetCandidate, requirements: AssetRequirement): number {
    if (requirements.budget === 0) {
      // Free assets preferred
      return candidate.price === 0 ? 100 : 50;
    }

    // Budget compatibility
    const budgetRatio = candidate.price / requirements.budget;
    if (budgetRatio <= 0.5) {
      return 100; // Well under budget
    } else if (budgetRatio <= 1.0) {
      return 80; // Within budget
    } else if (budgetRatio <= 1.5) {
      return 60; // Slightly over budget
    } else {
      return 20; // Significantly over budget
    }
  }

  /**
   * Get search history
   */
  public getSearchHistory(): AssetSearchResult[] {
    return this.searchHistory;
  }

  /**
   * Get asset sources
   */
  public getSources(): AssetSource[] {
    return Array.from(this.sources.values());
  }

  /**
   * Get requirements
   */
  public getRequirements(): AssetRequirement[] {
    return Array.from(this.requirements.values());
  }

  /**
   * Add custom source
   */
  public addSource(source: AssetSource): void {
    this.sources.set(source.id, source);
  }

  /**
   * Add custom requirement
   */
  public addRequirement(requirement: AssetRequirement): void {
    this.requirements.set(`custom_${Date.now()}`, requirement);
  }

  /**
   * Export search results
   */
  public exportResults(searchId: string): AssetSearchResult | null {
    const result = this.searchHistory.find(r => r.query === searchId);
    return result || null;
  }

  /**
   * Generate acquisition report
   */
  public generateAcquisitionReport(): {
    totalRequirements: number;
    coveredRequirements: number;
    budgetRequired: number;
    recommendedAssets: AssetCandidate[];
    sourcesUsed: string[];
    timeline: string;
  } {
    const requirements = Array.from(this.requirements.values());
    const coveredRequirements = new Set<string>();
    const recommendedAssets: AssetCandidate[] = [];
    const sourcesUsed = new Set<string>();
    let budgetRequired = 0;

    // Get best candidates for each requirement
    for (const requirement of requirements) {
      const bestCandidates = this.searchHistory
        .flatMap(search => search.candidates)
        .filter(candidate =>
          candidate.requirements.category === requirement.category &&
          candidate.requirements.type === requirement.type
        )
        .sort((a, b) => b.evaluation.overallScore - a.evaluation.overallScore)
        .slice(0, 3);

      if (bestCandidates.length > 0) {
        coveredRequirements.add(`${requirement.category}_${requirement.type}`);
        recommendedAssets.push(...bestCandidates);
        budgetRequired += bestCandidates[0].price;
        sourcesUsed.add(bestCandidates[0].source.id);
      }
    }

    return {
      totalRequirements: requirements.length,
      coveredRequirements: coveredRequirements.size,
      budgetRequired,
      recommendedAssets,
      sourcesUsed: Array.from(sourcesUsed),
      timeline: '8 weeks for complete acquisition'
    };
  }
}
