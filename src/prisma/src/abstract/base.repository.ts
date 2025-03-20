import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { PrismaTransaction, QueryParams, CreateDto, UpdateDto } from '../types';

/**
 * Clase base abstracta que implementa operaciones CRUD genéricas.
 * Proporciona una capa de abstracción sobre Prisma.
 *
 * @abstract
 * @class
 * @template T - Tipo de entidad que maneja el repositorio
 */
@Injectable()
export abstract class BaseRepository<T extends { id: string }> {
  constructor(
    protected readonly prisma: PrismaService,
    protected readonly modelName: keyof PrismaService,
  ) {}

  /**
   * Crea una nueva entidad en la base de datos
   * @param createDto - DTO con los datos para crear la entidad
   * @throws {ValidationError} Si los datos no son válidos
   */
  async create(createDto: CreateDto<T>): Promise<T> {
    return this.prisma.measureQuery(`create${String(this.modelName)}`, () =>
      (this.prisma[this.modelName] as any).create({
        data: this.mapDtoToEntity(createDto),
      }),
    );
  }

  /**
   * Busca múltiples registros con filtros opcionales
   * @param params - Parámetros de búsqueda, ordenamiento y paginación
   */
  async findMany(params?: QueryParams): Promise<T[]> {
    return this.prisma.measureQuery(`findMany${String(this.modelName)}`, () =>
      (this.prisma[this.modelName] as any).findMany(params),
    );
  }

  /**
   * Busca múltiples registros activos en la base de datos.
   *
   * @param {QueryParams} [params] - Parámetros opcionales para la consulta.
   * @returns {Promise<T[]>} - Una promesa que resuelve con una lista de registros activos.
   */
  async findManyActive(params?: QueryParams): Promise<T[]> {
    return this.prisma.measureQuery(
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
  }

  /**
   * Busca un registro por parámetros.
   * @param params - Parámetros de búsqueda.
   * @returns El registro encontrado o null si no se encuentra.
   */
  async findOne(params: QueryParams): Promise<T | null> {
    return this.prisma.measureQuery(`findOne${String(this.modelName)}`, () =>
      (this.prisma[this.modelName] as any).findFirst(params),
    );
  }

  /**
   * Busca un registro por su id.
   * @param id - ID del registro a buscar.
   * @param include - Relaciones a incluir.
   * @returns El registro encontrado o null si no se encuentra.
   */
  async findById(
    id: string,
    include?: Record<string, boolean>,
  ): Promise<T | null> {
    return this.prisma.measureQuery(`findById${String(this.modelName)}`, () =>
      (this.prisma[this.modelName] as any).findUnique({
        where: { id },
        include,
      }),
    );
  }

  /**
   * Actualiza un registro existente.
   * @param id - ID del registro a actualizar.
   * @param updateDto - DTO con los datos para actualizar.
   * @returns El registro actualizado.
   * @throws {NotFoundException} Si el registro no se encuentra.
   */
  async update(id: string, updateDto: UpdateDto<T>): Promise<T> {
    const exists = await this.findById(id);
    if (!exists) {
      throw new NotFoundException(
        `${String(this.modelName)} with id ${id} not found`,
      );
    }

    return this.prisma.measureQuery(`update${String(this.modelName)}`, () =>
      (this.prisma[this.modelName] as any).update({
        where: { id },
        data: this.mapDtoToEntity(updateDto),
      }),
    );
  }

  /**
   * Elimina un registro por su id.
   * @param id - ID del registro a eliminar.
   * @throws {NotFoundException} Si el registro no se encuentra.
   */
  async delete(id: string): Promise<T> {
    const exists = await this.findById(id);
    if (!exists) {
      throw new NotFoundException(
        `${String(this.modelName)} with id ${id} not found`,
      );
    }

    return await this.prisma.measureQuery(
      `delete${String(this.modelName)}`,
      () =>
        (this.prisma[this.modelName] as any).delete({
          where: { id },
        }),
    );
  }

  /**
   * Elimina múltiples registros por sus IDs.
   * @param ids - Array de IDs de los registros a eliminar
   * @returns Array con los registros eliminados
   * @throws {NotFoundException} Si alguno de los registros no se encuentra
   */
  async deleteMany(ids: string[]): Promise<T[]> {
    // Find existing records
    const existingRecords = await this.findMany({
      where: { id: { in: ids } },
    });

    // If no records found, end early
    if (existingRecords.length === 0) {
      return [];
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
    return existingRecords;
  }

  /**
   * Elimina lógicamente un registro por su id.
   * @param id - ID del registro a eliminar lógicamente.
   * @returns El registro eliminado lógicamente.
   * @throws {NotFoundException} Si el registro no se encuentra.
   */
  async softDelete(id: string): Promise<T> {
    const exists = await this.findById(id);
    if (!exists) {
      throw new NotFoundException(
        `${String(this.modelName)} with id ${id} not found`,
      );
    }

    return this.prisma.measureQuery(`softDelete${String(this.modelName)}`, () =>
      (this.prisma[this.modelName] as any).update({
        where: { id },
        data: { isActive: false },
      }),
    );
  }

  /**
   * Elimina múltiples registros lógicamente
   * @param ids - Array de IDs de los registros a desactivar
   * @returns Array con los registros desactivados exitosamente
   */
  async softDeleteMany(ids: string[]): Promise<T[]> {
    // Buscar registros que existen y están activos
    const existingRecords = await this.findMany({
      where: {
        id: { in: ids },
        isActive: true,
      },
    });

    // Si no hay registros activos para procesar, termina
    if (existingRecords.length === 0) {
      return [];
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
    return existingRecords;
  }

  /**
   * Reactiva un registro previamente desactivado.
   * @param id - ID del registro a reactivar
   * @returns El registro reactivado
   * @throws {NotFoundException} Si el registro no se encuentra
   */
  async reactivate(id: string): Promise<T> {
    const exists = await this.findOne({
      where: { id, isActive: false },
    });

    if (!exists) {
      throw new NotFoundException(
        `${String(this.modelName)} with id ${id} not found or is already active`,
      );
    }

    return this.prisma.measureQuery(`reactivate${String(this.modelName)}`, () =>
      (this.prisma[this.modelName] as any).update({
        where: { id },
        data: { isActive: true },
      }),
    );
  }

  /**
   * Reactiva múltiples registros previamente desactivados.
   * @param ids - Array de IDs de los registros a reactivar
   * @returns Array con los registros reactivados exitosamente
   */
  async reactivateMany(ids: string[]): Promise<T[]> {
    // Buscar registros que existen y están inactivos
    const existingRecords = await this.findMany({
      where: {
        id: { in: ids },
        isActive: false,
      },
    });

    // Si no hay registros inactivos para procesar, termina
    if (existingRecords.length === 0) {
      return [];
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
    return this.findMany({
      where: { id: { in: inactiveIds } },
    });
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

  // Añadir este método dentro de la clase BaseRepository

  /**
   * Busca registros por un campo específico y su valor
   * @param field - Nombre del campo por el cual buscar
   * @param value - Valor a buscar
   * @returns Array con los registros que coinciden con la búsqueda
   */
  async findByField(field: keyof T, value: any): Promise<T[]> {
    return this.prisma.measureQuery(`findBy${String(field)}`, () =>
      (this.prisma[this.modelName] as any).findMany({
        where: {
          [field]: value,
          // No incluimos isActive aquí para permitir búsquedas flexibles
        },
      }),
    );
  }

  /**
   * Busca registros con relaciones específicas
   * @param params - Parámetros de búsqueda incluyendo relaciones
   */
  async findManyWithRelations(params?: QueryParams): Promise<T[]> {
    return this.prisma.measureQuery(
      `findManyWithRelations${String(this.modelName)}`,
      () => (this.prisma[this.modelName] as any).findMany(params),
    );
  }

  /**
   * Busca un registro con sus relaciones
   * @param id - ID del registro a buscar
   * @param include - Relaciones a incluir
   */
  async findOneWithRelations(
    id: string,
    params: QueryParams,
  ): Promise<T | null> {
    return this.prisma.measureQuery(
      `findOneWithRelations${String(this.modelName)}`,
      () =>
        (this.prisma[this.modelName] as any).findUnique({
          ...params,
          where: { id },
        }),
    );
  }

  /**
   * Busca registros en una tabla específica por un campo y su valor
   * @param field - Nombre del campo por el cual buscar
   * @param value - Valor a buscar
   * @param table - Nombre de la tabla donde buscar
   * @returns Array con los registros que coinciden con la búsqueda
   */
  async findOneDataTable(
    field: string,
    value: any,
    table: string,
  ): Promise<any[]> {
    return this.prisma.measureQuery(`findBy${String(field)}In${table}`, () =>
      this.prisma[table].findMany({
        where: {
          [field]: value,
        },
      }),
    );
  }

  /**
   * Busca registros por el campo 'name' y su valor
   * @param name - Valor del nombre a buscar
   * @returns Array con los registros que coinciden con el nombre
   */
  async findByName<T>(name: string): Promise<T[]> {
    return this.prisma.measureQuery(`findByName`, () =>
      (this.prisma[this.modelName] as any).findMany({
        where: {
          name: name,
        },
      }),
    );
  }
}
