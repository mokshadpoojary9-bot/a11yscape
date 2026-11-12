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
        electric: {
          DEFAULT: '#3f6dff',
          soft: '#7c9bff',
          dim: 'rgba(63, 109, 255, 0.14)',
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
        display: ['"Space Grotesk Variable"', 'Space Grotesk', '"Inter Variable"', 'system-ui', 'sans-serif'],
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
        card: '0 1px 0 0 rgba(255,255,255,0.04) inset, 0 18px 50px -24px rgba(0,0,0,0.9)',
        lift: '0 1px 0 0 rgba(255,255,255,0.06) inset, 0 30px 70px -30px rgba(0,0,0,0.95)',
        focus: '0 0 0 1px rgba(34,211,238,0.55), 0 0 0 4px rgba(34,211,238,0.12)',
        'glow-cyan': '0 0 40px -12px rgba(34,211,238,0.55)',
        'glow-violet': '0 0 46px -14px rgba(139,124,246,0.6)',
        'glow-electric': '0 0 50px -16px rgba(63,109,255,0.65)',
      },
      backgroundImage: {
        'grid-fade':
          'linear-gradient(to right, rgba(148,176,214,0.055) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,176,214,0.055) 1px, transparent 1px)',
        'aurora':
          'radial-gradient(1200px 600px at 12% -10%, rgba(34,211,238,0.10), transparent 60%), radial-gradient(900px 520px at 88% 0%, rgba(139,124,246,0.10), transparent 62%)',
        'aurora-rich':
          'radial-gradient(900px 520px at 15% -5%, rgba(63,109,255,0.18), transparent 62%), radial-gradient(760px 460px at 85% 0%, rgba(139,124,246,0.16), transparent 64%), radial-gradient(680px 420px at 55% 110%, rgba(34,211,238,0.10), transparent 65%)',
        'hero-sheen':
          'linear-gradient(115deg, rgba(255,255,255,0.07), transparent 35%, transparent 70%, rgba(34,211,238,0.05))',
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
        'page-in': {
          from: { opacity: '0', transform: 'translateY(10px) scale(0.996)' },
          to: { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'float-slow': {
          '0%, 100%': { transform: 'translate3d(0, 0, 0)' },
          '50%': { transform: 'translate3d(0, -10px, 0)' },
        },
        'drift': {
          '0%, 100%': { transform: 'translate3d(0, 0, 0) scale(1)' },
          '50%': { transform: 'translate3d(24px, 18px, 0) scale(1.06)' },
        },
        'pulse-ring': {
          '0%': { opacity: '0.6', transform: 'scale(0.96)' },
          '70%, 100%': { opacity: '0', transform: 'scale(1.12)' },
        },
        'scan-line': {
          '0%': { transform: 'translateY(-120%)', opacity: '0' },
          '18%': { opacity: '0.55' },
          '80%': { opacity: '0.1' },
          '100%': { transform: 'translateY(520%)', opacity: '0' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.5s cubic-bezier(0.22, 1, 0.36, 1) both',
        shimmer: 'shimmer 1.8s infinite',
        'pulse-soft': 'pulse-soft 2.4s ease-in-out infinite',
        sweep: 'sweep 14s linear infinite',
        'page-in': 'page-in 0.45s cubic-bezier(0.22, 1, 0.36, 1) both',
        'float-slow': 'float-slow 9s ease-in-out infinite',
        drift: 'drift 24s ease-in-out infinite',
        'pulse-ring': 'pulse-ring 3.6s cubic-bezier(0.22, 1, 0.36, 1) infinite',
        'scan-slow': 'sweep 26s linear infinite',
      },
    },
  },
  plugins: [],
}
