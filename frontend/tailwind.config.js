/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Outfit', 'sans-serif'],
      },
      colors: {
        primary: '#00F0FF',
        secondary: '#0B0C10',
        success: '#00E676',
        warning: '#FFD54F',
        danger: '#FF1744',
        white: '#161921',
        slate: {
          50: '#090A0D',
          100: '#111318',
          200: '#1A1D24',
          300: '#252A34',
          400: '#64748B',
          500: '#94A3B8',
          600: '#CBD5E1',
          700: '#E2E8F0',
          800: '#F8FAFC',
          900: '#FFFFFF',
        }
      }
    },
  },
  plugins: [],
}
