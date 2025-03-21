import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsUUID,
  IsDate,
  IsEnum,
  IsOptional,
  IsString,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ReservationStatus } from '../entities/reservation-status.enum';
import { GuestDto } from './companion-guest.dto';
import { Optional } from '@nestjs/common';

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
    description: 'Date when the reservation was made',
    type: Date,
  })
  @IsNotEmpty()
  @IsDate()
  @Type(() => Date)
  reservationDate: Date;

  @ApiProperty({ description: 'Check-in date', type: Date })
  @IsNotEmpty()
  @IsDate()
  @Type(() => Date)
  checkInDate: Date;

  @ApiProperty({ description: 'Check-out date', type: Date })
  @IsNotEmpty()
  @IsDate()
  @Type(() => Date)
  checkOutDate: Date;

  @ApiProperty({ description: 'Reservation status', enum: ReservationStatus })
  @IsNotEmpty()
  @IsEnum(ReservationStatus)
  status: ReservationStatus;

  @ApiPropertyOptional({
    description: 'Guest companions information',
    type: [GuestDto],
  })
  @Optional()
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
