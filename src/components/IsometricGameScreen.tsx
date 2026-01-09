/**
 * 2.5D Isometric Game Screen with Voxel Rendering
 * 
 * Beautiful isometric 3D view for your cozy farming game
 */

import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Alert } from 'react-native';
import { useGameStore } from '../store/gameStore';
import { CropStage } from '../types/game';
import { IsometricRenderer } from '../rendering/IsometricRenderer';

const SCREEN_WIDTH = Dimensions.get('window').width;

interface IsometricGameScreenProps {
  onSave: () => void;
}

export const IsometricGameScreen: React.FC<IsometricGameScreenProps> = ({ onSave }) => {
  const { world, plantCrop, harvestCrop, waterCrop, createFarmPlot, addCoins, addExperience, placeBuilding, createOreDeposit, mineOre } = useGameStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<IsometricRenderer | null>(null);
  const [selectedAction, setSelectedAction] = useState<'plant' | 'water' | 'harvest' | 'build' | 'mine' | null>(null);
  const [selectedCropType, setSelectedCropType] = useState<'wheat' | 'carrot' | 'tomato'>('wheat');
  const [selectedBuildingType, setSelectedBuildingType] = useState<'barn' | 'shed' | 'house'>('barn');
  const [notification, setNotification] = useState('');
  const [cameraOffset, setCameraOffset] = useState({ x: 0, y: 0 });

  const CROP_TYPES = {
    wheat: { name: 'Wheat', emoji: '🌾', growthDays: 3, sellValue: 50, color: '#DAA520' },
    carrot: { name: 'Carrot', emoji: '🥕', growthDays: 2, sellValue: 40, color: '#FF8C00' },
    tomato: { name: 'Tomato', emoji: '🍅', growthDays: 4, sellValue: 60, color: '#DC143C' },
  };

  const BUILDING_TYPES = {
    barn: { name: 'Barn', emoji: '🪜', cost: 200, color: '#8B4513' },
    shed: { name: 'Shed', emoji: '🏠', cost: 150, color: '#8B6914' },
    house: { name: 'House', emoji: '🏡', cost: 300, color: '#DEB887' },
  };

  // Initialize isometric renderer
  useEffect(() => {
    if (canvasRef.current && !rendererRef.current) {
      const renderer = new IsometricRenderer(canvasRef.current);
      rendererRef.current = renderer;
    }
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

    if (plot) {
      handlePlotInteraction(plot);
    } else {
      handleEmptyVoxel(voxel);
    }
  };

  const handlePlotInteraction = (plot: any) => {
    if (selectedAction === 'plant' && !plot.crop) {
      plantCrop(plot.id, selectedCropType);
      const cropInfo = CROP_TYPES[selectedCropType];
      setNotification(`🌱 Planted ${cropInfo.name}!`);
      addExperience(10);
      setSelectedAction(null);
      setTimeout(() => setNotification(''), 2000);
    } else if (selectedAction === 'water' && plot.crop) {
      waterCrop(plot.id);
      setNotification('💧 Watered crop!');
      addExperience(5);
      setSelectedAction(null);
      setTimeout(() => setNotification(''), 2000);
    } else if (selectedAction === 'harvest' && plot.crop && plot.crop.stage === CropStage.HARVESTABLE) {
      const cropInfo = CROP_TYPES[selectedCropType];
      harvestCrop(plot.id);
      addCoins(cropInfo.sellValue);
      addExperience(25);
      setNotification(`🌾 Harvested ${plot.crop.type}! +${cropInfo.sellValue} coins!`);
      setSelectedAction(null);
      setTimeout(() => setNotification(''), 2000);
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
    if (selectedAction === 'build') {
      const buildingInfo = BUILDING_TYPES[selectedBuildingType];
      if (world && world.player.coins < buildingInfo.cost) {
        setNotification(`❌ Not enough coins! Need ${buildingInfo.cost}`);
        setTimeout(() => setNotification(''), 2000);
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
      setNotification(`🏗️ Built ${buildingInfo.name}!`);
      setSelectedAction(null);
      setTimeout(() => setNotification(''), 2000);
    } else if (selectedAction === 'mine') {
      createOreDeposit({ x: voxel.x, y: voxel.y }, 'copper', 1);
      setNotification('🌍 Created ore deposit!');
      setSelectedAction(null);
      setTimeout(() => setNotification(''), 2000);
    } else {
      // Create new farm plot
      createFarmPlot({ x: voxel.x, y: voxel.y });
      setNotification('📍 Created new farm plot!');
      setTimeout(() => setNotification(''), 2000);
    }
  };

  const handleMining = () => {
    if (!world || world.oreDeposits.length === 0) {
      setNotification('❌ No ore deposits found!');
      setTimeout(() => setNotification(''), 2000);
      return;
    }

    const deposit = world.oreDeposits[Math.floor(Math.random() * world.oreDeposits.length)];
    if (deposit) {
      mineOre(deposit.id);
      addCoins(75);
      addExperience(20);
      setNotification(`⛏️ Mined ${deposit.oreType}! +75 coins`);
      setSelectedAction(null);
      setTimeout(() => setNotification(''), 2000);
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
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>🌾 Cozy Haven</Text>
          <Text style={styles.subtitle}>2.5D Isometric World</Text>
        </View>
        <View style={styles.stats}>
          <Text style={styles.statText}>💰 {world.player.coins}</Text>
          <Text style={styles.statText}>⭐ Lvl {world.player.level}</Text>
          <Text style={styles.statText}>✨ {Math.floor(world.player.experience / 100)}</Text>
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

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.actionButton, selectedAction === 'plant' && styles.actionButtonActive]}
          onPress={() => setSelectedAction(selectedAction === 'plant' ? null : 'plant')}
        >
          <Text style={styles.actionEmoji}>🌱</Text>
          <Text style={styles.actionText}>Plant</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, selectedAction === 'water' && styles.actionButtonActive]}
          onPress={() => setSelectedAction(selectedAction === 'water' ? null : 'water')}
        >
          <Text style={styles.actionEmoji}>💧</Text>
          <Text style={styles.actionText}>Water</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, selectedAction === 'harvest' && styles.actionButtonActive]}
          onPress={() => setSelectedAction(selectedAction === 'harvest' ? null : 'harvest')}
        >
          <Text style={styles.actionEmoji}>🌾</Text>
          <Text style={styles.actionText}>Harvest</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, selectedAction === 'build' && styles.actionButtonActive]}
          onPress={() => setSelectedAction(selectedAction === 'build' ? null : 'build')}
        >
          <Text style={styles.actionEmoji}>🏗️</Text>
          <Text style={styles.actionText}>Build</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, selectedAction === 'mine' && styles.actionButtonActive]}
          onPress={() => setSelectedAction(selectedAction === 'mine' ? null : 'mine')}
        >
          <Text style={styles.actionEmoji}>⛏️</Text>
          <Text style={styles.actionText}>Mine</Text>
        </TouchableOpacity>
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
    </View>
  );
};

const styles = StyleSheet.create({
  gameContainer: {
    flex: 1,
    backgroundColor: '#F0F8FF',
    padding: 10,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F0F8FF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: '#E6F3FF',
    borderRadius: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2C5F7C',
  },
  subtitle: {
    fontSize: 14,
    color: '#5A9FD4',
    marginTop: 2,
  },
  stats: {
    flexDirection: 'row',
    gap: 20,
  },
  statText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C5F7C',
  },
  notification: {
    backgroundColor: '#90EE90',
    color: '#2D5016',
    padding: 12,
    borderRadius: 8,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  canvasContainer: {
    position: 'relative',
    marginVertical: 10,
    alignItems: 'center',
  },
  cameraControls: {
    position: 'absolute',
    right: 10,
    top: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 8,
    padding: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  cameraRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 2,
  },
  cameraButton: {
    width: 40,
    height: 40,
    backgroundColor: '#E6F3FF',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 2,
  },
  cameraArrow: {
    fontSize: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 15,
    gap: 8,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    backgroundColor: '#5A9FD4',
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  actionButtonActive: {
    backgroundColor: '#2C5F7C',
    borderColor: '#1A3A52',
    borderWidth: 3,
  },
  actionEmoji: {
    fontSize: 20,
    marginBottom: 4,
  },
  actionText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 12,
  },
  selectionPanel: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 15,
    marginVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  selectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C5F7C',
    marginBottom: 12,
    textAlign: 'center',
  },
  selectionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    gap: 10,
  },
  selectionOption: {
    width: '28%',
    backgroundColor: '#F0F8FF',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#B8D4E3',
  },
  selectionOptionSelected: {
    backgroundColor: '#5A9FD4',
    borderColor: '#2C5F7C',
    borderWidth: 3,
  },
  selectionOptionDisabled: {
    opacity: 0.5,
    backgroundColor: '#E0E0E0',
  },
  selectionEmoji: {
    fontSize: 24,
    marginBottom: 6,
  },
  selectionName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2C5F7C',
    marginBottom: 4,
  },
  selectionDetails: {
    fontSize: 12,
    color: '#666666',
  },
  saveButton: {
    backgroundColor: '#2C5F7C',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 10,
    alignItems: 'center',
    marginVertical: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  saveText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  instructions: {
    backgroundColor: '#F0F8FF',
    borderRadius: 10,
    padding: 15,
    marginTop: 10,
  },
  instructionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2C5F7C',
    marginBottom: 8,
  },
  instructionText: {
    fontSize: 13,
    color: '#5A9FD4',
    marginVertical: 2,
  },
});
