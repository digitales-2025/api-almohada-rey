import { Module } from '@nestjs/common';

import { CloudflareModule } from 'src/cloudflare/cloudflare.module';
import { RoomTypeController } from './controllers/room-type.controller';
import { RoomTypeService } from './services/room-type.service';
import { AuditModule } from '../audit/audit.module';
import {
  CreateRoomTypeUseCase,
  DeleteRoomTypesUseCase,
  ReactivateRoomTypeUseCase,
  UpdateRoomTypeUseCase,
} from './use-cases';
import { RoomTypeRepository } from './repositories/room-type.repository';

@Module({
  controllers: [RoomTypeController],
  imports: [AuditModule, CloudflareModule],
  providers: [
    // use cases para tipos de habitación
    RoomTypeRepository,
    RoomTypeService,
    CreateRoomTypeUseCase,
    UpdateRoomTypeUseCase,
    DeleteRoomTypesUseCase,
    ReactivateRoomTypeUseCase,
  ],
  exports: [RoomTypeService, RoomTypeRepository],
})
export class RoomTypeModule {}
