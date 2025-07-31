import { Module } from '@nestjs/common';

import { AuditModule } from '../audit/audit.module';
import { CleaningChecklistController } from './controllers/room-clean.controller';
import { CleaningChecklistService } from './services/room-clean.service';
import {
  CreateCleaningChecklistUseCase,
  UpdateCleaningChecklistUseCase,
} from './use-cases';
import { CleaningChecklistRepository } from './repositories/room-clean.repository';
import { RoomModule } from '../room/room.module';

@Module({
  controllers: [CleaningChecklistController],
  imports: [AuditModule, RoomModule], // Importamos RoomModule para validar habitaciones
  providers: [
    // Repositorio
    CleaningChecklistRepository,

    // Servicio principal
    CleaningChecklistService,

    // Casos de uso
    CreateCleaningChecklistUseCase,
    UpdateCleaningChecklistUseCase,
  ],
  exports: [CleaningChecklistService, CleaningChecklistRepository],
})
export class RoomCleanModule {}
