import { Injectable, Logger } from '@nestjs/common';
import {
  AmenitiesByPriorityData,
  AnnualAdministratorStatisticsData,
  CustomerOriginSummaryData,
  FullReservationsData,
  ListRoom,
  MonthlyBookingTrendData,
  MonthlyCustomerOriginData,
  MonthlyEarningsAndExpensesData,
  NextPendingPaymentsData,
  OccupationStatisticsPercentageData,
  PriorityLevel,
  RecentReservationsData,
  RoomAmenityDetail,
  RoomOccupancyMapData,
  SummaryFinanceData,
  TodayAvailableRoomsData,
  TodayRecepcionistStatisticsData,
  Top10CountriesProvincesData,
  Top5PriorityPendingAmenitiesData,
  Top5TodayCheckInData,
  Top5TodayCheckOutData,
  WeekReservationsData,
} from 'src/interfaces';
import { PrismaService } from 'src/prisma/prisma.service';
import { handleException } from 'src/utils';
import { calculateStayNights } from 'src/utils/dates/peru-datetime';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Obtiene estadísticas administrativas anuales.
   * @param year Año para el que se desean obtener las estadísticas
   * @returns Estadísticas administrativas anuales
   */
  async findAnnualAdministratorStatistics(
    year: number,
  ): Promise<AnnualAdministratorStatisticsData> {
    try {
      // Construir el prefijo del año para comparar con el campo date
      const yearPrefix = `${year}-`;
      const startDate = new Date(`${year}-01-01T00:00:00.000Z`);
      const endDate = new Date(`${year}-12-31T23:59:59.999Z`);

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
      const newCustomersCount = await this.prisma.customer.count({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
      });

      // NUEVO: Obtener los pagos pendientes del año específico
      const pendingPayments = await this.prisma.payment.findMany({
        where: {
          date: {
            startsWith: yearPrefix, // Filtra por pagos cuyo date comience con el año especificado
          },
          status: 'PENDING',
        },
        select: {
          amount: true,
          amountPaid: true,
        },
      });

      // Calcular el monto total pendiente (amount - amountPaid)
      const pendingPaymentsTotal = pendingPayments.reduce(
        (acc, payment) => acc + (payment.amount - payment.amountPaid),
        0,
      );

      // Calcular la tasa de ocupación
      // 1. Primero, obtenemos el número total de habitaciones disponibles
      const totalRooms = await this.prisma.room.count({
        where: {
          isActive: true,
        },
      });

      // 2. Calculamos el total de días en el año (365 o 366 si es bisiesto)
      const isLeapYear =
        (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
      const daysInYear = isLeapYear ? 366 : 365;

      // 3. Calculamos el total de habitaciones-día disponibles en el año
      const totalRoomDays = totalRooms * daysInYear;

      // 4. Obtenemos todas las reservas en el año especificado con estado CHECKED_IN o CHECKED_OUT
      // IMPORTANTE: Solo consideramos reservas que efectivamente tienen días ocupados en el año
      const reservations = await this.prisma.reservation.findMany({
        where: {
          AND: [
            {
              OR: [
                // Reservas que comienzan en el año seleccionado
                {
                  checkInDate: {
                    gte: startDate,
                    lte: endDate,
                  },
                },
                // Reservas que terminan en el año seleccionado
                {
                  checkOutDate: {
                    gte: startDate,
                    lte: endDate,
                  },
                },
                // Reservas que abarcan el año completo (empiezan antes y terminan después)
                {
                  AND: [
                    { checkInDate: { lt: startDate } },
                    { checkOutDate: { gt: endDate } },
                  ],
                },
              ],
            },
            {
              status: {
                in: ['CHECKED_IN', 'CHECKED_OUT'],
              },
            },
            // Asegurar que checkOutDate > checkInDate (esto se maneja en el código)
          ],
        },
        select: {
          checkInDate: true,
          checkOutDate: true,
        },
      });

      // 5. Calculamos el número de habitaciones-día ocupadas
      // NUEVA LÓGICA: Calcular día por día para evitar solapamientos
      const occupiedDays = new Set<string>(); // Usamos Set para evitar duplicados

      for (const reservation of reservations) {
        // Ajustamos las fechas para que estén dentro del año
        const effectiveCheckIn = new Date(
          Math.max(reservation.checkInDate.getTime(), startDate.getTime()),
        );

        const effectiveCheckOut = new Date(
          Math.min(reservation.checkOutDate.getTime(), endDate.getTime()),
        );

        // Verificamos que las fechas efectivas sean válidas
        if (effectiveCheckOut <= effectiveCheckIn) {
          continue; // Saltamos reservas con fechas inválidas
        }

        // Calculamos la duración de la estancia en días
        const stayDurationMs =
          effectiveCheckOut.getTime() - effectiveCheckIn.getTime();
        const stayDurationDays = Math.ceil(
          stayDurationMs / (1000 * 60 * 60 * 24),
        );

        // Validación adicional: no permitir estancias extremadamente largas
        if (stayDurationDays > 365) {
          continue;
        }

        // Agregamos cada día de la estancia al Set (evita duplicados automáticamente)
        const currentDate = new Date(effectiveCheckIn);
        while (currentDate < effectiveCheckOut) {
          const dateString = currentDate.toISOString().split('T')[0]; // YYYY-MM-DD
          occupiedDays.add(dateString);
          currentDate.setDate(currentDate.getDate() + 1);
        }
      }

      // El número de habitaciones-día ocupadas es el número de días únicos ocupados
      const occupiedRoomDays = occupiedDays.size;

      // 6. Calculamos la tasa de ocupación (porcentaje)
      const occupancyRate =
        totalRoomDays > 0 ? (occupiedRoomDays / totalRoomDays) * 100 : 0;

      return {
        totalIncome,
        occupancyRate: parseFloat(occupancyRate.toFixed(2)), // Redondeamos a 2 decimales
        newCustomers: newCustomersCount,
        pendingPayments: parseFloat(pendingPaymentsTotal.toFixed(2)), // Redondeamos a 2 decimales
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

  /**
   * Obtiene las ganancias y gastos mensuales para un año específico.
   * @param year Año para el que se desean obtener las ganancias y gastos mensuales
   * @returns Ganancias y gastos mensuales del año especificado
   */
  async findMonthlyEarningsAndExpenses(
    year: number,
  ): Promise<MonthlyEarningsAndExpensesData[]> {
    try {
      const yearPrefix = `${year}-`;

      // Obtener todos los detalles de pago pagados del año especificado
      const paidPaymentDetails = await this.prisma.paymentDetail.findMany({
        where: {
          paymentDate: {
            startsWith: yearPrefix, // Filtra detalles de pago del año especificado
          },
          status: 'PAID', // Solo los que están pagados
        },
        select: {
          paymentDate: true,
          subtotal: true,
        },
      });

      // Inicializar un array con todos los meses del año con ganancias en cero
      const monthlyData: MonthlyEarningsAndExpensesData[] = [];
      const monthNames = [
        'Enero',
        'Febrero',
        'Marzo',
        'Abril',
        'Mayo',
        'Junio',
        'Julio',
        'Agosto',
        'Septiembre',
        'Octubre',
        'Noviembre',
        'Diciembre',
      ];

      // Crear un objeto para cada mes con ganancias y gastos inicializados en 0
      for (let i = 0; i < 12; i++) {
        monthlyData.push({
          month: monthNames[i],
          earnings: 0,
          expenses: 0,
        });
      }

      // 1. Procesar cada detalle de pago y agregarlo al mes correspondiente como ingresos
      for (const detail of paidPaymentDetails) {
        // Extraer el mes del campo paymentDate (formato: "YYYY-MM-DD")
        const monthStr = detail.paymentDate.substring(5, 7); // Obtener "MM" de "YYYY-MM-DD"
        const monthIndex = parseInt(monthStr, 10) - 1; // Resta 1 porque los índices van de 0 a 11

        if (monthIndex >= 0 && monthIndex < 12) {
          monthlyData[monthIndex].earnings += detail.subtotal;
        }
      }

      // 2. GASTOS - PARTE 1: Obtener movimientos de entrada (gastos) del año
      const inputMovements = await this.prisma.movements.findMany({
        where: {
          dateMovement: {
            startsWith: yearPrefix,
          },
          type: 'INPUT', // Solo movimientos de entrada
        },
        include: {
          movementsDetail: {
            select: {
              subtotal: true,
            },
          },
        },
      });

      // Procesar cada movimiento de entrada y agregarlo al mes correspondiente como gasto
      for (const movement of inputMovements) {
        // Extraer el mes del campo dateMovement (formato: "YYYY-MM-DD")
        const monthStr = movement.dateMovement.substring(5, 7);
        const monthIndex = parseInt(monthStr, 10) - 1;

        if (monthIndex >= 0 && monthIndex < 12) {
          // Sumar todos los subtotales de los detalles de este movimiento
          const movementTotal = movement.movementsDetail.reduce(
            (acc, detail) => acc + detail.subtotal,
            0,
          );
          monthlyData[monthIndex].expenses += movementTotal;
        }
      }

      // 3. GASTOS - PARTE 2: Obtener gastos directos del hotel del año
      const hotelExpenses = await this.prisma.hotelExpense.findMany({
        where: {
          date: {
            startsWith: yearPrefix,
          },
        },
        select: {
          date: true,
          amount: true,
        },
      });

      // Procesar cada gasto del hotel y agregarlo al mes correspondiente
      for (const expense of hotelExpenses) {
        // Extraer el mes del campo date (formato: "YYYY-MM-DD")
        const monthStr = expense.date.substring(5, 7);
        const monthIndex = parseInt(monthStr, 10) - 1;

        if (monthIndex >= 0 && monthIndex < 12) {
          monthlyData[monthIndex].expenses += expense.amount;
        }
      }

      // Redondear valores para evitar imprecisiones de punto flotante
      for (const monthData of monthlyData) {
        monthData.earnings = parseFloat(monthData.earnings.toFixed(2));
        monthData.expenses = parseFloat(monthData.expenses.toFixed(2));
      }

      return monthlyData;
    } catch (error) {
      this.logger.error('Error obteniendo ganancias y gastos mensuales');
      handleException(error, 'Error obteniendo ganancias y gastos mensuales');
    }
  }

  /**
   * Obtiene un mapa de ocupación de habitaciones.
   * @returns Mapa de ocupación de habitaciones
   */
  async findRoomOccupancyMap(): Promise<RoomOccupancyMapData> {
    try {
      // 1. Obtener todas las habitaciones con su tipo
      const rooms = await this.prisma.room.findMany({
        include: {
          RoomTypes: {
            select: {
              name: true,
            },
          },
        },
      });

      // 2. Inicializar contadores para cada estado
      let countAvailable = 0;
      let countOccupied = 0;
      let countCleaning = 0;
      let countIncomplete = 0;
      let countMaintenance = 0; // Para habitaciones con isActive = false

      // 3. Inicializar objeto para agrupar habitaciones por tipo
      const roomsByType: Record<string, ListRoom[]> = {};

      // 4. Procesar cada habitación
      for (const room of rooms) {
        // Crear objeto de habitación para la lista usando directamente el id sin conversión
        const listRoom: ListRoom = {
          id: room.id,
          number: room.number,
          status: room.isActive ? room.status : 'MAINTENANCE', // Si no está activa, considerarla en mantenimiento
        };

        // Incrementar el contador correspondiente según el estado
        if (!room.isActive) {
          countMaintenance++;
        } else {
          switch (room.status) {
            case 'AVAILABLE':
              countAvailable++;
              break;
            case 'OCCUPIED':
              countOccupied++;
              break;
            case 'CLEANING':
              countCleaning++;
              break;
            case 'INCOMPLETE':
              countIncomplete++;
              break;
          }
        }

        // Agregar la habitación al grupo correspondiente según su tipo
        const roomType = room.RoomTypes.name;
        if (!roomsByType[roomType]) {
          roomsByType[roomType] = [];
        }
        roomsByType[roomType].push(listRoom);
      }

      // 5. Construir y retornar el objeto de resultado
      return {
        countAvailable,
        countOccupied,
        countCleaning,
        countMaintenance,
        countIncomplete,
        roomsByType,
      };
    } catch (error) {
      this.logger.error('Error obteniendo mapa de ocupación de habitaciones');
      handleException(
        error,
        'Error obteniendo mapa de ocupación de habitaciones',
      );
    }
  }

  /**
   *  Obtiene las reservaciones recientes y del día actual.
   * @returns Reservaciones recientes y del día actual
   */
  async findRecentReservations(): Promise<RecentReservationsData> {
    try {
      // Obtener la fecha actual sin la hora (solo el día)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Contar las reservaciones con check-in para hoy que estén en PENDING o CONFIRMED
      const todayReservationsCount = await this.prisma.reservation.count({
        where: {
          checkInDate: {
            gte: today,
            lt: tomorrow,
          },
          status: {
            in: ['PENDING', 'CONFIRMED'], // Solo reservas pendientes o confirmadas
          },
          isActive: true,
        },
      });

      // Obtener las 5 reservaciones más recientes que estén en PENDING o CONFIRMED
      const recentReservations = await this.prisma.reservation.findMany({
        where: {
          isActive: true,
          status: {
            in: ['PENDING', 'CONFIRMED'], // Solo reservas pendientes o confirmadas
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 5,
        include: {
          customer: {
            select: {
              name: true,
            },
          },
          room: {
            select: {
              number: true,
            },
          },
        },
      });

      // Mapear las reservaciones al formato requerido
      const formattedReservations = recentReservations.map((reservation) => ({
        id: reservation.id,
        customerName: reservation.customer?.name || 'Cliente sin nombre',
        status: reservation.status,
        roomNumber: reservation.room.number,
        checkInDate: reservation.checkInDate,
        checkOutDate: reservation.checkOutDate,
      }));

      return {
        todayReservations: todayReservationsCount,
        newReservations: formattedReservations,
      };
    } catch (error) {
      this.logger.error('Error obteniendo reservaciones recientes');
      handleException(error, 'Error obteniendo reservaciones recientes');
    }
  }

  /**
   * Obtiene los próximos pagos pendientes.
   * @returns Próximos pagos pendientes
   */
  async findNextPendingPayments(): Promise<NextPendingPaymentsData> {
    try {
      // Obtener el primer día del mes actual y el primer día del próximo mes
      const today = new Date();
      const firstDayOfMonth = new Date(
        today.getFullYear(),
        today.getMonth(),
        1,
      );
      firstDayOfMonth.setHours(0, 0, 0, 0);

      const firstDayOfNextMonth = new Date(
        today.getFullYear(),
        today.getMonth() + 1,
        1,
      );
      firstDayOfNextMonth.setHours(0, 0, 0, 0);

      // 1. Contar los pagos pendientes que corresponden a reservaciones con check-out en este mes
      const monthPendingPaymentsCount = await this.prisma.payment.count({
        where: {
          status: 'PENDING',
          reservation: {
            checkOutDate: {
              gte: firstDayOfMonth,
              lt: firstDayOfNextMonth,
            },
            isActive: true,
          },
        },
      });

      // 2. Obtener los 5 pagos pendientes más urgentes (próximos a la fecha de check-out)
      // Considerar solo pagos con checkout desde hoy en adelante
      today.setHours(0, 0, 0, 0);

      const pendingPayments = await this.prisma.payment.findMany({
        where: {
          status: 'PENDING',
          amountPaid: {
            lt: this.prisma.payment.fields.amount,
          },
          reservation: {
            isActive: true,
            checkOutDate: {
              gte: today, // Solo considera checkouts desde hoy en adelante
            },
          },
        },
        orderBy: {
          // Ordenar por fecha de check-out más cercana primero
          reservation: {
            checkOutDate: 'asc',
          },
        },
        take: 5,
        include: {
          reservation: {
            include: {
              customer: {
                select: {
                  name: true,
                },
              },
              room: {
                select: {
                  number: true,
                },
              },
            },
          },
        },
      });

      // 3. Formatear los resultados según la interfaz requerida
      const formattedPendingPayments = pendingPayments.map((payment) => {
        // Calcular el monto pendiente
        const pendingAmount = payment.amount - payment.amountPaid;

        return {
          id: payment.id,
          customerName:
            payment.reservation?.customer?.name || 'Cliente sin nombre',
          roomNumber: payment.reservation?.room?.number || 0,
          code: payment.code, // Fecha de checkout como código
          amount: parseFloat(pendingAmount.toFixed(2)), // Monto pendiente redondeado
        };
      });

      return {
        monthPendingPayments: monthPendingPaymentsCount, // Cambiado de todayPendingPayments a monthPendingPayments
        newPayments: formattedPendingPayments,
      };
    } catch (error) {
      this.logger.error('Error obteniendo próximos pagos pendientes');
      handleException(error, 'Error obteniendo próximos pagos pendientes');
    }
  }

  /**
   * Obtiene las estadísticas de ocupación por tipo de habitación para un año específico.
   * @param year Año para el que se desean obtener las estadísticas
   * @returns Estadísticas de ocupación por tipo de habitación
   */
  async findOccupationStatisticsPercentage(
    year: number,
  ): Promise<OccupationStatisticsPercentageData[]> {
    try {
      // 1. Definir el rango de fechas para el año seleccionado
      const startDate = new Date(`${year}-01-01T00:00:00.000Z`);
      const endDate = new Date(`${year}-12-31T23:59:59.999Z`);

      // 2. Obtener todos los tipos de habitaciones
      const roomTypes = await this.prisma.roomTypes.findMany({
        where: {
          isActive: true,
        },
        select: {
          id: true,
          name: true,
          Room: {
            where: {
              isActive: true,
            },
            select: {
              id: true,
            },
          },
        },
      });

      // 3. Calcular total de días en el año (considerando si es bisiesto)
      const isLeapYear =
        (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
      const daysInYear = isLeapYear ? 366 : 365;

      // 4. Para cada tipo de habitación, calcular su porcentaje de ocupación
      const occupationStatistics: OccupationStatisticsPercentageData[] = [];

      for (const roomType of roomTypes) {
        // Obtener número de habitaciones de este tipo
        const roomCount = roomType.Room.length;

        if (roomCount === 0) {
          // Si no hay habitaciones de este tipo, agregar 0% de ocupación
          occupationStatistics.push({
            id: roomType.id,
            type: roomType.name,
            percentage: 0,
          });
          continue;
        }

        // Calcular total de días-habitación disponibles para este tipo
        const totalRoomDays = roomCount * daysInYear;

        // Obtener todas las reservas para este tipo de habitación en el año
        const reservations = await this.prisma.reservation.findMany({
          where: {
            OR: [
              // Reservas que comienzan en el año seleccionado
              { checkInDate: { gte: startDate, lte: endDate } },
              // Reservas que terminan en el año seleccionado
              { checkOutDate: { gte: startDate, lte: endDate } },
              // Reservas que abarcan el año completo
              {
                AND: [
                  { checkInDate: { lt: startDate } },
                  { checkOutDate: { gt: endDate } },
                ],
              },
            ],
            status: { in: ['CHECKED_IN', 'CHECKED_OUT'] },
            room: {
              roomTypeId: roomType.id,
            },
          },
          select: {
            checkInDate: true,
            checkOutDate: true,
            roomId: true,
          },
        });

        // Calcular días-habitación ocupados para este tipo
        // LÓGICA CORREGIDA: Calcular por habitación individual para evitar solapamientos
        const roomOccupiedDays = new Map<string, Set<string>>(); // roomId -> Set de días ocupados

        for (const reservation of reservations) {
          // Ajustar las fechas para que estén dentro del año
          const effectiveCheckIn = new Date(
            Math.max(reservation.checkInDate.getTime(), startDate.getTime()),
          );
          const effectiveCheckOut = new Date(
            Math.min(reservation.checkOutDate.getTime(), endDate.getTime()),
          );

          // Verificar que las fechas efectivas sean válidas
          if (effectiveCheckOut <= effectiveCheckIn) {
            continue; // Saltar reservas con fechas inválidas
          }

          // Obtener el roomId de la reserva
          const roomId = reservation.roomId;

          // Inicializar el Set para esta habitación si no existe
          if (!roomOccupiedDays.has(roomId)) {
            roomOccupiedDays.set(roomId, new Set<string>());
          }

          // Agregar cada día de la estancia al Set de esta habitación específica
          const currentDate = new Date(effectiveCheckIn);
          while (currentDate < effectiveCheckOut) {
            const dateString = currentDate.toISOString().split('T')[0]; // YYYY-MM-DD
            roomOccupiedDays.get(roomId)!.add(dateString);
            currentDate.setDate(currentDate.getDate() + 1);
          }
        }

        // Sumar los días ocupados de todas las habitaciones de este tipo
        let occupiedRoomDays = 0;
        for (const [, days] of roomOccupiedDays) {
          occupiedRoomDays += days.size;
        }

        // Calcular porcentaje de ocupación
        const occupancyPercentage =
          totalRoomDays > 0 ? (occupiedRoomDays / totalRoomDays) * 100 : 0;

        // Agregar a los resultados
        occupationStatistics.push({
          id: roomType.id,
          type: roomType.name,
          percentage: parseFloat(occupancyPercentage.toFixed(2)),
        });
      }

      return occupationStatistics;
    } catch (error) {
      this.logger.error(
        'Error obteniendo estadísticas de ocupación por tipo de habitación',
      );
      handleException(
        error,
        'Error obteniendo estadísticas de ocupación por tipo de habitación',
      );
    }
  }

  /**
   * Obtiene la tendencia mensual de reservaciones para un año específico.
   * @param year Año para el que se desean obtener las tendencias
   * @returns Tendencia mensual de reservaciones (web vs directas)
   */
  async findMontlyBookingTrend(
    year: number,
  ): Promise<MonthlyBookingTrendData[]> {
    try {
      // 1. Definir el rango de fechas para el año seleccionado
      const startDate = new Date(`${year}-01-01T00:00:00.000Z`);
      const endDate = new Date(`${year}-12-31T23:59:59.999Z`);

      // 2. Inicializar array con los meses del año
      const monthlyData: MonthlyBookingTrendData[] = [];
      const monthNames = [
        'Enero',
        'Febrero',
        'Marzo',
        'Abril',
        'Mayo',
        'Junio',
        'Julio',
        'Agosto',
        'Septiembre',
        'Octubre',
        'Noviembre',
        'Diciembre',
      ];

      // 3. Crear un objeto para cada mes con contadores inicializados en 0
      for (let i = 0; i < 12; i++) {
        monthlyData.push({
          month: monthNames[i],
          webBookings: 0,
          directBookings: 0,
        });
      }

      // 4. Obtener todas las reservaciones del año
      const reservations = await this.prisma.reservation.findMany({
        where: {
          reservationDate: {
            gte: startDate,
            lte: endDate,
          },
          status: {
            not: 'CANCELED', // Excluir reservaciones canceladas
          },
        },
        select: {
          reservationDate: true,
          createdByLandingPage: true,
        },
      });

      // 5. Contar reservaciones por mes y tipo (web vs directas)
      for (const reservation of reservations) {
        // Obtener el mes (0-11) de la fecha de reserva
        const month = reservation.reservationDate.getMonth();

        // Incrementar el contador correspondiente según el origen de la reserva
        if (reservation.createdByLandingPage === true) {
          monthlyData[month].webBookings++;
        } else {
          monthlyData[month].directBookings++;
        }
      }

      return monthlyData;
    } catch (error) {
      this.logger.error('Error obteniendo tendencia mensual de reservaciones');
      handleException(
        error,
        'Error obteniendo tendencia mensual de reservaciones',
      );
    }
  }

  /**
   * Obtiene un resumen financiero para un año específico.
   * @param year Año para el que se desea obtener el resumen financiero
   * @returns Resumen financiero del año especificado
   */
  async findSummaryFinance(year: number): Promise<SummaryFinanceData> {
    try {
      // Construir el prefijo del año para comparar con los campos de fecha en string
      const yearPrefix = `${year}-`;

      // 1. CÁLCULO DE INGRESOS TOTALES
      // Obtener todos los pagos del año
      const payments = await this.prisma.payment.findMany({
        where: {
          date: {
            startsWith: yearPrefix, // Filtrar pagos por año usando el prefijo
          },
        },
        select: {
          amountPaid: true,
          paymentDetail: {
            where: {
              paymentDate: {
                startsWith: yearPrefix, // Filtrar detalles de pago por año
              },
            },
            select: {
              paymentDate: true,
              subtotal: true,
              description: true,
              type: true,
              productId: true,
              serviceId: true,
            },
          },
        },
      });

      // Resto de la lógica para calcular ingresos...
      let totalRoomReservations = 0;
      let totalServices = 0;
      let totalProducts = 0;
      let totalLateCheckout = 0;

      for (const payment of payments) {
        for (const detail of payment.paymentDetail) {
          const subtotal = detail.subtotal;

          switch (detail.type) {
            case 'ROOM_RESERVATION':
              totalRoomReservations += subtotal;
              break;
            case 'LATE_CHECKOUT':
              totalLateCheckout += subtotal;
              break;
            case 'EXTRA_SERVICE':
              if (detail.serviceId) {
                totalServices += subtotal;
              } else if (detail.productId) {
                totalProducts += subtotal;
              }
              break;
          }
        }
      }

      // Calcular el total de ingresos como la suma de todos los subtotales
      const totalIncome =
        totalRoomReservations +
        totalServices +
        totalProducts +
        totalLateCheckout;

      // 2. CÁLCULO DE GASTOS TOTALES
      let totalExpenses = 0;
      let totalExpensesFixed = 0;
      let totalExpensesVariable = 0;
      let totalExpensesOther = 0;
      let totalExpensesProducts = 0;

      // 2.1 Gastos del hotel (fijos, variables, otros)
      const hotelExpenses = await this.prisma.hotelExpense.findMany({
        where: {
          date: {
            startsWith: yearPrefix, // Filtrar gastos del hotel por año
          },
        },
      });

      for (const expense of hotelExpenses) {
        const amount = expense.amount;
        totalExpenses += amount;

        switch (expense.category) {
          case 'FIXED':
            totalExpensesFixed += amount;
            break;
          case 'VARIABLE':
            totalExpensesVariable += amount;
            break;
          case 'OTHER':
            totalExpensesOther += amount;
            break;
        }
      }

      // 2.2 Gastos en productos (movimientos de entrada)
      const inputMovements = await this.prisma.movements.findMany({
        where: {
          dateMovement: {
            startsWith: yearPrefix, // Filtrar movimientos por año
          },
          type: 'INPUT',
        },
        include: {
          movementsDetail: {
            select: {
              subtotal: true,
            },
          },
        },
      });

      for (const movement of inputMovements) {
        for (const detail of movement.movementsDetail) {
          totalExpensesProducts += detail.subtotal;
          totalExpenses += detail.subtotal;
        }
      }

      // 3. CÁLCULO DE BENEFICIO
      const totalProfit = totalIncome - totalExpenses;

      return {
        totalIncome: parseFloat(totalIncome.toFixed(2)),
        totalExpenses: parseFloat(totalExpenses.toFixed(2)),
        totalProfit: parseFloat(totalProfit.toFixed(2)),
        totalRoomReservations: parseFloat(totalRoomReservations.toFixed(2)),
        totalServices: parseFloat(totalServices.toFixed(2)),
        totalProducts: parseFloat(totalProducts.toFixed(2)),
        totalLateCheckout: parseFloat(totalLateCheckout.toFixed(2)),
        totalExpensesFixed: parseFloat(totalExpensesFixed.toFixed(2)),
        totalExpensesVariable: parseFloat(totalExpensesVariable.toFixed(2)),
        totalExpensesOther: parseFloat(totalExpensesOther.toFixed(2)),
        totalExpensesProducts: parseFloat(totalExpensesProducts.toFixed(2)),
      };
    } catch (error) {
      this.logger.error('Error obteniendo resumen financiero');
      handleException(error, 'Error obteniendo resumen financiero');
    }
  }

  /**
   * Obtiene un resumen del origen de los clientes para un año específico.
   * @param year Año para el que se desea obtener el resumen
   * @returns Resumen del origen de los clientes
   */
  async findCustomerOriginSummary(
    year: number,
  ): Promise<CustomerOriginSummaryData> {
    try {
      // Definir el rango de fechas para el año seleccionado
      const startDate = new Date(`${year}-01-01T00:00:00.000Z`);
      const endDate = new Date(`${year}-12-31T23:59:59.999Z`);

      // Obtener todos los clientes creados en el año seleccionado
      const customers = await this.prisma.customer.findMany({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
          isActive: true,
        },
        select: {
          country: true,
        },
      });

      // Inicializar contadores
      const totalCustomers = customers.length;
      let totalNationalCustomers = 0;
      let totalInternationalCustomers = 0;

      // Set para almacenar países únicos
      const uniqueCountries = new Set<string>();

      // Analizar cada cliente
      for (const customer of customers) {
        // Si el país está definido, agregarlo al conjunto de países únicos
        if (customer.country) {
          uniqueCountries.add(customer.country);

          // Contar cliente como nacional o internacional según su país
          if (customer.country === 'Perú') {
            totalNationalCustomers++;
          } else {
            totalInternationalCustomers++;
          }
        } else {
          // Si no tiene país definido, considerarlo como nacional por defecto
          totalNationalCustomers++;
        }
      }

      // Retornar el resumen
      return {
        totalCustomers,
        totalNationalCustomers,
        totalInternationalCustomers,
        totalCountry: uniqueCountries.size, // Número total de países diferentes
      };
    } catch (error) {
      this.logger.error('Error obteniendo resumen del origen de los clientes');
      handleException(
        error,
        'Error obteniendo resumen del origen de los clientes',
      );
    }
  }

  /**
   * Obtiene la distribución mensual de clientes nacionales e internacionales para un año específico.
   * @param year Año para el que se desea obtener la distribución
   * @returns Distribución mensual de clientes nacionales e internacionales
   */
  async findMonthlyCustomerOrigin(
    year: number,
  ): Promise<MonthlyCustomerOriginData[]> {
    try {
      // 1. Definir el rango de fechas para el año seleccionado
      const startDate = new Date(`${year}-01-01T00:00:00.000Z`);
      const endDate = new Date(`${year}-12-31T23:59:59.999Z`);

      // 2. Inicializar array con los nombres de los meses
      const monthNames = [
        'Enero',
        'Febrero',
        'Marzo',
        'Abril',
        'Mayo',
        'Junio',
        'Julio',
        'Agosto',
        'Septiembre',
        'Octubre',
        'Noviembre',
        'Diciembre',
      ];

      // 3. Crear un objeto para cada mes con contadores inicializados en 0
      const monthlyData: MonthlyCustomerOriginData[] = monthNames.map(
        (month) => ({
          month,
          nationalCustomers: 0,
          internationalCustomers: 0,
        }),
      );

      // 4. Obtener todos los clientes creados en el año seleccionado
      const customers = await this.prisma.customer.findMany({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
          isActive: true,
        },
        select: {
          country: true,
          createdAt: true,
        },
      });

      // 5. Contar clientes por mes y origen (nacional vs internacional)
      for (const customer of customers) {
        // Obtener el mes (0-11) de la fecha de creación
        const month = customer.createdAt.getMonth();

        // Clasificar al cliente como nacional o internacional
        if (!customer.country || customer.country === 'Perú') {
          // Cliente nacional (Perú o sin país definido)
          monthlyData[month].nationalCustomers++;
        } else {
          // Cliente internacional (cualquier país excepto Perú)
          monthlyData[month].internationalCustomers++;
        }
      }

      return monthlyData;
    } catch (error) {
      this.logger.error(
        'Error obteniendo distribución mensual de origen de clientes',
      );
      handleException(
        error,
        'Error obteniendo distribución mensual de origen de clientes',
      );
    }
  }

  /**
   * Obtiene los top 10 países con más clientes para un año específico.
   * @param year Año para el que se desean obtener las estadísticas
   * @returns Top 10 países con más clientes (excluyendo Perú)
   */
  async findTop10CountriesCustomers(
    year: number,
  ): Promise<Top10CountriesProvincesData[]> {
    try {
      // Definir el rango de fechas para el año seleccionado
      const startDate = new Date(`${year}-01-01T00:00:00.000Z`);
      const endDate = new Date(`${year}-12-31T23:59:59.999Z`);

      // Obtener todos los clientes activos creados en el año seleccionado
      const customers = await this.prisma.customer.findMany({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
          isActive: true,
          // Excluir clientes de Perú
          NOT: {
            country: 'Perú',
          },
          // Solo incluir clientes con país definido
          country: {
            not: null,
          },
        },
        select: {
          country: true,
        },
      });

      // Contar clientes por país
      const countryCounts: { [key: string]: number } = {};

      for (const customer of customers) {
        if (customer.country) {
          if (countryCounts[customer.country]) {
            countryCounts[customer.country]++;
          } else {
            countryCounts[customer.country] = 1;
          }
        }
      }

      // Convertir a array y ordenar por cantidad de clientes (descendente)
      const sortedCountries = Object.entries(countryCounts)
        .map(([countryProvince, totalCustomers]) => ({
          countryProvince,
          totalCustomers,
        }))
        .sort((a, b) => b.totalCustomers - a.totalCustomers)
        .slice(0, 10); // Tomar solo los 10 primeros

      return sortedCountries;
    } catch (error) {
      this.logger.error('Error obteniendo top 10 países con más clientes');
      handleException(error, 'Error obteniendo top 10 países con más clientes');
    }
  }

  /**
   * Obtiene las top 10 provincias de Perú con más clientes para un año específico.
   * @param year Año para el que se desean obtener las estadísticas
   * @returns Top 10 provincias de Perú con más clientes
   */
  async findTop10ProvincesCustomers(
    year: number,
  ): Promise<Top10CountriesProvincesData[]> {
    try {
      // Definir el rango de fechas para el año seleccionado
      const startDate = new Date(`${year}-01-01T00:00:00.000Z`);
      const endDate = new Date(`${year}-12-31T23:59:59.999Z`);

      // Obtener todos los clientes activos de Perú creados en el año seleccionado
      const customers = await this.prisma.customer.findMany({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
          isActive: true,
          // Solo incluir clientes de Perú
          country: 'Perú',
          // Solo incluir clientes con provincia definida
          province: {
            not: null,
          },
        },
        select: {
          province: true,
        },
      });

      // Contar clientes por provincia
      const provinceCounts: { [key: string]: number } = {};

      for (const customer of customers) {
        if (customer.province) {
          if (provinceCounts[customer.province]) {
            provinceCounts[customer.province]++;
          } else {
            provinceCounts[customer.province] = 1;
          }
        }
      }

      // Convertir a array y ordenar por cantidad de clientes (descendente)
      const sortedProvinces = Object.entries(provinceCounts)
        .map(([countryProvince, totalCustomers]) => ({
          countryProvince,
          totalCustomers,
        }))
        .sort((a, b) => b.totalCustomers - a.totalCustomers)
        .slice(0, 10); // Tomar solo los 10 primeros

      return sortedProvinces;
    } catch (error) {
      this.logger.error(
        'Error obteniendo top 10 provincias de Perú con más clientes',
      );
      handleException(
        error,
        'Error obteniendo top 10 provincias de Perú con más clientes',
      );
    }
  }

  /**
   * Obtiene estadísticas diarias para recepcionistas.
   * @returns Estadísticas del día actual para recepcionistas
   */
  async findTodayRecepcionistStatistics(): Promise<TodayRecepcionistStatisticsData> {
    try {
      // Obtener la fecha actual (inicio y fin del día)
      const today = new Date();
      const startOfDay = new Date(today.setHours(0, 0, 0, 0));
      const endOfDay = new Date(today.setHours(23, 59, 59, 999));

      // 1. Contar TODOS los check-ins programados para hoy (independiente del estado)
      const todayCheckIn = await this.prisma.reservation.count({
        where: {
          checkInDate: {
            gte: startOfDay,
            lte: endOfDay,
          },
          isActive: true,
        },
      });

      // 2. Contar check-ins ya realizados hoy (estado CHECKED_IN o CHECKED_OUT)
      const todayCheckInPerformed = await this.prisma.reservation.count({
        where: {
          checkInDate: {
            gte: startOfDay,
            lte: endOfDay,
          },

          status: {
            in: ['CHECKED_IN', 'CHECKED_OUT'],
          },
        },
      });

      // 3. Contar TODOS los check-outs programados para hoy (independiente del estado)
      const todayCheckOut = await this.prisma.reservation.count({
        where: {
          checkOutDate: {
            gte: startOfDay,
            lte: endOfDay,
          },
          isActive: true,
        },
      });

      // 4. Contar check-outs ya realizados hoy (estado CHECKED_OUT)
      const todayCheckOutPerformed = await this.prisma.reservation.count({
        where: {
          checkOutDate: {
            gte: startOfDay,
            lte: endOfDay,
          },
          status: 'CHECKED_OUT',
        },
      });

      // 5. Contar habitaciones disponibles
      const todayAvailableRooms = await this.prisma.room.count({
        where: {
          isActive: true,
          status: 'AVAILABLE',
        },
      });

      // 6. Contar total de habitaciones
      const totalRooms = await this.prisma.room.count({
        where: {
          isActive: true,
        },
      });

      // 7. Contar amenidades pendientes (al menos una amenidad en false)
      const roomsWithPendingAmenities = await this.prisma.room.findMany({
        where: {
          isActive: true,
          OR: [
            { trashBin: false },
            { towel: false },
            { toiletPaper: false },
            { showerSoap: false },
            { handSoap: false },
            { lamp: false },
          ],
        },
        select: {
          trashBin: true,
          towel: true,
          toiletPaper: true,
          showerSoap: true,
          handSoap: true,
          lamp: true,
        },
      });

      // Contar amenidades pendientes y urgentes
      let todayPendingAmenities = 0;
      let urgentPendingAmenities = 0;

      for (const room of roomsWithPendingAmenities) {
        // Contar cuántas amenidades faltan en esta habitación
        let missingAmenities = 0;

        if (!room.trashBin) {
          todayPendingAmenities++;
          missingAmenities++;
        }
        if (!room.towel) {
          todayPendingAmenities++;
          missingAmenities++;
        }
        if (!room.toiletPaper) {
          todayPendingAmenities++;
          missingAmenities++;
        }
        if (!room.showerSoap) {
          todayPendingAmenities++;
          missingAmenities++;
        }
        if (!room.handSoap) {
          todayPendingAmenities++;
          missingAmenities++;
        }
        if (!room.lamp) {
          todayPendingAmenities++;
          missingAmenities++;
        }

        // Si faltan 5 o 6 amenidades en una misma habitación, todas ellas son urgentes
        if (missingAmenities >= 5) {
          // Todas las amenidades que faltan en esta habitación son urgentes
          urgentPendingAmenities += missingAmenities;
        }
      }

      return {
        todayCheckIn,
        todayCheckInPerformed,
        todayCheckOut,
        todayCheckOutPerformed,
        todayAvailableRooms,
        totalRooms,
        todayPendingAmenities,
        urgentPendingAmenities,
      };
    } catch (error) {
      this.logger.error(
        'Error obteniendo estadísticas diarias de recepcionista',
      );
      handleException(
        error,
        'Error obteniendo estadísticas diarias de recepcionista',
      );
    }
  }

  /**
   * Obtiene los 5 próximos check-ins programados para el día de hoy.
   * @returns Top 5 check-ins programados para hoy
   */
  async findTop5TodayCheckIn(): Promise<Top5TodayCheckInData[]> {
    try {
      // Obtener la fecha actual (inicio y fin del día)
      const today = new Date();
      const startOfDay = new Date(today.setHours(0, 0, 0, 0));
      const endOfDay = new Date(today.setHours(23, 59, 59, 999));

      // Buscar las 5 próximas reservaciones con check-in para hoy
      const todayCheckIns = await this.prisma.reservation.findMany({
        where: {
          checkInDate: {
            gte: startOfDay,
            lte: endOfDay,
          },
          isActive: true,
          // Mostrar primero las pendientes y confirmadas
          status: {
            in: ['PENDING', 'CONFIRMED'],
          },
        },
        orderBy: [
          // Primero ordenar por estado (PENDING/CONFIRMED primero)
          { status: 'asc' },
          // Luego ordenar por hora de check-in
          { checkInDate: 'asc' },
        ],
        take: 5,
        include: {
          customer: {
            select: {
              name: true,
            },
          },
          room: {
            select: {
              number: true,
            },
          },
        },
      });

      // Formatear los resultados según la interfaz requerida
      return todayCheckIns.map((reservation) => ({
        id: reservation.id,
        customerName: reservation.customer?.name || 'Cliente sin nombre',
        roomNumber: reservation.room.number,
        status: reservation.status,
        checkInDate: reservation.checkInDate,
      }));
    } catch (error) {
      this.logger.error('Error obteniendo top 5 check-ins de hoy');
      handleException(error, 'Error obteniendo top 5 check-ins de hoy');
    }
  }

  /**
   * Obtiene los 5 próximos check-outs programados para el día de hoy.
   * @returns Top 5 check-outs programados para hoy
   */
  async findTop5TodayCheckOut(): Promise<Top5TodayCheckOutData[]> {
    try {
      // Obtener la fecha actual (inicio y fin del día)
      const today = new Date();
      const startOfDay = new Date(today.setHours(0, 0, 0, 0));
      const endOfDay = new Date(today.setHours(23, 59, 59, 999));

      // Buscar las 5 próximas reservaciones con check-out para hoy
      const todayCheckOuts = await this.prisma.reservation.findMany({
        where: {
          checkOutDate: {
            gte: startOfDay,
            lte: endOfDay,
          },
          isActive: true,
          // Mostrar primero las que ya están en CHECKED_IN
          status: 'CHECKED_IN',
        },
        orderBy: {
          // Ordenar por hora de check-out
          checkOutDate: 'asc',
        },
        take: 5,
        include: {
          customer: {
            select: {
              name: true,
            },
          },
          room: {
            select: {
              number: true,
            },
          },
        },
      });

      // Formatear los resultados según la interfaz requerida
      return todayCheckOuts.map((reservation) => ({
        id: reservation.id,
        customerName: reservation.customer?.name || 'Cliente sin nombre',
        roomNumber: reservation.room.number,
        status: reservation.status,
        checkOutDate: reservation.checkOutDate,
      }));
    } catch (error) {
      this.logger.error('Error obteniendo top 5 check-outs de hoy');
      handleException(error, 'Error obteniendo top 5 check-outs de hoy');
    }
  }

  /**
   * Obtiene las 5 habitaciones con mayor prioridad de reposición de amenidades.
   * @returns Top 5 habitaciones con amenidades pendientes según prioridad
   */
  async findTop5PriorityPendingAmenities(): Promise<
    Top5PriorityPendingAmenitiesData[]
  > {
    try {
      // 1. Obtener todas las habitaciones activas que tengan al menos una amenidad en false
      const roomsWithPendingAmenities = await this.prisma.room.findMany({
        where: {
          isActive: true,
          OR: [
            { trashBin: false },
            { towel: false },
            { toiletPaper: false },
            { showerSoap: false },
            { handSoap: false },
            { lamp: false },
          ],
        },
        include: {
          RoomTypes: {
            select: {
              name: true,
            },
          },
        },
      });

      // 2. Calcular la prioridad de cada habitación basada en amenidades pendientes
      const prioritizedRooms = roomsWithPendingAmenities.map((room) => {
        // Contar cuántas amenidades faltan
        let missingAmenitiesCount = 0;
        const missingAmenities: string[] = [];

        if (!room.trashBin) {
          missingAmenitiesCount++;
          missingAmenities.push('Tacho de basura');
        }
        if (!room.towel) {
          missingAmenitiesCount++;
          missingAmenities.push('Toalla');
        }
        if (!room.toiletPaper) {
          missingAmenitiesCount++;
          missingAmenities.push('Papel higiénico');
        }
        if (!room.showerSoap) {
          missingAmenitiesCount++;
          missingAmenities.push('Jabón de ducha');
        }
        if (!room.handSoap) {
          missingAmenitiesCount++;
          missingAmenities.push('Jabón de manos');
        }
        if (!room.lamp) {
          missingAmenitiesCount++;
          missingAmenities.push('Lámpara');
        }

        // Determinar nivel de prioridad:
        // - HIGH: 5-6 amenidades pendientes o falta papel higiénico
        // - MEDIUM: 3-4 amenidades pendientes o falta jabón de ducha
        // - LOW: 1-2 amenidades pendientes
        let priority: PriorityLevel;

        if (missingAmenitiesCount >= 5 || !room.toiletPaper) {
          priority = PriorityLevel.HIGH;
        } else if (missingAmenitiesCount >= 3 || !room.showerSoap) {
          priority = PriorityLevel.MEDIUM;
        } else {
          priority = PriorityLevel.LOW;
        }

        // Determinar la descripción
        let description: string;

        // Si la habitación está en estado CLEANING y faltan todas las amenidades,
        // mostrar "Falta limpieza"
        if (room.status === 'CLEANING' && missingAmenitiesCount === 6) {
          description = 'Falta realizar limpieza en la habitación';
        } else {
          description = `Falta: ${missingAmenities.join(', ')}`;
        }

        return {
          id: room.id,
          roomNumber: room.number,
          typeRoom: room.RoomTypes.name,
          priority,
          description,
          // Campo oculto para ordenar
          _priorityScore:
            missingAmenitiesCount +
            (priority === PriorityLevel.HIGH
              ? 10
              : priority === PriorityLevel.MEDIUM
                ? 5
                : 0),
        };
      });

      // 3. Ordenar por prioridad y número de amenidades pendientes
      const sortedRooms = prioritizedRooms
        .sort((a, b) => {
          // Primero ordenar por el puntaje calculado (prioridad + cantidad)
          if (b._priorityScore !== a._priorityScore) {
            return b._priorityScore - a._priorityScore;
          }
          // Si tienen la misma prioridad, ordenar por número de habitación
          return a.roomNumber - b.roomNumber;
        })
        .slice(0, 5) // Tomar solo los 5 primeros
        .map(({ id, roomNumber, typeRoom, priority, description }) => ({
          // Eliminar el campo _priorityScore que usamos solo para ordenar
          id,
          roomNumber,
          typeRoom,
          priority,
          description,
        }));

      return sortedRooms;
    } catch (error) {
      this.logger.error(
        'Error obteniendo top 5 habitaciones con amenidades pendientes',
      );
      handleException(
        error,
        'Error obteniendo top 5 habitaciones con amenidades pendientes',
      );
    }
  }

  /**
   * Obtiene todas las habitaciones con amenidades pendientes agrupadas por nivel de prioridad.
   * @returns Habitaciones con amenidades pendientes agrupadas por prioridad (alta, media, baja)
   */
  async findAmenitiesByPriority(): Promise<AmenitiesByPriorityData> {
    try {
      // 1. Obtener todas las habitaciones activas que tengan al menos una amenidad en false
      const roomsWithPendingAmenities = await this.prisma.room.findMany({
        where: {
          isActive: true,
          OR: [
            { trashBin: false },
            { towel: false },
            { toiletPaper: false },
            { showerSoap: false },
            { handSoap: false },
            { lamp: false },
          ],
        },
        include: {
          RoomTypes: {
            select: {
              name: true,
            },
          },
        },
      });

      // 2. Inicializar estructuras para cada nivel de prioridad
      const highPriorityRooms: RoomAmenityDetail[] = [];
      const mediumPriorityRooms: RoomAmenityDetail[] = [];
      const lowPriorityRooms: RoomAmenityDetail[] = [];

      // 3. Procesar cada habitación y clasificarla según prioridad
      for (const room of roomsWithPendingAmenities) {
        // Contar cuántas amenidades faltan
        let missingAmenitiesCount = 0;
        const missingAmenities: string[] = [];

        if (!room.trashBin) {
          missingAmenitiesCount++;
          missingAmenities.push('Tacho de basura');
        }
        if (!room.towel) {
          missingAmenitiesCount++;
          missingAmenities.push('Toalla');
        }
        if (!room.toiletPaper) {
          missingAmenitiesCount++;
          missingAmenities.push('Papel higiénico');
        }
        if (!room.showerSoap) {
          missingAmenitiesCount++;
          missingAmenities.push('Jabón de ducha');
        }
        if (!room.handSoap) {
          missingAmenitiesCount++;
          missingAmenities.push('Jabón de manos');
        }
        if (!room.lamp) {
          missingAmenitiesCount++;
          missingAmenities.push('Lámpara');
        }

        // Determinar nivel de prioridad
        let priority: PriorityLevel;
        let description: string;

        // Determinar prioridad basada en criterios
        if (missingAmenitiesCount >= 5 || !room.toiletPaper) {
          priority = PriorityLevel.HIGH;
        } else if (missingAmenitiesCount >= 3 || !room.showerSoap) {
          priority = PriorityLevel.MEDIUM;
        } else {
          priority = PriorityLevel.LOW;
        }

        // Determinar la descripción
        if (room.status === 'CLEANING' && missingAmenitiesCount === 6) {
          description = 'Falta realizar limpieza en la habitación';
        } else {
          description = `Falta: ${missingAmenities.join(', ')}`;
        }

        // Crear objeto con detalles de la habitación
        const roomDetail: RoomAmenityDetail = {
          id: room.id,
          roomNumber: room.number,
          typeRoom: room.RoomTypes.name,
          priority, // Incluimos el nivel de prioridad en cada habitación
          description,
        };

        // Agregar a la lista correspondiente según prioridad
        if (priority === PriorityLevel.HIGH) {
          highPriorityRooms.push(roomDetail);
        } else if (priority === PriorityLevel.MEDIUM) {
          mediumPriorityRooms.push(roomDetail);
        } else {
          lowPriorityRooms.push(roomDetail);
        }
      }

      // 4. Ordenar cada grupo por número de habitación
      const sortByRoomNumber = (a: RoomAmenityDetail, b: RoomAmenityDetail) =>
        a.roomNumber - b.roomNumber;

      highPriorityRooms.sort(sortByRoomNumber);
      mediumPriorityRooms.sort(sortByRoomNumber);
      lowPriorityRooms.sort(sortByRoomNumber);

      // 5. Construir y retornar resultado final
      return {
        highPriority: {
          count: highPriorityRooms.length,
          rooms: highPriorityRooms,
        },
        mediumPriority: {
          count: mediumPriorityRooms.length,
          rooms: mediumPriorityRooms,
        },
        lowPriority: {
          count: lowPriorityRooms.length,
          rooms: lowPriorityRooms,
        },
      };
    } catch (error) {
      this.logger.error('Error obteniendo amenidades agrupadas por prioridad');
      handleException(
        error,
        'Error obteniendo amenidades agrupadas por prioridad',
      );
    }
  }

  /**
   * Obtiene las habitaciones que están realmente disponibles hoy.
   * Verifica que la habitación esté en estado AVAILABLE y que no tenga reservas
   * activas o programadas que se superpongan con la fecha actual.
   * @returns Lista de habitaciones realmente disponibles
   */
  async findTodayAvailableRooms(): Promise<TodayAvailableRoomsData[]> {
    try {
      // 1. Obtener la fecha actual
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Inicio del día actual
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1); // Inicio del día siguiente

      // 2. Primero, obtener todas las habitaciones con estado AVAILABLE
      const availableRooms = await this.prisma.room.findMany({
        where: {
          isActive: true,
          status: 'AVAILABLE',
        },
        include: {
          RoomTypes: {
            select: {
              name: true,
              price: true,
            },
          },
        },
      });

      // 3. Obtener TODAS las reservas activas que afectan el día de hoy
      const todayReservations = await this.prisma.reservation.findMany({
        where: {
          isActive: true,
          OR: [
            // Caso 1: Check-in antes o igual a hoy Y check-out después o igual a hoy
            {
              checkInDate: { lte: today },
              checkOutDate: { gte: today },
            },
            // Caso 2: Check-in hoy
            {
              checkInDate: {
                gte: today,
                lt: tomorrow,
              },
            },
            // Caso 3: Reserva programada que incluye hoy (estado PENDING o CONFIRMED)
            {
              status: {
                in: ['PENDING', 'CONFIRMED'],
              },
              checkInDate: { lte: today },
              checkOutDate: { gte: today },
            },
          ],
        },
        select: {
          roomId: true,
        },
      });

      // 4. Crear un conjunto de IDs de habitaciones reservadas
      const reservedRoomIds = new Set(
        todayReservations.map((res) => res.roomId),
      );

      // 5. Filtrar para incluir solo habitaciones que NO están en el conjunto de reservadas
      const trulyAvailableRooms = availableRooms
        .filter((room) => !reservedRoomIds.has(room.id))
        .map((room) => ({
          id: room.id,
          number: room.number,
          status: room.status,
          price: room.RoomTypes.price,
          typeRoom: room.RoomTypes.name,
        }));

      return trulyAvailableRooms;
    } catch (error) {
      this.logger.error('Error obteniendo habitaciones disponibles para hoy');
      handleException(
        error,
        'Error obteniendo habitaciones disponibles para hoy',
      );
    }
  }

  /**
   * Obtiene información de reservaciones para la semana actual.
   * @returns Datos de reservaciones para hoy, mañana, semana y estados
   */
  async findWeekReservations(): Promise<WeekReservationsData> {
    try {
      // Obtener fechas relevantes
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const endOfWeek = new Date(today);
      endOfWeek.setDate(endOfWeek.getDate() + 7);

      // 1. Contar reservas con check-in hoy
      const todayReservationsCount = await this.prisma.reservation.count({
        where: {
          checkInDate: {
            gte: today,
            lt: tomorrow,
          },
          isActive: true,
        },
      });

      // 2. Contar reservas con check-in mañana
      const tomorrowReservationsCount = await this.prisma.reservation.count({
        where: {
          checkInDate: {
            gte: tomorrow,
            lt: new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000),
          },
          isActive: true,
        },
      });

      // 3. Contar reservas con check-in esta semana
      const weekReservationsCount = await this.prisma.reservation.count({
        where: {
          checkInDate: {
            gte: today,
            lt: endOfWeek,
          },
          isActive: true,
        },
      });

      // 4. Contar reservas pendientes
      const pendingReservationsCount = await this.prisma.reservation.count({
        where: {
          status: 'PENDING',
          isActive: true,
        },
      });

      // 5. Contar reservas confirmadas
      const confirmedReservationsCount = await this.prisma.reservation.count({
        where: {
          status: 'CONFIRMED',
          isActive: true,
        },
      });

      // 6. Obtener todas las reservas activas con sus detalles
      const allReservations = await this.prisma.reservation.findMany({
        where: {
          isActive: true,
          status: {
            in: ['PENDING', 'CONFIRMED', 'CHECKED_IN'],
          },
        },
        orderBy: [{ checkInDate: 'asc' }],
        include: {
          customer: {
            select: {
              name: true,
            },
          },
          room: {
            select: {
              number: true,
              RoomTypes: {
                select: {
                  name: true,
                  price: true, // Incluir el precio para calcular subtotal en PENDING
                },
              },
            },
          },
          payment: {
            select: {
              amount: true,
            },
          },
        },
      });

      // 7. Formatear las reservas según la interfaz requerida
      const formattedReservations: FullReservationsData[] = allReservations.map(
        (reservation) => {
          // Calcular el número de noches
          const nights = calculateStayNights(
            reservation.checkInDate.toISOString(),
            reservation.checkOutDate.toISOString(),
            reservation.appliedLateCheckOut,
          );

          // Calcular subtotal basado en pagos o precio de la habitación
          let subtotal = 0;
          if (reservation.payment && reservation.payment.length > 0) {
            // Si hay pagos registrados, usar ese monto
            subtotal = reservation.payment[0].amount;
          } else {
            // Si no hay pagos (como en PENDING), calcular basado en el precio de la habitación
            const roomPrice = reservation.room.RoomTypes.price;
            subtotal = roomPrice * nights;
          }

          // Calcular el número total de huéspedes (cliente principal + acompañantes)
          let numberGuests = 1; // Siempre contar el cliente principal

          // Contar acompañantes solo si existen
          if (reservation.guests) {
            try {
              // Intentar diferentes formatos posibles de guests
              if (typeof reservation.guests === 'string') {
                // Si es un string JSON
                const guestsString = reservation.guests as string;

                // Intenta parsear el string
                try {
                  const parsed = JSON.parse(guestsString);
                  if (Array.isArray(parsed)) {
                    numberGuests += parsed.length;
                  }
                } catch {
                  // Si falla el parseo directo, puede tener escape de caracteres
                  try {
                    const cleanString = guestsString.replace(/\\"/g, '"');
                    const parsed = JSON.parse(cleanString);
                    if (Array.isArray(parsed)) {
                      numberGuests += parsed.length;
                    }
                  } catch {
                    // Si aún falla, contar las ocurrencias de "name"
                    const matches = guestsString.match(/name/g);
                    if (matches) {
                      numberGuests += matches.length;
                    }
                  }
                }
              } else if (Array.isArray(reservation.guests)) {
                // Si ya es un array
                numberGuests += reservation.guests.length;
              }
            } catch (e) {
              // En caso de error de parseo, mantener solo el cliente principal
              this.logger.warn('Error al parsear guests en reservación:', e);
            }
          }

          return {
            id: reservation.id,
            customerName: reservation.customer?.name || 'Cliente sin nombre',
            roomNumber: reservation.room.number,
            typeRoom: reservation.room.RoomTypes.name,
            status: reservation.status,
            checkInDate: reservation.checkInDate,
            checkOutDate: reservation.checkOutDate,
            subtotal,
            nights,
            numberGuests,
          };
        },
      );

      return {
        todayReservations: todayReservationsCount,
        tomorrowReservations: tomorrowReservationsCount,
        weekReservations: weekReservationsCount,
        pendingReservations: pendingReservationsCount,
        confirmedReservations: confirmedReservationsCount,
        reservations: formattedReservations,
      };
    } catch (error) {
      this.logger.error('Error obteniendo reservaciones de la semana');
      handleException(error, 'Error obteniendo reservaciones de la semana');
    }
  }
}
