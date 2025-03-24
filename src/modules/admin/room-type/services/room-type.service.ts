import {
  BadRequestException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { RoomTypeRepository } from '../repositories/room-type.repository';
import { RoomType } from '../entities/room-type.entity';
import { HttpResponse, UserData } from 'src/interfaces';

import { roomTypeErrorMessages } from '../errors/errors-room-type';
import {
  CreateRoomTypeDto,
  UpdateRoomTypeDto,
  DeleteRoomTypeDto,
} from '../dto';
import {
  CreateRoomTypeUseCase,
  UpdateRoomTypeUseCase,
  DeleteRoomTypesUseCase,
  ReactivateRoomTypeUseCase,
} from '../use-cases';

import { CloudflareService } from 'src/cloudflare/cloudflare.service';
import { CreateImageRoomTypeData } from '../repositories/room-type.repository';
import { BaseApiResponse } from 'src/utils/base-response/BaseApiResponse.dto';
import { BaseErrorHandler } from 'src/utils/error-handlers/service-error.handler';
import { validateArray, validateChanges } from 'src/prisma/src/utils';

@Injectable()
export class RoomTypeService {
  private readonly logger = new Logger(RoomTypeService.name);
  private readonly errorHandler: BaseErrorHandler;

  constructor(
    private readonly roomTypeRepository: RoomTypeRepository,
    private readonly createRoomTypeUseCase: CreateRoomTypeUseCase,
    private readonly updateRoomTypeUseCase: UpdateRoomTypeUseCase,
    private readonly deleteRoomTypesUseCase: DeleteRoomTypesUseCase,
    private readonly reactivateRoomTypeUseCase: ReactivateRoomTypeUseCase,
    private readonly cloudflareService: CloudflareService,
  ) {
    this.errorHandler = new BaseErrorHandler(
      this.logger,
      'RoomType',
      roomTypeErrorMessages,
    );
  }

  /**
   * Crea un nuevo tipo de habitación
   */
  async create(
    createRoomTypeDto: CreateRoomTypeDto,
    user: UserData,
  ): Promise<BaseApiResponse<RoomType>> {
    try {
      // Verificar si existe un tipo de habitación similar
      const existingRoomTypes = await this.roomTypeRepository.findMany({
        where: {
          guests: createRoomTypeDto.guests,
          area: createRoomTypeDto.area,
          floorType: createRoomTypeDto.floorType,
          price: createRoomTypeDto.price,
        },
      });

      if (existingRoomTypes && existingRoomTypes.length > 0) {
        throw new BadRequestException(roomTypeErrorMessages.alreadyExists);
      }

      return await this.createRoomTypeUseCase.execute(createRoomTypeDto, user);
    } catch (error) {
      this.errorHandler.handleError(error, 'creating');
      throw error;
    }
  }

  /**
   * Actualiza un tipo de habitación existente
   */
  async update(
    id: string,
    updateRoomTypeDto: UpdateRoomTypeDto,
    user: UserData,
  ): Promise<BaseApiResponse<RoomType>> {
    try {
      const currentRoomType = await this.findById(id);

      if (!validateChanges(updateRoomTypeDto, currentRoomType)) {
        return {
          success: true,
          message: 'No se detectaron cambios en el tipo de habitación',
          data: currentRoomType,
        };
      }

      return await this.updateRoomTypeUseCase.execute(
        id,
        updateRoomTypeDto,
        user,
      );
    } catch (error) {
      this.errorHandler.handleError(error, 'updating');
      throw error;
    }
  }

  /**
   * Busca un tipo de habitación por su ID
   */
  async findOne(id: string): Promise<RoomType> {
    try {
      return this.findById(id);
    } catch (error) {
      this.errorHandler.handleError(error, 'getting');
      throw error;
    }
  }

  /**
   * Obtiene todos los tipos de habitaciones con sus imágenes
   */
  async findAll(): Promise<
    Array<RoomType & { images: Array<{ id: string; url: string }> }>
  > {
    try {
      // 1. Obtener todos los tipos de habitaciones
      const roomTypes = await this.roomTypeRepository.findMany();

      // 2. Para cada tipo de habitación, obtener sus imágenes
      const roomTypesWithImages = await Promise.all(
        roomTypes.map(async (roomType) => {
          const images = await this.roomTypeRepository.findImagesByRoomTypeId(
            roomType.id,
          );
          return {
            ...roomType,
            images,
          };
        }),
      );

      return roomTypesWithImages;
    } catch (error) {
      this.errorHandler.handleError(error, 'getting');
      throw error;
    }
  }

  /**
   * Busca un tipo de habitación por su ID
   */
  async findById(id: string): Promise<RoomType> {
    const roomType = await this.roomTypeRepository.findById(id);
    if (!roomType) {
      throw new BadRequestException(roomTypeErrorMessages.notFound);
    }
    return roomType;
  }

  /**
   * Desactiva múltiples tipos de habitaciones
   */
  async deleteMany(
    deleteRoomTypeDto: DeleteRoomTypeDto,
    user: UserData,
  ): Promise<BaseApiResponse<RoomType[]>> {
    try {
      validateArray(deleteRoomTypeDto.ids, 'IDs de tipos de habitaciones');

      // Verificar que ningún tipo de habitación esté en uso
      for (const id of deleteRoomTypeDto.ids) {
        const roomType = await this.roomTypeRepository.findById(id);
        if (!roomType) {
          throw new BadRequestException(
            `Tipo de habitación con ID ${id} no encontrado`,
          );
        }

        // Aquí podrías verificar si hay habitaciones usando este tipo
        // Por ahora omitimos la validación ya que no tenemos esa relación implementada
      }

      return await this.deleteRoomTypesUseCase.execute(deleteRoomTypeDto, user);
    } catch (error) {
      this.errorHandler.handleError(error, 'deactivating');
      throw error;
    }
  }

  /**
   * Reactiva múltiples tipos de habitaciones
   */
  async reactivateMany(
    ids: string[],
    user: UserData,
  ): Promise<BaseApiResponse<RoomType[]>> {
    try {
      validateArray(ids, 'IDs de tipos de habitaciones');
      return await this.reactivateRoomTypeUseCase.execute(ids, user);
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
      throw new BadRequestException('Imagen no proporcionada');
    }

    if (Array.isArray(image)) {
      throw new BadRequestException('Solo se puede subir un archivo a la vez');
    }

    const validMimeTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
    ];
    if (!validMimeTypes.includes(image.mimetype)) {
      throw new BadRequestException(
        'El archivo debe ser una imagen en formato JPEG, PNG, GIF o WEBP',
      );
    }

    try {
      const imageUrl = await this.cloudflareService.uploadImage(image);
      return {
        statusCode: HttpStatus.CREATED,
        message: 'Imagen subida exitosamente',
        data: imageUrl,
      };
    } catch (error) {
      this.logger.error(`Error subiendo imagen: ${error.message}`, error.stack);
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
      throw new BadRequestException('Imagen no proporcionada');
    }

    if (Array.isArray(image)) {
      throw new BadRequestException('Solo se puede subir un archivo a la vez');
    }

    const validMimeTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
    ];
    if (!validMimeTypes.includes(image.mimetype)) {
      throw new BadRequestException(
        'El archivo debe ser una imagen en formato JPEG, PNG, GIF o WEBP',
      );
    }

    try {
      const imageUrl = await this.cloudflareService.updateImage(
        image,
        existingFileName,
      );
      return {
        statusCode: HttpStatus.OK,
        message: 'Imagen actualizada exitosamente',
        data: imageUrl,
      };
    } catch (error) {
      this.logger.error(
        `Error actualizando imagen: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Error actualizando la imagen');
    }
  }

  /**
   * Crea un nuevo tipo de habitación con imágenes
   */
  async createWithImages(
    createRoomTypeDto: CreateRoomTypeDto,
    images: Express.Multer.File[],
    user: UserData,
  ): Promise<
    BaseApiResponse<RoomType & { images: Array<{ id: string; url: string }> }>
  > {
    try {
      // Validación: exactamente 5 imágenes
      if (!images || images.length !== 5) {
        throw new BadRequestException(
          'Se requieren exactamente 5 imágenes para crear un tipo de habitación. Por favor, cargue 5 imágenes.',
        );
      }

      const roomTypeResponse = await this.create(createRoomTypeDto, user);

      const imagePromises = images.map(async (image, index) => {
        try {
          const imageResponse = await this.uploadImage(image);
          const imageData: CreateImageRoomTypeData = {
            room: roomTypeResponse.data.id,
            imageUrl: imageResponse.data,
            isMain: index === 0, // La primera imagen será la principal
          };
          await this.roomTypeRepository.createImageRoomType(imageData);
        } catch (imageError) {
          this.logger.error(`Error procesando imagen: ${imageError.message}`);
        }
      });

      await Promise.all(imagePromises);

      // Obtener las imágenes con sus IDs
      const imagesData = await this.roomTypeRepository.findImagesByRoomTypeId(
        roomTypeResponse.data.id,
      );

      return {
        ...roomTypeResponse,
        data: { ...roomTypeResponse.data, images: imagesData },
      };
    } catch (error) {
      this.errorHandler.handleError(error, 'creating');
      throw error;
    }
  }

  /**
   * Actualiza un tipo de habitación con una imagen específica
   */
  async updateWithImage(
    id: string,
    user: UserData,
    updateRoomTypeDto: UpdateRoomTypeDto,
    newImage: Express.Multer.File | null,
    imageUpdate: {
      imageId: string;
      url: string;
      isMain?: boolean;
    } | null,
  ): Promise<
    BaseApiResponse<
      RoomType & { images: Array<{ id: string; url: string; isMain: boolean }> }
    >
  > {
    try {
      // 1. Obtener el tipo de habitación actual
      const roomType = await this.findById(id);
      const existingImages =
        await this.roomTypeRepository.findImagesByRoomTypeId(id);

      // 2. Actualizar la información básica del tipo de habitación (si se proporcionó)
      let roomTypeResponse = { success: true, message: '', data: roomType };
      if (Object.keys(updateRoomTypeDto).length > 0) {
        roomTypeResponse = await this.update(id, updateRoomTypeDto, user);
      }

      // 3. Actualizar imagen existente si se proporcionó imageUpdate
      if (imageUpdate) {
        // Verificar que la imagen exista
        const existingImage = await this.roomTypeRepository.findImageById(
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
          await this.roomTypeRepository.updateImageUrl(
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
            await this.roomTypeRepository.resetMainImages(id);
          }
          await this.roomTypeRepository.updateImageMain(
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
            'El tipo de habitación ya tiene el máximo de 5 imágenes permitidas. Debe actualizar una existente.',
          );
        }

        // Subir nueva imagen
        const imageResponse = await this.uploadImage(newImage);

        // Verificar si ya existe una imagen principal
        const hasMainImage = existingImages.some((img) => img.isMain);

        // Crear registro de la nueva imagen
        const imageData: CreateImageRoomTypeData = {
          room: id,
          imageUrl: imageResponse.data,
          isMain: !hasMainImage, // Es principal solo si no hay otra imagen principal
        };
        await this.roomTypeRepository.createImageRoomType(imageData);
      }

      // 5. Obtener imágenes actualizadas para incluirlas en la respuesta
      const updatedImagesData =
        await this.roomTypeRepository.findImagesByRoomTypeId(id);

      // 6. Retornar respuesta
      return {
        success: true,
        message: 'Tipo de habitación actualizado exitosamente',
        data: {
          ...roomTypeResponse.data,
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
   * Busca un tipo de habitación por su ID incluyendo sus imágenes
   */
  async findOneWithImages(id: string): Promise<
    RoomType & {
      images: Array<{ id: string; url: string }>;
    }
  > {
    try {
      // Obtenemos el tipo de habitación
      const roomType = await this.findById(id);

      // Obtenemos las imágenes asociadas
      const imagesData =
        await this.roomTypeRepository.findImagesByRoomTypeId(id);

      return {
        ...roomType,
        images: imagesData,
      };
    } catch (error) {
      this.logger.error(`Error en findOneWithImages: ${error.message}`);
      this.errorHandler.handleError(error, 'getting');
      throw error;
    }
  }
}
