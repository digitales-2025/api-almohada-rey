import { ApiProperty } from '@nestjs/swagger';
import { BaseQueryDto } from '../../dto/base.query.dto';

export class GetOneQueryDto extends BaseQueryDto {
  @ApiProperty({
    description: 'ID of the room type',
    example: '1234567890abcdef',
  })
  id: string;
}
