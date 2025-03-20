import { ApiProperty } from '@nestjs/swagger';
import { RoomTypes, FloorTypes, RoomStatus } from '../dto';

export class Room {
  @ApiProperty()
  id: string;

  @ApiProperty()
  number: number;

  @ApiProperty()
  guests: number;

  @ApiProperty({ enum: RoomTypes })
  type: RoomTypes;

  @ApiProperty()
  price: number;

  @ApiProperty({ enum: RoomStatus })
  status: RoomStatus;

  @ApiProperty()
  tv: string;

  @ApiProperty({ enum: FloorTypes })
  floorType: FloorTypes;

  @ApiProperty()
  description: string;

  @ApiProperty()
  area: number;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;
}
