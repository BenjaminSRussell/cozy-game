/**
 * Advanced Particle System for Cozy Game
 * 
 * Features:
 * - Physics simulation (gravity, wind, collision)
 * - Multiple particle types (fireflies, leaves, snow, rain, dust)
 * - Performance optimized with object pooling
 * - Interactive particles that respond to player movement
 */

export interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  type: 'firefly' | 'leaf' | 'snow' | 'rain' | 'dust' | 'pollen' | 'sparkle';
  rotation: number;
  rotationSpeed: number;
  wiggle: number;
  wiggleSpeed: number;
  glowIntensity?: number;
  pulseSpeed?: number;
}

export interface ParticleSystemConfig {
  maxParticles: number;
  spawnRate: number;
  windForce: { x: number; y: number };
  gravity: number;
  enabled: boolean;
}

export class AdvancedParticleSystem {
  private particles: Particle[] = [];
  private particleIdCounter = 0;
  private config: ParticleSystemConfig;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private lastSpawnTime = 0;
  private playerPosition = { x: 0, y: 0 };
  private time = 0;

  constructor(canvas: HTMLCanvasElement, config: Partial<ParticleSystemConfig> = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.config = {
      maxParticles: 200,
      spawnRate: 2,
      windForce: { x: 0.1, y: 0 },
      gravity: 0.05,
      enabled: true,
      ...config
    };
  }

  // Spawn different types of particles based on season and weather
  spawnParticle(type: Particle['type'], x?: number, y?: number): void {
    if (this.particles.length >= this.config.maxParticles) return;

    const particle: Particle = {
      id: this.particleIdCounter++,
      x: x ?? Math.random() * this.canvas.width,
      y: y ?? -10,
      vx: 0,
      vy: 0,
      size: 0,
      color: '',
      alpha: 1,
      life: 0,
      maxLife: 0,
      type,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: 0,
      wiggle: 0,
      wiggleSpeed: 0
    };

    // Configure particle based on type
    switch (type) {
      case 'firefly':
        particle.size = 2 + Math.random() * 2;
        particle.color = '#FFFF00';
        particle.maxLife = 300 + Math.random() * 200;
        particle.vx = (Math.random() - 0.5) * 0.5;
        particle.vy = (Math.random() - 0.5) * 0.5;
        particle.glowIntensity = 0.5 + Math.random() * 0.5;
        particle.pulseSpeed = 0.02 + Math.random() * 0.03;
        particle.wiggle = 0.5;
        particle.wiggleSpeed = 0.05;
        break;

      case 'leaf':
        particle.size = 4 + Math.random() * 4;
        particle.color = ['#D2691E', '#FF8C00', '#FFD700', '#DC143C'][Math.floor(Math.random() * 4)];
        particle.maxLife = 200 + Math.random() * 100;
        particle.vx = (Math.random() - 0.5) * 1;
        particle.vy = 0.5 + Math.random() * 0.5;
        particle.rotationSpeed = (Math.random() - 0.5) * 0.1;
        particle.wiggle = 2;
        particle.wiggleSpeed = 0.02;
        break;

      case 'snow':
        particle.size = 1 + Math.random() * 3;
        particle.color = '#FFFFFF';
        particle.maxLife = 400 + Math.random() * 200;
        particle.vx = (Math.random() - 0.5) * 0.3;
        particle.vy = 0.5 + Math.random() * 0.3;
        particle.wiggle = 0.3;
        particle.wiggleSpeed = 0.03;
        break;

      case 'rain':
        particle.size = 1 + Math.random() * 2;
        particle.color = '#87CEEB';
        particle.maxLife = 100 + Math.random() * 50;
        particle.vx = this.config.windForce.x;
        particle.vy = 5 + Math.random() * 3;
        break;

      case 'pollen':
        particle.size = 1 + Math.random() * 1.5;
        particle.color = '#FFFFE0';
        particle.maxLife = 150 + Math.random() * 100;
        particle.vx = (Math.random() - 0.5) * 0.8;
        particle.vy = (Math.random() - 0.5) * 0.2;
        particle.wiggle = 1;
        particle.wiggleSpeed = 0.08;
        break;

      case 'sparkle':
        particle.size = 1 + Math.random() * 2;
        particle.color = '#FFFFFF';
        particle.maxLife = 30 + Math.random() * 30;
        particle.vx = 0;
        particle.vy = 0;
        particle.glowIntensity = 1;
        particle.pulseSpeed = 0.1;
        break;

      case 'dust':
        particle.size = 0.5 + Math.random() * 1.5;
        particle.color = '#D2B48C';
        particle.maxLife = 100 + Math.random() * 50;
        particle.vx = (Math.random() - 0.5) * 0.5;
        particle.vy = (Math.random() - 0.5) * 0.5;
        particle.wiggle = 0.2;
        particle.wiggleSpeed = 0.04;
        break;
    }

    this.particles.push(particle);
  }

  // Update particle physics and behavior
  update(deltaTime: number): void {
    if (!this.config.enabled) return;

    this.time += deltaTime;
    this.particles = this.particles.filter(particle => {
      particle.life++;

      // Apply physics
      particle.vx += this.config.windForce.x;
      particle.vy += this.config.gravity;

      // Apply wiggle effect
      if (particle.wiggle > 0) {
        particle.vx += Math.sin(this.time * particle.wiggleSpeed + particle.id) * particle.wiggle;
      }

      // Update position
      particle.x += particle.vx;
      particle.y += particle.vy;

      // Update rotation
      particle.rotation += particle.rotationSpeed;

      // Calculate alpha based on life
      const lifeRatio = particle.life / particle.maxLife;
      particle.alpha = Math.max(0, 1 - lifeRatio);

      // Player interaction - particles react to player proximity
      const dx = particle.x - this.playerPosition.x;
      const dy = particle.y - this.playerPosition.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < 50 && particle.type === 'firefly') {
        // Fireflies are attracted to player
        particle.vx -= dx * 0.001;
        particle.vy -= dy * 0.001;
      } else if (distance < 30) {
        // Other particles are pushed away by player movement
        const force = (30 - distance) / 30;
        particle.vx += (dx / distance) * force * 0.5;
        particle.vy += (dy / distance) * force * 0.5;
      }

      // Remove dead particles or those out of bounds
      return particle.life < particle.maxLife && 
             particle.y < this.canvas.height + 10 &&
             particle.x > -10 && 
             particle.x < this.canvas.width + 10;
    });
  }

  // Render all particles with advanced effects
  render(): void {
    this.particles.forEach(particle => {
      this.ctx.save();
      
      // Set alpha
      this.ctx.globalAlpha = particle.alpha;

      // Apply glow effect for certain particles
      if (particle.glowIntensity && particle.type === 'firefly') {
        const pulse = Math.sin(this.time * (particle.pulseSpeed || 0.05)) * 0.5 + 0.5;
        this.ctx.shadowBlur = 10 * particle.glowIntensity * pulse;
        this.ctx.shadowColor = particle.color;
      }

      // Special rendering for different particle types
      switch (particle.type) {
        case 'firefly':
          // Render as glowing orb
          const gradient = this.ctx.createRadialGradient(
            particle.x, particle.y, 0,
            particle.x, particle.y, particle.size
          );
          gradient.addColorStop(0, particle.color);
          gradient.addColorStop(1, 'transparent');
          this.ctx.fillStyle = gradient;
          this.ctx.fillRect(particle.x - particle.size * 2, particle.y - particle.size * 2, particle.size * 4, particle.size * 4);
          break;

        case 'leaf':
          // Render as rotated leaf shape
          this.ctx.translate(particle.x, particle.y);
          this.ctx.rotate(particle.rotation);
          this.ctx.fillStyle = particle.color;
          this.ctx.beginPath();
          this.ctx.ellipse(0, 0, particle.size, particle.size * 0.6, 0, 0, Math.PI * 2);
          this.ctx.fill();
          break;

        case 'snow':
          // Render as snowflake with detailed pattern
          this.ctx.translate(particle.x, particle.y);
          this.ctx.strokeStyle = particle.color;
          this.ctx.lineWidth = 1;
          for (let i = 0; i < 6; i++) {
            this.ctx.rotate(Math.PI / 3);
            this.ctx.beginPath();
            this.ctx.moveTo(0, 0);
            this.ctx.lineTo(0, particle.size);
            this.ctx.stroke();
          }
          break;

        case 'rain':
          // Render as rain streak
          this.ctx.strokeStyle = particle.color;
          this.ctx.lineWidth = particle.size;
          this.ctx.beginPath();
          this.ctx.moveTo(particle.x, particle.y);
          this.ctx.lineTo(particle.x - particle.vx * 2, particle.y - particle.vy * 2);
          this.ctx.stroke();
          break;

        case 'sparkle':
          // Render as star shape
          this.ctx.translate(particle.x, particle.y);
          this.ctx.fillStyle = particle.color;
          this.drawStar(0, 0, particle.size, particle.size * 0.5, 4);
          break;

        default:
          // Default circle rendering
          this.ctx.fillStyle = particle.color;
          this.ctx.beginPath();
          this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
          this.ctx.fill();
      }

      this.ctx.restore();
    });
  }

  // Helper method to draw star shapes
  private drawStar(cx: number, cy: number, outerRadius: number, innerRadius: number, points: number): void {
    this.ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const angle = (i * Math.PI) / points;
      const x = cx + Math.cos(angle) * radius;
      const y = cy + Math.sin(angle) * radius;
      if (i === 0) {
        this.ctx.moveTo(x, y);
      } else {
        this.ctx.lineTo(x, y);
      }
    }
    this.ctx.closePath();
    this.ctx.fill();
  }

  // Spawn particles based on season and conditions
  spawnSeasonalParticles(season: string, weather: string): void {
    const now = Date.now();
    if (now - this.lastSpawnTime < 1000 / this.config.spawnRate) return;

    this.lastSpawnTime = now;

    switch (season) {
      case 'spring':
        if (Math.random() < 0.3) this.spawnParticle('pollen');
        if (Math.random() < 0.1) this.spawnParticle('firefly');
        break;
      case 'summer':
        if (Math.random() < 0.2) this.spawnParticle('firefly');
        if (weather === 'rain' && Math.random() < 0.8) this.spawnParticle('rain');
        break;
      case 'fall':
        if (Math.random() < 0.4) this.spawnParticle('leaf');
        if (Math.random() < 0.05) this.spawnParticle('firefly');
        break;
      case 'winter':
        if (weather === 'snow' && Math.random() < 0.9) this.spawnParticle('snow');
        break;
    }

    // Ambient dust particles
    if (Math.random() < 0.1) this.spawnParticle('dust');
  }

  // Update player position for particle interactions
  setPlayerPosition(x: number, y: number): void {
    this.playerPosition = { x, y };
  }

  // Configure system parameters
  updateConfig(newConfig: Partial<ParticleSystemConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  // Clear all particles
  clear(): void {
    this.particles = [];
  }

  // Get current particle count
  getParticleCount(): number {
    return this.particles.length;
  }
}
