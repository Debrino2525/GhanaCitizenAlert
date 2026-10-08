export const tokens = {
  colors: {
    bg: {
      base: '#070B13',
      subtle: '#0B1120',
      surface: '#0F172A',
      overlay: 'rgba(7, 11, 19, 0.85)',
      glass: 'rgba(15, 23, 42, 0.75)'
    },
    surface: {
      card: '#0F172A',
      cardHover: '#1E293B',
      cardSubtle: '#0B1E38',
      modal: '#0F172A'
    },
    border: {
      subtle: '#1E293B',
      medium: '#334155',
      strong: '#475569',
      glass: 'rgba(255, 255, 255, 0.08)',
      gold: '#FCD116',
      police: '#3B82F6',
      emergency: '#EF4444'
    },
    text: {
      primary: '#E2E8F0',
      secondary: '#94A3B8',
      muted: '#64748B',
      inverse: '#070B13',
      white: '#FFFFFF',
      gold: '#FCD116',
      sky: '#38BDF8',
      emerald: '#10B981',
      crimson: '#EF4444'
    },
    brand: {
      gold: '#FCD116',
      goldHover: '#E5BD10',
      red: '#CE1126',
      green: '#006B3F',
      greenLight: '#6EE7B7',
      sky: '#38BDF8'
    },
    police: {
      primary: '#2563EB',
      accent: '#3B82F6',
      dark: '#1E3A8A',
      badge: '#60A5FA'
    },
    status: {
      success: '#10B981',
      warning: '#F59E0B',
      amber: '#D97706',
      danger: '#EF4444',
      emergency: '#DC2626',
      emergencyDark: '#991B1B',
      emergencyRing: '#7F1D1D'
    }
  },
  typography: {
    fontFamily: {
      sans: 'System',
      mono: 'monospace'
    },
    fontSize: {
      xs: 10,
      sm: 12,
      md: 14,
      lg: 16,
      xl: 20,
      xxl: 28
    },
    fontWeight: {
      regular: '400' as const,
      medium: '500' as const,
      semibold: '600' as const,
      bold: '700' as const,
      heavy: '800' as const,
      black: '900' as const
    },
    lineHeight: {
      xs: 14,
      sm: 16,
      md: 20,
      lg: 24,
      xl: 28,
      xxl: 36
    }
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    xxxl: 32
  },
  radius: {
    sm: 6,
    md: 10,
    lg: 14,
    xl: 20,
    full: 9999
  },
  elevation: {
    low: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 3
    },
    medium: {
      shadowColor: '#3B82F6',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 6
    },
    high: {
      shadowColor: '#EF4444',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.5,
      shadowRadius: 16,
      elevation: 12
    }
  },
  touchTarget: {
    minHeight: 44,
    minWidth: 44
  }
};
