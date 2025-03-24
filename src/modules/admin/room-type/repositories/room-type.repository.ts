import { Injectable } from '@nestjs/common';
import { RoomType } from '../entities/room-type.entity';
import { BaseRepository, PrismaService } from 'src/prisma/src';

export interface CreateImageRoomTypeData {
  room: string; // ID del RoomType asociado
  imageUrl: string;
  isMain: boolean;
}

@Injectable()
export class RoomTypeRepository extends BaseRepository<RoomType> {
  constructor(prisma: PrismaService) {
    super(prisma, 'roomTypes'); // Tabla del esquema de prisma (ahora es RoomTypes)
  }

  /**
   * Registra una nueva imagen de tipo de habitación
   * @param data Datos de la imagen a crear
   * @returns Promise<void>
   */
  async createImageRoomType(data: CreateImageRoomTypeData): Promise<void> {
    try {
      await this.prisma.imageRoomType.create({
        data: {
          roomTypeId: data.room,
          imageUrl: data.imageUrl,
          isMain: data.isMain,
        },
      });
    } catch (error) {
      console.error('Error creando imagen de tipo de habitación:', error);
      throw error;
    }
  }

  /**
   * Busca una imagen por su ID
   * @param id ID de la imagen
   * @returns Promise con los datos de la imagen
   */
  async findImageById(id: string): Promise<{
    id: string;
    imageUrl: string;
    isMain: boolean;
  }> {
    try {
      const image = await this.prisma.imageRoomType.findUnique({
        where: { id },
        select: {
          id: true,
          imageUrl: true,
          isMain: true,
        },
      });

      return image;
    } catch (error) {
      console.error('Error buscando imagen:', error);
      throw error;
    }
  }

  /**
   * Actualiza la URL de una imagen existente
   * @param id ID de la imagen
   * @param url Nueva URL
   * @returns Promise<void>
   */
  async updateImageUrl(id: string, url: string): Promise<void> {
    try {
      await this.prisma.imageRoomType.update({
        where: {
          id,
          isActive: true,
        },
        data: {
          imageUrl: url,
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      console.error('Error actualizando URL de imagen:', error);
      throw error;
    }
  }

  /**
   * Obtiene todas las imágenes asociadas a un tipo de habitación
   * @param roomTypeId ID del tipo de habitación
   * @returns Promise con array de objetos de imágenes
   */
  async findImagesByRoomTypeId(
    roomTypeId: string,
  ): Promise<Array<{ id: string; url: string; isMain: boolean }>> {
    try {
      const images = await this.prisma.imageRoomType.findMany({
        where: {
          roomTypeId: roomTypeId,
          isActive: true,
        },
        select: {
          id: true,
          imageUrl: true,
          isMain: true,
        },
        orderBy: {
          isMain: 'desc', // Las imágenes principales primero
        },
      });

      // Transformar a formato de respuesta incluyendo isMain
      return images.map((img) => ({
        id: img.id,
        url: img.imageUrl,
        isMain: img.isMain,
      }));
    } catch (error) {
      console.error('Error obteniendo imágenes de tipo de habitación:', error);
      return [];
    }
  }

  /**
   * Marca una imagen como principal y desmarca las demás
   * @param imageId ID de la imagen a marcar como principal
   * @param roomTypeId ID del tipo de habitación
   */
  async setMainImage(imageId: string, roomTypeId: string): Promise<void> {
    try {
      // Primero desmarcamos todas las imágenes como principales
      await this.prisma.imageRoomType.updateMany({
        where: {
          roomTypeId: roomTypeId,
          isMain: true,
        },
        data: {
          isMain: false,
        },
      });

      // Luego marcamos la imagen seleccionada como principal
      await this.prisma.imageRoomType.update({
        where: {
          id: imageId,
        },
        data: {
          isMain: true,
        },
      });
    } catch (error) {
      console.error('Error configurando imagen principal:', error);
      throw error;
    }
  }

  /**
   * Desmarca todas las imágenes principales de un tipo de habitación
   * @param roomTypeId ID del tipo de habitación
   */
  async resetMainImages(roomTypeId: string): Promise<void> {
    try {
      await this.prisma.imageRoomType.updateMany({
        where: {
          roomTypeId: roomTypeId,
          isMain: true,
        },
        data: {
          isMain: false,
        },
      });
    } catch (error) {
      console.error('Error reseteando imágenes principales:', error);
      throw error;
    }
  }

  /**
   * Actualiza el estado de imagen principal
   * @param imageId ID de la imagen
   * @param isMain Estado de imagen principal
   */
  async updateImageMain(imageId: string, isMain: boolean): Promise<void> {
    try {
      await this.prisma.imageRoomType.update({
        where: { id: imageId },
        data: { isMain },
      });
    } catch (error) {
      console.error('Error actualizando estado de imagen principal:', error);
      throw error;
    }
  }

  /**
   * Busca un tipo de habitación por su nombre
   * @param name Nombre del tipo de habitación
   * @returns Promise con el tipo de habitación si existe
   */
  async findOneByName(name: string): Promise<RoomType | null> {
    return this.prisma.roomTypes.findFirst({
      where: { name, isActive: true },
    });
  }
}
