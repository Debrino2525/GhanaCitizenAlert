/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ghana: {
          red: '#CE1126',
          gold: '#FCD116',
          green: '#006B3F',
          black: '#111111'
        },
        police: {
          navy: '#0B1E38',
          blue: '#1E3A8A',
          badge: '#EAB308'
        }
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace']
      },
      zIndex: {
        'map': '0',
        'sticky': '40',
        'header': '50',
        'dropdown': '60',
        'popover': '70',
        'modal': '100',
        'toast': '110',
        'map-ui': '400'
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        pulseRing: {
          '0%': { transform: 'scale(0.9)', opacity: '0.7' },
          '100%': { transform: 'scale(2.2)', opacity: '0' }
        }
      },
      animation: {
        'fade-in': 'fadeIn 0.25s ease-out both',
        'fadeIn': 'fadeIn 0.25s ease-out both',
        'pulse-ring': 'pulseRing 1.8s ease-out infinite'
      }
    },
  },
  plugins: [],
}
