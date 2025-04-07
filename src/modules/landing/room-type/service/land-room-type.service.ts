import { Injectable, Logger } from '@nestjs/common';
import { LandRoomTypeRepository } from '../repository/land-room-type.repository';
import { LandRoomTypeMainImg } from '../entities/land-room-type.entity';

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
}
