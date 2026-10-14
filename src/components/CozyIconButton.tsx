import React, { useRef } from 'react';
import { Pressable, Text, Animated, StyleSheet, View, ViewStyle, Platform } from 'react-native';
import { theme } from '../styles/theme';

interface CozyIconButtonProps {
    emoji: string;
    label: string;
    /** Screen-reader name. Falls back to `label` when omitted. */
    accessibilityLabel?: string;
    isActive?: boolean;
    onPress: () => void;
    disabled?: boolean;
    durability?: number; // 0 to 1
    style?: ViewStyle;
}

export const CozyIconButton: React.FC<CozyIconButtonProps> = ({
    emoji,
    label,
    accessibilityLabel,
    isActive = false,
    onPress,
    disabled = false,
    durability,
    style,
}) => {
    const accessibleName = accessibilityLabel ?? label;
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const handlePressIn = () => {
        Animated.spring(scaleAnim, {
            toValue: 0.9,
            useNativeDriver: Platform.OS !== 'web', // Native driver not supported for scale on web in some RNW versions, but usually fine. Safest to disable if issues.
            friction: 5,
            tension: 100,
        }).start();
    };

    const handlePressOut = () => {
        Animated.spring(scaleAnim, {
            toValue: 1,
            useNativeDriver: Platform.OS !== 'web',
            friction: 5,
            tension: 100,
        }).start();
    };

    const handleHoverIn = () => {
        if (disabled) return;
        Animated.spring(scaleAnim, {
            toValue: 1.1,
            useNativeDriver: Platform.OS !== 'web',
            friction: 5,
            tension: 100,
        }).start();
    };

    const handleHoverOut = () => {
        Animated.spring(scaleAnim, {
            toValue: 1,
            useNativeDriver: Platform.OS !== 'web',
            friction: 5,
            tension: 100,
        }).start();
    };

    return (
        <Pressable
            onPress={onPress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            // @ts-ignore - React Native Web specific props
            onHoverIn={handleHoverIn}
            onHoverOut={handleHoverOut}
            disabled={disabled}
            accessible
            accessibilityRole="button"
            accessibilityLabel={accessibleName}
            aria-label={accessibleName}
            style={[{ flex: 1, maxWidth: 80 }, style]}
        >
            <Animated.View
                style={[
                    styles.container,
                    isActive && styles.activeContainer,
                    disabled && styles.disabledContainer,
                    { transform: [{ scale: scaleAnim }] },
                ]}
            >
                <Text
                    style={styles.emoji}
                    accessible={false}
                    accessibilityElementsHidden
                    importantForAccessibility="no"
                >
                    {emoji}
                </Text>
                <Text style={[styles.label, isActive && styles.activeLabel]}>{label}</Text>

                {durability !== undefined && (
                    <View style={styles.durabilityBar}>
                        <View
                            style={[
                                styles.durabilityFill,
                                { width: `${Math.max(0, Math.min(100, durability * 100))}%` }
                            ]}
                        />
                    </View>
                )}
            </Animated.View>
        </Pressable>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingVertical: 12,
        paddingHorizontal: 4,
        backgroundColor: theme.colors.glassBg,
        borderRadius: theme.borderRadius.m,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme.colors.glassBorder,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        width: '100%',
    },
    activeContainer: {
        backgroundColor: theme.colors.sage,
        borderColor: theme.colors.sage,
        shadowColor: theme.colors.sage,
        shadowOpacity: 0.4,
        shadowRadius: 8,
    },
    disabledContainer: {
        opacity: 0.5,
    },
    emoji: {
        fontSize: 22,
        marginBottom: 4,
    },
    label: {
        color: theme.colors.cocoa,
        fontWeight: '600',
        fontSize: 11,
    },
    activeLabel: {
        color: 'white',
    },
    durabilityBar: {
        width: '100%',
        height: 3,
        backgroundColor: 'rgba(0,0,0,0.1)',
        borderRadius: 2,
        marginTop: 4,
        overflow: 'hidden',
    },
    durabilityFill: {
        height: '100%',
        backgroundColor: 'white',
        borderRadius: 2,
    },
});
