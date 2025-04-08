import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { LandRoomTypeRepository } from '../repository/land-room-type.repository';
import {
  LandRoomTypeMainImg,
  LandRoomTypeAllImg,
} from '../entities/land-room-type.entity';

@Injectable()
export class LandRoomTypeService {
  private readonly logger = new Logger(LandRoomTypeService.name);

  constructor(
    private readonly landRoomTypeRepository: LandRoomTypeRepository,
  ) {}

  /**
   * Obtiene todos los tipos de habitaciones activas con formato resumido para landing
   */
  async findAllRoomTypesForLanding(): Promise<LandRoomTypeMainImg[]> {
    try {
      // Obtener todos los tipos de habitación activos con sus imágenes principales
      const roomTypesWithImages =
        await this.landRoomTypeRepository.findAllActiveWithMainImage();

      // Transformar al formato DTO requerido
      return roomTypesWithImages.map((roomType) => ({
        id: roomType.id,
        name: roomType.name,
        description: roomType.description,
        price: roomType.price,
        guests: roomType.guests,
        mainImageUrl: roomType.mainImageUrl || '',
      }));
    } catch (error) {
      this.logger.error(
        `Error obteniendo tipos de habitación para landing: ${error.message}`,
      );
      return [];
    }
  }

  /**
   * Obtiene un tipo de habitación por ID con todas sus imágenes
   */
  async findRoomTypeById(id: string): Promise<LandRoomTypeAllImg> {
    try {
      const roomTypeWithImages =
        await this.landRoomTypeRepository.findActiveRoomTypeWithAllImages(id);

      if (!roomTypeWithImages) {
        throw new NotFoundException(
          `No se encontró un tipo de habitación activo con este ID`,
        );
      }

      return roomTypeWithImages;
    } catch (error) {
      this.logger.error(
        `Error obteniendo tipo de habitación por ID para landing: ${error.message}`,
      );
      throw error;
    }
  }
}
