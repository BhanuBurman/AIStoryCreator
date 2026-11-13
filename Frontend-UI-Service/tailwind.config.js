/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        parchment: {
          50: '#faf7f2',
          100: '#f5efe4',
          200: '#ebdeca',
          300: '#dfcba9',
          400: '#d0b384',
          800: '#423423',
          900: '#231b12'
        },
        noir: {
          900: '#0d0f12',
          800: '#15191e',
          700: '#1f242c',
          600: '#2b323c'
        }
      },
      fontFamily: {
        serif: ['Georgia', 'Cambria', '"Times New Roman"', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['Fira Code', 'monospace']
      }
    },
  },
  plugins: [],
}
