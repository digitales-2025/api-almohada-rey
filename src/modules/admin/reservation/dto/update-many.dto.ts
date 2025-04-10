import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsUUID } from 'class-validator';

export class UpdateManyDto {
  @ApiProperty({
    description:
      'Array of IDs to be updated, but only for deactivate and reactivate use-cases',
    example: ['507f1f77bcf86cd799439011', '507f1f77bcf86cd799439012'],
    type: [String],
  })
  @IsArray()
  @IsNotEmpty()
  @IsUUID(4, { each: true })
  ids: string[];
}

export class FailedItem {
  @ApiProperty({
    description: 'The ID of the reservation that failed to update',
    example: '507f1f77bcf86cd799439011',
  })
  id: string;

  @ApiProperty({
    description: 'The reason why the update failed',
    example: 'Reservation not found',
  })
  reason: string;
}

export class UpdateManyResponseDto {
  @ApiProperty({
    description: 'Array of IDs that were successfully updated',
    example: ['507f1f77bcf86cd799439011', '507f1f77bcf86cd799439012'],
    type: [String],
  })
  successful: string[];

  @ApiProperty({
    description:
      'Array of objects containing IDs that failed to update and the reasons',
    type: [FailedItem],
  })
  failed: Array<{ id: string; reason: string }>;
}
