import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { ProfitData } from '../interfaces/profit-fields';
import { ExpenseData } from '../interfaces/expense-fields';
import { ProfitRoomTypeData } from '../interfaces/profit-roomtype-fields';
import { BalanceData } from '../interfaces/balance';
import { OccupancyStatsResponse } from '../interfaces/occupancy';

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
        status: {
          in: ['CHECKED_IN', 'CHECKED_OUT', 'CONFIRMED'],
        },
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

  /**
   * Obtiene estadísticas de ocupación por tipo de habitación para un mes y año específico,
   * incluyendo estadísticas por nacionalidad y departamento
   * @param month Mes numérico (1-12)
   * @param year Año (YYYY)
   * @returns Estadísticas detalladas de ocupación
   */
  async getOccupancyStatsByRoomType(
    month: number,
    year: number,
  ): Promise<OccupancyStatsResponse> {
    // Definir rango de fechas para el mes y año
    const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
    const endDate =
      month === 12
        ? `${year + 1}-01-01`
        : `${year}-${(month + 1).toString().padStart(2, '0')}-01`;

    // Primero vamos a obtener todas las habitaciones por tipo para tener el conteo total
    const roomsByType = await this.prisma.room.groupBy({
      by: ['roomTypeId'],
      _count: {
        id: true, // Contar habitaciones por tipo
      },
    });

    // Crear un mapa para acceso rápido
    const roomCountByType: Record<string, number> = {};
    roomsByType.forEach((item) => {
      roomCountByType[item.roomTypeId] = item._count.id;
    });

    // 1. Obtener reservas con CHECKED_IN o CHECKED_OUT en el rango especificado
    // junto con información del cliente para análisis de nacionalidad
    const reservations = await this.prisma.reservation.findMany({
      where: {
        status: {
          in: ['CHECKED_IN', 'CHECKED_OUT'],
        },
        checkInDate: {
          gte: new Date(startDate),
          lt: new Date(endDate),
        },
      },
      select: {
        id: true,
        checkInDate: true,
        checkOutDate: true,
        guests: true,
        customerId: true,
        customer: {
          select: {
            country: true,
            department: true,
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
                guests: true,
              },
            },
          },
        },
      },
    });

    // 2. Agrupar por tipo de habitación
    const statsByRoomType: Record<
      string,
      {
        roomTypeId: string;
        roomTypeName: string;
        capacity: number;
        arrivals: number;
        totalNights: number;
        totalGuests: number;
        occupiedRoomDays: number;
        rooms: Set<number>;
        occupancyDetails: Array<{
          roomNumber: number;
          checkInDate: Date;
          checkOutDate: Date;
          stayDuration: number;
          guestCount: number;
          country: string;
          department: string | null;
        }>;
      }
    > = {};

    // Contadores para estadísticas por nacionalidad y departamento
    const countryStats: Record<
      string,
      {
        arrivals: number;
        overnights: number;
        guests: number;
      }
    > = {};

    const departmentStats: Record<
      string,
      {
        arrivals: number;
        overnights: number;
        guests: number;
      }
    > = {};

    // Contadores diarios para arribos y pernoctaciones
    const diasEnMes = new Date(year, month, 0).getDate();
    const dailyArrivalsCount: Record<string, number> = {};
    const dailyOvernightsCount: Record<string, number> = {};

    // Inicializar contadores diarios
    for (let day = 1; day <= diasEnMes; day++) {
      const dateStr = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
      dailyArrivalsCount[dateStr] = 0;
      dailyOvernightsCount[dateStr] = 0;
    }

    // 3. Calcular estadísticas por cada reserva
    reservations.forEach((reservation) => {
      const roomTypeId = reservation.room.RoomTypes.id;
      const roomTypeName = reservation.room.RoomTypes.name;
      const roomNumber = reservation.room.number;
      const capacity = reservation.room.RoomTypes.guests;
      const country = reservation.customer.country || 'No especificado';
      const department = reservation.customer.department;

      // Inicializar entrada si no existe para el tipo de habitación
      if (!statsByRoomType[roomTypeId]) {
        statsByRoomType[roomTypeId] = {
          roomTypeId,
          roomTypeName,
          capacity,
          arrivals: 0,
          totalNights: 0,
          totalGuests: 0,
          occupiedRoomDays: 0,
          rooms: new Set<number>(),
          occupancyDetails: [],
        };
      }

      // Inicializar estadísticas por país si no existen
      if (!countryStats[country]) {
        countryStats[country] = {
          arrivals: 0,
          overnights: 0,
          guests: 0,
        };
      }

      // Si es Perú, también inicializamos estadísticas por departamento
      if (country === 'Perú' && department) {
        if (!departmentStats[department]) {
          departmentStats[department] = {
            arrivals: 0,
            overnights: 0,
            guests: 0,
          };
        }
      }

      // Calcular duración de estadía en noches
      const checkIn = new Date(reservation.checkInDate);
      const checkOut = new Date(reservation.checkOutDate);
      const stayDuration = Math.max(
        1,
        Math.ceil(
          (checkOut.getTime() - checkIn.getTime()) / (1000 * 3600 * 24),
        ),
      );

      // Calcular número de huéspedes
      let guestCount = 1; // El cliente principal siempre cuenta

      // Añadir huéspedes adicionales desde el campo JSON guests
      if (reservation.guests) {
        try {
          let guestsArray;

          // Manejar tanto si guests es string como si ya es objeto
          if (typeof reservation.guests === 'string') {
            guestsArray = JSON.parse(reservation.guests);
          } else {
            guestsArray = reservation.guests;
          }

          // Verificar si es array y contar elementos
          if (Array.isArray(guestsArray)) {
            guestCount += guestsArray.length;
          }
        } catch (error) {
          console.error('Error al parsear campo guests:', error);
        }
      }

      // Contar arribo en la fecha de llegada
      const checkInDateStr = checkIn.toISOString().split('T')[0];
      if (
        checkInDateStr.startsWith(
          `${year}-${month.toString().padStart(2, '0')}`,
        )
      ) {
        dailyArrivalsCount[checkInDateStr] =
          (dailyArrivalsCount[checkInDateStr] || 0) + 1;
      }

      // Contar pernoctaciones para cada día de la estadía
      const currentDate = new Date(checkIn);
      while (currentDate < checkOut) {
        const dateStr = currentDate.toISOString().split('T')[0];
        if (
          dateStr.startsWith(`${year}-${month.toString().padStart(2, '0')}`)
        ) {
          dailyOvernightsCount[dateStr] =
            (dailyOvernightsCount[dateStr] || 0) + guestCount;
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }

      // Actualizar estadísticas por tipo de habitación
      statsByRoomType[roomTypeId].arrivals += 1;
      statsByRoomType[roomTypeId].totalNights += stayDuration;
      statsByRoomType[roomTypeId].totalGuests += guestCount;
      statsByRoomType[roomTypeId].occupiedRoomDays += stayDuration;
      statsByRoomType[roomTypeId].rooms.add(roomNumber);

      // Actualizar estadísticas por país
      countryStats[country].arrivals += 1;
      countryStats[country].overnights += stayDuration * guestCount;
      countryStats[country].guests += guestCount;

      // Si es Perú, actualizar estadísticas por departamento
      if (country === 'Perú' && department) {
        departmentStats[department].arrivals += 1;
        departmentStats[department].overnights += stayDuration * guestCount;
        departmentStats[department].guests += guestCount;
      }

      // Añadir detalle de ocupación
      statsByRoomType[roomTypeId].occupancyDetails.push({
        roomNumber,
        checkInDate: checkIn,
        checkOutDate: checkOut,
        stayDuration,
        guestCount,
        country,
        department,
      });
    });

    // 4. Calcular promedios y formatear resultados por tipo de habitación
    const roomTypeStats = Object.values(statsByRoomType).map((stats) => {
      // Obtener el conteo total de habitaciones de este tipo desde la BD
      const totalRoomsOfThisType =
        roomCountByType[stats.roomTypeId] || stats.rooms.size;

      // Calcular porcentaje de ocupación basado en arribos vs habitaciones disponibles
      const occupancyRateByArrivals =
        totalRoomsOfThisType > 0
          ? (stats.arrivals / totalRoomsOfThisType) * 100
          : 0;

      // También mantenemos el cálculo original para referencia
      const roomCount = stats.rooms.size;
      const totalPossibleRoomDays = roomCount * diasEnMes;
      const occupancyRateByDays =
        totalPossibleRoomDays > 0
          ? (stats.occupiedRoomDays / totalPossibleRoomDays) * 100
          : 0;

      return {
        roomTypeId: stats.roomTypeId,
        roomTypeName: stats.roomTypeName,
        capacity: stats.capacity,
        uniqueRoomsCount: roomCount, // Habitaciones usadas en el período
        totalRoomsOfThisType, // Total de habitaciones de este tipo (todas las disponibles)
        arrivals: stats.arrivals,
        averageStayDuration: parseFloat(
          (stats.arrivals > 0 ? stats.totalNights / stats.arrivals : 0).toFixed(
            2,
          ),
        ),
        occupiedRoomDays: stats.occupiedRoomDays,
        occupancyRatePercent: parseFloat(occupancyRateByDays.toFixed(2)),
        occupancyRateByArrivalsPercent: parseFloat(
          occupancyRateByArrivals.toFixed(2),
        ), // Nueva métrica
        totalGuests: stats.totalGuests,
        totalOvernights: stats.occupancyDetails.reduce(
          (sum, detail) => sum + detail.guestCount * detail.stayDuration,
          0,
        ),
        arrivalsByDay: this.calculateDailyArrivals(
          stats.occupancyDetails,
          year,
          month,
        ),
        overnightsByDay: this.calculateDailyOvernights(
          stats.occupancyDetails,
          year,
          month,
        ),
        summary: {
          month: month,
          year: year,
          daysInMonth: diasEnMes,
          roomType: stats.roomTypeName,
          totalRooms: totalRoomsOfThisType, // Ahora usamos el total real
        },
      };
    });

    // 5. Formatear estadísticas por nacionalidad
    const nationalityStats = Object.entries(countryStats)
      .map(([country, stats]) => ({
        country,
        arrivals: stats.arrivals,
        overnights: stats.overnights,
        guests: stats.guests,
        averageStayDuration:
          stats.arrivals > 0
            ? parseFloat((stats.overnights / stats.guests).toFixed(2))
            : 0,
      }))
      .sort((a, b) => b.arrivals - a.arrivals); // Ordenar por número de arribos

    // 6. Formatear estadísticas por departamento (solo para Perú)
    const peruvianDepartmentStats = Object.entries(departmentStats)
      .map(([department, stats]) => ({
        department,
        arrivals: stats.arrivals,
        overnights: stats.overnights,
        guests: stats.guests,
        averageStayDuration:
          stats.arrivals > 0
            ? parseFloat((stats.overnights / stats.guests).toFixed(2))
            : 0,
      }))
      .sort((a, b) => b.arrivals - a.arrivals); // Ordenar por número de arribos

    // 7. Formatear estadísticas diarias de arribos y pernoctaciones
    const dailyStats = Object.keys(dailyArrivalsCount)
      .sort() // Ordenar por fecha
      .map((date) => ({
        date,
        arrivals: dailyArrivalsCount[date],
        overnights: dailyOvernightsCount[date],
      }));

    return {
      roomTypeStats,
      nationalityStats,
      peruvianDepartmentStats,
      dailyStats,
      summary: {
        month,
        year,
        totalRoomTypes: roomTypeStats.length,
        totalCountries: nationalityStats.length,
        totalPeruvianDepartments: peruvianDepartmentStats.length,
        totalArrivals: nationalityStats.reduce(
          (sum, stat) => sum + stat.arrivals,
          0,
        ),
        totalOvernights: nationalityStats.reduce(
          (sum, stat) => sum + stat.overnights,
          0,
        ),
        totalGuests: nationalityStats.reduce(
          (sum, stat) => sum + stat.guests,
          0,
        ),
      },
    };
  }

  /**
   * Calcula la cantidad de arribos por día para un mes específico
   * @private
   */
  private calculateDailyArrivals(
    occupancyDetails: Array<{
      checkInDate: Date;
      country: string;
      department: string | null;
    }>,
    year: number,
    month: number,
  ): Record<string, number> {
    const result: Record<string, number> = {};
    const diasEnMes = new Date(year, month, 0).getDate();

    // Inicializar todos los días del mes con 0
    for (let day = 1; day <= diasEnMes; day++) {
      const dateStr = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
      result[dateStr] = 0;
    }

    // Contar arribos por día
    occupancyDetails.forEach((detail) => {
      const dateStr = detail.checkInDate.toISOString().split('T')[0];
      // Solo contar si está dentro del mes solicitado
      if (dateStr.startsWith(`${year}-${month.toString().padStart(2, '0')}`)) {
        result[dateStr] = (result[dateStr] || 0) + 1;
      }
    });

    return result;
  }

  /**
   * Calcula la cantidad de pernoctaciones por día para un mes específico
   * @private
   */
  private calculateDailyOvernights(
    occupancyDetails: Array<{
      checkInDate: Date;
      checkOutDate: Date;
      guestCount: number;
      country: string;
      department: string | null;
    }>,
    year: number,
    month: number,
  ): Record<string, number> {
    const result: Record<string, number> = {};
    const diasEnMes = new Date(year, month, 0).getDate();

    // Inicializar todos los días del mes con 0
    for (let day = 1; day <= diasEnMes; day++) {
      const dateStr = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
      result[dateStr] = 0;
    }

    // Contar pernoctaciones por día
    occupancyDetails.forEach((detail) => {
      const checkIn = new Date(detail.checkInDate);
      const checkOut = new Date(detail.checkOutDate);

      // Para cada día entre checkIn y checkOut
      const currentDate = new Date(checkIn);
      while (currentDate < checkOut) {
        const dateStr = currentDate.toISOString().split('T')[0];
        // Solo contar si está dentro del mes solicitado
        if (
          dateStr.startsWith(`${year}-${month.toString().padStart(2, '0')}`)
        ) {
          result[dateStr] = (result[dateStr] || 0) + detail.guestCount;
        }
        // Avanzar al siguiente día
        currentDate.setDate(currentDate.getDate() + 1);
      }
    });

    return result;
  }

  /**
   * Obtiene estadísticas de razones de reserva para un mes y año específico
   * @param month Mes numérico (1-12)
   * @param year Año (YYYY)
   * @returns Estadísticas de razones de reserva
   */
  async getReservationReasonsStats(
    month: number,
    year: number,
  ): Promise<{
    reasons: Array<{
      reason: string;
      arrivals: number;
      overnights: number;
      guests: number;
      averageStayDuration: number;
      percentageOfTotal: number;
    }>;
    totalArrivals: number;
    totalOvernights: number;
    totalGuests: number;
  }> {
    const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
    const endDate =
      month === 12
        ? `${year + 1}-01-01`
        : `${year}-${(month + 1).toString().padStart(2, '0')}-01`;

    // Obtener reservas con razones en el rango especificado
    const reservations = await this.prisma.reservation.findMany({
      where: {
        checkInDate: {
          gte: new Date(startDate),
          lt: new Date(endDate),
        },
        reason: {
          not: null,
        },
      },
      select: {
        id: true,
        reason: true,
        checkInDate: true,
        checkOutDate: true,
        guests: true,
      },
    });

    // Agrupar por razón
    const reasonsMap: Record<
      string,
      {
        arrivals: number;
        overnights: number;
        guests: number;
        totalStayDuration: number;
      }
    > = {};

    reservations.forEach((reservation) => {
      const reason = reservation.reason.toLowerCase();

      if (!reasonsMap[reason]) {
        reasonsMap[reason] = {
          arrivals: 0,
          overnights: 0,
          guests: 0,
          totalStayDuration: 0,
        };
      }

      // Calcular duración de estadía
      const checkIn = new Date(reservation.checkInDate);
      const checkOut = new Date(reservation.checkOutDate);
      const stayDuration = Math.max(
        1,
        Math.ceil(
          (checkOut.getTime() - checkIn.getTime()) / (1000 * 3600 * 24),
        ),
      );

      // Calcular número de huéspedes
      let guestCount = 1;
      if (reservation.guests) {
        try {
          let guestsArray;
          if (typeof reservation.guests === 'string') {
            guestsArray = JSON.parse(reservation.guests);
          } else {
            guestsArray = reservation.guests;
          }
          if (Array.isArray(guestsArray)) {
            guestCount += guestsArray.length;
          }
        } catch (error) {
          console.error('Error al parsear campo guests:', error);
        }
      }

      // Actualizar estadísticas
      reasonsMap[reason].arrivals += 1;
      reasonsMap[reason].overnights += stayDuration * guestCount;
      reasonsMap[reason].guests += guestCount;
      reasonsMap[reason].totalStayDuration += stayDuration;
    });

    // Calcular totales
    const totalArrivals = Object.values(reasonsMap).reduce(
      (sum, stats) => sum + stats.arrivals,
      0,
    );
    const totalOvernights = Object.values(reasonsMap).reduce(
      (sum, stats) => sum + stats.overnights,
      0,
    );
    const totalGuests = Object.values(reasonsMap).reduce(
      (sum, stats) => sum + stats.guests,
      0,
    );

    // Formatear resultados
    const reasons = Object.entries(reasonsMap)
      .map(([reason, stats]) => ({
        reason: reason.charAt(0).toUpperCase() + reason.slice(1), // Capitalizar primera letra
        arrivals: stats.arrivals,
        overnights: stats.overnights,
        guests: stats.guests,
        averageStayDuration: parseFloat(
          (stats.arrivals > 0
            ? stats.totalStayDuration / stats.arrivals
            : 0
          ).toFixed(2),
        ),
        percentageOfTotal: parseFloat(
          (totalArrivals > 0
            ? (stats.arrivals / totalArrivals) * 100
            : 0
          ).toFixed(1),
        ),
      }))
      .sort((a, b) => b.arrivals - a.arrivals); // Ordenar por número de arribos

    return {
      reasons,
      totalArrivals,
      totalOvernights,
      totalGuests,
    };
  }
}
