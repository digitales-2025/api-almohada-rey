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
  UserData,
} from 'src/interfaces';
import { PrismaService } from 'src/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { RoomService } from '../room/services/room.service';
import {
  AuditActionType,
  PaymentDetailStatus,
  ReservationStatus,
} from '@prisma/client';
import { handleException } from 'src/utils';
import { ServiceService } from '../service/services/service.service';
import { CreateManyPaymentDetailDto } from './dto/create-many-payment-detail.dto';
import { ProductService } from '../product/product.service';
import { UpdatePaymentDetailDto } from './dto/update-payment-detail.dto';
import { validateArray, validateChanges } from 'src/prisma/src/utils';
import { UpdatePaymentDetailsBatchDto } from './dto/updatePaymentDetailsBatch.dto';
import { calculateStayNights } from 'src/utils/dates/peru-datetime';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    /*     private readonly reservationService: ReservationService, */
    private readonly roomService: RoomService,
    private readonly serviceService: ServiceService,
    private readonly productService: ProductService,
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

    try {
      // 1. Verificar que el pago existe
      await this.findById(paymentId);

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
        const details = [];
        const realValues = new Map(); // Usaremos un Map para almacenar los valores reales

        for (const detail of paymentDetail) {
          // Validaciones por tipo
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

          // Determinar status del PaymentDetail según method
          const detailStatus: PaymentDetailStatus =
            detail.method === 'PENDING_PAYMENT'
              ? PaymentDetailStatus.PENDING
              : PaymentDetailStatus.PAID;

          // Si método es PENDING_PAYMENT guardamos subtotal como 0
          const subtotal =
            detail.method === 'PENDING_PAYMENT' ? 0 : detail.subtotal;

          const newDetail = await prisma.paymentDetail.create({
            data: {
              paymentId,
              paymentDate: detail.paymentDate,
              description: detail.description,
              type: detail.type,
              method: detail.method,
              status: detailStatus,
              unitPrice: detail.unitPrice,
              subtotal: subtotal,
              ...(detail.quantity && { quantity: detail.quantity }),
              ...(detail.productId && { productId: detail.productId }),
              ...(detail.roomId && { roomId: detail.roomId }),
              ...(detail.days && { days: detail.days }),
              ...(detail.serviceId && { serviceId: detail.serviceId }),
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

          // Almacenamos el valor real en el Map usando el ID del detalle como clave
          realValues.set(newDetail.id, detail.subtotal);

          // Auditoría
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
        // Para el amount, sumamos el valor real de todos los extras, sin importar el método de pago
        const amountIncrement = details
          .filter((d) => d.type !== 'ROOM_RESERVATION')
          .reduce((sum, d) => sum + realValues.get(d.id), 0);

        // Para amountPaid, sólo sumamos lo efectivamente pagado (no los PENDING_PAYMENT)
        const amountPaidIncrement = details
          .filter((d) => d.method !== 'PENDING_PAYMENT')
          .reduce((sum, d) => sum + d.subtotal, 0);

        // Obtener montos actuales del payment
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

        // Auditoría del payment
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

          await this.audit.create({
            entityId: detail.id,
            entityType: 'paymentDetail',
            action: AuditActionType.UPDATE,
            performedById: user.id,
            createdAt: new Date(),
          });
        }

        for (const [paymentId] of paymentIdMap.entries()) {
          const allPaymentDetails = await prisma.paymentDetail.findMany({
            where: { paymentId },
          });

          const payment = await prisma.payment.findUnique({
            where: { id: paymentId },
          });

          const newAmountPaid = allPaymentDetails
            .filter((d) => d.status === 'PAID')
            .reduce((sum, d) => sum + Number(d.subtotal), 0);

          const updatedPaymentData: any = {
            amountPaid: newAmountPaid,
          };

          const allPaid = allPaymentDetails.every((d) => d.status === 'PAID');

          if (allPaid && payment.amount === newAmountPaid) {
            updatedPaymentData.status = 'PAID';
          }

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
        },
      });

      if (!paymentDetail) {
        throw new BadRequestException('Payment detail does not exist');
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

        // Modificación aquí: Calcular el amount diferente según el tipo de detalle
        let totalAmount = 0;

        // Si existe al menos un detalle de habitación (ROOM_RESERVATION), mantenemos el amount original
        const hasRoomReservation = allDetails.some(
          (detail) => detail.type === 'ROOM_RESERVATION',
        );

        if (hasRoomReservation) {
          // Mantener el amount original para reservas de habitación
          const payment = await prisma.payment.findUnique({
            where: { id: paymentId },
            select: { amount: true },
          });
          totalAmount = payment.amount;
        } else {
          // Para casos sin reservación de habitación, calcular la suma normal
          totalAmount = allDetails.reduce(
            (sum, detail) => sum + detail.subtotal,
            0,
          );
        }

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
            // Solo actualizamos amount si no hay detalles de tipo ROOM_RESERVATION
            ...(hasRoomReservation ? {} : { amount: totalAmount }),
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

      // Montos actuales
      const currentAmount = paymentDetail.payment.amount;
      const currentAmountPaid = paymentDetail.payment.amountPaid;

      // Calcular el valor real que representa el detalle
      let realDetailValue = paymentDetail.subtotal;

      // Si es un PENDING_PAYMENT y es de tipo EXTRA_SERVICE, calculamos su valor real
      // multiplicando unitPrice * quantity, sin importar el valor en subtotal
      if (
        paymentDetail.method === 'PENDING_PAYMENT' &&
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

        // Verificar si hay detalles de tipo ROOM_RESERVATION entre los restantes
        const hasRoomReservation = remainingDetails.some(
          (detail) => detail.type === 'ROOM_RESERVATION',
        );

        // Calcular el nuevo monto total (amount)
        let newAmount: number;

        if (hasRoomReservation) {
          // Si hay detalles de habitación, mantenemos el monto original
          // pero restamos el valor real si estamos eliminando un EXTRA_SERVICE
          if (detailType === 'EXTRA_SERVICE') {
            newAmount = currentAmount - realDetailValue;
          } else {
            newAmount = currentAmount;
          }
        } else if (detailType === 'ROOM_RESERVATION') {
          // Si estamos eliminando un detalle de habitación y no quedan más,
          // debemos recalcular el amount basado en los detalles restantes
          newAmount = remainingDetails.reduce((sum, detail) => {
            // Para los detalles PENDING_PAYMENT, usamos unitPrice * quantity
            if (
              detail.method === 'PENDING_PAYMENT' &&
              detail.type === 'EXTRA_SERVICE'
            ) {
              return sum + detail.unitPrice * (detail.quantity || 1);
            }
            return sum + detail.subtotal;
          }, 0);
        } else {
          // Si estamos eliminando un detalle que no es habitación
          // Usamos el valor real calculado para ajustar el amount
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
}
