import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: {
          canvas: 'rgb(var(--surface-canvas) / <alpha-value>)',
          panel: 'rgb(var(--surface-panel) / <alpha-value>)',
          elevated: 'rgb(var(--surface-elevated) / <alpha-value>)',
          felt: 'rgb(var(--surface-felt) / <alpha-value>)',
          wood: 'rgb(var(--surface-wood) / <alpha-value>)',
        },
        content: {
          primary: 'rgb(var(--content-primary) / <alpha-value>)',
          secondary: 'rgb(var(--content-secondary) / <alpha-value>)',
          muted: 'rgb(var(--content-muted) / <alpha-value>)',
          inverse: 'rgb(var(--content-inverse) / <alpha-value>)',
        },
        border: {
          subtle: 'rgb(var(--border-subtle) / <alpha-value>)',
          gold: 'rgb(var(--border-gold) / <alpha-value>)',
        },
        accent: {
          gold: 'rgb(var(--accent-gold) / <alpha-value>)',
          via: 'rgb(var(--accent-via) / <alpha-value>)',
          jade: 'rgb(var(--accent-jade) / <alpha-value>)',
          amber: 'rgb(var(--accent-amber) / <alpha-value>)',
        },
        status: {
          success: 'rgb(var(--status-success) / <alpha-value>)',
          warning: 'rgb(var(--status-warning) / <alpha-value>)',
          danger: 'rgb(var(--status-danger) / <alpha-value>)',
        },
      },
      fontFamily: {
        sans: ['"Chakra Petch"', 'system-ui', 'sans-serif'],
        display: ['"Chakra Petch"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Chakra Petch"', 'monospace'],
      },
      boxShadow: {
        warm: '0 12px 32px -8px rgba(18, 12, 8, 0.55)',
        goldGlow: '0 0 20px rgba(235, 185, 82, 0.35)',
        viaGlow: '0 0 18px rgba(56, 189, 248, 0.45)',
      },
      keyframes: {
        heartbeat: {
          '0%, 100%': { transform: 'scale(1)' },
          '25%': { transform: 'scale(1.06)' },
          '50%': { transform: 'scale(1)' },
          '75%': { transform: 'scale(1.04)' },
        },
        phoneShake: {
          '0%, 100%': { transform: 'translateX(0) rotate(0deg)' },
          '20%': { transform: 'translateX(-3px) rotate(-2deg)' },
          '40%': { transform: 'translateX(3px) rotate(2deg)' },
          '60%': { transform: 'translateX(-2px) rotate(-1deg)' },
          '80%': { transform: 'translateX(2px) rotate(1deg)' },
        },
      },
      animation: {
        heartbeat: 'heartbeat 1s ease-in-out infinite',
        phoneShake: 'phoneShake 0.45s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
