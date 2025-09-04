import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { RucController } from './ruc.controller';
import { RucService } from './ruc.service';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [HttpModule, PrismaModule],
  controllers: [RucController],
  providers: [RucService],
  exports: [RucService],
})
export class RucModule {}
