import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { WindSystem } from './WindSystem';

type FakeSource = {
    buffer: unknown;
    loop: boolean;
    started: number;
    stopped: number;
    connect: () => void;
    disconnect: () => void;
    start: () => void;
    stop: () => void;
};

const sources: FakeSource[] = [];
const gains: { value: number }[] = [];

class FakeAudioContext {
    sampleRate = 800;
    destination = {};

    createBuffer(_channels: number, length: number, _rate: number) {
        return {
            getChannelData: () => new Float32Array(length),
        };
    }

    createGain() {
        const gain = { value: 1 };
        gains.push(gain);
        return {
            gain,
            connect() {},
            disconnect() {},
        };
    }

    createBufferSource(): FakeSource {
        const node: FakeSource = {
            buffer: null,
            loop: false,
            started: 0,
            stopped: 0,
            connect() {},
            disconnect() {},
            start() {
                node.started += 1;
            },
            stop() {
                if (node.stopped > 0) {
                    throw new Error('Audio node stop() called twice');
                }
                node.stopped += 1;
            },
        };
        sources.push(node);
        return node;
    }
}

describe('WindSystem without an AudioContext', () => {
    afterEach(() => {
        WindSystem.getInstance().disable();
        vi.unstubAllGlobals();
    });

    it('enable, disable, and stop do not throw', () => {
        vi.stubGlobal('AudioContext', undefined);
        vi.stubGlobal('webkitAudioContext', undefined);

        const wind = WindSystem.getInstance();
        expect(() => {
            wind.enable();
            wind.disable();
            wind.stop();
        }).not.toThrow();
        expect(sources).toHaveLength(0);
    });
});

describe('WindSystem wind audio', () => {
    beforeAll(() => {
        vi.stubGlobal('AudioContext', FakeAudioContext);
    });

    afterEach(() => {
        WindSystem.getInstance().disable();
        sources.length = 0;
        gains.length = 0;
    });

    afterAll(() => {
        vi.unstubAllGlobals();
    });

    it('enable() starts one looping node and a second call does not stack', () => {
        const wind = WindSystem.getInstance();
        wind.enable();
        wind.enable();

        expect(sources).toHaveLength(1);
        expect(sources[0].started).toBe(1);
        expect(sources[0].loop).toBe(true);
        expect(sources[0].stopped).toBe(0);
        expect(gains[0].value).toBe(0.3);
    });

    it('disable() stops the wind Audio node and enable() restarts a single loop', () => {
        const wind = WindSystem.getInstance();
        wind.enable();
        wind.disable();

        expect(sources[0].stopped).toBe(1);

        wind.enable();
        expect(sources).toHaveLength(2);
        expect(sources[1].started).toBe(1);
        expect(sources[1].stopped).toBe(0);
        expect(gains).toHaveLength(2);
    });

    it('stop() stops the wind Audio node once', () => {
        const wind = WindSystem.getInstance();
        wind.enable();

        expect(() => {
            wind.stop();
            wind.stop();
            wind.disable();
        }).not.toThrow();

        expect(sources).toHaveLength(1);
        expect(sources[0].stopped).toBe(1);
    });

    it('disable() freezes sway until enable()', () => {
        const wind = WindSystem.getInstance();
        wind.enable();
        wind.update(2);
        const moving = wind.getWindAt(1, 2);
        const count = wind.getParticles().length;

        wind.disable();
        wind.update(10);

        expect(wind.getWindAt(1, 2)).toEqual(moving);
        expect(wind.getParticles().length).toBe(count);
        expect(sources[0].stopped).toBe(1);

        wind.enable();
        wind.update(2);
        expect(wind.getWindAt(1, 2)).not.toEqual(moving);
    });
});
