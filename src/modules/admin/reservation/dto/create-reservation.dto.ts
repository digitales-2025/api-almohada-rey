import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsUUID,
  IsEnum,
  IsOptional,
  IsString,
  IsArray,
  ValidateNested,
  IsDateString,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ReservationStatus as ReservationStatusPrisma } from '@prisma/client';
import { ReservationStatus } from '../entities/reservation-status.enum';
import { GuestDto } from './companion-guest.dto';

export class CompanionsDto {
  @ApiProperty({ description: 'List of guests', type: [GuestDto] })
  @IsNotEmpty()
  @Type(() => GuestDto)
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  guests: GuestDto[];
}

export class CreateReservationDto {
  @ApiProperty({ description: 'Customer ID' })
  @IsNotEmpty()
  @IsUUID()
  customerId: string;

  @ApiProperty({ description: 'Room ID' })
  @IsNotEmpty()
  @IsUUID()
  roomId: string;

  @ApiProperty({
    description: 'User ID of the person who creates the reservation',
  })
  @IsNotEmpty()
  @IsUUID()
  userId: string;

  @ApiProperty({
    description: 'Fecha y hora de fin de check-out',
    type: Date,
    example: '2024-12-25T15:00:00Z',
  })
  @IsDateString()
  @IsNotEmpty()
  reservationDate: string;

  @ApiProperty({
    description: 'Fecha y hora de fin de check-in',
    type: Date,
    example: '2024-12-25T15:00:00Z',
  })
  @IsDateString()
  @IsNotEmpty()
  checkInDate: string;

  @ApiProperty({
    description: 'Fecha y hora de fin de check-out',
    type: Date,
    example: '2024-12-25T15:00:00Z',
  })
  @IsDateString()
  @IsNotEmpty()
  checkOutDate: string;

  @ApiProperty({ description: 'Reservation status', enum: ReservationStatus })
  @IsNotEmpty()
  @IsEnum(ReservationStatus)
  status: ReservationStatusPrisma;

  @ApiProperty({
    description: 'Origin place from the customer',
  })
  @IsNotEmpty()
  @IsString()
  origin: string;

  @ApiProperty({
    description: 'Reason for reservation',
    type: String,
  })
  @IsNotEmpty()
  @IsString()
  @Transform(({ value }) => value?.toLowerCase())
  reason: string;

  @ApiPropertyOptional({
    description: 'Guest companions information',
    type: [GuestDto],
  })
  @IsOptional()
  @IsArray()
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  @ValidateNested({ each: true })
  @Type(() => GuestDto)
  guests?: GuestDto[];

  @ApiPropertyOptional({
    description: 'Additional observations',
    type: 'string',
  })
  @IsOptional()
  @IsString()
  observations?: string;
}
