/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        tool: {
          bg: '#0b0f19',
          surface: '#131b2e',
          card: '#162036',
          hover: '#1c2844',
          border: '#24324f',
          borderSubtle: '#1b253b',
          primary: '#3b82f6',
          primaryHover: '#2563eb',
          danger: '#ef4444',
          dangerHover: '#dc2626'
        }
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['"Share Tech Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      }
    },
  },
  plugins: [],
}
