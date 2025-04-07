import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags, ApiParam } from '@nestjs/swagger';
import { LandRoomTypeService } from '../service/land-room-type.service';
import {
  LandRoomTypeMainImg,
  LandRoomTypeAllImg,
} from '../entities/land-room-type.entity';

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

  /**
   * Obtiene un tipo de habitación por ID con todas sus imágenes
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Obtener un tipo de habitación por ID con todas sus imágenes',
    description:
      'Devuelve información detallada de un tipo de habitación específico junto con todas sus imágenes',
  })
  @ApiParam({
    name: 'id',
    description: 'ID del tipo de habitación a buscar',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Tipo de habitación encontrado con todas sus imágenes',
    type: LandRoomTypeAllImg,
  })
  @ApiResponse({
    status: 404,
    description: 'Tipo de habitación no encontrado',
  })
  async findRoomTypeById(@Param('id') id: string): Promise<LandRoomTypeAllImg> {
    const roomType = await this.landRoomTypeService.findRoomTypeById(id);
    if (!roomType) {
      throw new NotFoundException('Tipo de habitación no encontrado');
    }
    return roomType;
  }
}
