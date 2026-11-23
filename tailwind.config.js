/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      // الألوان متغيّرات: الوضع الليلي بيبدّلها كلها مرة واحدة من غير ما نلمس كل صفحة
      colors: {
        espresso: 'rgb(var(--c-espresso) / <alpha-value>)',
        gold: 'rgb(var(--c-gold) / <alpha-value>)',
        bark: 'rgb(var(--c-bark) / <alpha-value>)',
        cream: 'rgb(var(--c-cream) / <alpha-value>)',
        sand: 'rgb(var(--c-sand) / <alpha-value>)',
        'gold-soft': 'rgb(var(--c-gold-soft) / <alpha-value>)',
        ink: 'rgb(var(--c-ink) / <alpha-value>)',
        white: 'rgb(var(--c-white) / <alpha-value>)',
        success: 'rgb(var(--c-success) / <alpha-value>)',
        warning: 'rgb(var(--c-warning) / <alpha-value>)',
        danger: 'rgb(var(--c-danger) / <alpha-value>)',
        info: 'rgb(var(--c-info) / <alpha-value>)',
        night: '#1A0F0A',
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
        default: 'rgb(var(--c-bark) / .14)',
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
