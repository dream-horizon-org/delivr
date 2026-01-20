/**
 * Distribution Management Design System
 * 
 * This file defines the complete design system for distribution management:
 * - Color palette (semantic colors for consistent theming)
 * - Typography scale (font sizes, weights, line heights)
 * - Spacing system (padding, margins, gaps)
 * - Component patterns (consistent Mantine props)
 * 
 * Usage: Import these constants instead of hardcoding values
 */

// ============================================================================
// COLOR SYSTEM
// ============================================================================

/**
 * Semantic colors for distribution management UI
 * Based on Mantine color system with semantic naming
 */
export const DIST_COLORS = {
  // Status Colors
  STATUS: {
    SUCCESS: 'green',
    WARNING: 'orange',
    ERROR: 'red',
    INFO: 'blue',
    PENDING: 'yellow',
    NEUTRAL: 'gray',
  },
  
  // Platform Colors
  PLATFORM: {
    IOS: 'blue',
    ANDROID: 'green',
  },
  
  // Action Colors
  ACTION: {
    PRIMARY: 'blue',
    SECONDARY: 'gray',
    DANGER: 'red',
    SUCCESS: 'green',
  },
  
  // Background Colors
  BACKGROUND: {
    SUCCESS: 'green.0',
    WARNING: 'orange.0',
    ERROR: 'red.0',
    INFO: 'blue.0',
    NEUTRAL: 'gray.0',
  },
} as const;

// ============================================================================
// TYPOGRAPHY SYSTEM
// ============================================================================

/**
 * Font sizes following a consistent scale
 */
export const DIST_FONT_SIZES = {
  XS: 'xs',
  SM: 'sm',
  MD: 'md',
  LG: 'lg',
  XL: 'xl',
} as const;

/**
 * Font weights for consistent typography
 */
export const DIST_FONT_WEIGHTS = {
  NORMAL: 400,
  MEDIUM: 500,
  SEMIBOLD: 600,
  BOLD: 700,
} as const;

/**
 * Heading sizes (for Title component)
 */
export const DIST_HEADING_ORDER = {
  H1: 1,
  H2: 2,
  H3: 3,
  H4: 4,
  H5: 5,
  H6: 6,
} as const;

// ============================================================================
// SPACING SYSTEM
// ============================================================================

/**
 * Consistent spacing scale (xs: 4px, sm: 8px, md: 16px, lg: 24px, xl: 32px)
 */
export const DIST_SPACING = {
  XS: 'xs',
  SM: 'sm',
  MD: 'md',
  LG: 'lg',
  XL: 'xl',
} as const;

// ============================================================================
// COMPONENT PATTERNS
// ============================================================================

/**
 * Standard Card/Paper props
 */
export const DIST_CARD_PROPS = {
  DEFAULT: {
    shadow: 'sm',
    padding: 'lg',
    radius: 'md',
    withBorder: true,
  },
  COMPACT: {
    shadow: 'sm',
    padding: 'md',
    radius: 'md',
    withBorder: true,
  },
  NESTED: {
    shadow: 'xs',
    padding: 'md',
    radius: 'sm',
    withBorder: true,
  },
} as const;

/**
 * Standard Badge props
 */
export const DIST_BADGE_PROPS = {
  DEFAULT: {
    variant: 'light',
    radius: 'sm',
    size: 'md',
  },
  LARGE: {
    variant: 'light',
    radius: 'sm',
    size: 'lg',
  },
  DOT: {
    variant: 'dot',
    radius: 'sm',
    size: 'lg',
  },
} as const;

/**
 * Standard Button props
 */
export const DIST_BUTTON_PROPS = {
  PRIMARY: {
    variant: 'filled',
    size: 'md',
    radius: 'sm',
  },
  SECONDARY: {
    variant: 'light',
    size: 'md',
    radius: 'sm',
  },
  SUBTLE: {
    variant: 'subtle',
    size: 'md',
    radius: 'sm',
  },
  DANGER: {
    variant: 'filled',
    size: 'md',
    radius: 'sm',
    color: 'red',
  },
} as const;

/**
 * Standard ThemeIcon props
 */
export const DIST_ICON_PROPS = {
  DEFAULT: {
    size: 'md',
    radius: 'md',
    variant: 'light',
  },
  LARGE: {
    size: 'lg',
    radius: 'md',
    variant: 'light',
  },
  SMALL: {
    size: 'sm',
    radius: 'sm',
    variant: 'light',
  },
} as const;

/**
 * Icon sizes (pixel values)
 */
export const DIST_ICON_SIZES = {
  XS: 12,
  SM: 14,
  MD: 16,
  LG: 18,
  XL: 20,
  XXL: 24,
} as const;

/**
 * Standard Modal/Dialog props
 */
export const DIST_MODAL_PROPS = {
  DEFAULT: {
    radius: 'md',
    padding: 'lg',
    size: 'md',
    centered: true,
  },
  LARGE: {
    radius: 'md',
    padding: 'lg',
    size: 'lg',
    centered: true,
  },
  SMALL: {
    radius: 'md',
    padding: 'md',
    size: 'sm',
    centered: true,
  },
} as const;

/**
 * Standard TextInput/Select/Textarea props
 */
export const DIST_INPUT_PROPS = {
  DEFAULT: {
    size: 'md',
    radius: 'sm',
  },
} as const;

/**
 * Standard Progress props
 */
export const DIST_PROGRESS_PROPS = {
  DEFAULT: {
    size: 'md',
    radius: 'md',
  },
  LARGE: {
    size: 'lg',
    radius: 'md',
  },
  SMALL: {
    size: 'sm',
    radius: 'sm',
  },
} as const;

/**
 * Standard Divider props
 */
export const DIST_DIVIDER_PROPS = {
  DEFAULT: {
    my: 'md',
  },
  COMPACT: {
    my: 'sm',
  },
} as const;

/**
 * Standard Alert props
 */
export const DIST_ALERT_PROPS = {
  SUCCESS: {
    color: 'green',
    variant: 'light',
    radius: 'sm',
  },
  WARNING: {
    color: 'orange',
    variant: 'light',
    radius: 'sm',
  },
  ERROR: {
    color: 'red',
    variant: 'light',
    radius: 'sm',
  },
  INFO: {
    color: 'blue',
    variant: 'light',
    radius: 'sm',
  },
} as const;

/**
 * Standard text color patterns
 */
export const DIST_TEXT_COLORS = {
  SECONDARY: 'dimmed',
  SUCCESS: 'green.7',
  WARNING: 'orange.7',
  ERROR: 'red.7',
  INFO: 'blue.7',
} as const;

/**
 * Empty state patterns
 */
export const DIST_EMPTY_STATE = {
  ICON_SIZE: 48,
  ICON_COLOR: 'gray',
  ICON_VARIANT: 'light',
  TEXT_SIZE: 'lg',
  DESCRIPTION_SIZE: 'sm',
  DESCRIPTION_COLOR: 'dimmed',
} as const;

// ============================================================================
// MODERN ALIASES (Simplified Design System Tokens)
// ============================================================================

/**
 * Simplified color palette for modern usage
 */
export const DS_COLORS = {
  // Status colors
  STATUS: {
    SUCCESS: 'green',
    ERROR: 'red',
    WARNING: 'yellow',
    INFO: 'blue',
    MUTED: 'gray',
    NEUTRAL: 'gray',
    PENDING: 'gray',
  },
  // Platform colors
  PLATFORM: {
    ANDROID: 'green',
    IOS: 'blue',
  },
  // Action colors
  ACTION: {
    PRIMARY: 'cyan',
    WARNING: 'orange',
    DANGER: 'red',
  },
  // Text colors (omit PRIMARY - Mantine uses theme default when c prop not passed)
  TEXT: {
    SECONDARY: 'dimmed',
    MUTED: 'dimmed',
  },
  // Background colors
  BACKGROUND: {
    SURFACE: 'white',
    SUBTLE: 'gray.0',
    SUCCESS_LIGHT: 'green.0',
    SUCCESS: 'green.0',
    ERROR_LIGHT: 'red.0',
    ERROR: 'red.0',
    WARNING_LIGHT: 'yellow.0',
    WARNING: 'yellow.0',
    INFO_LIGHT: 'blue.0',
    INFO: 'blue.0',
    CARD: 'white',
  },
} as const;

/**
 * Typography system
 */
export const DS_TYPOGRAPHY = {
  SIZE: {
    XS: 'xs',
    SM: 'sm',
    MD: 'md',
    LG: 'lg',
    XL: 'xl',
  },
  WEIGHT: {
    NORMAL: 400,
    MEDIUM: 500,
    SEMIBOLD: 600,
    BOLD: 700,
  },
} as const;

/**
 * Spacing system
 */
export const DS_SPACING = {
  XXS: 2,
  XS: 4,
  SM: 8,
  MD: 16,
  LG: 24,
  XL: 32,
  BORDER_RADIUS: 8,
} as const;

/**
 * Component patterns (aliases to DIST_* for backwards compatibility)
 */
export const DS_COMPONENTS = {
  CARD: DIST_CARD_PROPS,
  BADGE: DIST_BADGE_PROPS,
  BUTTON: DIST_BUTTON_PROPS,
  MODAL: DIST_MODAL_PROPS,
  INPUT: DIST_INPUT_PROPS,
} as const;

