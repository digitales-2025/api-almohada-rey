import { Injectable } from '@nestjs/common';
import { BaseRepository } from 'src/prisma/src/abstract/base.repository';
import { Reservation } from '../entities/reservation.entity';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class ReservationRepository extends BaseRepository<Reservation> {
  constructor(prisma: PrismaService) {
    super(prisma, 'reservation');
  }
}
