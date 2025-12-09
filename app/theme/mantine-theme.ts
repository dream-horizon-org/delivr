import { createTheme, rem } from "@mantine/core";
import { colors, theme as customTheme } from "./colors";

export const mantineTheme = createTheme({
  cursorType: "pointer",
  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  
  // Color Palette
  colors: {
    brand: colors.brand,
    slate: colors.slate,
  },
  primaryColor: "brand",
  primaryShade: 5,
  
  defaultRadius: "md",
  
  // Explicitly define spacing and radius to avoid potential undefined issues
  spacing: {
    xs: rem(4),
    sm: rem(8),
    md: rem(16),
    lg: rem(24),
    xl: rem(32),
  },
  
  radius: {
    xs: rem(2),
    sm: rem(4),
    md: rem(8),
    lg: rem(16),
    xl: rem(24),
  },

  shadows: {
    xs: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
    sm: "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)",
    md: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)",
    lg: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)",
    xl: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
  },

  headings: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: "700",
    sizes: {
      h1: { fontSize: rem(36), lineHeight: "1.2" },
      h2: { fontSize: rem(30), lineHeight: "1.3" },
      h3: { fontSize: rem(24), lineHeight: "1.35" },
      h4: { fontSize: rem(20), lineHeight: "1.4" },
    },
  },

  components: {
    Button: {
      defaultProps: {
        radius: "md",
        fw: 500,
      },
    },
    Card: {
      defaultProps: {
        radius: "md",
        shadow: "sm",
        withBorder: true,
      },
    },
    Paper: {
      defaultProps: {
        radius: "md",
        shadow: "sm",
        withBorder: true,
      },
    },
    Badge: {
      defaultProps: {
        radius: "sm",
        fw: 600,
      },
    },
    Tabs: {
      defaultProps: {
        color: "brand",
      },
      styles: {
        tab: {
          '&[data-active]': {
            borderColor: 'var(--mantine-color-brand-5)',
            color: 'var(--mantine-color-brand-6)',
          },
        },
      },
    },
  },

  other: {
    ...customTheme,
  },
});
