import { ApiProperty } from '@nestjs/swagger';

export class BaseRoomTypeMainImg {
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

  @ApiProperty()
  mainImageUrl: string;

  @ApiProperty({
    type: [String],
  })
  Room: string[];
}

export class LandRoomTypeMainImg extends BaseRoomTypeMainImg {
  @ApiProperty()
  nameEn?: string;

  @ApiProperty()
  descriptionEn: string;

  @ApiProperty()
  bedEn?: string;

  @ApiProperty({
    type: [String],
  })
  Room: string[];
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
