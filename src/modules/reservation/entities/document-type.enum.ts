export enum DocumentType {
  DNI = 'DNI',
  PASSPORT = 'PASSPORT',
  FOREIGNER_CARD = 'FOREIGNER_CARD',
}

export type DocumentTypeAccepetedValues = 'DNI' | 'PASSPORT' | 'FOREIGNER_CARD';

export const DocumentTypeValues: Record<
  DocumentTypeAccepetedValues,
  DocumentTypeAccepetedValues
> = {
  DNI: 'DNI',
  PASSPORT: 'PASSPORT',
  FOREIGNER_CARD: 'FOREIGNER_CARD',
};
