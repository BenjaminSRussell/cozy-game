import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useGameStore } from './src/store/gameStore';
import { PersistenceManager } from './src/systems/PersistenceManager';
import { AudioManager } from './src/systems/AudioManager';
import { IsometricGameScreen } from './src/components/IsometricGameScreen';

/**
 * Application state interface tracking initialization and game status
 */
interface GameAppState {
  /** Whether systems are currently loading (audio, persistence) */
  isLoading: boolean;
  /** Whether a saved game exists on device */
  hasGame: boolean;
  /** Whether the player has started or loaded a game */
  gameStarted: boolean;
}

/**
 * Root application component - manages system initialization and game lifecycle
 *
 * Core responsibilities:
 * - Initialize AudioManager for background music playback
 * - Initialize PersistenceManager for SQLite save/load functionality
 * - Manage application state (loading → menu → gameplay)
 * - Run 60 FPS game loop with updates for:
 *   - Time progression (0.1 game minutes per real second)
 *   - Crop growth calculations
 *   - Auto-save every ~30 seconds
 * - Handle resource cleanup on unmount (stop audio)
 * - Navigate between menu screen and game screen
 *
 * @returns React component containing the complete application UI
 */
export default function App() {
  const [state, setState] = useState<GameAppState>({
    isLoading: true,
    hasGame: false,
    gameStarted: false,
  });

  const persistenceRef = useRef<PersistenceManager | null>(null);
  const audioRef = useRef<AudioManager | null>(null);
  const gameStoreRef = useRef(useGameStore());
  const gameLoopRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Initialize systems
   */
  useEffect(() => {
    const initializeSystems = async () => {
      try {
        // Initialize audio manager
        const audio = new AudioManager();
        audioRef.current = audio;
        // Start background music
        audio.playMusic('farm_morning');

        // Initialize persistence manager
        const persistence = new PersistenceManager();
        await persistence.initialize();
        persistenceRef.current = persistence;

        // Check for existing saves
        const saveSlots = await persistence.getSaveSlots();
        const hasExistingSave = saveSlots.length > 0;

        setState({
          isLoading: false,
          hasGame: hasExistingSave,
          gameStarted: false,
        });
      } catch (error) {
        console.error('Failed to initialize systems:', error);
        setState({
          isLoading: false,
          hasGame: false,
          gameStarted: false,
        });
      }
    };

    initializeSystems();

    // Cleanup audio on unmount
    return () => {
      if (audioRef.current) {
        audioRef.current.stopMusic();
      }
    };
  }, []);

  /**
   * Start game loop
   */
  useEffect(() => {
    if (!state.gameStarted) return;

    const store = gameStoreRef.current;

    // Update game state every frame
    gameLoopRef.current = setInterval(() => {
      if (!store.world) return;

      // Advance game time (1 real second = 0.1 game minutes)
      store.advanceTime(0.1);

      // Update crop growth
      store.updateCropGrowth(0.016); // ~60 FPS

      // Auto-save every 30 seconds
      if (Math.random() < 0.01) {
        store.saveGame();
      }
    }, 1000 / 60); // 60 FPS

    return () => {
      if (gameLoopRef.current) clearInterval(gameLoopRef.current);
    };
  }, [state.gameStarted]);

  /**
   * Start new game
   */
  const handleNewGame = () => {
    const store = gameStoreRef.current;
    store.createNewGame('Player');

    // Add initial farm plots
    store.createFarmPlot({ x: 10, y: 10 });
    store.createFarmPlot({ x: 10, y: 30 });
    store.createFarmPlot({ x: 10, y: 50 });

    setState({ ...state, hasGame: true, gameStarted: true });
  };

  /**
   * Load saved game
   * Loads the most recent save slot from PersistenceManager
   * Updates game store with loaded world data
   */
  const handleLoadGame = async () => {
    if (!persistenceRef.current) return;

    try {
      const saveSlots = await persistenceRef.current.getSaveSlots();
      if (saveSlots.length > 0) {
        const world = await persistenceRef.current.loadWorld(saveSlots[0].worldId);
        if (world) {
          const store = gameStoreRef.current;
          // Use store's loadGame method if it had one, but for now directly set world
          // In future, store.loadGame() could handle this
          store.world = world;
          setState({ ...state, hasGame: true, gameStarted: true });
        }
      }
    } catch (error) {
      console.error('Failed to load game:', error);
      alert('Failed to load saved game. Please try again.');
    }
  };

  /**
   * Save game
   * Saves current game state to PersistenceManager
   * Also creates/updates save slot metadata
   */
  const handleSaveGame = async () => {
    const store = gameStoreRef.current;
    if (!store.world || !persistenceRef.current) return;

    try {
      // Update store timestamp first
      await store.saveGame();
      
      // Save to PersistenceManager
      await persistenceRef.current.saveWorld(store.world);
      
      // Ensure save slot exists
      const existingSlots = await persistenceRef.current.getSaveSlots();
      const hasSlot = existingSlots.some(slot => slot.worldId === store.world!.id);
      if (!hasSlot) {
        await persistenceRef.current.createSaveSlot(store.world);
      }
      
      alert('Game saved!');
    } catch (error) {
      console.error('Failed to save game:', error);
      alert('Failed to save game. Please try again.');
    }
  };

  if (state.isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#8B4513" />
        <Text style={styles.loadingText}>Initializing Cozy Haven...</Text>
      </View>
    );
  }

  if (state.gameStarted) {
    return <IsometricGameScreen onSave={handleSaveGame} />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.menuContainer}>
        <Text style={styles.title}>🌾 Cozy Haven 🏠</Text>
        <Text style={styles.subtitle}>A peaceful farming adventure</Text>
        <Text style={styles.description}>
          Plant crops, build your farm, and enjoy a relaxing life in the countryside.
        </Text>

        <TouchableOpacity style={styles.button} onPress={handleNewGame}>
          <Text style={styles.buttonText}>🎮 New Game</Text>
        </TouchableOpacity>

        {state.hasGame && (
          <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={handleLoadGame}>
            <Text style={styles.buttonText}>📂 Load Game</Text>
          </TouchableOpacity>
        )}

        <View style={styles.infoContainer}>
          <Text style={styles.infoTitle}>How to Play:</Text>
          <Text style={styles.infoText}>• Tap "Plant" then click a plot to plant crops</Text>
          <Text style={styles.infoText}>• Tap "Water" to keep crops healthy</Text>
          <Text style={styles.infoText}>• Tap "Harvest" when crops are golden</Text>
          <Text style={styles.infoText}>• Sell crops to earn coins</Text>
          <Text style={styles.infoText}>• Build structures and expand your farm</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF8DC',
    padding: 20,
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    color: '#8B4513',
    fontFamily: 'System',
  },
  menuContainer: {
    alignItems: 'center',
    width: '100%',
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#8B4513',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: '#A0826D',
    marginBottom: 15,
    fontFamily: 'System',
  },
  description: {
    fontSize: 14,
    color: '#A0826D',
    marginBottom: 30,
    textAlign: 'center',
    maxWidth: 300,
  },
  button: {
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 8,
    backgroundColor: '#D4A574',
    marginVertical: 10,
    minWidth: 200,
    alignItems: 'center',
  },
  secondaryButton: {
    backgroundColor: '#C19A6B',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: 'System',
  },
  infoContainer: {
    marginTop: 40,
    backgroundColor: '#F0E6D2',
    padding: 20,
    borderRadius: 12,
    maxWidth: 350,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#8B4513',
    marginBottom: 12,
    textAlign: 'center',
  },
  infoText: {
    fontSize: 12,
    color: '#654321',
    marginVertical: 4,
  },
});
