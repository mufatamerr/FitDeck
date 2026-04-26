/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        editorial: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        body: ['"DM Sans"', 'system-ui', 'sans-serif'],
      },
      colors: {
        card: {
          DEFAULT: '#0a0a0c',
          foreground: '#f5f5f4',
        },
        muted: {
          DEFAULT: '#17171b',
          foreground: '#a1a1aa',
        },
        fit: {
          bg: '#0a0a0c',
          accent: '#7c3aed',
        },
      },
    },
  },
  plugins: [],
}
