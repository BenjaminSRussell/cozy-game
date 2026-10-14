import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AudioManager } from './AudioManager';

function resetAudioSingleton(): void {
  (AudioManager as unknown as { instance: AudioManager | null }).instance = null;
}

describe('AudioManager.getInstance', () => {
  beforeEach(() => {
    resetAudioSingleton();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    resetAudioSingleton();
  });

  it('returns one object and creates a single AudioContext', async () => {
    let contexts = 0;
    class FakeAudioContext {
      constructor() {
        contexts += 1;
      }
    }
    vi.stubGlobal('AudioContext', FakeAudioContext);

    const instances = Array.from({ length: 10 }, () => AudioManager.getInstance());
    for (const instance of instances) {
      expect(instance).toBe(instances[0]);
    }

    await instances[0].initializeAudioContext();
    await instances[0].initializeAudioContext();

    expect(contexts).toBe(1);
  });
});

type Scheduled = { kind: 'set' | 'exp'; value: number; time: number };

function scheduledParam() {
  const events: Scheduled[] = [];
  return {
    events,
    setValueAtTime(value: number, time: number) {
      events.push({ kind: 'set', value, time });
    },
    exponentialRampToValueAtTime(value: number, time: number) {
      events.push({ kind: 'exp', value, time });
    },
  };
}

class FakeNode {
  connections: unknown[] = [];
  onended: (() => void) | null = null;
  connect(node: unknown) {
    this.connections.push(node);
    return node;
  }
  disconnect() {}
}

class FakeOsc extends FakeNode {
  type = 'sine';
  frequency = scheduledParam();
  started: number | null = null;
  stopped: number | null = null;
  start(time: number) {
    this.started = time;
  }
  stop(time: number) {
    this.stopped = time;
  }
}

class FakeFilter extends FakeNode {
  type = 'lowpass';
  frequency = scheduledParam();
  Q = scheduledParam();
}

class FakeGain extends FakeNode {
  gain = scheduledParam();
}

class FakeSource extends FakeNode {
  buffer: { data: Float32Array; sampleRate: number; length: number } | null = null;
  started: number | null = null;
  stopped: number | null = null;
  start(time: number) {
    this.started = time;
  }
  stop(time: number) {
    this.stopped = time;
  }
}

class RichAudioContext {
  static created: RichAudioContext[] = [];
  state = 'running';
  currentTime = 3;
  sampleRate = 8000;
  destination = { name: 'destination' };
  resume = vi.fn(() => Promise.resolve());
  oscillators: FakeOsc[] = [];
  filters: FakeFilter[] = [];
  gains: FakeGain[] = [];
  sources: FakeSource[] = [];
  buffers: Array<{ data: Float32Array; sampleRate: number; length: number }> = [];

  constructor() {
    RichAudioContext.created.push(this);
  }

  createOscillator() {
    const node = new FakeOsc();
    this.oscillators.push(node);
    return node;
  }

  createBiquadFilter() {
    const node = new FakeFilter();
    this.filters.push(node);
    return node;
  }

  createGain() {
    const node = new FakeGain();
    this.gains.push(node);
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

describe('AudioManager synthesized tool SFX', () => {
  beforeEach(() => {
    resetAudioSingleton();
    RichAudioContext.created = [];
    vi.stubGlobal('AudioContext', RichAudioContext);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    resetAudioSingleton();
  });

  function manager(): { audio: AudioManager; ctx: RichAudioContext } {
    const audio = AudioManager.getInstance();
    const ctx = RichAudioContext.created[0];
    if (!ctx) throw new Error('expected one AudioContext');
    return { audio, ctx };
  }

  it('warms noise once and does not open a second context', () => {
    const { audio, ctx } = manager();
    expect(RichAudioContext.created).toHaveLength(1);
    expect(ctx.buffers.length).toBeGreaterThan(0);
    const warmed = ctx.buffers.length;
    audio.playTillSound();
    audio.playWaterSound();
    audio.playMineSound();
    expect(ctx.buffers.length).toBe(warmed);
    expect(AudioManager.getInstance()).toBe(audio);
    expect(RichAudioContext.created).toHaveLength(1);
  });

  it('plays a till crunch from a lowpass noise buffer at currentTime', () => {
    const { audio, ctx } = manager();
    expect(audio.playTillSound()).toBeUndefined();
    expect(ctx.sources).toHaveLength(1);
    expect(ctx.oscillators).toHaveLength(0);
    expect(ctx.sources[0]?.started).toBe(ctx.currentTime);
    expect(ctx.sources[0]?.connections[0]).toBe(ctx.filters[0]);
    expect(ctx.filters[0]?.type).toBe('lowpass');
    expect(ctx.filters[0]?.connections[0]).toBe(ctx.gains[0]);
    expect(ctx.gains[0]?.connections[0]).toBe(ctx.destination);
    const freq = ctx.filters[0]?.frequency.events ?? [];
    expect(freq[0]).toMatchObject({ kind: 'set', time: ctx.currentTime });
    expect(freq.at(-1)?.kind).toBe('exp');
    expect(freq.at(-1)?.value).toBeLessThan(freq[0]?.value ?? 0);
    const data = ctx.sources[0]?.buffer?.data ?? new Float32Array();
    expect(data.length).toBe(Math.floor(ctx.sampleRate * 0.16));
    expect(data.some((sample) => sample !== 0)).toBe(true);
    expect(data.every((sample) => sample >= -1 && sample <= 1)).toBe(true);
  });

  it('plays a watering spray as a bandpass noise sweep at currentTime', () => {
    const { audio, ctx } = manager();
    audio.playWaterSound();
    expect(ctx.sources).toHaveLength(1);
    expect(ctx.sources[0]?.started).toBe(ctx.currentTime);
    expect(ctx.filters[0]?.type).toBe('bandpass');
    const freq = ctx.filters[0]?.frequency.events ?? [];
    const ramps = freq.filter((event) => event.kind === 'exp');
    expect(ramps.length).toBeGreaterThanOrEqual(2);
    expect(ramps[0]?.value).toBeGreaterThan(freq[0]?.value ?? 0);
    expect(ramps[1]?.time).toBeGreaterThan(ramps[0]?.time ?? 0);
    expect(ctx.sources[0]?.buffer?.data.length).toBeGreaterThan(0);
  });

  it('plays a wood chop as a sine burst with falling pitch at currentTime', () => {
    const { audio, ctx } = manager();
    audio.playChopSound();
    expect(ctx.sources).toHaveLength(0);
    expect(ctx.oscillators).toHaveLength(1);
    const osc = ctx.oscillators[0];
    expect(osc?.type).toBe('sine');
    expect(osc?.started).toBe(ctx.currentTime);
    expect(osc?.frequency.events[0]).toMatchObject({ kind: 'set', value: 220, time: ctx.currentTime });
    const decay = osc?.frequency.events.find((event) => event.kind === 'exp');
    expect(decay?.value).toBeLessThan(220);
    expect(decay?.time).toBeGreaterThan(ctx.currentTime);
    expect(osc?.connections[0]).toBe(ctx.gains[0]);
    expect(ctx.gains[0]?.connections[0]).toBe(ctx.destination);
  });

  it('plays a rock break as a high triangle ping plus noise at currentTime', () => {
    const { audio, ctx } = manager();
    audio.playMineSound();
    const ping = ctx.oscillators[0];
    expect(ping?.type).toBe('triangle');
    expect(ping?.started).toBe(ctx.currentTime);
    expect(ping?.frequency.events[0]?.value).toBeGreaterThanOrEqual(1000);
    const drop = ping?.frequency.events.find((event) => event.kind === 'exp');
    expect(drop?.value).toBeLessThan(ping?.frequency.events[0]?.value ?? 0);
    expect(ctx.sources).toHaveLength(1);
    expect(ctx.sources[0]?.started).toBe(ctx.currentTime);
    expect(ctx.filters.some((filter) => filter.type === 'highpass')).toBe(true);
  });

  it('plays a coin chime as 987 Hz then 1318 Hz sine beeps', () => {
    const { audio, ctx } = manager();
    audio.playCoinSound();
    expect(ctx.oscillators).toHaveLength(2);
    expect(ctx.oscillators.map((osc) => osc.type)).toEqual(['sine', 'sine']);
    expect(ctx.oscillators.map((osc) => osc.frequency.events[0]?.value)).toEqual([987, 1318]);
    expect(ctx.oscillators[0]?.started).toBe(ctx.currentTime);
    expect(ctx.oscillators[1]?.started).toBeGreaterThan(ctx.oscillators[0]?.started ?? 0);
    expect(ctx.oscillators[0]?.frequency.events.some((event) => event.kind === 'exp')).toBe(false);
    expect(ctx.sources).toHaveLength(0);
  });

  it('schedules while suspended without waiting for resume', () => {
    const { audio, ctx } = manager();
    ctx.state = 'suspended';
    ctx.resume = vi.fn(() => new Promise(() => undefined));
    audio.playChopSound();
    expect(ctx.resume).toHaveBeenCalledTimes(1);
    expect(ctx.oscillators[0]?.started).toBe(ctx.currentTime);
  });

  it('stays silent when muted or when sfx volume is zero', () => {
    const { audio, ctx } = manager();
    audio.muteAll();
    audio.playTillSound();
    audio.playCoinSound();
    expect(ctx.sources).toHaveLength(0);
    expect(ctx.oscillators).toHaveLength(0);
    audio.unmuteAll();
    audio.updateVolume({ sfxVolume: 0 });
    audio.playWaterSound();
    audio.playMineSound();
    expect(ctx.sources).toHaveLength(0);
    expect(ctx.oscillators).toHaveLength(0);
  });

  it('no-ops when the host has no AudioContext', () => {
    vi.unstubAllGlobals();
    resetAudioSingleton();
    const audio = AudioManager.getInstance();
    expect(() => {
      audio.playTillSound();
      audio.playWaterSound();
      audio.playChopSound();
      audio.playMineSound();
      audio.playCoinSound();
    }).not.toThrow();
  });
});
