import {
  BadRequestException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { AuditService } from 'src/modules/admin/audit/audit.service';
import { HttpResponse, UserData } from 'src/interfaces';
import { handleException } from 'src/utils';
import { AuditActionType } from '@prisma/client';
import { CreateCustomerReservationHistoryDto } from './dto/create-customer-reservation-history.dto';
import { UpdateCustomerReservationHistoryDto } from './dto/update-customer-reservation-history.dto';
import { DeleteCustomerReservationHistoryDto } from './dto/delete-customer-reservation-history.dto';
import { CustomerReservationHistoryResponseDto } from './dto/customer-reservation-history-response.dto';

@Injectable()
export class CustomerReservationHistoryService {
  private readonly logger = new Logger(CustomerReservationHistoryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Crear un nuevo registro de historial de reservas
   * @param createDto Datos del historial a crear
   * @param user Usuario que realiza la acción
   * @returns Historial creado
   */
  async create(
    createDto: CreateCustomerReservationHistoryDto,
    user: UserData,
  ): Promise<HttpResponse<CustomerReservationHistoryResponseDto>> {
    const { customerId, date } = createDto;

    try {
      // Verificar que el cliente existe
      const customer = await this.prisma.customer.findUnique({
        where: { id: customerId },
        select: { id: true, name: true },
      });

      if (!customer) {
        throw new NotFoundException('Cliente no encontrado');
      }

      // Verificar que no existe un registro con la misma fecha para el mismo cliente
      const existingHistory =
        await this.prisma.customerReservationHistory.findFirst({
          where: {
            customerId,
            date,
          },
        });

      if (existingHistory) {
        throw new BadRequestException(
          'Ya existe un registro de historial para esta fecha y cliente',
        );
      }

      // Crear el historial y registrar la auditoría
      const newHistory = await this.prisma.$transaction(async () => {
        const history = await this.prisma.customerReservationHistory.create({
          data: {
            customerId,
            date,
          },
          select: {
            id: true,
            customerId: true,
            date: true,
            createdAt: true,
            updatedAt: true,
            customer: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        });

        // Registrar la auditoría
        await this.audit.create({
          entityId: history.id,
          entityType: 'customerReservationHistory',
          action: AuditActionType.CREATE,
          performedById: user.id,
          createdAt: new Date(),
        });

        return history;
      });

      return {
        statusCode: HttpStatus.CREATED,
        message: 'Historial de reservas creado exitosamente',
        data: newHistory,
      };
    } catch (error) {
      this.logger.error(
        `Error creating customer reservation history: ${error.message}`,
        error.stack,
      );

      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      handleException(error, 'Error creating customer reservation history');
    }
  }

  /**
   * Obtener todos los registros de historial por ID de cliente
   * @param customerId ID del cliente
   * @param user Usuario que realiza la consulta
   * @returns Lista de registros de historial
   */
  async findAllByCustomerId(
    customerId: string,
  ): Promise<CustomerReservationHistoryResponseDto[]> {
    try {
      // Verificar que el cliente existe
      const customer = await this.prisma.customer.findUnique({
        where: { id: customerId },
        select: { id: true, name: true },
      });

      if (!customer) {
        throw new NotFoundException('Cliente no encontrado');
      }

      const histories = await this.prisma.customerReservationHistory.findMany({
        where: {
          customerId,
        },
        select: {
          id: true,
          customerId: true,
          date: true,
          createdAt: true,
          updatedAt: true,
          customer: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          date: 'desc',
        },
      });

      return histories;
    } catch (error) {
      this.logger.error(
        `Error finding customer reservation histories: ${error.message}`,
        error.stack,
      );

      if (error instanceof NotFoundException) {
        throw error;
      }

      handleException(error, 'Error finding customer reservation histories');
    }
  }

  /**
   * Actualizar un registro de historial de reservas
   * @param id ID del registro a actualizar
   * @param updateDto Datos a actualizar
   * @param user Usuario que realiza la acción
   * @returns Historial actualizado
   */
  async update(
    id: string,
    updateDto: UpdateCustomerReservationHistoryDto,
    user: UserData,
  ): Promise<HttpResponse<CustomerReservationHistoryResponseDto>> {
    const { date } = updateDto;

    try {
      // Verificar que el registro existe
      const existingHistory =
        await this.prisma.customerReservationHistory.findUnique({
          where: { id },
          select: {
            id: true,
            customerId: true,
            date: true,
            createdAt: true,
            updatedAt: true,
            customer: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        });

      if (!existingHistory) {
        throw new NotFoundException('Registro de historial no encontrado');
      }

      // Si se está actualizando la fecha, verificar que no exista duplicado
      if (date && date !== existingHistory.date) {
        const duplicateHistory =
          await this.prisma.customerReservationHistory.findFirst({
            where: {
              customerId: existingHistory.customerId,
              date,
              id: { not: id }, // Excluir el registro actual
            },
          });

        if (duplicateHistory) {
          throw new BadRequestException(
            'Ya existe un registro de historial para esta fecha y cliente',
          );
        }
      }

      // Actualizar el historial y registrar la auditoría
      const updatedHistory = await this.prisma.$transaction(async () => {
        const history = await this.prisma.customerReservationHistory.update({
          where: { id },
          data: {
            ...(date && { date }),
          },
          select: {
            id: true,
            customerId: true,
            date: true,
            createdAt: true,
            updatedAt: true,
            customer: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        });

        // Registrar la auditoría
        await this.audit.create({
          entityId: history.id,
          entityType: 'customerReservationHistory',
          action: AuditActionType.UPDATE,
          performedById: user.id,
          createdAt: new Date(),
        });

        return history;
      });

      return {
        statusCode: HttpStatus.OK,
        message: 'Historial de reservas actualizado exitosamente',
        data: updatedHistory,
      };
    } catch (error) {
      this.logger.error(
        `Error updating customer reservation history: ${error.message}`,
        error.stack,
      );

      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      handleException(error, 'Error updating customer reservation history');
    }
  }

  /**
   * Eliminar registros de historial de reservas
   * @param deleteDto Datos de eliminación
   * @param user Usuario que realiza la acción
   * @returns Respuesta de eliminación
   */
  async removeAll(
    deleteDto: DeleteCustomerReservationHistoryDto,
    user: UserData,
  ): Promise<Omit<HttpResponse, 'data'>> {
    const { ids } = deleteDto;

    try {
      // Verificar que todos los registros existen
      const existingHistories =
        await this.prisma.customerReservationHistory.findMany({
          where: {
            id: { in: ids },
          },
          select: { id: true },
        });

      if (existingHistories.length !== ids.length) {
        throw new BadRequestException(
          'Algunos registros de historial no existen',
        );
      }

      // Eliminar los registros y registrar la auditoría
      await this.prisma.$transaction(async () => {
        await this.prisma.customerReservationHistory.deleteMany({
          where: {
            id: { in: ids },
          },
        });

        // Registrar auditoría para cada registro eliminado
        for (const id of ids) {
          await this.audit.create({
            entityId: id,
            entityType: 'customerReservationHistory',
            action: AuditActionType.DELETE,
            performedById: user.id,
            createdAt: new Date(),
          });
        }
      });

      return {
        statusCode: HttpStatus.OK,
        message: `${ids.length} registros de historial eliminados exitosamente`,
      };
    } catch (error) {
      this.logger.error(
        `Error deleting customer reservation histories: ${error.message}`,
        error.stack,
      );

      if (error instanceof BadRequestException) {
        throw error;
      }

      handleException(error, 'Error deleting customer reservation histories');
    }
  }
}
