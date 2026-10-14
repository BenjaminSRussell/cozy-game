import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, Modal, Image as RNImage } from 'react-native';
import { useGameStore } from '../store/gameStore';
import { CropStage, DamBuilding } from '../types/game';
import { DrawingScreen } from './DrawingScreen';
import { MarketplaceScreen } from './MarketplaceScreen';
import { LoadingScreen } from './LoadingScreen';
import { AdvancedParticleSystem } from '../engine/ParticleSystem';
import { DemoAssets } from '../assets/DemoAssets';

const SCREEN_WIDTH = Dimensions.get('window').width;

/**
 * Props for the GameScreen component
 */
interface GameScreenProps {
  /** Callback function when user clicks Save button */
  onSave: () => void;
}

/**
 * Metro asset ids for crop, building, and tile art.
 * require() must be a static literal or Metro will not bundle the file.
 * Paths are relative to this file (src/components).
 * assets/crops/<name>.svg is absent; full-grown icons live in grains, fruits, vegetables, and berries.
 */
type SvgSource = number | string;

const SVG_ASSETS: { [key: string]: number } = {
  // Crops
  wheat: require('../../assets/crops/grains/wheat.svg'),
  carrot: require('../../assets/crops/vegetables/carrot.svg'),
  tomato: require('../../assets/crops/vegetables/tomato.svg'),
  corn: require('../../assets/crops/vegetables/corn.svg'),
  apple: require('../../assets/crops/fruits/apple.svg'),
  asparagus: require('../../assets/crops/vegetables/asparagus.svg'),
  blueberry: require('../../assets/crops/berries/blueberry.svg'),
  broccoli: require('../../assets/crops/vegetables/broccoli.svg'),
  cabbage: require('../../assets/crops/vegetables/cabbage.svg'),
  cherry: require('../../assets/crops/fruits/cherry.svg'),
  cucumber: require('../../assets/crops/vegetables/cucumber.svg'),
  garlic: require('../../assets/crops/vegetables/garlic.svg'),
  grape: require('../../assets/crops/berries/grape.svg'),
  lettuce: require('../../assets/crops/vegetables/lettuce.svg'),
  mushroom: require('../../assets/crops/vegetables/mushroom.svg'),
  onion: require('../../assets/crops/vegetables/onion.svg'),
  peach: require('../../assets/crops/fruits/peach.svg'),
  pear: require('../../assets/crops/fruits/pear.svg'),
  pepper: require('../../assets/crops/vegetables/pepper.svg'),
  potato: require('../../assets/crops/vegetables/potato.svg'),
  pumpkin: require('../../assets/crops/vegetables/pumpkin.svg'),
  radish: require('../../assets/crops/vegetables/radish.svg'),
  spinach: require('../../assets/crops/vegetables/spinach.svg'),
  strawberry: require('../../assets/crops/fruits/strawberry.svg'),
  watermelon: require('../../assets/crops/fruits/watermelon.svg'),

  // Phase-specific crop assets
  apple_seed: require('../../assets/crops/phase1/apple.svg'),
  carrot_seed: require('../../assets/crops/phase1/carrot.svg'),
  tomato_seed: require('../../assets/crops/phase1/tomato.svg'),
  corn_seed: require('../../assets/crops/phase1/corn.svg'),
  asparagus_seed: require('../../assets/crops/phase1/asparagus.svg'),
  blueberry_seed: require('../../assets/crops/phase1/blueberry.svg'),
  broccoli_seed: require('../../assets/crops/phase1/broccoli.svg'),
  cabbage_seed: require('../../assets/crops/phase1/cabbage.svg'),
  cherry_seed: require('../../assets/crops/phase1/cherry.svg'),
  cucumber_seed: require('../../assets/crops/phase1/cucumber.svg'),
  garlic_seed: require('../../assets/crops/phase1/garlic.svg'),
  grape_seed: require('../../assets/crops/phase1/grape.svg'),
  lettuce_seed: require('../../assets/crops/phase1/lettuce.svg'),
  mushroom_seed: require('../../assets/crops/phase1/mushroom.svg'),
  onion_seed: require('../../assets/crops/phase1/onion.svg'),
  peach_seed: require('../../assets/crops/phase1/peach.svg'),
  pear_seed: require('../../assets/crops/phase1/pear.svg'),
  pepper_seed: require('../../assets/crops/phase1/pepper.svg'),
  potato_seed: require('../../assets/crops/phase1/potato.svg'),
  pumpkin_seed: require('../../assets/crops/phase1/pumpkin.svg'),
  radish_seed: require('../../assets/crops/phase1/radish.svg'),
  spinach_seed: require('../../assets/crops/phase1/spinach.svg'),
  strawberry_seed: require('../../assets/crops/phase1/strawberry.svg'),
  watermelon_seed: require('../../assets/crops/phase1/watermelon.svg'),
  wheat_seed: require('../../assets/crops/phase1/wheat.svg'),

  // Buildings
  barn: require('../../assets/buildings/barn.svg'),
  shed: require('../../assets/buildings/shed.svg'),
  house: require('../../assets/buildings/house.svg'),
  fence: require('../../assets/buildings/fence.svg'),
  small_dam: require('../../assets/buildings/well.svg'),
  medium_dam: require('../../assets/buildings/bridge.svg'),
  large_dam: require('../../assets/buildings/tower.svg'),

  // Decorations
  tree_oak: require('../../assets/decorations/tree_oak.svg'),
  bench: require('../../assets/decorations/bench.svg'),
  lamp: require('../../assets/decorations/lamp.svg'),

  // Land types
  grassland: require('../../assets/tiles/grass.svg'),
  forest: require('../../assets/decorations/tree_oak.svg'),
  riverfront: require('../../assets/tiles/water.svg'),
  hillside: require('../../assets/tiles/dirt.svg'),

  // Tiles
  grass: require('../../assets/tiles/grass.svg'),
  dirt: require('../../assets/tiles/dirt.svg'),
  water: require('../../assets/tiles/water.svg'),

  // Grass variations for overgrowth phases
  grass_fresh: require('../../assets/tiles/grass.svg'),
  grass_growing: require('../../assets/decorations/tree_oak.svg'),
  grass_overgrown: require('../../assets/decorations/tree_oak.svg'),

  // Seasonal flowers
  flower_pink: require('../../assets/seasons/spring/flower_pink.svg'),
  flower_red: require('../../assets/seasons/spring/flower_red.svg'),
  flower_white: require('../../assets/seasons/spring/flower_white.svg'),
  flower_yellow: require('../../assets/seasons/spring/flower_yellow.svg'),

  // Seasonal effects
  heat_shimmer: require('../../assets/seasons/summer/heat_shimmer.svg'),
  sun_glare: require('../../assets/seasons/summer/sun_glare.svg'),
  leaf_orange: require('../../assets/seasons/fall/leaf_orange.svg'),
  leaf_red: require('../../assets/seasons/fall/leaf_red.svg'),
  leaf_gold: require('../../assets/seasons/fall/leaf_gold.svg'),
  leaf_brown: require('../../assets/seasons/fall/leaf_brown.svg'),
  snow_flake: require('../../assets/seasons/winter/snow_flake.svg'),
  snow_coverage: require('../../assets/seasons/winter/snow_coverage.svg'),

  // Tools. lawn_mower_* SVGs are absent and are not mapped onto buildings.
  rake: require('../../assets/tools/rake.svg'),
  snow_shovel: require('../../assets/tools/snow_shovel.svg'),
};

/**
 * Growth-stage art. Template strings cannot be required, so each phase is static.
 * assets/crops/death/placeholder.svg is absent; dead crops use death/<name>.svg.
 */
const CROP_GROWTH: {
  [crop: string]: { seed: number; sprout: number; growing: number; mature: number; dead: number };
} = {
  wheat: {
    seed: require('../../assets/crops/phase1/wheat.svg'),
    sprout: require('../../assets/crops/phase2/wheat.svg'),
    growing: require('../../assets/crops/phase3/wheat.svg'),
    mature: require('../../assets/crops/phase4/wheat.svg'),
    dead: require('../../assets/crops/death/wheat.svg'),
  },
  carrot: {
    seed: require('../../assets/crops/phase1/carrot.svg'),
    sprout: require('../../assets/crops/phase2/carrot.svg'),
    growing: require('../../assets/crops/phase3/carrot.svg'),
    mature: require('../../assets/crops/phase4/carrot.svg'),
    dead: require('../../assets/crops/death/carrot.svg'),
  },
  tomato: {
    seed: require('../../assets/crops/phase1/tomato.svg'),
    sprout: require('../../assets/crops/phase2/tomato.svg'),
    growing: require('../../assets/crops/phase3/tomato.svg'),
    mature: require('../../assets/crops/phase4/tomato.svg'),
    dead: require('../../assets/crops/death/tomato.svg'),
  },
  corn: {
    seed: require('../../assets/crops/phase1/corn.svg'),
    sprout: require('../../assets/crops/phase2/corn.svg'),
    growing: require('../../assets/crops/phase3/corn.svg'),
    mature: require('../../assets/crops/phase4/corn.svg'),
    dead: require('../../assets/crops/death/corn.svg'),
  },
  apple: {
    seed: require('../../assets/crops/phase1/apple.svg'),
    sprout: require('../../assets/crops/phase2/apple.svg'),
    growing: require('../../assets/crops/phase3/apple.svg'),
    mature: require('../../assets/crops/phase4/apple.svg'),
    dead: require('../../assets/crops/death/apple.svg'),
  },
  asparagus: {
    seed: require('../../assets/crops/phase1/asparagus.svg'),
    sprout: require('../../assets/crops/phase2/asparagus.svg'),
    growing: require('../../assets/crops/phase3/asparagus.svg'),
    mature: require('../../assets/crops/phase4/asparagus.svg'),
    dead: require('../../assets/crops/death/asparagus.svg'),
  },
  blueberry: {
    seed: require('../../assets/crops/phase1/blueberry.svg'),
    sprout: require('../../assets/crops/phase2/blueberry.svg'),
    growing: require('../../assets/crops/phase3/blueberry.svg'),
    mature: require('../../assets/crops/phase4/blueberry.svg'),
    dead: require('../../assets/crops/death/blueberry.svg'),
  },
  broccoli: {
    seed: require('../../assets/crops/phase1/broccoli.svg'),
    sprout: require('../../assets/crops/phase2/broccoli.svg'),
    growing: require('../../assets/crops/phase3/broccoli.svg'),
    mature: require('../../assets/crops/phase4/broccoli.svg'),
    dead: require('../../assets/crops/death/broccoli.svg'),
  },
  cabbage: {
    seed: require('../../assets/crops/phase1/cabbage.svg'),
    sprout: require('../../assets/crops/phase2/cabbage.svg'),
    growing: require('../../assets/crops/phase3/cabbage.svg'),
    mature: require('../../assets/crops/phase4/cabbage.svg'),
    dead: require('../../assets/crops/death/cabbage.svg'),
  },
  cherry: {
    seed: require('../../assets/crops/phase1/cherry.svg'),
    sprout: require('../../assets/crops/phase2/cherry.svg'),
    growing: require('../../assets/crops/phase3/cherry.svg'),
    mature: require('../../assets/crops/phase4/cherry.svg'),
    dead: require('../../assets/crops/death/cherry.svg'),
  },
  cucumber: {
    seed: require('../../assets/crops/phase1/cucumber.svg'),
    sprout: require('../../assets/crops/phase2/cucumber.svg'),
    growing: require('../../assets/crops/phase3/cucumber.svg'),
    mature: require('../../assets/crops/phase4/cucumber.svg'),
    dead: require('../../assets/crops/death/cucumber.svg'),
  },
  garlic: {
    seed: require('../../assets/crops/phase1/garlic.svg'),
    sprout: require('../../assets/crops/phase2/garlic.svg'),
    growing: require('../../assets/crops/phase3/garlic.svg'),
    mature: require('../../assets/crops/phase4/garlic.svg'),
    dead: require('../../assets/crops/death/garlic.svg'),
  },
  grape: {
    seed: require('../../assets/crops/phase1/grape.svg'),
    sprout: require('../../assets/crops/phase2/grape.svg'),
    growing: require('../../assets/crops/phase3/grape.svg'),
    mature: require('../../assets/crops/phase4/grape.svg'),
    dead: require('../../assets/crops/death/grape.svg'),
  },
  lettuce: {
    seed: require('../../assets/crops/phase1/lettuce.svg'),
    sprout: require('../../assets/crops/phase2/lettuce.svg'),
    growing: require('../../assets/crops/phase3/lettuce.svg'),
    mature: require('../../assets/crops/phase4/lettuce.svg'),
    dead: require('../../assets/crops/death/lettuce.svg'),
  },
  mushroom: {
    seed: require('../../assets/crops/phase1/mushroom.svg'),
    sprout: require('../../assets/crops/phase2/mushroom.svg'),
    growing: require('../../assets/crops/phase3/mushroom.svg'),
    mature: require('../../assets/crops/phase4/mushroom.svg'),
    dead: require('../../assets/crops/death/mushroom.svg'),
  },
  onion: {
    seed: require('../../assets/crops/phase1/onion.svg'),
    sprout: require('../../assets/crops/phase2/onion.svg'),
    growing: require('../../assets/crops/phase3/onion.svg'),
    mature: require('../../assets/crops/phase4/onion.svg'),
    dead: require('../../assets/crops/death/onion.svg'),
  },
  peach: {
    seed: require('../../assets/crops/phase1/peach.svg'),
    sprout: require('../../assets/crops/phase2/peach.svg'),
    growing: require('../../assets/crops/phase3/peach.svg'),
    mature: require('../../assets/crops/phase4/peach.svg'),
    dead: require('../../assets/crops/death/peach.svg'),
  },
  pear: {
    seed: require('../../assets/crops/phase1/pear.svg'),
    sprout: require('../../assets/crops/phase2/pear.svg'),
    growing: require('../../assets/crops/phase3/pear.svg'),
    mature: require('../../assets/crops/phase4/pear.svg'),
    dead: require('../../assets/crops/death/pear.svg'),
  },
  pepper: {
    seed: require('../../assets/crops/phase1/pepper.svg'),
    sprout: require('../../assets/crops/phase2/pepper.svg'),
    growing: require('../../assets/crops/phase3/pepper.svg'),
    mature: require('../../assets/crops/phase4/pepper.svg'),
    dead: require('../../assets/crops/death/pepper.svg'),
  },
  potato: {
    seed: require('../../assets/crops/phase1/potato.svg'),
    sprout: require('../../assets/crops/phase2/potato.svg'),
    growing: require('../../assets/crops/phase3/potato.svg'),
    mature: require('../../assets/crops/phase4/potato.svg'),
    dead: require('../../assets/crops/death/potato.svg'),
  },
  pumpkin: {
    seed: require('../../assets/crops/phase1/pumpkin.svg'),
    sprout: require('../../assets/crops/phase2/pumpkin.svg'),
    growing: require('../../assets/crops/phase3/pumpkin.svg'),
    mature: require('../../assets/crops/phase4/pumpkin.svg'),
    dead: require('../../assets/crops/death/pumpkin.svg'),
  },
  radish: {
    seed: require('../../assets/crops/phase1/radish.svg'),
    sprout: require('../../assets/crops/phase2/radish.svg'),
    growing: require('../../assets/crops/phase3/radish.svg'),
    mature: require('../../assets/crops/phase4/radish.svg'),
    dead: require('../../assets/crops/death/radish.svg'),
  },
  spinach: {
    seed: require('../../assets/crops/phase1/spinach.svg'),
    sprout: require('../../assets/crops/phase2/spinach.svg'),
    growing: require('../../assets/crops/phase3/spinach.svg'),
    mature: require('../../assets/crops/phase4/spinach.svg'),
    dead: require('../../assets/crops/death/spinach.svg'),
  },
  strawberry: {
    seed: require('../../assets/crops/phase1/strawberry.svg'),
    sprout: require('../../assets/crops/phase2/strawberry.svg'),
    growing: require('../../assets/crops/phase3/strawberry.svg'),
    mature: require('../../assets/crops/phase4/strawberry.svg'),
    dead: require('../../assets/crops/death/strawberry.svg'),
  },
  watermelon: {
    seed: require('../../assets/crops/phase1/watermelon.svg'),
    sprout: require('../../assets/crops/phase2/watermelon.svg'),
    growing: require('../../assets/crops/phase3/watermelon.svg'),
    mature: require('../../assets/crops/phase4/watermelon.svg'),
    dead: require('../../assets/crops/death/watermelon.svg'),
  },
};

/**
 * Crop type definitions with growth timelines and economic values
 * Each crop type has unique growth time, sell value, and visual representation
 */
const CROP_TYPES = {
  wheat: { name: 'Wheat', svg: SVG_ASSETS.wheat, growthDays: 3, sellValue: 50, color: '#DAA520' },
  carrot: { name: 'Carrot', svg: SVG_ASSETS.carrot, growthDays: 2, sellValue: 40, color: '#FF8C00' },
  tomato: { name: 'Tomato', svg: SVG_ASSETS.tomato, growthDays: 4, sellValue: 60, color: '#DC143C' },
  corn: { name: 'Corn', svg: SVG_ASSETS.corn, growthDays: 5, sellValue: 75, color: '#FFD700' },
  apple: { name: 'Apple', svg: SVG_ASSETS.apple, growthDays: 6, sellValue: 80, color: '#FF6347' },
  asparagus: { name: 'Asparagus', svg: SVG_ASSETS.asparagus, growthDays: 3, sellValue: 45, color: '#32CD32' },
  blueberry: { name: 'Blueberry', svg: SVG_ASSETS.blueberry, growthDays: 4, sellValue: 55, color: '#4169E1' },
  broccoli: { name: 'Broccoli', svg: SVG_ASSETS.broccoli, growthDays: 4, sellValue: 50, color: '#228B22' },
  cabbage: { name: 'Cabbage', svg: SVG_ASSETS.cabbage, growthDays: 5, sellValue: 45, color: '#90EE90' },
  cherry: { name: 'Cherry', svg: SVG_ASSETS.cherry, growthDays: 6, sellValue: 90, color: '#DC143C' },
  cucumber: { name: 'Cucumber', svg: SVG_ASSETS.cucumber, growthDays: 3, sellValue: 35, color: '#32CD32' },
  garlic: { name: 'Garlic', svg: SVG_ASSETS.garlic, growthDays: 2, sellValue: 30, color: '#F0E68C' },
  grape: { name: 'Grape', svg: SVG_ASSETS.grape, growthDays: 5, sellValue: 70, color: '#6A0DAD' },
  lettuce: { name: 'Lettuce', svg: SVG_ASSETS.lettuce, growthDays: 2, sellValue: 25, color: '#90EE90' },
  mushroom: { name: 'Mushroom', svg: SVG_ASSETS.mushroom, growthDays: 3, sellValue: 40, color: '#8B4513' },
  onion: { name: 'Onion', svg: SVG_ASSETS.onion, growthDays: 4, sellValue: 35, color: '#DDA0DD' },
  peach: { name: 'Peach', svg: SVG_ASSETS.peach, growthDays: 5, sellValue: 75, color: '#FFDAB9' },
  pear: { name: 'Pear', svg: SVG_ASSETS.pear, growthDays: 5, sellValue: 70, color: '#DAA520' },
  pepper: { name: 'Pepper', svg: SVG_ASSETS.pepper, growthDays: 3, sellValue: 45, color: '#FF6347' },
  potato: { name: 'Potato', svg: SVG_ASSETS.potato, growthDays: 4, sellValue: 40, color: '#D2691E' },
  pumpkin: { name: 'Pumpkin', svg: SVG_ASSETS.pumpkin, growthDays: 7, sellValue: 100, color: '#FF8C00' },
  radish: { name: 'Radish', svg: SVG_ASSETS.radish, growthDays: 2, sellValue: 30, color: '#FF6347' },
  spinach: { name: 'Spinach', svg: SVG_ASSETS.spinach, growthDays: 2, sellValue: 35, color: '#228B22' },
  strawberry: { name: 'Strawberry', svg: SVG_ASSETS.strawberry, growthDays: 4, sellValue: 65, color: '#DC143C' },
  watermelon: { name: 'Watermelon', svg: SVG_ASSETS.watermelon, growthDays: 8, sellValue: 120, color: '#228B22' },
};

/**
 * Land expansion type definitions with pricing and requirements
 * Each expansion provides different terrain and resources
 */
const LAND_EXPANSION_TYPES = {
  grassland: { name: 'Grassland', svg: SVG_ASSETS.grassland, color: '#90EE90' },
  forest: { name: 'Forest', svg: SVG_ASSETS.forest, color: '#228B22' },
  riverfront: { name: 'Riverfront', svg: SVG_ASSETS.riverfront, color: '#4A90E2' },
  hillside: { name: 'Hillside', svg: SVG_ASSETS.hillside, color: '#8B7355' },
};

/**
 * Building structure definitions with placement costs and descriptions
 * Buildings provide farm infrastructure and storage capabilities
 */
const BUILDING_TYPES = {
  barn: { name: 'Barn', svg: SVG_ASSETS.barn, cost: 200, description: 'Storage for crops' },
  shed: { name: 'Shed', svg: SVG_ASSETS.shed, cost: 150, description: 'Tool storage' },
  house: { name: 'House', svg: SVG_ASSETS.house, cost: 300, description: 'Your home' },
  fence: { name: 'Fence', svg: SVG_ASSETS.fence, cost: 50, description: 'Farm boundary' },
  small_dam: { name: 'Small Dam', svg: SVG_ASSETS.small_dam, cost: 400, description: 'Basic flood protection (2x2 blocks)' },
  medium_dam: { name: 'Medium Dam', svg: SVG_ASSETS.medium_dam, cost: 800, description: 'Better flood protection (3x3 blocks)' },
  large_dam: { name: 'Large Dam', svg: SVG_ASSETS.large_dam, cost: 1500, description: 'Maximum flood protection (4x4 blocks)' },
  // New home types with unique benefits
  cottage: { name: 'Cottage', svg: DemoAssets.getBuildingAsset('cottage'), cost: 200, description: 'Boosts crop growth speed by 10%' },
  ranch_house: { name: 'Ranch House', svg: DemoAssets.getBuildingAsset('ranch_house'), cost: 250, description: 'Increases animal product value by 15%' },
  forest_cabin: { name: 'Forest Cabin', svg: DemoAssets.getBuildingAsset('forest_cabin'), cost: 300, description: 'Reduces tree regrowth time by 20%' },
  victorian_house: { name: 'Victorian House', svg: DemoAssets.getBuildingAsset('victorian_house'), cost: 800, description: 'Generates 50 coins per day' },
  farmhouse: { name: 'Farmhouse', svg: DemoAssets.getBuildingAsset('farmhouse'), cost: 1000, description: 'Increases storage capacity by 50%' },
  lake_house: { name: 'Lake House', svg: DemoAssets.getBuildingAsset('lake_house'), cost: 1200, description: 'Reduces crop water needs by 25%' },
  mansion: { name: 'Mansion', svg: DemoAssets.getBuildingAsset('mansion'), cost: 3000, description: 'Generates 200 coins per day' },
  treehouse_estate: { name: 'Treehouse Estate', svg: DemoAssets.getBuildingAsset('treehouse_estate'), cost: 4000, description: 'Boosts all nearby building efficiency by 30%' },
  beach_villa: { name: 'Beach Villa', svg: DemoAssets.getBuildingAsset('beach_villa'), cost: 5000, description: 'Attracts tourists for special events and bonuses' },
  greenhouse_home: { name: 'Greenhouse Home', svg: DemoAssets.getBuildingAsset('greenhouse_home'), cost: 6000, description: 'Year-round growing regardless of season' },
  windmill_residence: { name: 'Windmill Residence', svg: DemoAssets.getBuildingAsset('windmill_residence'), cost: 7000, description: 'Provides free energy for tools and equipment' },
  wizard_tower: { name: 'Wizard Tower', svg: DemoAssets.getBuildingAsset('wizard_tower'), cost: 10000, description: 'Magical crop bonuses and weather protection' },
};

/**
 * Mining ore deposit definitions with rarity tiers and economic values
 * Ores provide valuable resources through the mining system
 */
const ORE_TYPES = {
  copper: { name: 'Copper', svg: require('../../assets/tiles/dirt.svg'), sellValue: 75, rarity: 'common' },
  silver: { name: 'Silver', svg: require('../../assets/tiles/water.svg'), sellValue: 150, rarity: 'uncommon' },
  gold: { name: 'Gold', svg: require('../../assets/tiles/grass.svg'), sellValue: 300, rarity: 'rare' },
  diamond: { name: 'Diamond', svg: require('../../assets/decorations/lamp.svg'), sellValue: 500, rarity: 'legendary' },
};

/** Type for valid crop options based on CROP_TYPES */
type CropType = keyof typeof CROP_TYPES;

/** Type for valid building options based on BUILDING_TYPES */
type BuildingType = keyof typeof BUILDING_TYPES;

/**
 * Resolve a bundled asset id or an existing URI (data URL from DemoAssets) for canvas drawImage.
 */
const svgCache: { [key: string]: HTMLImageElement | null } = {};

const svgKey = (source: SvgSource): string => String(source);

const svgUri = (source: SvgSource): string => {
  if (typeof source === 'string') {
    return source;
  }
  return RNImage.resolveAssetSource(source)?.uri ?? '';
};

const loadSVG = (source: SvgSource): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const uri = svgUri(source);
    if (!uri) {
      reject(new Error(`SVG asset has no URI: ${svgKey(source)}`));
      return;
    }
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to decode SVG: ${uri}`));
    img.src = uri;
  });
};

const getSVGImage = async (source: SvgSource): Promise<HTMLImageElement | null> => {
  const key = svgKey(source);
  if (svgCache[key]) {
    return svgCache[key];
  }

  try {
    const img = await loadSVG(source);
    svgCache[key] = img;
    return img;
  } catch (error) {
    console.error(`Failed to load SVG: ${key}`, error);
    return null;
  }
};

const cachedSvg = (source: SvgSource | null | undefined): HTMLImageElement | null => {
  if (source == null || source === '') {
    return null;
  }
  return svgCache[svgKey(source)] ?? null;
};

/**
 * Preload bundled SVG assets at component mount.
 */
const preloadCropSVGs = async () => {
  const sources: SvgSource[] = [...Object.values(SVG_ASSETS)];
  for (const stages of Object.values(CROP_GROWTH)) {
    sources.push(stages.seed, stages.sprout, stages.growing, stages.mature, stages.dead);
  }
  for (const ore of Object.values(ORE_TYPES)) {
    sources.push(ore.svg);
  }

  const pending = new Map<string, SvgSource>();
  for (const source of sources) {
    pending.set(svgKey(source), source);
  }

  await Promise.allSettled(
    [...pending.values()].map(async (source) => {
      try {
        await getSVGImage(source);
      } catch (error) {
        console.warn(`Failed to preload SVG: ${svgKey(source)}`);
      }
    })
  );
};

/**
 * Main game screen component - displays the complete game interface
 *
 * Handles:
 * - Farm plot visualization and interaction
 * - Crop planting, watering, and harvesting
 * - Building placement and management
 * - Ore deposit mining
 * - Custom furniture drawing (DrawingScreen modal)
 * - Real-time game rendering and updates
 * - HUD with player stats (coins, level, XP)
 *
 * @param props - Component props
 * @param props.onSave - Callback function when user saves the game
 * @returns React component displaying the game interface
 */
export const GameScreen: React.FC<GameScreenProps> = ({ onSave }) => {
  const {
    world,
    plantCrop,
    harvestCrop,
    waterCrop,
    createFarmPlot,
    addCoins,
    addExperience,
    placeBuilding,
    createOreDeposit,
    mineOre,
    buildDam,
    purchaseLandExpansion,
    getAvailableLandExpansions,
    getPurchasedLandExpansions,
    // Home system functions
    purchaseHome,
    upgradeHome,
    claimHomeBenefits,
    getAvailableHomes,
    getOwnedHomes,
    getTotalHomeBenefits,
    removeHome
  } = useGameStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedAction, setSelectedAction] = useState<'plant' | 'water' | 'harvest' | 'build' | 'mine' | null>(null);
  const [selectedCropType, setSelectedCropType] = useState<CropType>('wheat');
  const [selectedBuildingType, setSelectedBuildingType] = useState<BuildingType>('barn');
  const [showCropSelector, setShowCropSelector] = useState(false);
  const [showBuildingSelector, setShowBuildingSelector] = useState(false);
  const [showLandSelector, setShowLandSelector] = useState(false);
  const [showDrawingScreen, setShowDrawingScreen] = useState(false);
  const [showMarketplace, setShowMarketplace] = useState(false);
  const [gameTime, setGameTime] = useState('6:00 AM');
  const [notification, setNotification] = useState('');
  const [redrawTrigger, setRedrawTrigger] = useState(0);
  const [svgsLoaded, setSvgsLoaded] = useState(false);

  // Preload SVG assets on component mount
  useEffect(() => {
    preloadCropSVGs().then(() => {
      setSvgsLoaded(true);
    });
  }, []);

  // Update game time display
  useEffect(() => {
    const interval = setInterval(() => {
      if (world) {
        const hour = Math.floor(world.dayTime / 60) % 24;
        const minute = Math.floor(world.dayTime % 60);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour % 12 || 12;
        setGameTime(`${displayHour}:${minute.toString().padStart(2, '0')} ${ampm}`);
        setRedrawTrigger((x) => x + 1);
      }
    }, 500);

    return () => clearInterval(interval);
  }, [world?.dayTime]);

  // Grass overgrowth system for SVG rendering
  const getOvergrowthPhase = (daysSinceLastTilled: number) => {
    if (daysSinceLastTilled < 3) return 'fresh';      // Bright green, short grass
    if (daysSinceLastTilled < 7) return 'growing';    // Medium height, darker green
    return 'overgrown';                                // Tall, wild, mixed colors
  };

  // Seasonal visual effects system
  const getSeasonalEffects = (season: string, dayInSeason: number) => {
    const progress = dayInSeason / 30; // 0 to 1 throughout the season

    switch (season) {
      case 'spring':
        return {
          // Flowers gradually increase from day 1 to day 30 (much slower)
          flowerDensity: progress * 0.15, // 0% to 15% chance of flowers per tile
          flowerColors: ['#FF69B4', '#FFB6C1', '#FF1493', '#FFC0CB', '#FF69B4'],
          grassTint: { r: 144, g: 238, b: 144 }, // Light green grass
          skyGradient: ['#87CEEB', '#E0F6FF'], // Light blue sky
          groundTint: { r: 139, g: 195, b: 139 }, // Fresh soil
        };

      case 'summer':
        return {
          // Heat waves gradually increase (much slower)
          heatIntensity: progress * 0.2, // 0% to 20% heat effect
          grassTint: { r: 124, g: 179, b: 66 }, // Darker green grass
          skyGradient: ['#00BFFF', '#87CEFA'], // Bright blue sky
          groundTint: { r: 160, g: 120, b: 80 }, // Dry, sun-baked soil
          heatWave: true,
        };

      case 'fall':
        return {
          // Falling leaves gradually increase (much slower)
          leafDensity: progress * 0.2, // 0% to 20% chance of leaves per tile
          leafColors: ['#D2691E', '#FF8C00', '#FFD700', '#DC143C', '#8B4513'],
          grassTint: { r: 189, g: 183, b: 107 }, // Yellowish grass
          skyGradient: ['#FFA500', '#FFE4B5'], // Orange sunset sky
          groundTint: { r: 139, g: 90, b: 43 }, // Rich autumn soil
        };

      case 'winter':
        return {
          // Snow gradually increases from light dusting to moderate coverage
          snowCoverage: progress * 0.4, // 0% to 40% snow coverage
          snowIntensity: progress * 0.6, // 0% to 60% snow effect
          grassTint: { r: 200, g: 200, b: 200 }, // Grayish dormant grass
          skyGradient: ['#B0C4DE', '#E6E6FA'], // Pale winter sky
          groundTint: { r: 245, g: 245, b: 245 }, // Snow-covered ground
          snow: true,
        };

      default:
        return {
          flowerDensity: 0,
          heatIntensity: 0,
          leafDensity: 0,
          snowCoverage: 0,
          grassTint: { r: 144, g: 238, b: 144 },
          skyGradient: ['#87CEEB', '#E0F6FF'],
          groundTint: { r: 139, g: 69, b: 19 },
        };
    }
  };

  const random = (min: number, max: number, seed: number) => {
    const val = Math.sin(seed) * 43758.5453;
    return min + (val - Math.floor(val)) * (max - min);
  };

  // Flower density calculation per tile
  const getFlowerDensity = (baseDensity: number, seed: number) => {
    // Each tile can have 0-3 flowers based on density and random variation
    const tileChance = random(0, 1, seed);
    if (tileChance < baseDensity) {
      return Math.floor(random(1, 4, seed + 1000)); // 1-3 flowers per tile
    }
    return 0;
  };

  // Get flower SVG based on color
  const getFlowerSvg = (color: string) => {
    switch (color) {
      case '#FF69B4': return SVG_ASSETS.flower_pink;
      case '#FF1493': return SVG_ASSETS.flower_red;
      case '#FFFFFF': return SVG_ASSETS.flower_white;
      case '#FFD700': return SVG_ASSETS.flower_yellow;
      default: return SVG_ASSETS.flower_pink;
    }
  };

  // Draw game world
  useEffect(() => {
    const drawGameWorld = async () => {
      if (!canvasRef.current || !world) return;

      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Clear canvas with gradient background
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      gradient.addColorStop(0, '#E8F4F8');
      gradient.addColorStop(1, '#F0E6D2');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Calculate current season and day in season
      const currentSeason = world?.season || 'spring';
      const dayInSeason = world ? Math.floor(world.totalDaysPlayed % 30) : 0;
      const seasonalEffects = getSeasonalEffects(currentSeason, dayInSeason);

      // Draw seasonal sky
      const skyGradient = ctx.createLinearGradient(0, 0, 0, canvas.height * 0.4);
      skyGradient.addColorStop(0, seasonalEffects.skyGradient[0]);
      skyGradient.addColorStop(1, seasonalEffects.skyGradient[1]);
      ctx.fillStyle = skyGradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height * 0.4);

      // Draw ground with SVG grass system
      const groundY = canvas.height * 0.4;
      const groundHeight = canvas.height * 0.6;
      const grassTileSize = 40; // Size for grass SVG tiles

      // Base ground layer with seasonal tint
      const groundColor = `rgb(${seasonalEffects.groundTint.r}, ${seasonalEffects.groundTint.g}, ${seasonalEffects.groundTint.b})`;
      ctx.fillStyle = groundColor;
      ctx.fillRect(0, groundY, canvas.width, groundHeight);

      // Draw grass tiles with SVG files and overgrowth phases
      const tilesX = Math.ceil(canvas.width / grassTileSize);
      const tilesY = Math.ceil(groundHeight / grassTileSize);

      for (let x = 0; x < tilesX; x++) {
        for (let y = 0; y < tilesY; y++) {
          const pixelX = x * grassTileSize;
          const pixelY = groundY + y * grassTileSize;

          // Calculate overgrowth phase based on game days and position
          const daysSinceStart = world ? Math.floor(world.totalDaysPlayed) : 0;
          const localDays = daysSinceStart + Math.floor((x + y) / 10); // Regional variation
          const overgrowthPhase = getOvergrowthPhase(localDays);

          // Skip some tiles for variety (create bare patches)
          const seed = x * 1000 + y;
          const shouldGrow = random(0, 1, seed) > 0.1;

          if (shouldGrow) {
            // Select appropriate SVG based on overgrowth phase
            let grassSvg = SVG_ASSETS.grass_fresh; // Default fresh grass

            if (overgrowthPhase === 'growing') {
              grassSvg = SVG_ASSETS.grass_growing; // Use tree as taller grass placeholder
            } else if (overgrowthPhase === 'overgrown') {
              grassSvg = SVG_ASSETS.grass_overgrown; // Use tree for overgrown effect
            }

            // Draw grass SVG if loaded, otherwise fallback
            if (svgsLoaded && grassSvg && cachedSvg(grassSvg)) {
              const grassImage = cachedSvg(grassSvg);
              if (grassImage) {
                ctx.save();

                // Apply scaling based on overgrowth phase
                let scale = 1;
                if (overgrowthPhase === 'fresh') scale = 0.8;
                if (overgrowthPhase === 'growing') scale = 1.0;
                if (overgrowthPhase === 'overgrown') scale = 1.2;

                // Apply random rotation for variety
                const rotation = random(0, Math.PI * 2, seed + 100) * 0.1; // Small rotation
                ctx.translate(pixelX + grassTileSize / 2, pixelY + grassTileSize / 2);
                ctx.rotate(rotation);

                // Apply seasonal grass tinting
                const grassTint = `rgb(${seasonalEffects.grassTint.r}, ${seasonalEffects.grassTint.g}, ${seasonalEffects.grassTint.b})`;
                ctx.globalAlpha = 0.6;
                ctx.fillStyle = grassTint;
                ctx.fillRect(-grassTileSize / 2, -grassTileSize / 2, grassTileSize, grassTileSize);

                // Apply overgrowth phase tinting
                if (overgrowthPhase === 'growing') {
                  ctx.globalAlpha = 0.3;
                  ctx.fillStyle = '#7CB342';
                  ctx.fillRect(-grassTileSize / 2, -grassTileSize / 2, grassTileSize, grassTileSize);
                } else if (overgrowthPhase === 'overgrown') {
                  ctx.globalAlpha = 0.4;
                  ctx.fillStyle = '#558B2F';
                  ctx.fillRect(-grassTileSize / 2, -grassTileSize / 2, grassTileSize, grassTileSize);
                }

                ctx.globalAlpha = 0.7;
                ctx.drawImage(grassImage, -grassTileSize / 2, -grassTileSize / 2, grassTileSize * scale, grassTileSize * scale);
                ctx.restore();
              }
            } else {
              // Fallback to colored rectangle when SVG not loaded
              const grassTint = `rgb(${seasonalEffects.grassTint.r}, ${seasonalEffects.grassTint.g}, ${seasonalEffects.grassTint.b})`;
              ctx.fillStyle = grassTint;
              ctx.globalAlpha = 0.7;
              ctx.fillRect(pixelX, pixelY, grassTileSize, grassTileSize);
              ctx.globalAlpha = 1;
            }

            // Add seasonal decorations
            ctx.save();

            // Spring flowers with SVG rendering and density control
            if (currentSeason === 'spring' && seasonalEffects.flowerDensity) {
              const flowerCount = getFlowerDensity(seasonalEffects.flowerDensity, seed + 200);

              for (let i = 0; i < flowerCount; i++) {
                const flowerColor = seasonalEffects.flowerColors ?
                  seasonalEffects.flowerColors[Math.floor(random(0, seasonalEffects.flowerColors.length, seed + 300 + i))] :
                  '#FF69B4';

                const flowerSvg = getFlowerSvg(flowerColor);

                // Try to render flower SVG, fallback to circle
                if (svgsLoaded && flowerSvg && cachedSvg(flowerSvg)) {
                  const flowerImage = cachedSvg(flowerSvg);
                  if (flowerImage) {
                    ctx.save();
                    const flowerX = pixelX + random(8, grassTileSize - 8, seed + 400 + i);
                    const flowerY = pixelY + random(8, grassTileSize - 8, seed + 500 + i);
                    const flowerSize = random(6, 12, seed + 600 + i);
                    const rotation = random(0, Math.PI * 2, seed + 700 + i);

                    ctx.translate(flowerX, flowerY);
                    ctx.rotate(rotation);
                    ctx.globalAlpha = 0.9;
                    ctx.drawImage(flowerImage, -flowerSize / 2, -flowerSize / 2, flowerSize, flowerSize);
                    ctx.restore();
                  }
                } else {
                  // Fallback to colored circle
                  ctx.fillStyle = flowerColor;
                  ctx.globalAlpha = 0.8;
                  ctx.beginPath();
                  ctx.arc(pixelX + random(8, grassTileSize - 8, seed + 400 + i),
                    pixelY + random(8, grassTileSize - 8, seed + 500 + i),
                    random(2, 4, seed + 600 + i), 0, Math.PI * 2);
                  ctx.fill();
                }
              }
            }

            // Fall leaves with SVG rendering
            if (currentSeason === 'autumn' && seasonalEffects.leafDensity) {
              const leafCount = getFlowerDensity(seasonalEffects.leafDensity, seed + 700);

              for (let i = 0; i < leafCount; i++) {
                const leafColor = seasonalEffects.leafColors ?
                  seasonalEffects.leafColors[Math.floor(random(0, seasonalEffects.leafColors.length, seed + 800 + i))] :
                  '#D2691E';

                // Get appropriate leaf SVG based on color
                let leafSvg = SVG_ASSETS.leaf_orange; // default
                if (leafColor === '#DC143C') leafSvg = SVG_ASSETS.leaf_red;
                else if (leafColor === '#FFD700') leafSvg = SVG_ASSETS.leaf_gold;
                else if (leafColor === '#8B4513') leafSvg = SVG_ASSETS.leaf_brown;

                // Try to render leaf SVG, fallback to rectangle
                if (svgsLoaded && leafSvg && cachedSvg(leafSvg)) {
                  const leafImage = cachedSvg(leafSvg);
                  if (leafImage) {
                    ctx.save();
                    const leafX = pixelX + random(8, grassTileSize - 8, seed + 900 + i);
                    const leafY = pixelY + random(8, grassTileSize - 8, seed + 1000 + i);
                    const leafSize = random(8, 14, seed + 1100 + i);
                    const rotation = random(0, Math.PI * 2, seed + 1200 + i);

                    ctx.translate(leafX, leafY);
                    ctx.rotate(rotation);
                    ctx.globalAlpha = 0.8;
                    ctx.drawImage(leafImage, -leafSize / 2, -leafSize / 2, leafSize, leafSize);
                    ctx.restore();
                  }
                } else {
                  // Fallback to rotated rectangle
                  ctx.fillStyle = leafColor;
                  ctx.globalAlpha = 0.7;
                  ctx.save();
                  ctx.translate(pixelX + random(8, grassTileSize - 8, seed + 900 + i),
                    pixelY + random(8, grassTileSize - 8, seed + 1000 + i));
                  ctx.rotate(random(0, Math.PI * 2, seed + 1100 + i));
                  ctx.fillRect(-3, -1.5, 6, 3);
                  ctx.restore();
                }
              }
            }

            // Winter snow with SVG rendering
            if (currentSeason === 'winter' && seasonalEffects.snowCoverage) {
              const snowCount = getFlowerDensity(seasonalEffects.snowCoverage, seed + 1200);

              for (let i = 0; i < snowCount; i++) {
                // Try to render snow flake SVG, fallback to coverage
                if (svgsLoaded && SVG_ASSETS.snow_flake && cachedSvg(SVG_ASSETS.snow_flake)) {
                  const snowImage = cachedSvg(SVG_ASSETS.snow_flake);
                  if (snowImage) {
                    ctx.save();
                    const snowX = pixelX + random(8, grassTileSize - 8, seed + 1300 + i);
                    const snowY = pixelY + random(8, grassTileSize - 8, seed + 1400 + i);
                    const snowSize = random(4, 8, seed + 1500 + i);
                    const rotation = random(0, Math.PI * 2, seed + 1600 + i);

                    ctx.translate(snowX, snowY);
                    ctx.rotate(rotation);
                    ctx.globalAlpha = (seasonalEffects.snowIntensity || 0.5) * 0.8;
                    ctx.drawImage(snowImage, -snowSize / 2, -snowSize / 2, snowSize, snowSize);
                    ctx.restore();
                  }
                } else {
                  // Fallback to snow coverage
                  ctx.fillStyle = '#FFFFFF';
                  ctx.globalAlpha = (seasonalEffects.snowIntensity || 0.5) * 0.6;
                  ctx.fillRect(pixelX, pixelY, grassTileSize, grassTileSize);
                }
              }
            }

            // Summer heat shimmer effect
            if (currentSeason === 'summer' && seasonalEffects.heatWave && seasonalEffects.heatIntensity && random(0, 1, seed + 1300) < seasonalEffects.heatIntensity) {
              ctx.fillStyle = '#FFD700';
              ctx.globalAlpha = 0.1;
              ctx.fillRect(pixelX, pixelY, grassTileSize, grassTileSize);
            }

            ctx.restore();
          }
        }
      }

      const tileSize = 60;
      const startX = 20;
      const startY = 60;

      // Draw farm plots
      world.farmPlots.forEach((plot, idx) => {
        const x = startX + (idx % 4) * (tileSize + 15);
        const y = startY + Math.floor(idx / 4) * (tileSize + 15);

        // Draw plot background
        ctx.fillStyle = plot.tilled ? '#A0826D' : '#90EE90';
        ctx.fillRect(x, y, tileSize, tileSize);

        // Draw border
        ctx.strokeStyle = '#654321';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, tileSize, tileSize);

        // Draw crop or seed
        if (plot.crop) {
          const cropInfo = CROP_TYPES[plot.crop.type as CropType] || CROP_TYPES.wheat;
          const growth = CROP_GROWTH[plot.crop.type];
          let cropColor = '#FFD700';
          let cropSvg: SvgSource | null = null;

          switch (plot.crop.stage) {
            case CropStage.SEED:
              cropColor = '#8B4513';
              cropSvg = growth?.seed ?? null;
              break;
            case CropStage.SPROUTING:
              cropColor = '#90EE90';
              cropSvg = growth?.sprout ?? null;
              break;
            case CropStage.GROWING:
              cropColor = '#7CB342';
              cropSvg = growth?.growing ?? null;
              break;
            case CropStage.MATURE:
              cropColor = cropInfo.color;
              cropSvg = growth?.mature ?? null;
              break;
            case CropStage.HARVESTABLE:
              cropColor = cropInfo.color;
              cropSvg = cropInfo.svg;
              break;
            case CropStage.DEAD:
              cropColor = '#8B4513';
              cropSvg = growth?.dead ?? null;
              break;
          }

          // Apply stage-specific visual effects
          let scale = 1;
          let alpha = 1;

          if (plot.crop.stage === CropStage.SEED) {
            scale = 0.6; // Smaller for seeds
          } else if (plot.crop.stage === CropStage.SPROUTING) {
            scale = 0.8; // Medium for sprouts
          } else if (plot.crop.stage === CropStage.HARVESTABLE) {
            // Add pulsing effect for harvestable crops
            alpha = 0.8 + Math.sin(Date.now() / 500) * 0.2;
          }

          alpha *= Math.max(0.5, plot.crop.health / 100); // Apply health fading

          // Draw crop using SVG or fallback
          if (svgsLoaded && cropSvg) {
            const cropImage = cachedSvg(cropSvg);
            if (cropImage) {
              ctx.save();
              ctx.globalAlpha = alpha;

              // Calculate scaled dimensions and position
              const scaledSize = (tileSize - 16) * scale;
              const offset = (tileSize - scaledSize) / 2;

              ctx.drawImage(cropImage, x + offset, y + offset, scaledSize, scaledSize);
              ctx.restore();
            } else {
              // Fallback to colored circle if SVG not loaded
              ctx.fillStyle = cropColor;
              ctx.globalAlpha = alpha;
              ctx.beginPath();
              ctx.arc(x + tileSize / 2, y + tileSize / 2, (tileSize / 3) * scale, 0, Math.PI * 2);
              ctx.fill();

              // Add crop type indicator
              ctx.fillStyle = '#FFFFFF';
              ctx.font = `${10 * scale}px Arial`;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText(plot.crop.type.charAt(0).toUpperCase(), x + tileSize / 2, y + tileSize / 2);
            }
          } else {
            // Fallback when SVGs not loaded yet
            ctx.fillStyle = cropColor;
            ctx.globalAlpha = alpha;
            ctx.beginPath();
            ctx.arc(x + tileSize / 2, y + tileSize / 2, (tileSize / 3) * scale, 0, Math.PI * 2);
            ctx.fill();

            // Add crop type indicator
            ctx.fillStyle = '#FFFFFF';
            ctx.font = `${10 * scale}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(plot.crop.type.charAt(0).toUpperCase(), x + tileSize / 2, y + tileSize / 2);
          }

          // Draw health bar
          const healthPercent = plot.crop.health / 100;
          ctx.fillStyle = '#FF4444';
          ctx.fillRect(x + 5, y + tileSize - 8, tileSize - 10, 4);
          ctx.fillStyle = healthPercent > 0.5 ? '#44FF44' : '#FFAA44';
          ctx.fillRect(x + 5, y + tileSize - 8, (tileSize - 10) * healthPercent, 4);

          // Draw water level
          ctx.fillStyle = '#4A90E2';
          ctx.fillRect(x + 5, y + tileSize - 4, tileSize - 10, 2);
          ctx.fillStyle = '#2E5C8A';
          ctx.fillRect(x + 5, y + tileSize - 4, ((tileSize - 10) * plot.crop.waterLevel) / 100, 2);
        } else {
          // Empty plot
          ctx.fillStyle = '#8B7355';
          ctx.font = '20px Arial';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('EMPTY', x + tileSize / 2, y + tileSize / 2);
        }
      });

      // Draw buildings
      world.buildings.forEach((building) => {
        const buildingInfo = BUILDING_TYPES[building.type as BuildingType];
        if (!buildingInfo) return;

        const x = 320 + (building.position.x % 100) * 2;
        const y = 100 + (building.position.y % 100) * 1.5;

        // Draw building background
        ctx.fillStyle = '#D4A574';
        ctx.fillRect(x, y, 40, 40);

        // Draw building border
        ctx.strokeStyle = '#8B4513';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, 40, 40);

        // Draw building using SVG or fallback
        const buildingImage = cachedSvg(buildingInfo.svg);
        if (svgsLoaded && buildingImage) {
          ctx.save();
          ctx.drawImage(buildingImage, x + 5, y + 5, 30, 30);
          ctx.restore();
        } else {
          // Fallback to colored rectangle
          ctx.fillStyle = building.type.includes('dam') ? '#4169E1' : '#8B4513';
          ctx.fillRect(x + 5, y + 5, 30, 30);

          // Add building type indicator
          ctx.fillStyle = '#FFFFFF';
          ctx.font = 'bold 12px Arial';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          const buildingInitial = building.type.charAt(0).toUpperCase();
          ctx.fillText(buildingInitial, x + 20, y + 20);
        }

        // Draw building name on hover (optional label)
        ctx.font = '10px Arial';
        ctx.fillStyle = '#654321';
        ctx.fillText(buildingInfo.name, x + 20, y + 38);
      });

      // Draw ore deposits
      world.oreDeposits.forEach((deposit) => {
        const oreInfo = ORE_TYPES[deposit.oreType as keyof typeof ORE_TYPES];
        if (!oreInfo) return;

        const x = 80 + (deposit.position.x % 100) * 1.8;
        const y = 150 + (deposit.position.y % 100) * 1.2;

        // Draw ore deposit background
        ctx.fillStyle = '#555555';
        ctx.fillRect(x, y, 35, 35);

        // Draw ore deposit border
        ctx.strokeStyle = '#222222';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, 35, 35);

        // Draw ore using SVG or fallback
        const oreImage = cachedSvg(oreInfo.svg);
        if (svgsLoaded && oreImage) {
          ctx.save();
          ctx.drawImage(oreImage, x + 5, y + 5, 25, 25);
          ctx.restore();
        } else {
          // Fallback to colored circles
          const oreColors: { [key: string]: string } = {
            copper: '#D2691E',
            silver: '#C0C0C0',
            gold: '#FFD700',
            diamond: '#B9F2FF',
          };

          ctx.fillStyle = oreColors[deposit.oreType] || '#888888';
          ctx.beginPath();
          ctx.arc(x + 17.5, y + 17.5, 12, 0, Math.PI * 2);
          ctx.fill();

          // Add ore type initial
          ctx.fillStyle = '#FFFFFF';
          ctx.font = 'bold 10px Arial';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(deposit.oreType.charAt(0).toUpperCase(), x + 17.5, y + 17.5);
        }

        // Draw depth indicator
        ctx.font = '8px Arial';
        ctx.fillStyle = '#AAAAAA';
        ctx.fillText(`D${deposit.depth}`, x + 17.5, y + 32);
      });

      // Draw land expansions
      world.landExpansions.forEach((expansion) => {
        const expansionType = LAND_EXPANSION_TYPES[expansion.type as keyof typeof LAND_EXPANSION_TYPES];
        if (!expansionType) return;

        const x = 200 + (expansion.position.x % 100) * 1.5;
        const y = 50 + (expansion.position.y % 100) * 1.5;

        // Draw expansion background
        if (expansion.purchased) {
          ctx.fillStyle = expansionType.color + '40'; // Transparent version
          ctx.fillRect(x, y, expansion.size.x * 3, expansion.size.y * 3);

          ctx.strokeStyle = expansionType.color;
          ctx.lineWidth = 2;
          ctx.strokeRect(x, y, expansion.size.x * 3, expansion.size.y * 3);

          // Draw expansion using SVG or fallback
          const expansionImage = cachedSvg(expansionType.svg);
          if (svgsLoaded && expansionImage) {
            ctx.save();
            ctx.drawImage(expansionImage, x + 5, y + 5, expansion.size.x * 3 - 10, expansion.size.y * 3 - 10);
            ctx.restore();
          } else {
            // Fallback to text
            ctx.font = 'bold 20px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(expansionType.name.substring(0, 8), x + (expansion.size.x * 3) / 2, y + (expansion.size.y * 3) / 2);
          }

          // Draw "OWNED" text
          ctx.font = 'bold 10px Arial';
          ctx.fillStyle = '#228B22';
          ctx.fillText('OWNED', x + (expansion.size.x * 3) / 2, y + (expansion.size.y * 3) - 5);
        } else {
          // Draw unpurchased expansion with lock
          ctx.fillStyle = '#CCCCCC40';
          ctx.fillRect(x, y, expansion.size.x * 3, expansion.size.y * 3);

          ctx.strokeStyle = '#CCCCCC';
          ctx.lineWidth = 1;
          ctx.setLineDash([5, 5]);
          ctx.strokeRect(x, y, expansion.size.x * 3, expansion.size.y * 3);
          ctx.setLineDash([]);

          // Draw lock text
          ctx.font = 'bold 12px Arial';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('LOCK', x + (expansion.size.x * 3) / 2, y + (expansion.size.y * 3) / 2);
        }
      });

    };

    drawGameWorld();
  }, [world?.farmPlots, world?.buildings, world?.oreDeposits, world?.player, redrawTrigger, svgsLoaded]);

  const handlePlotClick = (plotIndex: number) => {
    if (!world) return;
    const plot = world.farmPlots[plotIndex];
    if (!plot) return;

    if (selectedAction === 'plant' && !plot.crop) {
      plantCrop(plot.id, selectedCropType);
      const cropInfo = CROP_TYPES[selectedCropType];
      setNotification(`Planted ${cropInfo.name} seed!`);
      addExperience(10);
      setSelectedAction(null);
      setShowCropSelector(false);
      setTimeout(() => setNotification(''), 2000);
    } else if (selectedAction === 'water' && plot.crop) {
      waterCrop(plot.id);
      setNotification('Watered crop!');
      addExperience(5);
      setSelectedAction(null);
      setTimeout(() => setNotification(''), 2000);
    } else if (selectedAction === 'harvest' && plot.crop && plot.crop.stage === CropStage.HARVESTABLE) {
      const cropInfo = CROP_TYPES[plot.crop.type as CropType] || CROP_TYPES.wheat;
      harvestCrop(plot.id);
      addCoins(cropInfo.sellValue);
      addExperience(25);
      setNotification(`Harvested ${plot.crop.type}! +${cropInfo.sellValue} coins!`);
      setSelectedAction(null);
      setTimeout(() => setNotification(''), 2000);
    } else if (selectedAction === 'build') {
      handleBuildingPlacement();
    }
  };

  const handleBuildingPlacement = () => {
    if (!world) return;

    const buildingInfo = BUILDING_TYPES[selectedBuildingType];
    if (world.player.coins < buildingInfo.cost) {
      setNotification(`Not enough coins! Need ${buildingInfo.cost}, have ${world.player.coins}`);
      setTimeout(() => setNotification(''), 2000);
      return;
    }

    // Check if this is a dam building
    const isDam = selectedBuildingType.includes('dam');

    if (isDam) {
      // Handle dam building with special properties
      const damSize = selectedBuildingType === 'small_dam' ? 2 :
        selectedBuildingType === 'medium_dam' ? 3 : 4;
      const protectionLevel = selectedBuildingType === 'small_dam' ? 1 :
        selectedBuildingType === 'medium_dam' ? 3 : 5;
      const maxFloodLevel = protectionLevel * 2;

      const dam: DamBuilding = {
        id: `dam_${Date.now()}`,
        type: selectedBuildingType as 'small_dam' | 'medium_dam' | 'large_dam',
        position: { x: Math.random() * 100, y: Math.random() * 100, z: 0 },
        rotation: 0,
        protectionLevel,
        integrity: 100,
        maxFloodLevel,
        protectedAreas: [], // Will be calculated by store
        size: { x: damSize, y: damSize },
        operational: true,
        unlocked: true,  // Added missing property
        level: 1,        // Added missing property
        spriteId: selectedBuildingType // Added missing property
      };

      placeBuilding({
        id: dam.id,
        type: selectedBuildingType,
        position: dam.position,
        rotation: 0,
        unlocked: true,
        level: 1,
        spriteId: selectedBuildingType,
      });

      buildDam(dam);
    } else {
      // Handle regular buildings
      const newBuilding = {
        id: `building_${Date.now()}`,
        type: selectedBuildingType,
        position: { x: Math.random() * 100, y: Math.random() * 100, z: 0 },
        rotation: 0,
        unlocked: true,
        level: 1,
        spriteId: selectedBuildingType,
      };

      placeBuilding(newBuilding);
    }

    addCoins(-buildingInfo.cost);
    addExperience(15);
    setNotification(`Built ${buildingInfo.name}! -${buildingInfo.cost} coins`);
    setSelectedAction(null);
    setShowBuildingSelector(false);
    setTimeout(() => setNotification(''), 2000);
  };

  const handleMining = () => {
    if (!world || world.oreDeposits.length === 0) {
      setNotification('No ore deposits found! Create one first.');
      setTimeout(() => setNotification(''), 2000);
      return;
    }

    // Mine from a random deposit
    const deposit = world.oreDeposits[Math.floor(Math.random() * world.oreDeposits.length)];
    if (deposit) {
      mineOre(deposit.id);
      const oreInfo = ORE_TYPES[deposit.oreType as keyof typeof ORE_TYPES] || ORE_TYPES.copper;
      addCoins(oreInfo.sellValue);
      addExperience(20);
      setNotification(`Mined ${oreInfo.name}! +${oreInfo.sellValue} coins`);
      setSelectedAction(null);
      setTimeout(() => setNotification(''), 2000);
    }
  };

  const getWeatherEmoji = (weather: string) => {
    switch (weather) {
      case 'drought': return 'DRY';
      case 'flood': return 'FLOOD';
      case 'rain': return 'RAIN';
      case 'storm': return 'STORM';
      default: return 'SUN';
    }
  };

  const getWeatherWarning = () => {
    if (!world) return '';
    const event = world.activeWeatherEvents.find(e => e.active);
    if (!event) return '';

    const severityText = event.severity <= 2 ? 'Mild' : event.severity <= 4 ? 'Moderate' : 'Severe';
    return `${severityText} ${event.type.toUpperCase()}! Protection: ${world.damBuildings.filter(d => d.operational).length} dams`;
  };

  const handleCreateOreDeposit = () => {
    const oreTypes = Object.keys(ORE_TYPES);
    const randomOreType = oreTypes[Math.floor(Math.random() * oreTypes.length)];
    const randomDepth = Math.floor(Math.random() * 5) + 1;

    createOreDeposit(
      { x: Math.random() * 100, y: Math.random() * 100 },
      randomOreType,
      randomDepth
    );

    const oreInfo = ORE_TYPES[randomOreType as keyof typeof ORE_TYPES];
    setNotification(`Ore deposit created: ${oreInfo.name} (Depth: ${randomDepth})`);
    setTimeout(() => setNotification(''), 2000);
  };

  const handleLandPurchase = (expansionId: string) => {
    if (!world) return;

    const availableExpansions = getAvailableLandExpansions();
    const expansion = availableExpansions.find(e => e.id === expansionId);

    if (!expansion) {
      setNotification('Expansion not available!');
      setTimeout(() => setNotification(''), 2000);
      return;
    }

    if (world.player.coins < expansion.cost) {
      setNotification(`Not enough coins! Need ${expansion.cost}, have ${world.player.coins}`);
      setTimeout(() => setNotification(''), 2000);
      return;
    }

    if (world.player.level < expansion.requiredLevel) {
      setNotification(`Level ${expansion.requiredLevel} required! You are level ${world.player.level}`);
      setTimeout(() => setNotification(''), 2000);
      return;
    }

    purchaseLandExpansion(expansionId);
    const expansionType = LAND_EXPANSION_TYPES[expansion.type as keyof typeof LAND_EXPANSION_TYPES];
    setNotification(`Purchased ${expansion.name}! -${expansion.cost} coins`);
    addExperience(50);
    setShowLandSelector(false);
    setTimeout(() => setNotification(''), 3000);
  };

  const handleNewPlot = () => {
    if (!world || world.farmPlots.length >= 12) return;
    createFarmPlot({ x: Math.random() * 100, y: Math.random() * 100 });
    setNotification('New farm plot created!');
    setTimeout(() => setNotification(''), 2000);
  };

  if (!world) {
    return (
      <View style={styles.container}>
        <Text>Loading game...</Text>
      </View>
    );
  }

  return (
    <View style={styles.gameContainer}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Cozy Haven</Text>
          <Text style={styles.time}>{gameTime}</Text>
          {world && (
            <Text style={styles.weather}>
              {getWeatherEmoji(world.currentWeather)} {world.currentWeather.toUpperCase()}
            </Text>
          )}
        </View>
        <View style={styles.stats}>
          <Text style={styles.statText}>Coins {world?.player.coins}</Text>
          <Text style={styles.statText}>Lvl {world?.player.level}</Text>
          <Text style={styles.statText}>XP {Math.floor(world?.player.experience / 100)}</Text>
          {world && world.damBuildings.length > 0 && (
            <Text style={styles.statText}>{world.damBuildings.length} Dams</Text>
          )}
        </View>
      </View>

      {notification ? <Text style={styles.notification}>{notification}</Text> : null}

      {world && world.activeWeatherEvents.some(e => e.active) && (
        <Text style={styles.weatherWarning}>
          {getWeatherWarning()}
        </Text>
      )}

      {!svgsLoaded && (
        <Text style={styles.loadingIndicator}>
          Loading assets...
        </Text>
      )}

      <View style={styles.canvasContainer}>
        <canvas
          ref={canvasRef}
          width={SCREEN_WIDTH - 20}
          height={400}
          style={{
            border: '2px solid #8B4513',
            borderRadius: '8px',
            display: 'block',
          }}
        />
      </View>

      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.button, selectedAction === 'plant' && styles.buttonActive]}
          onPress={() => {
            if (selectedAction === 'plant') {
              setSelectedAction(null);
              setShowCropSelector(false);
            } else {
              setSelectedAction('plant');
              setShowCropSelector(true);
            }
          }}
        >
          <Text style={styles.buttonText}>Plant</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, selectedAction === 'water' && styles.buttonActive]}
          onPress={() => setSelectedAction(selectedAction === 'water' ? null : 'water')}
        >
          <Text style={styles.buttonText}>Water</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, selectedAction === 'harvest' && styles.buttonActive]}
          onPress={() => setSelectedAction(selectedAction === 'harvest' ? null : 'harvest')}
        >
          <Text style={styles.buttonText}>Harvest</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, selectedAction === 'build' && styles.buttonActive]}
          onPress={() => {
            if (selectedAction === 'build') {
              setSelectedAction(null);
              setShowBuildingSelector(false);
            } else {
              setSelectedAction('build');
              setShowBuildingSelector(true);
            }
          }}
        >
          <Text style={styles.buttonText}>Build</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.actionButtons}>
        <TouchableOpacity style={styles.button} onPress={handleNewPlot}>
          <Text style={styles.buttonText}>New Plot</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={handleCreateOreDeposit}>
          <Text style={styles.buttonText}>Create Ore</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={handleMining}>
          <Text style={styles.buttonText}>Mine</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.actionButtons}>
        <TouchableOpacity style={styles.button} onPress={() => setShowDrawingScreen(true)}>
          <Text style={styles.buttonText}>Draw</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={() => setShowMarketplace(true)}>
          <Text style={styles.buttonText}>🏪 Market</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={onSave}>
          <Text style={styles.buttonText}>Save</Text>
        </TouchableOpacity>
      </View>

      {showCropSelector && selectedAction === 'plant' && (
        <View style={styles.cropSelector}>
          <Text style={styles.cropSelectorTitle}>Choose a crop to plant:</Text>
          <View style={styles.cropGrid}>
            {(Object.entries(CROP_TYPES) as Array<[CropType, typeof CROP_TYPES['wheat']]>).map(([cropType, cropInfo]) => (
              <TouchableOpacity
                key={cropType}
                style={[
                  styles.cropOption,
                  selectedCropType === cropType && styles.cropOptionSelected,
                ]}
                onPress={() => setSelectedCropType(cropType)}
              >
                <Text style={styles.cropEmoji}>{cropInfo.name.substring(0, 1)}</Text>
                <Text style={styles.cropName}>{cropInfo.name}</Text>
                <Text style={styles.cropDetails}>{cropInfo.growthDays}d • ${cropInfo.sellValue}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {showBuildingSelector && selectedAction === 'build' && (
        <View style={styles.buildingSelector}>
          <Text style={styles.buildingSelectorTitle}>Choose a building to build:</Text>
          <View style={styles.buildingGrid}>
            {(Object.entries(BUILDING_TYPES) as Array<[BuildingType, typeof BUILDING_TYPES['barn']]>).map(([buildingType, buildingInfo]) => {
              const canAfford = world && world.player.coins >= buildingInfo.cost;
              return (
                <TouchableOpacity
                  key={buildingType}
                  style={[
                    styles.buildingOption,
                    selectedBuildingType === buildingType && styles.buildingOptionSelected,
                    !canAfford && styles.buildingOptionDisabled,
                  ]}
                  onPress={() => canAfford && setSelectedBuildingType(buildingType)}
                  disabled={!canAfford}
                >
                  <Text style={styles.buildingEmoji}>{buildingInfo.name.substring(0, 2)}</Text>
                  <Text style={styles.buildingName}>{buildingInfo.name}</Text>
                  <Text style={styles.buildingDetails}>${buildingInfo.cost} • {buildingInfo.description}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      <View style={styles.plotGrid}>
        {world.farmPlots.map((plot, idx) => (
          <TouchableOpacity
            key={plot.id}
            style={[
              styles.plotButton,
              plot.crop && styles.plotWithCrop,
              plot.crop?.stage === CropStage.HARVESTABLE && styles.plotHarvestable,
            ]}
            onPress={() => handlePlotClick(idx)}
          >
            <Text style={styles.plotEmoji}>
              {!plot.crop ? 'EMPTY' : plot.crop.stage === CropStage.HARVESTABLE ? '✓' : '○'}
            </Text>
            <Text style={styles.plotIndex}>#{idx + 1}</Text>
            {plot.crop && <Text style={styles.plotHealth}>HP {Math.round(plot.crop.health)}</Text>}
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.inventoryContainer}>
        <Text style={styles.inventoryTitle}>
          Inventory ({world.player.inventory.length} items)
        </Text>
        {world.player.inventory.length === 0 ? (
          <Text style={styles.emptyInventory}>No items yet. Plant and harvest crops!</Text>
        ) : (
          <ScrollView style={styles.inventoryScroll} horizontal showsHorizontalScrollIndicator={false}>
            {world.player.inventory.map((item) => (
              <View key={item.id} style={styles.inventoryItem}>
                <Text style={styles.inventoryItemText}>{item.name}</Text>
                <Text style={styles.inventoryCount}>×{item.quantity}</Text>
                <Text style={styles.inventoryValue}>${item.sellValue}</Text>
              </View>
            ))}
          </ScrollView>
        )}
      </View>

      <View style={styles.tipsContainer}>
        <Text style={styles.tipsTitle}>Tips:</Text>
        <Text style={styles.tipsText}>• Each plot shows health (red bar) and water level (blue bar)</Text>
        <Text style={styles.tipsText}>• Keep crops watered and healthy to harvest</Text>
        <Text style={styles.tipsText}>• Ready crops are ready to harvest!</Text>
      </View>

      {showLandSelector && (
        <View style={styles.landSelector}>
          <Text style={styles.landSelectorTitle}>Buy Land Expansion</Text>
          <ScrollView style={styles.landScroll} horizontal showsHorizontalScrollIndicator={false}>
            {getAvailableLandExpansions().map((expansion) => {
              const expansionType = LAND_EXPANSION_TYPES[expansion.type as keyof typeof LAND_EXPANSION_TYPES];
              const canAfford = world && world.player.coins >= expansion.cost;
              const meetsLevelReq = world && world.player.level >= expansion.requiredLevel;

              return (
                <TouchableOpacity
                  key={expansion.id}
                  style={[
                    styles.landOption,
                    !canAfford && styles.landOptionDisabled,
                    !meetsLevelReq && styles.landOptionDisabled,
                  ]}
                  onPress={() => canAfford && meetsLevelReq && handleLandPurchase(expansion.id)}
                  disabled={!canAfford || !meetsLevelReq}
                >
                  <Text style={styles.landEmoji}>{expansionType?.name.substring(0, 2) || 'LND'}</Text>
                  <Text style={styles.landName}>{expansion.name}</Text>
                  <Text style={styles.landSize}>{expansion.size.x}×{expansion.size.y} plots</Text>
                  <Text style={styles.landDescription}>{expansion.description}</Text>
                  <Text style={styles.landCost}>Cost: {expansion.cost}</Text>
                  <Text style={styles.landLevelReq}>Level {expansion.requiredLevel}</Text>
                  {!canAfford && <Text style={styles.landError}>Not enough coins</Text>}
                  {!meetsLevelReq && <Text style={styles.landError}>Level too low</Text>}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setShowLandSelector(false)}
          >
            <Text style={styles.closeButtonText}>X Close</Text>
          </TouchableOpacity>
        </View>
      )}

      {showDrawingScreen && (
        <Modal
          transparent={false}
          animationType="slide"
          visible={showDrawingScreen}
          onRequestClose={() => setShowDrawingScreen(false)}
        >
          <DrawingScreen onClose={() => setShowDrawingScreen(false)} />
        </Modal>
      )}

      <MarketplaceScreen
        visible={showMarketplace}
        onClose={() => setShowMarketplace(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  gameContainer: {
    flex: 1,
    backgroundColor: '#FFF8DC',
    padding: 10,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF8DC',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#F0E6D2',
    borderRadius: 8,
    marginBottom: 10,
  },
  canvasContainer: {
    marginVertical: 10,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#8B4513',
  },
  time: {
    fontSize: 12,
    color: '#A0826D',
    marginTop: 4,
  },
  weather: {
    fontSize: 11,
    color: '#4A90E2',
    marginTop: 2,
    fontWeight: '600',
  },
  stats: {
    flexDirection: 'row',
    gap: 15,
  },
  statText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8B4513',
  },
  notification: {
    backgroundColor: '#90EE90',
    color: '#2D5016',
    padding: 8,
    borderRadius: 4,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  weatherWarning: {
    backgroundColor: '#FFB74D',
    color: '#8B4513',
    padding: 6,
    borderRadius: 4,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  loadingIndicator: {
    backgroundColor: '#E3F2FD',
    color: '#1976D2',
    padding: 6,
    borderRadius: 4,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 10,
    gap: 5,
  },
  button: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#D4A574',
    borderRadius: 6,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    flex: 1,
  },
  buttonActive: {
    borderColor: '#8B4513',
    backgroundColor: '#E8C4A0',
  },
  buttonEmoji: {
    fontSize: 18,
    marginBottom: 2,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 11,
  },
  plotGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 5,
    marginVertical: 10,
  },
  plotButton: {
    width: '30%',
    aspectRatio: 1,
    backgroundColor: '#E8D7C3',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#A0826D',
  },
  plotWithCrop: {
    backgroundColor: '#D4E8D4',
    borderColor: '#7CB342',
  },
  plotHarvestable: {
    backgroundColor: '#FFE5B4',
    borderColor: '#FFD700',
    borderWidth: 3,
  },
  plotEmoji: {
    fontSize: 24,
  },
  plotIndex: {
    fontSize: 10,
    color: '#666',
    marginTop: 2,
  },
  plotHealth: {
    fontSize: 9,
    color: '#FF4444',
    marginTop: 2,
  },
  inventoryContainer: {
    backgroundColor: '#F0E6D2',
    borderRadius: 8,
    padding: 10,
    marginVertical: 10,
  },
  inventoryTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8B4513',
    marginBottom: 8,
  },
  emptyInventory: {
    fontSize: 12,
    color: '#A0826D',
    fontStyle: 'italic',
    paddingVertical: 8,
  },
  inventoryScroll: {
    maxHeight: 80,
  },
  inventoryItem: {
    backgroundColor: '#D4A574',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    marginRight: 10,
    minWidth: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inventoryItemText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFF',
  },
  inventoryCount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFD700',
  },
  inventoryValue: {
    fontSize: 10,
    color: '#E8D5C4',
  },
  tipsContainer: {
    backgroundColor: '#F5DEB3',
    borderRadius: 6,
    padding: 8,
    marginVertical: 8,
  },
  tipsTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#8B4513',
    marginBottom: 4,
  },
  tipsText: {
    fontSize: 10,
    color: '#654321',
    marginVertical: 2,
  },
  cropSelector: {
    backgroundColor: '#F0E6D2',
    borderRadius: 8,
    padding: 12,
    marginVertical: 10,
    borderWidth: 2,
    borderColor: '#8B4513',
  },
  cropSelectorTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#8B4513',
    marginBottom: 10,
    textAlign: 'center',
  },
  cropGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    gap: 8,
  },
  cropOption: {
    width: '22%',
    backgroundColor: '#E8D7C3',
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#A0826D',
  },
  cropOptionSelected: {
    backgroundColor: '#D4A574',
    borderColor: '#8B4513',
    borderWidth: 3,
  },
  cropEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  cropName: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#8B4513',
    marginBottom: 2,
  },
  cropDetails: {
    fontSize: 9,
    color: '#A0826D',
  },
  buildingSelector: {
    backgroundColor: '#F0E6D2',
    borderRadius: 8,
    padding: 12,
    marginVertical: 10,
    borderWidth: 2,
    borderColor: '#8B4513',
  },
  buildingSelectorTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#8B4513',
    marginBottom: 10,
    textAlign: 'center',
  },
  buildingGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    gap: 8,
  },
  buildingOption: {
    width: '22%',
    backgroundColor: '#E8D7C3',
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#A0826D',
  },
  buildingOptionSelected: {
    backgroundColor: '#D4A574',
    borderColor: '#8B4513',
    borderWidth: 3,
  },
  buildingOptionDisabled: {
    opacity: 0.5,
    backgroundColor: '#CCCCCC',
  },
  buildingEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  buildingName: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#8B4513',
    marginBottom: 2,
  },
  buildingDetails: {
    fontSize: 9,
    color: '#A0826D',
  },
  landSelector: {
    backgroundColor: '#F0E6D2',
    borderRadius: 8,
    padding: 12,
    marginVertical: 10,
    borderWidth: 2,
    borderColor: '#8B4513',
  },
  landSelectorTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#8B4513',
    marginBottom: 10,
    textAlign: 'center',
  },
  landScroll: {
    maxHeight: 200,
    marginBottom: 10,
  },
  landOption: {
    backgroundColor: '#E8D7C3',
    borderRadius: 8,
    padding: 12,
    marginRight: 10,
    minWidth: 150,
    borderWidth: 2,
    borderColor: '#A0826D',
    alignItems: 'center',
  },
  landOptionDisabled: {
    opacity: 0.5,
    backgroundColor: '#CCCCCC',
  },
  landEmoji: {
    fontSize: 32,
    marginBottom: 4,
  },
  landName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#8B4513',
    marginBottom: 2,
  },
  landSize: {
    fontSize: 12,
    color: '#654321',
    marginBottom: 2,
  },
  landDescription: {
    fontSize: 10,
    color: '#A0826D',
    marginBottom: 4,
    textAlign: 'center',
  },
  landCost: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#228B22',
    marginBottom: 2,
  },
  landLevelReq: {
    fontSize: 11,
    color: '#4A90E2',
    marginBottom: 2,
  },
  landError: {
    fontSize: 9,
    color: '#DC143C',
    marginTop: 2,
  },
  closeButton: {
    backgroundColor: '#D4A574',
    borderRadius: 6,
    padding: 8,
    alignItems: 'center',
    alignSelf: 'center',
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
});
