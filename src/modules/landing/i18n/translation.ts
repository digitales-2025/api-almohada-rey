import { Injectable, Logger } from '@nestjs/common';
import {
  defaultLocale,
  Dictionary,
  SupportedLocales,
  supportedLocales,
  supportedLocalesMap,
} from './translations';

@Injectable()
export class Translation {
  static readonly supportedLocales = supportedLocales;
  static readonly defaultLocale: SupportedLocales = 'es';
  static readonly supportedLocalesMap = supportedLocalesMap;
  //   private readonly dictionary: Dictionary;
  private readonly logger = new Logger(Translation.name); // Reemplaza 'any' con el tipo de logger que estés usando

  constructor() {}
  // Inicializa el logger aquí si es necesario

  static getSupportedLocales() {
    return this.supportedLocales;
  }

  static getDefaultLocale() {
    return this.defaultLocale;
  }

  static getSupportedLocalesMap() {
    return this.supportedLocalesMap;
  }

  // Método auxiliar para obtener mensajes de error de forma segura
  getTranslations(
    key: string,
    locale: SupportedLocales = 'es',
    dictionary: Dictionary,
  ): string {
    try {
      return (
        dictionary[key]?.[locale] ||
        dictionary[key]?.[supportedLocalesMap[defaultLocale]] ||
        `Error: ${key}`
      );
    } catch (error) {
      this.logger.error(
        `Error getting message for key ${key} and locale ${locale}`,
        error,
      );
      return `Error: ${key}`;
    }
  }
}
