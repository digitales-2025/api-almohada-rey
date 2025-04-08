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
  SummaryPaymentData,
  UserData,
} from 'src/interfaces';
import { PrismaService } from 'src/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { RoomService } from '../room/services/room.service';
import { AuditActionType, ReservationStatus } from '@prisma/client';
import { handleException } from 'src/utils';
import { ServiceService } from '../service/services/service.service';
import { CreateManyPaymentDetailDto } from './dto/create-many-payment-detail.dto';
import { ProductService } from '../product/product.service';

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
    const { reservationId, amount, amountPaid, observations, paymentDetail } =
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

      // Obtener la fecha de pago del primer detalle para usarla como fecha de pago general
      const paymentDate = paymentDetail[0].paymentDate;

      // Generamos el código del pago
      const code = await this.generatePaymentCode();

      newPayment = await this.prisma.$transaction(async (prisma) => {
        // Crear el nuevo pago
        const payment = await prisma.payment.create({
          data: {
            amount,
            amountPaid,
            code,
            date: paymentDate, // Usar la fecha del detalle de pago
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

        // Crear detalles de pago
        const createdDetails = [];
        for (const detail of paymentDetail) {
          const paymentDetailData = {
            paymentId: payment.id,
            paymentDate: detail.paymentDate,
            description: detail.description || '',
            type: detail.type,
            method: detail.method,
            unitPrice: detail.unitPrice,
            subtotal: detail.subtotal,
            ...(detail.quantity && { quantity: detail.quantity }),
            ...(detail.productId && { productId: detail.productId }),
            ...(detail.roomId && { roomId: detail.roomId }),
            ...(detail.days && { days: detail.days }),
            ...(detail.serviceId && { serviceId: detail.serviceId }),
          };

          // Validación específica según el tipo de detalle
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
              'Para servicios extras, debe especificar el servicio',
            );
          }

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
        };
      });

      // Verificar que el monto pagado (amountPaid) sea igual al subtotal de los detalles
      if (newPayment.paymentDetail && newPayment.paymentDetail.length > 0) {
        const totalSubtotal = newPayment.paymentDetail.reduce(
          (sum, detail) => sum + detail.subtotal,
          0,
        );

        if (amountPaid !== totalSubtotal) {
          this.logger.warn(
            `El monto pagado (${amountPaid}) no coincide con la suma de subtotales (${totalSubtotal})`,
          );
        }
      }

      // Validación con logger que se creo correctamente el pago
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
      // Verificar que el pago existe
      await this.findById(paymentId);

      // Validar que hay detalles para crear
      if (!paymentDetail || paymentDetail.length === 0) {
        throw new BadRequestException(
          'Debe proporcionar al menos un detalle de pago',
        );
      }

      // Verificar que los productos y servicios existen
      for (const detail of paymentDetail) {
        if (detail.productId) {
          // Validar que el producto existe
          await this.productService.findById(detail.productId);
        }

        if (detail.serviceId) {
          // Validar que el servicio existe
          await this.serviceService.findById(detail.serviceId);
        }

        if (detail.roomId) {
          // Validar que la habitación existe
          await this.roomService.findById(detail.roomId);
        }
      }

      // Crear los detalles de pago dentro de una transacción
      const createdDetails = await this.prisma.$transaction(async (prisma) => {
        const details = [];

        for (const detail of paymentDetail) {
          // Validación específica según el tipo de detalle
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

          const newDetail = await prisma.paymentDetail.create({
            data: {
              paymentId,
              paymentDate: detail.paymentDate,
              description: detail.description,
              type: detail.type,
              method: detail.method,
              unitPrice: detail.unitPrice,
              subtotal: detail.subtotal,
              ...(detail.quantity && { quantity: detail.quantity }),
              ...(detail.productId && { productId: detail.productId }),
              ...(detail.roomId && { roomId: detail.roomId }),
              ...(detail.days && { days: detail.days }),
              ...(detail.serviceId && { serviceId: detail.serviceId }),
            },
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

          // Registrar la auditoría para cada detalle
          await this.audit.create({
            entityId: newDetail.id,
            entityType: 'paymentDetail',
            action: AuditActionType.CREATE,
            performedById: user.id,
            createdAt: new Date(),
          });

          details.push(newDetail);
        }

        // Calcular el total de subtotales de los nuevos detalles
        const totalSubtotal = details.reduce(
          (sum, detail) => sum + detail.subtotal,
          0,
        );

        // Encontrar la fecha más reciente de todos los detalles nuevos
        const latestPaymentDate = details
          .map((detail) => detail.paymentDate)
          .sort()
          .pop();

        // Actualizar tanto el monto pagado como el monto total y la fecha de pago
        await prisma.payment.update({
          where: { id: paymentId },
          data: {
            amount: { increment: totalSubtotal }, // Incrementar también el monto total
            amountPaid: { increment: totalSubtotal },
            date: latestPaymentDate, // Actualizar la fecha del pago con la fecha más reciente
          },
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
      this.logger.error('Error get customer');
      if (error instanceof BadRequestException) {
        throw error;
      }
      handleException(error, 'Error get customer');
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

    return paymentDb;
  }

  update(id: number, updatePaymentDto: UpdatePaymentDto) {
    return `This action updates a #${id} ${updatePaymentDto} payment`;
  }

  remove(id: number) {
    return `This action removes a #${id} payment`;
  }
}
