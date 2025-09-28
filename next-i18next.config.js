module.exports = {
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'ar'],
    localeDetection: true,
  },
  fallbackLng: {
    default: ['en'],
  },
  debug: process.env.NODE_ENV === 'development',
  reloadOnPrerender: process.env.NODE_ENV === 'development',
  interpolation: {
    escapeValue: false,
  },
  react: {
    useSuspense: false,
  },
  // Custom path for translation files
  localePath: './public/locales',
  // Namespace configuration
  defaultNS: 'common',
  ns: ['common'],
  // Backend configuration for loading translations
  backend: {
    loadPath: '/locales/{{lng}}/{{ns}}.json',
  },
};