/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        espresso: '#341A0E',
        gold: '#CC9542',
        bark: '#5E3813',
        cream: '#FAF6F0',
        sand: '#EFE4D4',
        'gold-soft': '#E3B871',
        ink: '#5C463A',
        success: '#1F7A4D',
        warning: '#B7791F',
        danger: '#B42318',
        info: '#2563A8',
      },
      fontFamily: {
        arabic: ['"IBM Plex Sans Arabic"', 'Tajawal', 'Cairo', 'system-ui', 'sans-serif'],
        latin: ['Sora', 'Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        card: '14px',
        btn: '12px',
        pill: '999px',
      },
      boxShadow: {
        warm: '0 2px 8px rgba(52,26,14,.06)',
        'warm-raised': '0 8px 24px rgba(52,26,14,.12)',
      },
      borderColor: {
        default: 'rgba(94,56,19,.14)',
      },
      transitionTimingFunction: {
        brand: 'cubic-bezier(.2,.7,.3,1)',
      },
      transitionDuration: {
        brand: '200ms',
      },
    },
  },
  plugins: [],
};
