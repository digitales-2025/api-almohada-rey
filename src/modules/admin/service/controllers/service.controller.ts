import { Controller, Get, Body, Patch, Param } from '@nestjs/common';
import { ServiceService } from '../services/service.service';

import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiParam,
  ApiOkResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
import { UserData } from 'src/interfaces';
import { ServiceUpdateDto } from '../dto';
import { Service } from '../entities/service.entity';
import { BaseApiResponse } from 'src/utils/base-response/BaseApiResponse.dto';
import { Auth, GetUser } from '../../auth/decorators';

/**
 * Controlador REST para gestionar servicios.
 * Expone endpoints para operaciones CRUD sobre servicios.
 */
@ApiTags('Admin Services')
@ApiBadRequestResponse({
  description:
    'Bad Request - Error en la validación de datos o solicitud incorrecta',
})
@ApiUnauthorizedResponse({
  description: 'Unauthorized - No autorizado para realizar esta operación',
})
@Controller({ path: 'services', version: '1' })
@Auth()
export class ServiceController {
  constructor(private readonly serviceService: ServiceService) {}

  /**
   * Obtiene todos los servicios
   */
  @Get()
  @ApiOperation({ summary: 'Obtener todos los servicios' })
  @ApiOkResponse({
    type: [Service],
    description: 'Lista de todos los servicios',
  })
  findAll() {
    return this.serviceService.findAll();
  }

  /**
   * Obtiene un servicio por su ID
   */
  @Get(':id')
  @ApiOperation({ summary: 'Obtener servicio por ID' })
  @ApiParam({ name: 'id', description: 'ID del servicio' })
  @ApiOkResponse({
    description: 'Servicio encontrado',
    type: Service,
  })
  @ApiNotFoundResponse({
    description: 'Servicio no encontrado',
  })
  findOne(@Param('id') id: string): Promise<Service> {
    return this.serviceService.findOne(id);
  }

  /**
   * Actualiza un servicio existente
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar servicio existente' })
  @ApiResponse({
    status: 200,
    description: 'Servicio actualizado exitosamente',
    type: BaseApiResponse,
  })
  update(
    @Param('id') id: string,
    @Body() updateServiceDto: ServiceUpdateDto,
    @GetUser() user: UserData,
  ): Promise<BaseApiResponse<Service>> {
    return this.serviceService.update(id, updateServiceDto, user);
  }
}
