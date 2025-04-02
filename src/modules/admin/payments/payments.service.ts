import {
  BadRequestException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { HttpResponse, PaymentData, UserData } from 'src/interfaces';
import { PrismaService } from 'src/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { RoomService } from '../room/services/room.service';
import { AuditActionType, ReservationStatus } from '@prisma/client';
import { handleException } from 'src/utils';
import { ServiceService } from '../service/services/service.service';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    /*     private readonly reservationService: ReservationService, */
    private readonly roomService: RoomService,
    private readonly serviceService: ServiceService,
  ) {}

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

      newPayment = await this.prisma.$transaction(async (prisma) => {
        // Crear el nuevo pago
        const payment = await prisma.payment.create({
          data: {
            amount,
            amountPaid,
            date: paymentDate, // Usar la fecha del detalle de pago
            ...(observations && { observations }),
            reservationId,
          },
          select: {
            id: true,
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

  findAll() {
    return `This action returns all payments`;
  }

  findOne(id: number) {
    return `This action returns a #${id} payment`;
  }

  update(id: number, updatePaymentDto: UpdatePaymentDto) {
    return `This action updates a #${id} ${updatePaymentDto} payment`;
  }

  remove(id: number) {
    return `This action removes a #${id} payment`;
  }
}
