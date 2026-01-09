/**
 * Simple Game Screen - No Over-Engineering
 * 
 * Just works rendering that replaces the complex canvas stuff
 */

import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { useGameStore } from '../store/gameStore';
import { CropStage } from '../types/game';
import { SimpleRenderer } from '../rendering/SimpleRenderer';

const SCREEN_WIDTH = Dimensions.get('window').width;

interface SimpleGameScreenProps {
  onSave: () => void;
}

export const SimpleGameScreen: React.FC<SimpleGameScreenProps> = ({ onSave }) => {
  const { world, plantCrop, harvestCrop, waterCrop, createFarmPlot, addCoins, addExperience, placeBuilding, createOreDeposit, mineOre } = useGameStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<SimpleRenderer | null>(null);
  const [selectedAction, setSelectedAction] = useState<'plant' | 'water' | 'harvest' | 'build' | 'mine' | null>(null);
  const [selectedCropType, setSelectedCropType] = useState<'wheat' | 'carrot' | 'tomato'>('wheat');
  const [selectedBuildingType, setSelectedBuildingType] = useState<'barn' | 'shed' | 'house'>('barn');
  const [gameTime, setGameTime] = useState('6:00 AM');
  const [notification, setNotification] = useState('');

  const CROP_TYPES = {
    wheat: { name: 'Wheat', emoji: '🌾', growthDays: 3, sellValue: 50 },
    carrot: { name: 'Carrot', emoji: '🥕', growthDays: 2, sellValue: 40 },
    tomato: { name: 'Tomato', emoji: '🍅', growthDays: 4, sellValue: 60 },
  };

  const BUILDING_TYPES = {
    barn: { name: 'Barn', emoji: '🪜', cost: 200 },
    shed: { name: 'Shed', emoji: '🏠', cost: 150 },
    house: { name: 'House', emoji: '🏡', cost: 300 },
  };

  // Initialize renderer
  useEffect(() => {
    if (canvasRef.current && !rendererRef.current) {
      const renderer = new SimpleRenderer(canvasRef.current);
      rendererRef.current = renderer;
      
      // Load images
      renderer.loadImages().catch(console.error);
    }
  }, []);

  // Update game time
  useEffect(() => {
    const interval = setInterval(() => {
      if (world) {
        const hour = Math.floor(world.dayTime / 60) % 24;
        const minute = Math.floor(world.dayTime % 60);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour % 12 || 12;
        setGameTime(`${displayHour}:${minute.toString().padStart(2, '0')} ${ampm}`);
      }
    }, 500);

    return () => clearInterval(interval);
  }, [world?.dayTime]);

  // Render game
  useEffect(() => {
    if (rendererRef.current && world) {
      rendererRef.current.render(world);
    }
  }, [world]);

  const handlePlotClick = (plotIndex: number) => {
    if (!world) return;

    const plot = world.farmPlots[plotIndex];
    if (!plot) return;

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
    }
  };

  const handleBuildingPlacement = () => {
    if (!world) return;

    const buildingInfo = BUILDING_TYPES[selectedBuildingType];
    if (world.player.coins < buildingInfo.cost) {
      setNotification(`❌ Not enough coins! Need ${buildingInfo.cost}`);
      setTimeout(() => setNotification(''), 2000);
      return;
    }

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
    addCoins(-buildingInfo.cost);
    addExperience(15);
    setNotification(`🏗️ Built ${buildingInfo.name}!`);
    setSelectedAction(null);
    setTimeout(() => setNotification(''), 2000);
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
      addCoins(75); // Simplified ore value
      addExperience(20);
      setNotification(`⛏️ Mined ${deposit.oreType}! +75 coins`);
      setSelectedAction(null);
      setTimeout(() => setNotification(''), 2000);
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
          <Text style={styles.time}>{gameTime}</Text>
        </View>
        <View style={styles.stats}>
          <Text style={styles.statText}>💰 {world.player.coins}</Text>
          <Text style={styles.statText}>⭐ Lvl {world.player.level}</Text>
          <Text style={styles.statText}>✨ {Math.floor(world.player.experience / 100)}</Text>
        </View>
      </View>

      {notification ? <Text style={styles.notification}>{notification}</Text> : null}

      <View style={styles.canvasContainer}>
        <canvas
          ref={canvasRef}
          width={SCREEN_WIDTH - 20}
          height={400}
          style={{
            border: '2px solid #8B4513',
            borderRadius: '8px',
            display: 'block',
            backgroundColor: '#E8F4F8'
          }}
        />
      </View>

      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.button, selectedAction === 'plant' && styles.buttonActive]}
          onPress={() => setSelectedAction(selectedAction === 'plant' ? null : 'plant')}
        >
          <Text style={styles.buttonEmoji}>🌱</Text>
          <Text style={styles.buttonText}>Plant</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, selectedAction === 'water' && styles.buttonActive]}
          onPress={() => setSelectedAction(selectedAction === 'water' ? null : 'water')}
        >
          <Text style={styles.buttonEmoji}>💧</Text>
          <Text style={styles.buttonText}>Water</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, selectedAction === 'harvest' && styles.buttonActive]}
          onPress={() => setSelectedAction(selectedAction === 'harvest' ? null : 'harvest')}
        >
          <Text style={styles.buttonEmoji}>🌾</Text>
          <Text style={styles.buttonText}>Harvest</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, selectedAction === 'build' && styles.buttonActive]}
          onPress={() => {
            if (selectedAction === 'build') {
              setSelectedAction(null);
            } else {
              setSelectedAction('build');
              handleBuildingPlacement();
            }
          }}
        >
          <Text style={styles.buttonEmoji}>🏗️</Text>
          <Text style={styles.buttonText}>Build</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.actionButtons}>
        <TouchableOpacity style={styles.button} onPress={() => createFarmPlot({ x: Math.random() * 100, y: Math.random() * 100 })}>
          <Text style={styles.buttonEmoji}>➕</Text>
          <Text style={styles.buttonText}>New Plot</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={() => createOreDeposit({ x: Math.random() * 100, y: Math.random() * 100 }, 'copper', 1)}>
          <Text style={styles.buttonEmoji}>🌍</Text>
          <Text style={styles.buttonText}>Create Ore</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={handleMining}>
          <Text style={styles.buttonEmoji}>⛏️</Text>
          <Text style={styles.buttonText}>Mine</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={onSave}>
          <Text style={styles.buttonEmoji}>💾</Text>
          <Text style={styles.buttonText}>Save</Text>
        </TouchableOpacity>
      </View>

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
              {!plot.crop ? '🌍' : plot.crop.stage === CropStage.HARVESTABLE ? '✨' : '🌱'}
            </Text>
            <Text style={styles.plotIndex}>#{idx + 1}</Text>
            {plot.crop && <Text style={styles.plotHealth}>♥ {Math.round(plot.crop.health)}</Text>}
          </TouchableOpacity>
        ))}
      </View>

      {selectedAction === 'plant' && (
        <View style={styles.selector}>
          <Text style={styles.selectorTitle}>Choose crop:</Text>
          <View style={styles.optionGrid}>
            {(Object.entries(CROP_TYPES) as Array<[keyof typeof CROP_TYPES, typeof CROP_TYPES.wheat]>).map(([cropType, cropInfo]) => (
              <TouchableOpacity
                key={cropType}
                style={[
                  styles.optionButton,
                  selectedCropType === cropType && styles.optionSelected,
                ]}
                onPress={() => setSelectedCropType(cropType)}
              >
                <Text style={styles.optionEmoji}>{cropInfo.emoji}</Text>
                <Text style={styles.optionName}>{cropInfo.name}</Text>
                <Text style={styles.optionDetails}>{cropInfo.growthDays}d • ${cropInfo.sellValue}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
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
  selector: {
    backgroundColor: '#F0E6D2',
    borderRadius: 8,
    padding: 12,
    marginVertical: 10,
    borderWidth: 2,
    borderColor: '#8B4513',
  },
  selectorTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#8B4513',
    marginBottom: 10,
    textAlign: 'center',
  },
  optionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    gap: 8,
  },
  optionButton: {
    width: '30%',
    backgroundColor: '#E8D7C3',
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#A0826D',
  },
  optionSelected: {
    backgroundColor: '#D4A574',
    borderColor: '#8B4513',
    borderWidth: 3,
  },
  optionEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  optionName: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#8B4513',
    marginBottom: 2,
  },
  optionDetails: {
    fontSize: 9,
    color: '#A0826D',
  },
});
