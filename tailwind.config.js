/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Shared base dark canvas
        canvas: {
          bg: '#0a0b0e',
          card: '#12141a',
          subtle: '#181b24',
          border: '#242936',
          borderLight: '#303748',
          text: '#f3f4f6',
          muted: '#8e96a7',
        },
        // Tool-specific curated palette in order: red -> blue -> green -> purple -> gold
        palette: {
          // 1. Red (Hero Stats)
          red: {
            DEFAULT: '#e11d48',
            hover: '#be123c',
            subtle: '#3b1219',
            border: '#6f1926',
            text: '#fda4af',
            accent: '#f43f5e'
          },
          // 2. Blue (Timed Reminders)
          blue: {
            DEFAULT: '#2563eb',
            hover: '#1d4ed8',
            subtle: '#102245',
            border: '#1d3e78',
            text: '#93c5fd',
            accent: '#3b82f6'
          },
          // 3. Green (Future Tool 3)
          green: {
            DEFAULT: '#10b981',
            hover: '#059669',
            subtle: '#0f3325',
            border: '#155e42',
            text: '#a7f3d0',
            accent: '#34d399'
          },
          // 4. Purple (Future Tool 4)
          purple: {
            DEFAULT: '#9333ea',
            hover: '#7e22ce',
            subtle: '#2c1543',
            border: '#58228a',
            text: '#d8b4fe',
            accent: '#a855f7'
          },
          // 5. Gold (Future Tool 5)
          gold: {
            DEFAULT: '#d97706',
            hover: '#b45309',
            subtle: '#3d250c',
            border: '#784615',
            text: '#fde68a',
            accent: '#fbbf24'
          }
        }
      },
      borderRadius: {
        'bespoke': '5px',
        'bespoke-lg': '8px',
        'bespoke-sm': '3.5px',
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      }
    },
  },
  plugins: [],
}
