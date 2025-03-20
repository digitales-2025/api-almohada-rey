/**
 * Parámetros de consulta para operaciones de búsqueda en repositorios
 * @interface QueryParams
 */
export type QueryParams = {
  /** Condiciones de filtrado */
  where?: Record<string, any>;
  /** Relaciones a incluir */
  include?: Record<string, boolean | Record<string, any>>;
  /** Campos a seleccionar */
  select?: Record<string, boolean | Record<string, any>>;
  /** Ordenamiento de resultados */
  orderBy?: Record<string, 'asc' | 'desc'>;
  /** Número de registros a retornar */
  take?: number;
  /** Número de registros a saltar */
  skip?: number;
};

/**
 * Tipo de datos para crear una entidad
 * Excluye campos generados automáticamente
 */
export type CreateDto<T> = Omit<T, 'id' | 'createdAt' | 'updatedAt'>;

/**
 * Tipo de datos para actualizar una entidad
 * Hace todos los campos opcionales
 */
export type UpdateDto<T> = Partial<CreateDto<T>>;
