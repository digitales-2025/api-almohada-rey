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

export class LandImageRoomType {
  @ApiProperty()
  id?: string;

  @ApiProperty()
  url?: string;

  @ApiProperty()
  isMain?: boolean;
}

export class LandRoomTypeAllImg {
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
  bed: string;

  @ApiProperty({ type: [LandImageRoomType] })
  images: LandImageRoomType[];
}
