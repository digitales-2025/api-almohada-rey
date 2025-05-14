import { ApiProperty } from '@nestjs/swagger';

export abstract class BaseWsRequest {
  @ApiProperty()
  clientId: string;
}
