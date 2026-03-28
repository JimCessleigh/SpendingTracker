export const lightColors = {
  background: '#FFFFFF', // Crisp white
  surface: '#F5F5F7', // Very light, Apple-like gray for cards
  surfaceMuted: '#FAFAFA',
  border: 'rgba(0, 0, 0, 0.05)',
  text: '#111111', // Deep charcoal
  textMuted: '#666666',
  textFaint: '#999999',
  primary: '#5C6AC4', // Premium, slightly muted Indigo/Blue to complement logo
  primaryDark: '#434CA0',
  success: '#34C759', // Refined iOS green
  danger: '#FF3B30', // Refined iOS red
  warning: '#FF9500',
};

export const darkColors = {
  background: '#000000', // Pure OLED black
  surface: '#121212', // Slightly elevated surface
  surfaceMuted: '#1C1C1E',
  border: 'rgba(255, 255, 255, 0.08)',
  text: '#FFFFFF',
  textMuted: '#A1A1A6',
  textFaint: '#636366',
  primary: '#7E8CE0', // Softer, luminous Indigo for dark mode
  primaryDark: '#5C6AC4',
  success: '#30D158',
  danger: '#FF453A',
  warning: '#FF9F0A',
};

export type ThemeColors = typeof lightColors;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
} as const;

export const lightShadow = {
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
} as const;

export const darkShadow = {
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
} as const;

export type ThemeShadow = {
  card: {
    shadowColor: string;
    shadowOffset: { width: number; height: number };
    shadowOpacity: number;
    shadowRadius: number;
    elevation: number;
  };
};

export const gradients = {
  dark: {
    background: ['#000000', '#000000', '#000000'] as const,
    primary: ['#7E8CE0', '#5C6AC4'] as const,
    card: ['#121212', '#121212'] as const,
  },
  light: {
    background: ['#FFFFFF', '#FFFFFF', '#FFFFFF'] as const,
    primary: ['#5C6AC4', '#434CA0'] as const,
    card: ['#F5F5F7', '#F5F5F7'] as const,
  }
};

export interface ThemeGradients {
  background: readonly [string, string, string];
  primary: readonly [string, string];
  card: readonly [string, string];
}

export interface AppTheme {
  colors: ThemeColors;
  radius: typeof radius;
  shadow: ThemeShadow;
  gradients: ThemeGradients;
  glass: {
    background: string;
    border: string;
  };
}

export function createTheme(dark: boolean): AppTheme {
  return {
    colors: dark ? darkColors : lightColors,
    radius,
    shadow: dark ? darkShadow : lightShadow,
    gradients: dark ? gradients.dark : gradients.light,
    glass: {
      background: dark ? 'rgba(18, 18, 18, 0.85)' : 'rgba(250, 250, 250, 0.85)',
      border: dark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
    }
  };
}

export const theme = createTheme(false);
