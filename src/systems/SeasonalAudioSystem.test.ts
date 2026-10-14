import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AudioManager } from './AudioManager';
import {
  canonicalSeason,
  INDOOR_MUSIC_GAIN,
  isCricketHour,
  isPlayerIndoors,
  isRainyWeather,
  MUSIC_FADE_SECONDS,
  OUTDOOR_MUSIC_GAIN,
  renderBgm,
  SeasonalAudioSystem,
  type BgmSeason,
} from './SeasonalAudioSystem';

type Scheduled = { kind: 'set' | 'linear' | 'cancel'; value?: number; time: number };

class Param {
  value = 1;
  events: Scheduled[] = [];
  setValueAtTime(value: number, time: number) {
    this.value = value;
    this.events.push({ kind: 'set', value, time });
  }
  linearRampToValueAtTime(value: number, time: number) {
    this.value = value;
    this.events.push({ kind: 'linear', value, time });
  }
  cancelScheduledValues(time: number) {
    this.events.push({ kind: 'cancel', time });
  }
}

class FakeNode {
  connections: unknown[] = [];
  connect(node: unknown) {
    this.connections.push(node);
    return node;
  }
  disconnect() {}
}

class FakeSource extends FakeNode {
  buffer: { data: Float32Array } | null = null;
  loop = false;
  startCount = 0;
  stopCount = 0;
  startedAt: number | null = null;
  onended: (() => void) | null = null;
  start(time?: number) {
    this.startCount += 1;
    this.startedAt = time ?? null;
  }
  stop() {
    this.stopCount += 1;
    if (this.stopCount > 1) throw new Error('Audio node stop() called twice');
  }
}

class FakeFilter extends FakeNode {
  type = 'lowpass';
  frequency = new Param();
  Q = new Param();
}

class FakeGain extends FakeNode {
  gain = new Param();
}

class FakeCtx {
  static created: FakeCtx[] = [];
  state = 'running';
  currentTime = 4;
  sampleRate = 800;
  destination = { name: 'destination' };
  resume = vi.fn(() => Promise.resolve());
  sources: FakeSource[] = [];
  filters: FakeFilter[] = [];
  gainNodes: FakeGain[] = [];
  buffers: Array<{ data: Float32Array; sampleRate: number; length: number }> = [];

  constructor() {
    FakeCtx.created.push(this);
  }

  createGain() {
    const node = new FakeGain();
    this.gainNodes.push(node);
    return node;
  }

  createBiquadFilter() {
    const node = new FakeFilter();
    this.filters.push(node);
    return node;
  }

  createBufferSource() {
    const node = new FakeSource();
    this.sources.push(node);
    return node;
  }

  createBuffer(_channels: number, length: number, sampleRate: number) {
    const data = new Float32Array(length);
    const buffer = { data, sampleRate, length, getChannelData: () => data };
    this.buffers.push(buffer);
    return buffer;
  }
}

function resetAudioSingleton(): void {
  (AudioManager as unknown as { instance: AudioManager | null }).instance = null;
}

describe('season helpers', () => {
  it('maps fall onto autumn and keeps the other three seasons', () => {
    expect(canonicalSeason('Fall')).toBe('autumn');
    expect(canonicalSeason(' autumn ')).toBe('autumn');
    expect(canonicalSeason('SUMMER')).toBe('summer');
    expect(canonicalSeason('winter')).toBe('winter');
    expect(canonicalSeason('spring')).toBe('spring');
    expect(canonicalSeason('')).toBe('spring');
  });

  it('chirps from 8 PM until 2 AM and not at 2:00', () => {
    expect(isCricketHour(20)).toBe(true);
    expect(isCricketHour(23.5)).toBe(true);
    expect(isCricketHour(0)).toBe(true);
    expect(isCricketHour(1.5)).toBe(true);
    expect(isCricketHour(24)).toBe(true);
    expect(isCricketHour(2)).toBe(false);
    expect(isCricketHour(19.99)).toBe(false);
    expect(isCricketHour(8)).toBe(false);
    expect(isCricketHour(Number.NaN)).toBe(false);
  });

  it('treats rain, storm, and flood as rainy days', () => {
    expect(isRainyWeather('rain')).toBe(true);
    expect(isRainyWeather('Rainy')).toBe(true);
    expect(isRainyWeather('storm')).toBe(true);
    expect(isRainyWeather('flood')).toBe(true);
    expect(isRainyWeather('drought')).toBe(false);
    expect(isRainyWeather('clear')).toBe(false);
  });

  it('detects a player standing inside a building footprint', () => {
    const house = [{ position: { x: 1, y: 1 }, dimensions: { x: 2, y: 1 } }];
    expect(isPlayerIndoors({ x: 1.2, y: 1.2 }, house)).toBe(true);
    expect(isPlayerIndoors({ x: 3, y: 1 }, house)).toBe(false);
    expect(isPlayerIndoors({ x: 0, y: 0 }, null)).toBe(false);
  });

  it('renders four different beds and treats fall as autumn', () => {
    const seasons: BgmSeason[] = ['spring', 'summer', 'autumn', 'winter'];
    const rendered = seasons.map((season) => {
      const data = new Float32Array(800);
      renderBgm(data, 400, season);
      return data;
    });
    for (let i = 0; i < rendered.length; i++) {
      for (let j = i + 1; j < rendered.length; j++) {
        const left = rendered[i];
        const right = rendered[j];
        expect(left && right && left.some((sample, index) => sample !== right[index])).toBe(true);
      }
    }
    const fall = new Float32Array(800);
    const autumn = rendered[2];
    renderBgm(fall, 400, 'autumn');
    expect(autumn && Array.from(fall)).toEqual(Array.from(autumn));
  });
});

describe('SeasonalAudioSystem', () => {
  beforeEach(() => {
    FakeCtx.created = [];
    resetAudioSingleton();
    vi.stubGlobal('AudioContext', FakeCtx);
    vi.stubGlobal('webkitAudioContext', undefined);
    vi.stubGlobal('matchMedia', () => {
      throw new Error('prefers-reduced-motion must not gate the loops');
    });
    vi.stubGlobal('fetch', () => {
      throw new Error('no audio files');
    });
    vi.stubGlobal('Audio', function Audio() {
      throw new Error('no audio files');
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    resetAudioSingleton();
  });

  function playing(): { system: SeasonalAudioSystem; ctx: FakeCtx } {
    const system = new SeasonalAudioSystem();
    const ctx = FakeCtx.created[0];
    if (!ctx) throw new Error('expected one AudioContext');
    return { system, ctx };
  }

  it('loops one spring bed and does not stack or fetch a file', () => {
    const system = new SeasonalAudioSystem();
    system.update({ season: 'spring', weather: 'normal', hour: 12, indoors: false });
    system.update({ season: 'spring', weather: 'normal', hour: 12, indoors: false });
    const { ctx } = playing();
    expect(FakeCtx.created).toHaveLength(1);
    expect(ctx.sources).toHaveLength(1);
    expect(ctx.sources[0]?.loop).toBe(true);
    expect(ctx.sources[0]?.stopCount).toBe(0);
    expect(ctx.filters).toHaveLength(0);
    const expected = new Float32Array(ctx.buffers[0]?.data.length ?? 0);
    renderBgm(expected, ctx.sampleRate, 'spring');
    expect(Array.from(ctx.buffers[0]?.data ?? [])).toEqual(Array.from(expected));
    expect(ctx.sources[0]?.connections[0]).toBe(ctx.gainNodes[1]);
    expect(ctx.gainNodes[1]?.connections[0]).toBe(ctx.gainNodes[0]);
    expect(ctx.gainNodes[0]?.connections[0]).toBe(ctx.destination);
    const linear = ctx.gainNodes[1]?.gain.events.filter((event) => event.kind === 'linear') ?? [];
    expect(linear[0]).toMatchObject({ value: OUTDOOR_MUSIC_GAIN, time: ctx.currentTime + MUSIC_FADE_SECONDS });
  });

  it('fades the bed down indoors and back up outside', () => {
    const system = new SeasonalAudioSystem();
    system.update({ season: 'summer', weather: 'clear', hour: 12, indoors: false });
    const ctx = FakeCtx.created[0];
    if (!ctx) throw new Error('expected one AudioContext');
    const music = ctx.gainNodes[1]?.gain;
    const before = music?.events.filter((event) => event.kind === 'linear').length ?? 0;
    system.setIndoors(true);
    system.setIndoors(true);
    const indoor = music?.events.filter((event) => event.kind === 'linear') ?? [];
    expect(indoor.length).toBe(before + 1);
    expect(indoor.at(-1)).toMatchObject({
      value: INDOOR_MUSIC_GAIN,
      time: ctx.currentTime + MUSIC_FADE_SECONDS,
    });
    system.update({ season: 'summer', weather: 'clear', hour: 12, indoors: false });
    const outdoor = music?.events.filter((event) => event.kind === 'linear') ?? [];
    expect(outdoor.at(-1)?.value).toBe(OUTDOOR_MUSIC_GAIN);
    expect(ctx.sources).toHaveLength(1);
  });

  it('crossfades to a different winter bed and adds wind only in autumn and winter', () => {
    const system = new SeasonalAudioSystem();
    system.update({ season: 'spring', weather: 'normal', hour: 12, indoors: false });
    const ctx = FakeCtx.created[0];
    if (!ctx) throw new Error('expected one AudioContext');
    expect(ctx.sources).toHaveLength(1);
    system.update({ season: 'winter', weather: 'normal', hour: 12, indoors: false });
    expect(ctx.sources[0]?.stopCount).toBe(1);
    const running = ctx.sources.filter((source) => source.stopCount === 0);
    expect(running).toHaveLength(2);
    expect(running.every((source) => source.loop)).toBe(true);
    expect(ctx.filters[0]?.type).toBe('lowpass');
    expect(ctx.filters[0]?.frequency.events[0]?.value).toBe(420);
    const winter = ctx.buffers.at(-2)?.data ?? new Float32Array();
    const expected = new Float32Array(winter.length);
    renderBgm(expected, ctx.sampleRate, 'winter');
    expect(Array.from(winter)).toEqual(Array.from(expected));
  });

  it('plays the autumn bed for fall', () => {
    const system = new SeasonalAudioSystem();
    system.update({ season: 'fall', weather: 'normal', hour: 10, indoors: false });
    const ctx = FakeCtx.created[0];
    if (!ctx) throw new Error('expected one AudioContext');
    const music = ctx.buffers[0]?.data ?? new Float32Array();
    const expected = new Float32Array(music.length);
    renderBgm(expected, ctx.sampleRate, 'autumn');
    expect(Array.from(music)).toEqual(Array.from(expected));
    expect(ctx.sources.filter((source) => source.stopCount === 0)).toHaveLength(2);
  });

  it('loops rain and a one-shot thunder on rainy days, then stops both', () => {
    const system = new SeasonalAudioSystem();
    system.update({ season: 'spring', weather: 'rain', hour: 12, indoors: false });
    const ctx = FakeCtx.created[0];
    if (!ctx) throw new Error('expected one AudioContext');
    const live = () => ctx.sources.filter((source) => source.stopCount === 0);
    expect(live().filter((source) => source.loop)).toHaveLength(2);
    expect(live().filter((source) => !source.loop)).toHaveLength(1);
    expect(ctx.filters.some((filter) => filter.frequency.events[0]?.value === 900)).toBe(true);
    const before = ctx.sources.length;
    system.update({ season: 'spring', weather: 'rain', hour: 12, indoors: false });
    expect(ctx.sources.length).toBe(before);
    ctx.currentTime += 7;
    system.update({ season: 'spring', weather: 'storm', hour: 12, indoors: false });
    expect(ctx.sources.filter((source) => !source.loop).length).toBeGreaterThan(1);
    system.update({ season: 'spring', weather: 'clear', hour: 12, indoors: false });
    expect(live().every((source) => source.loop)).toBe(true);
    expect(live()).toHaveLength(1);
  });

  it('chirps at night and stops at 2 AM', () => {
    const system = new SeasonalAudioSystem();
    system.update({ season: 'summer', weather: 'clear', hour: 20, indoors: false });
    const ctx = FakeCtx.created[0];
    if (!ctx) throw new Error('expected one AudioContext');
    expect(ctx.sources.filter((source) => source.loop && source.stopCount === 0)).toHaveLength(2);
    system.update({ season: 'summer', weather: 'clear', hour: 2, indoors: false });
    expect(ctx.sources.filter((source) => source.loop && source.stopCount === 0)).toHaveLength(1);
    system.update({ season: 'summer', weather: 'clear', hour: 1, indoors: false });
    expect(ctx.sources.filter((source) => source.loop && source.stopCount === 0)).toHaveLength(2);
    system.update({ season: 'summer', weather: 'clear', hour: 19.99, indoors: false });
    expect(ctx.sources.filter((source) => source.loop && source.stopCount === 0)).toHaveLength(1);
  });

  it('stays silent while muted and can be unmuted without reduced motion', () => {
    const system = new SeasonalAudioSystem();
    system.mute();
    system.update({ season: 'spring', weather: 'normal', hour: 12, indoors: false });
    const ctx = FakeCtx.created[0];
    if (!ctx) throw new Error('expected one AudioContext');
    expect(system.isMuted()).toBe(true);
    expect(ctx.sources[0]?.loop).toBe(true);
    expect(ctx.sources[0]?.stopCount).toBe(0);
    expect(ctx.gainNodes[0]?.gain.events.some((event) => event.kind === 'set' && event.value === 0)).toBe(true);
    system.unmute();
    expect(system.isMuted()).toBe(false);
    const last = ctx.gainNodes[0]?.gain.events.at(-1);
    expect(last).toMatchObject({ kind: 'set', value: 1 });
  });

  it('does nothing when the host has no AudioContext', () => {
    vi.stubGlobal('AudioContext', undefined);
    vi.stubGlobal('webkitAudioContext', undefined);
    const system = new SeasonalAudioSystem();
    expect(() => {
      system.update({ season: 'winter', weather: 'storm', hour: 21, indoors: true });
      system.mute();
      system.unmute();
      system.stop();
      system.resume();
    }).not.toThrow();
    expect(FakeCtx.created).toHaveLength(0);
  });

  it('adds one mute button that silences and restores the bed', () => {
    const buttons: Array<{
      type: string;
      textContent: string | null;
      attrs: Record<string, string>;
      style: { cssText?: string };
      listeners: Record<string, () => void>;
      setAttribute(name: string, value: string): void;
      addEventListener(type: string, listener: () => void): void;
    }> = [];
    vi.stubGlobal('document', {
      body: {
        appendChild(node: (typeof buttons)[number]) {
          buttons.push(node);
        },
      },
      createElement() {
        const button = {
          type: '',
          textContent: null as string | null,
          attrs: {} as Record<string, string>,
          style: {} as { cssText?: string },
          listeners: {} as Record<string, () => void>,
          setAttribute(name: string, value: string) {
            this.attrs[name] = value;
          },
          addEventListener(type: string, listener: () => void) {
            this.listeners[type] = listener;
          },
        };
        return button;
      },
      querySelector(selector: string) {
        if (selector !== '[data-cozy-audio-mute]') return null;
        return buttons.find((button) => button.attrs['data-cozy-audio-mute'] === 'true') ?? null;
      },
    });

    const system = new SeasonalAudioSystem();
    system.update({ season: 'spring', weather: 'normal', hour: 12, indoors: false });
    system.update({ season: 'spring', weather: 'normal', hour: 12, indoors: false });
    expect(buttons).toHaveLength(1);
    expect(buttons[0]?.textContent).toBe('Mute sound');
    expect(buttons[0]?.attrs['aria-pressed']).toBe('false');
    buttons[0]?.listeners.click?.();
    expect(system.isMuted()).toBe(true);
    expect(buttons[0]?.textContent).toBe('Unmute sound');
    expect(buttons[0]?.attrs['aria-pressed']).toBe('true');
    const ctx = FakeCtx.created[0];
    expect(ctx?.gainNodes[0]?.gain.value).toBe(0);
    expect(ctx?.sources[0]?.stopCount).toBe(0);
    buttons[0]?.listeners.click?.();
    expect(system.isMuted()).toBe(false);
    expect(ctx?.gainNodes[0]?.gain.value).toBe(1);
  });

  it('leaves an existing mute button alone', () => {
    let appended = 0;
    vi.stubGlobal('document', {
      body: { appendChild() { appended += 1; } },
      createElement() { return {}; },
      querySelector(selector: string) {
        return selector === '[data-cozy-audio-mute]' ? { existing: true } : null;
      },
    });
    const system = new SeasonalAudioSystem();
    system.update({ season: 'spring', weather: 'normal', hour: 12, indoors: false });
    system.update({ season: 'summer', weather: 'normal', hour: 12, indoors: false });
    expect(appended).toBe(0);
  });
});
