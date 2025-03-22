import { Injectable } from '@nestjs/common';
import { Room } from '../entities/rooms.entity';
import { BaseRepository, PrismaService } from 'src/prisma/src';

export interface CreateImageRoomData {
  room: string;
  imageUrl: string;
  isMain: boolean;
}

@Injectable()
export class RoomsRepository extends BaseRepository<Room> {
  constructor(prisma: PrismaService) {
    super(prisma, 'room'); // Tabla del esquema de prisma
  }

  /**
   * Obtiene todas las habitaciones
   * @returns Promise<Room[]>
   */
  /*   async findMany(): Promise<Room[]> {
    return this.prisma.room.findMany({
      where: {},
      orderBy: { number: 'asc' },
    });
  } */

  /**
   * Busca una habitación por su ID
   * @param id ID de la habitación
   * @returns Promise<Room>
   */
  async findById(id: string): Promise<Room> {
    const room = await this.prisma.room.findUnique({
      where: { id },
    });

    // Si necesitas devolver el resultado como Room, puedes usar type assertion
    return room as unknown as Room;
  }

  /**
   * Busca una habitación por su número
   * @param number Número de habitación
   * @returns Promise<Room>
   */
  async findByNumber(number: number): Promise<Room> {
    const room = await this.prisma.room.findUnique({
      where: { number },
    });

    // Si necesitas devolver el resultado como Room, puedes usar type assertion
    return room as unknown as Room;
  }

  /**
   * Registra una nueva imagen de habitación
   * @param data Datos de la imagen a crear
   * @returns Promise<void>
   */
  async createImageRoom(data: CreateImageRoomData): Promise<void> {
    try {
      await this.prisma.imageRoom.create({
        data: {
          room: data.room,
          imageUrl: data.imageUrl,
          isMain: data.isMain,
        },
      });
    } catch (error) {
      console.error('Error creando imagen de habitación:', error);
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
      const image = await this.prisma.imageRoom.findUnique({
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
      await this.prisma.imageRoom.update({
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
   * Obtiene todas las imágenes asociadas a una habitación
   * @param roomId ID de la habitación
   * @returns Promise con array de objetos de imágenes
   */
  async findImagesByRoomId(
    roomId: string,
  ): Promise<Array<{ id: string; url: string; isMain: boolean }>> {
    try {
      const images = await this.prisma.imageRoom.findMany({
        where: {
          room: roomId,
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
      console.error('Error obteniendo imágenes de habitación:', error);
      return [];
    }
  }

  /**
   * Marca una imagen como principal y desmarca las demás
   * @param imageId ID de la imagen a marcar como principal
   * @param roomId ID de la habitación
   */
  async setMainImage(imageId: string, roomId: string): Promise<void> {
    try {
      // Primero desmarcamos todas las imágenes como principales
      await this.prisma.imageRoom.updateMany({
        where: {
          room: roomId,
          isMain: true,
        },
        data: {
          isMain: false,
        },
      });

      // Luego marcamos la imagen seleccionada como principal
      await this.prisma.imageRoom.update({
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

  // Implementa estos métodos en tu RoomsRepository
  async resetMainImages(roomId: string): Promise<void> {
    await this.prisma.imageRoom.updateMany({
      where: {
        room: roomId,
        isMain: true,
      },
      data: {
        isMain: false,
      },
    });
  }

  async updateImageMain(imageId: string, isMain: boolean): Promise<void> {
    await this.prisma.imageRoom.update({
      where: { id: imageId },
      data: { isMain },
    });
  }
}
