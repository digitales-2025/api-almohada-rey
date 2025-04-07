import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/src';
import { LandRoomTypeMainImg } from '../entities/land-room-type.entity';
/* interface RoomTypeWithMainImage {
  id: string;
  name: string;
  description: string;
  price: number;
  guests: number;
  mainImageUrl: string | null;
} */

@Injectable()
export class LandRoomTypeRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Obtiene todos los tipos de habitación activos con su imagen principal
   */
  async findAllActiveWithMainImage(): Promise<LandRoomTypeMainImg[]> {
    try {
      // Obtener tipos de habitación activos
      const roomTypes = await this.prisma.roomTypes.findMany({
        where: {
          isActive: true,
        },
        select: {
          id: true,
          name: true,
          description: true,
          price: true,
          guests: true,
          // También incluimos las imágenes pero las filtraremos después
          ImageRoomType: {
            where: {
              isActive: true,
              isMain: true,
            },
            select: {
              imageUrl: true,
            },
            take: 1, // Solo necesitamos una imagen (la principal)
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      // Transformar los resultados para incluir la URL de la imagen principal
      return roomTypes.map((roomType) => ({
        id: roomType.id,
        name: roomType.name,
        description: roomType.description,
        price: roomType.price,
        guests: roomType.guests,
        mainImageUrl:
          roomType.ImageRoomType.length > 0
            ? roomType.ImageRoomType[0].imageUrl
            : null,
      }));
    } catch (error) {
      console.error(
        'Error obteniendo tipos de habitación con imagen principal:',
        error,
      );
      return [];
    }
  }
}
