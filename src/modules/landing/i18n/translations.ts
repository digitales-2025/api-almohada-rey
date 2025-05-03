export type SupportedLocales = 'es' | 'en';

export type Translations = {
  [key in SupportedLocales]: string;
};

export type Dictionary = {
  [key: string]: Translations;
};

export const defaultLocale: SupportedLocales = 'es';
export const supportedLocales: SupportedLocales[] = ['es', 'en'];
export const supportedLocalesMap: Record<SupportedLocales, string> = {
  es: 'es',
  en: 'en',
};
