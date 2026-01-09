/**
 * Advanced 3D Renderer for Cozy Haven
 * 
 * High-performance WebGL 2.0 renderer with PBR materials, 
 * dynamic lighting, LOD system, and advanced effects
 */

import { AssetLoader, LoadedAsset, LODLevel, PBRMaterial } from './AssetLoader';

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
  private camera: Camera3D;
  private environment: EnvironmentSettings;
  
  // WebGL resources
  private shaderPrograms: Map<string, WebGLProgram> = new Map();
  private vertexBuffers: Map<string, WebGLBuffer> = new Map();
  private indexBuffers: Map<string, WebGLBuffer> = new Map();
  private textureCache: Map<string, WebGLTexture> = new Map();
  private framebuffers: Map<string, WebGLFramebuffer> = new Map();
  
  // Rendering state
  private stats: RenderStats;
  private lastFrameTime: number = 0;
  private frameCount: number = 0;
  private maxDrawCalls: number = 1000;
  
  // Post-processing
  private postProcessChain: string[] = [];
  private renderTexture: WebGLTexture | null = null;
  private depthTexture: WebGLTexture | null = null;

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
    
    // Initialize shaders
    await this.initializeShaders();
    
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
      
      out vec3 vPosition;
      out vec3 vNormal;
      out vec2 vTexCoord;
      out vec3 vTangent;
      out vec3 vBitangent;
      out vec3 vViewPosition;
      
      void main() {
        vec4 position = vec4(aPosition, 1.0);
        vPosition = (uModelMatrix * position).xyz;
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
      
      uniform vec3 uCameraPosition;
      uniform float uTime;
      
      out vec4 fragColor;
      
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
        
        // Final lighting
        vec3 color = (diffuse + specular) * uLightColor * uLightIntensity * NoL;
        color += uAmbientColor * uAmbientIntensity * albedo;
        color += emissive;
        
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
    const skyboxVertexShader = `...`; // Skybox shader
    const skyboxFragmentShader = `...`; // Skybox shader
    const skyboxProgram = this.createShaderProgram(skyboxVertexShader, skyboxFragmentShader);
    this.shaderPrograms.set('skybox', skyboxProgram);
    
    const particleVertexShader = `...`; // Particle shader
    const particleFragmentShader = `...`; // Particle shader
    const particleProgram = this.createShaderProgram(particleVertexShader, particleFragmentShader);
    this.shaderPrograms.set('particle', particleProgram);
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
    this.postProcessChain = ['bloom', 'toneMapping', 'vignette'];
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
    const gl = this.gl;
    
    // Reset stats
    this.stats.drawCalls = 0;
    this.stats.triangles = 0;
    this.stats.vertices = 0;
    this.stats.culledObjects = 0;
    
    // Update camera matrix
    this.updateCameraMatrices();
    
    // Cull objects outside view frustum
    const visibleObjects = this.cullObjects();
    
    // Sort objects by distance for transparency
    visibleObjects.sort((a, b) => b.distance - a.distance);
    
    // Render to framebuffer for post-processing
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffers.get('main'));
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    
    // Clear buffers
    const skyColor = this.getSkyColor();
    gl.clearColor(skyColor[0], skyColor[1], skyColor[2], 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    
    // Render skybox
    this.renderSkybox();
    
    // Render opaque objects
    this.renderObjects(visibleObjects.filter(obj => this.isOpaque(obj)));
    
    // Render transparent objects
    this.renderObjects(visibleObjects.filter(obj => !this.isOpaque(obj)));
    
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
    const viewMatrix = this.createViewMatrix();
    const viewLocation = gl.getUniformLocation(program, 'uViewMatrix');
    gl.uniformMatrix4fv(viewLocation, false, viewMatrix);
    
    // Projection matrix
    const projectionMatrix = this.createProjectionMatrix();
    const projectionLocation = gl.getUniformLocation(program, 'uProjectionMatrix');
    gl.uniformMatrix4fv(projectionLocation, false, projectionMatrix);
    
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
  private renderObjects(objects: RenderObject3D[]): void {
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
    
    // Normal matrix
    const normalMatrix = this.createNormalMatrix(modelMatrix);
    const normalLocation = gl.getUniformLocation(program, 'uNormalMatrix');
    gl.uniformMatrix3fv(normalLocation, false, normalMatrix);
    
    // Material properties
    const material = asset.materials[0]; // Use first material
    const diffuseColorLocation = gl.getUniformLocation(program, 'uDiffuseColor');
    gl.uniform4fv(diffuseColorLocation, material.diffuseColor);
    
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
      }
    }
  }

  /**
   * Get sky color based on time of day
   */
  private getSkyColor(): [number, number, number] {
    const hour = this.environment.timeOfDay;
    
    if (hour >= 6 && hour < 12) {
      // Morning
      return [0.5, 0.7, 1.0]; // Light blue
    } else if (hour >= 12 && hour < 18) {
      // Afternoon
      return [0.3, 0.6, 1.0]; // Bright blue
    } else if (hour >= 18 && hour < 20) {
      // Evening
      return [1.0, 0.6, 0.4]; // Orange
    } else {
      // Night
      return [0.1, 0.1, 0.3]; // Dark blue
    }
  }

  /**
   * Get ambient color
   */
  private getAmbientColor(): [number, number, number] {
    return [0.8, 0.9, 1.0]; // Light gray-blue
  }

  /**
   * Get ambient intensity
   */
  private getAmbientIntensity(): number {
    return 0.3;
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
   * Get sun color
   */
  private getSunColor(): [number, number, number] {
    const hour = this.environment.timeOfDay;
    
    if (hour >= 6 && hour < 18) {
      return [1.0, 0.95, 0.8]; // Warm white
    } else {
      return [0.2, 0.2, 0.3]; // Dim blue
    }
  }

  /**
   * Get sun intensity
   */
  private getSunIntensity(): number {
    const hour = this.environment.timeOfDay;
    
    if (hour >= 6 && hour < 12) {
      return 0.8; // Morning
    } else if (hour >= 12 && hour < 18) {
      return 1.0; // Afternoon
    } else {
      return 0.1; // Night
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
    // Bloom post-processing implementation
  }

  /**
   * Apply tone mapping
   */
  private applyToneMapping(): void {
    // Tone mapping implementation
  }

  /**
   * Apply vignette
   */
  private applyVignette(): void {
    // Vignette implementation
  }

  /**
   * Get render statistics
   */
  public getStats(): RenderStats {
    return { ...this.stats };
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
