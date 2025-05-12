import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { ProfitData } from '../interfaces/profit-fields';
import { ExpenseData } from '../interfaces/expense-fields';

@Injectable()
export class ReportsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /*   pautas del como obtener las ganancias

  Reservation =conf = checin
  
  Payment + amountPaid = total general+
  
  PaymentDetail= fecha de reporte = paymentDate */

  /**
   * Obtiene los datos de profit (ganancias) de todas las tablas configuradas,
   * filtrando por mes y año.
   * @param month Mes numérico (1-12)
   * @param year Año (YYYY)
   * @returns Arreglo de objetos ProfitData
   */
  async getProfit(month: number, year: number): Promise<ProfitData[]> {
    const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
    const endDate =
      month === 12
        ? `${year + 1}-01-01`
        : `${year}-${(month + 1).toString().padStart(2, '0')}-01`;

    // 1. Ganancias por reservas de habitaciones
    const roomDetails = await this.prisma.paymentDetail.findMany({
      where: {
        type: 'ROOM_RESERVATION',
        status: 'PAID',
        paymentDate: {
          gte: startDate,
          lt: endDate,
        },
      },
      select: {
        id: true,
        paymentDate: true,
        subtotal: true,
        room: {
          select: {
            roomTypeId: true,
            RoomTypes: { select: { name: true } },
          },
        },
      },
      orderBy: { paymentDate: 'asc' },
    });

    // 2. Ganancias por extras (productos y servicios)
    const extraDetails = await this.prisma.paymentDetail.findMany({
      where: {
        type: 'EXTRA_SERVICE',
        status: 'PAID',
        paymentDate: {
          gte: startDate,
          lt: endDate,
        },
      },
      select: {
        id: true,
        paymentDate: true,
        subtotal: true,
        product: { select: { name: true } },
        service: { select: { name: true } },
      },
      orderBy: { paymentDate: 'asc' },
    });

    // Agrupar y sumar ganancias por fecha y tipo
    const profitsMap: Record<string, ProfitData> = {};

    // Habitaciones
    roomDetails.forEach((d) => {
      const key = `${d.paymentDate}-room-${d.room?.roomTypeId ?? 'SIN_TIPO'}`;
      if (!profitsMap[key]) {
        profitsMap[key] = {
          id: d.id,
          amount: 0,
          date: d.paymentDate,
          type: 'ROOM',
          roomTypeName: d.room?.RoomTypes?.name ?? 'Sin tipo',
        };
      }
      profitsMap[key].amount += d.subtotal;
    });

    // Extras (productos y servicios)
    extraDetails.forEach((d) => {
      const extraName = d.product?.name || d.service?.name || 'Extra';
      const key = `${d.paymentDate}-extra-${extraName}`;
      if (!profitsMap[key]) {
        profitsMap[key] = {
          id: d.id,
          amount: 0,
          date: d.paymentDate,
          type: 'EXTRA',
          extraName,
        };
      }
      profitsMap[key].amount += d.subtotal;
    });

    // Convertir a array
    return Object.values(profitsMap);
  }

  /**
   * Obtiene los datos de profit y expense para el balance,
   * retornando ambos arreglos en un solo objeto.
   * @param month Mes numérico (1-12)
   * @param year Año (YYYY)
   * @returns Objeto con arreglos profit y expense
   */
  /*  async getBalance(month: number, year: number): Promise<BalanceData> {
    const [profit, expense] = await Promise.all([
      this.getProfit(month, year),
      this.getExpense(month, year),
    ]);
    return { profit, expense };
  } */

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
        documentNumber: true,
      },
      orderBy: { date: 'asc' },
    });

    const paymentMethodMap: Record<string, string> = {
      CASH: 'Efectivo',
      TRANSFER: 'Transferencia',
      CARD: 'Tarjeta',
    };

    // Unifica ambos en un solo array plano
    const expenses: ExpenseData[] = [
      ...inputMovements.map(
        (mov): ExpenseData => ({
          id: mov.id,
          amount: mov.movementsDetail.reduce(
            (sum, det) => sum + det.subtotal,
            0,
          ),
          date: mov.dateMovement,
          description: mov.description ?? null,
          category: 'INVENTARIO',
          paymentMethod: null,
          documentType: null,
          documentNumber: null,
          type: 'INVENTORY_INPUT',
        }),
      ),
      ...hotelExpenses.map(
        (exp): ExpenseData => ({
          id: exp.id,
          amount: exp.amount,
          date: exp.date,
          description: exp.description ?? null,
          category: exp.category === 'FIXED' ? 'FIJO' : (exp.category ?? null),
          paymentMethod: exp.paymentMethod
            ? (paymentMethodMap[exp.paymentMethod] ?? exp.paymentMethod)
            : null,
          documentType: exp.documentType ?? null,
          documentNumber: exp.documentNumber ?? null,
          type: 'HOTEL_EXPENSE',
        }),
      ),
    ];

    return expenses;
  }
  /* Fin reporte gastos  */
}
