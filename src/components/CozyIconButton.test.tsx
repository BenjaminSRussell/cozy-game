import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

vi.mock('react-native', () => {
    const React = require('react') as typeof import('react');

    const host = (tag: string) =>
        function Host(props: { children?: React.ReactNode } & Record<string, unknown>) {
            const ariaLabel = props['aria-label'];
            const accessibilityLabel = props.accessibilityLabel;
            const ariaHidden = props['aria-hidden'];
            const attrs: Record<string, unknown> = {};
            if (typeof ariaLabel === 'string') attrs['aria-label'] = ariaLabel;
            if (typeof accessibilityLabel === 'string') {
                attrs['data-accessibility-label'] = accessibilityLabel;
            }
            if (ariaHidden === true) attrs['aria-hidden'] = 'true';
            return React.createElement(tag, attrs, props.children);
        };

    return {
        Pressable: host('pressable'),
        Text: host('text'),
        View: host('view'),
        Animated: {
            View: host('animated-view'),
            Value: class AnimatedValue {
                constructor(public _value: number) {}
            },
            spring: () => ({ start() {} }),
        },
        StyleSheet: {
            create<T>(styles: T): T {
                return styles;
            },
        },
        Platform: { OS: 'web' },
    };
});

import { CozyIconButton } from './CozyIconButton';

describe('CozyIconButton accessible name', () => {
    it('uses the visible label when accessibilityLabel is omitted', () => {
        const html = renderToStaticMarkup(
            <CozyIconButton emoji="🌾" label="Plant Wheat" onPress={() => {}} />,
        );
        expect(html).toContain('aria-label="Plant Wheat"');
        expect(html).toContain('data-accessibility-label="Plant Wheat"');
        expect(html).toContain('<text aria-hidden="true">🌾</text>');
        expect(html).not.toContain('aria-label="🌾"');
    });

    it('prefers a custom accessibilityLabel over the visible label', () => {
        const html = renderToStaticMarkup(
            <CozyIconButton
                emoji="💧"
                label="Water"
                accessibilityLabel="Water the selected crop"
                onPress={() => {}}
            />,
        );
        expect(html).toContain('aria-label="Water the selected crop"');
        expect(html).toContain('data-accessibility-label="Water the selected crop"');
        expect(html).not.toContain('aria-label="Water"');
        expect(html).toContain('<text aria-hidden="true">💧</text>');
        expect(html).not.toContain('aria-label="💧"');
    });
});
