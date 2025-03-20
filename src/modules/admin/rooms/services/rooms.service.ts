import {
  BadRequestException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { RoomsRepository } from '../repositories/rooms.repository';
import { Room } from '../entities/rooms.entity';
import { HttpResponse, UserData } from 'src/interfaces';

import { roomErrorMessages } from '../errors/errors-rooms';
import { CreateRoomDto, UpdateRoomDto, DeleteRoomDto } from '../dto';
import {
  CreateRoomUseCase,
  UpdateRoomUseCase,
  DeleteRoomsUseCase,
  ReactivateRoomUseCase,
} from '../use-cases';

import { CloudflareService } from 'src/cloudflare/cloudflare.service';
import { CreateImageRoomData } from '../repositories/rooms.repository';
import { BaseApiResponse } from 'src/utils/base-response/BaseApiResponse.dto';
import { BaseErrorHandler } from 'src/utils/error-handlers/service-error.handler';
import { validateArray, validateChanges } from 'src/prisma/src/utils';

@Injectable()
export class RoomsService {
  private readonly logger = new Logger(RoomsService.name);
  private readonly errorHandler: BaseErrorHandler;

  constructor(
    private readonly roomsRepository: RoomsRepository,
    private readonly createRoomUseCase: CreateRoomUseCase,
    private readonly updateRoomUseCase: UpdateRoomUseCase,
    private readonly deleteRoomsUseCase: DeleteRoomsUseCase,
    private readonly reactivateRoomUseCase: ReactivateRoomUseCase,
    private readonly cloudflareService: CloudflareService,
  ) {
    this.errorHandler = new BaseErrorHandler(
      this.logger,
      'Room',
      roomErrorMessages,
    );
  }

  /**
   * Crea una nueva habitación
   */
  async create(
    createRoomDto: CreateRoomDto,
    user: UserData,
  ): Promise<BaseApiResponse<Room>> {
    try {
      // Verificar si ya existe una habitación con el mismo número
      const existingRoom = await this.roomsRepository.findByNumber(
        createRoomDto.number,
      );
      if (existingRoom) {
        throw new BadRequestException(roomErrorMessages.alreadyExists);
      }

      return await this.createRoomUseCase.execute(createRoomDto, user);
    } catch (error) {
      this.errorHandler.handleError(error, 'creating');
      throw error;
    }
  }

  /**
   * Actualiza una habitación existente
   */
  async update(
    id: string,
    updateRoomDto: UpdateRoomDto,
    user: UserData,
  ): Promise<BaseApiResponse<Room>> {
    try {
      const currentRoom = await this.findById(id);

      if (!validateChanges(updateRoomDto, currentRoom)) {
        return {
          success: true,
          message: 'No se detectaron cambios en la habitación',
          data: currentRoom,
        };
      }

      // Si se está actualizando el número, verificar que no exista otra habitación con ese número
      if (updateRoomDto.number && updateRoomDto.number !== currentRoom.number) {
        const existingRoom = await this.roomsRepository.findByNumber(
          updateRoomDto.number,
        );
        if (existingRoom && existingRoom.id !== id) {
          throw new BadRequestException(roomErrorMessages.alreadyExists);
        }
      }

      // Validar cambio de estado
      if (updateRoomDto.status && currentRoom.status !== updateRoomDto.status) {
        // Validar si es posible cambiar el estado según reglas de negocio
        if (
          currentRoom.status === 'OCCUPIED' &&
          updateRoomDto.status !== 'AVAILABLE' &&
          updateRoomDto.status !== 'CLEANING'
        ) {
          throw new BadRequestException(roomErrorMessages.unavailableStatus);
        }
      }

      return await this.updateRoomUseCase.execute(id, updateRoomDto, user);
    } catch (error) {
      this.errorHandler.handleError(error, 'updating');
      throw error;
    }
  }

  /**
   * Busca una habitación por su ID
   */
  async findOne(id: string): Promise<Room> {
    try {
      return this.findById(id);
    } catch (error) {
      this.errorHandler.handleError(error, 'getting');
      throw error;
    }
  }

  /**
   * Obtiene todas las habitaciones
   */
  async findAll(): Promise<Room[]> {
    try {
      return this.roomsRepository.findMany();
    } catch (error) {
      this.errorHandler.handleError(error, 'getting');
      throw error;
    }
  }

  /**
   * Busca una habitación por su ID
   */
  async findById(id: string): Promise<Room> {
    const room = await this.roomsRepository.findById(id);
    if (!room) {
      throw new BadRequestException(roomErrorMessages.notFound);
    }
    return room;
  }

  /**
   * Desactiva múltiples habitaciones
   */
  async deleteMany(
    deleteRoomDto: DeleteRoomDto,
    user: UserData,
  ): Promise<BaseApiResponse<Room[]>> {
    try {
      validateArray(deleteRoomDto.ids, 'IDs de habitaciones');

      // Verificar que ninguna habitación esté ocupada
      for (const id of deleteRoomDto.ids) {
        const room = await this.roomsRepository.findById(id);
        if (room && room.status === 'OCCUPIED') {
          throw new BadRequestException(roomErrorMessages.inUse);
        }
      }

      return await this.deleteRoomsUseCase.execute(deleteRoomDto, user);
    } catch (error) {
      this.errorHandler.handleError(error, 'deactivating');
      throw error;
    }
  }

  /**
   * Reactiva múltiples habitaciones
   */
  async reactivateMany(
    ids: string[],
    user: UserData,
  ): Promise<BaseApiResponse<Room[]>> {
    try {
      validateArray(ids, 'IDs de habitaciones');
      return await this.reactivateRoomUseCase.execute(ids, user);
    } catch (error) {
      this.errorHandler.handleError(error, 'reactivating');
      throw error;
    }
  }

  /**
   * Sube una imagen y devuelve la URL
   * @param image - Imagen a subir
   * @returns Respuesta HTTP con la URL de la imagen subida
   */
  async uploadImage(image: Express.Multer.File): Promise<HttpResponse<string>> {
    if (!image) {
      throw new BadRequestException('Image not provided');
    }

    if (Array.isArray(image)) {
      throw new BadRequestException('Only one file can be uploaded at a time');
    }

    const validMimeTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
    ];
    if (!validMimeTypes.includes(image.mimetype)) {
      throw new BadRequestException(
        'The file must be an image in JPEG, PNG, GIF, or WEBP format',
      );
    }

    try {
      const imageUrl = await this.cloudflareService.uploadImage(image);
      return {
        statusCode: HttpStatus.CREATED,
        message: 'Image uploaded successfully',
        data: imageUrl,
      };
    } catch (error) {
      this.logger.error(`Error uploading image: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Error subiendo la imagen');
    }
  }

  /**
   * Actualizar imagen
   */
  async updateImage(
    image: Express.Multer.File,
    existingFileName: string,
  ): Promise<HttpResponse<string>> {
    if (!image) {
      throw new BadRequestException('Image not provided');
    }

    if (Array.isArray(image)) {
      throw new BadRequestException('Only one file can be uploaded at a time');
    }

    const validMimeTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
    ];
    if (!validMimeTypes.includes(image.mimetype)) {
      throw new BadRequestException(
        'The file must be an image in JPEG, PNG, GIF, or WEBP format',
      );
    }

    try {
      const imageUrl = await this.cloudflareService.updateImage(
        image,
        existingFileName,
      );
      return {
        statusCode: HttpStatus.OK,
        message: 'Image updated successfully',
        data: imageUrl,
      };
    } catch (error) {
      this.logger.error(`Error updating image: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Error updating image');
    }
  }

  /**
   * Crea una nueva habitación con imágenes
   */
  async createWithImages(
    createRoomDto: CreateRoomDto,
    images: Express.Multer.File[],
    user: UserData,
  ): Promise<
    BaseApiResponse<Room & { images: Array<{ id: string; url: string }> }>
  > {
    try {
      const roomResponse = await this.create(createRoomDto, user);

      if (!images?.length) {
        return {
          ...roomResponse,
          data: { ...roomResponse.data, images: [] },
        };
      }

      const imagePromises = images.map(async (image) => {
        try {
          const imageResponse = await this.uploadImage(image);
          const imageData: CreateImageRoomData = {
            room: roomResponse.data.id,
            imageUrl: imageResponse.data,
            isMain: false, // Por defecto, no es la imagen principal
          };
          // Si es la primera imagen, marcarla como principal
          if (images.indexOf(image) === 0) {
            imageData.isMain = true;
          }
          await this.roomsRepository.createImageRoom(imageData);
        } catch (imageError) {
          this.logger.error(`Error procesando imagen: ${imageError.message}`);
        }
      });

      await Promise.all(imagePromises);

      // Obtener las imágenes con sus IDs
      const imagesData = await this.roomsRepository.findImagesByRoomId(
        roomResponse.data.id,
      );

      return {
        ...roomResponse,
        data: { ...roomResponse.data, images: imagesData },
      };
    } catch (error) {
      this.errorHandler.handleError(error, 'creating');
      throw error;
    }
  }

  /**
   * Actualiza una habitación con sus imágenes
   */
  async updateWithImages(
    id: string,
    user: UserData,
    updateRoomDto: UpdateRoomDto,
    newImages?: Express.Multer.File[],
    imageUpdates?: { imageId: string; file: Express.Multer.File }[],
  ): Promise<
    BaseApiResponse<Room & { images: Array<{ id: string; url: string }> }>
  > {
    try {
      // Actualizamos la habitación
      const roomResponse = await this.update(id, updateRoomDto, user);

      // Caso 1: Actualizar imágenes existentes
      if (imageUpdates?.length) {
        for (const update of imageUpdates) {
          try {
            // Obtenemos la imagen existente para obtener su URL
            const existingImage = await this.roomsRepository.findImageById(
              update.imageId,
            );
            if (!existingImage) {
              this.logger.warn(`Imagen con ID ${update.imageId} no encontrada`);
              continue;
            }

            // Obtenemos el nombre del archivo de la URL existente
            const existingFileName = existingImage.imageUrl.split('/').pop();

            // Actualizamos la imagen en Cloudflare
            const imageResponse = await this.updateImage(
              update.file,
              existingFileName,
            );

            // Actualizamos la URL en la base de datos
            await this.roomsRepository.updateImageUrl(
              update.imageId,
              imageResponse.data,
            );
          } catch (error) {
            this.logger.error(
              `Error actualizando imagen ${update.imageId}: ${error.message}`,
            );
          }
        }
      }

      // Caso 2: Agregar nuevas imágenes
      if (newImages?.length) {
        const existingImages =
          await this.roomsRepository.findImagesByRoomId(id);
        const hasMainImage = existingImages.some((img) => img.isMain);

        const imagePromises = newImages.map(async (image, index) => {
          try {
            const imageResponse = await this.uploadImage(image);
            const imageData: CreateImageRoomData = {
              room: roomResponse.data.id,
              imageUrl: imageResponse.data,
              isMain: !hasMainImage && index === 0, // Es principal solo si no hay otra imagen principal y es la primera
            };
            await this.roomsRepository.createImageRoom(imageData);
          } catch (imageError) {
            this.logger.error(
              `Error procesando nueva imagen: ${imageError.message}`,
            );
          }
        });

        await Promise.all(imagePromises);
      }

      // Siempre obtenemos todas las imágenes actualizadas para incluirlas en la respuesta
      const imagesData = await this.roomsRepository.findImagesByRoomId(
        roomResponse.data.id,
      );

      // Retornamos la respuesta con las imágenes actualizadas
      return {
        success: true,
        message: 'Habitación actualizada exitosamente',
        data: {
          ...roomResponse.data,
          images: imagesData, // Incluye todas las imágenes, sean nuevas, actualizadas o sin cambios
        },
      };
    } catch (error) {
      this.logger.error(`Error en updateWithImages: ${error.message}`);
      this.errorHandler.handleError(error, 'updating');
      throw error;
    }
  }

  /**
   * Busca una habitación por su ID incluyendo sus imágenes
   */
  async findOneWithImages(id: string): Promise<
    Room & {
      images: Array<{ id: string; url: string }>;
    }
  > {
    try {
      // Obtenemos la habitación
      const room = await this.findById(id);

      // Obtenemos las imágenes asociadas
      const imagesData = await this.roomsRepository.findImagesByRoomId(id);

      return {
        ...room,
        images: imagesData,
      };
    } catch (error) {
      this.logger.error(`Error en findOneWithImages: ${error.message}`);
      this.errorHandler.handleError(error, 'getting');
      throw error;
    }
  }
}
