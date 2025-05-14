import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString } from 'class-validator';
import { BaseQueryDto } from '../../dto/base.query.dto';

export class CheckAvailableRoomsQueryDto extends BaseQueryDto {
  @ApiProperty({
    description: 'Check-in date in YYYY-MM-DD format',
    example: '2023-10-01',
    required: true,
  })
  @IsString()
  checkInDate: string;

  @ApiProperty({
    description: 'Check-out date in YYYY-MM-DD format',
    example: '2023-10-05',
    required: true,
  })
  @IsString()
  checkOutDate: string;

  @ApiProperty({
    description: 'Number of guests',
    example: 2,
    required: true,
  })
  @IsNumber()
  guestNumber: number;

  @ApiProperty({
    description: 'Room ID',
    example: '60b0f5a5e6c3a74b4c8c1234',
    required: false,
  })
  @IsString()
  @IsOptional()
  roomId?: string;
}
