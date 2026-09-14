/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: '#4d42fc', hover: '#645aff', soft: '#8077ff', tint: '#bdb9ff', deep: '#201c5c' },
        dark: { bg: '#0b0b0d', panel: '#141518', 'panel-2': '#1b1c20', line: '#26272c', 'line-2': '#34363c' },
        // Creators status colours, exposed under the names the components already use.
        emerald: { 100: '#c6efe3', 300: '#5fd1b3', 400: '#17a781', 500: '#17a781', 600: '#128a6a' },
        rose: { 100: '#fbd3e2', 300: '#f78ab2', 400: '#f03277', 500: '#f03277', 600: '#d12262' },
        cyan: { 300: '#bdb9ff', 400: '#8077ff', 500: '#8077ff' },
        amber: { 500: '#8077ff' },
        slate: { 300: '#c4c7ca', 400: '#a0a3a7', 500: '#6c6f75' },
      },
      fontFamily: {
        sans: ['Manrope', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      borderRadius: { '2xl': '22px', xl: '14px' },
      boxShadow: {
        'glow-purple': '0 0 25px rgba(128, 119, 255, 0.35)',
        ring: '0 0 0 3px rgba(128, 119, 255, 0.28)',
      },
      keyframes: {
        rise: { from: { opacity: '0', transform: 'translateY(14px)' }, to: { opacity: '1', transform: 'none' } },
        bokeh: {
          '0%': { transform: 'translate(0, 0) scale(1)', opacity: '0.85' },
          '50%': { opacity: '1' },
          '100%': { transform: 'translate(28px, 20px) scale(1.1)', opacity: '0.8' },
        },
      },
      animation: {
        fadeIn: 'rise 600ms cubic-bezier(0.22, 1, 0.36, 1) both',
      },
    },
  },
  plugins: [],
}
