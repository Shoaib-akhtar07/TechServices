/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./app/**/*.{js,jsx}', './components/**/*.{js,jsx}', './lib/**/*.js'],
  theme: {
    extend: {
      // Layered, warm-tinted shadows: a tight contact shadow + a soft ambient one + a long diffuse one.
      boxShadow: {
        card: '0 1px 2px rgba(61,42,23,0.04), 0 4px 12px -2px rgba(61,42,23,0.06), 0 18px 36px -14px rgba(61,42,23,0.14)',
        'card-hover': '0 2px 4px rgba(61,42,23,0.05), 0 14px 28px -8px rgba(61,42,23,0.14), 0 36px 60px -22px rgba(61,42,23,0.28)',
        'card-dark': '0 1px 2px rgba(0,0,0,0.35), 0 18px 36px -14px rgba(0,0,0,0.6)',
        btn: 'inset 0 1px 0 rgba(255,255,255,0.14), 0 1px 2px rgba(20,26,36,0.25), 0 8px 16px -6px rgba(20,26,36,0.35), 0 20px 34px -14px rgba(92,65,40,0.5)',
        'btn-hover': 'inset 0 1px 0 rgba(255,255,255,0.18), 0 2px 4px rgba(20,26,36,0.25), 0 14px 24px -8px rgba(20,26,36,0.4), 0 30px 44px -16px rgba(92,65,40,0.6)',
        'btn-gold': 'inset 0 1px 0 rgba(255,255,255,0.35), 0 1px 2px rgba(194,65,12,0.2), 0 8px 16px -6px rgba(234,88,12,0.35), 0 18px 30px -14px rgba(234,88,12,0.45)',
        'btn-gold-hover': 'inset 0 1px 0 rgba(255,255,255,0.4), 0 2px 4px rgba(194,65,12,0.2), 0 14px 24px -8px rgba(234,88,12,0.45), 0 28px 40px -16px rgba(234,88,12,0.55)',
        'btn-light': 'inset 0 1px 0 #ffffff, 0 1px 2px rgba(61,42,23,0.06), 0 6px 14px -6px rgba(61,42,23,0.16)',
        'btn-light-hover': 'inset 0 1px 0 #ffffff, 0 2px 4px rgba(61,42,23,0.08), 0 12px 22px -8px rgba(61,42,23,0.24)',
      },
      fontFamily: {
        serif: ['var(--font-serif)', 'Georgia', 'serif'],
        display: ['var(--font-display)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        bronze: { 300: '#d9bf94', 400: '#b8955f', 500: '#9a7646', 600: '#7d5e37', 900: '#3d2a17' },
        // Warm bronze accent (matches the header and hero). `ink` is the near-black used for dark buttons.
        brand: { 50: '#faf4ea', 100: '#f1e5d0', 200: '#e5d0ad', 300: '#d9bf94', 400: '#b8955f', 500: '#a07a48', 600: '#8a6739', 700: '#6f522c', 800: '#56401f', 900: '#3d2a17' },
        ink: '#141a24',
        cream: { 50: '#fdfbf7', 100: '#faf7f1', 200: '#f6efe3', 300: '#ebe3d5' },
      },
    },
  },
  plugins: [],
};
