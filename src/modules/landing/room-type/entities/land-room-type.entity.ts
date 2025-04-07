import { ApiProperty } from '@nestjs/swagger';

export class LandRoomTypeMainImg {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  description: string;

  @ApiProperty()
  price: number;

  @ApiProperty()
  guests: number;

  @ApiProperty()
  mainImageUrl: string;
}
