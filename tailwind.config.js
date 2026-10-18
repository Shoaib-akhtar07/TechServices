/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./app/**/*.{js,jsx}', './components/**/*.{js,jsx}', './lib/**/*.js'],
  theme: {
    extend: {
      fontFamily: {
        serif: ['var(--font-serif)', 'Georgia', 'serif'],
        display: ['var(--font-display)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        bronze: { 300: '#d9bf94', 400: '#b8955f', 500: '#9a7646', 600: '#7d5e37', 900: '#3d2a17' },
        brand: { 50: '#eef4ff', 100: '#dbe6ff', 500: '#4f6bff', 600: '#3b52f0', 700: '#2f40d1' },
      },
    },
  },
  plugins: [],
};
