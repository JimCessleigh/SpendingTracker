export const theme = {
  colors: {
    background: '#F3F5FB',
    surface: '#FFFFFF',
    surfaceMuted: '#EEF1FA',
    border: '#DEE4F0',
    text: '#1F2937',
    textMuted: '#6B7280',
    textFaint: '#94A3B8',
    primary: '#5B6CFF',
    primaryDark: '#4354E6',
    success: '#10B981',
    danger: '#EF4444',
    warning: '#F59E0B',
  },
  radius: {
    sm: 10,
    md: 14,
    lg: 18,
    xl: 24,
  },
  shadow: {
    card: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 4,
    },
  },
} as const;
