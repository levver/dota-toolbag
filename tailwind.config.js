/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dota: {
          dark: '#0B0F19',
          card: '#151D2A',
          cardHover: '#1C2638',
          border: '#2A374A',
          red: '#DC2626',
          redHover: '#B91C1C',
          gold: '#F59E0B',
          accent: '#E11D48'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"Share Tech Mono"', 'monospace', 'Courier New'],
      }
    },
  },
  plugins: [],
}
