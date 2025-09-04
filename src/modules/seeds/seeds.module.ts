import { Module } from '@nestjs/common';
import { SeedsService } from './seeds.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { BetterAuthAdapter } from '../admin/auth/better-auth.adapter';

@Module({
  providers: [SeedsService, BetterAuthAdapter],
  imports: [PrismaModule],
  exports: [SeedsService],
})
export class SeedsModule {}
