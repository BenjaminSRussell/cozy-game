/**
 * Advanced Crop Growth System with Personality Animations
 * 
 * Features:
 * - 5 distinct growth stages with unique visuals
 * - Personality animations (swaying, bouncing, glowing)
 * - Health-based visual feedback
 * - Water level animations
 * - Interactive particle effects
 * - Seasonal growth variations
 */

export interface CropPersonality {
  type: 'calm' | 'energetic' | 'shy' | 'proud' | 'playful';
  swayAmount: number;
  bounceHeight: number;
  glowIntensity: number;
  animationSpeed: number;
  specialEffects: string[];
}

export interface CropGrowthStage {
  name: string;
  days: number;
  size: number;
  color: string;
  animations: {
    idle: string;
    growing: string;
    watered: string;
    harvestable: string;
  };
  particles: string[];
}

export class AdvancedCropSystem {
  private cropPersonalities: Map<string, CropPersonality> = new Map();
  private growthStages: Map<string, CropGrowthStage[]> = new Map();

  constructor() {
    this.initializeCropPersonalities();
    this.initializeGrowthStages();
  }

  private initializeCropPersonalities(): void {
    // Define personality traits for each crop type
    this.cropPersonalities.set('wheat', {
      type: 'calm',
      swayAmount: 0.3,
      bounceHeight: 2,
      glowIntensity: 0.2,
      animationSpeed: 0.02,
      specialEffects: ['gentle_sway', 'wind_response']
    });

    this.cropPersonalities.set('carrot', {
      type: 'shy',
      swayAmount: 0.1,
      bounceHeight: 1,
      glowIntensity: 0.4,
      animationSpeed: 0.015,
      specialEffects: ['peek_animation', 'growth_spurt']
    });

    this.cropPersonalities.set('tomato', {
      type: 'proud',
      swayAmount: 0.2,
      bounceHeight: 3,
      glowIntensity: 0.6,
      animationSpeed: 0.025,
      specialEffects: ['ripe_glow', 'weight_bounce']
    });

    this.cropPersonalities.set('corn', {
      type: 'energetic',
      swayAmount: 0.2,
      bounceHeight: 4,
      glowIntensity: 0.3,
      animationSpeed: 0.025,
      specialEffects: ['dramatic_sway', 'height_growth']
    });
  }

  private initializeGrowthStages(): void {
    // Wheat growth stages
    this.growthStages.set('wheat', [
      {
        name: 'seed',
        days: 0.3,
        size: 0.2,
        color: '#D2691E',
        animations: {
          idle: 'gentle_bob',
          growing: 'sprout_tremble',
          watered: 'seed_glow',
          harvestable: 'seed_wiggle'
        },
        particles: ['dust_puff']
      },
      {
        name: 'sprouting',
        days: 1,
        size: 0.4,
        color: '#90EE90',
        animations: {
          idle: 'sprout_sway',
          growing: 'growth_spurt',
          watered: 'water_droplets',
          harvestable: 'leaf_tremble'
        },
        particles: ['water_splash']
      },
      {
        name: 'growing',
        days: 2,
        size: 0.6,
        color: '#7CB342',
        animations: {
          idle: 'gentle_sway',
          growing: 'stem_extend',
          watered: 'leaf_shine',
          harvestable: 'kernel_form'
        },
        particles: ['leaf_fall']
      },
      {
        name: 'mature',
        days: 3,
        size: 0.8,
        color: '#DAA520',
        animations: {
          idle: 'wheat_wave',
          growing: 'head_form',
          watered: 'golden_glow',
          harvestable: 'ready_bounce'
        },
        particles: ['pollen', 'golden_sparkle']
      },
      {
        name: 'harvestable',
        days: 4,
        size: 1.0,
        color: '#FFD700',
        animations: {
          idle: 'harvest_sway',
          growing: 'final_ripening',
          watered: 'harvest_glow',
          harvestable: 'harvest_pulse'
        },
        particles: ['harvest_sparkle', 'magic_glow']
      }
    ]);

    // Carrot growth stages
    this.growthStages.set('carrot', [
      {
        name: 'seed',
        days: 0.25,
        size: 0.2,
        color: '#8B4513',
        animations: {
          idle: 'seed_bob',
          growing: 'underground_pulse',
          watered: 'seed_glow',
          harvestable: 'seed_wiggle'
        },
        particles: ['soil_shift']
      },
      {
        name: 'sprouting',
        days: 1,
        size: 0.3,
        color: '#32CD32',
        animations: {
          idle: 'leaf_peek',
          growing: 'sprout_emerge',
          watered: 'leaf_shine',
          harvestable: 'top_grow'
        },
        particles: ['dirt_puff']
      },
      {
        name: 'growing',
        days: 1.5,
        size: 0.5,
        color: '#FF8C00',
        animations: {
          idle: 'carrot_swirl',
          growing: 'root_expand',
          watered: 'orange_glow',
          harvestable: 'size_pulse'
        },
        particles: ['root_sparkle']
      },
      {
        name: 'mature',
        days: 2,
        size: 0.7,
        color: '#FF7F50',
        animations: {
          idle: 'proud_stand',
          growing: 'final_swelling',
          watered: 'vibrant_glow',
          harvestable: 'harvest_ready'
        },
        particles: ['carrot_shine']
      },
      {
        name: 'harvestable',
        days: 2,
        size: 0.9,
        color: '#FF6347',
        animations: {
          idle: 'harvest_bounce',
          growing: 'peak_ripeness',
          watered: 'ripe_glow',
          harvestable: 'harvest_pulse'
        },
        particles: ['harvest_sparkle', 'vitamin_glow']
      }
    ]);

    // Tomato growth stages
    this.growthStages.set('tomato', [
      {
        name: 'seed',
        days: 0,
        size: 0.2,
        color: '#654321',
        animations: {
          idle: 'seed_roll',
          growing: 'seed_pulse',
          watered: 'seed_glow',
          harvestable: 'seed_wiggle'
        },
        particles: ['soil_particles']
      },
      {
        name: 'sprouting',
        days: 1,
        size: 0.3,
        color: '#90EE90',
        animations: {
          idle: 'tomato_seedling',
          growing: 'stem_rise',
          watered: 'leaf_dance',
          harvestable: 'first_leaves'
        },
        particles: ['green_sparkle']
      },
      {
        name: 'growing',
        days: 2,
        size: 0.5,
        color: '#32CD32',
        animations: {
          idle: 'plant_sway',
          growing: 'branch_extend',
          watered: 'leaf_shimmer',
          harvestable: 'flower_bud'
        },
        particles: ['leaf_petal']
      },
      {
        name: 'mature',
        days: 3,
        size: 0.7,
        color: '#FF6347',
        animations: {
          idle: 'fruit_form',
          growing: 'tomato_swelling',
          watered: 'red_glow',
          harvestable: 'color_deepen'
        },
        particles: ['red_sparkle']
      },
      {
        name: 'harvestable',
        days: 4,
        size: 0.9,
        color: '#DC143C',
        animations: {
          idle: 'proud_tomato',
          growing: 'final_ripening',
          watered: 'ripe_shine',
          harvestable: 'harvest_pulse'
        },
        particles: ['tomato_glow', 'juice_drops']
      }
    ]);

    // Corn growth stages
    this.growthStages.set('corn', [
      {
        name: 'seed',
        days: 0,
        size: 0.2,
        color: '#FFD700',
        animations: {
          idle: 'corn_kernel',
          growing: 'seed_pulse',
          watered: 'golden_glow',
          harvestable: 'kernel_shine'
        },
        particles: ['golden_dust']
      },
      {
        name: 'sprouting',
        days: 2,
        size: 0.4,
        color: '#7CFC00',
        animations: {
          idle: 'corn_seedling',
          growing: 'rapid_growth',
          watered: 'emerald_glow',
          harvestable: 'height_boost'
        },
        particles: ['growth_energy']
      },
      {
        name: 'growing',
        days: 3,
        size: 0.6,
        color: '#228B22',
        animations: {
          idle: 'corn_stand',
          growing: 'stalk_thicken',
          watered: 'green_glow',
          harvestable: 'tassel_form'
        },
        particles: ['leaf_wind']
      },
      {
        name: 'mature',
        days: 4,
        size: 0.8,
        color: '#DAA520',
        animations: {
          idle: 'corn_proud',
          growing: 'ear_form',
          watered: 'gold_glow',
          harvestable: 'silk_emerge'
        },
        particles: ['corn_pollen']
      },
      {
        name: 'harvestable',
        days: 5,
        size: 1.0,
        color: '#FFD700',
        animations: {
          idle: 'harvest_ready',
          growing: 'kernel_plump',
          watered: 'harvest_glow',
          harvestable: 'harvest_pulse'
        },
        particles: ['harvest_sparkle', 'corn_magic']
      }
    ]);
  }

  // Get crop personality traits
  getCropPersonality(cropType: string): CropPersonality {
    return this.cropPersonalities.get(cropType) || this.cropPersonalities.get('wheat')!;
  }

  // Get growth stage for a crop.
  // Positive seed `days` is how long that crop stays a seed before sprouting.
  // Later stages still match on their absolute day thresholds.
  getGrowthStage(cropType: string, days: number): CropGrowthStage {
    const stages = this.growthStages.get(cropType);
    if (!stages) return this.growthStages.get('wheat')![0];

    const seedDays = stages[0].days;
    if (seedDays > 0 && days < seedDays) {
      return stages[0];
    }

    const earliest = seedDays > 0 ? 1 : 0;
    for (let i = stages.length - 1; i >= earliest; i--) {
      if (days >= stages[i].days) {
        return stages[i];
      }
    }

    // Elapsed time is past the seed duration but before the next threshold.
    if (earliest === 1 && stages.length > 1) {
      return stages[1];
    }
    return stages[0];
  }

  // Calculate animation properties based on crop state
  calculateAnimation(
    cropType: string, 
    days: number, 
    health: number, 
    waterLevel: number,
    time: number
  ): {
    x: number;
    y: number;
    rotation: number;
    scale: number;
    alpha: number;
    glowIntensity: number;
  } {
    const personality = this.getCropPersonality(cropType);
    const stage = this.getGrowthStage(cropType, days);
    
    // Base sway animation
    const swayX = Math.sin(time * personality.animationSpeed) * personality.swayAmount * stage.size;
    const swayY = Math.cos(time * personality.animationSpeed * 0.7) * personality.swayAmount * 0.3 * stage.size;
    
    // Bounce animation for healthy crops
    const bounce = health > 70 ? Math.sin(time * personality.animationSpeed * 2) * personality.bounceHeight * (health / 100) : 0;
    
    // Rotation based on wind and personality
    const rotation = Math.sin(time * personality.animationSpeed * 0.5) * personality.swayAmount * 0.1;
    
    // Scale based on health and water
    const healthScale = 0.8 + (health / 100) * 0.2;
    const waterScale = waterLevel > 50 ? 1.05 : 0.95;
    const scale = stage.size * healthScale * waterScale;
    
    // Alpha based on health
    const alpha = Math.max(0.4, health / 100);
    
    // Glow intensity for harvestable crops
    const glowIntensity = stage.name === 'harvestable' 
      ? personality.glowIntensity * (1 + Math.sin(time * 0.1) * 0.3)
      : personality.glowIntensity * (waterLevel / 100);
    
    return {
      x: swayX,
      y: swayY + bounce,
      rotation,
      scale,
      alpha,
      glowIntensity
    };
  }

  // Generate particle effects for crop
  generateCropParticles(
    cropType: string, 
    days: number, 
    health: number, 
    waterLevel: number,
    x: number,
    y: number
  ): Array<{
    type: string;
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    color: string;
  }> {
    const particles: Array<any> = [];
    const stage = this.getGrowthStage(cropType, days);
    const personality = this.getCropPersonality(cropType);
    
    // Generate particles based on stage and conditions
    stage.particles.forEach(particleType => {
      if (Math.random() < 0.1) { // 10% chance per frame
        let particleColor = '#FFFFFF';
        let particleLife = 60;
        
        switch (particleType) {
          case 'pollen':
            particleColor = '#FFFFE0';
            particleLife = 120;
            break;
          case 'water_splash':
            particleColor = '#87CEEB';
            particleLife = 30;
            break;
          case 'harvest_sparkle':
            particleColor = '#FFD700';
            particleLife = 90;
            break;
          case 'growth_energy':
            particleColor = '#00FF00';
            particleLife = 45;
            break;
        }
        
        particles.push({
          type: particleType,
          x: x + (Math.random() - 0.5) * 20,
          y: y + (Math.random() - 0.5) * 20,
          vx: (Math.random() - 0.5) * 0.5,
          vy: -Math.random() * 0.5 - 0.2,
          life: particleLife,
          color: particleColor
        });
      }
    });
    
    return particles;
  }

  // Get seasonal growth modifiers
  getSeasonalGrowthModifier(cropType: string, season: string): number {
    const seasonalModifiers: Record<string, Record<string, number>> = {
      spring: {
        wheat: 1.2,
        carrot: 1.1,
        tomato: 0.9,
        corn: 0.8
      },
      summer: {
        wheat: 0.9,
        carrot: 1.0,
        tomato: 1.3,
        corn: 1.4
      },
      fall: {
        wheat: 1.1,
        carrot: 1.2,
        tomato: 0.8,
        corn: 1.0
      },
      winter: {
        wheat: 0.5,
        carrot: 0.6,
        tomato: 0.3,
        corn: 0.4
      }
    };
    
    return seasonalModifiers[season]?.[cropType] || 1.0;
  }
}
