import { Injectable } from '@nestjs/common';
import {
  PaginatedResponse,
  PaginationMetadata,
} from 'src/utils/paginated-response/PaginatedResponse.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  FilterOptions,
  SortOptions,
  FieldNumberOptions,
  FieldDateOptions,
} from 'src/prisma/src/interfaces/base.repository.interfaces';

@Injectable()
export class PaginationService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Crea una respuesta paginada genérica
   * @param data Lista de elementos
   * @param total Número total de elementos sin aplicar paginación
   * @param page Número de página actual
   * @param pageSize Tamaño de página
   * @returns Respuesta paginada con datos y metadatos
   */
  createPaginatedResponse<T>(
    data: T[],
    total: number,
    page: number,
    pageSize: number,
  ): PaginatedResponse<T> {
    const totalPages = Math.ceil(total / pageSize);

    const meta: PaginationMetadata = {
      total,
      page,
      pageSize,
      totalPages,
      hasNext: page < totalPages,
      hasPrevious: page > 1,
    };

    return {
      data,
      meta,
    };
  }

  /**
   * Ejecuta una consulta paginada genérica a la base de datos
   * @param model Nombre del modelo de Prisma
   * @param options Opciones de paginación y filtrado
   * @param transformer Función para transformar los resultados
   * @returns Respuesta paginada
   */
  async paginate<TModel, TResult = TModel>({
    model,
    page = 1,
    pageSize = 10,
    where = {},
    orderBy = { createdAt: 'desc' },
    select = undefined,
    include = undefined,
    transformer = (item: TModel) => item as unknown as TResult,
  }: {
    model: keyof typeof this.prisma;
    page?: number;
    pageSize?: number;
    where?: Record<string, any>;
    orderBy?: Record<string, string>;
    select?: Record<string, any>;
    include?: Record<string, any>;
    transformer?: (item: TModel) => TResult;
  }): Promise<PaginatedResponse<TResult>> {
    const skip = (page - 1) * pageSize;

    // Obtener el total de registros con los filtros aplicados
    const total = await this.prisma[model].count({ where });

    // Ejecutar la consulta con paginación
    const items = await this.prisma[model].findMany({
      where,
      orderBy,
      ...(select ? { select } : {}),
      ...(include ? { include } : {}),
      skip,
      take: pageSize,
    });

    // Transformar los resultados según sea necesario
    const data = items.map(transformer);

    // Crear la respuesta paginada
    return this.createPaginatedResponse<TResult>(data, total, page, pageSize);
  }

  /**
   * Ejecuta una consulta paginada avanzada con filtros robustos y búsqueda inteligente
   * @param model Nombre del modelo de Prisma
   * @param options Opciones de paginación y filtrado avanzado
   * @param transformer Función para transformar los resultados
   * @returns Respuesta paginada
   */
  async paginateAdvanced<TModel, TResult = TModel>({
    model,
    page = 1,
    pageSize = 10,
    where = {},
    orderBy = { createdAt: 'desc' },
    select = undefined,
    include = undefined,
    transformer = (item: TModel) => item as unknown as TResult,
    filterOptions,
    sortOptions,
    enumFields = [],
    dateFields = [],
  }: {
    model: keyof typeof this.prisma;
    page?: number;
    pageSize?: number;
    where?: Record<string, any>;
    orderBy?: Record<string, string>;
    select?: Record<string, any>;
    include?: Record<string, any>;
    transformer?: (item: TModel) => TResult;
    filterOptions?: FilterOptions<TModel>;
    sortOptions?: SortOptions<TModel>;
    enumFields?: string[];
    dateFields?: string[];
  }): Promise<PaginatedResponse<TResult>> {
    const skip = (page - 1) * pageSize;

    // Construir filtros avanzados
    const advancedWhere = this.buildWhereClause(
      filterOptions,
      enumFields,
      dateFields,
    );

    // Combinar filtros existentes con avanzados
    const combinedWhere = { ...where, ...advancedWhere };

    // Construir ordenamiento avanzado
    const advancedOrderBy = this.buildOrderByClause(sortOptions, orderBy);

    // Obtener el total de registros con los filtros aplicados
    const total = await this.prisma[model].count({ where: combinedWhere });

    // Ejecutar la consulta con paginación
    const items = await this.prisma[model].findMany({
      where: combinedWhere,
      orderBy: advancedOrderBy,
      ...(select ? { select } : {}),
      ...(include ? { include } : {}),
      skip,
      take: pageSize,
    });

    // Transformar los resultados según sea necesario
    const data = items.map(transformer);

    // Crear la respuesta paginada
    return this.createPaginatedResponse<TResult>(data, total, page, pageSize);
  }

  /**
   * Construye la cláusula WHERE avanzada con filtros robustos
   */
  private buildWhereClause<T>(
    filterOptions?: FilterOptions<T>,
    enumFields?: string[],
    dateFields?: string[],
  ): Record<string, any> {
    if (!filterOptions) {
      return {};
    }

    const whereClause: Record<string, any> = {};
    const {
      searchByField,
      searchByFieldsRelational,
      OR: controllerOR,
      fieldNumber,
      fieldNumbers,
      fieldDate,
      fieldDates,
      arrayByField,
      ...rest
    } = filterOptions;

    // Filtros OR para búsqueda (cambiar de AND a OR)
    if (searchByField) {
      const searchConditions = [];
      Object.entries(searchByField).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          const condition =
            typeof value === 'string' && !this.isEnumField(key, enumFields)
              ? this.buildFlexibleSearchCondition(value)
              : value;
          searchConditions.push({ [key]: condition });
        }
      });

      if (searchConditions.length > 0) {
        if (searchConditions.length === 1) {
          // Si solo hay una condición, no necesitamos OR
          Object.assign(whereClause, searchConditions[0]);
        } else {
          // Si hay múltiples condiciones, usar OR
          whereClause.OR = searchConditions;
        }
      }
    }

    if (searchByFieldsRelational) {
      // OPTIMIZADO: Crear condiciones OR para múltiples relaciones
      const orConditions: any[] = [];

      searchByFieldsRelational.forEach((relation) => {
        Object.entries(relation).forEach(([relationName, fields]) => {
          // Para búsquedas relacionales, crear condición OR inteligente
          const relationCondition = this.buildSearchConditionsForRelation(
            fields,
            enumFields,
            dateFields,
            relationName,
          );

          if (Object.keys(relationCondition).length > 0) {
            orConditions.push({
              [relationName]: relationCondition,
            });
          }
        });
      });

      // Si hay condiciones OR relacionales, combinarlas con filtros directos
      if (orConditions.length > 0) {
        if (Object.keys(whereClause).length > 0) {
          // Combinar filtros directos con relacionales usando OR
          whereClause.OR = [
            // Filtros directos como una condición
            { ...whereClause },
            // Condiciones relacionales
            ...orConditions,
          ];
          // Limpiar filtros directos del nivel principal
          Object.keys(whereClause).forEach((key) => {
            if (key !== 'OR') delete whereClause[key];
          });
        } else {
          // Solo condiciones relacionales
          whereClause.OR = orConditions;
        }
      }
    }

    // Soporte para números y fechas
    if (fieldNumber) this.applyFieldNumberCondition(whereClause, fieldNumber);
    if (fieldNumbers)
      fieldNumbers.forEach((fn) =>
        this.applyFieldNumberCondition(whereClause, fn),
      );
    if (fieldDate) this.applyFieldDateCondition(whereClause, fieldDate);
    if (fieldDates)
      fieldDates.forEach((fd) => this.applyFieldDateCondition(whereClause, fd));

    // Filtros OR flexibles
    if (controllerOR) {
      const orConditions: Record<string, any>[] = [];
      if (controllerOR.searchByField) {
        Object.entries(controllerOR.searchByField).forEach(([key, value]) => {
          const condition: Record<string, any> = {};
          condition[key] =
            typeof value === 'string'
              ? this.buildFlexibleSearchCondition(value)
              : value;
          orConditions.push(condition);
        });
      }
      if (controllerOR.searchByFieldsRelational) {
        controllerOR.searchByFieldsRelational.forEach((relation) => {
          Object.entries(relation).forEach(([relationName, fields]) => {
            const condition: Record<string, any> = {};
            condition[relationName] = this.buildRecursiveConditions(
              fields,
              enumFields,
              dateFields,
              relationName,
            );
            orConditions.push(condition);
          });
        });
      }
      if (orConditions.length > 0) whereClause['OR'] = orConditions;
    }

    // Arrays y resto
    if (arrayByField) {
      Object.entries(arrayByField).forEach(([key, values]) => {
        // Para campos booleanos, usar OR con equals
        if (
          key === 'isBlacklist' ||
          key === 'isActive' ||
          key === 'isPendingDeletePayment'
        ) {
          const booleanValues = Array.isArray(values) ? values : [values];
          if (booleanValues.length === 1) {
            whereClause[key] = booleanValues[0];
          } else {
            whereClause['OR'] = [
              ...(whereClause['OR'] || []),
              ...booleanValues.map((value) => ({ [key]: value })),
            ];
          }
        } else {
          // Para otros campos (enums, etc.), usar in
          whereClause[key] = { in: Array.isArray(values) ? values : [values] };
        }
      });
    }

    // Manejar rangos de fecha especiales (ej: dateRange)
    if (rest.dateRange && typeof rest.dateRange === 'string') {
      const [start, end] = rest.dateRange.split(' - ');
      if (start && end) {
        whereClause.OR = [
          // Reservations that start during the requested period
          {
            checkInDate: {
              gte: new Date(start),
              lt: new Date(end),
            },
          },
          // Reservations that end during the requested period
          {
            checkOutDate: {
              gt: new Date(start),
              lte: new Date(end),
            },
          },
          // Reservations that span the entire requested period
          {
            AND: [
              { checkInDate: { lte: new Date(start) } },
              { checkOutDate: { gte: new Date(end) } },
            ],
          },
        ];
      }
      delete rest.dateRange; // Remove the special field
    }

    Object.entries(rest).forEach(([key, value]) => {
      if (value !== undefined) whereClause[key] = value;
    });

    // Si hay un OR del controlador, usarlo como condición principal
    if (controllerOR && Array.isArray(controllerOR)) {
      if (Object.keys(whereClause).length > 0) {
        // Combinar con filtros existentes usando AND
        return {
          AND: [whereClause, { OR: controllerOR }],
        };
      } else {
        // Solo usar el OR del controlador
        return { OR: controllerOR };
      }
    }

    return whereClause;
  }

  /**
   * Construye la cláusula ORDER BY avanzada
   */
  private buildOrderByClause<T>(
    sortOptions?: SortOptions<T>,
    defaultOrderBy?: Record<string, string>,
  ): Record<string, any> {
    if (sortOptions?.field) {
      return {
        [sortOptions.field as string]: sortOptions.order ?? 'asc',
      };
    }
    return defaultOrderBy ?? { createdAt: 'desc' };
  }

  /**
   * Verifica si un campo es enum
   */
  private isEnumField(field: string, enumFields?: string[]): boolean {
    return enumFields?.some((enumField) => field.includes(enumField)) ?? false;
  }

  /**
   * Verifica si un campo es fecha
   */
  private isDateField(field: string, dateFields?: string[]): boolean {
    return dateFields?.some((dateField) => field.includes(dateField)) ?? false;
  }

  /**
   * Aplica condición de campo numérico
   */
  private applyFieldNumberCondition(
    where: Record<string, any>,
    fieldNumber: FieldNumberOptions<any>,
  ): void {
    where[String(fieldNumber.field)] = {
      [fieldNumber.operator]: fieldNumber.value,
    };
  }

  /**
   * Aplica condición de campo fecha
   */
  private applyFieldDateCondition(
    where: Record<string, any>,
    fieldDate: FieldDateOptions<any>,
  ): void {
    const value = fieldDate.value.includes(' - ')
      ? {
          gte: new Date(fieldDate.value.split(' - ')[0]),
          lte: new Date(fieldDate.value.split(' - ')[1]),
        }
      : new Date(fieldDate.value);
    where[String(fieldDate.field)] =
      fieldDate.operator === 'range'
        ? value
        : { [fieldDate.operator || 'equals']: value };
  }

  /**
   * Construye condiciones recursivas para campos anidados
   */
  private buildRecursiveConditions(
    fields: any,
    enumFields?: string[],
    dateFields?: string[],
    relationPrefix?: string,
  ): any {
    const conditions: Record<string, any> = {};

    if (typeof fields === 'object' && fields !== null) {
      Object.entries(fields).forEach(([fieldName, fieldValue]) => {
        const fieldPath = relationPrefix
          ? `${relationPrefix}.${fieldName}`
          : fieldName;

        if (typeof fieldValue === 'string') {
          conditions[fieldName] =
            this.isEnumField(fieldPath, enumFields) ||
            this.isDateField(fieldPath, dateFields)
              ? fieldValue
              : this.buildFlexibleSearchCondition(fieldValue);
        } else if (typeof fieldValue === 'object' && fieldValue !== null) {
          conditions[fieldName] = this.buildRecursiveConditions(
            fieldValue,
            enumFields,
            dateFields,
            fieldPath,
          );
        } else {
          conditions[fieldName] = fieldValue;
        }
      });
    } else if (typeof fields === 'string') {
      const fieldPath = relationPrefix || '';
      return this.isEnumField(fieldPath, enumFields) ||
        this.isDateField(fieldPath, dateFields)
        ? fields
        : this.buildFlexibleSearchCondition(fields);
    }

    return conditions;
  }

  /**
   * Construye condiciones de búsqueda para relaciones
   */
  private buildSearchConditionsForRelation(
    fields: any,
    enumFields?: string[],
    dateFields?: string[],
    relationName?: string,
  ): any {
    // Crear condición OR para buscar en múltiples campos de una relación
    const orConditions: any[] = [];

    if (typeof fields === 'object' && fields !== null) {
      Object.entries(fields).forEach(([fieldName, fieldValue]) => {
        if (typeof fieldValue === 'string') {
          // Crear condición para este campo específico
          const fieldPath = relationName
            ? `${relationName}.${fieldName}`
            : fieldName;

          // Solo agregar condición si no es un campo especial (como number que ya se maneja diferente)
          if (fieldName !== 'number') {
            orConditions.push({
              [fieldName]: this.buildFlexibleSearchCondition(
                fieldValue,
                fieldPath,
                enumFields,
                dateFields,
              ),
            });
          }
        } else if (typeof fieldValue === 'object' && fieldValue !== null) {
          // Para campos anidados (como RoomTypes)
          orConditions.push({
            [fieldName]: this.buildRecursiveConditions(
              fieldValue,
              enumFields,
              dateFields,
              fieldName,
            ),
          });
        } else if (typeof fieldValue === 'number') {
          // Para campos numéricos (como room.number)
          orConditions.push({
            [fieldName]: fieldValue,
          });
        }
      });
    }

    return orConditions.length > 0 ? { OR: orConditions } : {};
  }

  /**
   * Construye condición de búsqueda flexible e inteligente
   */
  private buildFlexibleSearchCondition(
    searchValue: string,
    fieldPath?: string,
    enumFields?: string[],
    dateFields?: string[],
  ): any {
    // Verificar si es un campo enum o fecha
    if (fieldPath) {
      if (
        this.isEnumField(fieldPath, enumFields) ||
        this.isDateField(fieldPath, dateFields)
      ) {
        return searchValue;
      }
    }

    // Lógica inteligente de búsqueda basada en la longitud del término
    const wordCount = searchValue.trim().split(/\s+/).length;

    // Para términos largos (3+ palabras): ser estricto, buscar frase completa
    if (wordCount >= 3) {
      return {
        contains: searchValue,
        mode: 'insensitive' as const,
      };
    }

    // Para términos medianos (2 palabras): buscar frase completa
    if (wordCount === 2) {
      return {
        contains: searchValue,
        mode: 'insensitive' as const,
      };
    }

    // Para términos cortos (1 palabra): ser más flexible
    return {
      contains: searchValue,
      mode: 'insensitive' as const,
    };
  }
}
