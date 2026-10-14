import { afterEach, describe, expect, it, vi } from 'vitest';
import { AudioManager } from './AudioManager';

describe('AudioManager.getInstance', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
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
