import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ServiceRepository } from '../repositories/service.repository';
import { Service } from '../entities/service.entity';
import { ServiceUpdateDto } from '../dto';
import { UserData } from 'src/interfaces';
import { validateChanges } from 'src/prisma/src/utils';
import { BaseErrorHandler } from 'src/utils/error-handlers/service-error.handler';
import { serviceErrorMessages } from '../errors/errors-service';
import { UpdateServiceUseCase } from '../use-cases';
import { BaseApiResponse } from 'src/utils/base-response/BaseApiResponse.dto';

@Injectable()
export class ServiceService {
  private readonly logger = new Logger(ServiceService.name);
  private readonly errorHandler: BaseErrorHandler;

  constructor(
    private readonly serviceRepository: ServiceRepository,
    private readonly updateServiceUseCase: UpdateServiceUseCase,
  ) {
    this.errorHandler = new BaseErrorHandler(
      this.logger,
      'Service',
      serviceErrorMessages,
    );
  }

  /**
   * Obtiene todos los servicios
   */
  findAll() {
    try {
      return this.serviceRepository.findMany();
    } catch (error) {
      this.errorHandler.handleError(error, 'getting');
      throw error;
    }
  }

  /**
   * Busca un servicio por su ID
   */
  async findOne(id: string): Promise<Service> {
    try {
      return this.findById(id);
    } catch (error) {
      this.errorHandler.handleError(error, 'getting');
      throw error;
    }
  }

  /**
   * Actualiza un servicio existente
   */
  async update(
    id: string,
    updateServiceDto: ServiceUpdateDto,
    user: UserData,
  ): Promise<BaseApiResponse<Service>> {
    try {
      // Verificar si existe otro servicio con el mismo nombre
      if (updateServiceDto.name) {
        const existingServices = await this.serviceRepository.findByName(
          updateServiceDto.name,
        );

        // Buscar si hay algún servicio con el mismo nombre pero ID diferente
        const nameExists = existingServices.some(
          (service) => service.id !== id,
        );

        if (nameExists) {
          throw new BadRequestException(serviceErrorMessages.alreadyExists);
        }
      }

      const currentService = await this.findById(id);

      // Verificar si hay cambios
      if (!validateChanges(updateServiceDto, currentService)) {
        return {
          success: true,
          message: 'No se detectaron cambios en el servicio',
          data: currentService,
        };
      }

      // Delegamos la actualización al caso de uso
      return await this.updateServiceUseCase.execute(
        id,
        updateServiceDto,
        user,
      );
    } catch (error) {
      this.errorHandler.handleError(error, 'updating');
      throw error;
    }
  }

  /**
   * Busca un servicio por su ID
   */
  async findById(id: string): Promise<Service> {
    const service = await this.serviceRepository.findById(id);
    if (!service) {
      throw new BadRequestException(serviceErrorMessages.notFound);
    }
    return service;
  }
}
