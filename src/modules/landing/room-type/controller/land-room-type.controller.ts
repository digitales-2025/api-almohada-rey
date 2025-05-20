import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiParam,
  ApiExtraModels,
} from '@nestjs/swagger';
import { LandRoomTypeService } from '../service/land-room-type.service';
import {
  LandRoomTypeAllImg,
  BaseRoomTypeMainImg,
} from '../entities/land-room-type.entity';
import { BaseQueryDto } from '../../dto/base.query.dto';
import { DetailedRoomWithImages } from 'src/modules/admin/room/entities/room.entity';
import { defaultLocale, SupportedLocales } from '../../i18n/translations';

@ApiTags('Landing Room Types')
@ApiExtraModels(BaseQueryDto)
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
    type: [BaseRoomTypeMainImg],
  })
  async findAllLandingRoomTypes(
    @Query() queryParams: BaseQueryDto,
  ): Promise<BaseRoomTypeMainImg[]> {
    return this.landRoomTypeService.findAllRoomTypesForLanding(queryParams);
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
  async findRoomTypeById(@Param('id') id: string): Promise<LandRoomTypeAllImg> {
    return this.landRoomTypeService.findRoomTypeById(id);
  }

  @Get('room-detail/:roomId')
  @ApiOperation({ summary: 'Get room details' })
  @ApiResponse({
    status: 200,
    description: 'Room details retrieved successfully',
    type: [DetailedRoomWithImages],
  })
  @ApiResponse({ status: 404, description: 'Room not found' })
  getRoomDetail(
    @Param('roomId') roomId: string,
    @Query('locale') locale: SupportedLocales = defaultLocale,
  ) {
    return this.landRoomTypeService.findRoomById(roomId, locale);
  }
}
