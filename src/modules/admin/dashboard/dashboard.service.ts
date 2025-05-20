import { Injectable, Logger } from '@nestjs/common';
import { AnnualAdministratorStatisticsData } from 'src/interfaces';
import { PrismaService } from 'src/prisma/prisma.service';
import { handleException } from 'src/utils';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);
  constructor(private readonly prisma: PrismaService) {}

  async findAnnualAdministratorStatistics(
    year: number,
  ): Promise<AnnualAdministratorStatisticsData> {
    try {
      // Construir el prefijo del año para comparar con el campo date
      const yearPrefix = `${year}-`;

      // Obtener todos los pagos del año especificado usando el campo date
      const payments = await this.prisma.payment.findMany({
        where: {
          date: {
            startsWith: yearPrefix, // Filtra por pagos cuyo date comience con el año especificado
          },
        },
        select: {
          amountPaid: true,
        },
      });

      // Calcular el total de ingresos sumando amountPaid
      const totalIncome = payments.reduce(
        (acc, payment) => acc + payment.amountPaid,
        0,
      );

      // Obtener el conteo de nuevos clientes registrados en el año especificado
      const startDate = new Date(`${year}-01-01T00:00:00.000Z`);
      const endDate = new Date(`${year}-12-31T23:59:59.999Z`);

      const newCustomersCount = await this.prisma.customer.count({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
      });

      // Obtener pagos pendientes según la tabla PaymentDetail
      const pendingPaymentDetails = await this.prisma.paymentDetail.findMany({
        where: {
          paymentDate: {
            startsWith: yearPrefix, // Filtra detalles de pago cuyo paymentDate comience con el año especificado
          },
          method: 'PENDING_PAYMENT', // Solo los que tienen método de pago pendiente
          status: 'PENDING', // Y que estén en estado pendiente
        },
        select: {
          type: true,
          unitPrice: true,
          subtotal: true,
          days: true,
          quantity: true,
        },
      });

      // Calcular el monto total de pagos pendientes
      const pendingPaymentsTotal = pendingPaymentDetails.reduce(
        (acc, detail) => {
          let amount = detail.subtotal;

          // Si el subtotal es 0, calculamos el valor según el tipo de detalle
          if (amount === 0) {
            if (detail.type === 'ROOM_RESERVATION' && detail.days) {
              // Para reservas de habitación: unitPrice * días
              amount = detail.unitPrice * detail.days;
            } else if (detail.type === 'EXTRA_SERVICE' && detail.quantity) {
              // Para servicios extra: unitPrice * cantidad
              amount = detail.unitPrice * detail.quantity;
            } else if (detail.type === 'LATE_CHECKOUT') {
              // Para late checkout: usamos directamente el unitPrice
              amount = detail.unitPrice;
            }
          }

          return acc + amount;
        },
        0,
      );

      return {
        totalIncome,
        occupancyRate: 0,
        newCustomers: newCustomersCount,
        pendingPayments: pendingPaymentsTotal,
      };
    } catch (error) {
      this.logger.error(
        'Error obteniendo estadísticas administrativas anuales',
      );
      handleException(
        error,
        'Error obteniendo estadísticas administrativas anuales',
      );
    }
  }
}
