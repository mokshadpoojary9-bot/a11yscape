/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    container: {
      center: true,
      padding: '1.5rem',
      screens: { '2xl': '1440px' },
    },
    extend: {
      colors: {
        midnight: {
          950: '#050810',
          900: '#070b16',
          850: '#0a0f1d',
          800: '#0d1424',
          700: '#131c31',
          600: '#1a2540',
        },
        surface: {
          DEFAULT: '#0a0f1d',
          raised: '#0d1424',
          overlay: '#111a2c',
        },
        line: {
          DEFAULT: 'rgba(148, 176, 214, 0.10)',
          strong: 'rgba(148, 176, 214, 0.18)',
        },
        ink: {
          DEFAULT: '#e8eefb',
          muted: '#9aa9c4',
          faint: '#697a97',
        },
        cyan: {
          DEFAULT: '#22d3ee',
          soft: '#67e8f9',
          dim: 'rgba(34, 211, 238, 0.12)',
        },
        violet: {
          DEFAULT: '#8b7cf6',
          soft: '#b3a8fb',
          dim: 'rgba(139, 124, 246, 0.12)',
        },
        severity: {
          critical: '#f0567a',
          serious: '#f59e6a',
          moderate: '#e7c15a',
          minor: '#5ec8b0',
        },
      },
      fontFamily: {
        sans: ['"Inter Variable"', 'Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem', letterSpacing: '0.06em' }],
      },
      borderRadius: {
        xl: '0.875rem',
        '2xl': '1.125rem',
      },
      boxShadow: {
        card: '0 1px 0 0 rgba(255,255,255,0.03) inset, 0 18px 40px -24px rgba(0,0,0,0.85)',
        lift: '0 1px 0 0 rgba(255,255,255,0.05) inset, 0 26px 60px -28px rgba(0,0,0,0.9)',
        focus: '0 0 0 1px rgba(34,211,238,0.55), 0 0 0 4px rgba(34,211,238,0.12)',
      },
      backgroundImage: {
        'grid-fade':
          'linear-gradient(to right, rgba(148,176,214,0.055) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,176,214,0.055) 1px, transparent 1px)',
        'aurora':
          'radial-gradient(1200px 600px at 12% -10%, rgba(34,211,238,0.10), transparent 60%), radial-gradient(900px 520px at 88% 0%, rgba(139,124,246,0.10), transparent 62%)',
      },
      transitionTimingFunction: {
        refined: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '0.35' },
          '50%': { opacity: '1' },
        },
        'sweep': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.5s cubic-bezier(0.22, 1, 0.36, 1) both',
        shimmer: 'shimmer 1.8s infinite',
        'pulse-soft': 'pulse-soft 2.4s ease-in-out infinite',
        sweep: 'sweep 14s linear infinite',
      },
    },
  },
  plugins: [],
}
