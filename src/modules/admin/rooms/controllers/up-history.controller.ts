import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { UpdateHistoryService } from '../services/up-history.service';
import { Auth, GetUser } from '@login/login/admin/auth/decorators';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiParam,
  ApiOkResponse,
  ApiNotFoundResponse,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { UserData } from '@login/login/interfaces';
import {
  CreateUpdateHistoryDto,
  UpdateUpdateHistoryDto,
  DeleteUpdateHistoryDto,
} from '../dto';
import { UpdateHistory } from '../entities/up-history.entity';
import { BaseApiResponse } from 'src/dto/BaseApiResponse.dto';
import { FilesInterceptor } from '@nestjs/platform-express';
import { FormatDataInterceptor } from './format-data.interceptor';
import { FileFieldsInterceptor } from '@nestjs/platform-express';

/**
 * Controlador REST para gestionar actualizaciones de historias médicas.
 * Expone endpoints para operaciones CRUD sobre actualizaciones.
 */
@ApiTags('Update Medical history')
@ApiBadRequestResponse({
  description:
    'Bad Request - Error en la validación de datos o solicitud incorrecta',
})
@ApiUnauthorizedResponse({
  description: 'Unauthorized - No autorizado para realizar esta operación',
})
@Controller({ path: 'update-history', version: '1' })
@Auth()
export class UpdateHistoryController {
  constructor(private readonly updateHistoryService: UpdateHistoryService) {}

  /**
   * Crea una nueva actualización de historia médica
   */
  @Post()
  @ApiOperation({ summary: 'Crear nueva actualización de historia médica' })
  @ApiResponse({
    status: 201,
    description: 'Actualización de historia médica creada exitosamente',
    type: BaseApiResponse<UpdateHistory>,
  })
  @ApiBadRequestResponse({
    description: 'Datos de entrada inválidos o actualización ya existe',
  })
  create(
    @Body() createUpdateHistoryDto: CreateUpdateHistoryDto,
    @GetUser() user: UserData,
  ): Promise<BaseApiResponse<UpdateHistory>> {
    return this.updateHistoryService.create(createUpdateHistoryDto, user);
  }

  /**
   * Obtiene todas las actualizaciones de historias médicas
   */
  @Get()
  @ApiOperation({
    summary: 'Obtener todas las actualizaciones de historias médicas',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de todas las actualizaciones de historias médicas',
    type: [UpdateHistory],
  })
  findAll(): Promise<UpdateHistory[]> {
    return this.updateHistoryService.findAll();
  }

  /**
   * Obtiene una actualización de historia médica por su ID
   */
  @Get(':id')
  @ApiOperation({ summary: 'Obtener actualización de historia médica por ID' })
  @ApiParam({ name: 'id', description: 'ID de la actualización' })
  @ApiOkResponse({
    description: 'Actualización de historia médica encontrada',
    type: UpdateHistory,
  })
  @ApiNotFoundResponse({
    description: 'Actualización de historia médica no encontrada',
  })
  findOne(@Param('id') id: string): Promise<UpdateHistory> {
    return this.updateHistoryService.findOne(id);
  }

  /**
   * Actualiza una actualización de historia médica existente
   */
  @Patch(':id')
  @ApiOperation({
    summary: 'Actualizar actualización de historia médica existente',
  })
  @ApiResponse({
    status: 200,
    description: 'Actualización de historia médica actualizada exitosamente',
    type: BaseApiResponse<UpdateHistory>,
  })
  update(
    @Param('id') id: string,
    @Body() updateUpdateHistoryDto: UpdateUpdateHistoryDto,
    @GetUser() user: UserData,
  ): Promise<BaseApiResponse<UpdateHistory>> {
    return this.updateHistoryService.update(id, updateUpdateHistoryDto, user);
  }

  /**
   * Desactiva múltiples actualizaciones de historias médicas
   */
  @Delete('remove/all')
  @ApiOperation({
    summary: 'Desactivar múltiples actualizaciones de historias médicas',
  })
  @ApiResponse({
    status: 200,
    description:
      'Actualizaciones de historias médicas desactivadas exitosamente',
    type: BaseApiResponse<UpdateHistory[]>,
  })
  @ApiBadRequestResponse({
    description: 'IDs inválidos o actualizaciones no existen',
  })
  deleteMany(
    @Body() deleteUpdateHistoryDto: DeleteUpdateHistoryDto,
    @GetUser() user: UserData,
  ): Promise<BaseApiResponse<UpdateHistory[]>> {
    return this.updateHistoryService.deleteMany(deleteUpdateHistoryDto, user);
  }

  /**
   * Reactiva múltiples actualizaciones de historias médicas
   */
  @Patch('reactivate/all')
  @ApiOperation({
    summary: 'Reactivar múltiples actualizaciones de historias médicas',
  })
  @ApiOkResponse({
    description:
      'Actualizaciones de historias médicas reactivadas exitosamente',
    type: BaseApiResponse<UpdateHistory[]>,
  })
  @ApiBadRequestResponse({
    description: 'IDs inválidos o actualizaciones no existen',
  })
  reactivateAll(
    @Body() deleteUpdateHistoryDto: DeleteUpdateHistoryDto,
    @GetUser() user: UserData,
  ): Promise<BaseApiResponse<UpdateHistory[]>> {
    return this.updateHistoryService.reactivateMany(
      deleteUpdateHistoryDto.ids,
      user,
    );
  }

  /**
   * Crea una nueva actualización de historia médica con imágenes
   */
  @Post('create-with-images')
  @ApiOperation({
    summary: 'Crear actualización de historia médica con imágenes',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        patientId: {
          type: 'string',
          example: '123e4567-e89b-12d3-a456-426614174000',
        },
        serviceId: {
          type: 'string',
          example: '123e4567-e89b-12d3-a456-426614174000',
        },
        staffId: {
          type: 'string',
          example: '123e4567-e89b-12d3-a456-426614174000',
        },
        branchId: {
          type: 'string',
          example: '123e4567-e89b-12d3-a456-426614174000',
        },
        medicalHistoryId: {
          type: 'string',
          example: '123e4567-e89b-12d3-a456-426614174000',
        },
        prescription: {
          type: 'boolean',
          example: false,
        },
        prescriptionId: {
          type: 'string',
          example: '123e4567-e89b-12d3-a456-426614174000',
        },
        updateHistory: {
          type: 'object',
          example: {
            diagnostico: 'Gripe común',
            tratamiento: 'Reposo y medicamentos',
            observaciones: 'Seguimiento en 7 días',
          },
        },
        description: {
          type: 'string',
          example: 'Paciente presenta mejoría',
        },
        medicalLeave: {
          type: 'boolean',
          example: false,
        },
        medicalLeaveStartDate: {
          type: 'string',
          format: 'date-time',
          example: '2024-03-16T10:00:00Z',
        },
        medicalLeaveEndDate: {
          type: 'string',
          format: 'date-time',
          example: '2024-03-19T10:00:00Z',
        },
        medicalLeaveDays: {
          type: 'number',
          example: 3,
        },
        leaveDescription: {
          type: 'string',
          example: 'Reposo por 3 días',
        },
        images: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
          description: 'Imágenes de la actualización (opcional)',
        },
      },
      required: [
        'patientId',
        'serviceId',
        'staffId',
        'branchId',
        'medicalHistoryId',
      ],
    },
  })
  @UseInterceptors(FilesInterceptor('images'), FormatDataInterceptor)
  async createWithImages(
    @Body() createUpdateHistoryDto: CreateUpdateHistoryDto,
    @UploadedFiles() images: Express.Multer.File[],
    @GetUser() user: UserData,
  ): Promise<BaseApiResponse<UpdateHistory>> {
    // Log para verificar los datos recibidos
    /*     console.log('Datos recibidos:', createUpdateHistoryDto);
    console.log('Imágenes recibidas:', images);
    console.log('Usuario:', user); */

    return this.updateHistoryService.createWithImages(
      createUpdateHistoryDto,
      images,
      user,
    );
  }

  /**
   * Actualiza una historia médica con sus imágenes
   * @param id ID de la historia médica a actualizar
   * @param updateUpdateHistoryDto Datos de la historia médica a actualizar
   * @param images Imágenes de la historia médica a actualizar
   * @param user Usuario que realiza la actualización
   * @returns Historia médica actualizada con sus imágenes
   */
  @Patch(':id/update-with-images')
  @ApiOperation({ summary: 'Actualizar historia médica con imágenes' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        patientId: {
          type: 'string',
          example: '123e4567-e89b-12d3-a456-426614174000',
        },
        serviceId: {
          type: 'string',
          example: '123e4567-e89b-12d3-a456-426614174000',
        },
        staffId: {
          type: 'string',
          example: '123e4567-e89b-12d3-a456-426614174000',
        },
        branchId: {
          type: 'string',
          example: '123e4567-e89b-12d3-a456-426614174000',
        },
        medicalHistoryId: {
          type: 'string',
          example: '123e4567-e89b-12d3-a456-426614174000',
        },
        prescription: {
          type: 'boolean',
          example: false,
        },
        prescriptionId: {
          type: 'string',
          example: '123e4567-e89b-12d3-a456-426614174000',
        },
        updateHistory: {
          type: 'object',
          example: {
            diagnostico: 'Gripe común actualizado',
            tratamiento: 'Reposo y medicamentos actualizados',
            observaciones: 'Seguimiento en 7 días actualizado',
          },
        },
        description: {
          type: 'string',
          example: 'Paciente presenta mejoría actualizada',
        },
        medicalLeave: {
          type: 'boolean',
          example: false,
        },
        medicalLeaveStartDate: {
          type: 'string',
          format: 'date-time',
          example: '2024-03-16T10:00:00Z',
        },
        medicalLeaveEndDate: {
          type: 'string',
          format: 'date-time',
          example: '2024-03-19T10:00:00Z',
        },
        medicalLeaveDays: {
          type: 'number',
          example: 3,
        },
        leaveDescription: {
          type: 'string',
          example: 'Reposo por 3 días actualizado',
        },
        newImages: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
          description: 'Nuevas imágenes para agregar (opcional)',
        },
        imageUpdates: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              imageId: {
                type: 'string',
                example: '123e4567-e89b-12d3-a456-426614174000',
              },
              file: {
                type: 'string',
                format: 'binary',
              },
            },
          },
          description: 'Imágenes existentes a actualizar (opcional)',
        },
      },
    },
  })
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'newImages', maxCount: 10 },
      { name: 'imageUpdates', maxCount: 10 },
    ]),
    FormatDataInterceptor,
  )
  async updateWithImages(
    @Param('id') id: string,
    @Body() updateUpdateHistoryDto: UpdateUpdateHistoryDto,
    @UploadedFiles()
    files: {
      newImages?: Express.Multer.File[];
      imageUpdates?: Express.Multer.File[];
    },
    @Body('imageUpdates') imageUpdateData: string,
    @GetUser() user: UserData,
  ): Promise<
    BaseApiResponse<
      UpdateHistory & { images: Array<{ id: string; url: string }> }
    >
  > {
    try {
      // Log para verificar los datos recibidos
      /*      console.log('ID a actualizar:', id);
      console.log('Datos recibidos:', updateUpdateHistoryDto);
      console.log('Archivos recibidos:', files); */

      // Procesamos los datos de actualización de imágenes solo si existen
      let imageUpdates = [];
      if (imageUpdateData && files?.imageUpdates?.length) {
        try {
          const updateData = JSON.parse(imageUpdateData);
          imageUpdates = updateData
            .map((update, index) => ({
              imageId: update.imageId,
              file: files.imageUpdates[index],
            }))
            .filter((update) => update.file && update.imageId);
        } catch (parseError) {
          console.error(parseError);
        }
      }

      // Validamos si hay nuevas imágenes
      const newImages = files?.newImages?.length ? files.newImages : undefined;

      // Solo llamamos al servicio si hay datos para actualizar
      return this.updateHistoryService.updateWithImages(
        id,
        user,
        updateUpdateHistoryDto,
        newImages,
        imageUpdates.length > 0 ? imageUpdates : undefined,
      );
    } catch (error) {
      console.error('Error en updateWithImages:', error);
      throw error;
    }
  }

  /**
   * Obtiene una actualización de historia médica por ID con sus imágenes
   */
  @Get(':id/with-images')
  @ApiOperation({ summary: 'Obtener historia médica con imágenes por ID' })
  @ApiResponse({
    status: 200,
    description: 'Historia médica encontrada con sus imágenes',
    type: UpdateHistory,
  })
  async findOneWithImages(@Param('id') id: string): Promise<
    UpdateHistory & {
      images: Array<{ id: string; url: string }>;
    }
  > {
    return this.updateHistoryService.findOneWithImages(id);
  }
}
