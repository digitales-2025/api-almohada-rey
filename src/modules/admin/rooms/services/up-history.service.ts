import {
  BadRequestException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { UpdateHistoryRepository } from '../repositories/up-history.repository';
import { UpdateHistory } from '../entities/up-history.entity';
import { HttpResponse, UserData } from '@login/login/interfaces';
import { validateArray, validateChanges } from '@prisma/prisma/utils';
import { BaseErrorHandler } from 'src/common/error-handlers/service-error.handler';
import { upHistoryErrorMessages } from '../errors/errors-up-history';
import {
  CreateUpdateHistoryDto,
  UpdateUpdateHistoryDto,
  DeleteUpdateHistoryDto,
} from '../dto';
import {
  CreateUpdateHistoryUseCase,
  UpdateUpdateHistoryUseCase,
  DeleteUpdateHistoriesUseCase,
  ReactivateUpdateHistoryUseCase,
} from '../use-cases';
import { BaseApiResponse } from 'src/dto/BaseApiResponse.dto';
import { CloudflareService } from 'src/cloudflare/cloudflare.service';
import { CreateImagePatientData } from '../repositories/up-history.repository';

// Constantes para nombres de tablas
const TABLE_NAMES = {
  SERVICE: 'service',
  STAFF: 'staff',
  BRANCH: 'branch',
  MEDICAL_HISTORY: 'medicalHistory',
} as const;

@Injectable()
export class UpdateHistoryService {
  private readonly logger = new Logger(UpdateHistoryService.name);
  private readonly errorHandler: BaseErrorHandler;

  constructor(
    private readonly updateHistoryRepository: UpdateHistoryRepository,
    private readonly createUpdateHistoryUseCase: CreateUpdateHistoryUseCase,
    private readonly updateUpdateHistoryUseCase: UpdateUpdateHistoryUseCase,
    private readonly deleteUpdateHistoriesUseCase: DeleteUpdateHistoriesUseCase,
    private readonly reactivateUpdateHistoryUseCase: ReactivateUpdateHistoryUseCase,
    private readonly cloudflareService: CloudflareService,
  ) {
    this.errorHandler = new BaseErrorHandler(
      this.logger,
      'UpdateHistory',
      upHistoryErrorMessages,
    );
  }

  /**
   * Valida las referencias a otras tablas
   */
  private async validateReferences(
    dto: CreateUpdateHistoryDto | UpdateUpdateHistoryDto,
  ) {
    // Validar Servicio
    const serviceExists = await this.updateHistoryRepository.findByIdValidate(
      TABLE_NAMES.SERVICE,
      dto.serviceId,
    );
    if (!serviceExists) {
      throw new BadRequestException('Servicio no encontrado');
    }

    // Validar Personal
    const staffExists = await this.updateHistoryRepository.findByIdValidate(
      TABLE_NAMES.STAFF,
      dto.staffId,
    );
    if (!staffExists) {
      throw new BadRequestException('Personal no encontrado');
    }

    // Validar Sucursal
    const branchExists = await this.updateHistoryRepository.findByIdValidate(
      TABLE_NAMES.BRANCH,
      dto.branchId,
    );
    if (!branchExists) {
      throw new BadRequestException('Sucursal no encontrada');
    }

    // Validar HistoriaMedica
    const medicalHistoryExists =
      await this.updateHistoryRepository.findByIdValidate(
        TABLE_NAMES.MEDICAL_HISTORY,
        dto.medicalHistoryId,
      );
    if (!medicalHistoryExists) {
      throw new BadRequestException('Historia médica no encontrada');
    }
  }

  /**
   * Crea una nueva actualización de historia médica
   */
  async create(
    createUpdateHistoryDto: CreateUpdateHistoryDto,
    user: UserData,
  ): Promise<BaseApiResponse<UpdateHistory>> {
    try {
      await this.validateReferences(createUpdateHistoryDto);
      return await this.createUpdateHistoryUseCase.execute(
        createUpdateHistoryDto,
        user,
      );
    } catch (error) {
      this.errorHandler.handleError(error, 'creating');
      throw error;
    }
  }

  /**
   * Actualiza una historia médica existente
   */
  async update(
    id: string,
    updateUpdateHistoryDto: UpdateUpdateHistoryDto,
    user: UserData,
  ): Promise<BaseApiResponse<UpdateHistory>> {
    try {
      const currentUpdateHistory = await this.findById(id);

      if (!validateChanges(updateUpdateHistoryDto, currentUpdateHistory)) {
        return {
          success: true,
          message:
            'No se detectaron cambios en la actualización de historia médica',
          data: currentUpdateHistory,
        };
      }

      await this.validateReferences(updateUpdateHistoryDto);
      return await this.updateUpdateHistoryUseCase.execute(
        id,
        updateUpdateHistoryDto,
        user,
      );
    } catch (error) {
      this.errorHandler.handleError(error, 'updating');
      throw error;
    }
  }

  /**
   * Busca una actualización de historia médica por su ID
   */
  async findOne(id: string): Promise<UpdateHistory> {
    try {
      return this.findById(id);
    } catch (error) {
      this.errorHandler.handleError(error, 'getting');
      throw error;
    }
  }

  /**
   * Obtiene todas las actualizaciones de historias médicas
   */
  async findAll(): Promise<UpdateHistory[]> {
    try {
      return this.updateHistoryRepository.findMany();
    } catch (error) {
      this.errorHandler.handleError(error, 'getting');
      throw error;
    }
  }

  /**
   * Busca una actualización de historia médica por su ID
   */
  async findById(id: string): Promise<UpdateHistory> {
    const updateHistory = await this.updateHistoryRepository.findById(id);
    if (!updateHistory) {
      throw new BadRequestException(
        'Actualización de historia médica no encontrada',
      );
    }
    return updateHistory;
  }

  /**
   * Desactiva múltiples actualizaciones de historias médicas
   */
  async deleteMany(
    deleteUpdateHistoryDto: DeleteUpdateHistoryDto,
    user: UserData,
  ): Promise<BaseApiResponse<UpdateHistory[]>> {
    try {
      validateArray(
        deleteUpdateHistoryDto.ids,
        'IDs de actualizaciones de historias médicas',
      );
      return await this.deleteUpdateHistoriesUseCase.execute(
        deleteUpdateHistoryDto,
        user,
      );
    } catch (error) {
      this.errorHandler.handleError(error, 'deactivating');
      throw error;
    }
  }

  /**
   * Reactiva múltiples actualizaciones de historias médicas
   */
  async reactivateMany(
    ids: string[],
    user: UserData,
  ): Promise<BaseApiResponse<UpdateHistory[]>> {
    try {
      validateArray(ids, 'IDs de actualizaciones de historias médicas');
      return await this.reactivateUpdateHistoryUseCase.execute(ids, user);
    } catch (error) {
      this.errorHandler.handleError(error, 'reactivating');
      throw error;
    }
  }

  /**
   * Sube una imagen y devuelve la URL
   * @param image - Imagen a subir
   * @returns Respuesta HTTP con la URL de la imagen subida
   * @throws {BadRequestException} Si no se proporciona una imagen, o si se proporciona un array de archivos
   * @throws {InternalServerErrorException} Si ocurre un error al subir la imagen
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
   * @param image Imagen a actualizar
   * @param existingFileName Nombre del archivo existente
   * @returns URL de la imagen actualizada
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
   * Crea una nueva actualización de historia médica con imágenes
   * @param createUpdateHistoryDto - DTO con los datos para crear la actualización
   * @param images - Array de archivos de imágenes
   * @param user - Datos del usuario que realiza la creación
   */
  async createWithImages(
    createUpdateHistoryDto: CreateUpdateHistoryDto,
    images: Express.Multer.File[],
    user: UserData,
  ): Promise<
    BaseApiResponse<
      UpdateHistory & { images: Array<{ id: string; url: string }> }
    >
  > {
    try {
      const historyResponse = await this.create(createUpdateHistoryDto, user);

      if (!images?.length) {
        return {
          ...historyResponse,
          data: { ...historyResponse.data, images: [] },
        };
      }

      const imagePromises = images.map(async (image) => {
        try {
          const imageResponse = await this.uploadImage(image);
          const imageData: CreateImagePatientData = {
            patientId: historyResponse.data.medicalHistoryId,
            imageUrl: imageResponse.data,
            updateHistoryId: historyResponse.data.id,
            phothography: true,
          };
          await this.updateHistoryRepository.createImagePatient(imageData);
        } catch (imageError) {
          this.logger.error(`Error procesando imagen: ${imageError.message}`);
        }
      });

      await Promise.all(imagePromises);

      // Obtener las imágenes con sus IDs
      const imagesData =
        await this.updateHistoryRepository.findImagesByHistoryId(
          historyResponse.data.id,
        );

      return {
        ...historyResponse,
        data: { ...historyResponse.data, images: imagesData },
      };
    } catch (error) {
      this.errorHandler.handleError(error, 'creating');
      throw error;
    }
  }

  /**
   * Actualiza una historia médica con sus imágenes
   */
  async updateWithImages(
    id: string,
    user: UserData,
    updateUpdateHistoryDto: UpdateUpdateHistoryDto,
    newImages?: Express.Multer.File[],
    imageUpdates?: { imageId: string; file: Express.Multer.File }[],
  ): Promise<
    BaseApiResponse<
      UpdateHistory & { images: Array<{ id: string; url: string }> }
    >
  > {
    try {
      // Actualizamos la historia médica
      const historyResponse = await this.update(
        id,
        updateUpdateHistoryDto,
        user,
      );

      // Caso 1: Actualizar imágenes existentes
      if (imageUpdates?.length) {
        for (const update of imageUpdates) {
          try {
            // Obtenemos la imagen existente para obtener su URL
            const existingImage =
              await this.updateHistoryRepository.findImageById(update.imageId);
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
            await this.updateHistoryRepository.updateImageUrl(
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
        const imagePromises = newImages.map(async (image) => {
          try {
            const imageResponse = await this.uploadImage(image);
            const imageData: CreateImagePatientData = {
              patientId: historyResponse.data.medicalHistoryId,
              imageUrl: imageResponse.data,
              updateHistoryId: historyResponse.data.id,
              phothography: true,
            };
            await this.updateHistoryRepository.createImagePatient(imageData);
          } catch (imageError) {
            this.logger.error(
              `Error procesando nueva imagen: ${imageError.message}`,
            );
          }
        });

        await Promise.all(imagePromises);
      }

      // Caso 3: Sin cambios en imágenes o después de procesar cambios
      // Siempre obtenemos todas las imágenes actualizadas para incluirlas en la respuesta
      const imagesData =
        await this.updateHistoryRepository.findImagesByHistoryId(
          historyResponse.data.id,
        );

      // Retornamos la respuesta con las imágenes actualizadas
      return {
        success: true,
        message: 'Historia médica actualizada exitosamente',
        data: {
          ...historyResponse.data,
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
   * Busca una actualización de historia médica por su ID incluyendo sus imágenes
   */
  async findOneWithImages(id: string): Promise<
    UpdateHistory & {
      images: Array<{ id: string; url: string }>;
    }
  > {
    try {
      // Obtenemos la historia médica
      const updateHistory = await this.findById(id);

      // Obtenemos las imágenes asociadas
      const imagesData =
        await this.updateHistoryRepository.findImagesByHistoryId(id);

      return {
        ...updateHistory,
        images: imagesData,
      };
    } catch (error) {
      this.logger.error(`Error en findOneWithImages: ${error.message}`);
      this.errorHandler.handleError(error, 'getting');
      throw error;
    }
  }
}
