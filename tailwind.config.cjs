/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
    // If you keep files outside src, list them explicitly:
    './economics_portfolio.tsx',
    // './components/**/*.{js,ts,jsx,tsx}', // uncomment if you move files here
  ],
  darkMode: 'class',
  theme: {
    extend: {
      transitionDuration: {
        '250': '250ms',
        '350': '350ms',
      },
      transitionTimingFunction: {
        smooth: 'cubic-bezier(0.4, 0, 0.2, 1)', // use with `ease-smooth`
      },
    },
  },

  // Only add safelist if you generate classes dynamically from data.
  // Keep this tight to avoid CSS bloat.
  safelist: [
    // Status pills you actually use:
    'bg-amber-100','text-amber-700','dark:bg-amber-900/30','dark:text-amber-300',
    'bg-blue-100','text-blue-700','dark:bg-blue-900/30','dark:text-blue-300',
    // If you ever map more palettes, add them here.
  ],

  plugins: [
    // Optional, but recommended for nicer text and form controls:
    // require('@tailwindcss/typography'),
    // require('@tailwindcss/forms'),
  ],
}
