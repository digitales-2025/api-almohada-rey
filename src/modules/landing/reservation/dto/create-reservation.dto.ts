import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateLandingReservationDto {
  @ApiProperty({
    description: 'The CHeck-in date in YYYY-MM-DD format',
    example: '2023-10-01',
  })
  @IsDateString()
  checkInDate: string;

  @ApiProperty({
    description: 'The Check-out date in YYYY-MM-DD format',
    example: '2023-10-10',
  })
  @IsDateString()
  checkOutDate: string;

  @ApiProperty({
    description: 'The number of guests',
    example: 2,
  })
  @IsNumber()
  @IsPositive()
  guestNumber: number;

  @ApiProperty({
    description: 'The ID of the room being reserved',
    example: 'room-123',
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsUUID()
  roomId?: string;
}
