/**
 * Advanced 3D Renderer for Cozy Haven
 * 
 * High-performance WebGL 2.0 renderer with PBR materials, 
 * dynamic lighting, LOD system, and advanced effects
 */

import { AssetLoader, LoadedAsset, LODLevel, PBRMaterial } from './AssetLoader';
import { ParticleSystem } from './ParticleSystem';
import { SeasonalAudioSystem } from '../systems/SeasonalAudioSystem';

export interface RenderObject3D {
  id: string;
  assetId: string;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  visible: boolean;
  lodLevel: number;
  distance: number;
  boundingBox: {
    min: [number, number, number];
    max: [number, number, number];
  };
  materialOverrides?: Partial<PBRMaterial>;
  animation?: {
    name: string;
    time: number;
    speed: number;
    loop: boolean;
  };
  effects?: {
    glow?: { color: [number, number, number]; intensity: number };
    particle?: { type: string; count: number; rate: number };
    wind?: { strength: number; direction: [number, number] };
  };
}

export interface Camera3D {
  position: [number, number, number];
  rotation: [number, number, number];
  fov: number;
  near: number;
  far: number;
  target?: [number, number, number];
  type: 'perspective' | 'orthographic' | 'isometric';
}

export interface Light3D {
  id: string;
  type: 'directional' | 'point' | 'spot' | 'ambient';
  position?: [number, number, number];
  direction?: [number, number, number];
  color: [number, number, number];
  intensity: number;
  range?: number;
  angle?: number;
  shadows: boolean;
  enabled: boolean;
}

export interface EnvironmentSettings {
  timeOfDay: number; // 0-24 hours
  weather: 'clear' | 'cloudy' | 'rainy' | 'snowy' | 'foggy';
  season: 'spring' | 'summer' | 'autumn' | 'winter';
  wind: {
    strength: number;
    direction: [number, number];
  };
  fog: {
    density: number;
    color: [number, number, number];
    height: number;
  };
}

export interface RenderStats {
  frameTime: number;
  fps: number;
  drawCalls: number;
  triangles: number;
  vertices: number;
  textureMemory: number;
  lodSwitches: number;
  culledObjects: number;
}

export class Renderer3D {
  private canvas: HTMLCanvasElement;
  private gl: WebGL2RenderingContext;
  private assetLoader: AssetLoader;

  // Rendering components
  private renderObjects: Map<string, RenderObject3D> = new Map();
  private lights: Map<string, Light3D> = new Map();
  private camera!: Camera3D;
  private environment!: EnvironmentSettings;

  // WebGL resources
  private shaderPrograms: Map<string, WebGLProgram> = new Map();
  private vertexBuffers: Map<string, WebGLBuffer> = new Map();
  private indexBuffers: Map<string, WebGLBuffer> = new Map();
  private textureCache: Map<string, WebGLTexture> = new Map();
  private framebuffers: Map<string, WebGLFramebuffer> = new Map();

  // Rendering state
  private stats!: RenderStats;
  private lastFrameTime: number = 0;
  private frameCount: number = 0;
  private maxDrawCalls: number = 1000;

  // Post-processing
  private postProcessChain: string[] = [];
  private renderTexture: WebGLTexture | null = null;
  private depthTexture: WebGLTexture | null = null;
  private shellManager: any = null;
  private particleSystem!: ParticleSystem;
  private audioSystem!: SeasonalAudioSystem;
  private viewMatrix: Float32Array = new Float32Array(16);
  private projectionMatrix: Float32Array = new Float32Array(16);
  private postProcessVAO!: WebGLVertexArrayObject;

  constructor(canvas: HTMLCanvasElement, assetLoader: AssetLoader) {
    this.canvas = canvas;
    this.assetLoader = assetLoader;

    // Initialize WebGL
    const gl = canvas.getContext('webgl2', {
      alpha: false,
      depth: true,
      stencil: false,
      antialias: true,
      premultipliedAlpha: false,
      preserveDrawingBuffer: false,
      powerPreference: 'high-performance'
    });

    if (!gl) {
      throw new Error('WebGL 2.0 not supported');
    }

    this.gl = gl;
    this.initializeRenderer();
  }

  /**
   * Initialize renderer components
   */
  private async initializeRenderer(): Promise<void> {
    const gl = this.gl;

    // Enable WebGL features
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    // Enable Alpha-to-Coverage for "perfect" grass edges
    gl.enable(gl.SAMPLE_ALPHA_TO_COVERAGE);

    // Initialize shaders
    await this.initializeShaders();

    // Initialize particles
    this.particleSystem = new ParticleSystem(this.gl);

    // Initialize audio
    this.audioSystem = new SeasonalAudioSystem();

    // Initialize post-processing
    this.initializePostProcessing();

    // Set up camera
    this.camera = {
      position: [0, 10, 10],
      rotation: [0, 0, 0],
      fov: 60,
      near: 0.1,
      far: 1000,
      type: 'perspective'
    };

    // Set up environment
    this.environment = {
      timeOfDay: 12, // Noon
      weather: 'clear',
      season: 'summer',
      wind: { strength: 0.5, direction: [1, 0] },
      fog: { density: 0, color: [0.8, 0.9, 1.0], height: 50 }
    };

    // Initialize stats
    this.stats = {
      frameTime: 0,
      fps: 60,
      drawCalls: 0,
      triangles: 0,
      vertices: 0,
      textureMemory: 0,
      lodSwitches: 0,
      culledObjects: 0
    };
  }

  /**
   * Initialize shader programs
   */
  private async initializeShaders(): Promise<void> {
    const gl = this.gl;

    // PBR Shader
    const pbrVertexShader = `
      #version 300 es
      precision highp float;
      
      layout(location = 0) in vec3 aPosition;
      layout(location = 1) in vec3 aNormal;
      layout(location = 2) in vec2 aTexCoord;
      layout(location = 3) in vec4 aTangent;
      layout(location = 4) in vec4 aJointIndices;
      layout(location = 5) in vec4 aJointWeights;
      
      uniform mat4 uModelMatrix;
      uniform mat4 uViewMatrix;
      uniform mat4 uProjectionMatrix;
      uniform mat3 uNormalMatrix;
      uniform vec3 uCameraPosition;
      uniform float uTime;
      uniform float uWindSway;
      uniform float uHeatHaze; // Intensity of summer heat shimmer
      
      out vec3 vPosition;
      out vec3 vNormal;
      out vec2 vTexCoord;
      out vec3 vTangent;
      out vec3 vBitangent;
      out vec3 vViewPosition;
      
      void main() {
        vec4 pos = vec4(aPosition, 1.0);
        
        // Procedural Wind Sway
        if (uWindSway > 0.0) {
           float height = max(pos.y, 0.0);
           // Multi-frequency sway
           float swayX = sin(uTime * 1.5 + pos.x * 0.5 + pos.z * 0.2) * 0.05 * height * uWindSway;
           float swayZ = cos(uTime * 1.2 + pos.x * 0.3 + pos.z * 0.5) * 0.03 * height * uWindSway;
           pos.x += swayX;
           pos.z += swayZ;
        }
        
        // Summer Heat Haze (Subtle vertex wobble)
        if (uHeatHaze > 0.0) {
           pos.x += sin(uTime * 5.0 + pos.y * 10.0) * 0.01 * uHeatHaze;
           pos.z += cos(uTime * 4.0 + pos.y * 8.0) * 0.01 * uHeatHaze;
        }

        vPosition = (uModelMatrix * pos).xyz;
        vViewPosition = (uViewMatrix * vec4(vPosition, 1.0)).xyz;
        
        vNormal = normalize(uNormalMatrix * aNormal);
        vTangent = normalize(uNormalMatrix * aTangent.xyz);
        vBitangent = cross(vNormal, vTangent) * aTangent.w;
        vTexCoord = aTexCoord;
        
        gl_Position = uProjectionMatrix * uViewMatrix * vec4(vPosition, 1.0);
      }
    `;

    const pbrFragmentShader = `
      #version 300 es
      precision highp float;
      
      in vec3 vPosition;
      in vec3 vNormal;
      in vec2 vTexCoord;
      in vec3 vTangent;
      in vec3 vBitangent;
      in vec3 vViewPosition;
      
      uniform sampler2D uDiffuseTexture;
      uniform sampler2D uNormalTexture;
      uniform sampler2D uRoughnessTexture;
      uniform sampler2D uMetallicTexture;
      uniform sampler2D uEmissiveTexture;
      
      uniform vec4 uDiffuseColor;
      uniform float uRoughness;
      uniform float uMetallic;
      uniform vec3 uEmissiveColor;
      uniform float uTransparency;
      uniform float uAlphaTest;
      
      uniform vec3 uLightDirection;
      uniform vec3 uLightColor;
      uniform float uLightIntensity;
      uniform vec3 uAmbientColor;
      uniform float uAmbientIntensity;
      uniform float uFogDensity;
      uniform vec3 uFogColor;
      uniform float uSnowFactor; // 0.0 to 1.0 accumulation
      uniform float uDewFactor;  // 0.0 to 1.0 sparkle intensity (dew/frost)
      uniform float uSSSStrength; // Subsurface scattering for foliage
      uniform float uPuddleFactor; // 0.0 to 1.0 ground wetness
      
      uniform vec3 uCameraPosition;
      uniform float uTime;
      
      out vec4 fragColor;
      
      // Pseudo-random hash for sparkle
      float hash13(vec3 p3) {
        p3  = fract(p3 * .1031);
        p3 += dot(p3, p3.yzx + 33.33);
        return fract((p3.x + p3.y) * p3.z);
      }
      
      // PBR lighting functions
      vec3 getNormalFromMap() {
        vec3 tangentNormal = texture(uNormalTexture, vTexCoord).rgb * 2.0 - 1.0;
        return normalize(mat3(vTangent, vBitangent, vNormal) * tangentNormal);
      }
      
      float distributionGGX(float roughness, float NoH) {
        float a = roughness * roughness;
        float a2 = a * a;
        float NoH2 = NoH * NoH;
        return a2 / (3.141592 * NoH2 * (a2 - 1.0) + 1.0);
      }
      
      float geometrySchlickGGX(float roughness, float NoV, float NoL) {
        float k = (roughness + 1.0) * (roughness + 1.0) / 8.0;
        float NdotV = NoV;
        float NdotL = NoL;
        return NdotV / (NdotV * (1.0 - k) + k);
      }
      
      vec3 fresnelSchlick(float cosTheta, vec3 F0) {
        return F0 + (1.0 - F0) * pow(1.0 - cosTheta, 5.0);
      }
      
      void main() {
        // Sample textures
        vec4 diffuseTex = texture(uDiffuseTexture, vTexCoord);
        vec3 normalMap = texture(uNormalTexture, vTexCoord).rgb;
        float roughnessTex = texture(uRoughnessTexture, vTexCoord).r;
        float metallicTex = texture(uMetallicTexture, vTexCoord).r;
        vec3 emissiveTex = texture(uEmissiveTexture, vTexCoord).rgb;
        
        // Material properties
        vec3 albedo = diffuseTex.rgb * uDiffuseColor.rgb;
        float roughness = mix(uRoughness, roughnessTex, 0.5);
        float metallic = mix(uMetallic, metallicTex, 0.5);
        
        // Dynamic Puddles (Cozy Wetness)
        if (uPuddleFactor > 0.0 && vNormal.y > 0.9) {
           float pNoise = hash13(vPosition * 2.0);
           if (pNoise > (1.0 - uPuddleFactor * 0.5)) {
              roughness = 0.01; // Perfectly smooth
              albedo *= 0.8;    // Darken wet surface
              albedo += vec3(0.0, 0.05, 0.1); // Subtle blue tint
           }
        }
        
        vec3 emissive = emissiveTex.rgb * uEmissiveColor.rgb;
        
        // Normal mapping
        vec3 N = getNormalFromMap();
        vec3 V = normalize(uCameraPosition - vPosition);
        vec3 L = normalize(-uLightDirection);
        vec3 H = normalize(V + L);
        
        // Lighting calculations
        float NoV = max(dot(N, V), 0.0);
        float NoL = max(dot(N, L), 0.0);
        float NoH = max(dot(N, H), 0.0);
        float VoH = max(dot(V, H), 0.0);
        
        // PBR components
        float D = distributionGGX(roughness, NoH);
        float G = geometrySchlickGGX(roughness, NoV, NoL);
        vec3 F0 = mix(vec3(0.04), albedo, metallic);
        vec3 F = fresnelSchlick(VoH, F0);
        
        vec3 kS = F;
        vec3 kD = (1.0 - kS) * (1.0 - metallic);
        
        vec3 specular = (D * G * F) / (4.0 * NoL * NoV + 0.001);
        vec3 diffuse = kD * albedo / 3.141592;
        
        // Subsurface Scattering (Backlighting glow)
        float sssEffect = pow(max(dot(V, -L), 0.0), 3.0) * uSSSStrength;
        vec3 sssColor = albedo * uLightColor * sssEffect;
        
        // Final lighting
        vec3 color = (diffuse + specular) * uLightColor * uLightIntensity * NoL;
        color += sssColor * uLightIntensity;
        color += uAmbientColor * uAmbientIntensity * albedo;
        
        // Rim Lighting (Cozy Edge Glow)
        float rimRaw = 1.0 - max(dot(N, V), 0.0);
        float rimFactor = pow(rimRaw, 3.0);
        vec3 rimColor = uLightColor * 0.8; 
        color += rimColor * rimFactor * 0.5 * uLightIntensity;
        color += emissive;
        
        // Snow Accumulation (Winter Polish)
        if (uSnowFactor > 0.0) {
           float snowArea = max(dot(N, vec3(0.0, 1.0, 0.0)), 0.0);
           snowArea = pow(snowArea, 2.0); // Sharpen the accumulation on top
           vec3 snowCol = vec3(0.95, 0.98, 1.0);
           color = mix(color, snowCol * (uLightIntensity + uAmbientIntensity), snowArea * uSnowFactor * 0.9);
        }
        
        // Frost/Dew Sparkle (Cozy Polish)
        float sparkleMix = max(uSnowFactor, uDewFactor);
        if (sparkleMix > 0.0) {
           float sparkle = hash13(vPosition * 100.0 + floor(uTime * 10.0));
           float glare = pow(max(dot(N, V), 0.0), 16.0); // Only sparkle on glancing angles
           if (sparkle > 0.98) {
              color += vec3(1.2) * sparkleMix * glare;
           }
        }
        
        // Fog
        float dist = length(vViewPosition);
        float fogFactor = 1.0 - exp(-dist * uFogDensity);
        color = mix(color, uFogColor, fogFactor);
        
        // Alpha
        float alpha = diffuseTex.a * uTransparency;
        
        fragColor = vec4(color, alpha);
        
        if (alpha < uAlphaTest) {
          discard;
        }
      }
    `;

    // Compile shaders
    const pbrProgram = this.createShaderProgram(pbrVertexShader, pbrFragmentShader);
    this.shaderPrograms.set('pbr', pbrProgram);

    // Additional shaders for different effects
    const skyboxVertexShader = `#version 300 es
      layout(location = 0) in vec3 aPosition;
      uniform mat4 uViewMatrix;
      uniform mat4 uProjectionMatrix;
      out vec3 vWorldPos;
      void main() {
        vWorldPos = aPosition;
        // Optimization: remove translation for skybox
        mat4 view = mat4(mat3(uViewMatrix));
        gl_Position = (uProjectionMatrix * view * vec4(aPosition, 1.0)).xyww;
      }
    `;
    const skyboxFragmentShader = `#version 300 es
      precision highp float;
      in vec3 vWorldPos;
      uniform vec3 uHorizonColor;
      uniform vec3 uZenithColor;
      uniform float uTime;
      uniform float uAuroraIntensity;
      out vec4 fragColor;

      float hash(vec2 p) { return fract(sin(dot(p, vec2(12.7, 31.1))) * 43758.5); }
      float noise(vec2 p) {
        vec2 i = floor(p); vec2 f = fract(p);
        f = f*f*(3.0-2.0*f);
        return mix(mix(hash(i), hash(i+vec2(1,0)), f.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y);
      }

      void main() {
        vec3 dir = normalize(vWorldPos);
        float h = max(dir.y, 0.0);
        vec3 sky = mix(uHorizonColor, uZenithColor, h);

        // Aurora Borealis logic
        if (uAuroraIntensity > 0.0 && dir.y > 0.0) {
           float a = noise(dir.xz * 2.0 + uTime * 0.1);
           float b = noise(dir.xz * 5.0 - uTime * 0.2);
           float wave = smoothstep(0.4, 0.6, a * b);
           vec3 auroraCol = vec3(0.1, 0.8, 0.3) * wave * uAuroraIntensity;
           sky += auroraCol / (1.0 + h * 2.0);
        }

        fragColor = vec4(sky, 1.0);
      }
    `;
    const skyboxProgram = this.createShaderProgram(skyboxVertexShader, skyboxFragmentShader);
    this.shaderPrograms.set('skybox', skyboxProgram);

    const particleVertexShader = `...`; // Particle shader
    const particleFragmentShader = `...`; // Particle shader
    const particleProgram = this.createShaderProgram(particleVertexShader, particleFragmentShader);
    this.shaderPrograms.set('particle', particleProgram);

    // Pseudo-3D Shell Grass Shader
    const grassVertexShader = `
      #version 300 es
      precision highp float;
      
      layout(location = 0) in vec3 aPosition;
      layout(location = 1) in vec3 aNormal;
      layout(location = 2) in vec2 aTexCoord;
      
      uniform mat4 uModelMatrix;
      uniform mat4 uViewMatrix;
      uniform mat4 uProjectionMatrix;
      uniform mat3 uNormalMatrix;
      uniform float uTime;
      uniform float uShellIndex;
      uniform float uTotalShells;
      uniform float uShellHeight;
      uniform vec2 uWindDirection;
      uniform float uWindStrength;
      uniform vec3 uPlayerPosition;
      
      out vec2 vTexCoord;
      out float vShellIndex;
      out float vHeightFactor;
      out vec3 vNormal;
      out vec3 vPosition;

      // Hash for noise
      vec3 hash(vec3 p) {
        p = vec3(dot(p, vec3(127.1, 311.7, 74.7)),
                 dot(p, vec3(269.5, 183.3, 246.1)),
                 dot(p, vec3(113.5, 271.9, 124.6)));
        return fract(sin(p) * 43758.5453123);
      }

      // Simple 3D Perlin-ish noise for wind
      float noise(vec3 p) {
        vec3 i = floor(p);
        vec3 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(mix(dot(hash(i + vec3(0,0,0)), f - vec3(0,0,0)),
                           dot(hash(i + vec3(1,0,0)), f - vec3(1,0,0)), f.x),
                       mix(mix(dot(hash(i + vec3(0,1,0)), f - vec3(0,1,0)),
                               dot(hash(i + vec3(1,1,0)), f - vec3(1,1,0)), f.x), f.y),
                   mix(mix(mix(dot(hash(i + vec3(0,0,1)), f - vec3(0,0,1)),
                               dot(hash(i + vec3(1,0,1)), f - vec3(1,0,1)), f.x),
                       mix(mix(dot(hash(i + vec3(0,1,1)), f - vec3(0,1,1)),
                               dot(hash(i + vec3(1,1,1)), f - vec3(1,1,1)), f.x), f.y), f.z)) * 0.5 + 0.5;
      }

      void main() {
        vShellIndex = uShellIndex;
        float h = uShellIndex / uTotalShells;
        vHeightFactor = h;
        
        // Non-linear shell spacing for "perfect" tips
        float displacement = pow(h, 1.2) * uShellHeight;
        
        vec3 pos = aPosition + aNormal * displacement;
        
        // Wind Sway (Faster at tips)
        float windTime = uTime * 2.0;
        float windNoise = noise(vec3(aPosition.xz * 0.5, windTime));
        vec2 windOffset = uWindDirection * uWindStrength * pow(h, 2.0) * windNoise;
        
        // Player Interaction (Push away)
        float interactionRadius = 1.5;
        float dist = distance(aPosition.xz, uPlayerPosition.xz);
        float interactionFactor = 1.0 - smoothstep(0.0, interactionRadius, dist);
        vec2 pushDir = normalize(aPosition.xz - uPlayerPosition.xz);
        if (length(pushDir) == 0.0) pushDir = vec2(1.0, 0.0); // Safety
        
        // Combine forces: Wind + Interaction
        pos.xz += windOffset;
        pos.xz += pushDir * interactionFactor * 1.0 * pow(h, 2.5); // Strong push at tips
        
        vPosition = (uModelMatrix * vec4(pos, 1.0)).xyz;
        vNormal = normalize(uNormalMatrix * aNormal);
        vTexCoord = aTexCoord;
        
        gl_Position = uProjectionMatrix * uViewMatrix * vec4(vPosition, 1.0);
      }
    `;

    const grassFragmentShader = `
      #version 300 es
      precision highp float;
      
      in vec2 vTexCoord;
      in float vShellIndex;
      in float vHeightFactor;
      in vec3 vNormal;
      in vec3 vPosition;
      
      uniform vec3 uCameraPosition;
      uniform vec3 uLightDirection;
      uniform vec3 uLightColor;
      uniform vec3 uBaseColor;
      uniform vec3 uTipColor;
      uniform float uTotalShells;
      
      out vec4 fragColor;

      // 2D Worley Noise for individual blades
      float worley(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        float minDist = 1.0;
        for (int y = -1; y <= 1; y++) {
          for (int x = -1; x <= 1; x++) {
            vec2 neighbor = vec2(float(x), float(y));
            vec2 point = fract(sin(vec2(dot(i + neighbor, vec2(127.1, 311.7)), dot(i + neighbor, vec2(269.5, 183.3)))) * 43758.5453123);
            vec2 diff = neighbor + point - f;
            minDist = min(minDist, length(diff));
          }
        }
        return minDist;
      }

      void main() {
        // Sample worley noise for blade shape
        // We scale the texture coordinates to get a realistic density
        float d = worley(vTexCoord * 50.0);
        
        // Threshold based on shell height (higher shells = thinner blades)
        float threshold = 0.5 * (1.0 - vHeightFactor);
        if (d > threshold) discard;
        
        // Lighting
        vec3 N = vNormal;
        vec3 L = normalize(-uLightDirection);
        float diff = max(dot(N, L), 0.0);
        
        // Translucency (SSS approximation)
        vec3 V = normalize(uCameraPosition - vPosition);
        float sss = pow(max(dot(V, -L), 0.0), 4.0) * 0.5;
        
        // Ambient Occlusion (Darker at base)
        float ao = mix(0.2, 1.0, vHeightFactor);
        
        // Final Color
        vec3 baseColor = mix(uBaseColor, uTipColor, vHeightFactor);
        vec3 color = baseColor * (diff + sss + 0.3) * uLightColor * ao;
        
        // Anti-Aliasing (Alpha-to-Coverage will handle the edges)
        fragColor = vec4(color, 1.0);
      }
    `;

    const grassProgram = this.createShaderProgram(grassVertexShader, grassFragmentShader);
    this.shaderPrograms.set('grass', grassProgram);

    // Final Post-Process Shader
    const postVertexShader = `#version 300 es
      layout(location = 0) in vec2 aPosition;
      out vec2 vTexCoord;
      void main() {
        vTexCoord = aPosition * 0.5 + 0.5;
        gl_Position = vec4(aPosition, 0.0, 1.0);
      }
    `;

    const postFragmentShader = `#version 300 es
      precision highp float;
      in vec2 vTexCoord;
      uniform sampler2D uScene;
      uniform int uEffect; // 0: None, 1: Bloom, 2: ToneMapping, 3: Vignette
      uniform float uTime;
      out vec4 fragColor;
      
      void main() {
        vec3 color = texture(uScene, vTexCoord).rgb;
        
        if (uEffect == 1) { // Simple Bloom (Highlight boost)
           float bright = dot(color, vec3(0.2126, 0.7152, 0.0722));
           if (bright > 0.8) color *= 1.5;
        } else if (uEffect == 2) { // Tone Mapping (Reinhard)
           color = color / (color + vec3(1.0));
           color = pow(color, vec3(1.0/2.2)); // Gamma correction
        } else if (uEffect == 3) { // Vignette
           vec2 uv = vTexCoord - 0.5;
           float dist = length(uv);
           color *= smoothstep(0.8, 0.4, dist);
        } else if (uEffect == 4) { // Tilt-Shift
           float blur = smoothstep(0.1, 0.5, abs(vTexCoord.y - 0.5));
           // Simple 5-tap blur
           vec3 soft = vec3(0.0);
           soft += texture(uScene, vTexCoord + vec2(0.0, 0.01) * blur).rgb;
           soft += texture(uScene, vTexCoord - vec2(0.0, 0.01) * blur).rgb;
           soft += texture(uScene, vTexCoord + vec2(0.01, 0.0) * blur).rgb;
           soft += texture(uScene, vTexCoord - vec2(0.01, 0.0) * blur).rgb;
           soft += color;
           color = soft / 5.0;
        } else if (uEffect == 5) { // God Rays (Radial Blur towards Sun)
           // uSunScreenPos should be passed as uniform
           // For now, assume sun is high in the sky center roughly
           vec2 sunPos = vec2(0.5, 0.7); 
           vec2 rayDir = (vTexCoord - sunPos) * 0.02;
           vec3 rays = vec3(0.0);
           vec2 coord = vTexCoord;
           for(int i=0; i<10; i++) {
              coord -= rayDir;
              rays += texture(uScene, coord).rgb;
           }
           color += rays * 0.1;
        } else if (uEffect == 6) { // Kuwahara Painterly Filter
           const int radius = 3;
           float n = float((radius + 1) * (radius + 1));
           vec3 m[4];
           vec3 s[4];
           for (int i = 0; i < 4; ++i) {
             m[i] = vec3(0.0);
             s[i] = vec3(0.0);
           }

           struct Bounds { int x1, x2, y1, y2; };
           Bounds b[4];
           b[0] = Bounds(-radius, 0, -radius, 0);
           b[1] = Bounds(0, radius, -radius, 0);
           b[2] = Bounds(0, radius, 0, radius);
           b[3] = Bounds(-radius, 0, 0, radius);

           for (int i = 0; i < 4; ++i) {
             for (int j = b[i].y1; j <= b[i].y2; ++j) {
               for (int k = b[i].x1; k <= b[i].x2; ++k) {
                 vec3 c = texture(uScene, vTexCoord + vec2(k, j) / 512.0).rgb; // Approx texel size
                 m[i] += c;
                 s[i] += c * c;
               }
             }
           }

           float min_sigma2 = 1e+2;
           for (int i = 0; i < 4; ++i) {
             m[i] /= n;
             s[i] = abs(s[i] / n - m[i] * m[i]);
             float sigma2 = s[i].r + s[i].g + s[i].b;
             if (sigma2 < min_sigma2) {
               min_sigma2 = sigma2;
               color = m[i];
             }
           }
        }
        
        fragColor = vec4(color, 1.0);
      }
    `;
    const postProgram = this.createShaderProgram(postVertexShader, postFragmentShader);
    this.shaderPrograms.set('post', postProgram);
  }

  /**
   * Create shader program
   */
  private createShaderProgram(vertexSource: string, fragmentSource: string): WebGLProgram {
    const gl = this.gl;

    const vertexShader = gl.createShader(gl.VERTEX_SHADER)!;
    gl.shaderSource(vertexShader, vertexSource);
    gl.compileShader(vertexShader);

    if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
      console.error('Vertex shader compilation error:', gl.getShaderInfoLog(vertexShader));
    }

    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER)!;
    gl.shaderSource(fragmentShader, fragmentSource);
    gl.compileShader(fragmentShader);

    if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
      console.error('Fragment shader compilation error:', gl.getShaderInfoLog(fragmentShader));
    }

    const program = gl.createProgram()!;
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Program linking error:', gl.getProgramInfoLog(program));
    }

    return program;
  }

  /**
   * Initialize post-processing effects
   */
  private initializePostProcessing(): void {
    const gl = this.gl;

    // Create render texture
    this.renderTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.renderTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.canvas.width, this.canvas.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    // Create depth texture
    this.depthTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.depthTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT24, this.canvas.width, this.canvas.height, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    // Create framebuffer
    const framebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.renderTexture, 0);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, this.depthTexture, 0);

    this.framebuffers.set('main', framebuffer);

    // Set up post-processing chain
    this.postProcessChain = ['kuwahara', 'godRays', 'bloom', 'tiltShift', 'toneMapping', 'vignette'];

    // Create quad for post-processing
    this.postProcessVAO = gl.createVertexArray()!;
    gl.bindVertexArray(this.postProcessVAO);
    const quadBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
    const quadVertices = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
    gl.bufferData(gl.ARRAY_BUFFER, quadVertices, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  }

  /**
   * Add render object
   */
  public addObject(object: RenderObject3D): void {
    this.renderObjects.set(object.id, object);

    // Load asset if not already loaded
    if (!this.assetLoader.isAssetLoaded(object.assetId)) {
      this.assetLoader.loadAsset(object.assetId).then(asset => {
        // Update object with loaded asset data
        object.boundingBox = {
          min: [object.position[0] - 1, object.position[1] - 1, object.position[2] - 1],
          max: [object.position[0] + 1, object.position[1] + 1, object.position[2] + 1]
        };
      });
    }
  }

  /**
   * Remove render object
   */
  public removeObject(objectId: string): void {
    this.renderObjects.delete(objectId);
  }

  /**
   * Add light
   */
  public addLight(light: Light3D): void {
    this.lights.set(light.id, light);
  }

  /**
   * Remove light
   */
  public removeLight(lightId: string): void {
    this.lights.delete(lightId);
  }

  /**
   * Update camera
   */
  public updateCamera(camera: Partial<Camera3D>): void {
    this.camera = { ...this.camera, ...camera };
  }

  /**
   * Update environment
   */
  public updateEnvironment(environment: Partial<EnvironmentSettings>): void {
    this.environment = { ...this.environment, ...environment };
  }

  /**
   * Main render function
   */
  public render(): void {
    const startTime = performance.now();

    // Calculate dt
    if (this.lastFrameTime === 0) this.lastFrameTime = startTime;
    const dt = (startTime - this.lastFrameTime) / 1000;
    this.lastFrameTime = startTime;

    const gl = this.gl;

    // Reset stats
    this.stats.drawCalls = 0;
    this.stats.triangles = 0;
    this.stats.vertices = 0;
    this.stats.culledObjects = 0;

    // Update camera matrix
    this.updateCameraMatrices();

    // Apply seasonal atmosphere (Fog, Wind)
    this.applySeasonalAtmosphere();

    // Cull objects outside view frustum
    const visibleObjects = this.cullObjects();

    // Sort objects by distance for transparency
    visibleObjects.sort((a, b) => b.distance - a.distance);

    // Render to framebuffer for post-processing
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffers.get('main') || null);
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);

    // Clear buffers
    const skyColor = this.getSkyColor();
    gl.clearColor(skyColor[0], skyColor[1], skyColor[2], 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Render skybox
    this.renderSkybox();

    // Render opaque objects
    this.drawObjects(visibleObjects.filter(obj => this.isOpaque(obj)));

    // Render transparent objects
    this.drawObjects(visibleObjects.filter(obj => !this.isOpaque(obj)));

    // Render Shell-mapped Grass (Cozy Perfection)
    if (this.shellManager) {
      this.shellManager.render();
    }

    // Render Seasonal Particles
    if (this.particleSystem) {
      // Update particles
      const playerPos = this.getAsset('player')?.position || [0, 0, 0];
      this.particleSystem.update(dt, this.environment.season, this.environment.wind, playerPos as [number, number, number]);

      // Render particles
      this.particleSystem.render(this.viewMatrix, this.projectionMatrix, this.camera.position as [number, number, number], this.environment.season);
    }

    // Apply post-processing
    this.applyPostProcessing();

    // Update stats
    const frameTime = performance.now() - startTime;
    this.stats.frameTime = frameTime;
    this.stats.fps = 1000 / frameTime;
    this.frameCount++;
  }

  /**
   * Update camera matrices
   */
  private updateCameraMatrices(): void {
    const gl = this.gl;
    const program = this.shaderPrograms.get('pbr')!;

    gl.useProgram(program);

    // View matrix
    this.viewMatrix = this.createViewMatrix();
    const viewLocation = gl.getUniformLocation(program, 'uViewMatrix');
    gl.uniformMatrix4fv(viewLocation, false, this.viewMatrix);

    // Projection matrix
    this.projectionMatrix = this.createProjectionMatrix();
    const projectionLocation = gl.getUniformLocation(program, 'uProjectionMatrix');
    gl.uniformMatrix4fv(projectionLocation, false, this.projectionMatrix);

    // Camera position
    const cameraLocation = gl.getUniformLocation(program, 'uCameraPosition');
    gl.uniform3fv(cameraLocation, this.camera.position);
  }

  /**
   * Create view matrix
   */
  private createViewMatrix(): Float32Array {
    // Simplified view matrix creation
    // In production, use proper matrix library

    const [cx, cy, cz] = this.camera.position;
    const [rx, ry, rz] = this.camera.rotation;

    // Translation matrix (inverse)
    const translation = [
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      -cx, -cy, -cz, 1
    ];

    return new Float32Array(translation);
  }

  /**
   * Create projection matrix
   */
  private createProjectionMatrix(): Float32Array {
    const gl = this.gl;

    if (this.camera.type === 'perspective') {
      const fov = this.camera.fov * Math.PI / 180;
      const aspect = this.canvas.width / this.canvas.height;
      const near = this.camera.near;
      const far = this.camera.far;

      const f = 1.0 / Math.tan(fov / 2);
      const rangeInv = 1.0 / (near - far);

      return new Float32Array([
        f / aspect, 0, 0, 0,
        0, f, 0, 0,
        0, 0, (near + far) * rangeInv, -1,
        0, 0, near * far * rangeInv * 2, 0
      ]);
    } else {
      // Orthographic projection
      const left = -this.canvas.width / 2;
      const right = this.canvas.width / 2;
      const top = this.canvas.height / 2;
      const bottom = -this.canvas.height / 2;
      const near = this.camera.near;
      const far = this.camera.far;

      const tx = -(right + left) / (right - left);
      const ty = -(top + bottom) / (top - bottom);
      const tz = -far / (far - near);

      return new Float32Array([
        2 / (right - left), 0, 0, 0,
        0, 2 / (top - bottom), 0, 0,
        0, 0, -2 / (far - near), 0,
        tx, ty, tz, 1
      ]);
    }
  }

  /**
   * Frustum culling
   */
  private cullObjects(): RenderObject3D[] {
    const visible: RenderObject3D[] = [];

    for (const object of this.renderObjects.values()) {
      // Calculate distance to camera
      const dx = object.position[0] - this.camera.position[0];
      const dy = object.position[1] - this.camera.position[1];
      const dz = object.position[2] - this.camera.position[2];
      object.distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

      // Simple distance culling
      if (object.distance < this.camera.far) {
        // Update LOD level
        const asset = this.assetLoader.getAsset(object.assetId);
        if (asset) {
          const lod = this.assetLoader.getLODLevel(asset, object.distance);
          object.lodLevel = lod.level;
        }

        visible.push(object);
      } else {
        this.stats.culledObjects++;
      }
    }

    return visible;
  }

  /**
   * Render objects
   */
  private drawObjects(objects: RenderObject3D[]): void {
    const gl = this.gl;
    const program = this.shaderPrograms.get('pbr')!;

    gl.useProgram(program);

    // Set up lighting uniforms
    this.setupLighting(program);

    // Render each object
    for (const object of objects) {
      const asset = this.assetLoader.getAsset(object.assetId);
      if (!asset) continue;

      // Get appropriate LOD level
      const lod = this.assetLoader.getLODLevel(asset, object.distance);

      // Set up object uniforms
      this.setupObjectUniforms(program, object, asset);

      // Bind geometry
      this.bindGeometry(lod.geometry);

      // Draw
      gl.drawElements(gl.TRIANGLES, lod.polyCount * 3, gl.UNSIGNED_INT, 0);
      this.stats.drawCalls++;
      this.stats.triangles += lod.polyCount;
    }
  }

  /**
   * Get environment settings
   */
  public getEnvironment(): EnvironmentSettings {
    return this.environment;
  }

  /**
   * Render shell-mapped grass
   */
  public renderShells(objects: RenderObject3D[], totalShells: number, height: number): void {
    const gl = this.gl;
    const program = this.shaderPrograms.get('grass')!;

    gl.useProgram(program);

    // Global uniforms
    this.setupLighting(program);
    gl.uniform1f(gl.getUniformLocation(program, 'uTime'), performance.now() / 1000);
    gl.uniform1f(gl.getUniformLocation(program, 'uTotalShells'), totalShells);
    gl.uniform1f(gl.getUniformLocation(program, 'uShellHeight'), height);
    gl.uniform2fv(gl.getUniformLocation(program, 'uWindDirection'), this.environment.wind.direction);
    gl.uniform1f(gl.getUniformLocation(program, 'uWindStrength'), this.environment.wind.strength);

    // Player Interaction
    const player = this.getAsset('player');
    const playerPos = player ? player.position : [0, -1000, 0];
    gl.uniform3fv(gl.getUniformLocation(program, 'uPlayerPosition'), playerPos);

    // Aesthetic colors based on Season (Research-Backed)
    let baseColor = [0.15, 0.38, 0.12]; // Deep Rich Summer Green
    let tipColor = [0.45, 0.72, 0.25];  // Golden-Green Summer Tip

    switch (this.environment.season) {
      case 'spring':
        baseColor = [0.25, 0.48, 0.18]; // Fresh Green (Warmer)
        tipColor = [0.55, 0.82, 0.35];  // Yellow-Green Tip
        break;
      case 'summer':
        baseColor = [0.15, 0.38, 0.12]; // Deep Rich Green
        tipColor = [0.45, 0.72, 0.25];  // Golden-Green Tip
        break;
      case 'autumn':
        baseColor = [0.58, 0.42, 0.15]; // Warm Brown-Gold
        tipColor = [0.88, 0.65, 0.28];  // Bright Golden Tip
        break;
      case 'winter':
        baseColor = [0.85, 0.9, 0.95];  // Snowy White/Blue
        tipColor = [0.95, 0.98, 1.0];   // Pure Snow Tip
        break;
    }

    gl.uniform3fv(gl.getUniformLocation(program, 'uBaseColor'), baseColor);
    gl.uniform3fv(gl.getUniformLocation(program, 'uTipColor'), tipColor);

    for (const object of objects) {
      const asset = this.assetLoader.getAsset(object.assetId);
      if (!asset) continue;

      const lod = this.assetLoader.getLODLevel(asset, object.distance);
      this.setupObjectUniforms(program, object, asset);
      this.bindGeometry(lod.geometry);

      // Distance-based LOD: Reduce shell count for distant grass
      let shellsToRender = totalShells;
      if (object.distance > 100) {
        shellsToRender = Math.floor(totalShells / 4); // 8 shells for far distance
      } else if (object.distance > 50) {
        shellsToRender = Math.floor(totalShells / 2); // 16 shells for medium distance
      }

      // Culling: Skip rendering if too far
      if (object.distance > 200) continue;

      const shellIndexLoc = gl.getUniformLocation(program, 'uShellIndex');

      // Draw shells with LOD
      for (let i = 0; i < shellsToRender; i++) {
        // Normalize index to maintain proper height distribution even with fewer shells
        const normalizedIndex = i * (totalShells / shellsToRender);

        gl.uniform1f(shellIndexLoc, normalizedIndex);
        gl.drawElements(gl.TRIANGLES, lod.polyCount * 3, gl.UNSIGNED_INT, 0);
        this.stats.drawCalls++;
        this.stats.triangles += lod.polyCount;
      }
    }
  }

  /**
   * Set up lighting uniforms
   */
  private setupLighting(program: WebGLProgram): void {
    const gl = this.gl;

    // Ambient light
    const ambientLocation = gl.getUniformLocation(program, 'uAmbientColor');
    gl.uniform3fv(ambientLocation, this.getAmbientColor());

    const ambientIntensityLocation = gl.getUniformLocation(program, 'uAmbientIntensity');
    gl.uniform1f(ambientIntensityLocation, this.getAmbientIntensity());

    // Directional light (sun)
    const sunDirection = this.getSunDirection();
    const sunColor = this.getSunColor();
    const sunIntensity = this.getSunIntensity();

    const lightDirectionLocation = gl.getUniformLocation(program, 'uLightDirection');
    gl.uniform3fv(lightDirectionLocation, sunDirection);

    const lightColorLocation = gl.getUniformLocation(program, 'uLightColor');
    gl.uniform3fv(lightColorLocation, sunColor);

    const lightIntensityLocation = gl.getUniformLocation(program, 'uLightIntensity');
    gl.uniform1f(lightIntensityLocation, sunIntensity);

    // Fog
    const fogDensityLocation = gl.getUniformLocation(program, 'uFogDensity');
    // Increase fog density slightly for autumn/spring mornings if needed, but use env
    gl.uniform1f(fogDensityLocation, this.environment.fog.density);

    const fogColorLocation = gl.getUniformLocation(program, 'uFogColor');
    gl.uniform3fv(fogColorLocation, this.environment.fog.color);

    // Snow & Heat Haze Polish
    const snowFactorLocation = gl.getUniformLocation(program, 'uSnowFactor');
    const snowFactor = this.environment.season === 'winter' ? 0.8 : 0.0;
    gl.uniform1f(snowFactorLocation, snowFactor);

    const heatHazeLocation = gl.getUniformLocation(program, 'uHeatHaze');
    const heatHaze = (this.environment.season === 'summer' && this.environment.timeOfDay > 10 && this.environment.timeOfDay < 16) ? 0.5 : 0.0;
    gl.uniform1f(heatHazeLocation, heatHaze);

    const dewFactorLocation = gl.getUniformLocation(program, 'uDewFactor');
    const dewFactor = (this.environment.season === 'spring' && this.environment.timeOfDay < 9) ? 0.6 : 0.0;
    gl.uniform1f(dewFactorLocation, dewFactor);

    // Puddle Factor
    const puddleFactorLocation = gl.getUniformLocation(program, 'uPuddleFactor');
    const puddleFactor = (this.environment.season === 'spring' || this.environment.season === 'autumn') ? 0.4 : 0.0;
    gl.uniform1f(puddleFactorLocation, puddleFactor);

    // Aurora Intensity
    const auroraIntensityLocation = gl.getUniformLocation(program, 'uAuroraIntensity');
    let auroraIntensity = 0.0;
    if (this.environment.season === 'winter' && (this.environment.timeOfDay > 20 || this.environment.timeOfDay < 4)) {
      auroraIntensity = 1.0;
    }
    gl.uniform1f(auroraIntensityLocation, auroraIntensity);
  }

  /**
   * Set up object uniforms
   */
  private setupObjectUniforms(program: WebGLProgram, object: RenderObject3D, asset: LoadedAsset): void {
    const gl = this.gl;

    // Model matrix
    const modelMatrix = this.createModelMatrix(object);
    const modelLocation = gl.getUniformLocation(program, 'uModelMatrix');
    gl.uniformMatrix4fv(modelLocation, false, modelMatrix);

    // Wind Sway (Only for trees/foliage)
    const renderObject = object as any; // Type assertion if needed
    // Simple heuristic: if assetId contains 'tree' or 'bush'
    let sway = 0.0;
    if (object.assetId.includes('tree') || object.assetId.includes('bush') || object.assetId.includes('flower')) {
      sway = this.environment.wind.strength;
    }
    gl.uniform1f(gl.getUniformLocation(program, 'uWindSway'), sway);

    // SSS (Foliage glow)
    let sss = 0.0;
    if (object.assetId.includes('leaves') || object.assetId.includes('foliage') || object.assetId.includes('tree') || object.assetId.includes('bush') || object.assetId.includes('grass')) {
      sss = 0.5; // Medium glow
    }
    gl.uniform1f(gl.getUniformLocation(program, 'uSSSStrength'), sss);

    // Normal matrix
    const normalMatrix = this.createNormalMatrix(modelMatrix);
    const normalLocation = gl.getUniformLocation(program, 'uNormalMatrix');
    gl.uniformMatrix3fv(normalLocation, false, normalMatrix);

    // Material properties
    const material = asset.materials[0]; // Use first material
    const diffuseColorLocation = gl.getUniformLocation(program, 'uDiffuseColor');

    // Seasonal Foliage Tint logic
    let finalDiffuse = new Float32Array(material.diffuseColor);

    // Simple heuristic for foliage assets
    if (object.assetId.includes('leaves') || object.assetId.includes('foliage') || object.assetId.includes('tree') || object.assetId.includes('bush')) {
      if (this.environment.season === 'autumn') {
        // Mix towards orange [0.9, 0.5, 0.1, 1.0]
        finalDiffuse[0] = finalDiffuse[0] * 0.4 + 0.9 * 0.6;
        finalDiffuse[1] = finalDiffuse[1] * 0.4 + 0.5 * 0.6;
        finalDiffuse[2] = finalDiffuse[2] * 0.4 + 0.1 * 0.6;
      } else if (this.environment.season === 'winter') {
        // Snowy tint [0.9, 0.9, 1.0, 1.0]
        finalDiffuse[0] = finalDiffuse[0] * 0.3 + 0.9 * 0.7;
        finalDiffuse[1] = finalDiffuse[1] * 0.3 + 0.9 * 0.7;
        finalDiffuse[2] = finalDiffuse[2] * 0.3 + 1.0 * 0.7;
      } else if (this.environment.season === 'spring') {
        // Vibrant Green [0.4, 0.9, 0.4, 1.0]
        finalDiffuse[0] = finalDiffuse[0] * 0.7 + 0.4 * 0.3;
        finalDiffuse[1] = finalDiffuse[1] * 0.7 + 0.9 * 0.3;
        finalDiffuse[2] = finalDiffuse[2] * 0.7 + 0.4 * 0.3;
      }
    }

    gl.uniform4fv(diffuseColorLocation, finalDiffuse);

    const roughnessLocation = gl.getUniformLocation(program, 'uRoughness');
    gl.uniform1f(roughnessLocation, material.roughness);

    const metallicLocation = gl.getUniformLocation(program, 'uMetallic');
    gl.uniform1f(metallicLocation, material.metallic);

    // Animation time
    if (object.animation) {
      const timeLocation = gl.getUniformLocation(program, 'uTime');
      gl.uniform1f(timeLocation, object.animation.time);
    }
  }

  /**
   * Create model matrix
   */
  private createModelMatrix(object: RenderObject3D): Float32Array {
    // Simplified matrix creation
    // In production, use proper matrix library

    const [x, y, z] = object.position;
    const [rx, ry, rz] = object.rotation;
    const [sx, sy, sz] = object.scale;

    // Combined transformation matrix
    return new Float32Array([
      sx, 0, 0, 0,
      0, sy, 0, 0,
      0, 0, sz, 0,
      x, y, z, 1
    ]);
  }

  /**
   * Create normal matrix
   */
  private createNormalMatrix(modelMatrix: Float32Array): Float32Array {
    // Simplified normal matrix (3x3)
    return new Float32Array([
      modelMatrix[0], modelMatrix[1], modelMatrix[2],
      modelMatrix[4], modelMatrix[5], modelMatrix[6],
      modelMatrix[8], modelMatrix[9], modelMatrix[10]
    ]);
  }

  /**
   * Bind geometry buffers
   */
  private bindGeometry(geometry: ArrayBuffer): void {
    const gl = this.gl;

    // This would bind the actual vertex/index buffers
    // Simplified for this example
  }

  /**
   * Render skybox
   */
  private renderSkybox(): void {
    // Render skybox with time-based colors
  }

  /**
   * Apply post-processing effects
   */
  private applyPostProcessing(): void {
    const gl = this.gl;

    // Bind default framebuffer
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    // Apply each post-processing effect
    for (const effect of this.postProcessChain) {
      switch (effect) {
        case 'bloom':
          this.applyBloom();
          break;
        case 'toneMapping':
          this.applyToneMapping();
          break;
        case 'vignette':
          this.applyVignette();
          break;
        case 'tiltShift':
          this.applyTiltShift();
          break;
        case 'godRays':
          this.applyGodRays();
          break;
        case 'kuwahara':
          this.applyKuwahara();
          break;
      }
    }
  }

  /**
   * Get sky color based on time of day and season (Horizon Color)
   */
  private getSkyColor(): [number, number, number] {
    const hour = this.environment.timeOfDay;
    const season = this.environment.season;

    // Default to summer/day
    let color: [number, number, number] = [0.7, 0.8, 0.9];

    if (hour >= 6 && hour < 18) {
      // Day / Sunset
      const isSunset = hour >= 16 || hour < 8; // Simple sunset/sunrise window

      switch (season) {
        case 'spring':
          color = isSunset ? [0.95, 0.7, 0.6] : [0.95, 0.9, 0.85]; // Peachy / Creamy
          break;
        case 'summer':
          color = isSunset ? [1.0, 0.6, 0.4] : [0.7, 0.8, 0.9]; // Orange / Hazy Blue
          break;
        case 'autumn':
          color = isSunset ? [0.9, 0.5, 0.4] : [0.9, 0.85, 0.8]; // Deep Orange / Warm Gray
          break;
        case 'winter':
          color = isSunset ? [0.9, 0.6, 0.7] : [0.85, 0.88, 0.9]; // Pink-Purple / Pale Blue-Gray
          break;
      }
    } else {
      // Night
      switch (season) {
        case 'spring': color = [0.1, 0.1, 0.25]; break;
        case 'summer': color = [0.05, 0.05, 0.2]; break;
        case 'autumn': color = [0.1, 0.05, 0.15]; break;
        case 'winter': color = [0.05, 0.1, 0.2]; break;
      }
    }
    return color;
  }

  /**
   * Get ambient color based on Season
   */
  private getAmbientColor(): [number, number, number] {
    switch (this.environment.season) {
      case 'spring': return [0.98, 0.95, 0.85]; // Creamy butter yellow
      case 'summer': return [0.98, 0.92, 0.75]; // Golden yellow
      case 'autumn': return [0.95, 0.65, 0.35]; // Burnt orange
      case 'winter': return [0.9, 0.92, 0.95];  // Cool white
      default: return [0.8, 0.9, 1.0];
    }
  }

  /**
   * Get ambient intensity
   */
  private getAmbientIntensity(): number {
    return 0.4; // Slightly increased for coziness
  }

  /**
   * Get sun direction
   */
  private getSunDirection(): [number, number, number] {
    const hour = this.environment.timeOfDay;
    const angle = (hour / 24) * Math.PI * 2 - Math.PI / 2;

    return [Math.cos(angle), -0.5, Math.sin(angle)];
  }

  /**
   * Get sun color based on Season
   */
  private getSunColor(): [number, number, number] {
    const hour = this.environment.timeOfDay;

    if (hour >= 6 && hour < 18) {
      switch (this.environment.season) {
        case 'spring': return [1.0, 0.98, 0.9];   // Soft warm white
        case 'summer': return [1.0, 0.95, 0.8];   // Bright warm white
        case 'autumn': return [1.0, 0.6, 0.3];    // Deep orange (Golden Hour feel)
        case 'winter': return [1.0, 0.9, 0.85];   // Pale warm white
        default: return [1.0, 0.95, 0.8];
      }
    } else {
      return [0.2, 0.2, 0.3]; // Dim blue night
    }
  }

  /**
   * Get sun intensity based on Season
   */
  private getSunIntensity(): number {
    const hour = this.environment.timeOfDay;

    let intensity = 1.0;
    if (hour >= 6 && hour < 12) intensity = 0.8;
    else if (hour >= 12 && hour < 18) intensity = 1.0;
    else intensity = 0.1;

    // Seasonal modifier
    switch (this.environment.season) {
      case 'summer': intensity *= 1.2; break; // Intense sun
      case 'winter': intensity *= 0.8; break; // Weaker sun
      case 'autumn': intensity *= 0.9; break;
    }

    return intensity;
  }

  /**
   * Apply seasonal atmosphere (Fog, Wind)
   */
  private applySeasonalAtmosphere(): void {
    // We only update if not manually overridden by game logic recently?
    // For now, we enforce seasonal look.

    switch (this.environment.season) {
      case 'spring':
        this.environment.fog = { density: 0.01, color: [0.9, 0.92, 0.95], height: 50 };
        this.environment.wind.strength = 0.6;
        break;
      case 'summer':
        this.environment.fog = { density: 0.002, color: [0.8, 0.9, 1.0], height: 50 };
        this.environment.wind.strength = 1.0 + Math.sin(performance.now() / 2000) * 0.4; // Gusty
        break;
      case 'autumn':
        this.environment.fog = { density: 0.02, color: [0.85, 0.8, 0.75], height: 40 }; // Misty
        this.environment.wind.strength = 0.8;
        break;
      case 'winter':
        this.environment.fog = { density: 0.015, color: [0.9, 0.92, 0.98], height: 50 };
        this.environment.wind.strength = 0.5;
        break;
    }

    // Update Audio System
    if (this.audioSystem) {
      this.audioSystem.updateSeason(this.environment.season);
    }
  }

  /**
   * Check if object is opaque
   */
  private isOpaque(object: RenderObject3D): boolean {
    const asset = this.assetLoader.getAsset(object.assetId);
    if (!asset) return true;

    const material = asset.materials[0];
    return material.transparency >= 0.95;
  }

  /**
   * Apply bloom effect
   */
  private applyBloom(): void {
    const gl = this.gl;
    const program = this.shaderPrograms.get('post')!;
    gl.useProgram(program);
    gl.bindVertexArray(this.postProcessVAO);

    gl.uniform1i(gl.getUniformLocation(program, 'uEffect'), 1);
    gl.uniform1f(gl.getUniformLocation(program, 'uTime'), performance.now() / 1000);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.renderTexture);
    gl.uniform1i(gl.getUniformLocation(program, 'uScene'), 0);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  /**
   * Apply tone mapping
   */
  private applyToneMapping(): void {
    const gl = this.gl;
    const program = this.shaderPrograms.get('post')!;
    gl.useProgram(program);
    gl.bindVertexArray(this.postProcessVAO);

    gl.uniform1i(gl.getUniformLocation(program, 'uEffect'), 2);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.renderTexture); // Ideally we'd ping-pong but single pass for now
    gl.uniform1i(gl.getUniformLocation(program, 'uScene'), 0);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  /**
   * Apply vignette
   */
  private applyVignette(): void {
    const gl = this.gl;
    const program = this.shaderPrograms.get('post')!;
    gl.useProgram(program);
    gl.bindVertexArray(this.postProcessVAO);

    gl.uniform1i(gl.getUniformLocation(program, 'uEffect'), 3);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.renderTexture);
    gl.uniform1i(gl.getUniformLocation(program, 'uScene'), 0);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  /**
   * Get render statistics
   */
  public getStats(): RenderStats {
    return { ...this.stats };
  }

  /**
   * Get all render objects
   */
  public getRenderObjects(): RenderObject3D[] {
    return Array.from(this.renderObjects.values());
  }

  /**
   * Get specific render object
   */
  public getAsset(id: string): RenderObject3D | undefined {
    return this.renderObjects.get(id);
  }

  /**
   * Register shell manager
   */
  public setShellManager(manager: any): void {
    this.shellManager = manager;
  }

  /**
   * Resize renderer
   */
  public resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;

    const gl = this.gl;
    gl.viewport(0, 0, width, height);

    // Update render textures
    if (this.renderTexture) {
      gl.bindTexture(gl.TEXTURE_2D, this.renderTexture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    }

    if (this.depthTexture) {
      gl.bindTexture(gl.TEXTURE_2D, this.depthTexture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT24, width, height, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, null);
    }
  }

  /**
   * Apply tilt-shift
   */
  private applyTiltShift(): void {
    const gl = this.gl;
    const program = this.shaderPrograms.get('post')!;
    gl.useProgram(program);
    gl.bindVertexArray(this.postProcessVAO);
    gl.uniform1i(gl.getUniformLocation(program, 'uEffect'), 4);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.renderTexture);
    gl.uniform1i(gl.getUniformLocation(program, 'uScene'), 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  /**
   * Apply god rays
   */
  private applyGodRays(): void {
    const gl = this.gl;
    const program = this.shaderPrograms.get('post')!;
    gl.useProgram(program);
    gl.bindVertexArray(this.postProcessVAO);
    gl.uniform1i(gl.getUniformLocation(program, 'uEffect'), 5);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.renderTexture);
    gl.uniform1i(gl.getUniformLocation(program, 'uScene'), 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  /**
   * Apply kuwahara filter
   */
  private applyKuwahara(): void {
    const gl = this.gl;
    const program = this.shaderPrograms.get('post')!;
    gl.useProgram(program);
    gl.bindVertexArray(this.postProcessVAO);
    gl.uniform1i(gl.getUniformLocation(program, 'uEffect'), 6);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.renderTexture);
    gl.uniform1i(gl.getUniformLocation(program, 'uScene'), 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  /**
   * Dispose of renderer
   */
  public dispose(): void {
    const gl = this.gl;

    // Clean up shaders
    for (const program of this.shaderPrograms.values()) {
      gl.deleteProgram(program);
    }

    // Clean up textures
    for (const texture of this.textureCache.values()) {
      gl.deleteTexture(texture);
    }

    // Clean up framebuffers
    for (const framebuffer of this.framebuffers.values()) {
      gl.deleteFramebuffer(framebuffer);
    }

    // Clean up buffers
    for (const buffer of this.vertexBuffers.values()) {
      gl.deleteBuffer(buffer);
    }

    for (const buffer of this.indexBuffers.values()) {
      gl.deleteBuffer(buffer);
    }

    this.shaderPrograms.clear();
    this.textureCache.clear();
    this.framebuffers.clear();
    this.vertexBuffers.clear();
    this.indexBuffers.clear();
    this.renderObjects.clear();
    this.lights.clear();
  }
}
