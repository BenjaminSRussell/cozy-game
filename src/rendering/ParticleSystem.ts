export interface ParticleConfig {
    maxParticles: number;
    textureId: string;
    sizeRange: [number, number];
    speedRange: [number, number];
    lifetimeRange: [number, number];
    color: [number, number, number, number];
    windInfluence: number;
    gravity: number;
    turbulence: number;
}

export class ParticleSystem {
    private gl: WebGL2RenderingContext;
    private program: WebGLProgram;
    private vao: WebGLVertexArrayObject;
    private particleBuffer: WebGLBuffer;

    // Particle state
    private positions: Float32Array;
    private velocities: Float32Array; // xyz + lifetime
    private properties: Float32Array; // size + rotation + opacity + type

    private activeParticles: number = 0;
    private maxParticles: number;

    // Seasonal configs
    private configs: Record<string, ParticleConfig> = {
        spring: { // Cherry Blossoms
            maxParticles: 150, // Reduced from 500
            textureId: 'petal',
            sizeRange: [0.1, 0.25],
            speedRange: [0.5, 1.5],
            lifetimeRange: [5.0, 10.0],
            color: [1.0, 0.75, 0.8, 1.0], // Pink
            windInfluence: 0.8,
            gravity: 0.2, // Gentle fall
            turbulence: 0.5
        },
        summer: { // Fireflies
            maxParticles: 40, // Reduced from 100
            textureId: 'glow',
            sizeRange: [0.1, 0.3],
            speedRange: [0.2, 0.8],
            lifetimeRange: [2.0, 5.0],
            color: [0.9, 1.0, 0.4, 0.8], // Yellow-Green
            windInfluence: 0.1,
            gravity: -0.1, // Float up slightly
            turbulence: 1.0
        },
        autumn: { // Falling Leaves
            maxParticles: 100, // Reduced from 400
            textureId: 'leaf',
            sizeRange: [0.2, 0.4],
            speedRange: [2.0, 4.0],
            lifetimeRange: [4.0, 8.0],
            color: [0.9, 0.5, 0.1, 1.0], // Orange
            windInfluence: 1.0,
            gravity: 0.8,
            turbulence: 2.0 // Tumbling
        },
        winter: { // Snow
            maxParticles: 400, // Reduced from 2000
            textureId: 'snowflake',
            sizeRange: [0.05, 0.1],
            speedRange: [1.0, 3.0],
            lifetimeRange: [5.0, 10.0],
            color: [1.0, 1.0, 1.0, 0.8],
            windInfluence: 0.5,
            gravity: 1.0,
            turbulence: 0.3
        }
    };

    constructor(gl: WebGL2RenderingContext) {
        this.gl = gl;
        this.maxParticles = 500; // Cap total active particles

        // Allocate arrays
        this.positions = new Float32Array(this.maxParticles * 3);
        this.velocities = new Float32Array(this.maxParticles * 4); // + lifetime
        this.properties = new Float32Array(this.maxParticles * 4); // size, rot, opacity, type

        this.program = gl.createProgram()!;
        this.vao = gl.createVertexArray()!;
        this.particleBuffer = gl.createBuffer()!;

        this.initShaders();
        this.initBuffers();
    }

    private initShaders(): void {
        const gl = this.gl;

        const vertexShaderSrc = `#version 300 es
      layout(location = 0) in vec3 aPosition;
      layout(location = 1) in vec4 aProperties; // size, rot, opacity, type
      
      uniform mat4 uViewMatrix;
      uniform mat4 uProjectionMatrix;
      uniform vec3 uCameraRight;
      uniform vec3 uCameraUp;
      
      out float vOpacity;
      out vec2 vTexCoord;
      out vec4 vColor; // Passed based on type? Or uniform?
      
      // Quad vertex offsets
      const vec2 offsets[4] = vec2[](
        vec2(-0.5, -0.5),
        vec2( 0.5, -0.5),
        vec2(-0.5,  0.5),
        vec2( 0.5,  0.5)
      );

      void main() {
        // Billboard logic
        // We use gl_VertexID to determine corner of the quad
        int cornerID = gl_VertexID % 4;
        vec2 offset = offsets[cornerID];
        
        vec3 centerPos = aPosition;
        float size = aProperties.x;
        float rotation = aProperties.y;
        vOpacity = aProperties.z;
        
        // Rotate offset
        float c = cos(rotation);
        float s = sin(rotation);
        vec2 rotatedOffset = vec2(
          offset.x * c - offset.y * s,
          offset.x * s + offset.y * c
        ) * size;
        
        vec3 worldPos = centerPos 
          + uCameraRight * rotatedOffset.x 
          + uCameraUp * rotatedOffset.y;
          
        gl_Position = uProjectionMatrix * uViewMatrix * vec4(worldPos, 1.0);
        vTexCoord = offset + 0.5; // Map -0.5..0.5 to 0..1
      }
    `;

        const fragmentShaderSrc = `#version 300 es
      precision highp float;
      
      in float vOpacity;
      in vec2 vTexCoord;
      
      uniform vec4 uBaseColor;
      
      out vec4 FragColor;
      
      void main() {
        // Simple circular particle for now (procedural texture)
        vec2 center = vTexCoord - 0.5;
        float dist = length(center);
        float alpha = 1.0 - smoothstep(0.4, 0.5, dist);
        
        vec4 color = uBaseColor;
        color.a *= alpha * vOpacity;
        
        if (color.a < 0.01) discard;
        
        FragColor = color;
      }
    `;

        // Simple shader compilation (reuse existing util if possible, but standalone here for clarity)
        const vs = this.compileShader(gl.VERTEX_SHADER, vertexShaderSrc);
        const fs = this.compileShader(gl.FRAGMENT_SHADER, fragmentShaderSrc);

        gl.attachShader(this.program, vs);
        gl.attachShader(this.program, fs);
        gl.linkProgram(this.program);

        if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
            console.error('Particle shader link error:', gl.getProgramInfoLog(this.program));
        }
    }

    private compileShader(type: number, source: string): WebGLShader {
        const gl = this.gl;
        const shader = gl.createShader(type)!;
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error('Particle shader compile error:', gl.getShaderInfoLog(shader));
        }
        return shader;
    }

    private initBuffers(): void {
        const gl = this.gl;
        gl.bindVertexArray(this.vao);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.particleBuffer);
        // Reserve space
        gl.bufferData(gl.ARRAY_BUFFER, this.maxParticles * 7 * 4, gl.DYNAMIC_DRAW);
        // 3 floats pos + 4 floats props = 7 floats per particle

        // Attribs: 0: Position, 1: Properties
        // Instancing not strictly needed if we expand vertex shader to use gl_InstanceID,
        // but here we are using a geometry shader-less approach expanding vertices in shader?
        // Actually, simple point sprites or instancing is better. 
        // Let's use Instanced Arrays.

        // Re-do to proper instancing:
        // Attributes:
        // 0: Position (Instanced)
        // 1: Properties (Instanced)

        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 7 * 4, 0);
        gl.vertexAttribDivisor(0, 1);

        gl.enableVertexAttribArray(1);
        gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 7 * 4, 3 * 4);
        gl.vertexAttribDivisor(1, 1);
    }

    public setSeason(season: string): void {
        const config = this.configs[season];
        if (config) {
            // Logic to spawn particles based on season
            // For now, just reset if season changes drastically
        }
    }

    public update(dt: number, season: string, wind: { direction: [number, number], strength: number }, playerPos: [number, number, number]): void {
        const config = this.configs[season] || this.configs['summer'];
        const targetCount = config.maxParticles;

        // Spawn new particles
        if (this.activeParticles < targetCount) {
            const spawnCount = Math.min(10, targetCount - this.activeParticles);
            for (let i = 0; i < spawnCount; i++) {
                this.spawnParticle(config, playerPos);
            }
        }

        // Update existing
        let activeCount = 0;
        for (let i = 0; i < this.activeParticles; i++) {
            // Decrement lifetime stored in velocity.w (hacky but saves space)
            this.velocities[i * 4 + 3] -= dt;

            if (this.velocities[i * 4 + 3] > 0) {
                // Alive
                // Move
                this.positions[i * 3 + 0] += this.velocities[i * 4 + 0] * dt;
                this.positions[i * 3 + 1] += this.velocities[i * 4 + 1] * dt;
                this.positions[i * 3 + 2] += this.velocities[i * 4 + 2] * dt;

                // Apply Wind
                this.positions[i * 3 + 0] += wind.direction[0] * wind.strength * config.windInfluence * dt;
                this.positions[i * 3 + 2] += wind.direction[1] * wind.strength * config.windInfluence * dt;

                // Gravity
                this.positions[i * 3 + 1] -= config.gravity * dt;

                // Wrap around player? Or simply respawn if too far/dead
                const dx = this.positions[i * 3 + 0] - playerPos[0];
                const dy = this.positions[i * 3 + 1] - playerPos[1];
                const dz = this.positions[i * 3 + 2] - playerPos[2];

                // Simple floor collision / respawn
                if (this.positions[i * 3 + 1] < 0) {
                    this.velocities[i * 4 + 3] = -1; // Kill
                }

                // Copy to compacted array if needed, but for now simple swap-remove is standard
                // Keeping it simple: just update buffer with whatever is active at start of array
                if (this.velocities[i * 4 + 3] > 0) {
                    // Keep
                    if (i !== activeCount) {
                        // Move to active slot
                        this.positions[activeCount * 3 + 0] = this.positions[i * 3 + 0];
                        this.positions[activeCount * 3 + 1] = this.positions[i * 3 + 1];
                        this.positions[activeCount * 3 + 2] = this.positions[i * 3 + 2];

                        this.velocities[activeCount * 4 + 0] = this.velocities[i * 4 + 0];
                        this.velocities[activeCount * 4 + 1] = this.velocities[i * 4 + 1];
                        this.velocities[activeCount * 4 + 2] = this.velocities[i * 4 + 2];
                        this.velocities[activeCount * 4 + 3] = this.velocities[i * 4 + 3];

                        this.properties[activeCount * 4 + 0] = this.properties[i * 4 + 0];
                        this.properties[activeCount * 4 + 1] = this.properties[i * 4 + 1];
                        this.properties[activeCount * 4 + 2] = this.properties[i * 4 + 2];
                        this.properties[activeCount * 4 + 3] = this.properties[i * 4 + 3];
                    }
                    activeCount++;
                }
            }
        }
        this.activeParticles = activeCount;

        // Upload to GPU
        const gl = this.gl;
        gl.bindBuffer(gl.ARRAY_BUFFER, this.particleBuffer);

        // Interleave data (manual manual)
        // Actually maintaining separate arrays and interleaving for upload is better
        const bufferData = new Float32Array(this.activeParticles * 7);
        for (let i = 0; i < this.activeParticles; i++) {
            bufferData[i * 7 + 0] = this.positions[i * 3 + 0];
            bufferData[i * 7 + 1] = this.positions[i * 3 + 1];
            bufferData[i * 7 + 2] = this.positions[i * 3 + 2];
            bufferData[i * 7 + 3] = this.properties[i * 4 + 0]; // Size
            bufferData[i * 7 + 4] = this.properties[i * 4 + 1]; // Rot
            bufferData[i * 7 + 5] = this.properties[i * 4 + 2]; // Opacity
            bufferData[i * 7 + 6] = 0; // Type placeholder
        }
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, bufferData);
    }

    private spawnParticle(config: ParticleConfig, origin: [number, number, number]): void {
        const idx = this.activeParticles;
        if (idx >= this.maxParticles) return;

        // Random offset around player
        const range = 20;
        const x = origin[0] + (Math.random() - 0.5) * range;
        const z = origin[2] + (Math.random() - 0.5) * range;
        const y = origin[1] + 5 + Math.random() * 5; // Start high up

        this.positions[idx * 3 + 0] = x;
        this.positions[idx * 3 + 1] = y;
        this.positions[idx * 3 + 2] = z;

        // Velocity
        this.velocities[idx * 4 + 0] = (Math.random() - 0.5) * config.turbulence;
        this.velocities[idx * 4 + 1] = -1 * (config.speedRange[0] + Math.random() * (config.speedRange[1] - config.speedRange[0]));
        this.velocities[idx * 4 + 2] = (Math.random() - 0.5) * config.turbulence;
        this.velocities[idx * 4 + 3] = config.lifetimeRange[0] + Math.random() * (config.lifetimeRange[1] - config.lifetimeRange[0]);

        // Props
        this.properties[idx * 4 + 0] = config.sizeRange[0] + Math.random() * (config.sizeRange[1] - config.sizeRange[0]); // Size
        this.properties[idx * 4 + 1] = Math.random() * Math.PI * 2; // Rotation
        this.properties[idx * 4 + 2] = 1.0; // Opacity

        this.activeParticles++;
    }

    public render(viewMatrix: Float32Array, projectionMatrix: Float32Array, cameraPos: [number, number, number], season: string): void {
        const gl = this.gl;
        if (this.activeParticles === 0) return;

        gl.useProgram(this.program);
        gl.bindVertexArray(this.vao);

        // Uniforms
        gl.uniformMatrix4fv(gl.getUniformLocation(this.program, 'uViewMatrix'), false, viewMatrix);
        gl.uniformMatrix4fv(gl.getUniformLocation(this.program, 'uProjectionMatrix'), false, projectionMatrix);

        // Camera vectors for billboard
        // Extract right/up from view matrix (inverse view actually needed, or just transpose of rotation part if orthogonal)
        // Assuming standard view matrix:
        // Right = row 0, Up = row 1
        // Actually, View Matrix turns World -> Camera.
        // Inverse View turns Camera -> World.
        // The camera Right/Up in World space correspond to the first two columns of the Inverse View Matrix
        // OR first two rows of View Matrix (if rotation only, ignoring position).

        // Simple billboard:
        // Right = [view[0], view[4], view[8]]
        // Up = [view[1], view[5], view[9]]
        gl.uniform3f(gl.getUniformLocation(this.program, 'uCameraRight'), viewMatrix[0], viewMatrix[4], viewMatrix[8]);
        gl.uniform3f(gl.getUniformLocation(this.program, 'uCameraUp'), viewMatrix[1], viewMatrix[5], viewMatrix[9]);

        // Season color
        const config = this.configs[season] || this.configs['summer'];
        gl.uniform4fv(gl.getUniformLocation(this.program, 'uBaseColor'), config.color);

        // Draw instanced
        // 4 ints for quad logic in shader 
        // We draw 4 vertices * activeParticles instances
        gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, this.activeParticles);
    }
}
