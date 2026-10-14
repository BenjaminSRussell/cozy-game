/**
 * Dynamic Lighting System with Day/Night Cycles
 * 
 * Features:
 * - Realistic day/night transitions
 * - Dynamic shadows that change with sun position
 * - Golden hour and blue hour effects
 * - Building and tree shadows
 * - Ambient lighting changes
 * - Moon and star systems
 * - Weather-based lighting modifications
 */

export interface TimeOfDay {
  hour: number;
  minute: number;
  totalMinutes: number;
}

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

export interface LightingState {
  sunPosition: { x: number; y: number; z: number };
  moonPosition: { x: number; y: number; z: number };
  ambientColor: { r: number; g: number; b: number };
  sunColor: { r: number; g: number; b: number };
  moonColor: { r: number; g: number; b: number };
  shadowIntensity: number;
  shadowLength: number;
  shadowDirection: number;
  fogIntensity: number;
  skyGradient: { top: string; bottom: string };
  isNight: boolean;
  isGoldenHour: boolean;
  isBlueHour: boolean;
}

export interface ShadowCaster {
  id: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  height: number;
  type: 'building' | 'tree' | 'crop' | 'decoration';
  shadowQuality: 'low' | 'medium' | 'high';
}

export class DynamicLightingSystem {
  private currentTime: TimeOfDay = { hour: 6, minute: 0, totalMinutes: 360 };
  private currentSeason: Season = 'spring';
  private lightingState: LightingState;
  private shadowCasters: Map<string, ShadowCaster> = new Map();
  private stars: Array<{ x: number; y: number; size: number; brightness: number }> = [];
  private clouds: Array<{ x: number; y: number; size: number; opacity: number; speed: number }> = [];
  private timeSpeed = 1; // 1 real minute = 1 game minute

  constructor() {
    this.lightingState = this.calculateLightingState(this.currentTime, this.currentSeason);
    this.generateStars();
    this.generateClouds();
  }

  // Update time and lighting
  update(deltaTime: number): void {
    // Update time
    this.currentTime.totalMinutes += deltaTime * this.timeSpeed / 1000;
    this.currentTime.totalMinutes %= 1440; // 24 hours * 60 minutes
    
    this.currentTime.hour = Math.floor(this.currentTime.totalMinutes / 60);
    this.currentTime.minute = Math.floor(this.currentTime.totalMinutes % 60);

    // Update lighting state
    this.lightingState = this.calculateLightingState(this.currentTime, this.currentSeason);

    // Update celestial bodies
    this.updateStars();
    this.updateClouds(deltaTime);
  }

  // Get sunrise/sunset times for a season
  private getSunriseSunset(season: Season): { sunrise: number; sunset: number } {
    switch (season) {
      case 'spring': return { sunrise: 6.0, sunset: 19.5 };
      case 'summer': return { sunrise: 5.5, sunset: 20.5 };
      case 'autumn': return { sunrise: 6.5, sunset: 18.5 };
      case 'winter': return { sunrise: 7.5, sunset: 16.5 };
    }
  }

  private calculateLightingState(time: TimeOfDay, season: Season): LightingState {
    const hour = time.hour + time.minute / 60;
    const { sunrise, sunset } = this.getSunriseSunset(season);
    
    // Calculate sun position (0° at sunrise, 180° at sunset)
    const sunAngle = ((hour - sunrise) / (sunset - sunrise)) * Math.PI;
    const sunHeight = Math.sin(sunAngle);
    const sunX = Math.cos(sunAngle);
    
    // Calculate moon position (opposite of sun)
    const moonAngle = sunAngle + Math.PI;
    const moonHeight = Math.sin(moonAngle);
    const moonX = Math.cos(moonAngle);

    // Determine time periods (based on seasonal sunrise/sunset)
    const isNight = hour < sunrise || hour > sunset;
    const isGoldenHour = (hour >= 5 && hour <= 7) || (hour >= 17 && hour <= 19);
    const isBlueHour = (hour >= 4 && hour <= 5) || (hour >= 19 && hour <= 20);

    // Calculate ambient color based on time
    let ambientColor = { r: 255, g: 255, b: 255 };
    let sunColor = { r: 255, g: 255, b: 200 };
    let moonColor = { r: 200, g: 200, b: 255 };
    let skyGradient = { top: '#87CEEB', bottom: '#E0F6FF' };

    if (isNight) {
      ambientColor = { r: 50, g: 50, b: 80 };
      skyGradient = { top: '#0C1445', bottom: '#183059' };
    } else if (isGoldenHour) {
      ambientColor = { r: 255, g: 200, b: 150 };
      sunColor = { r: 255, g: 150, b: 100 };
      skyGradient = { top: '#FF6B35', bottom: '#F7931E' };
    } else if (isBlueHour) {
      ambientColor = { r: 150, g: 150, b: 200 };
      skyGradient = { top: '#4A5568', bottom: '#718096' };
    } else if (hour >= 10 && hour <= 14) {
      // High noon
      ambientColor = { r: 255, g: 255, b: 255 };
      skyGradient = { top: '#00BFFF', bottom: '#87CEEB' };
    }

    // Calculate shadow properties
    const shadowIntensity = Math.max(0, sunHeight);
    const shadowLength = sunHeight > 0 ? (1 - sunHeight) * 200 : 0;
    const shadowDirection = sunX > 0 ? Math.atan2(sunHeight, sunX) : Math.PI;

    // Calculate fog intensity (higher in early morning)
    const fogIntensity = (hour >= 4 && hour <= 7) ? 0.3 : 0.1;

    return {
      sunPosition: { x: sunX * 100, y: sunHeight * 100, z: sunHeight * 100 },
      moonPosition: { x: moonX * 100, y: moonHeight * 100, z: moonHeight * 100 },
      ambientColor,
      sunColor,
      moonColor,
      shadowIntensity,
      shadowLength,
      shadowDirection,
      fogIntensity,
      skyGradient,
      isNight,
      isGoldenHour,
      isBlueHour
    };
  }

  private generateStars(): void {
    this.stars = [];
    for (let i = 0; i < 200; i++) {
      this.stars.push({
        x: Math.random() * 2000 - 1000,
        y: Math.random() * 1000,
        size: Math.random() * 2 + 0.5,
        brightness: Math.random() * 0.8 + 0.2
      });
    }
  }

  private generateClouds(): void {
    this.clouds = [];
    for (let i = 0; i < 8; i++) {
      this.clouds.push({
        x: Math.random() * 2000 - 1000,
        y: Math.random() * 200 + 50,
        size: Math.random() * 100 + 50,
        opacity: Math.random() * 0.3 + 0.1,
        speed: Math.random() * 0.5 + 0.1
      });
    }
  }

  private updateStars(): void {
    // Stars twinkle based on time
    this.stars.forEach(star => {
      star.brightness = 0.2 + Math.sin(Date.now() * 0.001 + star.x) * 0.3 + 0.5;
    });
  }

  private updateClouds(deltaTime: number): void {
    this.clouds.forEach(cloud => {
      cloud.x += cloud.speed * deltaTime / 1000;
      
      // Wrap clouds around screen
      if (cloud.x > 1200) {
        cloud.x = -1200;
      }
    });
  }

  // Add shadow caster
  addShadowCaster(caster: ShadowCaster): void {
    this.shadowCasters.set(caster.id, caster);
  }

  // Remove shadow caster
  removeShadowCaster(id: string): void {
    this.shadowCasters.delete(id);
  }

  // Calculate shadow for a point
  calculateShadow(x: number, y: number, height: number): { 
    visible: boolean; 
    x: number; 
    y: number; 
    width: number; 
    height: number; 
    opacity: number;
  } | null {
    if (this.lightingState.shadowIntensity <= 0) return null;

    const shadowLength = height * this.lightingState.shadowLength / 100;
    const shadowX = x + Math.cos(this.lightingState.shadowDirection) * shadowLength;
    const shadowY = y + Math.sin(this.lightingState.shadowDirection) * shadowLength * 0.3;

    return {
      visible: true,
      x: shadowX,
      y: shadowY,
      width: Math.abs(shadowLength),
      height: height * 0.3,
      opacity: this.lightingState.shadowIntensity * 0.6
    };
  }

  // Get lighting state for rendering
  getLightingState(): LightingState {
    return this.lightingState;
  }

  // Get current time
  getCurrentTime(): TimeOfDay {
    return this.currentTime;
  }

  // Set time speed
  setTimeSpeed(speed: number): void {
    this.timeSpeed = speed;
  }

  // Set specific time
  setTime(hour: number, minute: number = 0): void {
    this.currentTime = {
      hour: Math.max(0, Math.min(23, hour)),
      minute: Math.max(0, Math.min(59, minute)),
      totalMinutes: hour * 60 + minute
    };
    this.lightingState = this.calculateLightingState(this.currentTime, this.currentSeason);
  }

  // Set season used for sunrise and sunset
  setSeason(season: Season): void {
    this.currentSeason = season;
    this.lightingState = this.calculateLightingState(this.currentTime, this.currentSeason);
  }

  // Get shadow casters for rendering
  getShadowCasters(): ShadowCaster[] {
    return Array.from(this.shadowCasters.values());
  }

  // Get stars for rendering
  getStars(): Array<{ x: number; y: number; size: number; brightness: number }> {
    return this.lightingState.isNight ? this.stars : [];
  }

  // Get clouds for rendering
  getClouds(): Array<{ x: number; y: number; size: number; opacity: number }> {
    return this.clouds.map(cloud => ({
      x: cloud.x,
      y: cloud.y,
      size: cloud.size,
      opacity: cloud.opacity * (this.lightingState.isNight ? 0.3 : 0.6)
    }));
  }

  // Get sun/moon visibility
  getSunMoonVisibility(): { sunVisible: boolean; moonVisible: boolean } {
    return {
      sunVisible: this.lightingState.sunPosition.y > 0,
      moonVisible: this.lightingState.moonPosition.y > 0
    };
  }

  // Calculate lighting for a specific point
  calculatePointLighting(x: number, y: number, height: number = 0): {
    ambient: { r: number; g: number; b: number };
    direct: { r: number; g: number; b: number };
    total: { r: number; g: number; b: number };
    intensity: number;
  } {
    const ambient = this.lightingState.ambientColor;
    let direct = { r: 0, g: 0, b: 0 };
    let intensity = 0.3; // Base ambient

    if (this.lightingState.sunPosition.y > 0) {
      // Sun is up - calculate direct sunlight
      const sunIntensity = this.lightingState.shadowIntensity;
      direct = {
        r: this.lightingState.sunColor.r * sunIntensity,
        g: this.lightingState.sunColor.g * sunIntensity,
        b: this.lightingState.sunColor.b * sunIntensity
      };
      intensity += sunIntensity * 0.7;
    } else if (this.lightingState.moonPosition.y > 0) {
      // Moon is up - calculate moonlight
      const moonIntensity = 0.2;
      direct = {
        r: this.lightingState.moonColor.r * moonIntensity,
        g: this.lightingState.moonColor.g * moonIntensity,
        b: this.lightingState.moonColor.b * moonIntensity
      };
      intensity += moonIntensity * 0.3;
    }

    const total = {
      r: Math.min(255, ambient.r * 0.3 + direct.r),
      g: Math.min(255, ambient.g * 0.3 + direct.g),
      b: Math.min(255, ambient.b * 0.3 + direct.b)
    };

    return { ambient, direct, total, intensity };
  }

  // Get weather modification for lighting
  getWeatherLightingModification(weather: string): {
    ambientModifier: { r: number; g: number; b: number };
    shadowModifier: number;
    fogModifier: number;
  } {
    switch (weather) {
      case 'rain':
        return {
          ambientModifier: { r: 0.7, g: 0.7, b: 0.8 },
          shadowModifier: 0.3,
          fogModifier: 2.0
        };
      case 'fog':
        return {
          ambientModifier: { r: 0.9, g: 0.9, b: 0.95 },
          shadowModifier: 0.1,
          fogModifier: 5.0
        };
      case 'cloudy':
        return {
          ambientModifier: { r: 0.8, g: 0.8, b: 0.85 },
          shadowModifier: 0.5,
          fogModifier: 1.5
        };
      case 'snow':
        return {
          ambientModifier: { r: 1.1, g: 1.1, b: 1.2 },
          shadowModifier: 0.4,
          fogModifier: 1.8
        };
      default:
        return {
          ambientModifier: { r: 1, g: 1, b: 1 },
          shadowModifier: 1,
          fogModifier: 1
        };
    }
  }

  // Create lightning effect
  createLightning(): {
    active: boolean;
    intensity: number;
    duration: number;
    position: { x: number; y: number };
  } {
    if (Math.random() < 0.001) { // 0.1% chance per frame
      return {
        active: true,
        intensity: Math.random() * 0.5 + 0.5,
        duration: 100 + Math.random() * 200,
        position: {
          x: Math.random() * 800,
          y: Math.random() * 200
        }
      };
    }
    return {
      active: false,
      intensity: 0,
      duration: 0,
      position: { x: 0, y: 0 }
    };
  }
}
