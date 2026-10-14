import { describe, expect, it } from 'vitest';
import { insertionSortByScreenY, Renderer2D5, type RenderObject } from './Renderer2D5';

function sprite(id: string, x: number, y: number, z = 0): RenderObject {
  return {
    id,
    spriteId: 'crop',
    position: { x, y, z },
    scale: 1,
    rotation: 0,
    opacity: 1,
  };
}

function makeRenderer(): Renderer2D5 {
  return new Renderer2D5({
    context: {} as CanvasRenderingContext2D,
    width: 800,
    height: 600,
  });
}

function screenY(renderer: Renderer2D5, item: RenderObject): number {
  return renderer.worldToScreen(item.position).y;
}

function expectSameScreenOrder(renderer: Renderer2D5, source: RenderObject[]): void {
  const expected = [...source].sort((a, b) => screenY(renderer, a) - screenY(renderer, b));
  const actual = [...source];
  let projections = 0;
  insertionSortByScreenY(actual, (item) => {
    projections += 1;
    return screenY(renderer, item);
  });
  expect(actual.map((item) => item.id)).toEqual(expected.map((item) => item.id));
  expect(projections).toBe(source.length);
}

describe('Renderer2D5 sortRenderQueue', () => {
  const unsorted = [
    sprite('back', 4, 1, 0),
    sprite('front', 0, 0, 0),
    sprite('tie-a', 2, 2, 0),
    sprite('raised', 0, 8, 10),
    sprite('tie-b', 3, 1, 0),
    sprite('sunk', 0, 0, -4),
    sprite('mid', 2, 0, 1),
  ];

  it('matches Array.prototype.sort by ascending screen Y', () => {
    const renderer = makeRenderer();
    expectSameScreenOrder(renderer, unsorted);
    expectSameScreenOrder(renderer, [...unsorted].reverse());
    expectSameScreenOrder(renderer, []);
    expectSameScreenOrder(renderer, [sprite('only', 1, 2, 3)]);

    const tied = [sprite('first', 0, 2, 0), sprite('second', 2, 0, 0), sprite('third', 1, 1, 0)];
    expectSameScreenOrder(renderer, tied);

    const shifted = makeRenderer();
    (shifted as unknown as { camera: { y: number; scale: number } }).camera.y = -4;
    (shifted as unknown as { camera: { scale: number } }).camera.scale = 2;
    expectSameScreenOrder(shifted, unsorted);
  });

  it('uses a linear number of comparisons when the queue is already ordered', () => {
    const renderer = makeRenderer();
    const ordered = Array.from({ length: 500 }, (_, index) => sprite(`obj-${index}`, index, 0, 0));
    const screen = ordered.map((item) => screenY(renderer, item));
    for (let index = 1; index < screen.length; index++) {
      expect(screen[index]).toBeGreaterThan(screen[index - 1]);
    }

    const comparisons = insertionSortByScreenY([...ordered], (item) => screenY(renderer, item));
    expect(comparisons).toBe(ordered.length - 1);

    const equalScreenY = [
      sprite('a', 0, 2, 0),
      sprite('b', 2, 0, 0),
      sprite('c', 1, 1, 0),
    ];
    expect(insertionSortByScreenY([...equalScreenY], (item) => screenY(renderer, item))).toBe(
      equalScreenY.length - 1,
    );

    const reversed = [...ordered].reverse();
    const reverseComparisons = insertionSortByScreenY(reversed, (item) => screenY(renderer, item));
    expect(reverseComparisons).toBe((ordered.length * (ordered.length - 1)) / 2);
    expect(reversed.map((item) => item.id)).toEqual(ordered.map((item) => item.id));
  });

  it('sorts the public queue with one screen-Y projection per object', () => {
    const renderer = makeRenderer();
    for (const item of unsorted) {
      renderer.queueRender(item);
    }

    const view = renderer as unknown as {
      sortRenderQueue: () => void;
      renderQueue: RenderObject[];
    };
    const project = renderer.worldToScreen.bind(renderer);
    let projections = 0;
    renderer.worldToScreen = (position) => {
      projections += 1;
      return project(position);
    };

    view.sortRenderQueue();

    const expected = [...unsorted].sort((a, b) => project(a.position).y - project(b.position).y);
    expect(view.renderQueue.map((item) => item.id)).toEqual(expected.map((item) => item.id));
    expect(projections).toBe(unsorted.length);
  });
});
