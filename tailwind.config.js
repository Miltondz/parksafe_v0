/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        park: {
          primary: '#2D5A27',    // Forest green
          secondary: '#8B4513',  // Saddle brown
          accent: '#FFD700',     // Golden yellow
          light: '#90EE90',      // Light green
          dark: '#1B4332',       // Dark forest green
          earth: '#8B4513',      // Earth brown
          water: '#4682B4',      // Steel blue
          danger: '#FF4136'      // Red for emergency
        }
      }
    },
  },
  plugins: [],
};