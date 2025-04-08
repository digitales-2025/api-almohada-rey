import { ApiProperty } from '@nestjs/swagger';

export class ReservationStatusAvailableActions {
  @ApiProperty({
    description: 'Whether the reservation can be confirmed',
    example: true,
  })
  canConfirm: boolean;

  @ApiProperty({
    description: 'Whether the reservation can be checked in',
    example: false,
  })
  canCheckIn: boolean;

  @ApiProperty({
    description: 'Whether the reservation can be checked out',
    example: false,
  })
  canCheckOut: boolean;

  @ApiProperty({
    description: 'Whether the reservation can be cancelled',
    example: true,
  })
  canCancel: boolean;

  @ApiProperty({
    description: 'Whether the reservation can be modified',
    example: true,
  })
  canModify: boolean;

  @ApiProperty({
    description: 'Whether the reservation can be reactivated',
    example: false,
  })
  canReactivate: boolean;
}
