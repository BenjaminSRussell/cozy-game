import React, { act, type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LoadingScreen } from './LoadingScreen';

type Root = {
  render(children: ReactNode): void;
  unmount(): void;
};

const { createRoot } = require('react-dom/client') as {
  createRoot: (container: unknown) => Root;
};

vi.mock('react-native', () => {
  const { createElement, Fragment } = require('react') as typeof import('react');
  const passthrough = ({ children }: { children?: React.ReactNode }) =>
    createElement(Fragment, null, children);
  class Value {
    constructor(public value: number) {}
    interpolate(): number {
      return 0;
    }
  }
  return {
    View: passthrough,
    Text: passthrough,
    StyleSheet: { create: (styles: unknown) => styles },
    Animated: {
      Value,
      View: passthrough,
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
});
