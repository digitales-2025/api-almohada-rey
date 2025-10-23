export interface FieldNumberOptions<T> {
  field: keyof T;
  value: number;
  operator: 'gt' | 'gte' | 'lt' | 'lte' | 'equals';
}

export interface FieldDateOptions<T> {
  field: keyof T;
  value: string; // Ej: "2023-01-01" o "2023-01-01 - 2023-12-31" para rangos
  operator?: 'range' | 'gt' | 'gte' | 'lt' | 'lte' | 'equals';
}

export interface BaseFilterArrayOptions {
  [key: string]: any[]; // Ej: { status: ['active', 'inactive'] }
}

export interface SortOptions<T> {
  field: keyof T;
  order?: 'asc' | 'desc';
}

export interface FilterOptions<T> {
  searchByField?: Record<string, any>; // Búsqueda AND básica
  searchByFieldsRelational?: Array<Record<string, any>>; // Búsqueda en relaciones
  OR?: {
    searchByField?: Record<string, any>;
    searchByFieldsRelational?: Array<Record<string, any>>;
  }; // Búsqueda OR flexible
  fieldNumber?: FieldNumberOptions<T>;
  fieldNumbers?: FieldNumberOptions<T>[];
  fieldDate?: FieldDateOptions<T>;
  fieldDates?: FieldDateOptions<T>[];
  arrayByField?: BaseFilterArrayOptions;
  [key: string]: any; // Otros filtros personalizados
}
