import { Controller, Post } from '@nestjs/common';
import { AdicionalesService } from './adicionales.service';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Auth } from '../auth/decorators';

/**
 * Controlador REST para crear el servicio "Adicionales".
 */
@ApiTags('Admin Adicionales')
@ApiBadRequestResponse({
  description:
    'Bad Request - Error en la validación de datos o solicitud incorrecta',
})
@ApiUnauthorizedResponse({
  description: 'Unauthorized - No autorizado para realizar esta operación',
})
@Controller({ path: 'adicionales', version: '1' })
@Auth()
export class AdicionalesController {
  constructor(private readonly adicionalesService: AdicionalesService) {}

  /**
   * Crea el servicio "Adicionales"
   */
  @Post()
  @ApiOperation({ summary: 'Crear servicio Adicionales' })
  @ApiResponse({
    status: 201,
    description: 'Servicio Adicionales creado exitosamente',
  })
  @ApiResponse({
    status: 400,
    description: 'Error en la solicitud',
  })
  create() {
    return this.adicionalesService.createAdicionalesService();
  }
}
