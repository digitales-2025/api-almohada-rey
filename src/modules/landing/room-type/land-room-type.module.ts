import { Module } from '@nestjs/common';
import { LandRoomTypeController } from './controller/land-room-type.controller';
import { LandRoomTypeService } from './service/land-room-type.service';
import { LandRoomTypeRepository } from './repository/land-room-type.repository';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [LandRoomTypeController],
  providers: [LandRoomTypeService, LandRoomTypeRepository],
  exports: [LandRoomTypeService],
})
export class LandRoomTypeModule {}
