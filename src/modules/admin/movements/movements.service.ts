import {
  BadRequestException,
  forwardRef,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CreateMovementDto } from './dto/create-movement.dto';
import { UpdateMovementDto } from './dto/update-movement.dto';
import { WarehouseService } from '../warehouse/warehouse.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { ProductService } from '../product/product.service';
import { AuditActionType, TypeMovements } from '@prisma/client';
import { CreateMovementDetailDto } from './dto/create-movement-detail.dto';
import {
  HttpResponse,
  MovementsData,
  MovementsDetailData,
  SummaryMovementsData,
  UserData,
} from 'src/interfaces';
import { handleException } from 'src/utils';
import { PaginatedResponse } from 'src/utils/paginated-response/PaginatedResponse.dto';
import { PaginationService } from 'src/pagination/pagination.service';
import { UpdateMovementDetailDto } from './dto/update-movement-detail.dto';
import { UpdatePaymentDetailDto } from '../payments/dto/update-payment-detail.dto';

@Injectable()
export class MovementsService {
  private readonly logger = new Logger(MovementsService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly productService: ProductService,
    @Inject(forwardRef(() => WarehouseService))
    private readonly warehouseService: WarehouseService,
    private readonly paginationService: PaginationService,
  ) {}

  /**
   * Genera un código único para el movimiento
   * @returns Código único para el movimiento
   */
  private async generateCodeMovement(): Promise<string> {
    const currentYear = new Date().getFullYear();
    const prefix = `MV-${currentYear}-`;

    let lastIncrement = 0;
    let movementCode = '';
    let isUnique = false;

    while (!isUnique) {
      const lastMovement = await this.prisma.movements.findFirst({
        where: { codeUnique: { startsWith: prefix } },
        orderBy: { codeUnique: 'desc' },
      });

      if (lastMovement && lastMovement.codeUnique.split('.').length === 3) {
        lastIncrement = parseInt(lastMovement.codeUnique.split('.')[2], 10);
      }

      movementCode = `${prefix}${String(lastIncrement + 1).padStart(3, '0')}`;

      const existingMovement = await this.prisma.movements.findUnique({
        where: { codeUnique: movementCode },
      });

      if (!existingMovement) {
        isUnique = true;
      } else {
        lastIncrement++;
      }
    }

    return movementCode;
  }

  /**
   * Valida el stock de los recursos en el almacén
   * @param type Tipo de movimiento
   * @param warehouseDb Datos del almacén
   * @param movementDetail Detalles del movimiento
   */
  async validateStock(
    type: TypeMovements,
    warehouseID: string,
    movementDetail: CreateMovementDetailDto[],
  ): Promise<void> {
    const warehouseDB = await this.warehouseService.findById(warehouseID);

    if (type === TypeMovements.OUTPUT) {
      for (const detail of movementDetail) {
        const stockItem = warehouseDB.stock.find(
          (item) => item.product.id === detail.productId,
        );

        if (!stockItem) {
          throw new BadRequestException(
            `There is no resource in the warehouse`,
          );
        }

        const stockToValidate = stockItem.quantity;

        if (stockToValidate < detail.quantity) {
          throw new BadRequestException(
            `Review the stock of resources. There are insufficient resources`,
          );
        }
      }
    }
  }
  /**
   * Procesa los detalles del movimiento
   * @param movementDetail Detalles del movimiento
   * @param type Tipo de movimiento
   * @param warehouseId Id del almacén
   * @param warehouseDB Datos del almacén
   * @param user Usuario que realiza la acción
   */
  async processMovementDetail(
    movementDetail: CreateMovementDetailDto[],
    type: TypeMovements,
    warehouseId: string,
    user: UserData,
  ) {
    return await this.prisma.$transaction(async (prisma) => {
      // Mostrar info inicial del almacén para referencia
      await this.warehouseService.findById(warehouseId);

      // Procesamiento SECUENCIAL de detalles
      for (const detail of movementDetail) {
        // Consultar el stock actualizado DIRECTAMENTE desde la base de datos usando prisma
        const stockItem = await prisma.stock.findFirst({
          where: {
            warehouseId: warehouseId,
            productId: detail.productId,
          },
          include: {
            product: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        });

        let newQuantity;
        let newTotalCost;
        let subtotal;
        let averageUnitCost;

        if (type === TypeMovements.INPUT) {
          if (stockItem) {
            newQuantity = stockItem.quantity + detail.quantity;
            subtotal = detail.quantity * detail.unitCost;
            newTotalCost = parseFloat(
              (stockItem.totalCost + subtotal).toFixed(4),
            );
            averageUnitCost = parseFloat(
              (newTotalCost / newQuantity).toFixed(4),
            );

            // Si el recurso existe en el stock, sumar la cantidad
            const stockMovement = await prisma.stock.update({
              where: {
                id: stockItem.id,
              },
              data: {
                quantity: newQuantity,
                totalCost: newTotalCost,
                unitCost: averageUnitCost,
              },
            });
            await prisma.audit.create({
              data: {
                action: AuditActionType.UPDATE,
                entityId: stockMovement.id,
                entityType: 'stock',
                performedById: user.id,
              },
            });
          } else {
            // Crear nuevo stock si no existe
            subtotal = detail.quantity * detail.unitCost;
            averageUnitCost = parseFloat(
              (subtotal / detail.quantity).toFixed(4),
            );

            const stockMovement = await prisma.stock.create({
              data: {
                warehouseId,
                productId: detail.productId,
                quantity: detail.quantity,
                unitCost: averageUnitCost,
                totalCost: subtotal,
              },
            });
            await prisma.audit.create({
              data: {
                action: AuditActionType.CREATE,
                entityId: stockMovement.id,
                entityType: 'stock',
                performedById: user.id,
              },
            });
          }
        } else if (type === TypeMovements.OUTPUT) {
          if (stockItem) {
            newQuantity = stockItem.quantity - detail.quantity;
            subtotal = detail.quantity * stockItem.unitCost;

            if (newQuantity === 0) {
              newTotalCost = 0;
              averageUnitCost = 0;
            } else {
              newTotalCost = parseFloat(
                (stockItem.totalCost - subtotal).toFixed(4),
              );
            }

            // Si el recurso existe en el stock, restar la cantidad
            const stockUpdateData: {
              quantity: number;
              totalCost: number;
              unitCost?: number;
            } = {
              quantity: newQuantity,
              totalCost: newTotalCost,
            };

            if (newQuantity === 0) {
              stockUpdateData.unitCost = averageUnitCost;
            }

            const stockMovement = await prisma.stock.update({
              where: {
                id: stockItem.id,
              },
              data: stockUpdateData,
            });

            await prisma.audit.create({
              data: {
                action: AuditActionType.UPDATE,
                entityId: stockMovement.id,
                entityType: 'stock',
                performedById: user.id,
              },
            });
          }
        }
      }
    });
  }

  /**
   * Revierte los cambios en el stock de los recursos
   * @param movementDetail Detalles del movimiento
   * @param type Tipo de movimiento
   * @param warehouseId Id del almacén
   */
  async revertStockChanges(
    movementDetail: CreateMovementDetailDto[],
    type: TypeMovements,
    warehouseId: string,
  ) {
    // Transacción para asegurar atomicidad
    await this.prisma.$transaction(async (tx) => {
      // Procesar SECUENCIALMENTE (en lugar de Promise.all)
      for (const detail of movementDetail) {
        // Consultar el stock actualizado DIRECTAMENTE desde la base de datos para cada detalle
        const stockItem = await tx.stock.findFirst({
          where: {
            warehouseId: warehouseId,
            productId: detail.productId,
          },
          include: {
            product: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        });

        if (stockItem) {
          let newQuantity: number;
          let newTotalCost: number;
          let newAverageUnitCost: number;
          let subtotal: number;

          if (type === TypeMovements.INPUT) {
            // Revertir un INPUT implica restar la cantidad y el costo
            newQuantity = stockItem.quantity - detail.quantity;
            subtotal = parseFloat(
              (detail.quantity * detail.unitCost).toFixed(4),
            );

            if (newQuantity === 0) {
              newTotalCost = 0;
              newAverageUnitCost = 0;
            } else {
              newTotalCost = parseFloat(
                (stockItem.totalCost - subtotal).toFixed(4),
              );
              newAverageUnitCost = parseFloat(
                (newTotalCost / newQuantity).toFixed(4),
              );
            }
          } else if (type === TypeMovements.OUTPUT) {
            // Revertir un OUTPUT implica sumar la cantidad y el costo
            newQuantity = stockItem.quantity + detail.quantity;
            subtotal = parseFloat(
              (detail.quantity * detail.unitCost).toFixed(4),
            );
            newTotalCost = parseFloat(
              (stockItem.totalCost + subtotal).toFixed(4),
            );
            newAverageUnitCost = parseFloat(
              (newTotalCost / newQuantity).toFixed(4),
            );
          }

          await tx.stock.update({
            where: { id: stockItem.id },
            data: {
              quantity: newQuantity,
              totalCost: newTotalCost,
              unitCost: newAverageUnitCost,
            },
          });
        }
      }
    });
  }

  /**
   * Crea un nuevo movimiento
   * @param createMovementDto Datos del movimiento a crear
   * @param user Usuario que realiza la acción
   * @returns Datos del movimiento creado
   */
  async create(
    createMovementDto: CreateMovementDto,
    user: UserData,
  ): Promise<HttpResponse<MovementsData>> {
    const {
      dateMovement,
      description,
      warehouseId,
      movementDetail,
      typePurchaseOrder,
      documentNumber,
    } = createMovementDto;
    const { type } = createMovementDto;
    let newMovement;

    try {
      // Verificar que el almacén existe
      const warehouseDB = await this.warehouseService.findById(warehouseId);

      // Generar el código de la orden de compra
      const movementCode = await this.generateCodeMovement();

      // Verificar que los recursos existen y son del tipo Supplies
      await Promise.all(
        movementDetail.map(async (detail) => {
          await this.productService.findById(detail.productId);
        }),
      );

      // Validar el stock de todos los recursos
      await this.validateStock(type, warehouseDB.id, movementDetail);

      // Crear el movimiento
      newMovement = await this.prisma.movements.create({
        data: {
          dateMovement,
          codeUnique: movementCode,
          warehouse: {
            connect: { id: warehouseId },
          },
          type,
          description,
          ...(type === TypeMovements.INPUT && {
            ...(typePurchaseOrder && { typePurchaseOrder }),
            ...(documentNumber && { documentNumber }),
          }),
        },
        select: {
          id: true,
          dateMovement: true,
          codeUnique: true,
          type: true,
          description: true,
          warehouse: {
            select: {
              id: true,
            },
          },
          typePurchaseOrder: true,
          documentNumber: true,
        },
      });

      // Crear los detalles del movimiento
      const newMovementsDetails = await Promise.all(
        movementDetail.map(async (detail) => {
          const movementsDetail = await this.prisma.movementsDetail.create({
            data: {
              quantity: detail.quantity,
              unitCost: detail.unitCost,
              subtotal: detail.quantity * detail.unitCost,
              productId: detail.productId,
              movementsId: newMovement.id,
            },
            select: {
              id: true,
              quantity: true,
              unitCost: true,
              subtotal: true,
              product: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          });
          await this.prisma.audit.create({
            data: {
              action: AuditActionType.CREATE,
              entityId: movementsDetail.id,
              entityType: 'movementsDetail',
              performedById: user.id,
            },
          });
          return movementsDetail;
        }),
      );

      if (movementDetail) {
        await this.processMovementDetail(
          movementDetail,
          type,
          warehouseId,
          user,
        );
      }

      // Registrar la auditoría
      await this.prisma.audit.create({
        data: {
          action: AuditActionType.CREATE,
          entityId: newMovement.id,
          entityType: 'movements',
          performedById: user.id,
        },
      });

      const responseData: MovementsData = {
        id: newMovement.id,
        dateMovement: newMovement.dateMovement,
        codeUnique: newMovement.codeUnique,
        warehouse: newMovement.warehouse,
        type: newMovement.type,
        description: newMovement.description,
        movementsDetail: newMovementsDetails,
        ...(type === TypeMovements.INPUT && {
          typePurchaseOrder: newMovement.typePurchaseOrder,
          documentNumber: newMovement.documentNumber,
        }),
      };

      return {
        statusCode: HttpStatus.CREATED,
        message: 'Movement successfully created',
        data: responseData,
      };
    } catch (error) {
      this.logger.error(
        `Error creating movement: ${error.message}`,
        error.stack,
      );

      if (newMovement) {
        await this.prisma.movementsDetail.deleteMany({
          where: { movementsId: newMovement.id },
        });
        await this.prisma.movements.delete({
          where: { id: newMovement.id },
        });
        if (movementDetail) {
          await this.revertStockChanges(movementDetail, type, warehouseId);
        }

        this.logger.error(
          `Movement has been deleted due to error in creation.`,
        );
      }

      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      handleException(error, 'Error creating a movement');
    }
  }

  /**
   * Busca todos los movimientos
   * @returns Todos los movimientos
   */
  async findAll(): Promise<SummaryMovementsData[]> {
    try {
      const movements = await this.prisma.movements.findMany({
        select: {
          id: true,
          codeUnique: true,
          dateMovement: true,
          type: true,
          description: true,
          warehouse: {
            select: {
              id: true,
              type: true,
            },
          },
          typePurchaseOrder: true,
          documentNumber: true,
        },
        orderBy: {
          createdAt: 'asc',
        },
      });

      // Mapea los resultados al tipo SummaryMovementsData
      const summaryMovements = await Promise.all(
        movements.map(async (movement) => {
          return {
            id: movement.id,
            codeUnique: movement.codeUnique,
            dateMovement: movement.dateMovement,
            type: movement.type,
            description: movement.description,
            warehouse: movement.warehouse,
            ...(movement.type === TypeMovements.INPUT && {
              typePurchaseOrder: movement.typePurchaseOrder,
              documentNumber: movement.documentNumber,
            }),
          };
        }),
      );

      return summaryMovements as SummaryMovementsData[];
    } catch (error) {
      this.logger.error('Error getting all movements');
      handleException(error, 'Error getting all purchase movements');
    }
  }

  /**
   * Busca los movimientos por su tipo de forma paginada
   * @param type Tipo de movimiento (INPUT o OUTPUT)
   * @param options Opciones de paginación (página y tamaño de página)
   * @returns Lista paginada de movimientos por tipo
   */
  async findByType(
    type: TypeMovements,
    options: { page: number; pageSize: number },
  ): Promise<PaginatedResponse<SummaryMovementsData>> {
    try {
      const { page, pageSize } = options;

      // Usar el servicio de paginación para consultar los datos
      return await this.paginationService.paginate<any, SummaryMovementsData>({
        model: 'movements',
        page,
        pageSize,
        where: { type },
        select: {
          id: true,
          codeUnique: true,
          dateMovement: true,
          type: true,
          description: true,
          warehouse: {
            select: {
              id: true,
              type: true,
            },
          },
          typePurchaseOrder: true,
          documentNumber: true,
          movementsDetail: {
            select: {
              id: true,
              paymentDetail: {
                select: {
                  id: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        transformer: (movement) => ({
          id: movement.id,
          codeUnique: movement.codeUnique,
          typeProduct: movement.warehouse.type,
          dateMovement: movement.dateMovement,
          type: movement.type,
          description: movement.description,
          warehouse: movement.warehouse,
          hasPaymentAssigned: movement.movementsDetail.some(
            (detail) => detail.paymentDetail && detail.paymentDetail.length > 0,
          ),
          ...(movement.type === TypeMovements.INPUT && {
            ...(movement.typePurchaseOrder && {
              typePurchaseOrder: movement.typePurchaseOrder,
            }),
            ...(movement.documentNumber && {
              documentNumber: movement.documentNumber,
            }),
          }),
        }),
      });
    } catch (error) {
      this.logger.error(
        'Error getting paginated movements by type',
        error.stack,
      );
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      handleException(error, 'Error getting paginated movements by type');
    }
  }

  /**
   * Busca un movimiento por su id
   * @param id Id del movimiento
   * @returns Datos del movimiento
   */
  async findOne(id: string): Promise<MovementsData> {
    try {
      return await this.findById(id);
    } catch (error) {
      this.logger.error('Error get movement');
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      handleException(error, 'Error get movement');
    }
  }

  /**
   * Busca un movimiento por su id con validación
   * @param id Id del movimiento
   * @returns Datos del movimiento
   */
  async findById(id: string): Promise<MovementsData> {
    const movement = await this.prisma.movements.findUnique({
      where: { id },
      select: {
        id: true,
        codeUnique: true,
        dateMovement: true,
        type: true,
        description: true,
        warehouse: {
          select: {
            id: true,
            type: true,
          },
        },
        documentNumber: true,
        typePurchaseOrder: true,
        movementsDetail: {
          select: {
            id: true,
            quantity: true,
            unitCost: true,
            subtotal: true,
            paymentDetail: {
              select: {
                id: true,
              },
            },
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

    if (!movement) {
      throw new NotFoundException('Movement not found');
    }

    return {
      id: movement.id,
      codeUnique: movement.codeUnique,
      dateMovement: movement.dateMovement,
      type: movement.type,
      description: movement.description,
      warehouse: movement.warehouse,
      ...(movement.type === TypeMovements.INPUT && {
        ...(movement.typePurchaseOrder && {
          typePurchaseOrder: movement.typePurchaseOrder,
        }),
        ...(movement.documentNumber && {
          documentNumber: movement.documentNumber,
        }),
      }),
      movementsDetail: movement.movementsDetail.map((detail) => ({
        ...detail,
        paymentDetail: detail.paymentDetail?.[0] || undefined,
      })),
    };
  }

  /**
   * Actualiza un movimiento
   * @param id Id del movimiento
   * @param updateMovementDto Datos del movimiento a actualizar
   * @param user Usuario que realiza la acción
   * @param isFromPurchaseOrder Indica que la función es llamada desde una orden de compra
   * @returns Datos del movimiento actualizado
   */
  async update(
    id: string,
    updateMovementDto: UpdateMovementDto,
    user: UserData,
  ): Promise<HttpResponse<MovementsData>> {
    let existingMovement: MovementsData;
    // Desestructurar los datos actuales y nuevos
    const {
      dateMovement,
      description,
      warehouseId,
      movementDetail = [],
      type,
      documentNumber,
      typePurchaseOrder,
      hasPaymentReceipt,
    } = updateMovementDto;
    try {
      // Buscar el movimiento existente
      existingMovement = await this.findById(id);
      const warehouseDB = await this.warehouseService.findById(
        existingMovement.warehouse.id,
      );

      const {
        dateMovement: currentDateMovement,
        description: currentDescription,
        warehouse: currentWarehouse,
        type: currentType,
        movementsDetail: currentDetails,
      } = existingMovement;

      // Validar si hay cambios en la cabecera
      const headerChanges =
        dateMovement !== currentDateMovement ||
        description !== currentDescription ||
        warehouseId !== currentWarehouse.id ||
        type !== currentType ||
        documentNumber !== existingMovement.documentNumber ||
        typePurchaseOrder !== existingMovement.typePurchaseOrder;

      const detailChanges = this.detectDetailChanges(
        currentDetails,
        movementDetail,
      );

      // Si no hay cambios en la cabecera ni en los detalles, retornar
      if (!headerChanges && !detailChanges) {
        return {
          statusCode: HttpStatus.OK,
          message: 'Movement successfully updated',
          data: existingMovement,
        };
      }

      // Validar cambios en el stock si se cambia el tipo de movimiento
      if (type && type !== currentType) {
        if (
          currentType === TypeMovements.INPUT &&
          type === TypeMovements.OUTPUT
        ) {
          // Validar stock como si fuera un OUTPUT
          await this.validateStock(type, warehouseDB.id, movementDetail);
        }
      }

      // Procesar cambios en los detalles del movimiento
      await this.processDetailChanges(
        currentDetails,
        movementDetail,
        type || currentType,
        currentType,
        currentWarehouse.id,
        id,
        user,
        warehouseId !== currentWarehouse.id ? warehouseId : undefined,
      );
      // Actualizar la cabecera si hubo cambios
      if (headerChanges) {
        const updateData: any = {
          dateMovement,
          description,
          type,
          warehouse: warehouseId ? { connect: { id: warehouseId } } : undefined,
        };

        // Solo procesar hasPaymentReceipt para movimientos de tipo INPUT
        if (type === TypeMovements.INPUT) {
          if (hasPaymentReceipt === false) {
            // Si es false, establecer explícitamente como null
            updateData.typePurchaseOrder = null;
            updateData.documentNumber = null;
          } else if (hasPaymentReceipt !== null) {
            // Si no es null, actualizar con los nuevos valores
            if (typePurchaseOrder)
              updateData.typePurchaseOrder = typePurchaseOrder;
            if (documentNumber) updateData.documentNumber = documentNumber;
          }
          // Si hasPaymentReceipt es null, no modificar estos campos
        }

        await this.prisma.movements.update({
          where: { id },
          data: updateData,
        });
      }

      // Registrar la auditoría
      await this.prisma.audit.create({
        data: {
          action: AuditActionType.UPDATE,
          entityId: id,
          entityType: 'movements',
          performedById: user.id,
        },
      });

      // Obtener los datos actualizados del movimiento
      const updatedMovement = await this.findById(id);

      return {
        statusCode: HttpStatus.OK,
        message: 'Movement successfully updated',
        data: updatedMovement,
      };
    } catch (error) {
      this.logger.error('Error updating movement', error.stack);

      // Revertir cambios en el stock
      if (movementDetail && existingMovement) {
        const currentDetails = existingMovement.movementsDetail.map((d) => ({
          productId: d.product.id,
          quantity: d.quantity,
          unitCost: d.unitCost,
        }));
        const typeToRevert =
          type && type !== existingMovement.type ? type : existingMovement.type;
        await this.revertStockChanges(
          currentDetails,
          typeToRevert === TypeMovements.INPUT
            ? TypeMovements.OUTPUT
            : TypeMovements.INPUT,
          existingMovement.warehouse.id,
        );
      }

      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      handleException(error, 'Error updating a movement');
    }
  }

  /**
   * Actualiza un detalle de movimiento específico
   * @param id ID del detalle de movimiento a actualizar
   * @param updateDetailDto Datos para la actualización del detalle
   * @param user Usuario que realiza la acción
   * @param movementDate Fecha opcional para actualizar el movimiento principal
   * @returns HttpResponse con los datos del detalle actualizado
   */
  async updateMovementDetail(
    id: string,
    updateDetailDto: UpdateMovementDetailDto,
    user: UserData,
    movementDate?: string,
  ): Promise<HttpResponse<MovementsDetailData>> {
    try {
      // 1. Buscar el detalle de movimiento actual
      const currentDetail = await this.prisma.movementsDetail.findUnique({
        where: { id },
        include: {
          movements: {
            select: {
              id: true,
              type: true,
              warehouseId: true,
              dateMovement: true,
            },
          },
          product: {
            select: {
              id: true,
              name: true,
            },
          },
          paymentDetail: {
            select: {
              id: true,
            },
          },
        },
      });

      if (!currentDetail) {
        throw new NotFoundException('Movement detail not found');
      }

      // 2. Extraer datos actuales y comprobar si hay cambios
      const { quantity: currentQuantity, unitCost: currentUnitCost } =
        currentDetail;
      const {
        quantity = currentQuantity,
        unitCost = currentUnitCost,
        productId,
      } = updateDetailDto;

      const isQuantityChanged = quantity !== currentQuantity;
      const isUnitCostChanged = unitCost !== currentUnitCost;
      const isProductChanged =
        productId && productId !== currentDetail.productId;
      const isMovementDateChanged =
        movementDate && movementDate !== currentDetail.movements.dateMovement;

      // Si no hay cambios en el detalle ni en la fecha, retornar los datos actuales
      if (
        !isQuantityChanged &&
        !isUnitCostChanged &&
        !isProductChanged &&
        !isMovementDateChanged
      ) {
        const responseData: MovementsDetailData = {
          id: currentDetail.id,
          quantity: currentDetail.quantity,
          unitCost: currentDetail.unitCost,
          subtotal: currentDetail.subtotal,
          product: {
            id: currentDetail.product.id,
            name: currentDetail.product.name,
          },
          paymentDetail: currentDetail.paymentDetail?.[0],
        };

        return {
          statusCode: HttpStatus.OK,
          message: 'No changes detected in movement detail or movement',
          data: responseData,
        };
      }

      // 3. Si hay cambio de producto, verificar que el nuevo producto existe
      if (isProductChanged) {
        await this.productService.findById(productId);
      }

      // 4. Actualizar la fecha del movimiento principal si se proporciona
      if (isMovementDateChanged) {
        await this.prisma.movements.update({
          where: { id: currentDetail.movements.id },
          data: { dateMovement: movementDate },
        });

        // Registrar auditoría para la actualización del movimiento
        await this.prisma.audit.create({
          data: {
            action: AuditActionType.UPDATE,
            entityId: currentDetail.movements.id,
            entityType: 'movements',
            performedById: user.id,
          },
        });
      }

      // Si solo se cambió la fecha y no hay cambios en el detalle, retornar
      if (!isQuantityChanged && !isUnitCostChanged && !isProductChanged) {
        const responseData: MovementsDetailData = {
          id: currentDetail.id,
          quantity: currentDetail.quantity,
          unitCost: currentDetail.unitCost,
          subtotal: currentDetail.subtotal,
          product: {
            id: currentDetail.product.id,
            name: currentDetail.product.name,
          },
          paymentDetail: currentDetail.paymentDetail?.[0],
        };

        return {
          statusCode: HttpStatus.OK,
          message: 'Only movement date was updated',
          data: responseData,
        };
      }

      // 5. Revertir el efecto del detalle actual en el stock
      await this.revertStockChanges(
        [
          {
            productId: currentDetail.productId,
            quantity: currentQuantity,
            unitCost: currentUnitCost,
          },
        ],
        currentDetail.movements.type,
        currentDetail.movements.warehouseId,
      );

      // 6. Actualizar el detalle de movimiento
      const updatedDetailRaw = await this.prisma.movementsDetail.update({
        where: { id },
        data: {
          quantity,
          unitCost,
          subtotal: quantity * unitCost,
          ...(isProductChanged && { productId }),
        },
        include: {
          product: {
            select: {
              id: true,
              name: true,
            },
          },
          movements: {
            select: {
              id: true,
              codeUnique: true,
              type: true,
              dateMovement: true,
            },
          },
          paymentDetail: {
            select: {
              id: true,
            },
          },
        },
      });

      // Transformar la respuesta al tipo correcto
      const updatedDetail: MovementsDetailData = {
        id: updatedDetailRaw.id,
        quantity: updatedDetailRaw.quantity,
        unitCost: updatedDetailRaw.unitCost,
        subtotal: updatedDetailRaw.subtotal,
        product: {
          id: updatedDetailRaw.product.id,
          name: updatedDetailRaw.product.name,
        },
        paymentDetail: updatedDetailRaw.paymentDetail?.[0],
      };

      // 7. Aplicar el nuevo efecto en el stock
      await this.processMovementDetail(
        [
          {
            productId: isProductChanged ? productId : currentDetail.productId,
            quantity,
            unitCost,
          },
        ],
        currentDetail.movements.type,
        currentDetail.movements.warehouseId,
        user,
      );

      // 8. Registrar la auditoría para el detalle
      await this.prisma.audit.create({
        data: {
          action: AuditActionType.UPDATE,
          entityId: id,
          entityType: 'movementsDetail',
          performedById: user.id,
        },
      });

      return {
        statusCode: HttpStatus.OK,
        message: isMovementDateChanged
          ? 'Movement detail and movement date successfully updated'
          : 'Movement detail successfully updated',
        data: updatedDetail,
      };
    } catch (error) {
      this.logger.error('Error updating movement detail', error.stack);

      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      handleException(error, 'Error updating movement detail');
    }
  }

  /**
   * Gestiona la actualización de un detalle de pago con su detalle de movimiento asociado
   * @param movementDetailId ID del detalle de movimiento asociado al detalle de pago
   * @param updatePaymentDetailDto Datos de actualización del detalle de pago
   * @param user Usuario que realiza la acción
   * @returns El ID del detalle de movimiento resultante (puede ser el mismo u otro nuevo)
   */
  async handlePaymentDetailUpdate(
    movementDetailId: string,
    updatePaymentDetailDto: UpdatePaymentDetailDto,
    user: UserData,
  ): Promise<{ movementDetailId: string }> {
    try {
      // 1. Obtener el detalle de movimiento actual con su movimiento padre
      const currentMovementDetail =
        await this.prisma.movementsDetail.findUnique({
          where: { id: movementDetailId },
          include: {
            movements: {
              select: {
                id: true,
                dateMovement: true,
                type: true,
                warehouseId: true,
                description: true,
              },
            },
            product: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        });

      if (!currentMovementDetail) {
        throw new NotFoundException('Movement detail not found');
      }

      const currentMovement = currentMovementDetail.movements;
      const newPaymentDate = updatePaymentDetailDto.paymentDate;

      // Verificar si hay cambios en la fecha o en los detalles
      const isDateChanged =
        newPaymentDate && currentMovement.dateMovement !== newPaymentDate;

      // Preparar los datos para actualizar el detalle del movimiento
      const updateMovementDetailDto: UpdateMovementDetailDto = {};

      // Verificar cambios en el detalle del pago para mapearlos al detalle de movimiento
      if (updatePaymentDetailDto.quantity !== undefined) {
        updateMovementDetailDto.quantity = updatePaymentDetailDto.quantity;
      }

      if (updatePaymentDetailDto.unitPrice !== undefined) {
        updateMovementDetailDto.unitCost = updatePaymentDetailDto.unitPrice;
      }

      if (updatePaymentDetailDto.productId !== undefined) {
        updateMovementDetailDto.productId = updatePaymentDetailDto.productId;
      }

      const hasDetailChanges = Object.keys(updateMovementDetailDto).length > 0;

      // Si no hay cambios en la fecha ni en los detalles, simplemente retornamos el mismo ID
      if (!isDateChanged && !hasDetailChanges) {
        return { movementDetailId };
      }

      // 2. Verificar si el detalle de movimiento es el único en su movimiento
      const hasMoreDetails = await this.hasMoreDetails(movementDetailId);

      // 3. Casos de actualización

      // Caso 1: Solo hay cambios en los detalles (no en la fecha)
      if (!isDateChanged && hasDetailChanges) {
        // Actualizar el detalle del movimiento con los nuevos valores
        await this.updateMovementDetail(
          movementDetailId,
          updateMovementDetailDto,
          user,
        );
        return { movementDetailId };
      }

      // Caso 2: Hay cambio de fecha pero es el único detalle
      if (isDateChanged && !hasMoreDetails) {
        // Actualizar el detalle del movimiento y la fecha del movimiento
        await this.updateMovementDetail(
          movementDetailId,
          updateMovementDetailDto,
          user,
          newPaymentDate,
        );
        return { movementDetailId };
      }

      // Caso 3: Hay cambio de fecha y hay más detalles
      // En este caso necesitamos crear un nuevo movimiento y trasladar el detalle

      // 3.1 Guardar los datos necesarios antes de eliminar
      const { quantity, unitCost, productId } = currentMovementDetail;
      const { type, warehouseId, description } = currentMovement;

      // 3.2 Eliminar el detalle original usando removeMovementDetail para gestionar el stock
      await this.removeMovementDetail(movementDetailId, user);

      // 3.3 Crear un nuevo movimiento con la nueva fecha y su detalle
      // Aplicar los cambios de detalle si existen
      const newQuantity =
        updateMovementDetailDto.quantity !== undefined
          ? updateMovementDetailDto.quantity
          : quantity;
      const newUnitCost =
        updateMovementDetailDto.unitCost !== undefined
          ? updateMovementDetailDto.unitCost
          : unitCost;
      const newProductId =
        updateMovementDetailDto.productId !== undefined
          ? updateMovementDetailDto.productId
          : productId;

      const createMovementDto: CreateMovementDto = {
        dateMovement: newPaymentDate,
        type,
        warehouseId,
        description: `${description || 'Movimiento'} (Trasladado)`,
        movementDetail: [
          {
            quantity: newQuantity,
            unitCost: newUnitCost,
            productId: newProductId,
          },
        ],
      };

      const createdMovement = await this.create(createMovementDto, user);

      // 3.4 Obtener el ID del nuevo detalle de movimiento creado
      const newMovementDetailId = createdMovement.data.movementsDetail[0].id;

      // 3.5 Retornar el ID del nuevo detalle de movimiento
      return { movementDetailId: newMovementDetailId };
    } catch (error) {
      this.logger.error(
        `Error handling payment detail update: ${error.message}`,
        error.stack,
      );

      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      handleException(error, 'Error handling payment detail update');
    }
  }

  /**
   * Detecta cambios en los detalles del movimiento
   * @param currentDetails Detalles actuales del movimiento
   * @param newDetails Nuevos detalles del movimiento
   * @returns true si hay cambios, false si no
   */
  private detectDetailChanges(
    currentDetails: MovementsDetailData[],
    newDetails: CreateMovementDetailDto[],
  ): boolean {
    const currentDetailIds = new Set(
      currentDetails.map((d) => d.product?.id).filter((id) => id),
    );
    const newDetailIds = new Set(newDetails.map((d) => d.productId));

    // Detectar cambios en el conjunto de detalles
    return (
      currentDetails.some(
        (detail) =>
          !newDetails.some(
            (d) =>
              d.productId === detail.product?.id &&
              d.quantity === detail.quantity &&
              d.unitCost === detail.unitCost,
          ),
      ) ||
      currentDetails.length !== newDetails.length ||
      [...currentDetailIds].some((id) => !newDetailIds.has(id))
    );
  }

  /**
   * Procesa los cambios en los detalles del movimiento
   * @param currentDetails Detalles actuales del movimiento
   * @param newDetails Nuevos detalles del movimiento
   * @param type Tipo de movimiento
   * @param warehouseId Id del almacén
   * @param movementsId Id del movimiento
   * @param user Usuario que realiza la acción
   */
  private async processDetailChanges(
    currentDetails: MovementsDetailData[],
    newDetails: CreateMovementDetailDto[],
    type: TypeMovements,
    currentType: TypeMovements,
    currentWarehouseId: string,
    movementsId: string,
    user: UserData,
    newWarehouseId?: string, // Nuevo parámetro opcional para el almacén nuevo
  ) {
    const currentDetailMap = new Map(
      currentDetails.map((d) => [d.product.id, d]),
    );

    // Determinar el almacén a usar (el nuevo o el actual)
    const targetWarehouseId = newWarehouseId || currentWarehouseId;
    const isWarehouseChanged =
      newWarehouseId && newWarehouseId !== currentWarehouseId;

    // Procesar los nuevos detalles (que son nuevos o modificados)
    for (const detail of newDetails) {
      const existingDetail = currentDetailMap.get(detail.productId);

      if (existingDetail) {
        // Si existe el detalle, verificar si hubo cambios
        const isQuantityChanged = detail.quantity !== existingDetail.quantity;
        const isUnitCostChanged = detail.unitCost !== existingDetail.unitCost;
        const isTypeChanged = type !== currentType;

        if (
          isQuantityChanged ||
          isUnitCostChanged ||
          isTypeChanged ||
          isWarehouseChanged
        ) {
          // Si hay cambios, revertir el detalle en el almacén original
          await this.revertStockChanges(
            [
              {
                productId: detail.productId,
                quantity: existingDetail.quantity,
                unitCost: existingDetail.unitCost,
              },
            ],
            currentType,
            currentWarehouseId, // Siempre usar el almacén original para revertir
          );

          if (isQuantityChanged || isUnitCostChanged) {
            // Actualizar el detalle en la base de datos
            await this.prisma.movementsDetail.update({
              where: { id: existingDetail.id },
              data: {
                quantity: detail.quantity,
                unitCost: detail.unitCost,
                subtotal: detail.quantity * detail.unitCost,
              },
            });
          }

          // Aplicar los cambios al nuevo almacén (o al original si no cambió)
          await this.processMovementDetail(
            [
              {
                productId: detail.productId,
                quantity: detail.quantity,
                unitCost: detail.unitCost,
              },
            ],
            type,
            targetWarehouseId, // Usar el almacén destino
            user,
          );
        }

        // Eliminar el detalle de la lista de detalles existentes
        currentDetailMap.delete(detail.productId);
      } else {
        // Crear el detalle nuevo
        await this.prisma.movementsDetail.create({
          data: {
            quantity: detail.quantity,
            unitCost: detail.unitCost,
            subtotal: detail.quantity * detail.unitCost,
            productId: detail.productId,
            movementsId: movementsId,
          },
        });

        // Aplicar los cambios al stock en el almacén destino
        await this.processMovementDetail(
          [
            {
              productId: detail.productId,
              quantity: detail.quantity,
              unitCost: detail.unitCost,
            },
          ],
          type,
          targetWarehouseId, // Usar el almacén destino
          user,
        );
      }
    }

    // Eliminar los detalles que ya no están en los nuevos detalles
    for (const detail of currentDetailMap.values()) {
      // Primero revertir el stock antes de eliminar el detalle
      await this.revertStockChanges(
        [
          {
            productId: detail.product.id,
            quantity: detail.quantity,
            unitCost: detail.unitCost,
          },
        ],
        currentType, // Usar el tipo original para revertir
        currentWarehouseId, // Usar el almacén original para revertir
      );

      // Eliminar el detalle después de revertir los cambios de stock
      await this.prisma.movementsDetail.delete({
        where: { id: detail.id },
      });
    }
  }

  /**
   * Elimina un movimiento
   * @param id Id del movimiento
   * @param user Usuario que realiza la acción
   * @returns Datos del movimiento eliminado
   */
  async remove(
    id: string,
    user: UserData,
  ): Promise<HttpResponse<MovementsData>> {
    try {
      // Verificar que el movimiento existe
      const movement = await this.findById(id);

      // Verificar si algún detalle del movimiento tiene pagos asociados
      const hasPaymentDetails = movement.movementsDetail.some(
        (detail) => detail.paymentDetail,
      );
      if (hasPaymentDetails) {
        throw new BadRequestException(
          'No se puede eliminar este movimiento porque tiene pagos asociados',
        );
      }

      const oppositeType =
        movement.type === TypeMovements.INPUT
          ? TypeMovements.OUTPUT
          : TypeMovements.INPUT;

      // Validar el stock de los recursos solo una vez para ambos tipos
      await this.validateStock(
        oppositeType,
        movement.warehouse.id,
        movement.movementsDetail.map((d) => ({
          productId: d.product.id,
          quantity: d.quantity,
          unitCost: d.unitCost,
        })),
      );

      // Obtener los detalles del movimiento
      const movementsDetail: CreateMovementDetailDto[] =
        movement.movementsDetail.map((detail) => ({
          quantity: detail.quantity,
          unitCost: detail.unitCost,
          productId: detail.product.id,
        }));

      // Revertir los cambios en el stock de los recursos con el movimiento eliminado
      await this.revertStockChanges(
        movementsDetail,
        movement.type,
        movement.warehouse.id,
      );

      // Eliminar los detalles del movimiento
      await this.prisma.movementsDetail.deleteMany({
        where: { movementsId: movement.id },
      });

      // Eliminar el movimiento
      await this.prisma.movements.delete({ where: { id } });

      // Registrar la auditoría
      await this.prisma.audit.create({
        data: {
          action: AuditActionType.DELETE,
          entityId: movement.id,
          entityType: 'movements',
          performedById: user.id,
        },
      });

      return {
        statusCode: HttpStatus.OK,
        message: 'Movement successfully deleted',
        data: movement,
      };
    } catch (error) {
      this.logger.error('Error deleting movement');
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      handleException(error, 'Error deleting movement');
    }
  }

  /**
   * Elimina un detalle de movimiento específico
   * @param id ID del detalle de movimiento a eliminar
   * @param user Usuario que realiza la acción
   * @returns Mensaje de confirmación o datos del movimiento eliminado
   */
  async removeMovementDetail(
    id: string,
    user: UserData,
  ): Promise<HttpResponse<any>> {
    try {
      // 1. Buscar el detalle de movimiento por su ID
      const movementDetail = await this.prisma.movementsDetail.findUnique({
        where: { id },
        include: {
          movements: {
            select: {
              id: true,
              type: true,
              warehouseId: true,
            },
          },
          product: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      if (!movementDetail) {
        throw new NotFoundException('Movement detail not found');
      }

      // 2. Obtener el movimiento padre y verificar cuántos detalles tiene
      const movementId = movementDetail.movements.id;
      const remainingDetails = await this.prisma.movementsDetail.count({
        where: {
          movementsId: movementId,
          id: { not: id }, // Excluir el detalle actual
        },
      });

      // 3. Revertir el cambio en el stock para este detalle específico
      const detailToRevert: CreateMovementDetailDto = {
        productId: movementDetail.product.id,
        quantity: movementDetail.quantity,
        unitCost: movementDetail.unitCost,
      };

      await this.revertStockChanges(
        [detailToRevert], // Solo revertimos este detalle específico
        movementDetail.movements.type,
        movementDetail.movements.warehouseId,
      );

      // 4. Eliminar el detalle
      await this.prisma.movementsDetail.delete({
        where: { id },
      });

      // 5. Registrar auditoría para el detalle eliminado
      await this.prisma.audit.create({
        data: {
          action: AuditActionType.DELETE,
          entityId: id,
          entityType: 'movementsDetail',
          performedById: user.id,
        },
      });

      // 6. Si era el último detalle, eliminar el movimiento completo
      if (remainingDetails === 0) {
        const movement = await this.prisma.movements.delete({
          where: { id: movementId },
          select: {
            id: true,
            codeUnique: true,
            type: true,
            dateMovement: true,
          },
        });

        // Registrar auditoría para el movimiento eliminado
        await this.prisma.audit.create({
          data: {
            action: AuditActionType.DELETE,
            entityId: movementId,
            entityType: 'movements',
            performedById: user.id,
          },
        });

        return {
          statusCode: HttpStatus.OK,
          message:
            'Movement detail deleted and movement removed because it was the last detail',
          data: {
            detailId: id,
            movementRemoved: true,
            movement: {
              id: movement.id,
              codeUnique: movement.codeUnique,
            },
          },
        };
      }

      return {
        statusCode: HttpStatus.OK,
        message: 'Movement detail successfully deleted',
        data: {
          detailId: id,
          movementRemoved: false,
          movementId: movementId,
        },
      };
    } catch (error) {
      this.logger.error('Error deleting movement detail');

      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      handleException(error, 'Error deleting movement detail');
    }
  }

  /**
   * Verifica si un movimiento tiene más detalles además del detalle especificado
   * @param detailId ID del detalle de movimiento a evaluar
   * @returns Promesa de un booleano: true si hay más detalles, false si es el único
   */
  async hasMoreDetails(detailId: string): Promise<boolean> {
    try {
      // 1. Obtener el detalle de movimiento para identificar a qué movimiento pertenece
      const detail = await this.prisma.movementsDetail.findUnique({
        where: { id: detailId },
        select: {
          movementsId: true,
        },
      });

      if (!detail) {
        throw new NotFoundException('Movement detail not found');
      }

      // 2. Contar cuántos detalles tiene el movimiento excluyendo el detalle actual
      const count = await this.prisma.movementsDetail.count({
        where: {
          movementsId: detail.movementsId,
          id: { not: detailId }, // Excluir el detalle actual
        },
      });

      // 3. Retornar true si hay más detalles (count > 0), o false si es el único (count === 0)
      return count > 0;
    } catch (error) {
      this.logger.error(
        `Error checking if movement has more details: ${error.message}`,
        error.stack,
      );

      if (error instanceof NotFoundException) {
        throw error;
      }

      handleException(error, 'Error checking if movement has more details');
    }
  }

  /**
   * Actualiza la fecha de un movimiento usando el ID de un detalle de movimiento
   * @param movementDetailId ID del detalle de movimiento
   * @param movementDate Nueva fecha para el movimiento
   * @param user Usuario que realiza la acción
   * @returns HttpResponse con mensaje de confirmación
   */
  async updateMovementDateByDetail(
    movementDetailId: string,
    movementDate: string,
    user: UserData,
  ): Promise<HttpResponse<{ dateMovement: string }>> {
    try {
      // 1. Encontrar el detalle para obtener el ID del movimiento padre
      const movementDetail = await this.prisma.movementsDetail.findUnique({
        where: { id: movementDetailId },
        select: {
          movements: {
            select: {
              id: true,
              dateMovement: true,
            },
          },
        },
      });

      if (!movementDetail) {
        throw new NotFoundException('Movement detail not found');
      }

      const movementId = movementDetail.movements.id;
      const currentDate = movementDetail.movements.dateMovement;

      // 2. Verificar si la fecha actual es igual a la nueva fecha
      if (currentDate === movementDate) {
        return {
          statusCode: HttpStatus.OK,
          message: 'No changes in movement date',
          data: { dateMovement: currentDate },
        };
      }

      // 3. Actualizar la fecha del movimiento
      await this.prisma.movements.update({
        where: { id: movementId },
        data: { dateMovement: movementDate },
      });

      // 4. Registrar la auditoría
      await this.prisma.audit.create({
        data: {
          action: AuditActionType.UPDATE,
          entityId: movementId,
          entityType: 'movements',
          performedById: user.id,
        },
      });

      return {
        statusCode: HttpStatus.OK,
        message: 'Movement date successfully updated',
        data: { dateMovement: movementDate },
      };
    } catch (error) {
      this.logger.error(
        `Error updating movement date: ${error.message}`,
        error.stack,
      );

      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      handleException(error, 'Error updating movement date');
    }
  }
}
