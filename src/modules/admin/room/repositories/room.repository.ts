import { Injectable } from '@nestjs/common';
import { Room, RoomStatus } from '../entities/room.entity';
import { BaseRepository, PrismaService } from 'src/prisma/src';

@Injectable()
export class RoomRepository extends BaseRepository<Room> {
  constructor(prisma: PrismaService) {
    super(prisma, 'room'); // Tabla del esquema de prisma (con R mayúscula)
  }

  /**
   * Busca una habitación por su número
   * @param number Número de la habitación
   * @returns Promise con la habitación si existe
   */
  async findByNumber(number: number): Promise<Room | null> {
    return this.prisma.room.findFirst({
      where: { number, isActive: true },
    });
  }

  /**
   * Busca habitaciones por estado
   * @param status Estado de la habitación
   * @returns Promise con array de habitaciones
   */
  async findByStatus(status: RoomStatus): Promise<Room[]> {
    return this.prisma.room.findMany({
      where: { status, isActive: true },
    });
  }

  /**
   * Busca habitaciones por tipo
   * @param typeId ID del tipo de habitación
   * @returns Promise con array de habitaciones
   */
  async findByType(typeId: string): Promise<Room[]> {
    return this.prisma.room.findMany({
      where: { roomTypeId: typeId, isActive: true },
    });
  }
}
