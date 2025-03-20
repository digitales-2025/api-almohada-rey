import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { PrismaTransaction, QueryParams, CreateDto, UpdateDto } from '../types';
import { BaseEntity } from './base.entity';

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

    // Retorna los registros que fueron desactivados
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
   * Ejecuta una transacción con la base de datos.
   * @param operation - Función que contiene las operaciones a ejecutar dentro de la transacción.
   * @returns El resultado de la transacción.
   */
  async transaction<R>(
    operation: (transaction: PrismaTransaction) => Promise<R>,
  ): Promise<R> {
    return this.prisma.withTransaction(operation);
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
}
