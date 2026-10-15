import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Image, ActivityIndicator, TextInput } from 'react-native';
import { useGameStore } from './src/store/gameStore';
import {
  PersistenceManager,
  isLocalSaveSlotId,
  localSlotCardContent,
  type LocalSaveSlot,
  type LocalSaveSlotId,
} from './src/systems/PersistenceManager';
import { AudioManager } from './src/systems/AudioManager';
import { GameEngine } from './src/engine/GameEngine';
import { IsometricGameScreen } from './src/components/IsometricGameScreen';
import { LoadingScreen } from './src/components/LoadingScreen';
import { AssetLoader, LoadingProgress } from './src/rendering/AssetLoader';
import { EconomySystem } from './src/systems/EconomySystem';
import { TitleScreen, SettingsPanel } from './src/components/TitleScreen';
import { CharacterCustomizer } from './src/components/CharacterCustomizer';
import { pickContinueSlot } from './src/components/titleMenu';
import { captureSaveThumbnail } from './src/systems/saveThumbnail';
import { canPickSaveFile, pickSaveFileText, saveFileName, shareSaveFile } from './src/systems/saveFileTransfer';
import type { NewGameOptions } from './src/types/game';

/**
 * Application state interface tracking initialization and game status
 */
interface GameAppState {
  /** Whether systems are currently loading (audio, persistence) */
  isLoading: boolean;
  loadingProgress: number;
  loadingStage: string;
  loadingAsset: string;
  /** Whether a saved game exists on device */
  hasGame: boolean;
  /** Whether the player has started or loaded a game */
  gameStarted: boolean;
  /** Load Game screen with the three local slots */
  showSlots: boolean;
  /** Settings panel opened from the title screen */
  showSettings: boolean;
  /** Title music. Saved as cozy_setting_music. */
  musicOn: boolean;
  /** Slot whose New Game waits on the character customizer */
  customizeSlot: LocalSaveSlotId | null;
  /** Slot cards aligned to cozy_slot_1 … cozy_slot_3 */
  slotCards: Array<LocalSaveSlot | null>;
}

/**
 * Root application component - manages system initialization and game lifecycle
 *
 * Core responsibilities:
 * - Initialize AudioManager for background music playback
 * - Initialize PersistenceManager for local save/load
 * - Manage application state (loading → title → gameplay)
 * - Start GameEngine when play begins. Time, crops, and physics tick there
 *   on requestAnimationFrame, not on a React setInterval.
 * - Handle resource cleanup on unmount (stop audio)
 * - Navigate between title, character customizer, slots, settings and game screens
 *
 * @returns React component containing the complete application UI
 */

const BLANK_SLOTS: Array<LocalSaveSlot | null> = [null, null, null];

export interface SaveSlotScreenProps {
  slots: Array<LocalSaveSlot | null>;
  onNewGame: (slotId: LocalSaveSlotId) => void;
  onLoad: (slotId: LocalSaveSlotId) => void;
  onDelete: (slotId: LocalSaveSlotId) => void;
  /** Writes an occupied slot out as a save file */
  onExport?: (slotId: LocalSaveSlotId) => void;
  /** Restores save file text into an empty slot. Resolves true once the slot is filled. */
  onImport?: (slotId: LocalSaveSlotId, text: string) => Promise<boolean>;
  onBack: () => void;
}

/**
 * Three save cards. Delete only calls onDelete from the confirm control.
 * A card with no thumbnailDataUrl leaves the preview blank.
 * Empty cards offer Import; occupied cards offer Export.
 */
export function SaveSlotScreen({
  slots,
  onNewGame,
  onLoad,
  onDelete,
  onExport,
  onImport,
  onBack,
}: SaveSlotScreenProps) {
  const [pendingDeleteSlot, setPendingDeleteSlot] = useState<LocalSaveSlotId | null>(null);
  const [importSlot, setImportSlot] = useState<LocalSaveSlotId | null>(null);
  const [importText, setImportText] = useState('');

  const closeImport = () => {
    setImportSlot(null);
    setImportText('');
  };

  const submitImport = async () => {
    if (importSlot == null || !onImport) return;
    const filled = await onImport(importSlot, importText);
    if (filled) closeImport();
  };

  return (
    <View style={styles.container}>
      <View style={styles.menuContainer}>
        <Text style={styles.title}>Load Game</Text>
        <Text style={styles.subtitle}>Three save slots on this device</Text>

        {([1, 2, 3] as const).map((slotId) => {
          const content = localSlotCardContent(slots[slotId - 1] ?? null);
          return (
            <View key={slotId} style={styles.slotCard}>
              <Text style={styles.slotHeading}>{`Slot ${slotId}`}</Text>
              <View style={styles.thumbnail}>
                {content.thumbnailDataUrl ? (
                  <Image
                    source={{ uri: content.thumbnailDataUrl }}
                    style={styles.thumbnailImage}
                    accessibilityLabel={`Save thumbnail ${slotId}`}
                  />
                ) : null}
              </View>
              <Text style={styles.slotTitle}>{content.title}</Text>
              {content.playerName ? <Text style={styles.slotMeta}>{content.playerName}</Text> : null}
              {content.dateLabel ? <Text style={styles.slotMeta}>{content.dateLabel}</Text> : null}
              {content.goldLabel ? <Text style={styles.slotMeta}>{content.goldLabel}</Text> : null}
              {content.playTimeLabel ? <Text style={styles.slotMeta}>{content.playTimeLabel}</Text> : null}
              {content.occupied ? (
                <View style={styles.slotActions}>
                  <TouchableOpacity
                    style={styles.slotButton}
                    accessibilityLabel={`Load slot ${slotId}`}
                    onPress={() => onLoad(slotId)}
                  >
                    <Text style={styles.buttonText}>Load</Text>
                  </TouchableOpacity>
                  {onExport ? (
                    <TouchableOpacity
                      style={styles.slotButton}
                      accessibilityLabel={`Export slot ${slotId}`}
                      onPress={() => onExport(slotId)}
                    >
                      <Text style={styles.buttonText}>Export</Text>
                    </TouchableOpacity>
                  ) : null}
                  <TouchableOpacity
                    style={[styles.slotButton, styles.deleteButton]}
                    accessibilityLabel={`Delete slot ${slotId}`}
                    onPress={() => setPendingDeleteSlot(slotId)}
                  >
                    <Text style={styles.deleteButtonText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.slotActions}>
                  <TouchableOpacity
                    style={styles.slotButton}
                    accessibilityLabel={`New game slot ${slotId}`}
                    onPress={() => onNewGame(slotId)}
                  >
                    <Text style={styles.buttonText}>New Game</Text>
                  </TouchableOpacity>
                  {onImport ? (
                    <TouchableOpacity
                      style={[styles.slotButton, styles.secondaryButton]}
                      accessibilityLabel={`Import into slot ${slotId}`}
                      onPress={() => {
                        setImportText('');
                        setImportSlot(slotId);
                      }}
                    >
                      <Text style={styles.buttonText}>Import</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              )}
            </View>
          );
        })}

        <TouchableOpacity style={[styles.button, styles.secondaryButton]} accessibilityLabel="Back" onPress={onBack}>
          <Text style={styles.buttonText}>Back</Text>
        </TouchableOpacity>
      </View>

      {pendingDeleteSlot != null && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Delete this save?</Text>
            <Text style={styles.slotMeta}>This cannot be undone.</Text>
            <TouchableOpacity
              style={[styles.button, styles.dangerButton]}
              accessibilityLabel="Delete Save"
              onPress={() => {
                const slotId = pendingDeleteSlot;
                setPendingDeleteSlot(null);
                onDelete(slotId);
              }}
            >
              <Text style={styles.buttonText}>Delete Save</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              accessibilityLabel="Cancel delete"
              onPress={() => setPendingDeleteSlot(null)}
            >
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {importSlot != null && onImport ? (
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, styles.importCard]}>
            <Text style={styles.modalTitle}>{`Import into slot ${importSlot}`}</Text>
            <Text style={styles.slotMeta}>Paste the text of a Cozy Haven save file.</Text>
            <TextInput
              style={styles.importInput}
              multiline
              value={importText}
              onChangeText={setImportText}
              placeholder="Save file text"
              accessibilityLabel="Save file text"
            />
            {canPickSaveFile() ? (
              <TouchableOpacity
                style={[styles.button, styles.secondaryButton]}
                accessibilityLabel="Choose save file"
                onPress={() => {
                  void pickSaveFileText().then((text) => {
                    if (text != null) setImportText(text);
                  });
                }}
              >
                <Text style={styles.buttonText}>Choose File</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity
              style={[styles.button, importText.trim().length === 0 && styles.disabledButton]}
              accessibilityLabel="Import Save"
              disabled={importText.trim().length === 0}
              onPress={() => {
                void submitImport();
              }}
            >
              <Text style={styles.buttonText}>Import Save</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              accessibilityLabel="Cancel import"
              onPress={closeImport}
            >
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}
    </View>
  );
}

export default function App() {
  const [state, setState] = useState<GameAppState>({
    isLoading: true,
    loadingProgress: 0,
    loadingStage: 'Initializing...',
    loadingAsset: '',
    hasGame: false,
    gameStarted: false,
    showSlots: false,
    showSettings: false,
    musicOn: true,
    customizeSlot: null,
    slotCards: BLANK_SLOTS,
  });

  const persistenceRef = useRef<PersistenceManager | null>(null);
  const audioRef = useRef<AudioManager | null>(null);
  const assetLoaderRef = useRef<AssetLoader | null>(null);
  const activeSlotRef = useRef<LocalSaveSlotId | null>(null);

  /**
   * Initialize systems
   */
  useEffect(() => {
    const initializeSystems = async () => {
      try {
        // Stage 1: System Initialization
        setState(prev => ({
          ...prev,
          loadingProgress: 10,
          loadingStage: 'Initializing systems...',
          loadingAsset: 'Audio Manager'
        }));

        // Initialize audio manager (singleton: one AudioContext for the page)
        const audio = AudioManager.getInstance();
        audioRef.current = audio;

        // Initialize persistence manager
        const persistence = new PersistenceManager();
        await persistence.initialize();
        persistenceRef.current = persistence;

        setState(prev => ({
          ...prev,
          loadingProgress: 20,
          loadingStage: 'Initializing systems...',
          loadingAsset: 'Asset Loader'
        }));

        // Stage 2: Asset Loading (20% -> 90%)
        const assetLoader = new AssetLoader();
        assetLoaderRef.current = assetLoader;

        await assetLoader.preloadCriticalAssets((progress: LoadingProgress) => {
          // Map asset loading progress (0-1) to app loading range (20-90)
          const appProgress = 20 + (progress.progress * 70);

          setState(prev => ({
            ...prev,
            loadingProgress: appProgress,
            loadingStage: 'Loading Assets...',
            loadingAsset: progress.currentAsset
          }));
        });

        // Stage 3: Game Data Check (90% -> 100%)
        setState(prev => ({
          ...prev,
          loadingProgress: 95,
          loadingStage: 'Checking save data...',
          loadingAsset: 'Save Files'
        }));

        // Start background music only after assets are loaded. Settings can turn it off.
        const musicOn = (await persistence.getSetting('music')) !== 'off';
        if (musicOn) {
          audio.playMusic('farm_morning');
        }

        // Initialize economy system
        setState(prev => ({ ...prev, loadingStage: 'Checking Game Data...', loadingProgress: 0.9 }));
        const economy = EconomySystem.getInstance();
        const savedEconomy = await persistence.loadEconomyState();
        if (savedEconomy) {
          economy.loadSaveData(savedEconomy);
        } else {
          // New game or no data? We could advance a few days to simulate a running market
          // economy.advanceDay('spring');
        }

        // Numbered slots, plus any cozy_meta_* saves copied into empty slots.
        // Copying does not remove cozy_save_* or cozy_meta_*.
        const slotCards = await persistence.materializeSlotCards();
        const hasExistingSave =
          slotCards.some((card) => !!card?.worldId) || persistence.listSlots().length > 0;

        setState(prev => ({
          ...prev,
          loadingProgress: 100,
          loadingStage: 'Ready!',
          loadingAsset: 'Starting...',
          hasGame: hasExistingSave,
          musicOn,
          slotCards,
        }));

        // Delay slightly to let the 100% animation play
        // The LoadingScreen component handles the fade out callback
      } catch (error) {
        console.error('Failed to initialize systems:', error);
        setState({
          isLoading: false,
          loadingProgress: 0,
          loadingStage: 'Error',
          loadingAsset: 'Failed to load',
          hasGame: false,
          gameStarted: false,
          showSlots: false,
          showSettings: false,
          musicOn: true,
          customizeSlot: null,
          slotCards: BLANK_SLOTS,
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
   * Simulation ticks live in GameEngine. requestAnimationFrame pauses in a
   * hidden tab; the engine clamps the next delta so time does not jump.
   */
  useEffect(() => {
    if (!state.gameStarted) return;

    const engine = new GameEngine();
    engine.start();

    return () => {
      engine.stop();
    };
  }, [state.gameStarted]);

  const rememberLegacySlot = async (worldId: string) => {
    if (!persistenceRef.current) return;
    const existingSlots = await persistenceRef.current.getSaveSlots();
    if (!existingSlots.some((slot) => slot.worldId === worldId)) {
      const world = useGameStore.getState().world;
      if (world && world.id === worldId) {
        await persistenceRef.current.createSaveSlot(world);
      }
    }
  };

  /**
   * Start a new game in one numbered slot and write it immediately.
   * `start` carries the customizer choices. Without it the store defaults apply.
   */
  const startInSlot = async (
    slotId: LocalSaveSlotId,
    start?: { playerName: string; options: NewGameOptions },
  ) => {
    useGameStore.getState().createNewGame(start?.playerName ?? 'Player', start?.options);
    useGameStore.getState().createFarmPlot({ x: 10, y: 10 });
    useGameStore.getState().createFarmPlot({ x: 10, y: 30 });
    useGameStore.getState().createFarmPlot({ x: 10, y: 50 });

    const world = useGameStore.getState().world;
    if (world && persistenceRef.current) {
      await persistenceRef.current.saveLocalSlot(slotId, world);
      await rememberLegacySlot(world.id);
    }

    activeSlotRef.current = slotId;
    setState((prev) => ({
      ...prev,
      hasGame: true,
      gameStarted: true,
      showSlots: false,
      customizeSlot: null,
    }));
  };

  /**
   * New Game opens the character customizer for the first empty slot.
   * A full set opens the slot screen instead.
   */
  const handleNewGame = () => {
    const cards = persistenceRef.current?.listLocalSlots() ?? BLANK_SLOTS;
    const emptyIndex = cards.findIndex((card) => !localSlotCardContent(card).occupied);
    if (emptyIndex < 0 || !isLocalSaveSlotId(emptyIndex + 1)) {
      setState((prev) => ({ ...prev, showSlots: true, slotCards: cards }));
      return;
    }
    setState((prev) => ({ ...prev, customizeSlot: (emptyIndex + 1) as LocalSaveSlotId }));
  };

  const openSlots = async () => {
    const slotCards = persistenceRef.current
      ? await persistenceRef.current.materializeSlotCards()
      : BLANK_SLOTS;
    setState((prev) => ({ ...prev, showSlots: true, slotCards }));
  };

  /**
   * Load one numbered slot. The world is read from cozy_save_${worldId}.
   */
  const handleLoadSlot = async (slotId: LocalSaveSlotId) => {
    if (!persistenceRef.current) return;

    try {
      const world = await persistenceRef.current.loadLocalSlot(slotId);
      if (!world) {
        alert('Failed to load saved game. Please try again.');
        return;
      }
      useGameStore.setState({ world });
      activeSlotRef.current = slotId;
      setState((prev) => ({
        ...prev,
        hasGame: true,
        gameStarted: true,
        showSlots: false,
      }));
    } catch (error) {
      console.error('Failed to load game:', error);
      alert('Failed to load saved game. Please try again.');
    }
  };

  /** Continue opens the most recently saved slot. The title disables it when no slot has a save. */
  const handleContinue = async () => {
    const target = pickContinueSlot(persistenceRef.current?.listLocalSlots() ?? BLANK_SLOTS);
    if (target) {
      await handleLoadSlot(target.slotId);
    }
  };

  /**
   * Save game into the active numbered slot.
   * Also keeps the legacy cozy_save_ / cozy_meta_ records written by saveWorld.
   */
  const handleSaveGame = async () => {
    if (!persistenceRef.current) return;

    try {
      await useGameStore.getState().saveGame();
      const world = useGameStore.getState().world;
      if (!world) return;

      const persistence = persistenceRef.current;
      let slotId = activeSlotRef.current;
      const cards = persistence.listLocalSlots();
      if (slotId == null || !isLocalSaveSlotId(slotId)) {
        const match = cards.findIndex((card) => card?.worldId === world.id);
        if (match >= 0) {
          slotId = (match + 1) as LocalSaveSlotId;
        } else {
          const empty = cards.findIndex((card) => !localSlotCardContent(card).occupied);
          slotId = empty >= 0 && isLocalSaveSlotId(empty + 1) ? ((empty + 1) as LocalSaveSlotId) : null;
        }
      }

      if (slotId != null && isLocalSaveSlotId(slotId)) {
        // Thumbnail comes from the game canvas on web. Native saves keep a blank card.
        const thumbnailDataUrl = captureSaveThumbnail();
        await persistence.saveLocalSlot(slotId, world, thumbnailDataUrl ? { thumbnailDataUrl } : undefined);
        activeSlotRef.current = slotId;
      } else {
        await persistence.saveWorld(world);
      }
      await rememberLegacySlot(world.id);

      const slotCards = persistence.listLocalSlots();
      setState((prev) => ({
        ...prev,
        hasGame: true,
        slotCards,
      }));
      alert('Game saved!');
    } catch (error) {
      console.error('Failed to save game:', error);
      alert('Failed to save game. Please try again.');
    }
  };

  const handleDeleteSlot = async (slotId: LocalSaveSlotId) => {
    const persistence = persistenceRef.current;
    if (!persistence) return;
    await persistence.deleteLocalSlot(slotId);
    if (activeSlotRef.current === slotId) {
      activeSlotRef.current = null;
    }
    const slotCards = persistence.listLocalSlots();
    setState((prev) => ({
      ...prev,
      slotCards,
      hasGame: slotCards.some((card) => !!card?.worldId) || persistence.listSlots().length > 0,
    }));
  };

  /** Hands the slot to the browser download (web) or the share sheet (native). */
  const handleExportSlot = async (slotId: LocalSaveSlotId) => {
    const text = await persistenceRef.current?.exportLocalSlot(slotId);
    if (!text) {
      alert('This save could not be exported.');
      return;
    }
    try {
      await shareSaveFile(text, saveFileName(slotId));
    } catch (error) {
      console.error('Failed to share save file:', error);
      alert('Could not share the save file. Please try again.');
    }
  };

  /** Restores save file text into an empty slot. Resolves true when the slot was filled. */
  const handleImportSlot = async (slotId: LocalSaveSlotId, text: string): Promise<boolean> => {
    const persistence = persistenceRef.current;
    const slot = persistence ? await persistence.importLocalSlot(slotId, text) : null;
    if (!persistence || !slot) {
      alert('That is not a Cozy Haven save, or the slot is not empty.');
      return false;
    }
    setState((prev) => ({ ...prev, hasGame: true, slotCards: persistence.listLocalSlots() }));
    alert('Save imported.');
    return true;
  };

  /** Title music on or off. The choice is saved so the next launch remembers it. */
  const toggleMusic = () => {
    const next = !state.musicOn;
    const audio = AudioManager.getInstance();
    if (next) {
      void audio.playMusic('farm_morning');
    } else {
      void audio.stopMusic(300);
    }
    setState((prev) => ({ ...prev, musicOn: next }));
    void persistenceRef.current?.saveSetting('music', next ? 'on' : 'off');
  };

  if (state.isLoading) {
    return (
      <LoadingScreen
        progress={state.loadingProgress}
        currentAsset={state.loadingAsset}
        stage={state.loadingStage}
        onLoadingComplete={() => setState(prev => ({ ...prev, isLoading: false }))}
      />
    );
  }

  if (state.gameStarted) {
    return <IsometricGameScreen onSave={handleSaveGame} />;
  }

  const titleScreen = (
    <TitleScreen
      canContinue={pickContinueSlot(state.slotCards) !== null}
      onNewGame={handleNewGame}
      onContinue={() => {
        void handleContinue();
      }}
      onLoadGame={() => {
        void openSlots();
      }}
      onSettings={() => setState((prev) => ({ ...prev, showSettings: true }))}
    />
  );

  if (state.customizeSlot != null) {
    const slotId = state.customizeSlot;
    return (
      <View style={styles.fill}>
        {titleScreen}
        <CharacterCustomizer
          onStart={(start) => {
            void startInSlot(slotId, start);
          }}
          onCancel={() => setState((prev) => ({ ...prev, customizeSlot: null }))}
        />
      </View>
    );
  }

  if (state.showSlots) {
    return (
      <SaveSlotScreen
        slots={state.slotCards}
        onNewGame={(slotId) => setState((prev) => ({ ...prev, customizeSlot: slotId }))}
        onLoad={(slotId) => {
          void handleLoadSlot(slotId);
        }}
        onDelete={(slotId) => {
          void handleDeleteSlot(slotId);
        }}
        onExport={(slotId) => {
          void handleExportSlot(slotId);
        }}
        onImport={handleImportSlot}
        onBack={() => setState((prev) => ({ ...prev, showSlots: false }))}
      />
    );
  }

  if (state.showSettings) {
    return (
      <SettingsPanel
        musicOn={state.musicOn}
        onToggleMusic={toggleMusic}
        onBack={() => setState((prev) => ({ ...prev, showSettings: false }))}
      />
    );
  }

  return titleScreen;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF8DC',
    padding: 20,
  },
  fill: {
    flex: 1,
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
  disabledButton: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: 'System',
  },
  slotCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#F0E6D2',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
  },
  slotHeading: {
    fontSize: 12,
    fontWeight: '700',
    color: '#A0826D',
    marginBottom: 8,
  },
  thumbnail: {
    width: 72,
    height: 72,
    borderRadius: 8,
    backgroundColor: '#E7D7C1',
    marginBottom: 10,
    overflow: 'hidden',
  },
  thumbnailImage: {
    width: 72,
    height: 72,
  },
  slotTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#8B4513',
    marginBottom: 4,
  },
  slotMeta: {
    fontSize: 14,
    color: '#654321',
    marginVertical: 2,
  },
  slotActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  slotButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#D4A574',
    marginRight: 8,
    marginTop: 8,
  },
  deleteButton: {
    backgroundColor: '#F0E6D2',
    borderWidth: 1,
    borderColor: '#C62828',
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#C62828',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#FFF8DC',
    borderRadius: 12,
    padding: 20,
    minWidth: 260,
    alignItems: 'center',
  },
  importCard: {
    width: '92%',
    maxWidth: 420,
  },
  importInput: {
    width: '100%',
    minHeight: 120,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 10,
    marginVertical: 10,
    fontSize: 13,
    color: '#654321',
    textAlignVertical: 'top',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#8B4513',
    marginBottom: 8,
  },
  dangerButton: {
    backgroundColor: '#C62828',
  },
});
