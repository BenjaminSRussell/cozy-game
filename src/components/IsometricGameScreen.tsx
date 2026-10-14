/**
 * 2.5D Isometric Game Screen with Voxel Rendering
 * 
 * Beautiful isometric 3D view for your cozy farming game
 */

import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Alert } from 'react-native';
import { useGameStore } from '../store/gameStore';
import { CropStage, ToolType } from '../types/game';
import { IsometricRenderer } from '../rendering/IsometricRenderer';
import { TextureManager } from '../rendering/TextureManager';
import { AssetManager } from '../systems/AssetManager';
import { CraftingMenu } from './CraftingMenu';
import { theme } from '../styles/theme';
import { CozyIconButton } from './CozyIconButton';
import { clearNotificationTimer, scheduleNotificationHide, type NotificationTimerId } from './notificationTimer';

const SCREEN_WIDTH = Dimensions.get('window').width;

interface IsometricGameScreenProps {
  onSave: () => void;
}

export const IsometricGameScreen: React.FC<IsometricGameScreenProps> = ({ onSave }) => {
  const {
    world, plantCrop, harvestCrop, waterCrop, createFarmPlot, addCoins, addExperience,
    placeBuilding, createOreDeposit, mineOre,
    buildRoad, upgradeRoad, spawnVehicle, mountVehicle, dismountVehicle, movePlayer, applyFertilizer
  } = useGameStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<IsometricRenderer | null>(null);
  const [selectedAction, setSelectedAction] = useState<'plant' | 'water' | 'harvest' | 'build' | 'mine' | 'build_road' | 'spawn_vehicle' | 'fertilize' | null>(null);
  const [selectedCropType, setSelectedCropType] = useState<'wheat' | 'carrot' | 'tomato' | 'apple'>('wheat');
  const [selectedFertilizerType, setSelectedFertilizerType] = useState<'speed' | 'quality' | 'water'>('speed');
  const [selectedBuildingType, setSelectedBuildingType] = useState<'barn' | 'shed' | 'house'>('barn');
  const [selectedRoadType, setSelectedRoadType] = useState<'gravel' | 'paved'>('gravel');
  const [selectedVehicleType, setSelectedVehicleType] = useState<'tractor' | 'truck'>('tractor');
  const [notification, setNotification] = useState('');
  const notificationTimerRef = useRef<NotificationTimerId>(null);
  const [cameraOffset, setCameraOffset] = useState({ x: 0, y: 0 });
  const [showCrafting, setShowCrafting] = useState(false);

  const showNotification = (msg: string, durationMs = 2000) => {
    setNotification(msg);
    notificationTimerRef.current = scheduleNotificationHide(
      notificationTimerRef.current,
      () => setNotification(''),
      durationMs,
    );
  };

  useEffect(() => {
    return () => {
      clearNotificationTimer(notificationTimerRef.current);
    };
  }, []);

  const CROP_TYPES = {
    wheat: { name: 'Wheat', emoji: '🌾', growthDays: 3, sellValue: 50, color: '#DAA520' },
    carrot: { name: 'Carrot', emoji: '🥕', growthDays: 2, sellValue: 40, color: '#FF8C00' },
    tomato: { name: 'Tomato', emoji: '🍅', growthDays: 4, sellValue: 60, color: '#DC143C' },
    apple: { name: 'Apple Tree', emoji: '🍎', growthDays: 5, sellValue: 100, color: '#D32F2F' },
  };

  const BUILDING_TYPES = {
    barn: { name: 'Barn', emoji: '🪜', cost: 200, color: '#8B4513' },
    shed: { name: 'Shed', emoji: '🏠', cost: 150, color: '#8B6914' },
    house: { name: 'House', emoji: '🏡', cost: 300, color: '#DEB887' },
  };

  const FERTILIZER_TYPES = {
    speed: { name: 'Speed-Grow', emoji: '⚡', description: '50% faster growth' },
    quality: { name: 'Quality', emoji: '⭐', description: 'Better crops' },
    water: { name: 'Retaining Soil', emoji: '💧', description: '50% less water' },
  };

  // Initialize isometric renderer and load assets
  useEffect(() => {
    const initializeGame = async () => {
      if (canvasRef.current && !rendererRef.current) {
        // Initialize renderer
        const renderer = new IsometricRenderer(canvasRef.current);
        rendererRef.current = renderer;

        // Initialize AssetManager to get all registered assets
        const assetManager = new AssetManager();
        const allAssets = assetManager.getAllAssets();

        // Filter for assets we want to preload
        const assetsToLoad = allAssets.filter(a =>
          ['tile', 'building', 'crop', 'decoration', 'vehicle'].includes(a.category)
        );

        const tm = TextureManager.getInstance();

        // Map to texture configs
        const textureConfigs = assetsToLoad.map(a => ({
          id: a.id,
          path: a.path as string,
        }));

        await tm.preloadTextures(textureConfigs);
        console.log(`Assets loaded! (${assetsToLoad.length} assets)`);
      }
    };

    initializeGame();
  }, []);

  // Render game world
  useEffect(() => {
    if (rendererRef.current && world) {
      rendererRef.current.render(world);
    }
  }, [world, cameraOffset]);

  // Handle canvas click for voxel interaction
  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!rendererRef.current || !world) return;

    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const voxel = rendererRef.current.screenToVoxel(x, y);
    if (!voxel) return;

    // Find if there's a farm plot at this position
    const plot = world.farmPlots.find(p =>
      Math.floor(p.position.x) === voxel.x && Math.floor(p.position.y) === voxel.y
    );

    // Find vehicle
    const vehicle = world.vehicles.find(v =>
      Math.floor(v.position.x) === voxel.x && Math.floor(v.position.y) === voxel.y
    );

    if (vehicle) {
      if (world.player.mountedVehicleId === vehicle.id) {
        dismountVehicle();
        setNotification('🚶 Dismounted');
      } else {
        mountVehicle(vehicle.id);
        setNotification(`🚜 Mounted ${vehicle.type}!`);
      }
      return;
    }

    if (plot) {
      handlePlotInteraction(plot);
    } else {
      handleEmptyVoxel(voxel);
    }
  };

  // Check tool availability
  const checkTool = (type: ToolType): boolean => {
    if (!world) return false;
    const tool = world.player.tools[type];
    if (!tool) {
      showNotification(`❌ No ${type} equipped!`);
      return false;
    }
    if (tool.durability <= 0) {
      showNotification(`❌ ${tool.name} is broken!`);
      return false;
    }
    return true;
  };

  const handlePlotInteraction = (plot: any) => {
    if (selectedAction === 'plant' && !plot.crop) {
      plantCrop(plot.id, selectedCropType);
      const cropInfo = CROP_TYPES[selectedCropType];
      showNotification(`🌱 Planted ${cropInfo.name}!`);
      addExperience(10);
      setSelectedAction(null);
    } else if (selectedAction === 'water' && plot.crop) {
      if (!checkTool(ToolType.WATERING_CAN)) return;
      waterCrop(plot.id);
      showNotification('💧 Watered crop!');
      addExperience(5);
      setSelectedAction(null);
    } else if (selectedAction === 'harvest' && plot.crop && plot.crop.stage === CropStage.HARVESTABLE) {
      const cropInfo = CROP_TYPES[selectedCropType];
      harvestCrop(plot.id);
      addCoins(cropInfo.sellValue);
      addExperience(25);
      showNotification(`🌾 Harvested ${plot.crop.type}! +${cropInfo.sellValue} coins!`);
      setSelectedAction(null);
    } else if (selectedAction === 'fertilize' && plot.tilled) {
      if (plot.fertilizerType) {
        showNotification('❌ Fertilizer already applied!');
        return;
      }

      // Find fertilizer in inventory
      const fertilizerItem = world?.player.inventory.find(i =>
        i.name.toLowerCase().includes(selectedFertilizerType) ||
        i.id.includes(selectedFertilizerType)
      );

      if (!fertilizerItem) {
        showNotification(`❌ No ${selectedFertilizerType} fertilizer!`);
        return;
      }

      applyFertilizer(plot.id, fertilizerItem.id);
      showNotification(`🩹 Applied ${selectedFertilizerType} fertilizer!`);
      setSelectedAction(null);
    } else if (plot.crop) {
      // Show crop info
      Alert.alert(
        'Crop Info',
        `Type: ${plot.crop.type}\nStage: ${CropStage[plot.crop.stage]}\nHealth: ${Math.round(plot.crop.health)}%\nWater: ${Math.round(plot.crop.waterLevel)}%`,
        [{ text: 'OK' }]
      );
    }
  };

  const handleEmptyVoxel = (voxel: { x: number; y: number }) => {
    if (selectedAction === 'build_road' && world) {
      const existingRoad = world.roads.find(r =>
        Math.floor(r.position.x) === voxel.x && Math.floor(r.position.y) === voxel.y
      );

      if (existingRoad) {
        upgradeRoad({ x: voxel.x, y: voxel.y });
        showNotification('✨ Road Upgraded!');
      } else {
        buildRoad({ x: voxel.x, y: voxel.y }, selectedRoadType, 1);
        showNotification(`🛣️ Built ${selectedRoadType} road!`);
        addExperience(5);
      }
      // Don't clear selectedAction so user can build multiple roads
    }
    else if (selectedAction === 'spawn_vehicle') {
      const cost = selectedVehicleType === 'tractor' ? 500 : 800;
      if (world && world.player.coins >= cost) {
        spawnVehicle(selectedVehicleType, { x: voxel.x, y: voxel.y, z: 0 });
        addCoins(-cost);
        setNotification(`🚜 Purchased ${selectedVehicleType}!`);
        setSelectedAction(null);
      } else {
        setNotification(`❌ Need ${cost} coins!`);
      }
    } else if (selectedAction === 'build') {
      const buildingInfo = BUILDING_TYPES[selectedBuildingType];
      if (world && world.player.coins < buildingInfo.cost) {
        showNotification(`❌ Not enough coins! Need ${buildingInfo.cost}`);
        return;
      }

      const newBuilding = {
        id: `building_${Date.now()}`,
        type: selectedBuildingType,
        position: { x: voxel.x, y: voxel.y, z: 0 },
        rotation: 0,
        unlocked: true,
        level: 1,
        spriteId: selectedBuildingType,
      };

      placeBuilding(newBuilding);
      addCoins(-buildingInfo.cost);
      addExperience(15);
      showNotification(`🏗️ Built ${buildingInfo.name}!`);
      setSelectedAction(null);
    } else if (selectedAction === 'mine') {
      createOreDeposit({ x: voxel.x, y: voxel.y }, 'copper', 1);
      showNotification('🌍 Created ore deposit!');
      setSelectedAction(null);
    } else if (selectedAction === 'plant') {
      // Plant action on empty soil -> Till
      if (!checkTool(ToolType.HOE)) return;
      createFarmPlot({ x: voxel.x, y: voxel.y });
      showNotification('📍 Tilled soil!');
    }
  };

  const handleMining = () => {
    if (!world || world.oreDeposits.length === 0) {
      showNotification('❌ No ore deposits found!');
      return;
    }

    if (!checkTool(ToolType.PICKAXE)) return;

    const deposit = world.oreDeposits[Math.floor(Math.random() * world.oreDeposits.length)];
    if (deposit) {
      mineOre(deposit.id);
      addCoins(75);
      addExperience(20);
      showNotification(`⛏️ Mined ${deposit.oreType}! +75 coins`);
      setSelectedAction(null);
    }
  };

  // Camera controls
  const moveCamera = (dx: number, dy: number) => {
    if (rendererRef.current) {
      rendererRef.current.moveCamera(dx, dy, 0);
      setCameraOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
    }
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
      {showCrafting && <CraftingMenu onClose={() => setShowCrafting(false)} />}
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>🌾 Cozy Haven</Text>
          <Text style={styles.subtitle}>2.5D Isometric World</Text>
        </View>
        <View style={styles.statsContainer}>
          <View style={styles.statChip}>
            <Text style={styles.statText}>💰 {world.player.coins}</Text>
          </View>
          <View style={styles.statChip}>
            <Text style={styles.statText}>⭐ {world.player.level}</Text>
          </View>
          <View style={styles.statChip}>
            <Text style={styles.statText}>✨ {Math.floor(world.player.experience / 100)}</Text>
          </View>
        </View>
      </View>

      {notification ? <Text style={styles.notification}>{notification}</Text> : null}

      {/* 3D Isometric Canvas */}
      <View style={styles.canvasContainer}>
        <canvas
          ref={canvasRef}
          width={SCREEN_WIDTH - 20}
          height={500}
          style={{
            border: '2px solid #8B4513',
            borderRadius: '12px',
            display: 'block',
            backgroundColor: '#87CEEB',
            cursor: 'crosshair'
          }}
          onClick={handleCanvasClick}
        />

        {/* Camera Controls */}
        <View style={styles.cameraControls}>
          <TouchableOpacity style={styles.cameraButton} onPress={() => moveCamera(0, -20)}>
            <Text style={styles.cameraArrow}>⬆️</Text>
          </TouchableOpacity>
          <View style={styles.cameraRow}>
            <TouchableOpacity style={styles.cameraButton} onPress={() => moveCamera(-20, 0)}>
              <Text style={styles.cameraArrow}>⬅️</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cameraButton} onPress={() => moveCamera(20, 0)}>
              <Text style={styles.cameraArrow}>➡️</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.cameraButton} onPress={() => moveCamera(0, 20)}>
            <Text style={styles.cameraArrow}>⬇️</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Action Buttons Row 1 */}
      <View style={styles.actionButtons}>
        <CozyIconButton
          emoji="🛣️"
          label="Road"
          isActive={selectedAction === 'build_road'}
          onPress={() => setSelectedAction(selectedAction === 'build_road' ? null : 'build_road')}
        />

        <CozyIconButton
          emoji="🚜"
          label="Vehicles"
          isActive={selectedAction === 'spawn_vehicle'}
          onPress={() => setSelectedAction(selectedAction === 'spawn_vehicle' ? null : 'spawn_vehicle')}
        />
      </View>

      {/* Action Buttons Row 2 */}
      <View style={styles.actionButtons}>
        <CozyIconButton
          emoji="🌱"
          label="Plant"
          isActive={selectedAction === 'plant'}
          onPress={() => setSelectedAction(selectedAction === 'plant' ? null : 'plant')}
          durability={world && world.player.tools[ToolType.HOE]
            ? world.player.tools[ToolType.HOE]!.durability / world.player.tools[ToolType.HOE]!.maxDurability
            : undefined}
        />

        <CozyIconButton
          emoji="💧"
          label="Water"
          isActive={selectedAction === 'water'}
          onPress={() => setSelectedAction(selectedAction === 'water' ? null : 'water')}
          durability={world && world.player.tools[ToolType.WATERING_CAN]
            ? world.player.tools[ToolType.WATERING_CAN]!.durability / world.player.tools[ToolType.WATERING_CAN]!.maxDurability
            : undefined}
        />

        <CozyIconButton
          emoji="🌾"
          label="Harvest"
          isActive={selectedAction === 'harvest'}
          onPress={() => setSelectedAction(selectedAction === 'harvest' ? null : 'harvest')}
        />

        <CozyIconButton
          emoji="🩹"
          label="Fertilize"
          isActive={selectedAction === 'fertilize'}
          onPress={() => setSelectedAction(selectedAction === 'fertilize' ? null : 'fertilize')}
        />

        <CozyIconButton
          emoji="🏗️"
          label="Build"
          isActive={selectedAction === 'build'}
          onPress={() => setSelectedAction(selectedAction === 'build' ? null : 'build')}
        />

        <CozyIconButton
          emoji="⛏️"
          label="Mine"
          isActive={selectedAction === 'mine'}
          onPress={() => setSelectedAction(selectedAction === 'mine' ? null : 'mine')}
          durability={world && world.player.tools[ToolType.PICKAXE]
            ? world.player.tools[ToolType.PICKAXE]!.durability / world.player.tools[ToolType.PICKAXE]!.maxDurability
            : undefined}
        />
      </View>

      {/* Selection Panels */}
      {selectedAction === 'plant' && (
        <View style={styles.selectionPanel}>
          <Text style={styles.selectionTitle}>Choose Crop:</Text>
          <View style={styles.selectionGrid}>
            {(Object.entries(CROP_TYPES) as Array<[keyof typeof CROP_TYPES, typeof CROP_TYPES.wheat]>).map(([cropType, cropInfo]) => (
              <TouchableOpacity
                key={cropType}
                style={[
                  styles.selectionOption,
                  selectedCropType === cropType && styles.selectionOptionSelected,
                ]}
                onPress={() => setSelectedCropType(cropType)}
              >
                <Text style={styles.selectionEmoji}>{cropInfo.emoji}</Text>
                <Text style={styles.selectionName}>{cropInfo.name}</Text>
                <Text style={styles.selectionDetails}>{cropInfo.growthDays}d • ${cropInfo.sellValue}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {selectedAction === 'fertilize' && (
        <View style={styles.selectionPanel}>
          <Text style={styles.selectionTitle}>Choose Fertilizer:</Text>
          <View style={styles.selectionGrid}>
            {(Object.entries(FERTILIZER_TYPES) as Array<[keyof typeof FERTILIZER_TYPES, typeof FERTILIZER_TYPES.speed]>).map(([fertType, fertInfo]) => {
              const count = world?.player.inventory.filter(i =>
                i.name.toLowerCase().includes(fertType) || i.id.includes(fertType)
              ).reduce((sum, i) => sum + i.quantity, 0) || 0;

              return (
                <TouchableOpacity
                  key={fertType}
                  style={[
                    styles.selectionOption,
                    selectedFertilizerType === fertType && styles.selectionOptionSelected,
                    count === 0 && styles.selectionOptionDisabled
                  ]}
                  onPress={() => setSelectedFertilizerType(fertType)}
                >
                  <Text style={styles.selectionEmoji}>{fertInfo.emoji}</Text>
                  <Text style={styles.selectionName}>{fertInfo.name}</Text>
                  <Text style={styles.selectionDetails}>{count > 0 ? `Have: ${count}` : 'Out of stock'}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      {selectedAction === 'build_road' && (
        <View style={styles.selectionPanel}>
          <Text style={styles.selectionTitle}>Choose Road Type:</Text>
          <View style={styles.selectionGrid}>
            <TouchableOpacity
              style={[
                styles.selectionOption,
                selectedRoadType === 'gravel' && styles.selectionOptionSelected,
              ]}
              onPress={() => setSelectedRoadType('gravel')}
            >
              <Text style={styles.selectionEmoji}>🟤</Text>
              <Text style={styles.selectionName}>Gravel Road</Text>
              <Text style={styles.selectionDetails}>Cheap</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.selectionOption,
                selectedRoadType === 'paved' && styles.selectionOptionSelected,
              ]}
              onPress={() => setSelectedRoadType('paved')}
            >
              <Text style={styles.selectionEmoji}>⬛</Text>
              <Text style={styles.selectionName}>Paved Road</Text>
              <Text style={styles.selectionDetails}>High Performance</Text>
            </TouchableOpacity>
          </View>
          <Text style={[styles.selectionDetails, { textAlign: 'center', marginTop: 10, fontStyle: 'italic' }]}>
            Tip: Click an existing road to upgrade it!
          </Text>
        </View>
      )}

      {selectedAction === 'spawn_vehicle' && (
        <View style={styles.selectionPanel}>
          <Text style={styles.selectionTitle}>Vehicle Shop (Click Map to Place):</Text>
          <View style={styles.selectionGrid}>
            <TouchableOpacity
              style={[
                styles.selectionOption,
                selectedVehicleType === 'tractor' && styles.selectionOptionSelected
              ]}
              onPress={() => setSelectedVehicleType('tractor')}
            >
              <Text style={styles.selectionEmoji}>🚜</Text>
              <Text style={styles.selectionName}>Tractor</Text>
              <Text style={styles.selectionDetails}>$500</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.selectionOption,
                selectedVehicleType === 'truck' && styles.selectionOptionSelected
              ]}
              onPress={() => setSelectedVehicleType('truck')}
            >
              <Text style={styles.selectionEmoji}>🚚</Text>
              <Text style={styles.selectionName}>Truck</Text>
              <Text style={styles.selectionDetails}>$800</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {selectedAction === 'build' && (
        <View style={styles.selectionPanel}>
          <Text style={styles.selectionTitle}>Choose Building:</Text>
          <View style={styles.selectionGrid}>
            {(Object.entries(BUILDING_TYPES) as Array<[keyof typeof BUILDING_TYPES, typeof BUILDING_TYPES.barn]>).map(([buildingType, buildingInfo]) => {
              const canAfford = world && world.player.coins >= buildingInfo.cost;
              return (
                <TouchableOpacity
                  key={buildingType}
                  style={[
                    styles.selectionOption,
                    selectedBuildingType === buildingType && styles.selectionOptionSelected,
                    !canAfford && styles.selectionOptionDisabled,
                  ]}
                  onPress={() => canAfford && setSelectedBuildingType(buildingType)}
                  disabled={!canAfford}
                >
                  <Text style={styles.selectionEmoji}>{buildingInfo.emoji}</Text>
                  <Text style={styles.selectionName}>{buildingInfo.name}</Text>
                  <Text style={styles.selectionDetails}>${buildingInfo.cost}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      {/* Crafting Button */}
      <TouchableOpacity style={[styles.saveButton, { backgroundColor: '#8FBC8F', marginBottom: 10 }]} onPress={() => setShowCrafting(true)}>
        <Text style={styles.saveText}>🔨 Craft & Upgrade</Text>
      </TouchableOpacity>

      {/* Save Button */}
      <TouchableOpacity style={styles.saveButton} onPress={onSave}>
        <Text style={styles.saveText}>💾 Save Game</Text>
      </TouchableOpacity>

      {/* Instructions */}
      <View style={styles.instructions}>
        <Text style={styles.instructionTitle}>🎮 How to Play:</Text>
        <Text style={styles.instructionText}>• Click on voxels to interact with them</Text>
        <Text style={styles.instructionText}>• Use arrow buttons to move camera</Text>
        <Text style={styles.instructionText}>• Select actions then click to place/build</Text>
        <Text style={styles.instructionText}>• Watch your crops grow in beautiful 3D!</Text>
      </View>
    </View >
  );
};

const styles = StyleSheet.create({
  gameContainer: {
    flex: 1,
    backgroundColor: theme.colors.cream,
    padding: 10,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.cream,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 15,
    marginBottom: 10,
  },
  titleContainer: {
    flexDirection: 'column',
  },
  title: {
    fontSize: 28,
    fontWeight: theme.typography.weights.bold as any,
    color: theme.colors.sage,
    textShadowColor: 'rgba(0,0,0,0.1)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.cocoa,
    opacity: 0.7,
    marginTop: 2,
    fontFamily: theme.typography.fontFamily,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  statChip: {
    backgroundColor: theme.colors.glassBg,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: theme.borderRadius.l,
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  statText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.cocoa,
  },
  notification: {
    position: 'absolute',
    top: 90,
    alignSelf: 'center',
    zIndex: 100,
    backgroundColor: theme.colors.glassBg,
    color: theme.colors.cocoa,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: theme.borderRadius.xl,
    borderWidth: 1,
    borderColor: theme.colors.success,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: 'bold',
    overflow: 'hidden',
    shadowColor: theme.colors.sage,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  canvasContainer: {
    position: 'relative',
    marginVertical: 10,
    alignItems: 'center',
    borderRadius: theme.borderRadius.m,
    overflow: 'hidden',
    borderWidth: 4,
    borderColor: theme.colors.cream,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  cameraControls: {
    position: 'absolute',
    right: 15,
    top: 15,
    backgroundColor: theme.colors.glassBg,
    borderRadius: theme.borderRadius.m,
    padding: 8,
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
  },
  cameraRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 2,
  },
  cameraButton: {
    width: 36,
    height: 36,
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: theme.borderRadius.s,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 2,
  },
  cameraArrow: {
    fontSize: 18,
    color: theme.colors.cocoa,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: 10,
    gap: 12,
    paddingHorizontal: 10,
  },
  selectionPanel: {
    backgroundColor: theme.colors.glassBg,
    borderRadius: theme.borderRadius.l,
    padding: 20,
    marginVertical: 10,
    marginHorizontal: 10,
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  selectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.cocoa,
    marginBottom: 15,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  selectionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
  },
  selectionOption: {
    width: '30%',
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderRadius: theme.borderRadius.m,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  selectionOptionSelected: {
    backgroundColor: 'white',
    borderColor: theme.colors.sage,
    borderWidth: 2,
    shadowColor: theme.colors.sage,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  selectionOptionDisabled: {
    opacity: 0.5,
    backgroundColor: '#eee',
  },
  selectionEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  selectionName: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.cocoa,
    marginBottom: 4,
    textAlign: 'center',
  },
  selectionDetails: {
    fontSize: 11,
    color: theme.colors.cocoa,
    opacity: 0.7,
    textAlign: 'center',
  },
  saveButton: {
    backgroundColor: theme.colors.clay,
    padding: 15,
    borderRadius: theme.borderRadius.xl,
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 5,
    shadowColor: theme.colors.clay,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  saveText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  instructionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.colors.cocoa,
    marginBottom: 5,
  },
  instructions: {
    marginTop: 20,
    padding: 15,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: theme.borderRadius.m,
  },
  instructionText: {
    fontSize: 12,
    color: theme.colors.cocoa,
    marginVertical: 2,
  },
});
