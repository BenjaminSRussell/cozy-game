import React, { act, type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const ui = vi.hoisted(() => ({
  texts: [] as string[],
  images: [] as string[],
  presses: {} as Record<string, (() => void) | undefined>,
}));

vi.mock('react-native', () => {
  const ReactActual = require('react') as typeof import('react');

  function textOf(children: unknown): string {
    if (typeof children === 'string' || typeof children === 'number') return String(children);
    if (Array.isArray(children)) return children.map((child) => textOf(child)).join('');
    return '';
  }

  const host = (tag: string) =>
    function Host(props: {
      children?: React.ReactNode;
      accessibilityLabel?: string;
      onPress?: () => void;
      source?: { uri?: string };
    }) {
      const text = textOf(props.children);
      // SaveSlotScreen renders this title once per pass, before cards and the modal.
      if (text === 'Load Game') {
        ui.texts.splice(0, ui.texts.length);
        ui.images.splice(0, ui.images.length);
        for (const key of Object.keys(ui.presses)) delete ui.presses[key];
      }
      if (text) ui.texts.push(text);
      if (tag === 'img') ui.images.push(props.source?.uri ?? '');
      if (typeof props.accessibilityLabel === 'string' && props.onPress) {
        ui.presses[props.accessibilityLabel] = props.onPress;
      }
      return ReactActual.createElement(ReactActual.Fragment, null, props.children);
    };

  return {
    View: host('div'),
    Text: host('span'),
    TouchableOpacity: host('button'),
    Image: host('img'),
    ActivityIndicator: host('div'),
    StyleSheet: {
      create<T>(styles: T): T {
        return styles;
      },
    },
  };
});

vi.mock('../store/gameStore', () => ({
  useGameStore: () => ({}),
}));

vi.mock('../engine/GameEngine', () => ({
  GameEngine: class GameEngine {
    start() {}
    stop() {}
  },
}));

vi.mock('../components/IsometricGameScreen', () => ({
  IsometricGameScreen: () => null,
}));

vi.mock('../components/LoadingScreen', () => ({
  LoadingScreen: () => null,
}));

import { SaveSlotScreen } from '../../App';
import type { LocalSaveSlot } from './PersistenceManager';

type Root = {
  render(children: ReactNode): void;
  unmount(): void;
};

const { createRoot } = require('react-dom/client') as {
  createRoot: (container: unknown) => Root;
};

type DomNode = {
  nodeType: number;
  nodeName: string;
  tagName?: string;
  textContent: string;
  parentNode: DomNode | null;
  ownerDocument: unknown;
  childNodes: DomNode[];
  children: DomNode[];
  appendChild: (child: DomNode) => DomNode;
  removeChild: (child: DomNode) => DomNode;
  insertBefore: (child: DomNode, ref: DomNode | null) => DomNode;
  addEventListener: () => void;
  removeEventListener: () => void;
};

function installDom(): DomNode {
  const document: {
    nodeType: number;
    nodeName: string;
    childNodes: DomNode[];
    activeElement: null;
    defaultView: unknown;
    body: DomNode;
    documentElement: DomNode;
    createElement: (tag: string) => DomNode;
    createElementNS: (_ns: string, tag: string) => DomNode;
    createTextNode: (text: string) => DomNode;
    createComment: (text: string) => DomNode;
    addEventListener: () => void;
    removeEventListener: () => void;
    contains: () => boolean;
  } = {
    nodeType: 9,
    nodeName: '#document',
    childNodes: [],
    activeElement: null,
    defaultView: null,
    body: undefined as unknown as DomNode,
    documentElement: undefined as unknown as DomNode,
    createElement: (tag) => el(tag),
    createElementNS: (_ns, tag) => el(tag),
    createTextNode: (text) => textNode(text),
    createComment: (text) => textNode(text),
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    contains: () => false,
  };

  function textNode(text: string): DomNode {
    return {
      nodeType: 3,
      nodeName: '#text',
      textContent: String(text),
      parentNode: null,
      ownerDocument: document,
      childNodes: [],
      children: [],
      appendChild: (child) => child,
      removeChild: (child) => child,
      insertBefore: (child) => child,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    };
  }

  function el(tag: string): DomNode {
    const node: DomNode = {
      nodeType: 1,
      nodeName: String(tag).toUpperCase(),
      tagName: String(tag).toUpperCase(),
      textContent: '',
      parentNode: null,
      ownerDocument: document,
      childNodes: [],
      children: [],
      appendChild: (child) => {
        if (child.parentNode) child.parentNode.removeChild(child);
        child.parentNode = node;
        node.childNodes.push(child);
        if (child.nodeType === 1) node.children.push(child);
        return child;
      },
      removeChild: (child) => {
        node.childNodes = node.childNodes.filter((item) => item !== child);
        node.children = node.children.filter((item) => item !== child);
        child.parentNode = null;
        return child;
      },
      insertBefore: (child, ref) => {
        if (child.parentNode) child.parentNode.removeChild(child);
        child.parentNode = node;
        const index = ref ? node.childNodes.indexOf(ref) : -1;
        if (index < 0) node.childNodes.push(child);
        else node.childNodes.splice(index, 0, child);
        if (child.nodeType === 1) node.children.push(child);
        return child;
      },
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    };
    return node;
  }

  document.body = el('body');
  document.documentElement = el('html');

  function HTMLIFrameElement() {}
  const window = {
    document,
    HTMLElement: function HTMLElement() {},
    Element: function Element() {},
    Node: function Node() {},
    HTMLIFrameElement,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    getSelection: () => null,
    getComputedStyle: () => ({ getPropertyValue: () => '' }),
    requestAnimationFrame: () => 0,
    cancelAnimationFrame: () => undefined,
  };
  document.defaultView = window;

  const globals = globalThis as unknown as Record<string, unknown>;
  globals.document = document;
  globals.window = window;
  globals.HTMLElement = window.HTMLElement;
  globals.Element = window.Element;
  globals.Node = window.Node;
  globals.HTMLIFrameElement = HTMLIFrameElement;
  globals.IS_REACT_ACT_ENVIRONMENT = true;
  return document.body;
}

function Record({ children }: { children: React.ReactNode }) {
  ui.texts.splice(0, ui.texts.length);
  ui.images.splice(0, ui.images.length);
  for (const key of Object.keys(ui.presses)) delete ui.presses[key];
  return children;
}

const slots: Array<LocalSaveSlot | null> = [
  {
    slotId: 1,
    worldId: 'world-summer',
    farmName: 'River Bend',
    playerName: 'Ren',
    date: 'Year 1, Summer 3',
    gold: 80,
    playTimeMinutes: 3,
    thumbnailDataUrl: 'memory://slot-thumb',
  },
  null,
  {
    slotId: 3,
    playerName: 'Quinn',
  },
];

describe('SaveSlotScreen', () => {
  let root: Root;

  beforeEach(() => {
    ui.texts.splice(0, ui.texts.length);
    ui.images.splice(0, ui.images.length);
    for (const key of Object.keys(ui.presses)) delete ui.presses[key];
    const body = installDom();
    const container = (
      globalThis as { document: { createElement: (tag: string) => DomNode } }
    ).document.createElement('div');
    body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
  });

  async function renderScreen(handlers: {
    onNewGame: (slotId: number) => void;
    onLoad: (slotId: number) => void;
    onDelete: (slotId: number) => void;
  }) {
    await act(async () => {
      root.render(
        <Record>
          <SaveSlotScreen
            slots={slots}
            onNewGame={handlers.onNewGame}
            onLoad={handlers.onLoad}
            onDelete={handlers.onDelete}
            onBack={() => undefined}
          />
        </Record>,
      );
    });
  }

  it('shows three cards with the metadata on hand and a blank thumbnail when none is stored', async () => {
    await renderScreen({
      onNewGame: () => undefined,
      onLoad: () => undefined,
      onDelete: () => undefined,
    });

    expect(ui.texts).toEqual(expect.arrayContaining(['Slot 1', 'Slot 2', 'Slot 3', 'Load Game']));
    expect(ui.texts).toContain('River Bend');
    expect(ui.texts).toContain('Ren');
    expect(ui.texts).toContain('Date: Year 1, Summer 3');
    expect(ui.texts).toContain('Gold: 80');
    expect(ui.texts).toContain('Play time: 3 min');
    expect(ui.texts).toContain('Empty Slot');
    expect(ui.texts).toContain('Quinn');
    expect(ui.texts.filter((text) => text.startsWith('Gold:'))).toEqual(['Gold: 80']);
    expect(ui.texts.filter((text) => text.startsWith('Play time:'))).toEqual(['Play time: 3 min']);
    expect(ui.texts).not.toContain('Delete Save');
    expect(ui.images).toEqual(['memory://slot-thumb']);
  });

  it('asks before deleting a slot and does not delete on cancel', async () => {
    const onDelete = vi.fn();
    const onNewGame = vi.fn();
    const onLoad = vi.fn();
    await renderScreen({ onNewGame, onLoad, onDelete });

    await act(async () => {
      ui.presses['Delete slot 1']?.();
    });
    expect(onDelete).not.toHaveBeenCalled();
    expect(ui.texts).toContain('Delete Save');
    expect(ui.texts).toContain('Delete this save?');

    await act(async () => {
      ui.presses['Cancel delete']?.();
    });
    expect(onDelete).not.toHaveBeenCalled();
    expect(ui.texts).not.toContain('Delete Save');

    await act(async () => {
      ui.presses['New game slot 2']?.();
    });
    expect(onNewGame).toHaveBeenCalledWith(2);
    expect(onDelete).not.toHaveBeenCalled();

    await act(async () => {
      ui.presses['Load slot 3']?.();
    });
    expect(onLoad).toHaveBeenCalledWith(3);

    await act(async () => {
      ui.presses['Delete slot 1']?.();
    });
    await act(async () => {
      ui.presses['Delete Save']?.();
    });
    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onDelete).toHaveBeenCalledWith(1);
    expect(ui.texts).not.toContain('Delete Save');
  });

  it('offers Export on occupied cards and Import on empty ones', async () => {
    const onExport = vi.fn();
    const onImport = vi.fn(async () => true);
    await act(async () => {
      root.render(
        <Record>
          <SaveSlotScreen
            slots={slots}
            onNewGame={() => undefined}
            onLoad={() => undefined}
            onDelete={() => undefined}
            onExport={onExport}
            onImport={onImport}
            onBack={() => undefined}
          />
        </Record>,
      );
    });

    expect(ui.presses['Export slot 1']).toBeDefined();
    expect(ui.presses['Export slot 2']).toBeUndefined();
    expect(ui.presses['Import into slot 2']).toBeDefined();
    expect(ui.presses['Import into slot 1']).toBeUndefined();

    await act(async () => {
      ui.presses['Export slot 1']?.();
    });
    expect(onExport).toHaveBeenCalledWith(1);
    expect(onImport).not.toHaveBeenCalled();
  });
});
