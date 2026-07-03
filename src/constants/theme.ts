import '@/global.css';
import { Platform } from 'react-native';

export const Colors = {
  light: {
    primary: '#FF5E00',       // Orange Strava-like color
    primaryLight: '#FFEFEB',  // Light orange background tint
    text: '#1E1E1E',          // Dark charcoal text
    textSecondary: '#7E7E7E', // Soft grey subtitle text
    background: '#F8F9FA',    // Clean light grey background
    cardBackground: '#FFFFFF',// Pure white card background
    border: '#EBEBEB',        // Soft borders
    success: '#34C759',       // Green for GPS/Success
    danger: '#FF3B30',        // Red for stop/errors
    warning: '#FFCC00',       // Yellow for pause
    backgroundElement: '#F0F0F3',
    backgroundSelected: '#E0E1E6',
  },
  dark: {
    primary: '#FF5E00',
    primaryLight: '#2C150A',
    text: '#FFFFFF',
    textSecondary: '#A0A0A0',
    background: '#121212',
    cardBackground: '#1E1E1E',
    border: '#2A2A2A',
    success: '#30D158',
    danger: '#FF453A',
    warning: '#FFD60A',
    backgroundElement: '#212225',
    backgroundSelected: '#2E3135',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 4,
  one: 8,
  two: 12,
  three: 16,
  four: 24,
  five: 32,
  six: 48,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
