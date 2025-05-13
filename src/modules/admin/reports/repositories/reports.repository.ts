import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { ProfitData } from '../interfaces/profit-fields';
import { ExpenseData } from '../interfaces/expense-fields';
import { ProfitRoomTypeData } from '../interfaces/profit-roomtype-fields';
import { BalanceData } from '../interfaces/balance';

@Injectable()
export class ReportsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Obtiene los datos de profit (ganancias) de todas las tablas configuradas,
   * filtrando por mes y año.
   * @param month Mes numérico (1-12)
   * @param year Año (YYYY)
   * @returns Arreglo de objetos ProfitSummary
   */

  async getProfit(month: number, year: number): Promise<ProfitData[]> {
    const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
    const endDate =
      month === 12
        ? `${year + 1}-01-01`
        : `${year}-${(month + 1).toString().padStart(2, '0')}-01`;

    // 1. Reservas CHECKED_IN en el rango
    const reservas = await this.prisma.reservation.findMany({
      where: {
        checkInDate: {
          gte: new Date(startDate),
          lt: new Date(endDate),
        },
        status: 'CHECKED_IN',
      },
      select: { id: true, checkInDate: true },
    });

    const reservaIds = reservas.map((r) => r.id);

    // 2. Pagos en el rango (por campo date)
    const pagos = await this.prisma.payment.findMany({
      where: {
        date: {
          gte: startDate,
          lt: endDate,
        },
        reservationId: { in: reservaIds },
      },
      select: { id: true, date: true },
    });

    const pagoIds = pagos.map((p) => p.id);

    // 3. PaymentDetail en el rango, asociados a los pagos anteriores
    const detalles = await this.prisma.paymentDetail.findMany({
      where: {
        paymentDate: {
          gte: startDate,
          lt: endDate,
        },
        paymentId: { in: pagoIds },
        status: 'PAID',
      },
      select: {
        paymentDate: true,
        type: true,
        subtotal: true,
      },
      orderBy: { paymentDate: 'asc' },
    });

    // 4. Agrupar por fecha y sumar
    const resumenMap: Record<
      string,
      { totalReservas: number; totalExtras: number; conteo: number }
    > = {};

    detalles.forEach((d) => {
      const fecha = d.paymentDate;
      if (!resumenMap[fecha]) {
        resumenMap[fecha] = { totalReservas: 0, totalExtras: 0, conteo: 0 };
      }
      if (d.type === 'ROOM_RESERVATION') {
        resumenMap[fecha].totalReservas += d.subtotal;
        resumenMap[fecha].conteo += 1; // Suma 1 por cada movimiento de habitación
      } else if (d.type === 'EXTRA_SERVICE') {
        resumenMap[fecha].totalExtras += d.subtotal;
      }
    });

    // 5. Convertir a array y calcular total
    const resumen: ProfitData[] = Object.entries(resumenMap).map(
      ([date, vals]) => ({
        date,
        conteo: vals.conteo, // <-- Nuevo campo
        totalReservas: vals.totalReservas,
        totalExtras: vals.totalExtras,
        total: vals.totalReservas + vals.totalExtras,
      }),
    );

    // Ordenar por fecha ascendente
    return resumen.sort((a, b) => a.date.localeCompare(b.date));
  }
  /* Fin reporte ganancias  */

  /**
   * Obtiene los gastos diarios agrupados por día para un mes y año específicos.
   * @param month Mes numérico (1-12)
   * @param year Año (YYYY)
   * @returns Objeto con los gastos diarios agrupados por día
   */

  async getExpense(month: number, year: number): Promise<ExpenseData[]> {
    const startDate = new Date(
      `${year}-${month.toString().padStart(2, '0')}-01`,
    );
    const endDate = new Date(
      month === 12
        ? `${year + 1}-01-01`
        : `${year}-${(month + 1).toString().padStart(2, '0')}-01`,
    );

    // Movements INPUT (gastos de inventario)
    const inputMovements = await this.prisma.movements.findMany({
      where: {
        type: 'INPUT',
        dateMovement: {
          gte: startDate.toISOString().slice(0, 10),
          lt: endDate.toISOString().slice(0, 10),
        },
      },
      select: {
        id: true,
        dateMovement: true,
        description: true,
        typePurchaseOrder: true, // Campo correcto según el esquema
        movementsDetail: {
          select: { subtotal: true },
        },
      },
      orderBy: { dateMovement: 'asc' },
    });

    // HotelExpense (gastos directos)
    const hotelExpenses = await this.prisma.hotelExpense.findMany({
      where: {
        date: {
          gte: startDate.toISOString().slice(0, 10),
          lt: endDate.toISOString().slice(0, 10),
        },
      },
      select: {
        id: true,
        date: true,
        description: true,
        category: true,
        paymentMethod: true,
        amount: true,
        documentType: true,
      },
      orderBy: { date: 'asc' },
    });

    // Agrupa y suma por fecha
    const resumenPorFecha: Record<
      string,
      {
        id: string;
        amount: number;
        date: string;
        description: string | null;
        category: string | null;
        paymentMethod: string | null;
        movimientosBoleta: number;
        movimientosFactura: number;
        movimientosOtro: number;
        totalMovimientos: number; // Nuevo campo
        gastosBoleta: number;
        gastosFactura: number;
        gastosOtro: number;
        totalGastos: number; // Nuevo campo
        type: 'INVENTORY_INPUT' | 'HOTEL_EXPENSE';
      }
    > = {};

    // Procesar movimientos (INVENTORY_INPUT)
    inputMovements.forEach((mov) => {
      const fecha = mov.dateMovement;
      const amount = mov.movementsDetail.reduce(
        (sum, det) => sum + det.subtotal,
        0,
      );

      if (!resumenPorFecha[fecha]) {
        resumenPorFecha[fecha] = {
          id: fecha,
          amount: 0,
          date: fecha,
          description: null,
          category: null,
          paymentMethod: null,
          movimientosBoleta: 0,
          movimientosFactura: 0,
          movimientosOtro: 0,
          totalMovimientos: 0, // Nuevo campo
          gastosBoleta: 0,
          gastosFactura: 0,
          gastosOtro: 0,
          totalGastos: 0, // Nuevo campo
          type: 'INVENTORY_INPUT',
        };
      }

      // Sumar al total general
      resumenPorFecha[fecha].amount += amount;

      // Sumar al total por tipo de documento para movimientos
      if (mov.typePurchaseOrder === 'RECEIPT') {
        resumenPorFecha[fecha].movimientosBoleta += amount;
      } else if (mov.typePurchaseOrder === 'INVOICE') {
        resumenPorFecha[fecha].movimientosFactura += amount;
      } else {
        resumenPorFecha[fecha].movimientosOtro += amount;
      }

      // Actualizar totalMovimientos
      resumenPorFecha[fecha].totalMovimientos =
        resumenPorFecha[fecha].movimientosBoleta +
        resumenPorFecha[fecha].movimientosFactura +
        resumenPorFecha[fecha].movimientosOtro;
    });

    // Procesar gastos directos (HOTEL_EXPENSE)
    hotelExpenses.forEach((exp) => {
      const fecha = exp.date;

      if (!resumenPorFecha[fecha]) {
        resumenPorFecha[fecha] = {
          id: fecha,
          amount: 0,
          date: fecha,
          description: null,
          category: null,
          paymentMethod: null,
          movimientosBoleta: 0,
          movimientosFactura: 0,
          movimientosOtro: 0,
          totalMovimientos: 0, // Nuevo campo
          gastosBoleta: 0,
          gastosFactura: 0,
          gastosOtro: 0,
          totalGastos: 0, // Nuevo campo
          type: 'HOTEL_EXPENSE',
        };
      }

      // Sumar al total general
      resumenPorFecha[fecha].amount += exp.amount;

      // Sumar al total por tipo de documento para gastos
      if (exp.documentType === 'RECEIPT') {
        resumenPorFecha[fecha].gastosBoleta += exp.amount;
      } else if (exp.documentType === 'INVOICE') {
        resumenPorFecha[fecha].gastosFactura += exp.amount;
      } else {
        resumenPorFecha[fecha].gastosOtro += exp.amount;
      }

      // Actualizar totalGastos
      resumenPorFecha[fecha].totalGastos =
        resumenPorFecha[fecha].gastosBoleta +
        resumenPorFecha[fecha].gastosFactura +
        resumenPorFecha[fecha].gastosOtro;
    });

    // Convertir a array y ordenar por fecha
    const expenses: ExpenseData[] = Object.values(resumenPorFecha).sort(
      (a, b) => a.date.localeCompare(b.date),
    );

    return expenses;
  }
  /* Fin reporte gastos  */

  /**
   * Obtiene los datos de profit y expense para el balance,
   * retornando ambos arreglos en un solo objeto.
   * @param month Mes numérico (1-12)
   * @param year Año (YYYY)
   * @returns Objeto con arreglos profit y expense
   */
  async getBalance(month: number, year: number): Promise<BalanceData> {
    const [profit, expense] = await Promise.all([
      this.getProfit(month, year),
      this.getExpense(month, year),
    ]);
    return { profit, expense };
  }

  /* Fin reporte balance */

  /**
   * Genera y retorna un Excel con los datos de ganancia por habitación del mes y año indicados.
   * @param month Mes numérico (1-12)
   * @param year Año (YYYY)
   * @param typeRoomId ID del tipo de habitación
   * @returns ExcelJS.Workbook con los datos de balance
   */
  async getProfitTypeRoom(
    month: number,
    year: number,
    typeRoomId: string,
  ): Promise<ProfitRoomTypeData[]> {
    const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
    const endDate =
      month === 12
        ? `${year + 1}-01-01`
        : `${year}-${(month + 1).toString().padStart(2, '0')}-01`;

    // Habitaciones
    const roomDetails = await this.prisma.paymentDetail.findMany({
      where: {
        type: 'ROOM_RESERVATION',
        status: 'PAID',
        paymentDate: {
          gte: startDate,
          lt: endDate,
        },
        payment: {
          reservation: {
            room: {
              roomTypeId: typeRoomId, // <-- Filtro por tipo de habitación
            },
          },
        },
      },
      select: {
        id: true,
        paymentDate: true,
        subtotal: true,
        payment: {
          select: {
            reservation: {
              select: {
                room: {
                  select: {
                    RoomTypes: { select: { name: true } },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { paymentDate: 'asc' },
    });

    // Extras asociados a reserva/habitación
    const extraDetails = await this.prisma.paymentDetail.findMany({
      where: {
        type: 'EXTRA_SERVICE',
        status: 'PAID',
        paymentDate: {
          gte: startDate,
          lt: endDate,
        },
        payment: {
          reservation: {
            room: {
              roomTypeId: typeRoomId, // <-- Filtro por tipo de habitación
            },
          },
        },
      },
      select: {
        id: true,
        paymentDate: true,
        subtotal: true,
        payment: {
          select: {
            reservation: {
              select: {
                room: {
                  select: {
                    RoomTypes: { select: { name: true } },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { paymentDate: 'asc' },
    });

    // Generar filas independientes para cada habitación y extra
    const rows: ProfitRoomTypeData[] = [];

    roomDetails.forEach((d) => {
      rows.push({
        date: d.paymentDate,
        tipoIngreso: 'Habitación',
        habitacion: d.payment?.reservation?.room?.RoomTypes?.name ?? 'Sin tipo',
        totalHabitacion: d.subtotal,
        totalExtras: 0,
        totalGeneral: d.subtotal,
      });
    });

    extraDetails.forEach((d) => {
      rows.push({
        date: d.paymentDate,
        tipoIngreso: 'Habitación',
        habitacion: d.payment?.reservation?.room?.RoomTypes?.name ?? 'Sin tipo',
        totalHabitacion: 0,
        totalExtras: d.subtotal,
        totalGeneral: d.subtotal,
      });
    });

    // Ordenar por fecha y habitación
    return rows.sort((a, b) => {
      if (a.date === b.date) return a.habitacion.localeCompare(b.habitacion);
      return a.date.localeCompare(b.date);
    });
  }
  /* Fin reporte ganacias tipo de habitacion */
}
