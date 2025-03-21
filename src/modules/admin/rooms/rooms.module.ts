import { Module } from '@nestjs/common';

import { CloudflareModule } from 'src/cloudflare/cloudflare.module';
import { RoomsController } from './controllers/rooms.controller';
import { RoomsService } from './services/rooms.service';
import { AuditModule } from '../audit/audit.module';
import {
  CreateRoomUseCase,
  DeleteRoomsUseCase,
  ReactivateRoomUseCase,
  UpdateRoomUseCase,
} from './use-cases';
import { RoomsRepository } from './repositories/rooms.repository';

@Module({
  controllers: [RoomsController],
  imports: [AuditModule, CloudflareModule],
  providers: [
    // use cases rooms
    RoomsRepository,
    RoomsService,
    CreateRoomUseCase,
    UpdateRoomUseCase,
    DeleteRoomsUseCase,
    ReactivateRoomUseCase,
  ],
  exports: [RoomsService, RoomsRepository],
})
export class RoomsModule {}
