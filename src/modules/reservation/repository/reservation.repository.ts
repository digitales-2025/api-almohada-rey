import { Injectable } from '@nestjs/common';
import { BaseRepository, PrismaService } from 'src/prisma/src';
import { Reservation } from '../entities/reservation.entity';

@Injectable()
export class ReservationRepository extends BaseRepository<Reservation> {
  constructor(prisma: PrismaService) {
    super(prisma, 'reservation');
  }
}
