import { type MantineColorsTuple } from "@mantine/core";

// Strong Teal Palette (Primary)
// A punchy, vibrant teal that isn't washed out.
const brandColors: MantineColorsTuple = [
  "#f0fdfa", // 0: Background/Subtle
  "#ccfbf1", // 1: Hover Light
  "#99f6e4", // 2: Border Light
  "#5eead4", // 3: Border Strong
  "#2dd4bf", // 4: Primary Light
  "#14b8a6", // 5: PRIMARY (The main brand color)
  "#0d9488", // 6: Primary Hover
  "#0f766e", // 7: Primary Active/Dark
  "#115e59", // 8: Text Dark
  "#134e4a", // 9: Text Darker
];

// Slate Gray (Neutral)
// For text, borders, and backgrounds.
const slateColors: MantineColorsTuple = [
  "#f8fafc", // 0: App Background
  "#f1f5f9", // 1: Subtle Background
  "#e2e8f0", // 2: Borders / Dividers
  "#cbd5e1", // 3: Disabled / Placeholders
  "#94a3b8", // 4: Muted Text
  "#64748b", // 5: Secondary Text
  "#475569", // 6: Primary Text Light
  "#334155", // 7: Primary Text
  "#1e293b", // 8: Heading Text
  "#0f172a", // 9: Black/Contrast
];

// Semantic Colors
const success = "#10b981"; // Emerald 500
const error = "#ef4444";   // Red 500
const warning = "#f59e0b"; // Amber 500
const info = "#3b82f6";    // Blue 500

export const brand = {
  primary: brandColors[5],
  secondary: brandColors[0],
  hover: brandColors[6],
  light: brandColors[0],
} as const;

export const theme = {
  backgrounds: {
    app: slateColors[0],      // Main page background
    paper: "#ffffff",         // Card/Modal background
    subtle: slateColors[1],   // Secondary background
    hover: slateColors[1],
  },
  text: {
    heading: slateColors[9],
    body: slateColors[7],
    secondary: slateColors[5],
    muted: slateColors[4],
    brand: brandColors[7],
  },
  borders: {
    subtle: slateColors[2],
    strong: slateColors[3],
    brand: brandColors[3],
  },
} as const;

export const colors = {
  brand: brandColors,
  slate: slateColors,
};
