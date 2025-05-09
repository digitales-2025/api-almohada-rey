import { PartialType } from '@nestjs/swagger';
import { CreateLandingReservationDto } from './create-reservation.dto';

export class UpdateReservationDto extends PartialType(
  CreateLandingReservationDto,
) {}
