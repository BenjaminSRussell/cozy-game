/**
 * Cozy Wind System
 * 
 * Manages the global wind field and ambient particles.
 * Creates a soothing, wave-like wind effect for crops and trees.
 */

export interface WindVector {
    x: number;
    y: number;
    strength: number; // 0.0 to 1.0
}

export interface WindParticle {
    id: number;
    x: number;
    y: number;
    z: number;
    vx: number;
    vy: number;
    vz: number;
    life: number;
    maxLife: number;
    type: 'dandelion' | 'leaf' | 'pollen' | 'exhaust';
    scale: number;
    rotation: number;
    rotationSpeed: number;
}

export class WindSystem {
    private static instance: WindSystem;
    private time: number = 0;
    private particles: WindParticle[] = [];
    private particleIdCounter: number = 0;

    // Configuration
    private readonly baseSpeed = 0.5;
    private readonly gustFrequency = 0.05;
    private readonly waveLength = 0.1;
    private readonly maxParticles = 25; // Significant reduction from 100

    private constructor() { }

    static getInstance(): WindSystem {
        if (!this.instance) {
            this.instance = new WindSystem();
        }
        return this.instance;
    }

    /**
     * Update the wind system state
     * @param dt Delta time in seconds
     */
    /**
     * Scan for and update particles
     */
    update(dt: number): void {
        this.time += dt;

        // Manage particles
        this.updateParticles(dt);
        this.spawnParticles(dt);
    }

    /**
     * Manually add a particle (e.g. from vehicle exhaust)
     */
    addParticle(particle: Omit<WindParticle, 'id'>): void {
        this.particles.push({
            ...particle,
            id: this.particleIdCounter++
        });
    }

    /**
     * Calculate wind vector at a specific world position
     */
    getWindAt(x: number, y: number): WindVector {
        // Primary wave (Main direction: South-West to North-East roughly)
        // We use time and position to create a moving wave front
        const t = this.time;

        // Wave 1: The "Breath" (Very Slow, large waves) - Freq 0.5 -> 0.2
        const w1 = Math.sin(t * 0.2 + x * 0.05 + y * 0.05);

        // Wave 2: The "Gust" (Gentle ripples) - Freq 1.5 -> 0.4
        const w2 = Math.sin(t * 0.4 + x * 0.1) * Math.cos(t * 0.3 + y * 0.1) * 0.3;

        // Wave 3: Turbulence (Subtle noise) - Freq 3.0 -> 0.8
        const w3 = Math.sin(t * 0.8 + x * 0.2 + y * 0.2) * 0.1;

        // Combine waves
        const combined = (w1 + w2 + w3) / 1.4;

        // Map to 0-1 range
        // Using a gentler power curve (1.5 instead of 2) to avoid sharp drop-offs
        const strength = (combined + 1) / 2;
        const gustStrength = Math.pow(strength, 1.5);

        return {
            x: 0.8 * gustStrength, // Slower max horizontal speed
            y: 0.4 * gustStrength, // Slower max vertical speed
            strength: gustStrength
        };
    }

    /**
     * Get all active particles for rendering
     */
    getParticles(): WindParticle[] {
        return this.particles;
    }

    private updateParticles(dt: number): void {
        const worldBounds = { minX: -10, maxX: 40, minY: -10, maxY: 40 }; // Rough demo bounds

        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.life -= dt;

            // Get local wind force
            const wind = this.getWindAt(p.x, p.y);

            // Physics
            // Gentler drag
            p.vx += (wind.x * 0.8 - p.vx) * dt;
            p.vy += (wind.y * 0.8 - p.vy) * dt;

            // Gravity / Lift (Slower float)
            const lift = Math.sin(this.time * 0.5 + p.id) * 0.2;
            p.vz += (lift - p.vz) * dt;

            // Move
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.z += p.vz * dt;

            // Rotation (Slower spin)
            p.rotation += (p.rotationSpeed * 0.3) * dt;

            // Kill if out of bounds or dead
            if (p.life <= 0 ||
                p.x > worldBounds.maxX || p.y > worldBounds.maxY ||
                p.z < 0) {
                this.particles.splice(i, 1);
            }
        }
    }

    private spawnParticles(dt: number): void {
        if (this.particles.length >= this.maxParticles) return;

        // Spawn rate based on wind strength (roughly)
        const spawnChance = 0.1; // 10% chance per frame? Too high if dt is variable.
        // Spawn rate: average 1 particle every 2 seconds
        if (Math.random() < 0.5 * dt) {
            this.spawnParticle();
        }
    }

    private spawnParticle(): void {
        // Spawn upwind (top-left of map roughly)
        const startX = Math.random() * 30;
        const startY = Math.random() * 30;
        const startZ = 2 + Math.random() * 3; // Start high up

        // Randomize type
        const rand = Math.random();
        let type: 'dandelion' | 'leaf' | 'pollen' = 'pollen';
        if (rand > 0.8) type = 'leaf';
        else if (rand > 0.5) type = 'dandelion';

        this.particles.push({
            id: this.particleIdCounter++,
            x: startX - 10, // Start off-screen
            y: startY - 10,
            z: startZ,
            vx: 1.0, // Initial push
            vy: 0.5,
            vz: 0,
            life: 10 + Math.random() * 5,
            maxLife: 15,
            type: type,
            scale: 0.5 + Math.random() * 0.5,
            rotation: Math.random() * Math.PI * 2,
            rotationSpeed: (Math.random() - 0.5) * 2
        });
    }
}
