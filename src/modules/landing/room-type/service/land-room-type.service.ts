import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { LandRoomTypeRepository } from '../repository/land-room-type.repository';
import {
  LandRoomTypeAllImg,
  BaseRoomTypeMainImg,
} from '../entities/land-room-type.entity';
import { BaseQueryDto } from '../../dto/base.query.dto';
import { defaultLocale, SupportedLocales } from '../../i18n/translations';
import { DetailedRoomWithImages } from 'src/modules/admin/room/entities/room.entity';
import { RoomService } from 'src/modules/admin/room/services/room.service';

@Injectable()
export class LandRoomTypeService {
  private readonly logger = new Logger(LandRoomTypeService.name);

  constructor(
    private readonly landRoomTypeRepository: LandRoomTypeRepository,
    private readonly roomService: RoomService,
  ) {}

  /**
   * Obtiene todos los tipos de habitaciones activas con formato resumido para landing
   */
  async findAllRoomTypesForLanding({
    locale,
  }: BaseQueryDto): Promise<BaseRoomTypeMainImg[]> {
    try {
      // Obtener todos los tipos de habitación activos con sus imágenes principales
      const roomTypesWithImages =
        await this.landRoomTypeRepository.findAllActiveWithMainImage();

      // Transformar al formato DTO requerido
      return roomTypesWithImages.map((roomType) => ({
        id: roomType.id,
        name:
          locale === defaultLocale
            ? roomType.name
            : (roomType.nameEn ?? roomType.name),
        description:
          locale === defaultLocale
            ? roomType.description
            : (roomType.descriptionEn ?? roomType.description),
        price: roomType.price,
        guests: roomType.guests,
        mainImageUrl: roomType.mainImageUrl || '',
        bed:
          locale === defaultLocale
            ? roomType.bed
            : (roomType.bedEn ?? roomType.bed),
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

  async findRoomById(
    id: string,
    locale: SupportedLocales,
  ): Promise<DetailedRoomWithImages> {
    try {
      const roomDetail = await this.roomService.findByIdDetailed(id);
      return roomDetail;
    } catch {
      throw new Error(
        locale === defaultLocale
          ? 'Habitación no encontrada'
          : 'Room not found',
      );
    }
  }
}
