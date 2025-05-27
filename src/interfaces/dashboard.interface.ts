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
  todayCheckInPerformed: number;
  todayCheckOut: number;
  todayCheckOutPerformed: number;
  todayAvailableRooms: number;
  totalRooms: number;
  todayPendingAmenities: number;
  urgentPendingAmenities: number;
}

export interface Top5TodayCheckInData {
  id: string;
  customerName: string;
  roomNumber: number;
  status: ReservationStatus;
  checkInDate: Date;
}

export interface Top5TodayCheckOutData {
  id: string;
  customerName: string;
  roomNumber: number;
  status: ReservationStatus;
  checkOutDate: Date;
}

export enum PriorityLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

export interface Top5PriorityPendingAmenitiesData {
  id: string;
  roomNumber: number;
  typeRoom: string;
  priority: PriorityLevel;
  description: string;
}

export interface AmenitiesByPriorityData {
  highPriority: PriorityAmenitiesGroup;
  mediumPriority: PriorityAmenitiesGroup;
  lowPriority: PriorityAmenitiesGroup;
}

export interface PriorityAmenitiesGroup {
  count: number;
  rooms: RoomAmenityDetail[];
}

export interface RoomAmenityDetail {
  id: string;
  roomNumber: number;
  typeRoom: string;
  priority: PriorityLevel;
  description: string;
}

export interface TodayAvailableRoomsData {
  id: string;
  number: number;
  status: RoomStatus;
  price: number;
  typeRoom: string;
}

export interface WeekReservationsData {
  todayReservations: number;
  tomorrowReservations: number;
  weekReservations: number;
  pendingReservations: number;
  confirmedReservations: number;
  reservations: FullReservationsData[];
}

export interface FullReservationsData {
  id: string;
  customerName: string;
  roomNumber: number;
  typeRoom: string;
  status: ReservationStatus;
  checkInDate: Date;
  checkOutDate: Date;
  subtotal: number;
  nights: number;
  numberGuests: number;
}
