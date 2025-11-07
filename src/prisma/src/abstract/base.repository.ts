import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { PrismaTransaction, QueryParams, CreateDto, UpdateDto } from '../types';
import { BaseEntity } from './base.entity';
import { PaginationParams } from 'src/utils/paginated-response/pagination.types';
import { PaginatedResponse } from 'src/utils/paginated-response/PaginatedResponse.dto';
import {
  FilterOptions,
  SortOptions,
  FieldNumberOptions,
  FieldDateOptions,
} from '../interfaces/base.repository.interfaces';

// export type filterByFieldOptions<T> = {
//   field: keyof T;
//   value: string;
// }[];

/**
 * Clase base abstracta que implementa operaciones CRUD genéricas.
 * Proporciona una capa de abstracción sobre Prisma.
 *
 * @abstract
 * @class
 * @template T - Tipo de entidad que maneja el repositorio
 */
@Injectable()
export abstract class BaseRepository<T extends BaseEntity> {
  constructor(
    protected readonly prisma: PrismaService,
    protected readonly modelName: keyof PrismaService,
  ) {}

  /**
   * Método interno para obtener el cliente correcto (transacción o prisma)
   * @param tx - Contexto de transacción opcional
   * @returns Cliente Prisma o contexto de transacción
   */
  protected getClient(tx?: PrismaTransaction): any {
    return tx ?? this.prisma;
  }

  /**
   * Crea una nueva entidad en la base de datos
   * @template V - Tipo opcional para el retorno, por defecto es T
   * @param createDto - DTO con los datos para crear la entidad
   * @returns - La entidad creada con el tipo especificado
   * @throws {ValidationError} Si los datos no son válidos
   */
  async create<V = T>(createDto: CreateDto<T>): Promise<V> {
    const result = await this.prisma.measureQuery(
      `create${String(this.modelName)}`,
      () =>
        (this.prisma[this.modelName] as any).create({
          data: this.mapDtoToEntity(createDto),
        }),
    );

    return result as unknown as V;
  }

  /**
   * Crea una nueva entidad dentro de una transacción
   * @template V - Tipo opcional para el retorno, por defecto es T
   * @param createDto - DTO con los datos para crear la entidad
   * @param tx - Contexto de transacción opcional
   * @returns - La entidad creada con el tipo especificado
   */
  async createWithTx<V = T, W = CreateDto<T>>(
    createDto: W,
    tx?: PrismaTransaction,
  ): Promise<V> {
    const client = this.getClient(tx);
    // Nota: no usamos measureQuery dentro de una transacción
    const result = await (client[this.modelName] as any).create({
      data: this.mapDtoToEntity ? this.mapDtoToEntity(createDto) : createDto,
    });

    return result as unknown as V;
  }

  /**
   * Busca múltiples registros con filtros opcionales
   * @template V - Tipo opcional para el retorno, por defecto es T
   * @param params - Parámetros de búsqueda, ordenamiento y paginación
   */
  async findMany<V = T>(params?: QueryParams): Promise<V[]> {
    const result = await this.prisma.measureQuery(
      `findMany${String(this.modelName)}`,
      () => (this.prisma[this.modelName] as any).findMany(params),
    );
    return result as unknown as V[];
  }

  /**
   * Busca múltiples registros con filtros opcionales y paginación, ordenados por fecha de creación descendente
   * @template V - Tipo opcional para el retorno, por defecto es T
   * @param pagination - Parámetros de paginación
   * @param params - Parámetros de búsqueda adicionales
   */
  async findManyPaginated<V = T>(
    pagination?: PaginationParams,
    params?: QueryParams & {
      filterOptions?: FilterOptions<T>;
      sortOptions?: SortOptions<T>;
      enumFields?: string[];
      dateFields?: string[];
      cursor?: any;
      distinct?: any;
    },
  ): Promise<PaginatedResponse<V>> {
    // Valores por defecto para paginación
    const DEFAULT_PAGE_SIZE = 10;
    const DEFAULT_PAGE = 1;
    const page = pagination?.page ?? DEFAULT_PAGE;
    const pageSize = pagination?.pageSize ?? DEFAULT_PAGE_SIZE;

    // Calcula skip basado en page y pageSize
    const skip = (page - 1) * pageSize;

    // Asegura que params tenga una estructura adecuada
    const queryParams = params || {};

    // Construye filtros avanzados y ordenamiento

    const advancedWhere = this.buildWhereClause(
      queryParams.filterOptions,
      queryParams.enumFields,
      queryParams.dateFields,
    );

    const orderBy = this.buildOrderByClause(
      queryParams.sortOptions,
      true,
      true,
    ) ??
      queryParams?.orderBy ?? { createdAt: 'desc' };

    // Combina filtros existentes con avanzados
    const combinedWhere = { ...queryParams.where, ...advancedWhere };

    // Extraer solo los argumentos válidos de Prisma del queryParams
    const { include, select, cursor, distinct } = queryParams;

    // Crear objeto con solo argumentos válidos de Prisma
    const otherValidPrismaArgs = { ...queryParams };
    delete otherValidPrismaArgs.filterOptions;
    delete otherValidPrismaArgs.sortOptions;
    delete otherValidPrismaArgs.enumFields;
    delete otherValidPrismaArgs.dateFields;

    const prismaQuery = {
      ...otherValidPrismaArgs, // Solo argumentos válidos de Prisma
      where: combinedWhere,
      orderBy,
      skip,
      take: pageSize,
      include,
      select,
      cursor,
      distinct,
    };

    // Realiza dos consultas optimizadas: una para obtener los datos paginados y otra para el conteo total

    const [data, total] = await Promise.all([
      this.prisma.measureQuery(
        `findMany${String(this.modelName)}Paginated`,
        () => (this.prisma[this.modelName] as any).findMany(prismaQuery),
      ),
      this.prisma.measureQuery(`count${String(this.modelName)}`, () =>
        (this.prisma[this.modelName] as any).count({
          where: combinedWhere,
        }),
      ),
    ]);

    // Calcula el número total de páginas
    const totalPages = Math.ceil((total as number) / pageSize);
    return {
      data: data as unknown as V[],
      meta: {
        total: total as number,
        page,
        pageSize,
        totalPages,
        hasNext: page < totalPages,
        hasPrevious: page > 1,
      },
    };
  }

  /**
   * Busca entidades en la base de datos donde el campo especificado coincida parcialmente con el valor proporcionado.
   *
   * @template V - Tipo de retorno, por defecto es el mismo tipo del repositorio (T)
   * @param {string} field - Nombre del campo por el cual buscar coincidencias
   * @param {string} value - Valor a buscar en el campo especificado
   * @param {boolean} [onlyActive] - Si se especifica como true, solo buscará entre entidades activas
   * @param {QueryParams} [params] - Parámetros adicionales para la consulta
   * @returns {Promise<V[]>} - Promesa que resuelve a un array de entidades que coinciden con la búsqueda
   *
   * @example
   * // Buscar usuarios por nombre que contengan "juan"
   * const usuarios = await userRepository.searchByCoincidenceField('nombre', 'juan');
   */
  async searchByCoincidenceField<V = T>({
    field,
    value,
    onlyActive,
    params,
  }: {
    field: keyof V;
    value: string;
    onlyActive?: boolean;
    params?: QueryParams;
  }): Promise<V[]> {
    const result = await this.prisma.measureQuery(
      `searchBy${String(field)}`,
      () =>
        (this.prisma[this.modelName] as any).findMany({
          ...params,
          where: {
            [field]: {
              contains: value,
              mode: 'insensitive',
            },
            isActive: onlyActive ? true : undefined,
          },
          // select: {
          //   id: true,
          //   [field]: true,
          // },
          take: 10,
        }),
    );
    return result as unknown as V[];
  }

  /**
   * Encuentra los últimos 10 registros creados en la base de datos para el modelo actual.
   *
   * @template V - Tipo de retorno opcional, por defecto es el tipo genérico del repositorio (T)
   * @returns Promesa que resuelve a una lista de los últimos 10 registros creados ordenados por fecha de creación descendente, o null si no hay registros
   */
  async findLastCreated<V = T>(): Promise<V[] | null> {
    const result = await this.prisma.measureQuery(
      `findLastCreated${String(this.modelName)}`,
      () =>
        (this.prisma[this.modelName] as any).findMany({
          orderBy: { createdAt: 'desc' },
          take: 10,
        }),
    );
    return result as unknown as V[] | null;
  }

  /**
   * Busca múltiples registros activos en la base de datos.
   * @template V - Tipo opcional para el retorno, por defecto es T
   * @param {QueryParams} [params] - Parámetros opcionales para la consulta.
   * @returns {Promise<V[]>} - Una promesa que resuelve con una lista de registros activos.
   */
  async findManyActive<V = T>(params?: QueryParams): Promise<V[]> {
    const result = await this.prisma.measureQuery(
      `findManyActive${String(this.modelName)}`,
      () =>
        (this.prisma[this.modelName] as any).findMany({
          ...params,
          where: {
            ...params?.where,
            isActive: true,
          },
        }),
    );
    return result as unknown as V[];
  }

  /**
   * Busca un registro por parámetros.
   * @template V - Tipo opcional para el retorno, por defecto es T
   * @param params - Parámetros de búsqueda.
   * @returns El registro encontrado o null si no se encuentra.
   */
  async findOne<V = T>(params: QueryParams): Promise<V | null> {
    const result = await this.prisma.measureQuery(
      `findOne${String(this.modelName)}`,
      () => (this.prisma[this.modelName] as any).findFirst(params),
    );
    return result as unknown as V | null;
  }

  /**
   * Busca un registro por su ID y lo incluye en la respuesta.
   * @template V - Tipo opcional para el retorno, por defecto es T
   * @param id - ID del registro a buscar.
   * @param include - Relaciones a incluir.
   * @returns El registro encontrado o null si no se encuentra.
   */
  async findUnique<V = T>(params: QueryParams): Promise<V | null> {
    const result = await this.prisma.measureQuery(
      `findUnique${String(this.modelName)}`,
      () => (this.prisma[this.modelName] as any).findUnique(params),
    );
    return result as unknown as V | null;
  }

  /**
   * Busca un registro por su id.
   * @template V - Tipo opcional para el retorno, por defecto es T
   * @param id - ID del registro a buscar.
   * @param include - Relaciones a incluir.
   * @returns El registro encontrado o null si no se encuentra.
   */
  async findById<V = T>(
    id: string,
    include?: Record<string, boolean>,
  ): Promise<V | null> {
    const result = await this.prisma.measureQuery(
      `findById${String(this.modelName)}`,
      () =>
        (this.prisma[this.modelName] as any).findUnique({
          where: { id },
          include,
        }),
    );
    return result as unknown as V | null;
  }

  /**
   * Actualiza un registro existente.
   * @template V - Tipo opcional para el retorno, por defecto es T
   * @param id - ID del registro a actualizar.
   * @param updateDto - DTO con los datos para actualizar.
   * @returns El registro actualizado.
   * @throws {NotFoundException} Si el registro no se encuentra.
   */
  async update<V = T>(id: string, updateDto: UpdateDto<T>): Promise<V> {
    const exists = await this.findById(id);
    if (!exists) {
      throw new NotFoundException(
        `${String(this.modelName)} with id ${id} not found`,
      );
    }

    const result = await this.prisma.measureQuery(
      `update${String(this.modelName)}`,
      () =>
        (this.prisma[this.modelName] as any).update({
          where: { id },
          data: this.mapDtoToEntity(updateDto),
        }),
    );
    return result as unknown as V;
  }

  /**
   * Actualiza un registro existente dentro de una transacción.
   * @template V - Tipo opcional para el retorno, por defecto es T
   * @param id - ID del registro a actualizar.
   * @param updateDto - DTO con los datos para actualizar.
   * @param tx - Contexto de transacción opcional
   * @returns El registro actualizado.
   */
  async updateWithTx<V = T>(
    id: string,
    updateDto: UpdateDto<T>,
    tx?: PrismaTransaction,
  ): Promise<V> {
    const client = this.getClient(tx);
    const result = await (client[this.modelName] as any).update({
      where: { id },
      data: this.mapDtoToEntity ? this.mapDtoToEntity(updateDto) : updateDto,
    });

    return result as unknown as V;
  }

  /**
   * Elimina un registro por su id.
   * @template V - Tipo opcional para el retorno, por defecto es T
   * @param id - ID del registro a eliminar.
   * @throws {NotFoundException} Si el registro no se encuentra.
   */
  async delete<V = T>(id: string): Promise<V> {
    const exists = await this.findById(id);
    if (!exists) {
      throw new NotFoundException(
        `${String(this.modelName)} with id ${id} not found`,
      );
    }

    const result = await this.prisma.measureQuery(
      `delete${String(this.modelName)}`,
      () =>
        (this.prisma[this.modelName] as any).delete({
          where: { id },
        }),
    );
    return result as unknown as V;
  }

  /**
   * Elimina un registro por su id dentro de una transacción.
   * @template V - Tipo opcional para el retorno, por defecto es T
   * @param id - ID del registro a eliminar.
   * @param tx - Contexto de transacción opcional
   * @returns El registro eliminado
   */
  async deleteWithTx<V = T>(id: string, tx?: PrismaTransaction): Promise<V> {
    const client = this.getClient(tx);
    const result = await (client[this.modelName] as any).delete({
      where: { id },
    });

    return result as unknown as V;
  }

  /**
   * Elimina múltiples registros por sus IDs.
   * @template V - Tipo opcional para el retorno, por defecto es T
   * @param ids - Array de IDs de los registros a eliminar
   * @returns Array con los registros eliminados
   * @throws {NotFoundException} Si alguno de los registros no se encuentra
   */
  async deleteMany<V = T>(ids: string[]): Promise<V[]> {
    // Find existing records
    const existingRecords = await this.findMany({
      where: { id: { in: ids } },
    });

    // If no records found, end early
    if (existingRecords.length === 0) {
      return [] as unknown as V[];
    }

    // Get IDs of existing records
    const existingIds = existingRecords.map((record) => record.id);

    // Delete only existing records
    await this.prisma.measureQuery(`deleteMany${String(this.modelName)}`, () =>
      (this.prisma[this.modelName] as any).deleteMany({
        where: { id: { in: existingIds } },
      }),
    );

    // Return deleted records
    return existingRecords as unknown as V[];
  }

  /**
   * Elimina múltiples registros por sus IDs dentro de una transacción.
   * @template V - Tipo opcional para el retorno, por defecto es T
   * @param ids - Array de IDs de los registros a eliminar
   * @param tx - Contexto de transacción opcional
   * @returns Array con los registros eliminados
   */
  async deleteManyWithTx<V = T>(
    ids: string[],
    tx?: PrismaTransaction,
  ): Promise<V[]> {
    const client = this.getClient(tx);

    // Buscar primero para devolver los registros eliminados
    const existingRecords = await (client[this.modelName] as any).findMany({
      where: { id: { in: ids } },
    });

    // Si no hay registros, terminar
    if (existingRecords.length === 0) {
      return [] as unknown as V[];
    }

    // Obtener solo los IDs existentes
    const existingIds = existingRecords.map((record) => record.id);

    // Eliminar los registros existentes
    await (client[this.modelName] as any).deleteMany({
      where: { id: { in: existingIds } },
    });

    return existingRecords as unknown as V[];
  }

  /**
   * Elimina lógicamente un registro por su id.
   * @template V - Tipo opcional para el retorno, por defecto es T
   * @param id - ID del registro a eliminar lógicamente.
   * @returns El registro eliminado lógicamente.
   * @throws {NotFoundException} Si el registro no se encuentra.
   */
  async softDelete<V = T>(id: string): Promise<V> {
    const exists = await this.findById(id);
    if (!exists) {
      throw new NotFoundException(
        `${String(this.modelName)} with id ${id} not found`,
      );
    }

    const result = await this.prisma.measureQuery(
      `softDelete${String(this.modelName)}`,
      () =>
        (this.prisma[this.modelName] as any).update({
          where: { id },
          data: { isActive: false },
        }),
    );
    return result as unknown as V;
  }

  /**
   * Elimina lógicamente un registro por su id dentro de una transacción.
   * @template V - Tipo opcional para el retorno, por defecto es T
   * @param id - ID del registro a eliminar lógicamente.
   * @param tx - Contexto de transacción opcional
   * @returns El registro eliminado lógicamente.
   */
  async softDeleteWithTx<V = T>(
    id: string,
    tx?: PrismaTransaction,
  ): Promise<V> {
    const client = this.getClient(tx);
    const result = await (client[this.modelName] as any).update({
      where: { id },
      data: { isActive: false },
    });

    return result as unknown as V;
  }

  /**
   * Elimina múltiples registros lógicamente
   * @template V - Tipo opcional para el retorno, por defecto es T
   * @param ids - Array de IDs de los registros a desactivar
   * @returns Array con los registros desactivados exitosamente
   */
  async softDeleteMany<V = T>(ids: string[]): Promise<V[]> {
    // Buscar registros que existen y están activos
    const existingRecords = await this.findMany({
      where: {
        id: { in: ids },
        isActive: true,
      },
    });

    // Si no hay registros activos para procesar, termina
    if (existingRecords.length === 0) {
      return [] as unknown as V[];
    }

    // Obtiene solo los IDs de los registros activos
    const activeIds = existingRecords.map((record) => record.id);

    // Actualiza todos los registros activos encontrados
    await this.prisma.measureQuery(
      `softDeleteMany${String(this.modelName)}`,
      () =>
        (this.prisma[this.modelName] as any).updateMany({
          where: { id: { in: activeIds } },
          data: { isActive: false },
        }),
    );

    // Aquí está el cambio: en lugar de devolver existingRecords,
    // buscamos y devolvemos los registros actualizados
    const updatedRecords = await this.findMany({
      where: {
        id: { in: activeIds },
      },
    });

    // Retorna los registros que fueron desactivados
    return updatedRecords as unknown as V[];
  }

  /**
   * Elimina múltiples registros lógicamente dentro de una transacción.
   * @template V - Tipo opcional para el retorno, por defecto es T
   * @param ids - Array de IDs de los registros a desactivar
   * @param tx - Contexto de transacción opcional
   * @returns Array con los registros desactivados exitosamente
   */
  async softDeleteManyWithTx<V = T>(
    ids: string[],
    tx?: PrismaTransaction,
  ): Promise<V[]> {
    const client = this.getClient(tx);

    // Buscar registros que existen y están activos
    const existingRecords = await (client[this.modelName] as any).findMany({
      where: {
        id: { in: ids },
        isActive: true,
      },
    });

    // Si no hay registros activos para procesar, termina
    if (existingRecords.length === 0) {
      return [] as unknown as V[];
    }

    // Obtiene solo los IDs de los registros activos
    const activeIds = existingRecords.map((record) => record.id);

    // Actualiza todos los registros activos encontrados
    await (client[this.modelName] as any).updateMany({
      where: { id: { in: activeIds } },
      data: { isActive: false },
    });

    return existingRecords as unknown as V[];
  }

  /**
   * Reactiva un registro previamente desactivado.
   * @template V - Tipo opcional para el retorno, por defecto es T
   * @param id - ID del registro a reactivar
   * @returns El registro reactivado
   * @throws {NotFoundException} Si el registro no se encuentra
   */
  async reactivate<V = T>(id: string): Promise<V> {
    const exists = await this.findOne({
      where: { id, isActive: false },
    });

    if (!exists) {
      throw new NotFoundException(
        `${String(this.modelName)} with id ${id} not found or is already active`,
      );
    }

    const result = await this.prisma.measureQuery(
      `reactivate${String(this.modelName)}`,
      () =>
        (this.prisma[this.modelName] as any).update({
          where: { id },
          data: { isActive: true },
        }),
    );
    return result as unknown as V;
  }

  /**
   * Reactiva un registro previamente desactivado dentro de una transacción.
   * @template V - Tipo opcional para el retorno, por defecto es T
   * @param id - ID del registro a reactivar
   * @param tx - Contexto de transacción opcional
   * @returns El registro reactivado
   */
  async reactivateWithTx<V = T>(
    id: string,
    tx?: PrismaTransaction,
  ): Promise<V> {
    const client = this.getClient(tx);
    const result = await (client[this.modelName] as any).update({
      where: { id },
      data: { isActive: true },
    });

    return result as unknown as V;
  }

  /**
   * Reactiva múltiples registros previamente desactivados.
   * @template V - Tipo opcional para el retorno, por defecto es T
   * @param ids - Array de IDs de los registros a reactivar
   * @returns Array con los registros reactivados exitosamente
   */
  async reactivateMany<V = T>(ids: string[]): Promise<V[]> {
    // Buscar registros que existen y están inactivos
    const existingRecords = await this.findMany({
      where: {
        id: { in: ids },
        isActive: false,
      },
    });

    // Si no hay registros inactivos para procesar, termina
    if (existingRecords.length === 0) {
      return [] as unknown as V[];
    }

    // Obtiene solo los IDs de los registros inactivos
    const inactiveIds = existingRecords.map((record) => record.id);

    // Reactiva todos los registros inactivos encontrados
    await this.prisma.measureQuery(
      `reactivateMany${String(this.modelName)}`,
      () =>
        (this.prisma[this.modelName] as any).updateMany({
          where: { id: { in: inactiveIds } },
          data: { isActive: true },
        }),
    );

    // Obtiene y retorna los registros reactivados
    const result = await this.findMany({
      where: { id: { in: inactiveIds } },
    });
    return result as unknown as V[];
  }

  /**
   * Reactiva múltiples registros previamente desactivados dentro de una transacción.
   * @template V - Tipo opcional para el retorno, por defecto es T
   * @param ids - Array de IDs de los registros a reactivar
   * @param tx - Contexto de transacción opcional
   * @returns Array con los registros reactivados exitosamente
   */
  async reactivateManyWithTx<V = T>(
    ids: string[],
    tx?: PrismaTransaction,
  ): Promise<V[]> {
    const client = this.getClient(tx);

    // Buscar registros que existen y están inactivos
    const existingRecords = await (client[this.modelName] as any).findMany({
      where: {
        id: { in: ids },
        isActive: false,
      },
    });

    // Si no hay registros inactivos para procesar, termina
    if (existingRecords.length === 0) {
      return [] as unknown as V[];
    }

    // Obtiene solo los IDs de los registros inactivos
    const inactiveIds = existingRecords.map((record) => record.id);

    // Reactiva todos los registros inactivos encontrados
    await (client[this.modelName] as any).updateMany({
      where: { id: { in: inactiveIds } },
      data: { isActive: true },
    });

    // Obtiene y retorna los registros reactivados
    const result = await (client[this.modelName] as any).findMany({
      where: { id: { in: inactiveIds } },
    });

    return result as unknown as V[];
  }

  /**
   * Ejecuta una transacción con la base de datos.
   * @param operation - Función que contiene las operaciones a ejecutar dentro de la transacción.
   * @param options - Opciones de la transacción, como nivel de aislamiento
   * @returns El resultado de la transacción.
   */
  async transaction<R>(
    operation: (transaction: PrismaTransaction) => Promise<R>,
    options?: {
      isolationLevel?:
        | 'ReadUncommitted'
        | 'ReadCommitted'
        | 'RepeatableRead'
        | 'Serializable';
    },
  ): Promise<R> {
    if (options) {
      return this.prisma.$transaction(operation, options);
    } else {
      return this.prisma.withTransaction(operation);
    }
  }

  /**
   * Mapea un DTO a una entidad.
   * @param dto - DTO a mapear.
   * @returns La entidad mapeada.
   */
  protected mapDtoToEntity<D>(dto: D): any {
    const mappedDto = dto as any;
    if (mappedDto.metadata && typeof mappedDto.metadata !== 'string') {
      mappedDto.metadata = mappedDto.metadata;
    }
    return mappedDto;
  }

  mapToEntity<E, F>(baseEntity: E): F {
    return baseEntity as unknown as F;
  }

  mapManyToEntities<E, F>(baseEntities: E[]): F[] {
    return baseEntities as unknown as F[];
  }

  /**
   * Encuentra registros dentro de una transacción
   * @template V - Tipo opcional para el retorno, por defecto es T
   * @param params - Parámetros de búsqueda
   * @param tx - Contexto de transacción opcional
   * @returns Los registros encontrados
   */
  async findManyWithTx<V = T>(
    params?: QueryParams,
    tx?: PrismaTransaction,
  ): Promise<V[]> {
    const client = this.getClient(tx);
    const result = await (client[this.modelName] as any).findMany(params);
    return result as unknown as V[];
  }

  /**
   * Busca un registro por su ID dentro de una transacción
   * @template V - Tipo opcional para el retorno, por defecto es T
   * @param id - ID del registro a buscar
   * @param tx - Contexto de transacción
   * @param include - Relaciones a incluir (opcional)
   * @returns El registro encontrado o null si no existe
   */
  async findByIdWithTx<V = T>(
    id: string,
    tx?: PrismaTransaction,
    include?: Record<string, boolean>,
  ): Promise<V | null> {
    const client = this.getClient(tx);
    const result = await (client[this.modelName] as any).findUnique({
      where: { id },
      include,
    });

    return result as unknown as V | null;
  }

  /**
   * Busca registros por un campo específico y su valor
   * @template V - Tipo opcional para el retorno, por defecto es T
   * @param field - Nombre del campo por el cual buscar
   * @param value - Valor a buscar
   * @returns Array con los registros que coinciden con la búsqueda
   */
  async findByField<V = T>(field: keyof T, value: any): Promise<V[]> {
    const result = await this.prisma.measureQuery(
      `findBy${String(field)}`,
      () =>
        (this.prisma[this.modelName] as any).findMany({
          where: {
            [field]: value,
            // No incluimos isActive aquí para permitir búsquedas flexibles
          },
        }),
    );
    return result as unknown as V[];
  }

  /**
   * Busca registros con relaciones específicas
   * @template V - Tipo opcional para el retorno, por defecto es T
   * @param params - Parámetros de búsqueda incluyendo relaciones
   */
  async findManyWithRelations<V = T>(params?: QueryParams): Promise<V[]> {
    const result = await this.prisma.measureQuery(
      `findManyWithRelations${String(this.modelName)}`,
      () => (this.prisma[this.modelName] as any).findMany(params),
    );
    return result as unknown as V[];
  }

  /**
   * Busca un registro con sus relaciones
   * @template V - Tipo opcional para el retorno, por defecto es T
   * @param id - ID del registro a buscar
   * @param include - Relaciones a incluir
   */
  async findOneWithRelations<V = T>(
    id: string,
    params: QueryParams,
  ): Promise<V | null> {
    const result = await this.prisma.measureQuery(
      `findOneWithRelations${String(this.modelName)}`,
      () =>
        (this.prisma[this.modelName] as any).findUnique({
          ...params,
          where: { id },
        }),
    );
    return result as unknown as V | null;
  }

  /**
   * Busca registros en una tabla específica por un campo y su valor
   * @template V - Tipo opcional para el retorno, por defecto es any
   * @param field - Nombre del campo por el cual buscar
   * @param value - Valor a buscar
   * @param table - Nombre de la tabla donde buscar
   * @returns Array con los registros que coinciden con la búsqueda
   */
  async findOneDataTable<V = any>(
    field: string,
    value: any,
    table: string,
  ): Promise<V[]> {
    const result = await this.prisma.measureQuery(
      `findBy${String(field)}In${table}`,
      () =>
        this.prisma[table].findMany({
          where: {
            [field]: value,
          },
        }),
    );
    return result as unknown as V[];
  }

  /**
   * Busca registros por el campo 'name' y su valor
   * @template V - Tipo opcional para el retorno, por defecto es T
   * @param name - Valor del nombre a buscar
   * @returns Array con los registros que coinciden con el nombre
   */
  async findByName<V = T>(name: string): Promise<V[]> {
    const result = await this.prisma.measureQuery(`findByName`, () =>
      (this.prisma[this.modelName] as any).findMany({
        where: {
          name: name,
        },
      }),
    );
    return result as unknown as V[];
  }

  // Métodos avanzados para filtros y ordenamiento optimizados
  protected buildWhereClause<T>(
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
      OR,
      fieldNumber,
      fieldNumbers,
      fieldDate,
      fieldDates,
      arrayByField,
      ...rest
    } = filterOptions;

    // Filtros AND normales
    if (searchByField) {
      Object.entries(searchByField).forEach(([key, value]) => {
        whereClause[key] =
          typeof value === 'string' && !this.isEnumField(key, enumFields)
            ? this.buildFlexibleSearchCondition(value)
            : value;
      });
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
    if (OR) {
      const orConditions: Record<string, any>[] = [];

      // Si OR es un array directo de condiciones (nuevo formato)
      if (Array.isArray(OR)) {
        orConditions.push(...OR);
      } else {
        // Formato legacy con searchByField y searchByFieldsRelational
        if (OR.searchByField) {
          Object.entries(OR.searchByField).forEach(([key, value]) => {
            const condition: Record<string, any> = {};
            condition[key] =
              typeof value === 'string'
                ? this.buildFlexibleSearchCondition(value)
                : value;
            orConditions.push(condition);
          });
        }
        if (OR.searchByFieldsRelational) {
          OR.searchByFieldsRelational.forEach((relation) => {
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
      }

      if (orConditions.length > 0) {
        // Combinar con OR existente si ya existe (creado por searchByFieldsRelational)
        if (whereClause['OR'] && Array.isArray(whereClause['OR'])) {
          whereClause['OR'] = [...whereClause['OR'], ...orConditions];
        } else {
          whereClause['OR'] = orConditions;
        }
      }
    }

    // Arrays y resto
    if (arrayByField) {
      Object.entries(arrayByField).forEach(([key, values]) => {
        // Para campos booleanos, usar OR con equals
        if (
          key === 'isActive' ||
          key === 'isBlacklist' ||
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

    return whereClause;
  }

  protected buildOrderByClause<T>(
    sortOptions?: SortOptions<T>,
    hasCreatedAtField?: boolean,
    sortDescByCreation?: boolean,
  ): Record<string, any> | undefined {
    if (!sortOptions && !hasCreatedAtField) return undefined;
    const orderBy: Record<string, any> = {};
    if (sortOptions?.field)
      orderBy[sortOptions.field as string] = sortOptions.order ?? 'asc';
    if (!sortOptions && hasCreatedAtField)
      orderBy['createdAt'] = sortDescByCreation ? 'desc' : 'asc';
    return orderBy;
  }

  private isEnumField(field: string, enumFields?: string[]): boolean {
    return enumFields?.some((enumField) => field.includes(enumField)) ?? false;
  }

  private applyFieldNumberCondition(
    where: Record<string, any>,
    fieldNumber: FieldNumberOptions<any>,
  ): void {
    where[String(fieldNumber.field)] = {
      [fieldNumber.operator]: fieldNumber.value,
    };
  }

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

  private isDateField(field: string, dateFields?: string[]): boolean {
    return dateFields?.some((dateField) => field.includes(dateField)) ?? false;
  }

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
