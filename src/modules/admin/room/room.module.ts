import { Module } from '@nestjs/common';

import { AuditModule } from '../audit/audit.module';
import { RoomController } from './controllers/room.controller';
import { RoomService } from './services/room.service';
import {
  CreateRoomUseCase,
  UpdateRoomUseCase,
  DeleteRoomsUseCase,
  ReactivateRoomUseCase,
} from './use-cases';
import { RoomRepository } from './repositories/room.repository';
import { RoomTypeModule } from '../room-type/room-type.module';

@Module({
  controllers: [RoomController],
  imports: [AuditModule, RoomTypeModule],
  providers: [
    // use cases para habitaciones
    RoomRepository,
    RoomService,
    CreateRoomUseCase,
    UpdateRoomUseCase,
    DeleteRoomsUseCase,
    ReactivateRoomUseCase,
  ],
  exports: [RoomService, RoomRepository],
})
export class RoomModule {}
