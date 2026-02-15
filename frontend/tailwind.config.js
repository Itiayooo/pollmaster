/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        pm: {
          dark: '#0a0a0f',
          darker: '#06060a',
          card: '#12121a',
          border: '#1e1e2e',
          red: '#e94560',
          'red-dark': '#c73652',
          'red-glow': 'rgba(233,69,96,0.15)',
          blue: '#4a90d9',
          purple: '#7c4dff',
          text: '#e8e8f0',
          muted: '#8888aa',
          surface: '#16162a',
        },
      },
      fontFamily: {
        display: ['"Bebas Neue"', 'sans-serif'],
        body: ['"DM Sans"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      backgroundImage: {
        'grid-pattern': `linear-gradient(rgba(233,69,96,0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(233,69,96,0.03) 1px, transparent 1px)`,
      },
      backgroundSize: {
        'grid': '48px 48px',
      },
      animation: {
        'pulse-red': 'pulseRed 2s ease-in-out infinite',
        'slide-up': 'slideUp 0.4s ease-out',
        'fade-in': 'fadeIn 0.3s ease-out',
      },
      keyframes: {
        pulseRed: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(233,69,96,0)' },
          '50%': { boxShadow: '0 0 0 8px rgba(233,69,96,0.1)' },
        },
        slideUp: {
          '0%': { opacity: 0, transform: 'translateY(16px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: 0 },
          '100%': { opacity: 1 },
        },
      },
    },
  },
  plugins: [],
};
