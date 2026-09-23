const plugin = require('tailwindcss/plugin');
const { spaces, radii, colourUtilities, variables, typeStyles } = require('./app/ui/theme.cjs');

/** @type {import('tailwindcss').Config} */
module.exports = {
  safelist: Object.keys(typeStyles).map(selector => selector.slice(1)),
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      spacing: Object.fromEntries(Object.keys(spaces).map(name => [`ui-${name}`, `var(--settlex-ui-space-${name.replace('.', '-')})`])),
      borderRadius: Object.fromEntries(Object.keys(radii).map(name => [name, `var(--settlex-ui-radius-${name})`])),
      colors: colourUtilities,
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic':
          'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
    },
  },
  plugins: [
    plugin(({ addBase, addUtilities }) => {
      addBase({ ':root': variables });
      addUtilities(typeStyles);
    }),
    require('tailwind-clip-path'),
  ],
}
