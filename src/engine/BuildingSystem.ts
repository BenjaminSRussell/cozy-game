/**
 * Interactive Building System with Animated Elements
 * 
 * Features:
 * - Animated doors, windows, and architectural elements
 * - Working smoke effects and lighting
 * - Interactive elements that respond to player
 * - Building-specific animations and behaviors
 * - Weather-responsive building states
 * - Upgrade progression with visual changes
 */

export interface BuildingAnimation {
  name: string;
  duration: number;
  loop: boolean;
  keyframes: Array<{
    time: number;
    transform?: string;
    opacity?: number;
    filter?: string;
  }>;
}

export interface BuildingState {
  health: number;
  level: number;
  isOccupied: boolean;
  lightsOn: boolean;
  doorOpen: boolean;
  smokeActive: boolean;
  weatherEffects: boolean;
}

export interface InteractiveBuilding {
  id: string;
  type: string;
  position: { x: number; y: number };
  dimensions: { x: number; y: number }; // Grid units (e.g., 2x2)
  size: { width: number; height: number }; // Pixel size for rendering reference
  state: BuildingState;
  animations: Map<string, BuildingAnimation>;
  particleEffects: Array<{
    type: string;
    position: { x: number; y: number };
    active: boolean;
  }>;
}

export class InteractiveBuildingSystem {
  private buildings: Map<string, InteractiveBuilding> = new Map();
  private animationFrame = 0;
  private time = 0;

  constructor() {
    this.initializeBuildingTemplates();
  }

  private initializeBuildingTemplates(): void {
    // Barn template
    const barnTemplate: InteractiveBuilding = {
      id: 'barn_template',
      type: 'barn',
      position: { x: 0, y: 0 },
      dimensions: { x: 2, y: 3 }, // Occupies 2x3 tiles
      size: { width: 128, height: 192 }, // Scaled pixel size
      state: {
        health: 100,
        level: 1,
        isOccupied: true,
        lightsOn: false,
        doorOpen: false,
        smokeActive: false,
        weatherEffects: true
      },
      animations: new Map([
        ['door_open', {
          name: 'door_open',
          duration: 1000,
          loop: false,
          keyframes: [
            { time: 0, transform: 'rotateY(0deg)' },
            { time: 0.5, transform: 'rotateY(45deg)' },
            { time: 1, transform: 'rotateY(90deg)' }
          ]
        }],
        ['door_close', {
          name: 'door_close',
          duration: 1000,
          loop: false,
          keyframes: [
            { time: 0, transform: 'rotateY(90deg)' },
            { time: 0.5, transform: 'rotateY(45deg)' },
            { time: 1, transform: 'rotateY(0deg)' }
          ]
        }],
        ['lights_on', {
          name: 'lights_on',
          duration: 500,
          loop: false,
          keyframes: [
            { time: 0, opacity: 0 },
            { time: 1, opacity: 1 }
          ]
        }],
        ['smoke_rise', {
          name: 'smoke_rise',
          duration: 3000,
          loop: true,
          keyframes: [
            { time: 0, transform: 'translateY(0px) scale(1)', opacity: 0.8 },
            { time: 0.5, transform: 'translateY(-20px) scale(1.5)', opacity: 0.6 },
            { time: 1, transform: 'translateY(-40px) scale(2)', opacity: 0 }
          ]
        }]
      ]),
      particleEffects: [
        {
          type: 'smoke',
          position: { x: 64, y: 32 },
          active: false
        },
        {
          type: 'window_light',
          position: { x: 32, y: 48 },
          active: false
        },
        {
          type: 'door_light',
          position: { x: 64, y: 96 },
          active: false
        }
      ]
    };

    // House template
    const houseTemplate: InteractiveBuilding = {
      id: 'house_template',
      type: 'house',
      position: { x: 0, y: 0 },
      dimensions: { x: 2, y: 2 }, // Occupies 2x2 tiles
      size: { width: 128, height: 128 },
      state: {
        health: 100,
        level: 1,
        isOccupied: true,
        lightsOn: true,
        doorOpen: false,
        smokeActive: true,
        weatherEffects: true
      },
      animations: new Map([
        ['door_open', {
          name: 'door_open',
          duration: 800,
          loop: false,
          keyframes: [
            { time: 0, transform: 'rotateY(0deg)' },
            { time: 1, transform: 'rotateY(85deg)' }
          ]
        }],
        ['window_glow', {
          name: 'window_glow',
          duration: 2000,
          loop: true,
          keyframes: [
            { time: 0, opacity: 0.6 },
            { time: 0.5, opacity: 1 },
            { time: 1, opacity: 0.6 }
          ]
        }],
        ['chimney_smoke', {
          name: 'chimney_smoke',
          duration: 4000,
          loop: true,
          keyframes: [
            { time: 0, transform: 'translateY(0px) scale(0.5)', opacity: 0 },
            { time: 0.25, transform: 'translateY(-10px) scale(1)', opacity: 0.7 },
            { time: 0.75, transform: 'translateY(-30px) scale(2)', opacity: 0.3 },
            { time: 1, transform: 'translateY(-50px) scale(3)', opacity: 0 }
          ]
        }]
      ]),
      particleEffects: [
        {
          type: 'chimney_smoke',
          position: { x: 48, y: 24 },
          active: true
        },
        {
          type: 'window_warm_light',
          position: { x: 24, y: 48 },
          active: true
        },
        {
          type: 'window_warm_light',
          position: { x: 72, y: 48 },
          active: true
        }
      ]
    };

    // Greenhouse template
    const greenhouseTemplate: InteractiveBuilding = {
      id: 'greenhouse_template',
      type: 'greenhouse',
      position: { x: 0, y: 0 },
      dimensions: { x: 2, y: 2 },
      size: { width: 128, height: 128 },
      state: {
        health: 100,
        level: 1,
        isOccupied: false,
        lightsOn: false,
        doorOpen: true,
        smokeActive: false,
        weatherEffects: true
      },
      animations: new Map([
        ['glass_shimmer', {
          name: 'glass_shimmer',
          duration: 3000,
          loop: true,
          keyframes: [
            { time: 0, opacity: 0.9 },
            { time: 0.5, opacity: 1, filter: 'brightness(1.2)' },
            { time: 1, opacity: 0.9 }
          ]
        }],
        ['plant_grow', {
          name: 'plant_grow',
          duration: 5000,
          loop: false,
          keyframes: [
            { time: 0, transform: 'scale(0.8)' },
            { time: 1, transform: 'scale(1.2)' }
          ]
        }],
        ['ventilation', {
          name: 'ventilation',
          duration: 2000,
          loop: true,
          keyframes: [
            { time: 0, transform: 'translateY(0px)' },
            { time: 0.5, transform: 'translateY(-2px)' },
            { time: 1, transform: 'translateY(0px)' }
          ]
        }]
      ]),
      particleEffects: [
        {
          type: 'water_droplets',
          position: { x: 56, y: 40 },
          active: false
        },
        {
          type: 'plant_sparkle',
          position: { x: 28, y: 60 },
          active: false
        },
        {
          type: 'plant_sparkle',
          position: { x: 84, y: 60 },
          active: false
        }
      ]
    };

    // Windmill template
    const windmillTemplate: InteractiveBuilding = {
      id: 'windmill_template',
      type: 'windmill',
      position: { x: 0, y: 0 },
      dimensions: { x: 1, y: 1 }, // Small footprint, large visual
      size: { width: 64, height: 128 },
      state: {
        health: 100,
        level: 1,
        isOccupied: false,
        lightsOn: false,
        doorOpen: false,
        smokeActive: false,
        weatherEffects: true
      },
      animations: new Map([
        ['blades_rotate', {
          name: 'blades_rotate',
          duration: 4000,
          loop: true,
          keyframes: [
            { time: 0, transform: 'rotate(0deg)' },
            { time: 1, transform: 'rotate(360deg)' }
          ]
        }],
        ['wind_response', {
          name: 'wind_response',
          duration: 1000,
          loop: true,
          keyframes: [
            { time: 0, transform: 'rotate(0deg) translateY(0px)' },
            { time: 0.25, transform: 'rotate(90deg) translateY(-1px)' },
            { time: 0.5, transform: 'rotate(180deg) translateY(0px)' },
            { time: 0.75, transform: 'rotate(270deg) translateY(1px)' },
            { time: 1, transform: 'rotate(360deg) translateY(0px)' }
          ]
        }],
        ['sail_adjust', {
          name: 'sail_adjust',
          duration: 2000,
          loop: false,
          keyframes: [
            { time: 0, transform: 'scaleX(1)' },
            { time: 0.5, transform: 'scaleX(0.8)' },
            { time: 1, transform: 'scaleX(1)' }
          ]
        }]
      ]),
      particleEffects: [
        {
          type: 'wind_trail',
          position: { x: 48, y: 24 },
          active: true
        },
        {
          type: 'grain_dust',
          position: { x: 48, y: 120 },
          active: false
        }
      ]
    };

    // Store templates
    this.buildings.set('barn', barnTemplate);
    this.buildings.set('house', houseTemplate);
    this.buildings.set('greenhouse', greenhouseTemplate);
    this.buildings.set('windmill', windmillTemplate);
  }

  // Create new building instance
  createBuilding(type: string, position: { x: number; y: number }): InteractiveBuilding {
    const template = this.buildings.get(`${type}_template`);
    if (!template) {
      throw new Error(`Building type ${type} not found`);
    }

    const newBuilding: InteractiveBuilding = {
      ...template,
      id: `${type}_${Date.now()}_${Math.random()}`,
      position: { ...position },
      dimensions: { ...template.dimensions },
      animations: new Map(template.animations),
      particleEffects: template.particleEffects.map((effect: any) => ({ ...effect }))
    };

    this.buildings.set(newBuilding.id, newBuilding);
    return newBuilding;
  }

  // Update building animations and states
  update(deltaTime: number, windSpeed: number, timeOfDay: number): void {
    this.time += deltaTime;
    this.animationFrame++;

    this.buildings.forEach(building => {
      // Update time-based states
      this.updateBuildingStates(building, timeOfDay, windSpeed);

      // Update particle effects
      this.updateParticleEffects(building, deltaTime);

      // Process animations
      this.processAnimations(building, deltaTime);
    });
  }

  private updateBuildingStates(building: InteractiveBuilding, timeOfDay: number, windSpeed: number): void {
    // Turn lights on/off based on time of day
    const isNight = timeOfDay < 6 || timeOfDay > 20;
    if (building.type === 'house' || building.type === 'barn') {
      building.state.lightsOn = isNight;
    }

    // Adjust windmill speed based on wind
    if (building.type === 'windmill') {
      const rotateAnimation = building.animations.get('blades_rotate');
      if (rotateAnimation) {
        rotateAnimation.duration = Math.max(1000, 4000 - windSpeed * 100);
      }
    }

    // Weather effects
    if (building.state.weatherEffects) {
      // Close doors during storms
      if (windSpeed > 8) {
        building.state.doorOpen = false;
      }
    }
  }

  private updateParticleEffects(building: InteractiveBuilding, deltaTime: number): void {
    building.particleEffects.forEach(effect => {
      switch (effect.type) {
        case 'chimney_smoke':
          effect.active = building.state.smokeActive && building.type === 'house';
          break;
        case 'window_light':
        case 'window_warm_light':
        case 'door_light':
          effect.active = building.state.lightsOn;
          break;
        case 'water_droplets':
          effect.active = building.type === 'greenhouse' && Math.random() < 0.01;
          break;
        case 'plant_sparkle':
          effect.active = building.type === 'greenhouse' && Math.random() < 0.02;
          break;
        case 'wind_trail':
          effect.active = building.type === 'windmill';
          break;
        case 'grain_dust':
          effect.active = building.type === 'windmill' && Math.random() < 0.005;
          break;
      }
    });
  }

  private processAnimations(building: InteractiveBuilding, deltaTime: number): void {
    // Process active animations based on building state
    if (building.state.doorOpen) {
      this.triggerAnimation(building, 'door_open');
    } else {
      this.triggerAnimation(building, 'door_close');
    }

    if (building.state.lightsOn) {
      this.triggerAnimation(building, 'lights_on');
    }

    if (building.state.smokeActive) {
      this.triggerAnimation(building, 'smoke_rise');
    }

    if (building.type === 'windmill') {
      this.triggerAnimation(building, 'blades_rotate');
      this.triggerAnimation(building, 'wind_response');
    }

    if (building.type === 'greenhouse') {
      this.triggerAnimation(building, 'glass_shimmer');
      this.triggerAnimation(building, 'ventilation');
    }
  }

  private triggerAnimation(building: InteractiveBuilding, animationName: string): void {
    const animation = building.animations.get(animationName);
    if (!animation) return;

    // Animation logic would be handled by the rendering system
    // This just marks the animation as active
  }

  // Get building animation state
  getAnimationState(buildingId: string, animationName: string): any {
    const building = this.buildings.get(buildingId);
    if (!building) return null;

    const animation = building.animations.get(animationName);
    if (!animation) return null;

    const progress = (this.time % animation.duration) / animation.duration;

    // Find current keyframe
    let currentKeyframe = animation.keyframes[0];
    let nextKeyframe = animation.keyframes[0];

    for (let i = 0; i < animation.keyframes.length - 1; i++) {
      if (progress >= animation.keyframes[i].time && progress <= animation.keyframes[i + 1].time) {
        currentKeyframe = animation.keyframes[i];
        nextKeyframe = animation.keyframes[i + 1];
        break;
      }
    }

    // Interpolate between keyframes
    const keyframeProgress = (progress - currentKeyframe.time) / (nextKeyframe.time - currentKeyframe.time);

    return {
      transform: this.interpolateTransform(currentKeyframe.transform || '', nextKeyframe.transform || '', keyframeProgress),
      opacity: currentKeyframe.opacity && nextKeyframe.opacity
        ? currentKeyframe.opacity + (nextKeyframe.opacity - currentKeyframe.opacity) * keyframeProgress
        : 1,
      filter: currentKeyframe.filter || nextKeyframe.filter || 'none'
    };
  }

  private interpolateTransform(from: string, to: string, progress: number): string {
    // Simple transform interpolation
    // In a real implementation, this would parse and interpolate transform values
    return progress < 0.5 ? from : to;
  }

  // Get particle effects for rendering
  getParticleEffects(buildingId: string): Array<any> {
    const building = this.buildings.get(buildingId);
    if (!building) return [];

    return building.particleEffects
      .filter(effect => effect.active)
      .map(effect => ({
        type: effect.type,
        x: building.position.x + effect.position.x,
        y: building.position.y + effect.position.y,
        buildingType: building.type
      }));
  }

  // Interactive actions
  openDoor(buildingId: string): void {
    const building = this.buildings.get(buildingId);
    if (building) {
      building.state.doorOpen = true;
    }
  }

  closeDoor(buildingId: string): void {
    const building = this.buildings.get(buildingId);
    if (building) {
      building.state.doorOpen = false;
    }
  }

  toggleLights(buildingId: string): void {
    const building = this.buildings.get(buildingId);
    if (building) {
      building.state.lightsOn = !building.state.lightsOn;
    }
  }

  upgradeBuilding(buildingId: string): void {
    const building = this.buildings.get(buildingId);
    if (building && building.state.level < 3) {
      building.state.level++;
      // Add visual upgrades here
    }
  }

  // Get building by ID
  getBuilding(buildingId: string): InteractiveBuilding | undefined {
    return this.buildings.get(buildingId);
  }

  // Get all buildings
  getAllBuildings(): InteractiveBuilding[] {
    return Array.from(this.buildings.values()).filter(b => !b.id.includes('_template'));
  }
}
