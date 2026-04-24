/** @type {import('tailwindcss').Config} */
const config = {
  // Safelist badge colors to prevent purging
  safelist: [
    // Green for solved during contest
    'bg-green-500',
    'bg-emerald-500',
    'border-green-600',
    'border-emerald-600',
    'shadow-green-500/30',
    'shadow-emerald-500/30',
    // Orange for upsolve
    'bg-orange-500',
    'border-orange-600',
    'shadow-orange-500/30',
    // Yellow (legacy)
    'bg-yellow-400',
    'border-yellow-500',
    'shadow-yellow-400/30',
    // Red for failed attempts
    'bg-red-500',
    'border-red-600',
    'shadow-red-500/30',
    // Gray/transparent for not attempted
    'bg-transparent',
    'border-gray-600',
    'border-dashed',
    // Text colors
    'text-white',
    'text-gray-900',
    'text-gray-500',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#EBF4F6',
          100: '#D6E9EC',
          200: '#B0D3D9',
          300: '#8ABDC6',
          400: '#64A7B3',
          500: '#088395', // MAIN PRIMARY
          600: '#077485',
          700: '#066575',
          800: '#055665',
          900: '#09637E', // DEEP PRIMARY
        },
        secondary: {
          50: '#F3FAFA',
          100: '#E7F4F4',
          200: '#CFE9E9',
          300: '#B7DEDE',
          400: '#9FD3D3',
          500: '#7AB2B2', // SOFT TEAL
          600: '#5E9C9C',
          700: '#468585',
          800: '#2F6E6E',
          900: '#1A5757',
        },
        background: {
          light: '#EBF4F6',
          dark: '#0F172A',
        },
        // Design system colors
        'neon-lime': '#B6F36B',
        'neon-violet': '#7C5CFF',
        'neon-cyan': '#5EEAD4',
        'neon-emerald': '#10B981',
        'deep-void': '#020307',
        surface: '#0C0E16',
        'surface-2': '#12151F',
        'on-bg': '#EEF1FA',
        'on-surface': '#C8CDDE',
        outline: '#2A2E3F',
        'outline-2': '#1A1D28',
        'site-bg': '#05060B',
      },

      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        heading: ['Space Grotesk', 'sans-serif'],
        headline: ['Space Grotesk', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },

      boxShadow: {
        glow: '0 0 20px rgba(8, 131, 149, 0.35)',
        'glow-lg': '0 0 40px rgba(8, 131, 149, 0.25)',
        soft: '0 10px 25px rgba(0,0,0,0.08)',
        glass: '0 8px 32px rgba(0,0,0,0.12)',
      },

      borderRadius: {
        xl: '1rem',
        '2xl': '1.5rem',
      },

      backgroundSize: {
        'size-200': '200% 100%',
      },

      backgroundPosition: {
        'pos-0': '0% 0%',
        'pos-100': '100% 0%',
      },

      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'zoom-in': {
          '0%': { transform: 'scale(0.8)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(24px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'slide-down': {
          '0%': { transform: 'translateY(-24px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'slide-left': {
          '0%': { transform: 'translateX(24px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        'slide-right': {
          '0%': { transform: 'translateX(-24px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        'scale-in': {
          '0%': { transform: 'scale(0.9)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        'glow-pulse': {
          '0%, 100%': { opacity: '0.4', transform: 'scale(1)' },
          '50%': { opacity: '0.8', transform: 'scale(1.05)' },
        },
      },

      animation: {
        'fade-in': 'fade-in 0.5s ease-out both',
        'zoom-in': 'zoom-in 0.5s ease-out both',
        'slide-up': 'slide-up 0.6s ease-out both',
        'slide-down': 'slide-down 0.6s ease-out both',
        'slide-left': 'slide-left 0.6s ease-out both',
        'slide-right': 'slide-right 0.6s ease-out both',
        'scale-in': 'scale-in 0.5s ease-out both',
        float: 'float 3s ease-in-out infinite',
        'glow-pulse': 'glow-pulse 4s ease-in-out infinite',
      },
    },
  },
};

export default config;
