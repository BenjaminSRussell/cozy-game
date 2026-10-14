import type { GameWorld } from '../types/game';

/**
 * Persistence Manager for Cozy Haven
 *
 * Saves and loads the game world in localStorage so a web build can start
 * without a native database module. Save slots, settings, and the device id
 * use the same store. Cloud sync stays optional.
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

const WORLD_PREFIX = 'cozy_save_';
const SLOTS_KEY = 'cozy_slots';
const SETTING_PREFIX = 'cozy_setting_';
const DEVICE_KEY = 'cozy_device_id';

interface WebStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  key(index: number): string | null;
  readonly length: number;
}

interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  keys(): string[];
}

const memoryStore = new Map<string, string>();

function readLocalStorage(): WebStorage | null {
  try {
    const candidate = (globalThis as { localStorage?: WebStorage }).localStorage;
    if (
      candidate == null ||
      typeof candidate.getItem !== 'function' ||
      typeof candidate.setItem !== 'function' ||
      typeof candidate.removeItem !== 'function' ||
      typeof candidate.key !== 'function'
    ) {
      return null;
    }
    return candidate;
  } catch {
    return null;
  }
}

function storageKeys(candidate: WebStorage): string[] {
  const found: string[] = [];
  for (let index = 0; index < candidate.length; index += 1) {
    const key = candidate.key(index);
    if (key !== null) {
      found.push(key);
    }
  }
  return found;
}

/**
 * Browser localStorage when it works. A memory map otherwise, so a native
 * runtime without localStorage still accepts save and load calls.
 */
function store(): KeyValueStore {
  const local = readLocalStorage();
  if (local) {
    return {
      getItem: (key) => local.getItem(key),
      setItem: (key, value) => {
        local.setItem(key, value);
      },
      removeItem: (key) => {
        local.removeItem(key);
      },
      keys: () => storageKeys(local),
    };
  }

  return {
    getItem: (key) => (memoryStore.has(key) ? memoryStore.get(key) ?? null : null),
    setItem: (key, value) => {
      memoryStore.set(key, value);
    },
    removeItem: (key) => {
      memoryStore.delete(key);
    },
    keys: () => Array.from(memoryStore.keys()),
  };
}

function worldKey(worldId: string): string {
  return `${WORLD_PREFIX}${worldId}`;
}

function readImportText(source: string): string {
  if (!source.startsWith('data:')) {
    return source;
  }
  const comma = source.indexOf(',');
  if (comma < 0) {
    throw new Error('Invalid data URL');
  }
  const meta = source.slice(0, comma);
  const payload = source.slice(comma + 1);
  if (meta.includes(';base64')) {
    return atob(payload);
  }
  return decodeURIComponent(payload);
}

/**
 * Persistence Manager class
 * Manages local save/load for worlds, slots, and settings
 */
export class PersistenceManager {
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
   * Loads existing save slots and the device id from localStorage.
   * Called once during app startup in App.tsx
   */
  async initialize(): Promise<void> {
    try {
      this.loadSaveSlots();
      this.deviceId = this.readOrCreateDeviceId();
    } catch (error) {
      console.error('Failed to initialize persistence:', error);
    }
  }

  /**
   * Get or create device ID for cloud sync
   */
  private readOrCreateDeviceId(): string {
    try {
      const existing = store().getItem(DEVICE_KEY);
      if (existing) {
        return existing;
      }

      const created = `device_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
      store().setItem(DEVICE_KEY, created);
      return created;
    } catch (error) {
      console.error('Failed to get/create device ID:', error);
      return '';
    }
  }

  /**
   * Save game world to localStorage
   * Serializes GameWorld to JSON after dropping circular references.
   * The live world object is not mutated.
   * @param world - Complete GameWorld object to persist
   */
  async saveWorld(world: GameWorld): Promise<void> {
    try {
      const jsonData = JSON.stringify(stripCycles(world));
      const timestamp = Date.now();
      store().setItem(worldKey(world.id), jsonData);

      const slot = this.saveSlots.get(world.id);
      if (slot) {
        this.updateSaveSlot(world.id, {
          lastPlayedAt: timestamp,
          level: world.player.level,
        });
      }
    } catch (error) {
      console.error('Failed to save world:', error);
    }
  }

  /**
   * Load game world from localStorage
   * Retrieves serialized GameWorld by ID and deserializes from JSON
   * @param worldId - ID of the world to load
   * @returns GameWorld object or null if not found or error occurs
   */
  async loadWorld(worldId: string): Promise<GameWorld | null> {
    try {
      const raw = store().getItem(worldKey(worldId));
      if (!raw) return null;
      return JSON.parse(raw) as GameWorld;
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
      this.saveSlots.set(slot.worldId, slot);
      this.persistSlots();
    } catch (error) {
      console.error('Failed to create save slot:', error);
    }

    return slot;
  }

  /**
   * Update save slot metadata
   */
  private updateSaveSlot(worldId: string, updates: Partial<SaveSlot>): void {
    const slot = this.saveSlots.get(worldId);
    if (!slot) return;

    const updated = { ...slot, ...updates };
    this.saveSlots.set(worldId, updated);
    this.persistSlots();
  }

  private persistSlots(): void {
    store().setItem(SLOTS_KEY, JSON.stringify(Array.from(this.saveSlots.values())));
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
    try {
      this.saveSlots.delete(worldId);
      this.persistSlots();
      store().removeItem(worldKey(worldId));
    } catch (error) {
      console.error('Failed to delete save slot:', error);
    }
  }

  /**
   * Load save slots from localStorage
   */
  private loadSaveSlots(): void {
    try {
      const raw = store().getItem(SLOTS_KEY);
      if (!raw) return;

      const slots = JSON.parse(raw) as SaveSlot[];
      if (!Array.isArray(slots)) return;

      slots.forEach((slot) => {
        if (slot?.worldId) {
          this.saveSlots.set(slot.worldId, slot);
        }
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
   * Import a saved game from a JSON string or a data URL
   * Parses the payload, saves it, and creates a save slot
   * @param filePath - JSON text or a data URL (web builds have no native file API)
   * @returns Imported GameWorld or null if import fails
   */
  async importSave(filePath: string): Promise<GameWorld | null> {
    try {
      const content = readImportText(filePath);
      const world = JSON.parse(content) as GameWorld;

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
   * Deletes all game worlds and save slots
   * WARNING: This is irreversible - use with caution
   * Used when uninstalling or resetting the app
   */
  async clearAllData(): Promise<void> {
    try {
      const saved = store();
      for (const key of saved.keys()) {
        if (key.startsWith(WORLD_PREFIX)) {
          saved.removeItem(key);
        }
      }
      saved.removeItem(SLOTS_KEY);
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
    try {
      store().setItem(`${SETTING_PREFIX}${key}`, value);
    } catch (error) {
      console.error(`Failed to save setting ${key}:`, error);
    }
  }

  /**
   * Get a generic setting value
   */
  public async getSetting(key: string): Promise<string | null> {
    try {
      return store().getItem(`${SETTING_PREFIX}${key}`) || null;
    } catch (error) {
      console.error(`Failed to get setting ${key}:`, error);
      return null;
    }
  }
  /**
   * Save economy state
   */
  public async saveEconomyState(state: any): Promise<void> {
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
    try {
      const data = await this.getSetting('economy_data');
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Failed to load economy state:', error);
      return null;
    }
  }
}
