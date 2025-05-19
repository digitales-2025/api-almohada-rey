import {
  BadRequestException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import {
  HttpResponse,
  PaymentData,
  PaymentDetailData,
  RoomPaymentDetailsData,
  SummaryPaymentData,
  SummaryWarehouseData,
  UserData,
} from 'src/interfaces';
import { PrismaService } from 'src/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { RoomService } from '../room/services/room.service';
import {
  AuditActionType,
  PaymentDetailStatus,
  PaymentDetailType,
  ProductType,
  ReservationStatus,
  TypeMovements,
} from '@prisma/client';
import { handleException } from 'src/utils';
import { ServiceService } from '../service/services/service.service';
import { CreateManyPaymentDetailDto } from './dto/create-many-payment-detail.dto';
import { ProductService } from '../product/product.service';
import { UpdatePaymentDetailDto } from './dto/update-payment-detail.dto';
import { validateArray, validateChanges } from 'src/prisma/src/utils';
import { UpdatePaymentDetailsBatchDto } from './dto/updatePaymentDetailsBatch.dto';
import { calculateStayNights } from 'src/utils/dates/peru-datetime';
import { PaginatedResponse } from 'src/utils/paginated-response/PaginatedResponse.dto';
import { PaginationService } from 'src/pagination/pagination.service';
import { MovementsService } from '../movements/movements.service';
import { CreateMovementDto } from '../movements/dto/create-movement.dto';
import { WarehouseService } from '../warehouse/warehouse.service';
import { LateCheckoutDto } from '../reservation/dto/late-checkout.dto';
import { ExtendStayDto } from '../reservation/dto/extend-stay.dto';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly roomService: RoomService,
    private readonly serviceService: ServiceService,
    private readonly productService: ProductService,
    private readonly movementsService: MovementsService,
    private readonly warehouseService: WarehouseService,
    private readonly paginationService: PaginationService,
  ) {}

  /**
   * Genera un código de pago único basado en el año actual y el último código existente.
   * @returns Código del pago generado
   */
  private async generatePaymentCode(): Promise<string> {
    const currentYear = new Date().getFullYear();
    const prefix = `PAG-${currentYear}-`;

    let lastIncrement = 0;
    let paymentCode = '';
    let isUnique = false;

    while (!isUnique) {
      const lastPayment = await this.prisma.payment.findFirst({
        where: { code: { startsWith: prefix } },
        orderBy: { code: 'desc' },
      });

      if (lastPayment && lastPayment.code.split('.').length === 3) {
        lastIncrement = parseInt(lastPayment.code.split('.')[2], 10);
      }

      paymentCode = `${prefix}${String(lastIncrement + 1).padStart(3, '0')}`;

      const existingPayment = await this.prisma.payment.findUnique({
        where: { code: paymentCode },
      });

      if (!existingPayment) {
        isUnique = true;
      } else {
        lastIncrement++;
      }
    }

    return paymentCode;
  }

  /**
   * Crea un nuevo pago en la base de datos.
   * @param createPaymentDto Datos del pago a crear
   * @param user Usuario que realiza la acción
   * @returns Pago creado
   */
  async create(
    createPaymentDto: CreatePaymentDto,
    user: UserData,
  ): Promise<HttpResponse<PaymentData>> {
    // Usar los valores de amount y amountPaid que vienen en el DTO
    const { reservationId, observations, paymentDetail, amount, amountPaid } =
      createPaymentDto;
    let newPayment;

    try {
      // Verificar que la reserva existe
      const reservationDB = await this.prisma.reservation.findUnique({
        where: { id: reservationId },
        select: {
          id: true,
          checkInDate: true,
          checkOutDate: true,
        },
      });

      if (!reservationDB) {
        throw new BadRequestException('Reservation doesnt exist');
      }

      // Verificar que hay detalles de pago
      if (!paymentDetail || paymentDetail.length === 0) {
        throw new BadRequestException('El pago debe tener al menos un detalle');
      }

      // Verificar que las habitaciones existen
      if (paymentDetail && paymentDetail.length > 0) {
        for (const detail of paymentDetail) {
          if (detail.roomId) {
            await this.roomService.findById(detail.roomId);
          }
        }
      }

      // Verificar que los servicios existen
      if (paymentDetail && paymentDetail.length > 0) {
        for (const detail of paymentDetail) {
          if (detail.serviceId) {
            await this.serviceService.findById(detail.serviceId);
          }
        }
      }

      // Pre-validamos que los detalles de tipo ROOM_RESERVATION tengan método de pago
      for (const detail of paymentDetail) {
        if (detail.type === 'ROOM_RESERVATION') {
          if (!detail.roomId) {
            throw new BadRequestException(
              'Para reservas de habitación, debe especificar la habitación',
            );
          }

          if (!detail.method) {
            throw new BadRequestException(
              'Para reservas de habitación, debe especificar el método de pago',
            );
          }
        } else if (
          detail.type === 'EXTRA_SERVICE' &&
          !detail.serviceId &&
          !detail.productId
        ) {
          throw new BadRequestException(
            'Para servicios extras, debe especificar el servicio o producto',
          );
        }
      }

      // Obtener la fecha de pago del primer detalle para usarla como fecha de pago general
      const paymentDate = paymentDetail[0].paymentDate;

      // Generamos el código del pago
      const code = await this.generatePaymentCode();

      // Filtramos los detalles que se crearán efectivamente en la base de datos:
      // 1. Excluimos habitaciones con método PENDING_PAYMENT
      // 2. Para servicios con PENDING_PAYMENT, ajustamos subtotal a 0
      const detailsToCreate = [];
      let pendingRoomReservationAmount = 0;

      for (const detail of paymentDetail) {
        // Caso 1: Si es habitación con PENDING_PAYMENT, lo excluimos pero registramos el monto
        if (
          detail.type === 'ROOM_RESERVATION' &&
          detail.method === 'PENDING_PAYMENT'
        ) {
          pendingRoomReservationAmount += detail.subtotal;
          continue;
        }

        // Caso 2: Si es servicio con PENDING_PAYMENT, lo incluimos con subtotal 0
        if (
          detail.type === 'EXTRA_SERVICE' &&
          detail.method === 'PENDING_PAYMENT'
        ) {
          detailsToCreate.push({
            ...detail,
            subtotal: 0,
            status: PaymentDetailStatus.PENDING,
          });
          continue;
        }

        // Caso normal: cualquier otro detalle se procesa normalmente
        let detailStatus: PaymentDetailStatus = PaymentDetailStatus.PENDING;
        if (
          detail.type === 'ROOM_RESERVATION' ||
          (detail.method && detail.method !== 'PENDING_PAYMENT')
        ) {
          detailStatus = PaymentDetailStatus.PAID;
        }

        detailsToCreate.push({
          ...detail,
          status: detailStatus,
        });
      }

      // IMPORTANTE: Usamos los valores de amount y amountPaid proporcionados en el DTO
      // para determinar el estado del pago
      const paymentStatus =
        amountPaid >= amount
          ? PaymentDetailStatus.PAID
          : PaymentDetailStatus.PENDING;

      newPayment = await this.prisma.$transaction(async (prisma) => {
        // Crear el nuevo pago con el estado determinado por amount y amountPaid del DTO
        const payment = await prisma.payment.create({
          data: {
            amount: amount, // Usamos el amount del DTO
            amountPaid: amountPaid, // Usamos el amountPaid del DTO
            status: paymentStatus, // Estado basado en la comparación entre amount y amountPaid
            code,
            date: paymentDate,
            ...(observations && { observations }),
            reservationId,
          },
          select: {
            id: true,
            code: true,
            date: true,
            amount: true,
            amountPaid: true,
            observations: true,
            status: true,
            reservation: {
              select: {
                id: true,
                checkInDate: true,
                checkOutDate: true,
              },
            },
          },
        });

        // Crear detalles de pago (solo los que pasaron el filtro)
        const createdDetails = [];
        for (const detail of detailsToCreate) {
          // Corregir el error de tipo usando el enfoque 'connect' para las relaciones
          const paymentDetailData = {
            paymentDate: detail.paymentDate,
            description: detail.description || '',
            type: detail.type,
            method: detail.method,
            status: detail.status,
            unitPrice: detail.unitPrice,
            subtotal: detail.subtotal, // Ya está ajustado a 0 si es EXTRA_SERVICE con PENDING_PAYMENT
            ...(detail.quantity && { quantity: detail.quantity }),
            // Usar connect para establecer las relaciones
            payment: { connect: { id: payment.id } },
            ...(detail.productId && {
              product: { connect: { id: detail.productId } },
            }),
            ...(detail.roomId && { room: { connect: { id: detail.roomId } } }),
            ...(detail.days && { days: detail.days }),
            ...(detail.serviceId && {
              service: { connect: { id: detail.serviceId } },
            }),
          };

          const createdDetail = await prisma.paymentDetail.create({
            data: paymentDetailData,
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                },
              },
              room: {
                select: {
                  id: true,
                  number: true,
                  RoomTypes: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                },
              },
              service: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          });

          // Registrar la auditoría para cada detalle de pago
          await this.audit.create({
            entityId: createdDetail.id,
            entityType: 'paymentDetail',
            action: AuditActionType.CREATE,
            performedById: user.id,
            createdAt: new Date(),
          });

          createdDetails.push(createdDetail);
        }

        // Registrar la auditoría
        await this.audit.create({
          entityId: payment.id,
          entityType: 'payment',
          action: AuditActionType.CREATE,
          performedById: user.id,
          createdAt: new Date(),
        });

        return {
          ...payment,
          paymentDetail: createdDetails,
          pendingRoomReservationAmount, // Añadimos esta información para referencia
        };
      });

      // Si el pago se creó correctamente, actualizar el estado de la reserva a confirmado
      if (newPayment) {
        await this.prisma.reservation.update({
          where: { id: reservationId },
          data: { status: ReservationStatus.CONFIRMED },
        });
      }

      return {
        statusCode: HttpStatus.CREATED,
        message: 'Payment created successfully',
        data: {
          id: newPayment.id,
          code: newPayment.code,
          date: newPayment.date,
          amount: newPayment.amount,
          amountPaid: newPayment.amountPaid,
          status: newPayment.status,
          ...(newPayment.observations && {
            observations: newPayment.observations,
          }),
          reservation: newPayment.reservation,
          paymentDetail: newPayment.paymentDetail.map((detail) => ({
            id: detail.id,
            paymentDate: detail.paymentDate,
            description: detail.description,
            type: detail.type,
            method: detail.method,
            status: detail.status,
            unitPrice: detail.unitPrice,
            subtotal: detail.subtotal,
            ...(detail.quantity && { quantity: detail.quantity }),
            ...(detail.product && { product: detail.product }),
            ...(detail.days && { days: detail.days }),
            ...(detail.room && { room: detail.room }),
            ...(detail.service && { service: detail.service }),
          })),
        },
      };
    } catch (error) {
      this.logger.error(
        `Error creating payment: ${error.message}`,
        error.stack,
      );

      if (newPayment && newPayment.id) {
        await this.prisma.paymentDetail.deleteMany({
          where: { paymentId: newPayment.id },
        });
        await this.prisma.payment.delete({ where: { id: newPayment.id } });
        this.logger.error(`Payment has been deleted due to error in creation.`);
      }

      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      handleException(error, 'Error creating a payment');
    }
  }

  /**
   * Crea detalles de pago para un pago existente.
   * @param createManyPaymentDetailDto Datos para crear detalles de pago
   * @param user Usuario que realiza la acción
   * @returns Detalles de pago creados
   */
  async createPaymentDetail(
    createManyPaymentDetailDto: CreateManyPaymentDetailDto,
    user: UserData,
  ): Promise<HttpResponse<PaymentDetailData[]>> {
    const { paymentId, paymentDetail } = createManyPaymentDetailDto;
    let warehouseDb: SummaryWarehouseData;

    try {
      // 1. Verificar que el pago existe
      const payment = await this.findById(paymentId);

      // 2. Validar que hay detalles para crear
      if (!paymentDetail || paymentDetail.length === 0) {
        throw new BadRequestException(
          'Debe proporcionar al menos un detalle de pago',
        );
      }

      // 3. Verificar que productos, servicios y habitaciones existan
      for (const detail of paymentDetail) {
        if (detail.productId) {
          await this.productService.findById(detail.productId);
          warehouseDb = await this.warehouseService.findWarehouseByType(
            ProductType.COMMERCIAL,
          );
        }
        if (detail.serviceId) {
          await this.serviceService.findById(detail.serviceId);
        }
        if (detail.roomId) {
          await this.roomService.findById(detail.roomId);
        }
      }

      // 4. Crear los detalles de pago dentro de una transacción
      const createdDetails = await this.prisma.$transaction(async (prisma) => {
        const details: PaymentDetailData[] = [];
        const realValues = new Map<string, number>();

        // Crear movimiento una sola vez si hay al menos un producto
        const productDetails = paymentDetail.filter((d) => !!d.productId);
        // Guardaremos una correspondencia entre cada detalle original y su movementDetail
        const movementsDetailMap = new Map<number, string>();

        if (productDetails.length > 0) {
          const movementDto: CreateMovementDto = {
            dateMovement: paymentDetail[0].paymentDate,
            type: TypeMovements.OUTPUT,
            warehouseId: warehouseDb.id,
            description: `Salida por venta de productos - ${payment?.code}`,
            movementDetail: productDetails.map((p) => ({
              quantity: p.quantity ?? 1,
              unitCost: p.unitPrice,
              productId: p.productId!,
            })),
          };

          const movement = await this.movementsService.create(
            movementDto,
            user,
          );
          // Crear un mapa relacionando cada detalle original con su movementDetail correspondiente
          if (
            movement.data.movementsDetail &&
            movement.data.movementsDetail.length > 0
          ) {
            // Para cada detalle de movimiento, guardamos la relación índice -> movementsDetailId
            movement.data.movementsDetail.forEach((detail, index) => {
              movementsDetailMap.set(index, detail.id);
            });
          }
        }

        // Índice para rastrear la posición en productDetails
        let productDetailIndex = 0;

        for (const detail of paymentDetail) {
          if (
            detail.type === 'ROOM_RESERVATION' &&
            detail.method === 'PENDING_PAYMENT'
          ) {
            continue;
          }

          if (detail.type === 'ROOM_RESERVATION' && !detail.roomId) {
            throw new BadRequestException(
              'Para reservas de habitación, debe especificar la habitación',
            );
          }
          if (
            detail.type === 'EXTRA_SERVICE' &&
            !detail.serviceId &&
            !detail.productId
          ) {
            throw new BadRequestException(
              'Para servicios extras, debe especificar el servicio o producto',
            );
          }

          const detailStatus: PaymentDetailStatus =
            detail.method === 'PENDING_PAYMENT'
              ? PaymentDetailStatus.PENDING
              : PaymentDetailStatus.PAID;

          const subtotal =
            detail.method === 'PENDING_PAYMENT' ? 0 : detail.subtotal;

          // Si es un detalle de producto, obtenemos el movementsDetailId correspondiente
          let movementsDetailId: string | undefined;

          if (detail.productId) {
            // Obtenemos el movementsDetailId por índice
            movementsDetailId = movementsDetailMap.get(productDetailIndex);
            // Incrementamos el índice solo para detalles de productos
            productDetailIndex++;
          }

          const newDetail = await prisma.paymentDetail.create({
            data: {
              paymentId,
              paymentDate: detail.paymentDate,
              description: detail.description,
              type: detail.type,
              method: detail.method,
              status: detailStatus,
              unitPrice: detail.unitPrice,
              subtotal,
              ...(detail.quantity && { quantity: detail.quantity }),
              ...(detail.productId && { productId: detail.productId }),
              ...(detail.roomId && { roomId: detail.roomId }),
              ...(detail.days && { days: detail.days }),
              ...(detail.serviceId && { serviceId: detail.serviceId }),
              ...(movementsDetailId && { movementsDetailId }),
            },
            include: {
              product: { select: { id: true, name: true } },
              room: {
                select: {
                  id: true,
                  number: true,
                  RoomTypes: { select: { id: true, name: true } },
                },
              },
              service: { select: { id: true, name: true } },
            },
          });

          realValues.set(newDetail.id, detail.subtotal);

          await this.audit.create({
            entityId: newDetail.id,
            entityType: 'paymentDetail',
            action: AuditActionType.CREATE,
            performedById: user.id,
            createdAt: new Date(),
          });

          details.push(newDetail);
        }

        // 5. Recalcular montos en el pago padre
        const amountIncrement = details
          .filter((d) => d.type !== 'ROOM_RESERVATION')
          .reduce((sum, d) => sum + realValues.get(d.id)!, 0);

        const amountPaidIncrement = details
          .filter((d) => d.method !== 'PENDING_PAYMENT')
          .reduce((sum, d) => sum + d.subtotal, 0);

        const parent = await prisma.payment.findUnique({
          where: { id: paymentId },
          select: { amount: true, amountPaid: true },
        });
        if (!parent) throw new BadRequestException('Payment not found');

        const newAmount = parent.amount + amountIncrement;
        const newAmountPaid = parent.amountPaid + amountPaidIncrement;

        const latestPaymentDate = details
          .map((d) => d.paymentDate)
          .sort()
          .pop();

        // 6. Actualizar el payment
        await prisma.payment.update({
          where: { id: paymentId },
          data: {
            amount: newAmount,
            amountPaid: newAmountPaid,
            ...(latestPaymentDate && { date: latestPaymentDate }),
            status:
              newAmountPaid >= newAmount
                ? PaymentDetailStatus.PAID
                : PaymentDetailStatus.PENDING,
          },
        });

        await this.audit.create({
          entityId: paymentId,
          entityType: 'payment',
          action: AuditActionType.UPDATE,
          performedById: user.id,
          createdAt: new Date(),
        });

        return details;
      });

      return {
        statusCode: HttpStatus.CREATED,
        message: 'Payment details created successfully',
        data: createdDetails,
      };
    } catch (error) {
      this.logger.error(
        `Error creating payment details for payment ${paymentId}: ${error.message}`,
        error.stack,
      );
      if (error instanceof BadRequestException) {
        throw error;
      }
      handleException(error, 'Error creating payment details');
    }
  }

  /**
   * Crea un pago por Late Checkout para una reserva
   * @param reservationId ID de la reserva a la que aplicó el late checkout
   * @param lateCheckoutDto DTO con información del late checkout
   * @param user Usuario que realiza la acción
   * @returns Detalle del pago creado por late checkout
   */
  async createLateCheckoutPayment(
    reservationId: string,
    lateCheckoutDto: LateCheckoutDto,
    user: UserData,
  ): Promise<HttpResponse<PaymentDetailData>> {
    try {
      // 1. Obtener la reserva con su habitación
      const reservation = await this.prisma.reservation.findUnique({
        where: { id: reservationId },
        include: {
          room: {
            include: {
              RoomTypes: true,
            },
          },
        },
      });

      if (!reservation) {
        throw new BadRequestException(
          `No se encontró la reserva con ID ${reservationId}`,
        );
      }

      if (!reservation.room || !reservation.room.RoomTypes) {
        throw new BadRequestException(
          'La reserva no tiene una habitación o tipo de habitación asociada',
        );
      }

      // 2. Obtener el pago principal asociado a esta reserva
      const payment = await this.prisma.payment.findFirst({
        where: {
          reservationId,
        },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          amount: true,
          amountPaid: true,
        },
      });

      if (!payment) {
        throw new BadRequestException('La reserva no tiene un pago asociado');
      }

      // 3. Calcular el costo del late checkout (50% del precio de la habitación)
      const roomPrice = reservation.room.RoomTypes.price;
      const lateCheckoutPrice = roomPrice * 0.5;

      const formattedDescription = `Late checkout a las ${lateCheckoutDto.lateCheckoutTime}`;

      // 5. Determinar si es un pago pendiente y ajustar valores según corresponda
      const isPendingPayment =
        lateCheckoutDto.paymentMethod === 'PENDING_PAYMENT';

      // El subtotal depende del método de pago
      const subtotal = isPendingPayment ? 0 : lateCheckoutPrice;

      // El estado del detalle también depende del método de pago
      const detailStatus = isPendingPayment
        ? PaymentDetailStatus.PENDING
        : PaymentDetailStatus.PAID;

      // 6. Crear el detalle de pago directamente con nuestra lógica específica para LATE_CHECKOUT
      const createdDetail = await this.prisma.$transaction(async (prisma) => {
        // Crear el detalle de pago
        const newDetail = await prisma.paymentDetail.create({
          data: {
            paymentId: payment.id,
            paymentDate: lateCheckoutDto.paymentDate,
            description: formattedDescription,
            type: PaymentDetailType.LATE_CHECKOUT,
            method: lateCheckoutDto.paymentMethod,
            status: detailStatus,
            roomId: reservation.roomId,
            unitPrice: lateCheckoutPrice,
            subtotal: subtotal, // 0 si es PENDING_PAYMENT, lateCheckoutPrice de lo contrario
          },
          include: {
            room: {
              select: {
                id: true,
                number: true,
                RoomTypes: { select: { id: true, name: true } },
              },
            },
          },
        });

        // Registrar auditoría para el detalle
        await this.audit.create({
          entityId: newDetail.id,
          entityType: 'paymentDetail',
          action: AuditActionType.CREATE,
          performedById: user.id,
          createdAt: new Date(),
        });

        // Actualizar el pago principal, incrementando el amount para LATE_CHECKOUT
        // (ya que no es de tipo ROOM_RESERVATION)
        const newAmount = payment.amount + lateCheckoutPrice;

        // El amountPaid sólo se incrementa si el método no es PENDING_PAYMENT
        const newAmountPaid = isPendingPayment
          ? payment.amountPaid
          : payment.amountPaid + lateCheckoutPrice;

        // Determinar el estado del pago basado en la comparación de amount y amountPaid
        const newPaymentStatus =
          newAmountPaid >= newAmount
            ? PaymentDetailStatus.PAID
            : PaymentDetailStatus.PENDING;

        // Actualizar el pago principal
        await prisma.payment.update({
          where: { id: payment.id },
          data: {
            amount: newAmount,
            amountPaid: newAmountPaid,
            date: lateCheckoutDto.paymentDate, // Actualizamos la fecha del pago
            status: newPaymentStatus,
          },
        });

        // Registrar auditoría para el pago principal
        await this.audit.create({
          entityId: payment.id,
          entityType: 'payment',
          action: AuditActionType.UPDATE,
          performedById: user.id,
          createdAt: new Date(),
        });

        return newDetail;
      });

      return {
        statusCode: HttpStatus.CREATED,
        message: 'Pago por Late Checkout creado exitosamente',
        data: createdDetail as unknown as PaymentDetailData,
      };
    } catch (error) {
      this.logger.error(
        `Error al crear pago por late checkout: ${error.message}`,
        {
          error,
          reservationId,
          lateCheckoutDto,
        },
      );

      if (error instanceof BadRequestException) {
        throw error;
      }

      handleException(error, 'Error al crear pago por Late Checkout');
    }
  }

  /**
   * Crea un pago por extensión de estadía para una reserva
   * @param reservationId ID de la reserva a la que se aplicará la extensión de estadía
   * @param extendStayDto DTO con información de la extensión de estadía
   * @param user Usuario que realiza la acción
   * @returns Detalle del pago creado por extensión de estadía o información de actualización
   */
  async createExtendStayPayment(
    reservationId: string,
    extendStayDto: ExtendStayDto,
    user: UserData,
  ): Promise<HttpResponse<any>> {
    try {
      // 1. Obtener la reserva con su habitación
      const reservation = await this.prisma.reservation.findUnique({
        where: { id: reservationId },
        include: {
          room: {
            include: {
              RoomTypes: true,
            },
          },
        },
      });

      if (!reservation) {
        throw new BadRequestException(
          `No se encontró la reserva con ID ${reservationId}`,
        );
      }

      if (!reservation.room || !reservation.room.RoomTypes) {
        throw new BadRequestException(
          'La reserva no tiene una habitación o tipo de habitación asociada',
        );
      }

      // Calcular noches originales y nuevas para determinar las noches adicionales
      const oldNights = calculateStayNights(
        reservation.checkInDate.toISOString(),
        reservation.checkOutDate.toISOString(),
      );
      const newNights = calculateStayNights(
        reservation.checkInDate.toISOString(),
        extendStayDto.newCheckoutDate,
      );

      const additionalNights = newNights - oldNights;

      if (additionalNights <= 0) {
        throw new BadRequestException(
          'La nueva fecha de checkout debe ser posterior a la fecha original',
        );
      }

      // 3. Obtener el pago principal asociado a esta reserva
      const payment = await this.prisma.payment.findFirst({
        where: {
          reservationId,
        },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          amount: true,
          amountPaid: true,
        },
      });

      if (!payment) {
        throw new BadRequestException('La reserva no tiene un pago asociado');
      }

      // 4. Calcular el costo de las noches adicionales
      const roomPrice = reservation.room.RoomTypes.price;
      const extendStayAmount = roomPrice * additionalNights;

      const formattedDescription = `Extensión de estadía`;

      // 6. Determinar si es un pago pendiente
      const isPendingPayment =
        extendStayDto.paymentMethod === 'PENDING_PAYMENT';

      // 7. Crear el detalle de pago o solo actualizar el amount según el método de pago
      const result = await this.prisma.$transaction(async (prisma) => {
        // Siempre actualizamos el amount total del pago (sin importar el método)
        const newAmount = payment.amount + extendStayAmount;

        // Solo si NO es PENDING_PAYMENT, creamos el detalle de pago y aumentamos amountPaid
        let detailCreated = null;
        let newAmountPaid = payment.amountPaid;

        if (!isPendingPayment) {
          // Crear el detalle de pago
          detailCreated = await prisma.paymentDetail.create({
            data: {
              paymentId: payment.id,
              paymentDate: extendStayDto.paymentDate,
              description: formattedDescription,
              type: PaymentDetailType.ROOM_RESERVATION,
              method: extendStayDto.paymentMethod,
              status: PaymentDetailStatus.PAID,
              roomId: reservation.roomId,
              unitPrice: roomPrice,
              subtotal: extendStayAmount,
              days: additionalNights,
            },
            include: {
              room: {
                select: {
                  id: true,
                  number: true,
                  RoomTypes: { select: { id: true, name: true } },
                },
              },
            },
          });

          // Registrar auditoría para el detalle
          await this.audit.create({
            entityId: detailCreated.id,
            entityType: 'paymentDetail',
            action: AuditActionType.CREATE,
            performedById: user.id,
            createdAt: new Date(),
          });

          // Incrementar el amountPaid solo si NO es PENDING_PAYMENT
          newAmountPaid = payment.amountPaid + extendStayAmount;
        }

        // Determinar el estado del pago basado en la comparación de amount y amountPaid
        const newPaymentStatus =
          newAmountPaid >= newAmount
            ? PaymentDetailStatus.PAID
            : PaymentDetailStatus.PENDING;

        // Actualizar el pago principal
        const updatedPayment = await prisma.payment.update({
          where: { id: payment.id },
          data: {
            amount: newAmount,
            amountPaid: newAmountPaid,
            date: extendStayDto.paymentDate, // Actualizamos la fecha del pago
            status: newPaymentStatus,
          },
        });

        // Registrar auditoría para el pago principal
        await this.audit.create({
          entityId: payment.id,
          entityType: 'payment',
          action: AuditActionType.UPDATE,
          performedById: user.id,
          createdAt: new Date(),
        });

        return {
          paymentUpdated: updatedPayment,
          detailCreated,
          additionalNights,
          extendStayAmount,
          isPendingPayment,
        };
      });

      return {
        statusCode: HttpStatus.CREATED,
        message: isPendingPayment
          ? `Se ha actualizado el monto del pago para incluir ${additionalNights} noche(s) adicionales como pago pendiente`
          : `Pago por extensión de estadía creado exitosamente (${additionalNights} noche(s) adicionales)`,
        data: result,
      };
    } catch (error) {
      this.logger.error(
        `Error al crear pago por extensión de estadía: ${error.message}`,
        {
          error,
          reservationId,
          extendStayDto,
        },
      );

      if (error instanceof BadRequestException) {
        throw error;
      }

      handleException(error, 'Error al crear pago por extensión de estadía');
    }
  }

  /**
   * Obtiene todos los pagos de la base de datos.
   * @returns Lista de pagos
   */
  async findAll(): Promise<SummaryPaymentData[]> {
    try {
      const payments = await this.prisma.payment.findMany({
        select: {
          id: true,
          code: true,
          amount: true,
          amountPaid: true,
          date: true,
          status: true,
          reservation: {
            select: {
              customer: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'asc',
        },
      });

      // Mapea los resultados al tipo SummaryPaymentData
      return payments.map((payment) => ({
        id: payment.id,
        code: payment.code,
        amount: payment.amount,
        amountPaid: payment.amountPaid,
        date: payment.date,
        status: payment.status,
        reservation: {
          customer: {
            id: payment.reservation.customer.id,
            name: payment.reservation.customer.name,
          },
        },
      })) as SummaryPaymentData[];
    } catch (error) {
      this.logger.error('Error getting all payments');
      handleException(error, 'Error getting all payments');
    }
  }

  /**
   * Obtiene todos los pagos paginados.
   * @param options Opciones para la paginación
   * @returns PaginatedResponse con los pagos paginados
   */
  async findAllPaginated(options: {
    page: number;
    pageSize: number;
  }): Promise<PaginatedResponse<SummaryPaymentData>> {
    try {
      const { page, pageSize } = options;

      return await this.paginationService.paginate<any, SummaryPaymentData>({
        model: 'payment',
        page,
        pageSize,
        select: {
          id: true,
          code: true,
          amount: true,
          amountPaid: true,
          date: true,
          status: true,
          reservation: {
            select: {
              customer: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
        transformer: (payment) => ({
          id: payment.id,
          code: payment.code,
          amount: payment.amount,
          amountPaid: payment.amountPaid,
          date: payment.date,
          status: payment.status,
          reservation: {
            customer: {
              id: payment.reservation.customer.id,
              name: payment.reservation.customer.name,
            },
          },
        }),
      });
    } catch (error) {
      this.logger.error('Error getting paginated payments', error.stack);
      handleException(error, 'Error getting paginated payments');
    }
  }

  /**
   * Obtiene un pago por su ID.
   * @param id ID del pago a buscar
   * @returns Pago encontrado
   */
  async findOne(id: string): Promise<PaymentData> {
    try {
      return await this.findById(id);
    } catch (error) {
      this.logger.error('Error get payment');
      if (error instanceof BadRequestException) {
        throw error;
      }
      handleException(error, 'Error get payment');
    }
  }

  /**
   * Obtiene un pago por su ID con un manejo de excepciones específico.
   * @param id ID del pago a buscar
   * @returns Pago encontrado
   * @throws BadRequestException si el pago no existe
   */
  async findById(id: string): Promise<PaymentData> {
    const paymentDb = await this.prisma.payment.findFirst({
      where: { id },
      select: {
        id: true,
        code: true,
        date: true,
        amount: true,
        amountPaid: true,
        status: true,
        observations: true,
        reservation: {
          select: {
            id: true,
            checkInDate: true,
            checkOutDate: true,
            appliedLateCheckOut: true,
            customer: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        paymentDetail: {
          select: {
            id: true,
            paymentDate: true,
            description: true,
            type: true,
            method: true,
            status: true,
            unitPrice: true,
            subtotal: true,
            quantity: true,
            days: true,
            product: {
              select: {
                id: true,
                name: true,
              },
            },
            service: {
              select: {
                id: true,
                name: true,
              },
            },
            room: {
              select: {
                id: true,
                number: true,
                RoomTypes: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!paymentDb) {
      throw new BadRequestException('This payment doesnt exist');
    }

    // Calculamos el número total de noches de la reserva
    const totalNights = calculateStayNights(
      paymentDb.reservation.checkInDate.toISOString(),
      paymentDb.reservation.checkOutDate.toISOString(),
      paymentDb.reservation.appliedLateCheckOut,
    );

    // Sumamos los días ya pagados (de detalles tipo ROOM_RESERVATION con status PAID)
    const paidDays = paymentDb.paymentDetail
      .filter(
        (detail) =>
          detail.type === 'ROOM_RESERVATION' && detail.status === 'PAID',
      )
      .reduce((sum, detail) => sum + (detail.days || 0), 0);

    // Calculamos los días que faltan por pagar
    const missingDays = Math.max(0, totalNights - paidDays);

    // Añadimos las propiedades missingDays y paymentDays al resultado
    return {
      ...paymentDb,
      missingDays,
      paymentDays: paidDays,
    };
  }

  /**
   * Obtiene un pago por su ID con enfoque en datos de habitación y resumen de días.
   * @param id ID del pago a buscar
   * @returns Pago encontrado con datos detallados de habitación y días
   * @throws BadRequestException si el pago no existe
   */
  async findRoomPaymentDetailsById(
    id: string,
  ): Promise<RoomPaymentDetailsData> {
    try {
      const paymentDb = await this.prisma.payment.findFirst({
        where: { id },
        select: {
          id: true,
          code: true,
          date: true,
          amount: true,
          amountPaid: true,
          status: true,
          observations: true,
          reservation: {
            select: {
              id: true,
              checkInDate: true,
              checkOutDate: true,
              appliedLateCheckOut: true,
              customer: {
                select: {
                  id: true,
                  name: true,
                },
              },
              // Añadimos la selección de la habitación desde la reserva
              room: {
                select: {
                  id: true,
                  number: true,
                  RoomTypes: {
                    select: {
                      id: true,
                      name: true,
                      price: true,
                    },
                  },
                },
              },
            },
          },
          paymentDetail: {
            select: {
              id: true,
              paymentDate: true,
              description: true,
              type: true,
              method: true,
              status: true,
              unitPrice: true,
              subtotal: true,
              quantity: true,
              days: true,
              product: {
                select: {
                  id: true,
                  name: true,
                },
              },
              service: {
                select: {
                  id: true,
                  name: true,
                },
              },
              room: {
                select: {
                  id: true,
                  number: true,
                  RoomTypes: {
                    select: {
                      id: true,
                      name: true,
                      price: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!paymentDb) {
        throw new BadRequestException('Este pago no existe');
      }

      // Calculamos el número total de noches de la reserva
      const totalNights = calculateStayNights(
        paymentDb.reservation.checkInDate.toISOString(),
        paymentDb.reservation.checkOutDate.toISOString(),
        paymentDb.reservation.appliedLateCheckOut,
      );

      // Sumamos los días ya pagados (de detalles tipo ROOM_RESERVATION con status PAID)
      const paidDays = paymentDb.paymentDetail
        .filter(
          (detail) =>
            detail.type === 'ROOM_RESERVATION' && detail.status === 'PAID',
        )
        .reduce((sum, detail) => sum + (detail.days || 0), 0);

      // Calculamos los días que faltan por pagar
      const missingDays = Math.max(0, totalNights - paidDays);

      // Creamos un objeto con la estructura correcta y asegurándonos que los tipos coincidan
      const result: RoomPaymentDetailsData = {
        id: paymentDb.id,
        code: paymentDb.code,
        date: paymentDb.date,
        amount: paymentDb.amount,
        amountPaid: paymentDb.amountPaid,
        status: paymentDb.status,
        observations: paymentDb.observations,
        missingDays,
        paymentDays: paidDays,
        reservation: {
          id: paymentDb.reservation.id,
          checkInDate: paymentDb.reservation.checkInDate, // Convertimos la fecha a objeto Date
          checkOutDate: paymentDb.reservation.checkOutDate, // Convertimos la fecha a objeto Date
          room: paymentDb.reservation.room
            ? {
                id: paymentDb.reservation.room.id,
                number: paymentDb.reservation.room.number,
                RoomTypes: {
                  id: paymentDb.reservation.room.RoomTypes.id,
                  name: paymentDb.reservation.room.RoomTypes.name,
                  price: paymentDb.reservation.room.RoomTypes.price,
                },
              }
            : undefined,
          customer: {
            id: paymentDb.reservation.customer.id,
            name: paymentDb.reservation.customer.name,
          },
        },
        // Omitimos paymentDetail ya que no está en la interfaz que compartiste
      };

      return result;
    } catch (error) {
      this.logger.error('Error al obtener detalles de pago de habitación');
      if (error instanceof BadRequestException) {
        throw error;
      }
      handleException(error, 'Error al obtener detalles de pago de habitación');
    }
  }

  /**
   * Obtiene un pago por su ID con información resumida.
   * @param id ID del pago a buscar
   * @returns Pago encontrado con información resumida
   */
  async findSummaryDataById(id: string): Promise<SummaryPaymentData> {
    try {
      const payment = await this.prisma.payment.findFirst({
        where: { id },
        select: {
          id: true,
          code: true,
          amount: true,
          amountPaid: true,
          date: true,
          status: true,
          observations: true,
          reservation: {
            select: {
              customer: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      });

      if (!payment) {
        throw new BadRequestException('This payment doesnt exist');
      }

      // Mapea los resultados al tipo SummaryPaymentData
      return {
        id: payment.id,
        code: payment.code,
        amount: payment.amount,
        amountPaid: payment.amountPaid,
        date: payment.date,
        status: payment.status,
        observations: payment.observations,
        reservation: {
          customer: {
            id: payment.reservation.customer.id,
            name: payment.reservation.customer.name,
          },
        },
      } as SummaryPaymentData;
    } catch (error) {
      this.logger.error('Error getting summary payment by id');
      if (error instanceof BadRequestException) {
        throw error;
      }
      handleException(error, 'Error getting summary payment by id');
    }
  }

  /**
   * Actualiza un pago existente en la base de datos.
   * @param id ID del pago a actualizar
   * @param updatePaymentDto Datos para actualizar el pago (solo observaciones)
   * @param user Usuario que realiza la acción
   * @returns Pago actualizado en formato resumido
   */
  async update(
    id: string,
    updatePaymentDto: UpdatePaymentDto,
    user: UserData,
  ): Promise<HttpResponse<SummaryPaymentData>> {
    const { observations } = updatePaymentDto;

    try {
      // Verificar que el pago existe
      const paymentDB = await this.findSummaryDataById(id);

      // Solo evitamos la actualización si observations es undefined o es exactamente igual al valor actual
      // De esta forma, una cadena vacía se considerará como una actualización válida
      if (
        observations === undefined ||
        paymentDB.observations === observations
      ) {
        return {
          statusCode: HttpStatus.OK,
          message: 'Payment updated successfully',
          data: {
            id: paymentDB.id,
            code: paymentDB.code,
            date: paymentDB.date,
            amount: paymentDB.amount,
            amountPaid: paymentDB.amountPaid,
            status: paymentDB.status,
            reservation: paymentDB.reservation,
          },
        };
      }

      // Transacción para realizar la actualización
      const updatedPayment = await this.prisma.$transaction(async (prisma) => {
        // Actualizar solo las observaciones del pago
        const payment = await prisma.payment.update({
          where: { id },
          data: { observations },
          select: {
            id: true,
            code: true,
            date: true,
            amount: true,
            amountPaid: true,
            status: true,
            reservation: {
              select: {
                customer: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        });

        // Crear un registro de auditoría
        await this.audit.create({
          entityId: payment.id,
          entityType: 'payment',
          action: AuditActionType.UPDATE,
          performedById: user.id,
          createdAt: new Date(),
        });

        return payment;
      });

      return {
        statusCode: HttpStatus.OK,
        message: 'Payment updated successfully',
        data: updatedPayment,
      };
    } catch (error) {
      this.logger.error(
        `Error updating payment: ${error.message}`,
        error.stack,
      );

      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      handleException(error, 'Error updating a payment');
    }
  }

  /**
   * Actualizar detalles de pago en lote.
   * @param updateBatchDto Detalles de la actualización en lote
   * @param user Usuario que realiza la acción
   * @returns Detalles de pagos actualizados
   */
  async updatePaymentDetailsBatch(
    updateBatchDto: UpdatePaymentDetailsBatchDto,
    user: UserData,
  ): Promise<HttpResponse<PaymentDetailData[]>> {
    try {
      const { paymentDetailIds, paymentDate, method } = updateBatchDto;

      validateArray(paymentDetailIds, 'Payment detail IDs');

      if (!paymentDate && !method) {
        throw new BadRequestException(
          'You must provide at least paymentDate or method to update',
        );
      }

      // 1. Obtener los detalles de pago, incluyendo la referencia a movementsDetail si existe
      const paymentDetails = await this.prisma.paymentDetail.findMany({
        where: { id: { in: paymentDetailIds } },
        include: {
          payment: true,
          product: true,
          room: {
            include: {
              RoomTypes: true,
            },
          },
          service: true,
          movementsDetail: {
            select: {
              id: true,
            },
          },
        },
      });

      if (paymentDetails.length !== paymentDetailIds.length) {
        const foundIds = paymentDetails.map((d) => d.id);
        const missingIds = paymentDetailIds.filter(
          (id) => !foundIds.includes(id),
        );
        throw new BadRequestException(
          `The following payment details do not exist: ${missingIds.join(', ')}`,
        );
      }

      // 2. Si se actualiza la fecha, procesar primero los detalles con movimientos asociados
      if (paymentDate) {
        // Filtrar los detalles que tienen un movimiento asociado
        const detailsWithMovements = paymentDetails.filter(
          (d) => d.movementsDetail?.id,
        );

        // Actualizar la fecha de los movimientos asociados usando updateMovementDateByDetail
        for (const detail of detailsWithMovements) {
          if (detail.movementsDetail?.id) {
            await this.movementsService.updateMovementDateByDetail(
              detail.movementsDetail.id,
              paymentDate,
              user,
            );
          }
        }
      }

      // Continuar con el flujo normal de actualización por lotes
      const paymentIdMap = new Map<string, string[]>();
      paymentDetails.forEach((detail) => {
        const paymentId = detail.payment.id;
        if (!paymentIdMap.has(paymentId)) {
          paymentIdMap.set(paymentId, []);
        }
        paymentIdMap.get(paymentId).push(detail.id);
      });

      const updatedDetails = await this.prisma.$transaction(async (prisma) => {
        for (const detail of paymentDetails) {
          const updatePayload: any = {};
          if (paymentDate !== undefined)
            updatePayload.paymentDate = paymentDate;
          if (method !== undefined) updatePayload.method = method;

          // NUEVO: Manejo especial para LATE_CHECKOUT
          if (detail.type === 'LATE_CHECKOUT') {
            const oldMethod = detail.method;
            const newMethod = method || oldMethod;

            // Analizar si hay cambio en el método de pago
            const isChangingToPaymentPending =
              newMethod === 'PENDING_PAYMENT' &&
              oldMethod !== 'PENDING_PAYMENT';
            const isChangingFromPaymentPending =
              oldMethod === 'PENDING_PAYMENT' &&
              newMethod !== 'PENDING_PAYMENT';

            // Caso 1: Cambio a PENDING_PAYMENT para LATE_CHECKOUT
            if (isChangingToPaymentPending) {
              const originalSubtotal = detail.subtotal;
              // Cuando cambia a PENDING_PAYMENT, el subtotal es 0 y el estado es PENDING
              updatePayload.subtotal = 0;
              updatePayload.status = 'PENDING';

              // Actualizar el detalle
              await prisma.paymentDetail.update({
                where: { id: detail.id },
                data: updatePayload,
              });

              // Si estaba pagado, debemos restar su subtotal del amountPaid del pago principal
              if (detail.status === 'PAID') {
                await prisma.payment.update({
                  where: { id: detail.paymentId },
                  data: {
                    amountPaid: {
                      decrement: originalSubtotal,
                    },
                  },
                });
              }
            }
            // Caso 2: Cambio desde PENDING_PAYMENT para LATE_CHECKOUT
            else if (isChangingFromPaymentPending) {
              // Para Late Checkout, el subtotal es igual al unitPrice
              const realSubtotal = detail.unitPrice;

              // Al cambiar desde PENDING_PAYMENT, actualizamos subtotal y estado
              updatePayload.subtotal = realSubtotal;
              updatePayload.status = 'PAID';

              await prisma.paymentDetail.update({
                where: { id: detail.id },
                data: updatePayload,
              });

              // Incrementar el amountPaid en el pago principal
              await prisma.payment.update({
                where: { id: detail.paymentId },
                data: {
                  amountPaid: {
                    increment: realSubtotal,
                  },
                },
              });
            }
            // Caso 3: Solo actualización de fecha para LATE_CHECKOUT
            else if (paymentDate && !method) {
              await prisma.paymentDetail.update({
                where: { id: detail.id },
                data: { paymentDate },
              });
            }
            // Caso 4: Solo actualizamos el método sin cambiar de/a PENDING_PAYMENT
            else if (
              method &&
              !isChangingToPaymentPending &&
              !isChangingFromPaymentPending
            ) {
              await prisma.paymentDetail.update({
                where: { id: detail.id },
                data: { method },
              });
            }
          }
          // Manejo para tipos de pago diferentes a LATE_CHECKOUT (código existente)
          else {
            if (method === 'PENDING_PAYMENT') {
              if (detail.room) {
                await prisma.paymentDetail.delete({ where: { id: detail.id } });
              } else {
                updatePayload.status = 'PENDING';
                updatePayload.subtotal = 0;
                await prisma.paymentDetail.update({
                  where: { id: detail.id },
                  data: updatePayload,
                });
              }
            } else {
              let subtotal = 0;

              if (detail.room) {
                const days = detail.days ?? 1;
                const price = detail.room.RoomTypes?.price ?? 0;
                subtotal = price * days;
              } else if (detail.product) {
                const qty = detail.quantity ?? 1;
                const price = detail.product.unitCost ?? 0;
                subtotal = price * qty;
              } else if (detail.service) {
                const qty = detail.quantity ?? 1;
                const price = detail.service.price ?? 0;
                subtotal = price * qty;
              }

              updatePayload.status = 'PAID';
              updatePayload.subtotal = subtotal;

              await prisma.paymentDetail.update({
                where: { id: detail.id },
                data: updatePayload,
              });

              await prisma.payment.update({
                where: { id: detail.paymentId },
                data: {
                  amountPaid: {
                    increment: subtotal,
                  },
                },
              });
            }
          }

          await this.audit.create({
            entityId: detail.id,
            entityType: 'paymentDetail',
            action: AuditActionType.UPDATE,
            performedById: user.id,
            createdAt: new Date(),
          });
        }

        // Código existente para actualizar los pagos principales
        for (const [paymentId] of paymentIdMap.entries()) {
          const allPaymentDetails = await prisma.paymentDetail.findMany({
            where: { paymentId },
          });

          const newAmountPaid = allPaymentDetails
            .filter((d) => d.status === 'PAID')
            .reduce((sum, d) => sum + Number(d.subtotal), 0);

          // Obtén el amount actualizado
          const updatedPayment = await prisma.payment.findUnique({
            where: { id: paymentId },
          });

          const updatedAmount = updatedPayment.amount;
          const updatedPaymentData: any = {
            amountPaid: newAmountPaid,
          };

          // Actualizar el estado basado en la comparación entre amount y amountPaid
          updatedPaymentData.status =
            newAmountPaid >= updatedAmount
              ? PaymentDetailStatus.PAID
              : PaymentDetailStatus.PENDING;

          const latestPaymentDate = allPaymentDetails
            .filter((d) => d.paymentDate)
            .map((d) => d.paymentDate)
            .sort()
            .reverse()[0];

          if (latestPaymentDate) {
            updatedPaymentData.date = latestPaymentDate;
          }

          await prisma.payment.update({
            where: { id: paymentId },
            data: updatedPaymentData,
          });

          await this.audit.create({
            entityId: paymentId,
            entityType: 'payment',
            action: AuditActionType.UPDATE,
            performedById: user.id,
            createdAt: new Date(),
          });
        }

        return await prisma.paymentDetail.findMany({
          where: { id: { in: paymentDetailIds } },
          include: {
            product: true,
            room: { include: { RoomTypes: true } },
            service: true,
          },
        });
      });

      return {
        statusCode: HttpStatus.OK,
        message: 'Payment details successfully updated',
        data: updatedDetails as unknown as PaymentDetailData[],
      };
    } catch (error) {
      this.logger.error(
        `Error updating payment details in batch: ${error.message}`,
        error.stack,
      );

      if (error instanceof BadRequestException) {
        throw error;
      }

      handleException(error, 'Error updating payment details in batch');
    }
  }

  /**
   * Actualiza un detalle de pago individual
   * @param paymentDetailId ID del detalle de pago a actualizar
   * @param updatePaymentDetailDto Datos para actualizar el detalle de pago
   * @param user Usuario que realiza la acción
   * @returns Detalle de pago actualizado
   */
  async updatePaymentDetail(
    paymentDetailId: string,
    updatePaymentDetailDto: UpdatePaymentDetailDto,
    user: UserData,
  ): Promise<HttpResponse<PaymentDetailData>> {
    try {
      // 1. Buscar el detalle de pago incluyendo su movementsDetail si existe
      const paymentDetail = await this.prisma.paymentDetail.findUnique({
        where: { id: paymentDetailId },
        include: {
          payment: {
            select: { id: true, amount: true, amountPaid: true },
          },
          product: { select: { id: true, name: true } },
          room: {
            select: {
              id: true,
              number: true,
              RoomTypes: { select: { id: true, name: true } },
            },
          },
          service: { select: { id: true, name: true } },
          // Incluimos movementsDetail para verificar si existe
          movementsDetail: {
            select: {
              id: true,
            },
          },
        },
      });

      if (!paymentDetail) {
        throw new BadRequestException('Payment detail does not exist');
      }

      // Si es un detalle de tipo LATE_CHECKOUT, redirigir a la función específica
      if (paymentDetail.type === 'LATE_CHECKOUT') {
        return await this.updateLateCheckoutPaymentDetail(
          paymentDetailId,
          updatePaymentDetailDto,
          user,
        );
      }

      // 2. NUEVO: Si hay un movement detail asociado, llamar a handlePaymentDetailUpdate
      let movementDetailId = paymentDetail.movementsDetail?.id;

      if (
        movementDetailId &&
        (updatePaymentDetailDto.paymentDate !== undefined ||
          updatePaymentDetailDto.quantity !== undefined ||
          updatePaymentDetailDto.unitPrice !== undefined ||
          updatePaymentDetailDto.productId !== undefined)
      ) {
        // Gestionar la actualización del detalle de movimiento antes de continuar
        const result = await this.movementsService.handlePaymentDetailUpdate(
          movementDetailId,
          updatePaymentDetailDto,
          user,
        );

        // Actualizar el ID del detalle de movimiento en caso de que haya cambiado
        if (result && result.movementDetailId !== movementDetailId) {
          // Actualizar la referencia al nuevo detalle de movimiento
          await this.prisma.paymentDetail.update({
            where: { id: paymentDetailId },
            data: {
              movementsDetailId: result.movementDetailId,
            },
          });

          // Actualizar el ID para el resto del proceso
          movementDetailId = result.movementDetailId;
        }
      }

      if (updatePaymentDetailDto.productId) {
        await this.productService.findById(updatePaymentDetailDto.productId);
      }
      if (updatePaymentDetailDto.serviceId) {
        await this.serviceService.findById(updatePaymentDetailDto.serviceId);
      }
      if (updatePaymentDetailDto.roomId) {
        await this.roomService.findById(updatePaymentDetailDto.roomId);
      }

      const newType = updatePaymentDetailDto.type || paymentDetail.type;

      if (
        newType === 'ROOM_RESERVATION' &&
        !updatePaymentDetailDto.roomId &&
        !paymentDetail.roomId
      ) {
        throw new BadRequestException(
          'Para reservas de habitación, debe especificar la habitación',
        );
      }

      if (
        newType === 'EXTRA_SERVICE' &&
        !updatePaymentDetailDto.serviceId &&
        !updatePaymentDetailDto.productId &&
        !paymentDetail.serviceId &&
        !paymentDetail.productId
      ) {
        throw new BadRequestException(
          'Para servicios extras, debe especificar un servicio o producto',
        );
      }

      const oldMethod = paymentDetail.method;
      const newMethod = updatePaymentDetailDto.method || oldMethod;

      const isChangingToPaymentPending =
        newMethod === 'PENDING_PAYMENT' && oldMethod !== 'PENDING_PAYMENT';
      const isChangingFromPaymentPending =
        oldMethod === 'PENDING_PAYMENT' && newMethod !== 'PENDING_PAYMENT';

      if (isChangingToPaymentPending && newType === 'ROOM_RESERVATION') {
        const paymentId = paymentDetail.payment.id;
        const detailSubtotal = paymentDetail.subtotal;
        const currentAmount = paymentDetail.payment.amount;
        const currentAmountPaid = paymentDetail.payment.amountPaid;

        const newAmountPaid =
          paymentDetail.status === 'PAID'
            ? currentAmountPaid - detailSubtotal
            : currentAmountPaid;

        await this.prisma.$transaction(async (prisma) => {
          await prisma.paymentDetail.delete({ where: { id: paymentDetailId } });

          await this.audit.create({
            entityId: paymentDetailId,
            entityType: 'paymentDetail',
            action: AuditActionType.DELETE,
            performedById: user.id,
            createdAt: new Date(),
          });

          const remainingDetails = await prisma.paymentDetail.findMany({
            where: { paymentId },
          });

          const newPaymentStatus =
            remainingDetails.length === 0 || newAmountPaid >= currentAmount
              ? PaymentDetailStatus.PAID
              : PaymentDetailStatus.PENDING;

          let latestPaymentDate: string | null = null;
          if (
            remainingDetails.length > 0 &&
            remainingDetails.some((detail) => detail.paymentDate)
          ) {
            const paymentDates = remainingDetails
              .filter((detail) => detail.paymentDate)
              .map((detail) => detail.paymentDate);
            paymentDates.sort((a, b) => (a > b ? -1 : a < b ? 1 : 0));
            latestPaymentDate = paymentDates[0];
          }

          await prisma.payment.update({
            where: { id: paymentId },
            data: {
              amountPaid: newAmountPaid,
              status: newPaymentStatus,
              ...(latestPaymentDate && { date: latestPaymentDate }),
            },
          });

          await this.audit.create({
            entityId: paymentId,
            entityType: 'payment',
            action: AuditActionType.UPDATE,
            performedById: user.id,
            createdAt: new Date(),
          });
        });

        return {
          statusCode: HttpStatus.OK,
          message:
            'Detalle de reserva de habitación eliminado por cambio a pago pendiente',
          data: {
            ...paymentDetail,
            method: 'PENDING_PAYMENT',
          } as unknown as PaymentDetailData,
        };
      }

      if (
        isChangingToPaymentPending &&
        (newType === 'EXTRA_SERVICE' || paymentDetail.productId)
      ) {
        const originalSubtotal = paymentDetail.subtotal;
        const currentAmount = paymentDetail.payment.amount;
        const currentAmountPaid = paymentDetail.payment.amountPaid;
        const paymentId = paymentDetail.payment.id;

        const updateData = {
          ...updatePaymentDetailDto,
          subtotal: 0,
          status: PaymentDetailStatus.PENDING,
        };

        const newAmountPaid =
          paymentDetail.status === 'PAID'
            ? currentAmountPaid - originalSubtotal
            : currentAmountPaid;

        const updatedDetail = await this.prisma.$transaction(async (prisma) => {
          const updated = await prisma.paymentDetail.update({
            where: { id: paymentDetailId },
            data: updateData,
            include: {
              product: { select: { id: true, name: true } },
              room: {
                select: {
                  id: true,
                  number: true,
                  RoomTypes: { select: { id: true, name: true } },
                },
              },
              service: { select: { id: true, name: true } },
            },
          });

          await this.audit.create({
            entityId: updated.id,
            entityType: 'paymentDetail',
            action: AuditActionType.UPDATE,
            performedById: user.id,
            createdAt: new Date(),
          });

          const allDetails = await prisma.paymentDetail.findMany({
            where: { paymentId },
          });

          const paymentStatus =
            allDetails.length === 0 || newAmountPaid >= currentAmount
              ? PaymentDetailStatus.PAID
              : PaymentDetailStatus.PENDING;

          await prisma.payment.update({
            where: { id: paymentId },
            data: {
              amountPaid: newAmountPaid,
              status: paymentStatus,
            },
          });

          await this.audit.create({
            entityId: paymentId,
            entityType: 'payment',
            action: AuditActionType.UPDATE,
            performedById: user.id,
            createdAt: new Date(),
          });

          return updated;
        });

        return {
          statusCode: HttpStatus.OK,
          message: 'Detalle de servicio actualizado a pago pendiente',
          data: updatedDetail as unknown as PaymentDetailData,
        };
      }

      if (isChangingFromPaymentPending) {
        const currentAmount = paymentDetail.payment.amount;
        const currentAmountPaid = paymentDetail.payment.amountPaid;
        const paymentId = paymentDetail.payment.id;

        let realSubtotal = updatePaymentDetailDto.subtotal || 0;

        if (paymentDetail.subtotal === 0) {
          const unitPrice =
            updatePaymentDetailDto.unitPrice || paymentDetail.unitPrice;
          const quantity =
            updatePaymentDetailDto.quantity || paymentDetail.quantity || 1;
          const days = updatePaymentDetailDto.days || paymentDetail.days || 1;

          realSubtotal =
            newType === 'ROOM_RESERVATION'
              ? unitPrice * days
              : unitPrice * quantity;
        }

        const updateData = {
          ...updatePaymentDetailDto,
          subtotal: realSubtotal,
          status: PaymentDetailStatus.PAID,
        };

        const newAmountPaid = currentAmountPaid + realSubtotal;

        const updatedDetail = await this.prisma.$transaction(async (prisma) => {
          const updated = await prisma.paymentDetail.update({
            where: { id: paymentDetailId },
            data: updateData,
            include: {
              product: { select: { id: true, name: true } },
              room: {
                select: {
                  id: true,
                  number: true,
                  RoomTypes: { select: { id: true, name: true } },
                },
              },
              service: { select: { id: true, name: true } },
            },
          });

          await this.audit.create({
            entityId: updated.id,
            entityType: 'paymentDetail',
            action: AuditActionType.UPDATE,
            performedById: user.id,
            createdAt: new Date(),
          });

          const paymentStatus =
            newAmountPaid >= currentAmount
              ? PaymentDetailStatus.PAID
              : PaymentDetailStatus.PENDING;

          await prisma.payment.update({
            where: { id: paymentId },
            data: {
              amountPaid: newAmountPaid,
              status: paymentStatus,
            },
          });

          await this.audit.create({
            entityId: paymentId,
            entityType: 'payment',
            action: AuditActionType.UPDATE,
            performedById: user.id,
            createdAt: new Date(),
          });

          return updated;
        });

        return {
          statusCode: HttpStatus.OK,
          message: 'Detalle de pago actualizado de pendiente a pagado',
          data: updatedDetail as unknown as PaymentDetailData,
        };
      }

      const hasChanges = validateChanges(updatePaymentDetailDto, paymentDetail);
      if (!hasChanges) {
        return {
          statusCode: HttpStatus.OK,
          message: 'Payment detail successfully updated',
          data: paymentDetail as unknown as PaymentDetailData,
        };
      }

      const updateFields: Record<string, any> = {};
      for (const [key, value] of Object.entries(updatePaymentDetailDto)) {
        if (value !== undefined && value !== paymentDetail[key]) {
          updateFields[key] = value;
        }
      }

      const isChangingQuantityOrPrice =
        updateFields.quantity !== undefined ||
        updateFields.unitPrice !== undefined ||
        updateFields.days !== undefined;

      if (isChangingQuantityOrPrice) {
        const quantity = updateFields.quantity || paymentDetail.quantity || 1;
        const unitPrice = updateFields.unitPrice || paymentDetail.unitPrice;
        const days = updateFields.days || paymentDetail.days || 1;

        updateFields.subtotal =
          newType === 'ROOM_RESERVATION'
            ? unitPrice * days
            : unitPrice * quantity;
      }

      const updatedDetail = await this.prisma.$transaction(async (prisma) => {
        const updated = await prisma.paymentDetail.update({
          where: { id: paymentDetailId },
          data: updateFields,
          include: {
            product: { select: { id: true, name: true } },
            room: {
              select: {
                id: true,
                number: true,
                RoomTypes: { select: { id: true, name: true } },
              },
            },
            service: { select: { id: true, name: true } },
          },
        });

        await this.audit.create({
          entityId: updated.id,
          entityType: 'paymentDetail',
          action: AuditActionType.UPDATE,
          performedById: user.id,
          createdAt: new Date(),
        });

        const paymentId = paymentDetail.payment.id;
        const allDetails = await prisma.paymentDetail.findMany({
          where: { paymentId },
        });

        // Calculamos el amount total según la lógica de negocio
        let totalAmount = 0;

        // Recalculamos siempre el monto total sumando todos los detalles
        // sin importar si hay habitación o no
        totalAmount = allDetails.reduce(
          (sum, detail) => sum + detail.subtotal,
          0,
        );

        const totalAmountPaid = allDetails
          .filter((detail) => detail.status === 'PAID')
          .reduce((sum, detail) => sum + detail.subtotal, 0);

        let latestPaymentDate: string | null = null;
        if (allDetails.some((detail) => detail.paymentDate)) {
          const paymentDates = allDetails
            .filter((detail) => detail.paymentDate)
            .map((detail) => detail.paymentDate);
          paymentDates.sort((a, b) => (a > b ? -1 : a < b ? 1 : 0));
          latestPaymentDate = paymentDates[0];
        }

        const paymentStatus =
          totalAmount > 0 && totalAmountPaid >= totalAmount
            ? PaymentDetailStatus.PAID
            : PaymentDetailStatus.PENDING;

        await prisma.payment.update({
          where: { id: paymentId },
          data: {
            // Siempre actualizamos el amount con el valor total calculado
            amount: totalAmount,
            amountPaid: totalAmountPaid,
            status: paymentStatus,
            ...(latestPaymentDate && { date: latestPaymentDate }),
          },
        });

        await this.audit.create({
          entityId: paymentId,
          entityType: 'payment',
          action: AuditActionType.UPDATE,
          performedById: user.id,
          createdAt: new Date(),
        });

        return updated;
      });

      return {
        statusCode: HttpStatus.OK,
        message: 'Payment detail successfully updated',
        data: updatedDetail as unknown as PaymentDetailData,
      };
    } catch (error) {
      this.logger.error(
        `Error updating payment detail: ${error.message}`,
        error.stack,
      );

      if (error instanceof BadRequestException) {
        throw error;
      }

      handleException(error, 'Error updating payment detail');
    }
  }

  /**
   * Actualiza un detalle de pago específico de tipo LATE_CHECKOUT
   * @param paymentDetailId ID del detalle de pago a actualizar
   * @param updatePaymentDetailDto Datos para actualizar el detalle de pago
   * @param user Usuario que realiza la acción
   * @returns Detalle de pago actualizado
   */
  async updateLateCheckoutPaymentDetail(
    paymentDetailId: string,
    updatePaymentDetailDto: UpdatePaymentDetailDto,
    user: UserData,
  ): Promise<HttpResponse<PaymentDetailData>> {
    try {
      // 1. Buscar el detalle de pago específico de LATE_CHECKOUT
      const paymentDetail = await this.prisma.paymentDetail.findUnique({
        where: { id: paymentDetailId },
        include: {
          payment: {
            select: { id: true, amount: true, amountPaid: true },
          },
          room: {
            select: {
              id: true,
              number: true,
              RoomTypes: { select: { id: true, name: true } },
            },
          },
        },
      });

      if (!paymentDetail) {
        throw new BadRequestException('El detalle de pago no existe');
      }

      // Verificar que sea un detalle de LATE_CHECKOUT
      if (paymentDetail.type !== 'LATE_CHECKOUT') {
        throw new BadRequestException(
          'Esta función solo puede actualizar detalles de pago de tipo LATE_CHECKOUT',
        );
      }

      const oldMethod = paymentDetail.method;
      const newMethod = updatePaymentDetailDto.method || oldMethod;

      // Analizar si hay cambio en el método de pago
      const isChangingToPaymentPending =
        newMethod === 'PENDING_PAYMENT' && oldMethod !== 'PENDING_PAYMENT';
      const isChangingFromPaymentPending =
        oldMethod === 'PENDING_PAYMENT' && newMethod !== 'PENDING_PAYMENT';

      // 2. Gestionar cambio a PENDING_PAYMENT
      if (isChangingToPaymentPending) {
        const originalSubtotal = paymentDetail.subtotal;
        const currentAmount = paymentDetail.payment.amount; // Este no cambiará
        const currentAmountPaid = paymentDetail.payment.amountPaid;
        const paymentId = paymentDetail.payment.id;

        // Cuando cambia a PENDING_PAYMENT, el subtotal es 0 y el estado es PENDING
        const updateData = {
          ...updatePaymentDetailDto,
          subtotal: 0,
          status: PaymentDetailStatus.PENDING,
        };

        // Calcular el nuevo amountPaid: restar el subtotal original solo si estaba PAID
        const newAmountPaid =
          paymentDetail.status === 'PAID'
            ? currentAmountPaid - originalSubtotal
            : currentAmountPaid;

        // Actualizar el detalle y el pago principal en una transacción
        const updatedDetail = await this.prisma.$transaction(async (prisma) => {
          const updated = await prisma.paymentDetail.update({
            where: { id: paymentDetailId },
            data: updateData,
            include: {
              room: {
                select: {
                  id: true,
                  number: true,
                  RoomTypes: { select: { id: true, name: true } },
                },
              },
            },
          });

          await this.audit.create({
            entityId: updated.id,
            entityType: 'paymentDetail',
            action: AuditActionType.UPDATE,
            performedById: user.id,
            createdAt: new Date(),
          });

          // Calcular el nuevo estado del pago
          const paymentStatus =
            newAmountPaid >= currentAmount
              ? PaymentDetailStatus.PAID
              : PaymentDetailStatus.PENDING;

          // Actualizar SOLO amountPaid y status en el pago principal
          // NO modificamos el amount total
          await prisma.payment.update({
            where: { id: paymentId },
            data: {
              amountPaid: newAmountPaid,
              status: paymentStatus,
            },
          });

          await this.audit.create({
            entityId: paymentId,
            entityType: 'payment',
            action: AuditActionType.UPDATE,
            performedById: user.id,
            createdAt: new Date(),
          });

          return updated;
        });

        return {
          statusCode: HttpStatus.OK,
          message: 'Detalle de Late Checkout actualizado a pago pendiente',
          data: updatedDetail as unknown as PaymentDetailData,
        };
      }

      // 3. Gestionar cambio desde PENDING_PAYMENT a otro método
      if (isChangingFromPaymentPending) {
        const currentAmount = paymentDetail.payment.amount; // Este no cambiará
        const currentAmountPaid = paymentDetail.payment.amountPaid;
        const paymentId = paymentDetail.payment.id;

        // Para Late Checkout, el subtotal es igual al unitPrice (no usamos days)
        // Si se proporciona subtotal en el DTO, usamos ese valor, de lo contrario usamos unitPrice
        const realSubtotal =
          updatePaymentDetailDto.subtotal || paymentDetail.unitPrice;

        // Al cambiar desde PENDING_PAYMENT, el subtotal se calcula y el estado cambia a PAID
        const updateData = {
          ...updatePaymentDetailDto,
          subtotal: realSubtotal,
          status: PaymentDetailStatus.PAID,
        };

        // Incrementar el amountPaid con el nuevo subtotal
        const newAmountPaid = currentAmountPaid + realSubtotal;

        // Actualizar el detalle y el pago principal en una transacción
        const updatedDetail = await this.prisma.$transaction(async (prisma) => {
          const updated = await prisma.paymentDetail.update({
            where: { id: paymentDetailId },
            data: updateData,
            include: {
              room: {
                select: {
                  id: true,
                  number: true,
                  RoomTypes: { select: { id: true, name: true } },
                },
              },
            },
          });

          await this.audit.create({
            entityId: updated.id,
            entityType: 'paymentDetail',
            action: AuditActionType.UPDATE,
            performedById: user.id,
            createdAt: new Date(),
          });

          // Calcular el nuevo estado del pago
          const paymentStatus =
            newAmountPaid >= currentAmount
              ? PaymentDetailStatus.PAID
              : PaymentDetailStatus.PENDING;

          // Actualizar SOLO amountPaid y status en el pago principal
          // NO modificamos el amount total
          await prisma.payment.update({
            where: { id: paymentId },
            data: {
              amountPaid: newAmountPaid,
              status: paymentStatus,
            },
          });

          await this.audit.create({
            entityId: paymentId,
            entityType: 'payment',
            action: AuditActionType.UPDATE,
            performedById: user.id,
            createdAt: new Date(),
          });

          return updated;
        });

        return {
          statusCode: HttpStatus.OK,
          message: 'Detalle de Late Checkout actualizado de pendiente a pagado',
          data: updatedDetail as unknown as PaymentDetailData,
        };
      }

      // 4. Gestionar actualizaciones generales (sin cambio de método de pago)
      // Verificar si realmente hay cambios que aplicar
      const hasChanges = validateChanges(updatePaymentDetailDto, paymentDetail);

      if (!hasChanges) {
        return {
          statusCode: HttpStatus.OK,
          message: 'No se detectaron cambios para aplicar',
          data: paymentDetail as unknown as PaymentDetailData,
        };
      }

      // Preparar solo los campos que han cambiado
      const updateFields: Record<string, any> = {};
      for (const [key, value] of Object.entries(updatePaymentDetailDto)) {
        if (value !== undefined && value !== paymentDetail[key]) {
          updateFields[key] = value;
        }
      }

      // Para LATE_CHECKOUT, si cambia el unitPrice, actualizamos también el subtotal
      // pero solo si el estado es PAID
      if (
        updateFields.unitPrice !== undefined &&
        paymentDetail.status === 'PAID'
      ) {
        updateFields.subtotal = updateFields.unitPrice;
      }

      // Realizar la actualización en una transacción
      const updatedDetail = await this.prisma.$transaction(async (prisma) => {
        const updated = await prisma.paymentDetail.update({
          where: { id: paymentDetailId },
          data: updateFields,
          include: {
            room: {
              select: {
                id: true,
                number: true,
                RoomTypes: { select: { id: true, name: true } },
              },
            },
          },
        });

        await this.audit.create({
          entityId: updated.id,
          entityType: 'paymentDetail',
          action: AuditActionType.UPDATE,
          performedById: user.id,
          createdAt: new Date(),
        });

        // Si cambió el subtotal o el estado, actualizar también el pago principal
        if (
          updateFields.subtotal !== undefined ||
          updateFields.status !== undefined
        ) {
          const paymentId = paymentDetail.payment.id;

          // Obtener todos los detalles de pago actualizados
          const allDetails = await prisma.paymentDetail.findMany({
            where: { paymentId },
          });

          // Recalculamos el monto total pagado (amountPaid)
          const totalAmountPaid = allDetails
            .filter((detail) => detail.status === 'PAID')
            .reduce((sum, detail) => sum + detail.subtotal, 0);

          // Determinar el estado del pago
          const paymentStatus =
            totalAmountPaid >= paymentDetail.payment.amount
              ? PaymentDetailStatus.PAID
              : PaymentDetailStatus.PENDING;

          // Actualizar la fecha del pago si cambió la fecha del detalle
          const updatePaymentData: any = {
            amountPaid: totalAmountPaid,
            status: paymentStatus,
          };

          if (updateFields.paymentDate) {
            updatePaymentData.date = updateFields.paymentDate;
          }

          // Actualizar el pago principal
          await prisma.payment.update({
            where: { id: paymentId },
            data: updatePaymentData,
          });

          await this.audit.create({
            entityId: paymentId,
            entityType: 'payment',
            action: AuditActionType.UPDATE,
            performedById: user.id,
            createdAt: new Date(),
          });
        }

        return updated;
      });

      return {
        statusCode: HttpStatus.OK,
        message: 'Detalle de Late Checkout actualizado correctamente',
        data: updatedDetail as unknown as PaymentDetailData,
      };
    } catch (error) {
      this.logger.error(
        `Error al actualizar detalle de Late Checkout: ${error.message}`,
        error.stack,
      );

      if (error instanceof BadRequestException) {
        throw error;
      }

      handleException(error, 'Error al actualizar detalle de Late Checkout');
    }
  }

  /**
   * Actualiza los montos y días de los detalles de pago cuando cambian las fechas de una reserva.
   * @param reservationId ID de la reservación cuyas fechas han cambiado
   * @param oldCheckInDate Fecha de check-in anterior
   * @param oldCheckOutDate Fecha de check-out anterior
   * @param newCheckInDate Nueva fecha de check-in
   * @param newCheckOutDate Nueva fecha de check-out
   * @param user Usuario que realiza la acción
   * @returns Detalles actualizados
   */
  async updatePaymentDetailsForDateChange(
    reservationId: string,
    oldCheckInDate: string,
    oldCheckOutDate: string,
    newCheckInDate: string,
    newCheckOutDate: string,
    user: UserData,
  ): Promise<HttpResponse<any>> {
    try {
      // 1. Calcular las noches de estancia anterior y nueva
      const oldNights = calculateStayNights(oldCheckInDate, oldCheckOutDate);
      const newNights = calculateStayNights(newCheckInDate, newCheckOutDate);

      // 2. Si no hay cambios en la cantidad de días, no es necesario hacer nada
      if (oldNights === newNights) {
        return {
          statusCode: HttpStatus.OK,
          message:
            'No hay cambios en la cantidad de días, los pagos se mantienen igual',
          data: { reservationId, oldNights, newNights },
        };
      }

      // 3. Obtener el pago relacionado con la reserva y todos sus detalles
      const payment = await this.prisma.payment.findFirst({
        where: { reservationId },
        include: {
          paymentDetail: {
            include: {
              room: {
                select: {
                  id: true,
                  number: true,
                  RoomTypes: { select: { id: true, name: true, price: true } },
                },
              },
              service: { select: { id: true, name: true } },
              product: { select: { id: true, name: true } },
            },
          },
          reservation: {
            include: {
              room: {
                select: {
                  id: true,
                  number: true,
                  RoomTypes: { select: { id: true, name: true, price: true } },
                },
              },
            },
          },
        },
      });

      if (!payment) {
        return {
          statusCode: HttpStatus.OK,
          message:
            'No hay pagos asociados a esta reserva que requieran actualización',
          data: { reservationId },
        };
      }

      // 4. Iniciar transacción para actualizar todos los detalles y el pago principal
      const result = await this.prisma.$transaction(async (prisma) => {
        // Separamos los detalles por tipo
        const roomDetails = payment.paymentDetail.filter(
          (detail) =>
            detail.type === 'ROOM_RESERVATION' && detail.status === 'PAID',
        );

        const extraServiceDetails = payment.paymentDetail.filter(
          (detail) => detail.type === 'EXTRA_SERVICE',
        );

        const updatedDetails = [];

        // Calcular el monto actual pagado de habitaciones antes de actualizaciones
        const currentRoomAmountPaid = roomDetails.reduce(
          (sum, detail) => sum + detail.subtotal,
          0,
        );

        // 5. Calcular el precio por noche (unitPrice)
        const roomPrice =
          roomDetails.length > 0
            ? roomDetails[0].unitPrice
            : payment.reservation.room?.RoomTypes?.price || 0;

        // 6. Calcular el monto total de servicios extra (no cambiará)
        const extraServicesAmount = extraServiceDetails.reduce(
          (sum, detail) => sum + detail.subtotal,
          0,
        );

        // 7. Calcular el NUEVO monto total de la habitación
        const newRoomAmount = roomPrice * newNights;

        // 8. Si hay detalles de habitación pagados, actualizarlos
        if (roomDetails.length > 0) {
          // Si tenemos más de un detalle de pago para la misma habitación
          if (roomDetails.length > 1) {
            // Ordenar los detalles por días para procesarlos primero los más grandes
            const sortedDetails = [...roomDetails].sort(
              (a, b) => (b.days || 0) - (a.days || 0),
            );
            let remainingNights = newNights;

            for (let i = 0; i < sortedDetails.length; i++) {
              const detail = sortedDetails[i];
              const isLast = i === sortedDetails.length - 1;
              const currentDays = detail.days || 1;

              // Para el último detalle, asignar todos los días restantes
              // Para los anteriores, asignar proporcionalmente o eliminar si no quedan días
              const newDays = isLast
                ? remainingNights
                : Math.min(
                    Math.ceil((newNights * currentDays) / oldNights),
                    remainingNights,
                  );

              if (newDays <= 0 && !isLast) {
                // Si este detalle ya no tiene días asignados y no es el último, eliminarlo
                await prisma.paymentDetail.delete({ where: { id: detail.id } });

                await this.audit.create({
                  entityId: detail.id,
                  entityType: 'paymentDetail',
                  action: AuditActionType.DELETE,
                  performedById: user.id,
                  createdAt: new Date(),
                });
                continue;
              }

              // Actualizar el detalle con los nuevos días
              const newSubtotal = roomPrice * newDays;

              const updatedDetail = await prisma.paymentDetail.update({
                where: { id: detail.id },
                data: {
                  days: newDays,
                  subtotal: newSubtotal,
                },
                include: {
                  room: {
                    select: {
                      id: true,
                      number: true,
                      RoomTypes: { select: { id: true, name: true } },
                    },
                  },
                },
              });

              updatedDetails.push(updatedDetail);
              remainingNights -= newDays;

              // Registrar auditoría
              await this.audit.create({
                entityId: detail.id,
                entityType: 'paymentDetail',
                action: AuditActionType.UPDATE,
                performedById: user.id,
                createdAt: new Date(),
              });
            }
          }
          // Si solo hay un detalle de habitación
          else if (roomDetails.length === 1) {
            const detail = roomDetails[0];
            const currentDays = detail.days || 1;

            // IMPORTANTE: Si los nuevos días son menos que los actuales, reducimos
            // Si son más, mantenemos los actuales (no podemos aumentar días pagados sin un nuevo pago)
            const newDays = Math.min(currentDays, newNights);
            const newSubtotal = roomPrice * newDays;

            const updatedDetail = await prisma.paymentDetail.update({
              where: { id: detail.id },
              data: {
                days: newDays,
                subtotal: newSubtotal,
              },
              include: {
                room: {
                  select: {
                    id: true,
                    number: true,
                    RoomTypes: { select: { id: true, name: true } },
                  },
                },
              },
            });

            updatedDetails.push(updatedDetail);

            // Registrar auditoría
            await this.audit.create({
              entityId: detail.id,
              entityType: 'paymentDetail',
              action: AuditActionType.UPDATE,
              performedById: user.id,
              createdAt: new Date(),
            });
          }
        }

        // 9. Calcular el nuevo monto total incluyendo servicios extra
        const newTotalAmount = newRoomAmount + extraServicesAmount;

        // 10. Calcular el nuevo monto pagado
        let newAmountPaid = 0;

        if (updatedDetails.length > 0) {
          // Si actualizamos detalles, calculamos el nuevo monto pagado sumando los subtotales actualizados
          const updatedRoomAmountPaid = updatedDetails.reduce(
            (sum, detail) => sum + detail.subtotal,
            0,
          );

          // Añadir los montos pagados de servicios extras (que no cambian)
          const extraServicesPaid = extraServiceDetails
            .filter((detail) => detail.status === 'PAID')
            .reduce((sum, detail) => sum + detail.subtotal, 0);

          newAmountPaid = updatedRoomAmountPaid + extraServicesPaid;
        } else {
          // Si no hay detalles actualizados (caso raro), mantenemos el monto pagado original
          // excepto si el nuevo total es menor que lo pagado, en ese caso ajustamos al nuevo total
          newAmountPaid = Math.min(payment.amountPaid, newTotalAmount);
        }

        // 11. Determinar el estado del pago
        const paymentStatus =
          newAmountPaid >= newTotalAmount
            ? PaymentDetailStatus.PAID
            : PaymentDetailStatus.PENDING;

        // 12. Actualizar el pago principal
        const updatedPayment = await prisma.payment.update({
          where: { id: payment.id },
          data: {
            amount: newTotalAmount,
            amountPaid: newAmountPaid,
            status: paymentStatus,
          },
        });

        // Registrar auditoría del pago
        await this.audit.create({
          entityId: payment.id,
          entityType: 'payment',
          action: AuditActionType.UPDATE,
          performedById: user.id,
          createdAt: new Date(),
        });

        return {
          updated: true,
          paymentId: payment.id,
          updatedDetails,
          updatedPayment,
          oldNights,
          newNights,
          newTotalAmount,
          newAmountPaid,
          currentRoomAmountPaid,
        };
      });

      return {
        statusCode: HttpStatus.OK,
        message: `Detalles de pago actualizados correctamente para la nueva duración de ${newNights} noche(s)`,
        data: result,
      };
    } catch (error) {
      this.logger.error(
        `Error actualizando detalles de pago por cambio de fechas: ${error.message}`,
        error.stack,
      );

      if (error instanceof BadRequestException) {
        throw error;
      }

      handleException(
        error,
        'Error actualizando detalles de pago por cambio de fechas',
      );
    }
  }

  /**
   * Elimina un detalle de pago y actualiza el pago principal.
   * @param paymentDetailId ID del detalle de pago a eliminar
   * @param user Usuario que realiza la acción
   * @returns Mensaje de confirmación
   */
  async removePaymentDetail(
    paymentDetailId: string,
    user: UserData,
  ): Promise<HttpResponse<{ message: string }>> {
    try {
      // Verificar que el detalle de pago existe
      const paymentDetail = await this.prisma.paymentDetail.findUnique({
        where: { id: paymentDetailId },
        include: {
          movementsDetail: {
            select: {
              id: true,
            },
          },
          payment: {
            select: {
              id: true,
              amount: true,
              amountPaid: true,
            },
          },
          product: { select: { id: true, name: true } },
          room: {
            select: {
              id: true,
              number: true,
              RoomTypes: { select: { id: true, name: true, price: true } },
            },
          },
          service: { select: { id: true, name: true } },
        },
      });

      if (!paymentDetail) {
        throw new BadRequestException('El detalle de pago no existe');
      }

      const paymentId = paymentDetail.payment.id;
      const detailStatus = paymentDetail.status;
      const detailType = paymentDetail.type;
      const detailMethod = paymentDetail.method;

      // Montos actuales
      const currentAmount = paymentDetail.payment.amount;
      const currentAmountPaid = paymentDetail.payment.amountPaid;

      // Calcular el valor real que representa el detalle para EXTRA_SERVICE
      let realDetailValue = paymentDetail.subtotal;

      // Si es un PENDING_PAYMENT y es de tipo EXTRA_SERVICE, calculamos su valor real
      // multiplicando unitPrice * quantity, sin importar el valor en subtotal
      if (
        detailMethod === 'PENDING_PAYMENT' &&
        detailType === 'EXTRA_SERVICE'
      ) {
        const unitPrice = paymentDetail.unitPrice;
        const quantity = paymentDetail.quantity || 1;
        realDetailValue = unitPrice * quantity;
      }

      // Solo restamos de amountPaid si estaba PAID
      const newAmountPaid =
        detailStatus === 'PAID'
          ? currentAmountPaid - paymentDetail.subtotal
          : currentAmountPaid;

      // Realizar la transacción para eliminar el detalle de pago y actualizar el pago
      await this.prisma.$transaction(async (prisma) => {
        if (paymentDetail.movementsDetail) {
          await this.movementsService.removeMovementDetail(
            paymentDetail.movementsDetail.id,
            user,
          );
        }
        // Eliminar el detalle de pago
        await prisma.paymentDetail.delete({ where: { id: paymentDetailId } });

        // Auditoría del detalle eliminado
        await this.audit.create({
          entityId: paymentDetailId,
          entityType: 'paymentDetail',
          action: AuditActionType.DELETE,
          performedById: user.id,
          createdAt: new Date(),
        });

        // Obtener los detalles restantes para este pago
        const remainingDetails = await prisma.paymentDetail.findMany({
          where: { paymentId },
        });

        // IMPORTANTE: Sólo modificamos el amount cuando eliminamos un EXTRA_SERVICE
        // Nunca modificamos el amount cuando eliminamos un ROOM_RESERVATION
        let newAmount = currentAmount;

        if (detailType === 'EXTRA_SERVICE') {
          // Si es un servicio extra, restamos su valor real del amount
          newAmount = currentAmount - realDetailValue;
        }

        // Determinar el nuevo estado del pago
        const newPaymentStatus =
          newAmountPaid >= newAmount
            ? PaymentDetailStatus.PAID
            : PaymentDetailStatus.PENDING;

        // Fecha más reciente de pago
        let latestPaymentDate: string | null = null;
        const paymentDates = remainingDetails
          .filter((d) => d.paymentDate)
          .map((d) => d.paymentDate)
          .sort((a, b) => (a > b ? -1 : 1));
        if (paymentDates.length > 0) latestPaymentDate = paymentDates[0];

        // Actualizar el pago con los nuevos valores
        await prisma.payment.update({
          where: { id: paymentId },
          data: {
            amount: newAmount,
            amountPaid: newAmountPaid,
            status: newPaymentStatus,
            ...(latestPaymentDate && { date: latestPaymentDate }),
          },
        });

        // Auditoría del pago actualizado
        await this.audit.create({
          entityId: paymentId,
          entityType: 'payment',
          action: AuditActionType.UPDATE,
          performedById: user.id,
          createdAt: new Date(),
        });
      });

      return {
        statusCode: HttpStatus.OK,
        message: 'Detalle de pago eliminado correctamente',
        data: {
          message: 'El detalle de pago ha sido eliminado y el pago actualizado',
        },
      };
    } catch (error) {
      this.logger.error(
        `Error al eliminar el detalle de pago: ${error.message}`,
        error.stack,
      );
      if (error instanceof BadRequestException) {
        throw error;
      }
      handleException(error, 'Error al eliminar el detalle de pago');
    }
  }

  /**
   * Elimina el pago por ID de reservación.
   * @param reservationId Id de la reservación
   * @param user Usuario que realiza la acción
   * @returns Mensaje de confirmación
   */
  async removePaymentByReservationId(
    reservationId: string,
    user: UserData,
  ): Promise<HttpResponse<{ message: string }>> {
    try {
      const payment = await this.prisma.payment.findFirst({
        where: { reservationId },
        include: {
          reservation: {
            include: {
              customer: true,
            },
          },
          paymentDetail: true, // Incluimos los detalles de pago para validar
        },
      });

      if (!payment) {
        throw new BadRequestException(
          'No se encontró el pago asociado a la reservación',
        );
      }

      // Verificar si tiene detalles de pago
      const hasDetails =
        payment.paymentDetail && payment.paymentDetail.length > 0;

      await this.prisma.$transaction(async (prisma) => {
        // Si tiene detalles de pago, eliminarlos primero
        if (hasDetails) {
          // Registrar auditoría para cada detalle eliminado
          for (const detail of payment.paymentDetail) {
            await this.audit.create({
              entityId: detail.id,
              entityType: 'paymentDetail',
              action: AuditActionType.DELETE,
              performedById: user.id,
              createdAt: new Date(),
            });
          }

          // Eliminar todos los detalles de pago asociados
          await prisma.paymentDetail.deleteMany({
            where: { paymentId: payment.id },
          });
        }

        // Luego eliminar el pago principal
        await prisma.payment.delete({ where: { id: payment.id } });

        // Registrar la auditoría del pago eliminado
        await this.audit.create({
          entityId: payment.id,
          entityType: 'payment',
          action: AuditActionType.DELETE,
          performedById: user.id,
          createdAt: new Date(),
        });
      });

      return {
        statusCode: HttpStatus.OK,
        message: 'Pago eliminado correctamente',
        data: {
          message: hasDetails
            ? `El pago y sus ${payment.paymentDetail.length} detalles asociados han sido eliminados`
            : `El pago de la reservación ha sido eliminado`,
        },
      };
    } catch (error) {
      this.logger.error(
        `Error al eliminar el pago por reservación: ${error.message}`,
        error.stack,
      );
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      handleException(error, 'Error al eliminar el pago por reservación');
    }
  }
}
