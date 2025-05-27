import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { RoomRepository } from '../repositories/room.repository';
import {
  DetailedRoomWithImages,
  FindAllRoom,
  Room,
} from '../entities/room.entity';
import { CreateRoomDto, UpdateRoomDto, DeleteRoomDto } from '../dto';
import { UserData, UserPayload } from 'src/interfaces';
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
import { PaginatedResponse } from 'src/utils/paginated-response/PaginatedResponse.dto';
import { UpdateAmenitiesRoomDto } from '../dto/update-amenities-room.dto';

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
  /**
   * Obtiene todas las habitaciones con información detallada
   * @param user Datos del usuario que realiza la solicitud
   */
  async findAll(user: UserPayload): Promise<FindAllRoom[]> {
    try {
      // Definir filtro según el rol del usuario
      const filter = user.isSuperAdmin ? {} : { isActive: true };

      // Realizar consulta con relaciones y filtros
      const rooms = await this.roomRepository.findMany<FindAllRoom>({
        where: filter,
        include: {
          RoomTypes: {
            include: {
              ImageRoomType: {
                select: {
                  id: true,
                  imageUrl: true,
                  isMain: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'asc',
        },
      });

      // Mapear los resultados y obtener solo la imagen principal como objeto único
      return rooms.map((room) => {
        // Valor por defecto para la imagen principal
        let mainImage = { id: '', imageUrl: '', isMain: false };

        // Verificar si ImageRoomType es un array antes de usar find()
        if (Array.isArray(room.RoomTypes.ImageRoomType)) {
          const foundImage = room.RoomTypes.ImageRoomType.find(
            (img) => img.isMain === true,
          );
          if (foundImage) {
            // Solo extraer los campos necesarios
            mainImage = {
              id: foundImage.id,
              imageUrl: foundImage.imageUrl,
              isMain: foundImage.isMain,
            };
          }
        }

        return {
          id: room.id,
          number: room.number,
          status: room.status,
          tv: room.tv,
          area: room.area,
          floorType: room.floorType,
          isActive: room.isActive,
          RoomTypes: {
            id: room.RoomTypes.id,
            name: room.RoomTypes.name,
            ImageRoomType: mainImage, // Ahora es un objeto único con solo los campos necesarios
          },
          // Incluir las propiedades de limpieza
          trashBin: room.trashBin,
          towel: room.towel,
          toiletPaper: room.toiletPaper,
          showerSoap: room.showerSoap,
          handSoap: room.handSoap,
          lamp: room.lamp,
        };
      });
    } catch (error) {
      this.errorHandler.handleError(error, 'getting');
      throw error;
    }
  }

  /**
   * Obtiene todas las habitaciones de forma paginada con información detallada
   * @param user Datos del usuario que realiza la solicitud
   * @param options Opciones de paginación (página y tamaño de página)
   * @returns Lista paginada de habitaciones con información detallada
   */
  async findAllPaginated(
    user: UserPayload,
    options: { page: number; pageSize: number },
  ): Promise<PaginatedResponse<FindAllRoom>> {
    try {
      const { page, pageSize } = options;

      // Definir filtro según el rol del usuario
      const filter = user.isSuperAdmin ? {} : { isActive: true };

      // Usar el método paginado del repositorio base
      const paginatedResult =
        await this.roomRepository.findManyPaginated<FindAllRoom>(
          { page, pageSize },
          {
            where: filter,
            include: {
              RoomTypes: {
                include: {
                  ImageRoomType: {
                    select: {
                      id: true,
                      imageUrl: true,
                      isMain: true,
                    },
                  },
                },
              },
            },
            orderBy: { createdAt: 'asc' },
          },
        );

      // Mapear los resultados y obtener solo la imagen principal como objeto único
      const roomsWithMainImage = paginatedResult.data.map((room) => {
        // Valor por defecto para la imagen principal
        let mainImage = { id: '', imageUrl: '', isMain: false };

        // Verificar si ImageRoomType es un array antes de usar find()
        if (Array.isArray(room.RoomTypes.ImageRoomType)) {
          const foundImage = room.RoomTypes.ImageRoomType.find(
            (img) => img.isMain === true,
          );
          if (foundImage) {
            // Solo extraer los campos necesarios
            mainImage = {
              id: foundImage.id,
              imageUrl: foundImage.imageUrl,
              isMain: foundImage.isMain,
            };
          }
        }

        return {
          id: room.id,
          number: room.number,
          status: room.status,
          tv: room.tv,
          area: room.area,
          floorType: room.floorType,
          isActive: room.isActive,
          RoomTypes: {
            id: room.RoomTypes.id,
            name: room.RoomTypes.name,
            ImageRoomType: mainImage, // Ahora es un objeto único con solo los campos necesarios
          },
          // Incluir las propiedades de limpieza
          trashBin: room.trashBin,
          towel: room.towel,
          toiletPaper: room.toiletPaper,
          showerSoap: room.showerSoap,
          handSoap: room.handSoap,
          lamp: room.lamp,
        };
      });

      // Devolver los resultados con el mismo formato de respuesta paginada
      return {
        data: roomsWithMainImage,
        meta: paginatedResult.meta,
      };
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

  async findByIdDetailed(id: string): Promise<DetailedRoomWithImages> {
    const room = await this.roomRepository.findOne<DetailedRoomWithImages>({
      where: { id },
      include: {
        RoomTypes: {
          include: {
            ImageRoomType: true,
          },
        },
      },
    });
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

  async updateStatusCleaning(id: string): Promise<BaseApiResponse<Room>> {
    try {
      // Verificar que la habitación existe
      const room = await this.findById(id);

      // Verificar si el estado es igual al actual
      if (room.status === 'CLEANING') {
        return {
          success: true,
          message: `La habitación ya se encuentra en estado CLEANING`,
          data: room,
        };
      }

      // Actualizar el estado usando el repositorio
      const updatedRoom = await this.roomRepository.updateStatus(
        id,
        'CLEANING',
      );

      return {
        success: true,
        message: `Estado de habitación actualizado a CLEANING exitosamente`,
        data: updatedRoom,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Actualiza las amenities de una habitación
   * @param id Id de la habitación a actualizar
   * @param updateAmenitiesRoomDto Amenities a actualizar
   * @param user Usuario que realiza la actualización
   * @returns Datos de la habitación actualizada
   */
  async updateAmenities(
    id: string,
    updateAmenitiesRoomDto: UpdateAmenitiesRoomDto,
    user: UserData,
  ): Promise<BaseApiResponse<Room>> {
    try {
      const currentRoom = await this.findById(id);

      // Verificar si hay cambios en las amenities
      if (!validateChanges(updateAmenitiesRoomDto, currentRoom)) {
        return {
          success: true,
          message:
            'No se detectaron cambios en las amenidades de la habitación',
          data: currentRoom,
        };
      }

      // Actualizar las amenities
      const updatedAmenities = {
        trashBin: updateAmenitiesRoomDto.trashBin ?? currentRoom.trashBin,
        towel: updateAmenitiesRoomDto.towel ?? currentRoom.towel,
        toiletPaper:
          updateAmenitiesRoomDto.toiletPaper ?? currentRoom.toiletPaper,
        showerSoap: updateAmenitiesRoomDto.showerSoap ?? currentRoom.showerSoap,
        handSoap: updateAmenitiesRoomDto.handSoap ?? currentRoom.handSoap,
        lamp: updateAmenitiesRoomDto.lamp ?? currentRoom.lamp,
      };

      // Determinar el nuevo estado basado en las amenities
      let newStatus = currentRoom.status;
      const allAmenitiesTrue = Object.values(updatedAmenities).every(
        (value) => value === true,
      );
      const hasAnyAmenityFalse = Object.values(updatedAmenities).some(
        (value) => value === false,
      );

      // Solo cambiar el estado si no está en OCCUPIED
      if (currentRoom.status !== 'OCCUPIED') {
        if (allAmenitiesTrue) {
          newStatus = 'AVAILABLE';
        } else if (hasAnyAmenityFalse && currentRoom.status !== 'INCOMPLETE') {
          newStatus = 'INCOMPLETE';
        }
      }

      // Preparar los datos para actualizar
      const updateData = {
        ...updatedAmenities,
        ...(newStatus !== currentRoom.status && { status: newStatus }),
      };

      // Actualizar en la base de datos
      const updatedRoom = await this.roomRepository.update(id, updateData);

      // Registrar auditoría
      await this.auditService.create({
        entityId: id,
        entityType: 'room',
        action: AuditActionType.UPDATE,
        performedById: user.id,
        createdAt: new Date(),
      });

      const statusMessage =
        newStatus !== currentRoom.status
          ? ` y estado actualizado a ${newStatus}`
          : '';

      return {
        success: true,
        message: `Amenidades de la habitación actualizadas exitosamente${statusMessage}`,
        data: updatedRoom,
      };
    } catch (error) {
      this.errorHandler.handleError(error, 'updating');
      throw error;
    }
  }
}
