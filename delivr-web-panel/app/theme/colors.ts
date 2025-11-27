/**
 * Centralized Theme System for the Application
 * 
 * RULES:
 * 1. ALL styles must be defined here
 * 2. NO hardcoded colors, fonts, or spacing in components
 * 3. Use these constants throughout the app for consistency
 */

export const brand = {
  primary: "#6366f1",
  secondary: "#8b5cf6",
  primaryDark: "#4f46e5",
  light: "#eef2ff",
  gradient: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
} as const;

export const theme = {
  backgrounds: {
    primary: "#ffffff",
    secondary: "#f8f9fa",
    tertiary: "#fafafa",
    hover: "#f3f4f6",
    active: "#eef2ff",
    subtle: "#f9fafb",
  },

  text: {
    primary: "#1f2937",
    secondary: "#374151",
    tertiary: "#6b7280",
    disabled: "#9ca3af",
    brand: "#6366f1",
    brandDark: "#4f46e5",
    white: "#ffffff",
    dimmed: "#9ca3af",
    red: "#ef4444",
    yellow: "#eab308",
  },

  borders: {
    primary: "#e5e7eb",
    secondary: "#e9ecef",
    light: "#f3f4f6",
    dark: "#d1d5db",
    brand: "#6366f1",
    brandLight: "#c7d2fe",
  },
} as const;

export const typography = {
  fontSize: {
    xs: "10px",
    sm: "12px",
    md: "14px",
    base: "16px",
    lg: "18px",
    xl: "20px",
    "2xl": "24px",
    "3xl": "30px",
    "4xl": "36px",
  },
  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  letterSpacing: {
    tight: "-0.5px",
    normal: "0px",
    wide: "0.5px",
    wider: "1px",
  },
  lineHeight: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
  },
} as const;

export const spacing = {
  xxs: "2px",
  xs: "4px",
  sm: "8px",
  md: "12px",
  lg: "16px",
  xl: "20px",
  "2xl": "24px",
  "3xl": "32px",
  "4xl": "40px",
  "5xl": "48px",
  "6xl": "64px",
} as const;

export const borderRadius = {
  sm: "4px",
  md: "8px",
  lg: "12px",
  xl: "16px",
  "2xl": "20px",
  full: "9999px",
} as const;

export const shadows = {
  none: "none",
  sm: "0 2px 8px rgba(0, 0, 0, 0.08)",
  md: "0 4px 16px rgba(99, 102, 241, 0.12)",
  lg: "0 8px 24px rgba(99, 102, 241, 0.15)",
  hover: "0 4px 16px rgba(99, 102, 241, 0.2)",
  card: "0 1px 3px rgba(0, 0, 0, 0.12)",
} as const;

export const transitions = {
  fast: "all 150ms ease",
  normal: "all 200ms ease",
  slow: "all 250ms ease",
  colors: "color 200ms ease, background-color 200ms ease",
} as const;

export const zIndex = {
  base: 0,
  dropdown: 1000,
  modal: 2000,
  tooltip: 3000,
  notification: 4000,
} as const;

export const sizes = {
  icon: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    "2xl": 24,
    "3xl": 32,
    "4xl": 40,
  },
  avatar: {
    sm: 26,
    md: 48,
    lg: 72,
    xl: 80,
  },
  button: {
    xs: "24px",
    sm: "32px",
    md: "40px",
    lg: "44px",
    xl: "48px",
  },
} as const;

export const opacity = {
  disabled: 0.5,
  hover: 0.8,
  overlay: 0.95,
  subtle: 0.2,
  medium: 0.4,
  strong: 0.6,
} as const;

export const buttonGradients = {
  primary: brand.gradient,
} as const;

export const { backgrounds, text, borders } = theme;
