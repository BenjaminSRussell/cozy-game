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

/** Fixed local save slots. Metadata lives under cozy_slot_1 … cozy_slot_3. */
export const LOCAL_SAVE_SLOT_COUNT = 3;

export type LocalSaveSlotId = 1 | 2 | 3;

/**
 * One of the three local slots.
 * Fields are omitted when the save does not have them.
 * Thumbnail is omitted when there is no image, so the card stays blank.
 */
export interface LocalSaveSlot {
  slotId: LocalSaveSlotId;
  worldId?: string;
  farmName?: string;
  playerName?: string;
  date?: string;
  gold?: number;
  playTimeMinutes?: number;
  thumbnailDataUrl?: string;
}

/** Text and thumbnail the slot card can show. Missing facts are absent. */
export interface LocalSlotCardContent {
  occupied: boolean;
  title: string;
  playerName?: string;
  dateLabel?: string;
  goldLabel?: string;
  playTimeLabel?: string;
  thumbnailDataUrl?: string;
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
const META_PREFIX = 'cozy_meta_';
const SLOTS_KEY = 'cozy_slots';
/** Numbered slot metadata. Not a prefix of cozy_slots, and not cozy_meta_. */
const LOCAL_SLOT_PREFIX = 'cozy_slot_';
const SETTING_PREFIX = 'cozy_setting_';
const DEVICE_KEY = 'cozy_device_id';
/** Same 28-day season length the clock uses. Not imported, so this file stays storage-only. */
const DAYS_PER_SEASON = 28;
const SEASONS_PER_YEAR = 4;

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

function metaKey(slotId: string): string {
  return `${META_PREFIX}${slotId}`;
}

/** Metadata written by this manager. Rejects corrupt or partial records. */
function parseSaveSlot(raw: string): SaveSlot | null {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return null;
    }
    const slot = parsed as SaveSlot;
    if (typeof slot.id !== 'string' || typeof slot.worldId !== 'string') {
      return null;
    }
    return slot;
  } catch {
    return null;
  }
}

function readStoredSlot(slotId: string): SaveSlot | null {
  const raw = store().getItem(metaKey(slotId));
  if (!raw) return null;
  return parseSaveSlot(raw);
}

export function isLocalSaveSlotId(slotId: number): slotId is LocalSaveSlotId {
  return slotId === 1 || slotId === 2 || slotId === 3;
}

function localSlotKey(slotId: LocalSaveSlotId): string {
  return `${LOCAL_SLOT_PREFIX}${slotId}`;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function readOptionalString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function readOptionalNumber(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
  return value;
}

function titleCaseWord(value: string): string {
  const lower = value.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

/** Calendar label from fields the world actually stores. An explicit date string wins. */
function formatWorldDate(world: Record<string, unknown>): string | undefined {
  const explicit = readOptionalString(world.date);
  if (explicit) return explicit;
  const season = readOptionalString(world.season);
  const total = readOptionalNumber(world.totalDaysPlayed);
  if (!season && total === undefined) return undefined;
  const seasonLabel = season ? titleCaseWord(season) : undefined;
  if (total === undefined) return seasonLabel;
  const days = Math.max(0, Math.floor(total));
  const day = (days % DAYS_PER_SEASON) + 1;
  const year = Math.floor(days / (DAYS_PER_SEASON * SEASONS_PER_YEAR)) + 1;
  if (seasonLabel) return `Year ${year}, ${seasonLabel} ${day}`;
  return `Year ${year}, Day ${day}`;
}

/** `playTime` is seconds. `stats.total_play_time` is milliseconds and is only a fallback. */
function playTimeMinutesFromPlayer(player: Record<string, unknown> | null): number | undefined {
  if (!player) return undefined;
  const seconds = readOptionalNumber(player.playTime);
  if (seconds !== undefined) return Math.max(0, Math.floor(seconds / 60));
  const stats = asRecord(player.stats);
  const milliseconds = stats ? readOptionalNumber(stats.total_play_time) : undefined;
  if (milliseconds === undefined) return undefined;
  return Math.max(0, Math.floor(milliseconds / 60000));
}

interface WorldSummary {
  farmName?: string;
  playerName?: string;
  date?: string;
  gold?: number;
  playTimeMinutes?: number;
  thumbnailDataUrl?: string;
}

function summaryFromRecord(world: Record<string, unknown>): WorldSummary {
  const player = asRecord(world.player);
  const farmName = readOptionalString(world.farmName);
  const playerName = player ? readOptionalString(player.name) : undefined;
  const gold = player ? readOptionalNumber(player.coins) : undefined;
  const playTimeMinutes = playTimeMinutesFromPlayer(player);
  const date = formatWorldDate(world);
  const thumbnailDataUrl =
    readOptionalString(world.thumbnailDataUrl) ?? readOptionalString(world.thumbnail);
  return {
    ...(farmName ? { farmName } : {}),
    ...(playerName ? { playerName } : {}),
    ...(date ? { date } : {}),
    ...(gold !== undefined ? { gold } : {}),
    ...(playTimeMinutes !== undefined ? { playTimeMinutes } : {}),
    ...(thumbnailDataUrl ? { thumbnailDataUrl } : {}),
  };
}

function readStoredWorldSummary(worldId: string): WorldSummary {
  try {
    const raw = store().getItem(worldKey(worldId));
    if (!raw) return {};
    const parsed = asRecord(JSON.parse(raw) as unknown);
    if (!parsed) return {};
    return summaryFromRecord(parsed);
  } catch {
    return {};
  }
}

function summaryFromWorld(world: GameWorld): WorldSummary {
  return summaryFromRecord(world as unknown as Record<string, unknown>);
}

function parseLocalSaveSlot(raw: string, slotId: LocalSaveSlotId): LocalSaveSlot | null {
  try {
    const parsed = asRecord(JSON.parse(raw) as unknown);
    if (!parsed) return null;
    const worldId = readOptionalString(parsed.worldId);
    const farmName = readOptionalString(parsed.farmName);
    const playerName = readOptionalString(parsed.playerName);
    const date = readOptionalString(parsed.date);
    const gold = readOptionalNumber(parsed.gold);
    const playRaw = readOptionalNumber(parsed.playTimeMinutes);
    const playTimeMinutes = playRaw !== undefined && playRaw >= 0 ? playRaw : undefined;
    const thumbnailDataUrl = readOptionalString(parsed.thumbnailDataUrl);
    if (
      !worldId &&
      !farmName &&
      !playerName &&
      !date &&
      gold === undefined &&
      playTimeMinutes === undefined &&
      !thumbnailDataUrl
    ) {
      return null;
    }
    return {
      slotId,
      ...(worldId ? { worldId } : {}),
      ...(farmName ? { farmName } : {}),
      ...(playerName ? { playerName } : {}),
      ...(date ? { date } : {}),
      ...(gold !== undefined ? { gold } : {}),
      ...(playTimeMinutes !== undefined ? { playTimeMinutes } : {}),
      ...(thumbnailDataUrl ? { thumbnailDataUrl } : {}),
    };
  } catch {
    return null;
  }
}

function readLocalSlot(slotId: LocalSaveSlotId): LocalSaveSlot | null {
  const raw = store().getItem(localSlotKey(slotId));
  if (!raw) return null;
  return parseLocalSaveSlot(raw, slotId);
}

/** Prefer the world blob for facts it has. Keep slot-only name and thumbnail when the blob lacks them. */
function overlaySummary(slot: LocalSaveSlot): LocalSaveSlot {
  if (!slot.worldId) return slot;
  const summary = readStoredWorldSummary(slot.worldId);
  const farmName = summary.farmName ?? slot.farmName;
  const playerName = summary.playerName ?? slot.playerName;
  const date = summary.date ?? slot.date;
  const gold = summary.gold !== undefined ? summary.gold : slot.gold;
  const playTimeMinutes =
    summary.playTimeMinutes !== undefined ? summary.playTimeMinutes : slot.playTimeMinutes;
  const thumbnailDataUrl = slot.thumbnailDataUrl ?? summary.thumbnailDataUrl;
  return {
    slotId: slot.slotId,
    ...(slot.worldId ? { worldId: slot.worldId } : {}),
    ...(farmName ? { farmName } : {}),
    ...(playerName ? { playerName } : {}),
    ...(date ? { date } : {}),
    ...(gold !== undefined ? { gold } : {}),
    ...(playTimeMinutes !== undefined ? { playTimeMinutes } : {}),
    ...(thumbnailDataUrl ? { thumbnailDataUrl } : {}),
  };
}

function buildLocalSlot(
  slotId: LocalSaveSlotId,
  world: GameWorld,
  previous: LocalSaveSlot | null,
  options?: { farmName?: string; thumbnailDataUrl?: string },
): LocalSaveSlot {
  const summary = summaryFromWorld(world);
  const sameWorld = previous?.worldId != null && previous.worldId === world.id;
  const farmName =
    readOptionalString(options?.farmName) ?? summary.farmName ?? (sameWorld ? previous?.farmName : undefined);
  const thumbnailDataUrl =
    readOptionalString(options?.thumbnailDataUrl) ??
    summary.thumbnailDataUrl ??
    (sameWorld ? previous?.thumbnailDataUrl : undefined);
  return {
    slotId,
    worldId: world.id,
    ...(farmName ? { farmName } : {}),
    ...(summary.playerName ? { playerName: summary.playerName } : {}),
    ...(summary.date ? { date: summary.date } : {}),
    ...(summary.gold !== undefined ? { gold: summary.gold } : {}),
    ...(summary.playTimeMinutes !== undefined ? { playTimeMinutes: summary.playTimeMinutes } : {}),
    ...(thumbnailDataUrl ? { thumbnailDataUrl } : {}),
  };
}

export function localSlotCardContent(slot: LocalSaveSlot | null): LocalSlotCardContent {
  if (!slot) {
    return { occupied: false, title: 'Empty Slot' };
  }
  const title = slot.farmName || slot.playerName || 'Save';
  const playerName =
    slot.farmName && slot.playerName && slot.playerName !== slot.farmName ? slot.playerName : undefined;
  return {
    occupied: true,
    title,
    ...(playerName ? { playerName } : {}),
    ...(slot.date ? { dateLabel: `Date: ${slot.date}` } : {}),
    ...(slot.gold !== undefined ? { goldLabel: `Gold: ${slot.gold}` } : {}),
    ...(slot.playTimeMinutes !== undefined
      ? { playTimeLabel: `Play time: ${slot.playTimeMinutes} min` }
      : {}),
    ...(slot.thumbnailDataUrl ? { thumbnailDataUrl: slot.thumbnailDataUrl } : {}),
  };
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

/** Player fields an older save may omit. `stamina` is not on PlayerState yet. */
type LoadedPlayer = Partial<GameWorld['player']> & { stamina?: number };

/** Parsed save. Not Partial<GameWorld>: that intersection would require a full PlayerState. */
type LoadedWorld = {
  player?: LoadedPlayer;
  farmPlots?: GameWorld['farmPlots'];
  buildings?: GameWorld['buildings'];
};

/**
 * Stand-in player when a save has none. No shared helper exists yet.
 * Enough fields for the store to read name, level, inventory, and stamina.
 */
function createDefaultPlayer(): LoadedPlayer {
  return {
    id: 'player',
    name: 'Farmer',
    level: 1,
    experience: 0,
    coins: 0,
    inventory: [],
    tools: {},
    unlocks: new Set<string>(),
    stats: {
      farmingLevel: 1,
      buildingLevel: 1,
      diggingLevel: 1,
      total_play_time: 0,
    },
    animation: {
      action: 'idle',
      frame: 0,
      direction: 0,
      isPlaying: false,
    },
    position: { x: 0, y: 0, z: 0 },
    rotation: 0,
    stamina: 100,
  };
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
   * Also writes cozy_meta_${world.id} so the save list does not load the world.
   * The live world object is not mutated.
   * @param world - Complete GameWorld object to persist
   */
  async saveWorld(world: GameWorld): Promise<void> {
    try {
      const jsonData = JSON.stringify(stripCycles(world));
      const timestamp = Date.now();
      store().setItem(worldKey(world.id), jsonData);
      this.writeSlotMeta(world, timestamp);

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
   * Write cozy_meta_${world.id} beside the world blob.
   * createdAt is kept when that meta record already exists.
   * playTime is 0 because PlayerState does not declare that field yet.
   */
  private writeSlotMeta(world: GameWorld, now: number): void {
    const slotId = world.id;
    const existing = readStoredSlot(slotId);
    const player = world.player;
    const meta: SaveSlot = {
      id: slotId,
      worldId: world.id,
      playerName: player?.name ?? '',
      createdAt: existing?.createdAt ?? now,
      lastPlayedAt: now,
      playTime: 0,
      level: player?.level ?? 0,
    };
    store().setItem(metaKey(slotId), JSON.stringify(meta));
  }

  /**
   * List save slots from cozy_meta_* keys.
   * Does not read or parse cozy_save_* world blobs.
   * @returns SaveSlot metadata sorted by lastPlayedAt descending
   */
  listSlots(): SaveSlot[] {
    const slots: SaveSlot[] = [];
    const saved = store();
    for (const key of saved.keys()) {
      if (!key.startsWith(META_PREFIX)) continue;
      const raw = saved.getItem(key);
      if (!raw) continue;
      const slot = parseSaveSlot(raw);
      if (slot) slots.push(slot);
    }
    return slots.sort((a, b) => {
      const left = typeof a.lastPlayedAt === 'number' ? a.lastPlayedAt : 0;
      const right = typeof b.lastPlayedAt === 'number' ? b.lastPlayedAt : 0;
      return right - left;
    });
  }

  /**
   * Load game world from localStorage
   * Retrieves serialized GameWorld by ID and deserializes from JSON.
   * Older saves may omit player, stamina, farmPlots, or buildings; those
   * get defaults so callers do not read undefined. Invalid JSON returns null.
   * @param worldId - ID of the world to load
   * @returns GameWorld object or null if not found or error occurs
   */
  async loadWorld(worldId: string): Promise<GameWorld | null> {
    try {
      const raw = store().getItem(worldKey(worldId));
      if (!raw) return null;

      const world = JSON.parse(raw) as LoadedWorld;
      if (world == null || typeof world !== 'object') {
        return null;
      }

      const player = world.player ?? createDefaultPlayer();
      world.player = player;
      if (player.stamina === undefined) {
        player.stamina = 100;
      }
      if (!world.farmPlots) {
        world.farmPlots = [];
      }
      if (!world.buildings) {
        world.buildings = [];
      }
      return world as GameWorld;
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
   * Three local slots from cozy_slot_1 … cozy_slot_3.
   * Does not create, rewrite, or delete cozy_save_* / cozy_meta_* keys.
   */
  listLocalSlots(): Array<LocalSaveSlot | null> {
    const slots: Array<LocalSaveSlot | null> = [];
    for (let slotId = 1; slotId <= LOCAL_SAVE_SLOT_COUNT; slotId += 1) {
      const stored = readLocalSlot(slotId as LocalSaveSlotId);
      slots.push(stored ? overlaySummary(stored) : null);
    }
    return slots;
  }

  /**
   * Save the world under cozy_save_${id} and cozy_meta_${id}, and write cozy_slot_n.
   * A thumbnail passed here stays on the slot key. It is not written into the world blob.
   */
  async saveLocalSlot(
    slotId: number,
    world: GameWorld,
    options?: { farmName?: string; thumbnailDataUrl?: string },
  ): Promise<LocalSaveSlot | null> {
    if (!isLocalSaveSlotId(slotId)) return null;
    try {
      await this.saveWorld(world);
      const slot = buildLocalSlot(slotId, world, readLocalSlot(slotId), options);
      store().setItem(localSlotKey(slotId), JSON.stringify(slot));
      return slot;
    } catch (error) {
      console.error('Failed to save local slot:', error);
      return null;
    }
  }

  /** Load the world id stored on cozy_slot_n. Missing and out-of-range slots return null. */
  async loadLocalSlot(slotId: number): Promise<GameWorld | null> {
    if (!isLocalSaveSlotId(slotId)) return null;
    const slot = readLocalSlot(slotId);
    if (!slot?.worldId) return null;
    return this.loadWorld(slot.worldId);
  }

  /**
   * Remove cozy_slot_n.
   * The world keys are removed only when no other numbered slot still points at that world.
   */
  async deleteLocalSlot(slotId: number): Promise<void> {
    if (!isLocalSaveSlotId(slotId)) return;
    try {
      const slot = readLocalSlot(slotId);
      store().removeItem(localSlotKey(slotId));
      if (!slot?.worldId) return;
      const stillUsed = ([1, 2, 3] as const).some((other) => {
        if (other === slotId) return false;
        return readLocalSlot(other)?.worldId === slot.worldId;
      });
      if (stillUsed) return;
      await this.deleteSaveSlot(slot.worldId);
    } catch (error) {
      console.error('Failed to delete local slot:', error);
    }
  }

  /**
   * Fill empty numbered slots from cozy_meta_* saves that are not already in a slot.
   * Writes cozy_slot_n only. Does not remove or rewrite cozy_save_* or cozy_meta_*.
   */
  async materializeSlotCards(): Promise<Array<LocalSaveSlot | null>> {
    const cards = this.listLocalSlots();
    const used = new Set<string>();
    for (const card of cards) {
      if (card?.worldId) used.add(card.worldId);
    }
    const legacy = this.listSlots().filter((slot) => slot.worldId && !used.has(slot.worldId));
    let legacyIndex = 0;
    for (let index = 0; index < cards.length && legacyIndex < legacy.length; index += 1) {
      if (cards[index]) continue;
      const meta = legacy[legacyIndex];
      legacyIndex += 1;
      const slotId = (index + 1) as LocalSaveSlotId;
      const summary = readStoredWorldSummary(meta.worldId);
      const playerName = summary.playerName ?? readOptionalString(meta.playerName);
      const playTimeMinutes =
        summary.playTimeMinutes !== undefined
          ? summary.playTimeMinutes
          : typeof meta.playTime === 'number' && meta.playTime > 0
            ? meta.playTime
            : undefined;
      const slot: LocalSaveSlot = {
        slotId,
        worldId: meta.worldId,
        ...(summary.farmName ? { farmName: summary.farmName } : {}),
        ...(playerName ? { playerName } : {}),
        ...(summary.date ? { date: summary.date } : {}),
        ...(summary.gold !== undefined ? { gold: summary.gold } : {}),
        ...(playTimeMinutes !== undefined ? { playTimeMinutes } : {}),
        ...(summary.thumbnailDataUrl ? { thumbnailDataUrl: summary.thumbnailDataUrl } : {}),
      };
      store().setItem(localSlotKey(slotId), JSON.stringify(slot));
      cards[index] = overlaySummary(slot);
      used.add(meta.worldId);
    }
    return cards;
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
      const saved = store();
      saved.removeItem(worldKey(worldId));
      saved.removeItem(metaKey(worldId));
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
        if (
          key.startsWith(WORLD_PREFIX) ||
          key.startsWith(META_PREFIX) ||
          key.startsWith(LOCAL_SLOT_PREFIX)
        ) {
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
