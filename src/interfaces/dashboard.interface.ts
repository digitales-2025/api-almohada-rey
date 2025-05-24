import { ReservationStatus, RoomStatus } from '@prisma/client';

// Extendiendo RoomStatus para incluir MAINTENANCE
export type ExtendedRoomStatus = RoomStatus | 'MAINTENANCE';

export interface AnnualAdministratorStatisticsData {
  totalIncome: number;
  occupancyRate: number;
  newCustomers: number;
  pendingPayments: number;
}

export interface MonthlyEarningsAndExpensesData {
  month: string;
  earnings: number;
  expenses: number;
}

export interface RoomOccupancyMapData {
  countAvailable: number;
  countOccupied: number;
  countCleaning: number;
  countMaintenance: number;
  countIncomplete: number;
  roomsByType: Record<string, ListRoom[]>;
}

export interface ListRoom {
  id: string;
  number: number;
  status: ExtendedRoomStatus;
}

export interface RecentReservationsData {
  todayReservations: number;
  newReservations: Top5ReservationsData[];
}

export interface Top5ReservationsData {
  id: string;
  customerName: string;
  roomNumber: number;
  status: ReservationStatus;
  checkInDate: Date;
  checkOutDate: Date;
}

export interface NextPendingPaymentsData {
  monthPendingPayments: number;
  newPayments: Top5PendingPaymentsData[];
}

export interface Top5PendingPaymentsData {
  id: string;
  customerName: string;
  roomNumber: number;
  code: string;
  amount: number;
}

export interface OccupationStatisticsPercentageData {
  id: string;
  type: string;
  percentage: number;
}

export interface MonthlyBookingTrendData {
  month: string;
  webBookings: number;
  directBookings: number;
}

export interface SummaryFinanceData {
  totalIncome: number;
  totalExpenses: number;
  totalProfit: number;
  totalRoomReservations: number;
  totalServices: number;
  totalProducts: number;
  totalLateCheckout: number;
  totalExpensesFixed: number;
  totalExpensesVariable: number;
  totalExpensesOther: number;
  totalExpensesProducts: number;
}

export interface CustomerOriginSummaryData {
  totalCustomers: number;
  totalNationalCustomers: number;
  totalInternationalCustomers: number;
  totalCountry: number;
}

export interface MonthlyCustomerOriginData {
  month: string;
  nationalCustomers: number;
  internationalCustomers: number;
}

export interface Top10CountriesProvincesData {
  countryProvince: string;
  totalCustomers: number;
}

export interface TodayRecepcionistStatisticsData {
  todayCheckIn: number;
  todayCheckOut: number;
  todayAvailableRooms: number;
  todayPendingTask: number;
}
