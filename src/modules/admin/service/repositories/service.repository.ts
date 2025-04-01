import { Injectable } from '@nestjs/common';
import { Service } from '../entities/service.entity';
import { BaseRepository, PrismaService } from 'src/prisma/src';

@Injectable()
export class ServiceRepository extends BaseRepository<Service> {
  constructor(prisma: PrismaService) {
    super(prisma, 'service'); // Tabla del esquema de prisma
  }
}
