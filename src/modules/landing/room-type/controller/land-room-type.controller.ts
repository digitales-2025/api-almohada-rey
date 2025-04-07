import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { LandRoomTypeService } from '../service/land-room-type.service';
import { LandRoomTypeMainImg } from '../entities/land-room-type.entity';

@ApiTags('Landing Room Types')
@Controller({ path: 'landing/room-types', version: '1' })
export class LandRoomTypeController {
  constructor(private readonly landRoomTypeService: LandRoomTypeService) {}

  /**
   * Obtiene todos los tipos de habitaciones activas con información resumida
   */
  @Get()
  @ApiOperation({
    summary: 'Obtener todos los tipos de habitaciones resumidas para landing',
    description:
      'Devuelve tipos de habitaciones activas con imagen principal, nombre, descripción, precio y capacidad',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de tipos de habitaciones resumidas',
    type: [LandRoomTypeMainImg],
  })
  async findAllLandingRoomTypes(): Promise<LandRoomTypeMainImg[]> {
    return this.landRoomTypeService.findAllRoomTypesForLanding();
  }
}
