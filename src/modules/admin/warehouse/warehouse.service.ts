import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { MovementsService } from '../movements/movements.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { SummaryWarehouseData, WarehouseData } from 'src/interfaces';
import { handleException } from 'src/utils';
import { PaginationService } from 'src/pagination/pagination.service';
import { PaginatedResponse } from 'src/utils/paginated-response/PaginatedResponse.dto';
import { ProductType } from '@prisma/client';
import { StockData } from 'src/interfaces/warehouse.interface';

@Injectable()
export class WarehouseService {
  private readonly logger = new Logger(WarehouseService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly paginationService: PaginationService,
    @Inject(forwardRef(() => MovementsService))
    private readonly movementsService: MovementsService,
  ) {}

  /**
   * Obtiene todos los almacenes
   * @param user Usuario que realiza la acción
   * @returns Lista de almacenes
   */
  async findAll(): Promise<SummaryWarehouseData[]> {
    try {
      const warehouses = await this.prisma.warehouse.findMany({
        select: {
          id: true,
          code: true,
          type: true,
          stock: {
            select: {
              quantity: true,
              totalCost: true,
            },
          },
        },
        orderBy: {
          createdAt: 'asc',
        },
      });

      // Mapea los resultados al tipo SummaryWarehouseData calculando totales
      return warehouses.map((warehouse) => ({
        id: warehouse.id,
        code: warehouse.code,
        type: warehouse.type,
        quantityProducts: warehouse.stock.reduce(
          (sum, item) => sum + (item.quantity || 0),
          0,
        ),
        totalCost: warehouse.stock.reduce(
          (sum, item) => sum + (item.totalCost || 0),
          0,
        ),
      }));
    } catch (error) {
      this.logger.error('Error getting all warehouses');
      handleException(error, 'Error getting all warehouses');
    }
  }

  /**
   * Obtiene un almacén por su tipo
   * @param type Tipo de almacén a buscar
   * @returns Almacén encontrado o error si no existe
   */
  async findWarehouseByType(type: ProductType): Promise<SummaryWarehouseData> {
    try {
      const warehouse = await this.prisma.warehouse.findFirst({
        where: { type },
        select: {
          id: true,
          code: true,
          type: true,
          stock: {
            select: {
              quantity: true,
              totalCost: true,
            },
          },
        },
        orderBy: {
          createdAt: 'asc',
        },
      });

      if (!warehouse) {
        throw new NotFoundException(`No warehouse found with type: ${type}`);
      }

      // Transformamos el único warehouse al tipo SummaryWarehouseData
      return {
        id: warehouse.id,
        code: warehouse.code,
        type: warehouse.type,
        quantityProducts: warehouse.stock.reduce(
          (sum, item) => sum + (item.quantity || 0),
          0,
        ),
        totalCost: warehouse.stock.reduce(
          (sum, item) => sum + (item.totalCost || 0),
          0,
        ),
      };
    } catch (error) {
      this.logger.error(
        `Error getting warehouse by type: ${type}`,
        error.stack,
      );
      handleException(error, `Error getting warehouse by type: ${type}`);
    }
  }

  /**
   * Obtiene todos los almacenes de forma paginada
   * @param options Opciones de paginación (página y tamaño de página)
   * @returns Lista paginada de almacenes con información resumida
   */
  async findAllPaginated(options: {
    page: number;
    pageSize: number;
  }): Promise<PaginatedResponse<SummaryWarehouseData>> {
    try {
      const { page, pageSize } = options;

      // Usamos el servicio de paginación con transformer personalizado
      const paginatedResult = await this.paginationService.paginate<any, any>({
        model: 'warehouse',
        page,
        pageSize,
        select: {
          id: true,
          type: true,
          code: true,
          stock: {
            select: {
              quantity: true,
              totalCost: true,
            },
          },
        },
        orderBy: {
          createdAt: 'asc',
        },
        // Sin transformer custom aquí, lo haremos manualmente después
      });

      // Aplicamos la transformación manual para calcular totales
      const transformedData: SummaryWarehouseData[] = paginatedResult.data.map(
        (warehouse) => ({
          id: warehouse.id,
          type: warehouse.type,
          code: warehouse.code,
          quantityProducts: warehouse.stock.reduce(
            (sum, item) => sum + (item.quantity || 0),
            0,
          ),
          totalCost: warehouse.stock.reduce(
            (sum, item) => sum + (item.totalCost || 0),
            0,
          ),
        }),
      );

      // Devolvemos la respuesta paginada con los datos transformados
      return {
        data: transformedData,
        meta: paginatedResult.meta,
      };
    } catch (error) {
      this.logger.error('Error getting paginated warehouses', error.stack);
      handleException(error, 'Error getting paginated warehouses');
    }
  }

  /**
   * Obtiene un almacén por su identificador
   * @param id Identificador del almacén
   * @returns Datos del almacén
   */
  async findOne(id: string, movementId?: string): Promise<WarehouseData> {
    try {
      if (movementId) {
        // Lógica para manejar valuationId si es necesario
        return await this.findById(id, movementId);
      }
      return await this.findById(id);
    } catch (error) {
      this.logger.error('Error get warehouse');
      if (error instanceof BadRequestException) {
        throw error;
      }
      handleException(error, 'Error get warehouse');
    }
  }

  /**
   * Obtiene un almacén por su identificador con validación
   * @param id Identificador del almacén
   * @param movementId Identificador del movimiento, solo es necesario para salidas
   * @returns Datos completos del almacén con su stock
   */
  async findById(id: string, movementId?: string): Promise<WarehouseData> {
    let warehouse = await this.prisma.warehouse.findUnique({
      where: { id },
      select: {
        id: true,
        type: true,
        code: true,
        stock: {
          select: {
            id: true,
            quantity: true,
            unitCost: true,
            totalCost: true,
            product: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
          },
        },
      },
    });

    if (!warehouse) {
      throw new NotFoundException('Warehouse not found');
    }

    // Modificamos el warehouse para ajustar la unidad según needConvert
    warehouse = {
      ...warehouse,
      stock: warehouse.stock.map((stockItem) => ({
        ...stockItem,
        product: {
          ...stockItem.product,
        },
      })),
    };

    if (movementId) {
      const movement = await this.movementsService.findById(movementId);

      if (movement.type === 'OUTPUT') {
        // Mantener la lógica original para movimientos OUTPUT
        warehouse = {
          ...warehouse,
          stock: warehouse.stock.map((stockItem) => {
            const movementDetail = movement.movementsDetail.find(
              (detail) => detail.product.id === stockItem.product.id,
            );
            if (movementDetail) {
              return {
                ...stockItem,
                quantity: stockItem.quantity + movementDetail.quantity,
              };
            }
            return stockItem;
          }),
        };
      }
    }

    return warehouse as WarehouseData;
  }

  /**
   * Obtiene el stock de un almacén filtrado por tipo de producto
   * @param type Tipo de producto a buscar
   * @returns Lista de datos de stock filtrados por tipo de producto
   */
  async findProductsStockByType(type: ProductType): Promise<StockData[]> {
    const warehouse = await this.prisma.warehouse.findFirst({
      where: { type },
      select: {
        stock: {
          select: {
            id: true,
            quantity: true,
            unitCost: true,
            totalCost: true,
            product: {
              select: {
                id: true,
                name: true,
                type: true,
                code: true,
                unitCost: true,
              },
            },
          },
        },
      },
    });

    if (!warehouse) {
      throw new NotFoundException('Warehouse not found');
    }

    // Devuelve directamente el array de StockData
    return warehouse.stock;
  }
}
