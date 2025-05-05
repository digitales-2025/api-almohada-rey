export type SupportedLocales = 'es' | 'en';

export type Translations = {
  [key in SupportedLocales]: string;
};

export type Dictionary = {
  [key: string]: Translations;
};

export type GenericDictionary<T> = {
  [P in keyof T]: {
    [key in SupportedLocales]: string;
  };
};

export type I18nResponse<T> = {
  [P in keyof T]: T[P] extends Array<infer U>
    ? Array<GenericDictionary<U>>
    : GenericDictionary<T[P]>;
};

export type I18nArrayResponse<T> = Array<I18nResponse<T>>;

export const defaultLocale: SupportedLocales = 'es';
export const supportedLocales: SupportedLocales[] = ['es', 'en'];
export const supportedLocalesMap: Record<SupportedLocales, string> = {
  es: 'es',
  en: 'en',
};
