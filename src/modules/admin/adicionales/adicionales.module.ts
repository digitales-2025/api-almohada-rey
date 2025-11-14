import { Module } from '@nestjs/common';
import { AdicionalesController } from './adicionales.controller';
import { AdicionalesService } from './adicionales.service';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  controllers: [AdicionalesController],
  providers: [AdicionalesService],
  imports: [PrismaModule],
})
export class AdicionalesModule {}
