import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AudioManager, footstepSurfaceAt } from './AudioManager';

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
  loop = false;
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
    audio.playScytheSound();
    audio.playFootstep('stone_path');
    audio.startWaterLoop();
    expect(ctx.sources).toHaveLength(0);
    expect(ctx.oscillators).toHaveLength(0);
    audio.unmuteAll();
    audio.updateVolume({ sfxVolume: 0 });
    audio.playWaterSound();
    audio.playMineSound();
    audio.playMenuClick();
    audio.playRegisterRattle();
    audio.playFootstep('grass');
    audio.startWaterLoop();
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
      audio.playScytheSound();
      audio.playHarvestPop();
      audio.playPickupChime();
      audio.playMenuClick();
      audio.playRegisterRattle();
      audio.playFootstep('grass');
      audio.startWaterLoop();
      audio.stopWaterLoop();
    }).not.toThrow();
  });

  it('plays a scythe swish as highpassed noise falling in pitch', () => {
    const { audio, ctx } = manager();
    audio.playScytheSound();
    expect(ctx.sources).toHaveLength(1);
    expect(ctx.oscillators).toHaveLength(0);
    expect(ctx.sources[0]?.started).toBe(ctx.currentTime);
    expect(ctx.filters[0]?.type).toBe('highpass');
    const freq = ctx.filters[0]?.frequency.events ?? [];
    expect(freq[0]?.value).toBe(3200);
    expect(freq.at(-1)?.value).toBe(900);
  });

  it('plays a harvest pop and a pickup chime distinct from the coin', () => {
    const { audio, ctx } = manager();
    audio.playHarvestPop();
    expect(ctx.oscillators[0]?.type).toBe('sine');
    expect(ctx.oscillators[0]?.frequency.events[0]?.value).toBe(680);
    const drop = ctx.oscillators[0]?.frequency.events.find((event) => event.kind === 'exp');
    expect(drop?.value).toBe(140);
    audio.playPickupChime();
    expect(ctx.oscillators[1]?.frequency.events[0]?.value).toBe(1568);
    expect(ctx.oscillators[1]?.frequency.events.some((event) => event.kind === 'exp')).toBe(false);
    expect(ctx.sources).toHaveLength(0);
  });

  it('plays a menu click as a short square tick', () => {
    const { audio, ctx } = manager();
    audio.playMenuClick();
    expect(ctx.oscillators).toHaveLength(1);
    expect(ctx.oscillators[0]?.type).toBe('square');
    expect(ctx.oscillators[0]?.frequency.events[0]?.value).toBe(2000);
    expect(ctx.oscillators[0]?.stopped).toBeCloseTo((ctx.currentTime) + 0.03);
    expect(ctx.sources).toHaveLength(0);
  });

  it('plays a register rattle as four noise ticks', () => {
    const { audio, ctx } = manager();
    audio.playRegisterRattle();
    expect(ctx.sources).toHaveLength(4);
    expect(ctx.oscillators).toHaveLength(0);
    const starts = ctx.sources.map((source) => source.started ?? 0);
    expect(starts[0]).toBe(ctx.currentTime);
    expect(starts[1]).toBeGreaterThan(starts[0] ?? 0);
    expect(starts[2]).toBeGreaterThan(starts[1] ?? 0);
    expect(starts[3]).toBeGreaterThan(starts[2] ?? 0);
  });

  it('plays a different footstep for each surface and ignores unknown ground', () => {
    const { audio, ctx } = manager();
    audio.playFootstep('grass');
    expect(ctx.oscillators).toHaveLength(0);
    expect(ctx.filters[0]?.type).toBe('lowpass');
    expect(ctx.filters[0]?.frequency.events[0]?.value).toBe(900);

    audio.playFootstep('dirt');
    expect(ctx.filters[1]?.frequency.events[0]?.value).toBe(500);

    audio.playFootstep('stone_path');
    expect(ctx.oscillators[0]?.type).toBe('triangle');
    expect(ctx.oscillators[0]?.frequency.events[0]?.value).toBe(1400);
    expect(ctx.filters.some((filter) => filter.type === 'highpass')).toBe(true);

    audio.playFootstep('wood_floor');
    expect(ctx.oscillators[1]?.type).toBe('sine');
    expect(ctx.oscillators[1]?.frequency.events[0]?.value).toBe(180);

    audio.playFootstep('water_puddle');
    expect(ctx.filters.some((filter) => filter.type === 'bandpass')).toBe(true);

    const nodes = ctx.sources.length + ctx.oscillators.length;
    audio.playFootstep('lava');
    expect(ctx.sources.length + ctx.oscillators.length).toBe(nodes);
  });

  it('loops the watering spray once until stop, and mute blocks a restart', () => {
    const { audio, ctx } = manager();
    const warmed = ctx.buffers.length;
    audio.startWaterLoop();
    audio.startWaterLoop();
    expect(ctx.buffers.length).toBe(warmed);
    expect(ctx.sources).toHaveLength(1);
    expect(ctx.sources[0]?.loop).toBe(true);
    expect(ctx.sources[0]?.started).toBe(ctx.currentTime);
    expect(ctx.filters[0]?.type).toBe('bandpass');
    expect(ctx.gains.at(-1)?.connections[0]).toBe(ctx.destination);
    audio.stopWaterLoop();
    audio.stopWaterLoop();
    expect(ctx.sources[0]?.stopped).toBe(ctx.currentTime);
    audio.muteAll();
    audio.startWaterLoop();
    expect(ctx.sources).toHaveLength(1);
  });
});

describe('footstepSurfaceAt', () => {
  it('picks wood, stone, dirt, puddle, or grass from the tile underfoot', () => {
    expect(footstepSurfaceAt({ x: 1.2, y: 3.8 })).toBe('grass');
    expect(footstepSurfaceAt({ x: 1, y: 1, weather: 'rain' })).toBe('water_puddle');
    expect(footstepSurfaceAt({
      x: 2,
      y: 2,
      weather: 'storm',
      roads: [{ position: { x: 2, y: 2 }, grade: 'paved' }],
    })).toBe('stone_path');
    expect(footstepSurfaceAt({
      x: 2.2,
      y: 2.4,
      roads: [{ position: { x: 2, y: 2 }, grade: 'gravel' }],
    })).toBe('dirt');
    expect(footstepSurfaceAt({
      x: 4,
      y: 4,
      plots: [{ position: { x: 4, y: 4 }, tilled: true }],
    })).toBe('dirt');
    expect(footstepSurfaceAt({
      x: 5,
      y: 5,
      plots: [{ position: { x: 5, y: 5 }, tilled: false }],
    })).toBe('grass');
    expect(footstepSurfaceAt({
      x: 0.2,
      y: 0.2,
      weather: 'flood',
      buildings: [{ position: { x: 0, y: 0 }, dimensions: { x: 2, y: 2 } }],
    })).toBe('wood_floor');
    expect(footstepSurfaceAt({
      x: 3.9,
      y: 3.1,
      buildings: [{ position: { x: 3, y: 3 }, size: { x: 1, y: 1 } }],
    })).toBe('wood_floor');
    expect(footstepSurfaceAt({
      x: 4.1,
      y: 3.1,
      buildings: [{ position: { x: 3, y: 3 }, size: { x: 1, y: 1 } }],
    })).toBe('grass');
  });
});
