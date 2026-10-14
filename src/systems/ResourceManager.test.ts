import { describe, expect, it } from 'vitest';
import { ResourceManager } from './ResourceManager';
import { TimeSystem } from './TimeSystem';

describe('ResourceManager resource counts', () => {
  it('treats Wood and wood as the same resource', () => {
    const manager = new ResourceManager(new TimeSystem());

    expect(manager.getResource('Wood')).toBe(0);
    manager.addResource('Wood', 5);

    expect(manager.getResource('wood')).toBe(5);
    expect(manager.getResource('WOOD')).toBe(5);
    expect(manager.getResource('stone')).toBe(0);
  });

  it('treats iron and Iron as the same resource', () => {
    const manager = new ResourceManager(new TimeSystem());

    manager.addResource('iron', 3);

    expect(manager.getResource('Iron')).toBe(3);
    manager.addResource('IRON', 1);
    expect(manager.getResource('iron')).toBe(4);
    expect(manager.getResource('wood')).toBe(0);
  });
});
