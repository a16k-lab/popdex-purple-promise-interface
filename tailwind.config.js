/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#4d42fc',
          hover: '#645aff',
          soft: '#8077ff',
          tint: '#bdb9ff',
          deep: '#201c5c',
        },
        dark: {
          bg: '#0b0b0d',
          panel: '#141518',
          'panel-2': '#1b1c20',
          line: '#26272c',
          'line-2': '#34363c',
        },
        neon: {
          green: '#10b981',
          emerald: '#17a781',
          red: '#ef4444',
          rose: '#f03277',
          purple: '#8077ff',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Manrope', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      boxShadow: {
        'glow-purple': '0 0 25px rgba(128, 119, 255, 0.35)',
        'glow-green': '0 0 25px rgba(16, 185, 129, 0.35)',
        'glow-red': '0 0 25px rgba(239, 68, 68, 0.35)',
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
      },
      animation: {
        'pulse-glow': 'pulseGlow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'floatSlow 6s ease-in-out infinite',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.6', transform: 'scale(1.05)' },
        },
        floatSlow: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
    },
  },
  plugins: [],
}
