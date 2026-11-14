/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        cib: {
          navy: '#070D1E',
          card: '#0C152B',
          border: '#1E2E54',
          gold: '#F59E0B',
          goldBright: '#FBBF24',
          cyan: '#06B6D4',
          blue: '#3B82F6',
        }
      },
      fontFamily: {
        prompt: ['Prompt', 'sans-serif'],
        chakra: ['"Chakra Petch"', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
