import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { GetStaticPropsContext } from 'next';

export const defaultNamespace = 'common';

export async function getServerSideTranslations(
  locale: string,
  namespaces: string[] = [defaultNamespace]
) {
  return await serverSideTranslations(locale, namespaces);
}

export function getStaticTranslations(
  context: GetStaticPropsContext,
  namespaces: string[] = [defaultNamespace]
) {
  return getServerSideTranslations(context.locale || 'en', namespaces);
}

export const supportedLocales = ['en', 'ar'] as const;
export type SupportedLocale = typeof supportedLocales[number];

export function isValidLocale(locale: string): locale is SupportedLocale {
  return supportedLocales.includes(locale as SupportedLocale);
}

export function getDirection(locale: string): 'ltr' | 'rtl' {
  return locale === 'ar' ? 'rtl' : 'ltr';
}

export function getLanguageName(locale: string): string {
  const names = {
    en: 'English',
    ar: 'العربية',
  };
  return names[locale as SupportedLocale] || locale;
}








