import { Injectable } from '@nestjs/common';
import { CleaningChecklist } from '../entities/room-clean.entity';
import { BaseRepository, PrismaService } from 'src/prisma/src';
import { RoomStatus } from '@prisma/client';

@Injectable()
export class CleaningChecklistRepository extends BaseRepository<CleaningChecklist> {
  constructor(prisma: PrismaService) {
    super(prisma, 'cleaningChecklist'); // Tabla del esquema de prisma
  }

  /**
   * Busca registros de limpieza por ID de habitación
   * @param roomId ID de la habitación
   * @returns Array de registros de limpieza
   */
  async findByRoom(roomId: string): Promise<CleaningChecklist[]> {
    return this.findMany({
      where: {
        roomId,
        isActive: true,
      },
      orderBy: {
        date: 'desc', // Registros más recientes primero
      },
    });
  }

  /**
   * Busca registros de limpieza por fecha
   * @param date Fecha en formato YYYY-MM-DD
   * @returns Array de registros de limpieza
   */
  async findByDate(date: string): Promise<CleaningChecklist[]> {
    return this.findMany({
      where: {
        date,
        isActive: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Busca un registro de limpieza específico por habitación y fecha
   * @param roomId ID de la habitación
   * @param date Fecha en formato YYYY-MM-DD
   * @returns Registro de limpieza si existe, null en caso contrario
   */
  async findByRoomAndDate(
    roomId: string,
    date: string,
  ): Promise<CleaningChecklist | null> {
    return this.findOne({
      where: {
        roomId,
        date,
        isActive: true,
      },
    });
  }

  /**
   * Obtiene estadísticas de limpieza por habitación
   * @param roomId ID de la habitación
   * @returns Objeto con estadísticas de limpieza
   */
  async getCleaningStatsByRoom(roomId: string): Promise<{
    totalCleanings: number;
    lastCleaning: string | null;
  }> {
    const cleanings = await this.findByRoom(roomId);

    return {
      totalCleanings: cleanings.length,
      lastCleaning: cleanings.length > 0 ? cleanings[0].date : null,
    };
  }

  /**
   * Obtiene estadísticas de limpieza por fecha
   * @param startDate Fecha inicial en formato YYYY-MM-DD
   * @param endDate Fecha final en formato YYYY-MM-DD
   * @returns Número de limpiezas en el rango de fechas
   */
  async getCleaningCountByDateRange(
    startDate: string,
    endDate: string,
  ): Promise<number> {
    const cleanings = await this.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
        isActive: true,
      },
    });

    return cleanings.length;
  }

  /**
   * Obtiene la información detallada de una habitación para validaciones
   * @param roomId ID de la habitación
   * @returns Datos completos de la habitación o null si no existe
   */
  async getRoomDetails(roomId: string): Promise<any | null> {
    return this.prisma.room.findUnique({
      where: {
        id: roomId,
        isActive: true,
      },
    });
  }

  /**
   * Actualiza el estado de una habitación a disponible
   * @param roomId ID de la habitación
   * @returns Habitación actualizada
   */
  async updateRoomStatus(roomId: string, status: RoomStatus): Promise<any> {
    return this.prisma.room.update({
      where: { id: roomId },
      data: {
        status: status,
        updatedAt: new Date(),
      },
    });
  }
}
