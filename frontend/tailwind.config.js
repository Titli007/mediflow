/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#2563eb',
          dark: '#004ac6',
        },
        secondary: '#06b6d4',
        background: '#f8f9ff',
        'on-background': '#0b1c30',
      }
    },
  },
  plugins: [],
}
