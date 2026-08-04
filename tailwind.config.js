/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'editor-bg': '#1e1e2e',
        'editor-surface': '#2a2a3e',
        'editor-border': '#3a3a5e',
        'editor-text': '#cdd6f4',
        'editor-muted': '#6c7086',
        'accent': '#89b4fa',
        'accent-alt': '#a6e3a1',
      }
    }
  },
  plugins: []
}
