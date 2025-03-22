import {
  BadRequestException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { RoomsRepository } from '../repositories/room-type.repository';
import { Room } from '../entities/room-type.entity';
import { HttpResponse, UserData } from 'src/interfaces';

import { roomErrorMessages } from '../errors/errors-room-type';
import { CreateRoomDto, UpdateRoomDto, DeleteRoomDto } from '../dto';
import {
  CreateRoomUseCase,
  UpdateRoomUseCase,
  DeleteRoomsUseCase,
  ReactivateRoomUseCase,
} from '../use-cases';

import { CloudflareService } from 'src/cloudflare/cloudflare.service';
import { CreateImageRoomData } from '../repositories/room-type.repository';
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
   * Obtiene todas las habitaciones con sus imágenes
   */
  async findAll(): Promise<
    Array<Room & { images: Array<{ id: string; url: string }> }>
  > {
    try {
      // 1. Obtener todas las habitaciones
      const rooms = await this.roomsRepository.findMany();

      // 2. Para cada habitación, obtener sus imágenes
      const roomsWithImages = await Promise.all(
        rooms.map(async (room) => {
          const images = await this.roomsRepository.findImagesByRoomId(room.id);
          return {
            ...room,
            images,
          };
        }),
      );

      return roomsWithImages;
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
      // Validación: exactamente 5 imágenes
      if (!images || images.length !== 5) {
        throw new BadRequestException(
          'Se requieren exactamente 5 imágenes para crear una habitación. Por favor, cargue 5 imágenes.',
        );
      }

      const roomResponse = await this.create(createRoomDto, user);

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
          // Podríamos considerar eliminar la habitación si falla la carga de imágenes
          // o al menos marcar esta situación específica en los logs
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
   * Actualiza una habitación con una imagen específica
   */
  async updateWithImage(
    id: string,
    user: UserData,
    updateRoomDto: UpdateRoomDto,
    newImage: Express.Multer.File | null,
    imageUpdate: {
      imageId: string;
      url: string;
      isMain?: boolean;
    } | null,
  ): Promise<
    BaseApiResponse<
      Room & { images: Array<{ id: string; url: string; isMain: boolean }> }
    >
  > {
    try {
      // 1. Obtener la habitación actual
      const room = await this.findById(id);
      const existingImages = await this.roomsRepository.findImagesByRoomId(id);

      // 2. Actualizar la información básica de la habitación (si se proporcionó)
      let roomResponse = { success: true, message: '', data: room };
      if (Object.keys(updateRoomDto).length > 0) {
        roomResponse = await this.update(id, updateRoomDto, user);
      }

      // 3. Actualizar imagen existente si se proporcionó imageUpdate
      if (imageUpdate) {
        // Verificar que la imagen exista
        const existingImage = await this.roomsRepository.findImageById(
          imageUpdate.imageId,
        );
        if (!existingImage) {
          throw new BadRequestException(
            `No se encontró una imagen con el ID ${imageUpdate.imageId}`,
          );
        }

        // Si se proporcionó una nueva imagen, actualizar la existente
        if (newImage) {
          // Obtener el nombre del archivo de la URL existente
          const existingFileName = existingImage.imageUrl.split('/').pop();

          // Actualizar la imagen en Cloudflare
          const imageResponse = await this.updateImage(
            newImage,
            existingFileName,
          );

          // Actualizar la URL en la base de datos
          await this.roomsRepository.updateImageUrl(
            imageUpdate.imageId,
            imageResponse.data,
          );
        }

        // Actualizar si es principal (solo si se especificó)
        if (
          imageUpdate.isMain !== undefined &&
          imageUpdate.isMain !== existingImage.isMain
        ) {
          if (imageUpdate.isMain) {
            // Si se está marcando como principal, desmarcamos todas las demás
            await this.roomsRepository.resetMainImages(id);
          }
          await this.roomsRepository.updateImageMain(
            imageUpdate.imageId,
            imageUpdate.isMain,
          );
        }
      }
      // 4. Si hay una nueva imagen pero no hay imageUpdate, significa que es una imagen nueva
      else if (newImage) {
        // Verificar que no se exceda el límite de 5 imágenes
        if (existingImages.length >= 5) {
          throw new BadRequestException(
            'La habitación ya tiene el máximo de 5 imágenes permitidas. Debe actualizar una existente.',
          );
        }

        // Subir nueva imagen
        const imageResponse = await this.uploadImage(newImage);

        // Verificar si ya existe una imagen principal
        const hasMainImage = existingImages.some((img) => img.isMain);

        // Crear registro de la nueva imagen
        const imageData: CreateImageRoomData = {
          room: id,
          imageUrl: imageResponse.data,
          isMain: !hasMainImage, // Es principal solo si no hay otra imagen principal
        };
        await this.roomsRepository.createImageRoom(imageData);
      }

      // 5. Obtener imágenes actualizadas para incluirlas en la respuesta
      const updatedImagesData =
        await this.roomsRepository.findImagesByRoomId(id);

      // 6. Retornar respuesta
      return {
        success: true,
        message: 'Habitación actualizada exitosamente',
        data: {
          ...roomResponse.data,
          images: updatedImagesData,
        },
      };
    } catch (error) {
      this.logger.error(`Error en updateWithImage: ${error.message}`);
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
