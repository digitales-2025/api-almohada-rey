import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { CleaningChecklistRepository } from '../repositories/room-clean.repository';
import { CleaningChecklist } from '../entities/room-clean.entity';
import {
  CreateCleaningChecklistDto,
  UpdateCleaningChecklistDto,
  DeleteCleaningChecklistDto,
} from '../dto';
import { UserData } from 'src/interfaces';
import { validateArray, validateChanges } from 'src/prisma/src/utils';
import { BaseErrorHandler } from 'src/utils/error-handlers/service-error.handler';
import { roomCleanErrorMessages } from '../errors/errors-room-clean';
import {
  CreateCleaningChecklistUseCase,
  UpdateCleaningChecklistUseCase,
  DeleteCleaningChecklistUseCase,
  ReactivateCleaningChecklistUseCase,
} from '../use-cases';
import { BaseApiResponse } from 'src/utils/base-response/BaseApiResponse.dto';
import { RoomService } from '../../room/services/room.service';
import { RoomStatus } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class CleaningChecklistService {
  private readonly logger = new Logger(CleaningChecklistService.name);
  private readonly errorHandler: BaseErrorHandler;

  constructor(
    private readonly cleaningRepository: CleaningChecklistRepository,
    private readonly createCleaningUseCase: CreateCleaningChecklistUseCase,
    private readonly updateCleaningUseCase: UpdateCleaningChecklistUseCase,
    private readonly deleteCleaningUseCase: DeleteCleaningChecklistUseCase,
    private readonly reactivateCleaningUseCase: ReactivateCleaningChecklistUseCase,
    private readonly roomService: RoomService,
    private readonly prisma: PrismaService, // Añadir PrismaService
  ) {
    this.errorHandler = new BaseErrorHandler(
      this.logger,
      'CleaningChecklist',
      roomCleanErrorMessages,
    );
  }

  /**
   * Valida que la habitación exista
   */
  private async validateRoomExists(roomId: string): Promise<void> {
    try {
      await this.roomService.findOne(roomId);
    } catch (error) {
      console.log(
        '🚀 ~ CleaningChecklistService ~ validateRoomExists ~ error:',
        error,
      );
      throw new BadRequestException(roomCleanErrorMessages.roomNotFound);
    }
  }

  /**
   * Valida que la habitación esté en estado de limpieza y con todos sus elementos verificados
   * @param roomId ID de la habitación
   */
  private async validateRoomForCleaning(roomId: string): Promise<void> {
    try {
      // Obtener detalles de la habitación usando el repositorio
      const room = await this.cleaningRepository.getRoomDetails(roomId);

      if (!room) {
        throw new BadRequestException(roomCleanErrorMessages.roomNotFound);
      }

      // Verificar que la habitación esté en estado de limpieza
      if (room.status !== RoomStatus.CLEANING) {
        throw new BadRequestException(
          'La habitación debe estar en estado de limpieza para crear un registro',
        );
      }

      // Verificar que todos los elementos estén en true
      const elementsToCheck = [
        { field: 'trashBin', label: 'tacho de basura' },
        { field: 'towel', label: 'toalla' },
        { field: 'toiletPaper', label: 'papel higiénico' },
        { field: 'showerSoap', label: 'jabón de ducha' },
        { field: 'handSoap', label: 'jabón de manos' },
        { field: 'lamp', label: 'lámpara' },
      ];

      const missingItems = elementsToCheck
        .filter((item) => room[item.field] === false)
        .map((item) => item.label);

      if (missingItems.length > 0) {
        throw new BadRequestException(
          `No es posible registrar la limpieza de la habitación. Los siguientes elementos no están verificados: ${missingItems.join(', ')}`,
        );
      }
    } catch (error) {
      this.logger.error(`Error validando habitación: ${error.message}`);
      throw error;
    }
  }

  /**
   * Actualiza el estado de la habitación a disponible
   * @param roomId ID de la habitación
   */
  private async updateRoomToAvailable(roomId: string): Promise<void> {
    await this.cleaningRepository.updateRoomStatus(
      roomId,
      RoomStatus.AVAILABLE,
    );
    this.logger.log(
      `Habitación ${roomId} marcada como disponible después de la limpieza`,
    );
  }

  /**
   * Crea un nuevo registro de limpieza
   */
  async create(
    createCleaningDto: CreateCleaningChecklistDto,
    user: UserData,
  ): Promise<BaseApiResponse<CleaningChecklist>> {
    try {
      // 1. Validar que la habitación exista y cumpla con los requisitos
      await this.validateRoomForCleaning(createCleaningDto.roomId);

      // 2. Verificar si ya existe un registro para esta habitación en la misma fecha
      const existingRecord = await this.cleaningRepository.findByRoomAndDate(
        createCleaningDto.roomId,
        createCleaningDto.date,
      );

      if (existingRecord) {
        throw new BadRequestException(
          roomCleanErrorMessages.duplicateCleaningRecord,
        );
      }

      // 3. Crear el registro de limpieza usando una transacción
      const result = await this.prisma.$transaction(async () => {
        // 3.1 Crear el registro de limpieza
        const newRecord = await this.createCleaningUseCase.execute(
          createCleaningDto,
          user,
        );

        // 3.2 Actualizar el estado de la habitación a disponible
        await this.updateRoomToAvailable(createCleaningDto.roomId);

        return newRecord;
      });

      return result;
    } catch (error) {
      this.errorHandler.handleError(error, 'creating');
      throw error;
    }
  }

  /**
   * Actualiza un registro de limpieza existente
   */
  async update(
    id: string,
    updateCleaningDto: UpdateCleaningChecklistDto,
    user: UserData,
  ): Promise<BaseApiResponse<CleaningChecklist>> {
    try {
      const currentRecord = await this.findById(id);

      // Verificar si hay cambios
      if (!validateChanges(updateCleaningDto, currentRecord)) {
        return {
          success: true,
          message: 'No se detectaron cambios en el registro de limpieza',
          data: currentRecord,
        };
      }

      // Si se está actualizando la habitación, validar que exista
      if (updateCleaningDto.roomId) {
        await this.validateRoomExists(updateCleaningDto.roomId);
      }

      // Si se está actualizando la fecha o habitación, verificar que no exista otro registro similar
      if (
        (updateCleaningDto.date &&
          updateCleaningDto.date !== currentRecord.date) ||
        (updateCleaningDto.roomId &&
          updateCleaningDto.roomId !== currentRecord.roomId)
      ) {
        const newDate = updateCleaningDto.date || currentRecord.date;
        const newRoomId = updateCleaningDto.roomId || currentRecord.roomId;

        const existingRecord = await this.cleaningRepository.findByRoomAndDate(
          newRoomId,
          newDate,
        );

        if (existingRecord && existingRecord.id !== id) {
          throw new BadRequestException(
            roomCleanErrorMessages.duplicateCleaningRecord,
          );
        }
      }

      return await this.updateCleaningUseCase.execute(
        id,
        updateCleaningDto,
        user,
      );
    } catch (error) {
      this.errorHandler.handleError(error, 'updating');
      throw error;
    }
  }

  /**
   * Busca un registro de limpieza por su ID
   */
  async findOne(id: string): Promise<CleaningChecklist> {
    try {
      return this.findById(id);
    } catch (error) {
      this.errorHandler.handleError(error, 'getting');
      throw error;
    }
  }

  /**
   * Obtiene todos los registros de limpieza
   */
  async findAll(): Promise<CleaningChecklist[]> {
    try {
      return this.cleaningRepository.findMany();
    } catch (error) {
      this.errorHandler.handleError(error, 'getting');
      throw error;
    }
  }

  /**
   * Busca registros de limpieza por habitación
   */
  async findByRoom(roomId: string): Promise<CleaningChecklist[]> {
    try {
      // Validar que la habitación exista
      await this.validateRoomExists(roomId);

      return this.cleaningRepository.findByRoom(roomId);
    } catch (error) {
      this.errorHandler.handleError(error, 'getting');
      throw error;
    }
  }

  /**
   * Busca registros de limpieza por fecha
   */
  async findByDate(date: string): Promise<CleaningChecklist[]> {
    try {
      return this.cleaningRepository.findByDate(date);
    } catch (error) {
      this.errorHandler.handleError(error, 'getting');
      throw error;
    }
  }

  /**
   * Busca un registro de limpieza por su ID
   */
  async findById(id: string): Promise<CleaningChecklist> {
    const cleaning = await this.cleaningRepository.findById(id);
    if (!cleaning) {
      throw new BadRequestException(roomCleanErrorMessages.notFound);
    }
    return cleaning;
  }

  /**
   * Desactiva múltiples registros de limpieza
   */
  async deleteMany(
    deleteCleaningDto: DeleteCleaningChecklistDto,
    user: UserData,
  ): Promise<BaseApiResponse<CleaningChecklist[]>> {
    try {
      validateArray(deleteCleaningDto.ids, 'IDs de registros de limpieza');
      return await this.deleteCleaningUseCase.execute(deleteCleaningDto, user);
    } catch (error) {
      this.errorHandler.handleError(error, 'deactivating');
      throw error;
    }
  }

  /**
   * Reactiva múltiples registros de limpieza
   */
  async reactivateMany(
    ids: string[],
    user: UserData,
  ): Promise<BaseApiResponse<CleaningChecklist[]>> {
    try {
      validateArray(ids, 'IDs de registros de limpieza');
      return await this.reactivateCleaningUseCase.execute(ids, user);
    } catch (error) {
      this.errorHandler.handleError(error, 'reactivating');
      throw error;
    }
  }
}
