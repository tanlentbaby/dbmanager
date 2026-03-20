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
        primary: {
          light: '#58a6ff',
          DEFAULT: '#0969da',
          dark: '#0550ae',
        },
        success: '#3fb950',
        error: '#f85149',
        warning: '#d29922',
      },
    },
  },
  plugins: [],
}
