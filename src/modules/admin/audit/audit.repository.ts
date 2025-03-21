import { Injectable } from '@nestjs/common';
import { BaseRepository, PrismaService } from 'src/prisma/src';
import { AuditEntity } from './audit.entity';

@Injectable()
export class AuditRepository extends BaseRepository<AuditEntity> {
  constructor(prisma: PrismaService) {
    super(prisma, 'audit');
  }
}
