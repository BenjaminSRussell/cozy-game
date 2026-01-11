/**
 * Cozy Haven Design System
 * Defines the unified "Cozy 2.5D" aesthetic (Sage/Clay/Cream palette & Glassmorphism)
 */

export const theme = {
    colors: {
        // Primary Palette (Nature-inspired)
        sage: '#8FBC8F',       // Primary Action, Growth, Success
        clay: '#E07A5F',       // Secondary, Alerts, Highlights
        cream: '#FDFBF7',      // Backgrounds, Panels
        cocoa: '#5D4037',      // Text, Outlines
        sky: '#A8DADC',        // Accents, Water

        // Status
        success: '#8FBC8F',
        warning: '#F4A261',
        error: '#E76F51',

        // UI Specific
        glassBg: 'rgba(255, 255, 255, 0.65)',
        glassBorder: 'rgba(255, 255, 255, 0.4)',
        overlay: 'rgba(93, 64, 55, 0.2)', // Cocoa with opacity
    },

    shadows: {
        soft: '0 8px 32px rgba(31, 38, 135, 0.15)',
        crisp: '0 4px 6px rgba(93, 64, 55, 0.1)',
    },

    borderRadius: {
        s: '8px',
        m: '16px',
        l: '24px',
        xl: '32px',
        oval: '999px',
    },

    typography: {
        fontFamily: "'Segoe UI', 'Nunito', sans-serif",
        sizes: {
            small: '12px',
            body: '14px',
            h3: '16px',
            h2: '20px',
            h1: '28px',
        },
        weights: {
            regular: '400',
            medium: '600',
            bold: '700',
        },
    },

    // Reusable Glassmorphism style object (for inline styles)
    glassStyle: {
        background: 'rgba(255, 255, 255, 0.65)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderColor: 'rgba(255, 255, 255, 0.4)',
        borderWidth: 1,
        borderStyle: 'solid',
        boxShadow: '0 8px 32px rgba(31, 38, 135, 0.15)',
    }
};
