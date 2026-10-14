/**
 * Audio Manager for Cozy Haven
 *
 * Centralized audio system managing background music, ambient sounds, and SFX.
 * Uses HTML5 Audio API for playback with fade in/out effects.
 *
 * Features:
 * - Season-based music system (different tracks for each season)
 * - Background music with fade transitions
 * - Ambient layering (birds, wind, insects, etc.)
 * - Sound effects (planting, harvesting, mining, etc.)
 * - Volume control per category (music, SFX, ambient)
 * - Mute/unmute functionality
 *
 * Free music sources:
 * - Incompetech (Kevin MacLeod)
 * - Free Music Archive
 * - OpenGameArt
 * - Zapsplat
 */

/**
 * Audio track definition
 * Represents a single audio file with metadata and playback settings
 */
export interface AudioTrack {
  /** Unique identifier for this track */
  id: string;
  /** Display name of the track */
  name: string;
  /** File path to audio asset */
  path: string;
  /** Category: music (background), ambient (layered), or sfx (effect) */
  type: 'music' | 'ambient' | 'sfx';
  /** Associated season for seasonal music tracks */
  season?: 'spring' | 'summer' | 'autumn' | 'winter';
  /** Duration in seconds */
  duration: number;
  /** Whether track should loop when finished */
  loop: boolean;
}

/**
 * Audio volume settings
 * Controls volume levels for different audio categories
 */
export interface AudioSettings {
  /** Background music volume (0-1 scale) */
  musicVolume: number;
  /** Sound effects volume (0-1 scale) */
  sfxVolume: number;
  /** Ambient sounds volume (0-1 scale) */
  ambientVolume: number;
}

/**
 * Audio Manager class
 * Handles all audio playback for the game
 */
export class AudioManager {
  /** One manager per page so browsers never allocate a second AudioContext. */
  private static instance: AudioManager | null = null;

  /** Web Audio API context (for future advanced audio processing) */
  private audioContext: AudioContext | null = null;

  /** Map of all available audio tracks by ID */
  private tracks: Map<string, AudioTrack> = new Map();

  /** Currently playing background music track */
  private currentTrack: AudioTrack | null = null;

  /** HTML Audio elements cache for playback */
  private audioElements: Map<string, HTMLAudioElement> = new Map();

  /** Current volume settings for all audio categories */
  private settings: AudioSettings = {
    musicVolume: 0.7,
    sfxVolume: 0.8,
    ambientVolume: 0.6,
  };

  /**
   * Create the single AudioManager.
   * Loads track definitions and, when Web Audio exists, exactly one AudioContext.
   * Hosts without AudioContext (native, tests) skip context creation instead of throwing.
   */
  private constructor() {
    this.initializeAudioTracks();
    const scope = globalThis as typeof globalThis & {
      AudioContext?: new () => AudioContext;
      webkitAudioContext?: new () => AudioContext;
    };
    const AudioCtx = scope.AudioContext ?? scope.webkitAudioContext;
    if (AudioCtx) {
      this.audioContext = new AudioCtx();
    }
  }

  /**
   * Return the shared AudioManager.
   * Later calls reuse the same object and the same AudioContext.
   */
  static getInstance(): AudioManager {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager();
    }
    return AudioManager.instance;
  }

  /**
   * Initialize collection of free background music
   */
  private initializeAudioTracks(): void {
    const musicTracks: AudioTrack[] = [
      // Spring themes
      {
        id: 'spring_morning',
        name: 'Spring Morning Ambience',
        path: 'assets/music/spring_morning.mp3',
        type: 'music',
        season: 'spring',
        duration: 180,
        loop: true,
      },
      {
        id: 'spring_birds',
        name: 'Bird Songs',
        path: 'assets/music/spring_birds.mp3',
        type: 'ambient',
        season: 'spring',
        duration: 120,
        loop: true,
      },
      // Summer themes
      {
        id: 'summer_exploration',
        name: 'Summer Exploration',
        path: 'assets/music/summer_exploration.mp3',
        type: 'music',
        season: 'summer',
        duration: 240,
        loop: true,
      },
      {
        id: 'summer_insects',
        name: 'Insect Ambience',
        path: 'assets/music/summer_insects.mp3',
        type: 'ambient',
        season: 'summer',
        duration: 150,
        loop: true,
      },
      // Autumn themes
      {
        id: 'autumn_harvest',
        name: 'Autumn Harvest',
        path: 'assets/music/autumn_harvest.mp3',
        type: 'music',
        season: 'autumn',
        duration: 200,
        loop: true,
      },
      {
        id: 'autumn_wind',
        name: 'Wind Ambience',
        path: 'assets/music/autumn_wind.mp3',
        type: 'ambient',
        season: 'autumn',
        duration: 180,
        loop: true,
      },
      // Winter themes
      {
        id: 'winter_cozy',
        name: 'Winter Coziness',
        path: 'assets/music/winter_cozy.mp3',
        type: 'music',
        season: 'winter',
        duration: 220,
        loop: true,
      },
      {
        id: 'winter_snow',
        name: 'Snow Ambience',
        path: 'assets/music/winter_snow.mp3',
        type: 'ambient',
        season: 'winter',
        duration: 140,
        loop: true,
      },
      // General tracks
      {
        id: 'building_mode',
        name: 'Building Mode Music',
        path: 'assets/music/building_mode.mp3',
        type: 'music',
        duration: 180,
        loop: true,
      },
      {
        id: 'menu_theme',
        name: 'Menu Theme',
        path: 'assets/music/menu_theme.mp3',
        type: 'music',
        duration: 120,
        loop: true,
      },
      // SFX
      {
        id: 'plant_seed',
        name: 'Plant Seed',
        path: 'assets/sfx/plant_seed.mp3',
        type: 'sfx',
        duration: 0.5,
        loop: false,
      },
      {
        id: 'harvest_crop',
        name: 'Harvest Crop',
        path: 'assets/sfx/harvest_crop.mp3',
        type: 'sfx',
        duration: 0.8,
        loop: false,
      },
      {
        id: 'water_splash',
        name: 'Water Splash',
        path: 'assets/sfx/water_splash.mp3',
        type: 'sfx',
        duration: 0.6,
        loop: false,
      },
      {
        id: 'building_place',
        name: 'Building Placed',
        path: 'assets/sfx/building_place.mp3',
        type: 'sfx',
        duration: 0.4,
        loop: false,
      },
      {
        id: 'mining_hit',
        name: 'Mining Hit',
        path: 'assets/sfx/mining_hit.mp3',
        type: 'sfx',
        duration: 0.3,
        loop: false,
      },
      {
        id: 'item_collect',
        name: 'Item Collected',
        path: 'assets/sfx/item_collect.mp3',
        type: 'sfx',
        duration: 0.4,
        loop: false,
      },
      {
        id: 'coin_collect',
        name: 'Coin Collected',
        path: 'assets/sfx/coin_collect.mp3',
        type: 'sfx',
        duration: 0.3,
        loop: false,
      },
      {
        id: 'level_up',
        name: 'Level Up',
        path: 'assets/sfx/level_up.mp3',
        type: 'sfx',
        duration: 1,
        loop: false,
      },
    ];

    musicTracks.forEach((track) => {
      this.tracks.set(track.id, track);
    });
  }

  /**
   * Initialize Web Audio API context
   * Called once during app startup for advanced audio features (future use)
   * Safe to call multiple times - checks if already initialized
   */
  async initializeAudioContext(): Promise<void> {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  /**
   * Play background music track
   * Stops currently playing music and starts new track with optional fade in
   * Only one music track can play at a time
   * @param trackId - ID of the music track to play
   * @param fadeIn - Fade in duration in milliseconds (default: 0 = instant)
   */
  async playMusic(trackId: string, fadeIn: number = 0): Promise<void> {
    const track = this.tracks.get(trackId);
    if (!track || track.type !== 'music') {
      console.warn(`Music track ${trackId} not found`);
      return;
    }

    // Stop current track
    if (this.currentTrack) {
      await this.stopMusic(1000);
    }

    this.currentTrack = track;

    let audio = this.audioElements.get(trackId);
    if (!audio) {
      audio = new Audio(track.path);
      audio.loop = track.loop;
      audio.volume = 0;
      this.audioElements.set(trackId, audio);
    }

    audio.play();

    // Fade in
    if (fadeIn > 0) {
      this.fadeAudio(audio, this.settings.musicVolume, fadeIn);
    } else {
      audio.volume = this.settings.musicVolume;
    }
  }

  /**
   * Stop currently playing background music
   * Optionally fade out before stopping
   * @param fadeOut - Fade out duration in milliseconds (default: 1000 ms)
   */
  async stopMusic(fadeOut: number = 1000): Promise<void> {
    if (!this.currentTrack) return;

    const audio = this.audioElements.get(this.currentTrack.id);
    if (audio) {
      if (fadeOut > 0) {
        await this.fadeAudio(audio, 0, fadeOut);
      }
      audio.pause();
      audio.currentTime = 0;
    }

    this.currentTrack = null;
  }

  /**
   * Play ambient sound (layered background audio)
   * Multiple ambient tracks can play simultaneously (unlike music)
   * Used for seasonal ambience (birds, wind, insects, etc.)
   * @param trackId - ID of the ambient track to play
   */
  async playAmbient(trackId: string): Promise<void> {
    const track = this.tracks.get(trackId);
    if (!track || track.type !== 'ambient') {
      console.warn(`Ambient track ${trackId} not found`);
      return;
    }

    let audio = this.audioElements.get(trackId);
    if (!audio) {
      audio = new Audio(track.path);
      audio.loop = track.loop;
      audio.volume = this.settings.ambientVolume;
      this.audioElements.set(trackId, audio);
    }

    audio.play();
  }

  /**
   * Stop playing ambient sound
   * @param trackId - ID of the ambient track to stop
   */
  stopAmbient(trackId: string): void {
    const audio = this.audioElements.get(trackId);
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
  }

  /**
   * Play a sound effect
   * Creates new audio instance to allow overlapping SFX
   * Short duration, non-looping audio for game events
   * @param trackId - ID of the SFX track to play
   */
  playSFX(trackId: string): void {
    const track = this.tracks.get(trackId);
    if (!track || track.type !== 'sfx') {
      console.warn(`SFX ${trackId} not found`);
      return;
    }

    // Create new instance to allow overlapping SFX
    const audio = new Audio(track.path);
    audio.volume = this.settings.sfxVolume;
    audio.play();
  }

  /**
   * Fade audio in/out
   */
  private fadeAudio(audio: HTMLAudioElement, targetVolume: number, duration: number): Promise<void> {
    return new Promise((resolve) => {
      const startVolume = audio.volume;
      const startTime = Date.now();

      const updateVolume = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);

        audio.volume = startVolume + (targetVolume - startVolume) * progress;

        if (progress < 1) {
          requestAnimationFrame(updateVolume);
        } else {
          audio.volume = targetVolume;
          resolve();
        }
      };

      updateVolume();
    });
  }

  /**
   * Get all available audio tracks
   * @returns Array of all AudioTrack objects
   */
  getAllTracks(): AudioTrack[] {
    return Array.from(this.tracks.values());
  }

  /**
   * Get audio tracks for a specific season
   * Used to filter music/ambient by current season
   * @param season - Season name ('spring', 'summer', 'autumn', 'winter')
   * @returns Array of AudioTracks matching the season
   */
  getTracksBySeason(season: string): AudioTrack[] {
    return Array.from(this.tracks.values()).filter((track) => track.season === season);
  }

  /**
   * Update audio volume settings
   * Applies to all currently playing audio in the specified category
   * @param settings - Partial AudioSettings object with volumes to update
   */
  updateVolume(settings: Partial<AudioSettings>): void {
    this.settings = { ...this.settings, ...settings };

    // Update current music volume
    if (this.currentTrack) {
      const audio = this.audioElements.get(this.currentTrack.id);
      if (audio) {
        audio.volume = this.settings.musicVolume;
      }
    }
  }

  /**
   * Get current audio settings
   * @returns Current AudioSettings object
   */
  getSettings(): AudioSettings {
    return this.settings;
  }

  /**
   * Mute all audio globally
   * Useful for pause menu or silent mode
   */
  muteAll(): void {
    this.audioElements.forEach((audio) => {
      audio.muted = true;
    });
  }

  /**
   * Unmute all audio globally
   * Restores audio after muteAll()
   */
  unmuteAll(): void {
    this.audioElements.forEach((audio) => {
      audio.muted = false;
    });
  }
}
