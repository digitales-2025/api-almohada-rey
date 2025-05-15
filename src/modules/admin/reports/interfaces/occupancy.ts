export interface RoomTypeOccupancyStats {
  roomTypeId: string;
  roomTypeName: string;
  capacity: number;
  uniqueRoomsCount: number; // Habitaciones usadas en este período
  totalRoomsOfThisType: number; // Total de habitaciones disponibles de este tipo
  arrivals: number; // Número de check-ins
  averageStayDuration: number; // Promedio de duración de estadía en días
  occupiedRoomDays: number; // Total de días-habitación ocupados
  occupancyRatePercent: number; // Porcentaje tradicional de ocupación (días)
  occupancyRateByArrivalsPercent: number; // Nueva tasa basada en arribos vs habitaciones
  totalGuests: number; // Total de huéspedes principales + acompañantes
  totalOvernights: number; // Total de pernoctaciones (personas x noches)
  arrivalsByDay: Record<string, number>; // Arribos por día
  overnightsByDay: Record<string, number>; // Pernoctaciones por día
  summary: {
    month: number;
    year: number;
    daysInMonth: number;
    roomType: string;
    totalRooms: number;
  };
}

// Interfaces ampliadas para manejar las nuevas estadísticas

export interface OccupancyStatsResponse {
  roomTypeStats: RoomTypeOccupancyStats[];
  nationalityStats: NationalityStats[];
  peruvianDepartmentStats: DepartmentStats[];
  dailyStats: DailyStats[];
  summary: OccupancySummary;
}

export interface NationalityStats {
  country: string;
  arrivals: number;
  overnights: number;
  guests: number;
  averageStayDuration: number;
}

export interface DepartmentStats {
  department: string;
  arrivals: number;
  overnights: number;
  guests: number;
  averageStayDuration: number;
}

export interface DailyStats {
  date: string;
  arrivals: number;
  overnights: number;
}

export interface OccupancySummary {
  month: number;
  year: number;
  totalRoomTypes: number;
  totalCountries: number;
  totalPeruvianDepartments: number;
  totalArrivals: number;
  totalOvernights: number;
  totalGuests: number;
  totalRooms?: number; // Añadida como opcional
  totalUniqueRooms?: number; // Añadida como opcional
}
