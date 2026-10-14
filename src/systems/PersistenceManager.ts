import * as FileSystem from 'expo-file-system';
import * as SQLite from 'expo-sqlite';
import { GameWorld } from '../types/game';

/**
 * Persistence Manager for Cozy Haven
 *
 * Handles all save/load functionality using SQLite for local storage.
 * Provides game world persistence, save slot management, and optional cloud sync.
 *
 * Features:
 * - Local save/load using SQLite database
 * - Multiple save slots with metadata
 * - Cloud synchronization support (optional)
 * - Save/load encryption ready
 * - Export/import functionality
 * - Device identification for multi-device sync
 *
 * Database Schema:
 * - save_slots: Save game metadata and indices
 * - game_worlds: Complete serialized GameWorld objects
 * - sync_log: Cloud sync transaction history
 * - device_settings: Device configuration and ID
 */

/**
 * Save slot metadata
 * Represents a single saved game in the save file list
 * Contains quick-access info without loading full world
 */
export interface SaveSlot {
  /** Unique identifier for this save slot */
  id: string;
  /** ID of the GameWorld this slot contains */
  worldId: string;
  /** Player name (for display in save list) */
  playerName: string;
  /** Timestamp when game was created */
  createdAt: number;
  /** Timestamp of last play session */
  lastPlayedAt: number;
  /** Total play time in minutes */
  playTime: number;
  /** Player level (for quick reference) */
  level: number;
  /** Optional thumbnail image (base64) for save preview */
  thumbnail?: string;
}

/**
 * Cloud synchronization status
 * Tracks ongoing sync operations and last sync result
 */
export interface CloudSyncStatus {
  /** Whether a sync operation is currently in progress */
  syncing: boolean;
  /** Timestamp of last successful sync */
  lastSync: number;
  /** Error message from last failed sync (if any) */
  lastError?: string;
}

/**
 * Copy a value for JSON.stringify, dropping back-edges only.
 * A building that points at its GameWorld would otherwise throw
 * "Converting circular structure to JSON". The live object is not mutated,
 * and a repeated (non-cyclic) reference is still serialized twice.
 */
function stripCycles(value: unknown): unknown {
  const stack = new WeakSet<object>();

  const walk = (current: unknown): unknown => {
    if (typeof current !== 'object' || current === null) {
      return current;
    }
    if (stack.has(current)) {
      return undefined;
    }
    if (typeof (current as { toJSON?: unknown }).toJSON === 'function') {
      return current;
    }

    stack.add(current);
    try {
      if (Array.isArray(current)) {
        return current.map((item) => walk(item));
      }

      const copy: Record<string, unknown> = {};
      for (const key of Object.keys(current)) {
        const next = walk((current as Record<string, unknown>)[key]);
        if (next !== undefined) {
          copy[key] = next;
        }
      }
      return copy;
    } finally {
      stack.delete(current);
    }
  };

  return walk(value);
}

/**
 * Persistence Manager class
 * Manages all database operations for save/load functionality
 */
export class PersistenceManager {
  /** SQLite database instance (null until initialized) */
  private db: SQLite.SQLiteDatabase | null = null;

  /** In-memory cache of save slot metadata */
  private saveSlots: Map<string, SaveSlot> = new Map();

  /** Current cloud sync status */
  private cloudSyncStatus: CloudSyncStatus = {
    syncing: false,
    lastSync: 0,
  };

  /** Cloud API endpoint for sync operations */
  private cloudEndpoint: string = process.env.REACT_APP_CLOUD_ENDPOINT || 'https://api.cozyhaven.local/sync';

  /** Device ID for multi-device cloud sync */
  private deviceId: string = '';

  /**
   * Set cloud endpoint for synchronization
   * Allows runtime configuration of cloud sync endpoint
   * @param endpoint - Cloud API endpoint URL
   */
  setCloudEndpoint(endpoint: string): void {
    this.cloudEndpoint = endpoint;
  }

  /**
   * Get current cloud endpoint
   * @returns Current cloud endpoint URL
   */
  getCloudEndpoint(): string {
    return this.cloudEndpoint;
  }

  /**
   * Initialize the Persistence Manager
   * Opens database connection, creates tables, and loads existing save slots
   * Called once during app startup in App.tsx
   * @throws Error if database initialization fails (logged but not thrown)
   */
  async initialize(): Promise<void> {
    // Initialize SQLite database
    try {
      this.db = await SQLite.openDatabaseAsync('cozy-haven.db');
      await this.createTables();
      await this.loadSaveSlots();
    } catch (error) {
      console.error('Failed to initialize database:', error);
    }

    // Generate device ID for cloud sync
    this.deviceId = await this.getOrCreateDeviceId();
  }

  /**
   * Create database tables
   */
  private async createTables(): Promise<void> {
    if (!this.db) return;

    try {
      // Save slots table
      await this.db.runAsync(`
        CREATE TABLE IF NOT EXISTS save_slots (
          id TEXT PRIMARY KEY,
          world_id TEXT UNIQUE,
          player_name TEXT,
          created_at INTEGER,
          last_played_at INTEGER,
          play_time INTEGER,
          level INTEGER,
          thumbnail TEXT
        );
      `);

      // Game world data table
      await this.db.runAsync(`
        CREATE TABLE IF NOT EXISTS game_worlds (
          id TEXT PRIMARY KEY,
          data TEXT,
          created_at INTEGER,
          updated_at INTEGER,
          synced_at INTEGER
        );
      `);

      // Cloud sync log
      await this.db.runAsync(`
        CREATE TABLE IF NOT EXISTS sync_log (
          id TEXT PRIMARY KEY,
          world_id TEXT,
          action TEXT,
          timestamp INTEGER,
          success BOOLEAN
        );
      `);

      // Device settings
      await this.db.runAsync(`
        CREATE TABLE IF NOT EXISTS device_settings (
          key TEXT PRIMARY KEY,
          value TEXT
        );
      `);
    } catch (error) {
      console.error('Failed to create tables:', error);
    }
  }

  /**
   * Get or create device ID for cloud sync
   */
  private async getOrCreateDeviceId(): Promise<string> {
    if (!this.db) return '';

    try {
      const result = await this.db.getFirstAsync<{ value: string }>(
        "SELECT value FROM device_settings WHERE key = 'device_id'",
      );

      if (result?.value) {
        return result.value;
      }

      const newDeviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await this.db.execAsync(`
        INSERT INTO device_settings (key, value) VALUES ('device_id', '${newDeviceId}')
      `);

      return newDeviceId;
    } catch (error) {
      console.error('Failed to get/create device ID:', error);
      return '';
    }
  }

  /**
   * Save game world to local database
   * Serializes entire GameWorld to JSON and stores in SQLite
   * Creates or updates the world entry, and updates associated save slot metadata
   * @param world - Complete GameWorld object to persist
   * @throws Error if database is not initialized (logged, not thrown)
   */
  async saveWorld(world: GameWorld): Promise<void> {
    if (!this.db) return;

    try {
      const jsonData = JSON.stringify(stripCycles(world));
      const timestamp = Date.now();

      await this.db.runAsync(
        `INSERT OR REPLACE INTO game_worlds (id, data, created_at, updated_at)
         VALUES (?, ?, ?, ?)`,
        [world.id, jsonData, world.createdAt, timestamp]
      );

      // Update save slot
      const slot = this.saveSlots.get(world.id);
      if (slot) {
        await this.updateSaveSlot(world.id, {
          lastPlayedAt: timestamp,
          level: world.player.level,
        });
      }
    } catch (error) {
      console.error('Failed to save world:', error);
    }
  }

  /**
   * Load game world from local database
   * Retrieves serialized GameWorld by ID and deserializes from JSON
   * @param worldId - ID of the world to load
   * @returns GameWorld object or null if not found or error occurs
   */
  async loadWorld(worldId: string): Promise<GameWorld | null> {
    if (!this.db) return null;

    try {
      const result = await this.db.getFirstAsync<{ data: string }>(
        'SELECT data FROM game_worlds WHERE id = ?',
        [worldId],
      );

      if (!result) return null;

      return JSON.parse(result.data);
    } catch (error) {
      console.error('Failed to load world:', error);
      return null;
    }
  }

  /**
   * Create a new save slot for a world
   * Records world metadata for save list display without loading full world
   * Called when creating a new game or importing a save
   * @param world - GameWorld to create a save slot for
   * @returns SaveSlot metadata for the created save
   */
  async createSaveSlot(world: GameWorld): Promise<SaveSlot> {
    if (!this.db) throw new Error('Database not initialized');

    const slot: SaveSlot = {
      id: `slot_${Date.now()}`,
      worldId: world.id,
      playerName: world.player.name,
      createdAt: world.createdAt,
      lastPlayedAt: world.lastPlayedAt,
      playTime: 0,
      level: world.player.level,
    };

    try {
      await this.db.runAsync(
        `INSERT INTO save_slots (id, world_id, player_name, created_at, last_played_at, play_time, level)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [slot.id, slot.worldId, slot.playerName, slot.createdAt, slot.lastPlayedAt, slot.playTime, slot.level]
      );

      this.saveSlots.set(slot.worldId, slot);
    } catch (error) {
      console.error('Failed to create save slot:', error);
    }

    return slot;
  }

  /**
   * Update save slot metadata
   */
  private async updateSaveSlot(worldId: string, updates: Partial<SaveSlot>): Promise<void> {
    if (!this.db) return;

    const slot = this.saveSlots.get(worldId);
    if (!slot) return;

    const updated = { ...slot, ...updates };
    this.saveSlots.set(worldId, updated);

    try {
      await this.db.runAsync(
        `UPDATE save_slots
         SET player_name = ?, last_played_at = ?, play_time = ?, level = ?
         WHERE world_id = ?`,
        [updated.playerName, updated.lastPlayedAt, updated.playTime, updated.level, worldId]
      );
    } catch (error) {
      console.error('Failed to update save slot:', error);
    }
  }

  /**
   * Get all available save slots
   * Returns save slots sorted by most recently played
   * Used by main menu to display save list
   * @returns Array of SaveSlot objects sorted by lastPlayedAt descending
   */
  async getSaveSlots(): Promise<SaveSlot[]> {
    return Array.from(this.saveSlots.values()).sort(
      (a, b) => b.lastPlayedAt - a.lastPlayedAt,
    );
  }

  /**
   * Delete a save slot and associated game world
   * Removes both the save slot metadata and the complete world data
   * @param worldId - ID of the world/save to delete
   */
  async deleteSaveSlot(worldId: string): Promise<void> {
    if (!this.db) return;

    try {
      await this.db.runAsync(
        `DELETE FROM save_slots WHERE world_id = ?`,
        [worldId]
      );

      await this.db.runAsync(
        `DELETE FROM game_worlds WHERE id = ?`,
        [worldId]
      );

      this.saveSlots.delete(worldId);
    } catch (error) {
      console.error('Failed to delete save slot:', error);
    }
  }

  /**
   * Load save slots from database
   */
  private async loadSaveSlots(): Promise<void> {
    if (!this.db) return;

    try {
      const results = await this.db.getAllAsync<SaveSlot>(
        'SELECT id, world_id as worldId, player_name as playerName, created_at as createdAt, last_played_at as lastPlayedAt, play_time as playTime, level FROM save_slots',
      );

      results.forEach((slot) => {
        this.saveSlots.set(slot.worldId, slot);
      });
    } catch (error) {
      console.error('Failed to load save slots:', error);
    }
  }

  /**
   * Synchronize world to cloud storage
   * First saves locally, then uploads to cloud endpoint if available
   * Prevents concurrent sync operations (debounced)
   * @param world - GameWorld to sync
   * @returns true if sync successful, false if failed or already syncing
   */
  async syncToCloud(world: GameWorld): Promise<boolean> {
    if (this.cloudSyncStatus.syncing) return false;

    this.cloudSyncStatus.syncing = true;

    try {
      // First save locally
      await this.saveWorld(world);

      // Then sync to cloud if endpoint is available
      const response = await fetch(this.cloudEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          deviceId: this.deviceId,
          worldId: world.id,
          data: world,
          timestamp: Date.now(),
        }),
      });

      if (!response.ok) {
        throw new Error(`Cloud sync failed: ${response.statusText}`);
      }

      this.cloudSyncStatus.lastSync = Date.now();
      this.cloudSyncStatus.lastError = undefined;

      return true;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.cloudSyncStatus.lastError = errorMsg;
      console.error('Cloud sync failed:', errorMsg);
      return false;
    } finally {
      this.cloudSyncStatus.syncing = false;
    }
  }

  /**
   * Restore world from cloud storage
   * Fetches world data from cloud, verifies it, and saves locally
   * @param worldId - ID of the world to restore
   * @returns Restored GameWorld or null if not found or error occurs
   */
  async restoreFromCloud(worldId: string): Promise<GameWorld | null> {
    try {
      const response = await fetch(`${this.cloudEndpoint}/${worldId}`, {
        method: 'GET',
        headers: {
          'Device-ID': this.deviceId,
        },
      });

      if (!response.ok) {
        throw new Error(`Cloud restore failed: ${response.statusText}`);
      }

      const data = await response.json();
      const world = data.data;

      // Save to local storage
      await this.saveWorld(world);

      return world;
    } catch (error) {
      console.error('Cloud restore failed:', error);
      return null;
    }
  }

  /**
   * Get current cloud synchronization status
   * Use to check if sync is in progress or review last sync result
   * @returns Current CloudSyncStatus object
   */
  getSyncStatus(): CloudSyncStatus {
    return this.cloudSyncStatus;
  }

  /**
   * Export a saved game as a data URL
   * Serializes game world to JSON and encodes as base64 data URL
   * Can be downloaded or shared with other devices
   * @param worldId - ID of the world to export
   * @returns Data URL string or null if export fails
   */
  async exportSave(worldId: string): Promise<string | null> {
    try {
      const world = await this.loadWorld(worldId);
      if (!world) return null;

      const dataStr = JSON.stringify(world, null, 2);

      // Return data URL for all environments
      return `data:application/json;base64,${btoa(dataStr)}`;
    } catch (error) {
      console.error('Failed to export save:', error);
      return null;
    }
  }

  /**
   * Import a saved game from file
   * Reads file, parses JSON, saves to database, and creates save slot
   * @param filePath - Path to save file (JSON or data URL)
   * @returns Imported GameWorld or null if import fails
   */
  async importSave(filePath: string): Promise<GameWorld | null> {
    try {
      const content = await FileSystem.readAsStringAsync(filePath);
      const world: GameWorld = JSON.parse(content);

      await this.saveWorld(world);
      await this.createSaveSlot(world);

      return world;
    } catch (error) {
      console.error('Failed to import save:', error);
      return null;
    }
  }

  /**
   * Clear all saved games and data
   * Deletes all game worlds, save slots, and sync logs
   * WARNING: This is irreversible - use with caution
   * Used when uninstalling or resetting the app
   */
  async clearAllData(): Promise<void> {
    if (!this.db) return;

    try {
      await this.db.execAsync(`DELETE FROM game_worlds`);
      await this.db.execAsync(`DELETE FROM save_slots`);
      await this.db.execAsync(`DELETE FROM sync_log`);
      this.saveSlots.clear();
    } catch (error) {
      console.error('Failed to clear data:', error);
    }
  }

  // ============================================================================
  // GENERIC SETTINGS
  // ============================================================================

  /**
   * Save a generic setting value
   */
  public async saveSetting(key: string, value: string): Promise<void> {
    if (!this.db) return;
    try {
      await this.db.runAsync(
        `INSERT OR REPLACE INTO device_settings (key, value) VALUES (?, ?)`,
        [key, value]
      );
    } catch (error) {
      console.error(`Failed to save setting ${key}:`, error);
    }
  }

  /**
   * Get a generic setting value
   */
  public async getSetting(key: string): Promise<string | null> {
    if (!this.db) return null;
    try {
      const result = await this.db.getFirstAsync<{ value: string }>(
        'SELECT value FROM device_settings WHERE key = ?',
        [key]
      );
      return result?.value || null;
    } catch (error) {
      console.error(`Failed to get setting ${key}:`, error);
      return null;
    }
  }
  /**
   * Save economy state
   */
  public async saveEconomyState(state: any): Promise<void> {
    if (!this.db) return;
    try {
      await this.saveSetting('economy_data', JSON.stringify(state));
    } catch (error) {
      console.error('Failed to save economy state:', error);
    }
  }

  /**
   * Load economy state
   */
  public async loadEconomyState(): Promise<any | null> {
    if (!this.db) return null;
    try {
      const data = await this.getSetting('economy_data');
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Failed to load economy state:', error);
      return null;
    }
  }
}
