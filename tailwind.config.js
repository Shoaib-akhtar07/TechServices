/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./app/**/*.{js,jsx}', './components/**/*.{js,jsx}', './lib/**/*.js'],
  theme: {
    extend: {
      colors: {
        brand: { 50: '#eef4ff', 100: '#dbe6ff', 500: '#4f6bff', 600: '#3b52f0', 700: '#2f40d1' },
      },
    },
  },
  plugins: [],
};
