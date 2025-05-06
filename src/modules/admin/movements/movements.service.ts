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
      const warehouseDB = await this.warehouseService.findById(warehouseId);
      let newQuantity;
      let newTotalCost;
      let subtotal;
      let averageUnitCost;
      await Promise.all(
        movementDetail.map(async (detail) => {
          const stockItem = warehouseDB.stock.find(
            (item) => item.product.id === detail.productId,
          );

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
              await this.prisma.audit.create({
                data: {
                  action: AuditActionType.UPDATE,
                  entityId: stockMovement.id,
                  entityType: 'stock',
                  performedById: user.id,
                },
              });
            } else {
              subtotal = detail.quantity * detail.unitCost;
              averageUnitCost = parseFloat(
                (subtotal / detail.quantity).toFixed(4),
              );
              // Si el recurso no existe en el stock, crear un nuevo registro de stock
              const stockMovement = await prisma.stock.create({
                data: {
                  warehouseId,
                  productId: detail.productId,
                  quantity: detail.quantity,
                  unitCost: averageUnitCost,
                  totalCost: detail.quantity * detail.unitCost,
                },
              });
              await this.prisma.audit.create({
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
              await this.prisma.audit.create({
                data: {
                  action: AuditActionType.UPDATE,
                  entityId: stockMovement.id,
                  entityType: 'stock',
                  performedById: user.id,
                },
              });
            }
          }
        }),
      );
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
    const warehouseDB = await this.warehouseService.findById(warehouseId);
    // Transacción para asegurar atomicidad
    await this.prisma.$transaction(async (tx) => {
      await Promise.all(
        movementDetail.map(async (detail) => {
          const stockItem = warehouseDB.stock.find(
            (item) => item.product.id === detail.productId,
          );

          let newQuantity: number;
          let newTotalCost: number;
          let newAverageUnitCost: number;
          let subtotal: number;

          if (stockItem) {
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
        }),
      );
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
            product: {
              select: {
                id: true,
                name: true,
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
      movementsDetail: movement.movementsDetail,
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
    warehouseId: string,
    movementsId: string,
    user: UserData,
  ) {
    const currentDetailMap = new Map(
      currentDetails.map((d) => [d.product.id, d]),
    );

    // Procesar los nuevos detalles (que son nuevos o modificados)
    for (const detail of newDetails) {
      const existingDetail = currentDetailMap.get(detail.productId);

      if (existingDetail) {
        // Si existe el detalle, verificar si hubo cambios
        const isQuantityChanged = detail.quantity !== existingDetail.quantity;
        const isUnitCostChanged = detail.unitCost !== existingDetail.unitCost;
        const isTypeChanged = type !== currentType;

        if (isQuantityChanged || isUnitCostChanged || isTypeChanged) {
          // Si hay cambios, revertir el detalle en el stock
          await this.revertStockChanges(
            [
              {
                productId: detail.productId,
                quantity: existingDetail.quantity,
                unitCost: existingDetail.unitCost,
              },
            ],
            currentType,
            warehouseId,
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

            // Luego aplicar los nuevos cambios al stock
            await this.processMovementDetail(
              [
                {
                  productId: detail.productId,
                  quantity: detail.quantity,
                  unitCost: detail.unitCost,
                },
              ],
              type,
              warehouseId,
              user,
            );
          }
        }

        // Eliminar el detalle de la lista de detalles existentes
        currentDetailMap.delete(detail.productId);
      } else {
        // Crear el detalle
        await this.prisma.movementsDetail.create({
          data: {
            quantity: detail.quantity,
            unitCost: detail.unitCost,
            subtotal: detail.quantity * detail.unitCost,
            productId: detail.productId,
            movementsId: movementsId,
          },
        });

        // Aplicar los cambios al stock
        await this.processMovementDetail(
          [
            {
              productId: detail.productId,
              quantity: detail.quantity,
              unitCost: detail.unitCost,
            },
          ],
          type,
          warehouseId,
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
        type,
        warehouseId,
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
}
