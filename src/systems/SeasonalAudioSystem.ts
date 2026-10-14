/**
 * Seasonal music and weather beds, synthesized in the Web Audio API.
 * No music files are loaded or generated on disk. A mute control is required
 * for every loop; playback does not read prefers-reduced-motion.
 */

import { AudioManager } from './AudioManager';

export type BgmSeason = 'spring' | 'summer' | 'autumn' | 'winter';

export const BGM_NOTES: Record<BgmSeason, readonly number[]> = {
  spring: [262, 330, 392],
  summer: [330, 415, 494],
  autumn: [196, 247, 294],
  winter: [174, 220, 262],
};

/** Outdoor bed vs the ducked level used while the player is indoors. */
export const OUTDOOR_MUSIC_GAIN = 0.22;
export const INDOOR_MUSIC_GAIN = 0.05;
export const MUSIC_FADE_SECONDS = 0.8;

export interface SeasonalAudioState {
  season: string;
  weather?: string;
  /** Hour of the game day, 0–24. */
  hour?: number;
  indoors?: boolean;
}

interface StructureFootprint {
  position: { x: number; y: number };
  dimensions?: { x: number; y: number } | null;
  size?: { x: number; y: number } | null;
}

interface PlayingNode {
  source: AudioBufferSourceNode;
  gain: GainNode;
  filter: BiquadFilterNode | null;
}

export function canonicalSeason(season: string): BgmSeason {
  const value = season.trim().toLowerCase();
  if (value === 'fall' || value === 'autumn') return 'autumn';
  if (value === 'summer') return 'summer';
  if (value === 'winter') return 'winter';
  return 'spring';
}

/** Night window from 8 PM through 2 AM, exclusive of 2:00. */
export function isCricketHour(hour: number): boolean {
  if (!Number.isFinite(hour)) return false;
  const wrapped = ((hour % 24) + 24) % 24;
  return wrapped >= 20 || wrapped < 2;
}

export function isRainyWeather(weather: string): boolean {
  const value = weather.trim().toLowerCase();
  return value === 'rain' || value === 'rainy' || value === 'storm' || value === 'flood';
}

export function isPlayerIndoors(
  position: { x: number; y: number },
  buildings: readonly StructureFootprint[] | null | undefined,
): boolean {
  if (!buildings) return false;
  const tx = Math.floor(position.x);
  const ty = Math.floor(position.y);
  return buildings.some((building) => {
    const width = Math.max(1, Math.floor(building.dimensions?.x ?? building.size?.x ?? 1));
    const height = Math.max(1, Math.floor(building.dimensions?.y ?? building.size?.y ?? 1));
    const ox = Math.floor(building.position.x);
    const oy = Math.floor(building.position.y);
    return tx >= ox && tx < ox + width && ty >= oy && ty < oy + height;
  });
}

/** Deterministic seasonal bed. Integer frequencies so a 2s loop has no click. */
export function renderBgm(data: Float32Array, sampleRate: number, season: BgmSeason): void {
  const notes = BGM_NOTES[season];
  const harmonic = season === 'summer' ? 0.35 : season === 'autumn' ? 0.12 : 0;
  const amp = season === 'winter' ? 0.2 : season === 'autumn' ? 0.28 : 0.34;
  const rate = sampleRate > 0 ? sampleRate : 44100;
  for (let i = 0; i < data.length; i++) {
    const t = i / rate;
    let sample = 0;
    for (const note of notes) {
      sample += Math.sin(2 * Math.PI * note * t);
      if (harmonic !== 0) sample += harmonic * Math.sin(2 * Math.PI * note * 2 * t);
    }
    sample = (sample / notes.length) * amp;
    if (season === 'winter') {
      const beat = t % 2;
      if (beat < 0.08) sample += Math.sin(2 * Math.PI * 880 * t) * (1 - beat / 0.08) * 0.15;
    }
    data[i] = Math.max(-1, Math.min(1, sample));
  }
}

export class SeasonalAudioSystem {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private musicSource: AudioBufferSourceNode | null = null;
  private rain: PlayingNode | null = null;
  private wind: PlayingNode | null = null;
  private crickets: PlayingNode | null = null;
  private thunder: PlayingNode | null = null;
  private season = '';
  private weather = '';
  private hour = 12;
  private indoors = false;
  private muted = false;
  private nextThunderAt = 0;
  private ownedButton: HTMLButtonElement | null = null;
  private muteControlReady = false;

  /**
   * Drive every bed from the current world.
   * Same inputs do not stack another loop.
   */
  public update(state: SeasonalAudioState): void {
    this.ensureMuteButton();
    const ctx = this.ensureContext();
    if (ctx) this.ensureGraph(ctx);
    if (typeof state.indoors === 'boolean') this.setIndoors(state.indoors);
    if (state.hour !== undefined) this.applyHour(state.hour);
    if (state.weather !== undefined) this.applyWeather(state.weather);
    if (state.season !== undefined) this.applySeason(state.season);
    if (isRainyWeather(this.weather)) this.maybeThunder(false);
  }

  /** Season-only entry used by the 3D renderer. Weather and hour stay as last set. */
  public updateSeason(season: string): void {
    this.update({ season });
  }

  public setIndoors(indoors: boolean): void {
    if (this.indoors === indoors) return;
    this.indoors = indoors;
    if (this.audioContext && this.musicSource && this.musicGain) {
      this.fadeMusic(this.audioContext, false);
    }
  }

  public mute(): void {
    this.muted = true;
    this.setMaster(0);
    this.syncOwnedButton();
  }

  public unmute(): void {
    this.muted = false;
    this.setMaster(1);
    this.syncOwnedButton();
  }

  public isMuted(): boolean {
    return this.muted;
  }

  /** Resume a suspended context after a user gesture. Does not start a new loop. */
  public resume(): void {
    const ctx = this.ensureContext();
    if (ctx) this.resumeContext(ctx);
  }

  /** Stop every loop. Mute state is kept so the next update stays silent until unmute. */
  public stop(): void {
    this.stopMusicSource();
    this.stopRain();
    this.stopWind();
    this.stopCrickets();
    this.stopThunder();
  }

  private applySeason(season: string): void {
    const next = canonicalSeason(season);
    if (this.season !== next || !this.musicSource) {
      this.season = next;
      this.startMusic(next);
    }
    if (next === 'autumn' || next === 'winter') this.startWind();
    else this.stopWind();
  }

  private applyWeather(weather: string): void {
    const next = weather.trim().toLowerCase();
    const changed = next !== this.weather;
    this.weather = next;
    if (isRainyWeather(next)) {
      if (changed || !this.rain) this.startRain();
      if (changed) this.maybeThunder(true);
      return;
    }
    if (changed) {
      this.stopRain();
      this.stopThunder();
      this.nextThunderAt = 0;
    }
  }

  private applyHour(hour: number): void {
    this.hour = hour;
    if (isCricketHour(hour)) this.startCrickets();
    else this.stopCrickets();
  }

  private ensureContext(): AudioContext | null {
    if (this.audioContext) {
      this.resumeContext(this.audioContext);
      return this.audioContext;
    }
    const scope = globalThis as typeof globalThis & {
      AudioContext?: new () => AudioContext;
      webkitAudioContext?: new () => AudioContext;
    };
    const AudioCtx = scope.AudioContext ?? scope.webkitAudioContext;
    if (typeof AudioCtx !== 'function') return null;
    try {
      this.audioContext = new AudioCtx();
    } catch {
      return null;
    }
    this.resumeContext(this.audioContext);
    return this.audioContext;
  }

  private resumeContext(ctx: AudioContext): void {
    if (ctx.state !== 'suspended') return;
    const pending = ctx.resume();
    if (pending && typeof pending.catch === 'function') void pending.catch(() => undefined);
  }

  private ensureGraph(ctx: AudioContext): void {
    if (!this.masterGain) {
      this.masterGain = ctx.createGain();
      this.setAt(this.masterGain.gain, this.muted ? 0 : 1, ctx.currentTime || 0);
      this.masterGain.connect(ctx.destination);
    }
    if (!this.musicGain) {
      this.musicGain = ctx.createGain();
      this.setAt(this.musicGain.gain, 0.0001, ctx.currentTime || 0);
      this.musicGain.connect(this.masterGain);
    }
  }

  private setMaster(level: number): void {
    const param = this.masterGain?.gain;
    if (!param) return;
    const now = this.audioContext?.currentTime || 0;
    if (typeof param.cancelScheduledValues === 'function') param.cancelScheduledValues(now);
    this.setAt(param, level, now);
  }

  private setAt(param: AudioParam, value: number, time: number): void {
    if (typeof param.setValueAtTime === 'function') param.setValueAtTime(value, time);
    else param.value = value;
  }

  private fadeMusic(ctx: AudioContext, fromSilent: boolean): void {
    const param = this.musicGain?.gain;
    if (!param) return;
    const target = this.indoors ? INDOOR_MUSIC_GAIN : OUTDOOR_MUSIC_GAIN;
    const now = ctx.currentTime || 0;
    if (typeof param.cancelScheduledValues === 'function') param.cancelScheduledValues(now);
    const current = typeof param.value === 'number' && param.value > 0 ? param.value : target;
    const start = fromSilent ? 0.0001 : Math.max(0.0001, current);
    this.setAt(param, start, now);
    const end = now + MUSIC_FADE_SECONDS;
    if (typeof param.linearRampToValueAtTime === 'function') param.linearRampToValueAtTime(target, end);
    else param.value = target;
  }

  private makeBuffer(
    ctx: AudioContext,
    seconds: number,
    fill: (data: Float32Array, sampleRate: number) => void,
  ): AudioBuffer | null {
    const rate = ctx.sampleRate > 0 ? ctx.sampleRate : 44100;
    const length = Math.max(1, Math.floor(rate * seconds));
    let buffer: AudioBuffer;
    try {
      buffer = ctx.createBuffer(1, length, rate);
    } catch {
      return null;
    }
    const data = buffer.getChannelData(0);
    fill(data, rate);
    return buffer;
  }

  private startMusic(season: BgmSeason): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    this.ensureGraph(ctx);
    if (!this.musicGain) return;
    const buffer = this.makeBuffer(ctx, 2, (data, rate) => renderBgm(data, rate, season));
    if (!buffer) return;
    this.stopMusicSource();
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.connect(this.musicGain);
    try {
      source.start(ctx.currentTime || 0);
    } catch {
      try { source.disconnect(); } catch { /* already disconnected */ }
      return;
    }
    this.musicSource = source;
    this.fadeMusic(ctx, true);
  }

  private startRain(): void {
    if (this.rain) return;
    this.rain = this.startBed(1, 0.2, { type: 'lowpass', frequency: 900 }, (data) => {
      let low = 0;
      for (let i = 0; i < data.length; i++) {
        const white = Math.random() * 2 - 1;
        low += 0.05 * (white - low);
        data[i] = Math.max(-1, Math.min(1, low * 3.5));
      }
    });
  }

  private startWind(): void {
    if (this.wind) return;
    this.wind = this.startBed(2, 0.12, { type: 'lowpass', frequency: 420 }, (data) => {
      let low = 0;
      for (let i = 0; i < data.length; i++) {
        const white = Math.random() * 2 - 1;
        low += 0.03 * (white - low);
        const gust = 0.25 + 0.75 * (0.5 + 0.5 * Math.sin((2 * Math.PI * i) / data.length));
        data[i] = Math.max(-1, Math.min(1, low * 6 * gust));
      }
    });
  }

  private startCrickets(): void {
    if (this.crickets) return;
    this.crickets = this.startBed(1, 0.08, null, (data, sampleRate) => {
      const rate = sampleRate > 0 ? sampleRate : 44100;
      for (let i = 0; i < data.length; i++) {
        const t = i / rate;
        const gate = Math.sin(2 * Math.PI * 14 * t);
        const chirp = gate > 0.85 ? (gate - 0.85) / 0.15 : 0;
        data[i] = Math.sin(2 * Math.PI * 4700 * t) * chirp * 0.5;
      }
    });
  }

  private maybeThunder(force: boolean): void {
    if (!isRainyWeather(this.weather)) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime || 0;
    if (!force && now < this.nextThunderAt) return;
    this.stopThunder();
    this.thunder = this.startBed(0.7, 0.4, null, (data, sampleRate) => {
      const rate = sampleRate > 0 ? sampleRate : 44100;
      for (let i = 0; i < data.length; i++) {
        const t = i / rate;
        const env = Math.exp(-t * 4);
        const noise = (Math.random() * 2 - 1) * env;
        const boom = Math.sin(2 * Math.PI * 55 * t) * env;
        data[i] = Math.max(-1, Math.min(1, boom * 0.8 + noise * 0.5));
      }
    }, false);
    this.nextThunderAt = now + 7;
  }

  private startBed(
    seconds: number,
    gainValue: number,
    filterSpec: { type: BiquadFilterType; frequency: number } | null,
    fill: (data: Float32Array, sampleRate: number) => void,
    loop = true,
  ): PlayingNode | null {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return null;
    const buffer = this.makeBuffer(ctx, seconds, fill);
    if (!buffer) return null;
    const now = ctx.currentTime || 0;
    const gain = ctx.createGain();
    this.setAt(gain.gain, gainValue, now);
    gain.connect(this.masterGain);
    let filter: BiquadFilterNode | null = null;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = loop;
    if (filterSpec) {
      filter = ctx.createBiquadFilter();
      filter.type = filterSpec.type;
      this.setAt(filter.frequency, filterSpec.frequency, now);
      if (typeof filter.Q.setValueAtTime === 'function') filter.Q.setValueAtTime(0.7, now);
      source.connect(filter);
      filter.connect(gain);
    } else {
      source.connect(gain);
    }
    try {
      source.start(now);
    } catch {
      try { source.disconnect(); } catch { /* already disconnected */ }
      try { gain.disconnect(); } catch { /* already disconnected */ }
      if (filter) {
        try { filter.disconnect(); } catch { /* already disconnected */ }
      }
      return null;
    }
    return { source, gain, filter };
  }

  private stopMusicSource(): void {
    const source = this.musicSource;
    this.musicSource = null;
    if (!source) return;
    try { source.stop(); } catch { /* already stopped */ }
    try { source.disconnect(); } catch { /* already disconnected */ }
  }

  private stopRain(): void {
    this.halt(this.rain);
    this.rain = null;
  }

  private stopWind(): void {
    this.halt(this.wind);
    this.wind = null;
  }

  private stopCrickets(): void {
    this.halt(this.crickets);
    this.crickets = null;
  }

  private stopThunder(): void {
    this.halt(this.thunder);
    this.thunder = null;
  }

  private halt(playing: PlayingNode | null): void {
    if (!playing) return;
    try { playing.source.stop(); } catch { /* already stopped */ }
    try { playing.source.disconnect(); } catch { /* already disconnected */ }
    try { playing.gain.disconnect(); } catch { /* already disconnected */ }
    if (playing.filter) {
      try { playing.filter.disconnect(); } catch { /* already disconnected */ }
    }
  }

  /**
   * One mute control for hosts that do not render their own.
   * An existing `[data-cozy-audio-mute]` button is left in place.
   */
  private ensureMuteButton(): void {
    if (this.muteControlReady || this.ownedButton) return;
    try {
      if (typeof document === 'undefined' || !document.body || typeof document.createElement !== 'function') return;
      if (document.querySelector('[data-cozy-audio-mute]')) {
        this.muteControlReady = true;
        return;
      }
      const button = document.createElement('button');
      button.type = 'button';
      button.setAttribute('data-cozy-audio-mute', 'true');
      button.style.cssText = [
        'position:fixed',
        'top:12px',
        'left:12px',
        'z-index:10000',
        'padding:8px 12px',
        'border-radius:999px',
        'border:2px solid #5D4037',
        'background:#FDFBF7',
        'color:#5D4037',
        'font:600 14px sans-serif',
        'cursor:pointer',
      ].join(';');
      button.addEventListener('click', () => {
        if (this.muted) {
          this.unmute();
          AudioManager.getInstance().unmuteAll();
        } else {
          this.mute();
          AudioManager.getInstance().muteAll();
        }
      });
      document.body.appendChild(button);
      this.ownedButton = button;
      this.muteControlReady = true;
      this.syncOwnedButton();
    } catch {
      // No DOM on this host. The game screen still exposes mute.
    }
  }

  private syncOwnedButton(): void {
    const button = this.ownedButton;
    if (!button) return;
    const label = this.muted ? 'Unmute sound' : 'Mute sound';
    button.textContent = label;
    button.setAttribute('aria-label', label);
    button.setAttribute('aria-pressed', this.muted ? 'true' : 'false');
  }
}
