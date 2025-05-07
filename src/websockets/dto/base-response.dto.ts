import { ApiProperty } from '@nestjs/swagger';

export abstract class BaseWsResponse<T> {
  @ApiProperty()
  client: string;

  @ApiProperty()
  message: string;

  @ApiProperty({
    type: Object,
  })
  data?: T;

  @ApiProperty()
  error?: boolean;
}
