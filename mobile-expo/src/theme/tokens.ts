/**
 * Design tokens — "Humane Civic Guard" design system (design/stitch/humane_civic_guard/DESIGN.md).
 * Dark navy surfaces, Ghana gold primary actions, deep red reserved for SOS/danger.
 */
export const tokens = {
  colors: {
    bg: {
      base: '#0B1326',
      subtle: '#131B2E',
      surface: '#171F33',
      overlay: 'rgba(6, 14, 32, 0.88)',
      glass: 'rgba(19, 27, 46, 0.9)',
      glassLight: 'rgba(34, 42, 61, 0.75)'
    },
    surface: {
      card: '#171F33',
      cardHover: '#222A3D',
      cardSubtle: '#131B2E',
      modal: '#171F33',
      input: '#060E20',
      highest: '#2D3449'
    },
    border: {
      subtle: '#222A3D',
      medium: '#2D3449',
      strong: '#4D4632',
      glass: 'rgba(255, 255, 255, 0.08)',
      gold: '#FCD116',
      police: '#3B82F6',
      emergency: '#A40217',
      success: '#5FEDB0'
    },
    text: {
      primary: '#DAE2FD',
      secondary: '#D0C6AB',
      muted: '#999078',
      inverse: '#231B00',
      white: '#FFFFFF',
      gold: '#FCD116',
      sky: '#38BDF8',
      emerald: '#5FEDB0',
      crimson: '#FFB4AB'
    },
    sos: {
      container: '#A40217',
      containerPressed: '#7A0011',
      onContainer: '#FFDAD7',
      soft: 'rgba(164, 2, 23, 0.18)',
      ring: 'rgba(164, 2, 23, 0.35)',
      text: '#FFB3AD'
    },
    brand: {
      gold: '#FCD116',
      goldHover: '#E5BD10',
      goldMuted: 'rgba(252, 209, 22, 0.15)',
      red: '#CE1126',
      green: '#006B3F',
      greenLight: '#6EE7B7',
      sky: '#38BDF8'
    },
    police: {
      primary: '#2563EB',
      accent: '#3B82F6',
      dark: '#1E3A8A',
      badge: '#60A5FA',
      glow: 'rgba(59, 130, 246, 0.3)'
    },
    status: {
      // success/danger are used both as fills (with white content) and as text,
      // so they stay mid-tone; use text.emerald / text.crimson for light text.
      success: '#10B981',
      successDark: '#006947',
      warning: '#F59E0B',
      amber: '#D97706',
      danger: '#DC2626',
      emergency: '#A40217',
      emergencyDark: '#7A0011',
      emergencyRing: '#410004'
    }
  },
  typography: {
    fontFamily: {
      sans: 'PlusJakartaSans_600SemiBold',
      sansBold: 'PlusJakartaSans_800ExtraBold',
      sansRegular: 'PlusJakartaSans_400Regular',
      sansMedium: 'PlusJakartaSans_500Medium',
      mono: 'JetBrainsMono_400Regular',
      monoBold: 'JetBrainsMono_700Bold'
    },
    fontSize: {
      xxs: 10,
      xs: 11,
      sm: 12,
      md: 14,
      lg: 16,
      xl: 20,
      xxl: 28
    },
    lineHeight: {
      xxs: 14,
      xs: 16,
      sm: 18,
      md: 20,
      lg: 24,
      xl: 28,
      xxl: 36
    }
  },
  spacing: {
    xxs: 2,
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    xxxl: 32
  },
  radius: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
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
    minHeight: 48,
    minWidth: 48,
    primaryButton: 52
  }
};
