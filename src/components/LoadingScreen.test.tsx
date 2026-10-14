import React, { act, type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LoadingScreen } from './LoadingScreen';

type A11yNode = {
  kind: string;
  accessibilityRole?: unknown;
  accessibilityValue?: unknown;
  accessibilityLabel?: unknown;
  accessible?: unknown;
  accessibilityElementsHidden?: unknown;
  importantForAccessibility?: unknown;
  ariaHidden?: unknown;
  text?: string;
};

const { a11yNodes } = vi.hoisted(() => ({
  a11yNodes: [] as A11yNode[],
}));

type Root = {
  render(children: ReactNode): void;
  unmount(): void;
};

const { createRoot } = require('react-dom/client') as {
  createRoot: (container: unknown) => Root;
};

vi.mock('react-native', () => {
  const { createElement, Fragment } = require('react') as typeof import('react');

  function textOf(children: unknown): string {
    if (typeof children === 'string' || typeof children === 'number') return String(children);
    if (Array.isArray(children)) return children.map((child) => textOf(child)).join('');
    return '';
  }

  const record = (kind: string) =>
    (props: { children?: React.ReactNode } & Record<string, unknown>) => {
      a11yNodes.push({
        kind,
        accessibilityRole: props.accessibilityRole,
        accessibilityValue: props.accessibilityValue,
        accessibilityLabel: props.accessibilityLabel,
        accessible: props.accessible,
        accessibilityElementsHidden: props.accessibilityElementsHidden,
        importantForAccessibility: props.importantForAccessibility,
        ariaHidden: props['aria-hidden'],
        text: textOf(props.children),
      });
      return createElement(Fragment, null, props.children);
    };

  class Value {
    constructor(public value: number) {}
    interpolate(): number {
      return 0;
    }
  }
  return {
    View: record('View'),
    Text: record('Text'),
    StyleSheet: { create: (styles: unknown) => styles },
    Animated: {
      Value,
      View: record('Animated.View'),
      timing: () => ({ start: () => undefined }),
    },
    Dimensions: { get: () => ({ width: 390, height: 844 }) },
  };
});

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
    requestAnimationFrame: (cb: (time: number) => void) => setTimeout(() => cb(Date.now()), 16),
    cancelAnimationFrame: (id: ReturnType<typeof setTimeout>) => clearTimeout(id),
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

function renderScreen(
  root: Root,
  progress: number,
  onLoadingComplete: () => void
): Promise<void> {
  return act(async () => {
    root.render(
      <LoadingScreen
        progress={progress}
        currentAsset={progress >= 100 ? 'Starting...' : 'Crops'}
        stage={progress >= 100 ? 'Ready!' : 'Loading assets'}
        onLoadingComplete={onLoadingComplete}
      />
    );
  });
}

describe('LoadingScreen minimum display time', () => {
  let root: Root;

  beforeEach(() => {
    a11yNodes.length = 0;
    vi.useFakeTimers();
    const body = installDom();
    const container = (globalThis as { document: { createElement: (tag: string) => DomNode } }).document.createElement(
      'div'
    );
    body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    vi.useRealTimers();
  });

  it('does not call onLoadingComplete until 600ms when already loaded at mount', async () => {
    const onLoadingComplete = vi.fn();
    await renderScreen(root, 100, onLoadingComplete);

    expect(onLoadingComplete).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(599);
    });
    expect(onLoadingComplete).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(onLoadingComplete).toHaveBeenCalledTimes(1);
  });

  it('calls onLoadingComplete immediately when loading finishes after the minimum', async () => {
    const onLoadingComplete = vi.fn();
    await renderScreen(root, 40, onLoadingComplete);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    expect(onLoadingComplete).not.toHaveBeenCalled();

    await renderScreen(root, 100, onLoadingComplete);
    expect(onLoadingComplete).toHaveBeenCalledTimes(1);
  });

  it('exposes a progressbar and keeps particles out of the accessibility tree', async () => {
    await act(async () => {
      root.render(
        <LoadingScreen
          progress={42.6}
          currentAsset="Wheat"
          stage="Sowing the fields"
        />
      );
    });

    const bars = a11yNodes.filter((node) => node.accessibilityRole === 'progressbar');
    expect(bars).toHaveLength(1);
    expect(bars[0]).toMatchObject({
      kind: 'View',
      accessible: true,
      accessibilityLabel: 'Sowing the fields',
      accessibilityValue: { min: 0, max: 100, now: 43 },
    });
    expect(bars[0]?.accessibilityElementsHidden).not.toBe(true);

    const stageText = a11yNodes.filter(
      (node) => node.kind === 'Text' && node.text === 'Sowing the fields'
    );
    expect(stageText).toHaveLength(1);
    expect(stageText[0]?.accessibilityElementsHidden).not.toBe(true);

    const particles = a11yNodes.filter(
      (node) => node.kind === 'Animated.View' && node.accessibilityElementsHidden === true
    );
    expect(particles).toHaveLength(20);
    for (const particle of particles) {
      expect(particle.accessible).toBe(false);
      expect(particle.importantForAccessibility).toBe('no');
      expect(particle.ariaHidden).toBe(true);
      expect(particle.accessibilityRole).toBeUndefined();
      expect(particle.accessibilityLabel).toBeUndefined();
      expect(particle.text).toBe('');
    }

    const particleField = a11yNodes.filter(
      (node) =>
        node.kind === 'View' &&
        node.importantForAccessibility === 'no-hide-descendants'
    );
    expect(particleField).toHaveLength(1);
    expect(particleField[0]).toMatchObject({
      accessible: false,
      accessibilityElementsHidden: true,
      ariaHidden: true,
    });
  });
});
