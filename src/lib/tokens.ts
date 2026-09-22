/**
 * Commerce Intelligence design tokens (TypeScript mirror of CSS variables).
 * Source of truth for values: src/styles/tokens.css
 */
export const tokens = {
  color: {
    background: "#ffffff",
    backgroundSecondary: "#fafafa",
    backgroundTertiary: "#f5f5f5",
    surface: "#ffffff",
    surfaceHover: "#fafafa",
    surfaceActive: "#f5f5f5",
    textPrimary: "#111111",
    textSecondary: "#525252",
    textTertiary: "#737373",
    textDisabled: "#a3a3a3",
    border: "#e5e5e5",
    borderSubtle: "#f0f0f0",
    borderStrong: "#d4d4d4",
    black: "#000000",
    white: "#ffffff",
    primaryHover: "#262626",
    success: "#16a34a",
    warning: "#ca8a04",
    error: "#dc2626",
    info: "#2563eb",
  },
  spacing: [4, 8, 12, 16, 20, 24, 32, 40, 48, 64] as const,
  radius: {
    sm: 6,
    md: 8,
    lg: 12,
    xl: 16,
  },
  pagePaddingDesktop: 32,
} as const;
