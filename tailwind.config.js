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
      }
    },
  },
  plugins: [],
}
