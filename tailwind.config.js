/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // RTL support
      direction: {
        'rtl': 'rtl',
        'ltr': 'ltr',
      },
      // Logical properties for RTL
      spacing: {
        'logical-1': '0.25rem',
        'logical-2': '0.5rem',
        'logical-3': '0.75rem',
        'logical-4': '1rem',
        'logical-5': '1.25rem',
        'logical-6': '1.5rem',
        'logical-8': '2rem',
        'logical-10': '2.5rem',
        'logical-12': '3rem',
        'logical-16': '4rem',
        'logical-20': '5rem',
        'logical-24': '6rem',
        'logical-32': '8rem',
      },
      // Custom utilities for RTL
      inset: {
        'logical-start': 'inset-inline-start',
        'logical-end': 'inset-inline-end',
      },
      margin: {
        'logical-start': 'margin-inline-start',
        'logical-end': 'margin-inline-end',
      },
      padding: {
        'logical-start': 'padding-inline-start',
        'logical-end': 'padding-inline-end',
      },
      textAlign: {
        'logical-start': 'text-start',
        'logical-end': 'text-end',
      },
    },
  },
  plugins: [
    // RTL plugin
    function({ addUtilities }) {
      const newUtilities = {
        '.rtl': {
          direction: 'rtl',
        },
        '.ltr': {
          direction: 'ltr',
        },
        '.text-start': {
          'text-align': 'start',
        },
        '.text-end': {
          'text-align': 'end',
        },
        '.ms-0': {
          'margin-inline-start': '0',
        },
        '.me-0': {
          'margin-inline-end': '0',
        },
        '.ps-0': {
          'padding-inline-start': '0',
        },
        '.pe-0': {
          'padding-inline-end': '0',
        },
      };
      addUtilities(newUtilities);
    },
  ],
};








