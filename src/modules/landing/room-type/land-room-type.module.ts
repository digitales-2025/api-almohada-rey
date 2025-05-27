import { Module } from '@nestjs/common';
import { LandRoomTypeController } from './controller/land-room-type.controller';
import { LandRoomTypeService } from './service/land-room-type.service';
import { LandRoomTypeRepository } from './repository/land-room-type.repository';
import { PrismaModule } from 'src/prisma/prisma.module';
import { RoomModule } from 'src/modules/admin/room/room.module';

@Module({
  imports: [PrismaModule, RoomModule],
  controllers: [LandRoomTypeController],
  providers: [LandRoomTypeService, LandRoomTypeRepository],
  exports: [LandRoomTypeService],
})
export class LandRoomTypeModule {}
