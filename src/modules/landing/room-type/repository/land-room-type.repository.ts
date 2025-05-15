import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/src';
import {
  LandRoomTypeMainImg,
  LandRoomTypeAllImg,
} from '../entities/land-room-type.entity';

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
          nameEn: true,
          description: true,
          descriptionEn: true,
          bed: true,
          bedEn: true,
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
        nameEn: roomType.nameEn,
        description: roomType.description,
        descriptionEn: roomType.descriptionEn,
        price: roomType.price,
        guests: roomType.guests,
        bed: roomType.bed,
        bedEn: roomType.bedEn,
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

  /**
   * Obtiene un tipo de habitación activo por ID con todas sus imágenes
   */
  async findActiveRoomTypeWithAllImages(
    id: string,
  ): Promise<LandRoomTypeAllImg> {
    try {
      // Buscar el tipo de habitación con el ID proporcionado y que esté activo
      const roomType = await this.prisma.roomTypes.findFirst({
        where: {
          id: id,
          isActive: true,
        },
        select: {
          id: true,
          name: true,
          description: true,
          price: true,
          guests: true,
          bed: true,
          // Obtener todas las imágenes activas
          ImageRoomType: {
            where: {
              isActive: true,
            },
            select: {
              id: true,
              imageUrl: true,
              isMain: true,
            },
            orderBy: {
              isMain: 'desc', // Primero las imágenes principales
            },
          },
        },
      });

      // Si no se encuentra el tipo de habitación, retornar null
      if (!roomType) {
        return null;
      }

      // Transformar los datos al formato requerido
      return {
        id: roomType.id,
        name: roomType.name,
        description: roomType.description,
        price: roomType.price,
        guests: roomType.guests,
        bed: roomType.bed,
        images: roomType.ImageRoomType.map((img) => ({
          id: img.id,
          url: img.imageUrl,
          isMain: img.isMain,
        })),
      };
    } catch (error) {
      console.error(
        'Error obteniendo tipo de habitación con imágenes por ID:',
        error,
      );
      throw error;
    }
  }
}
