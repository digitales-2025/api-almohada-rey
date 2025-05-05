import { Injectable } from '@nestjs/common';
import {
  PaginatedResponse,
  PaginationMetadata,
} from 'src/utils/paginated-response/PaginatedResponse.dto';
import { PrismaService } from 'src/prisma/prisma.service';

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
}
