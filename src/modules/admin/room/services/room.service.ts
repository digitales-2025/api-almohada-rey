import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { RoomRepository } from '../repositories/room.repository';
import { Room } from '../entities/room.entity';
import { CreateRoomDto, UpdateRoomDto, DeleteRoomDto } from '../dto';
import { UserData } from 'src/interfaces';
import { validateArray, validateChanges } from 'src/prisma/src/utils';
import { BaseErrorHandler } from 'src/utils/error-handlers/service-error.handler';
import { roomErrorMessages } from '../errors/errors-room';
import {
  CreateRoomUseCase,
  UpdateRoomUseCase,
  DeleteRoomsUseCase,
  ReactivateRoomUseCase,
} from '../use-cases';
import { BaseApiResponse } from 'src/utils/base-response/BaseApiResponse.dto';
import { RoomTypeService } from '../../room-type/services/room-type.service';
import { StatusRoomDto } from '../dto/status.dto';
import { AuditActionType } from '@prisma/client';
import { AuditService } from '../../audit/audit.service';

@Injectable()
export class RoomService {
  private readonly logger = new Logger(RoomService.name);
  private readonly errorHandler: BaseErrorHandler;

  constructor(
    private readonly roomRepository: RoomRepository,
    private readonly createRoomUseCase: CreateRoomUseCase,
    private readonly updateRoomUseCase: UpdateRoomUseCase,
    private readonly deleteRoomsUseCase: DeleteRoomsUseCase,
    private readonly reactivateRoomUseCase: ReactivateRoomUseCase,
    private readonly roomTypeService: RoomTypeService,
    private readonly auditService: AuditService,
  ) {
    this.errorHandler = new BaseErrorHandler(
      this.logger,
      'Room',
      roomErrorMessages,
    );
  }

  /**
   * Valida que el tipo de habitación exista
   */
  private async validateRoomTypeExists(typeId: string): Promise<void> {
    try {
      await this.roomTypeService.findOne(typeId);
    } catch {
      throw new BadRequestException(roomErrorMessages.invalidRoomType);
    }
  }

  /**
   * Crea una nueva habitación
   */
  async create(
    createRoomDto: CreateRoomDto,
    user: UserData,
  ): Promise<BaseApiResponse<Room>> {
    try {
      // Verificar si ya existe una habitación con ese número
      const existingRoom = await this.roomRepository.findByNumber(
        createRoomDto.number,
      );
      if (existingRoom) {
        throw new BadRequestException(roomErrorMessages.alreadyExists);
      }

      // Validar que el tipo de habitación exista
      await this.validateRoomTypeExists(createRoomDto.roomTypeId);

      // Crear la habitación
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

      // Verificar si hay cambios
      if (!validateChanges(updateRoomDto, currentRoom)) {
        return {
          success: true,
          message: 'No se detectaron cambios en la habitación',
          data: currentRoom,
        };
      }

      // Si se está actualizando el tipo, validar que exista
      if (updateRoomDto.roomTypeId) {
        await this.validateRoomTypeExists(updateRoomDto.roomTypeId);
      }

      // Si se está actualizando el número, verificar que no exista otra habitación con ese número
      if (updateRoomDto.number && updateRoomDto.number !== currentRoom.number) {
        const existingRoom = await this.roomRepository.findByNumber(
          updateRoomDto.number,
        );
        if (existingRoom && existingRoom.id !== id) {
          throw new BadRequestException(roomErrorMessages.alreadyExists);
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
      return this.roomRepository.findMany();
    } catch (error) {
      this.errorHandler.handleError(error, 'getting');
      throw error;
    }
  }

  /**
   * Busca una habitación por su ID
   */
  async findById(id: string): Promise<Room> {
    const room = await this.roomRepository.findById(id);
    if (!room) {
      throw new BadRequestException(roomErrorMessages.notFound);
    }
    return room;
  }

  /**
   * Busca una habitación por su número
   */
  async findByNumber(number: number): Promise<Room> {
    const room = await this.roomRepository.findByNumber(number);
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
   * Actualiza el estado de una habitación
   */
  async updateStatus(
    id: string,
    statusRoomDto: StatusRoomDto,
    user: UserData,
  ): Promise<BaseApiResponse<Room>> {
    try {
      // Verificar que la habitación existe
      const room = await this.findById(id);

      // Verificar si se está intentando cambiar al estado CLEANING
      if (statusRoomDto.status === 'CLEANING') {
        throw new BadRequestException(
          'No es posible actualizar al estado a CLEANING desde este proceso. Use el proceso específico de limpieza.',
        );
      }

      // Verificar si el estado es igual al actual
      if (room.status === statusRoomDto.status) {
        return {
          success: true,
          message: `La habitación ya se encuentra en estado ${statusRoomDto.status}`,
          data: room,
        };
      }

      // Actualizar el estado usando el repositorio
      const updatedRoom = await this.roomRepository.updateStatus(
        id,
        statusRoomDto.status,
      );

      // Registrar auditoría
      await this.auditService.create({
        entityId: id,
        entityType: 'room',
        action: AuditActionType.UPDATE_STATUS,
        performedById: user.id,
        createdAt: new Date(),
      });

      return {
        success: true,
        message: `Estado de habitación actualizado a ${statusRoomDto.status} exitosamente`,
        data: updatedRoom,
      };
    } catch (error) {
      throw error;
    }
  }
}
