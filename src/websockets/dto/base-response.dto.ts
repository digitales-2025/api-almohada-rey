import { ApiProperty } from '@nestjs/swagger';

export abstract class BaseWsResponse {
  @ApiProperty({
    required: false,
  })
  clientId?: string;

  @ApiProperty()
  message: string;

  @ApiProperty({
    required: false,
    description: 'Response data',
    // OpenAPI/Swagger does not support generics directly.
    // You must override this property in subclasses with a concrete type.
  })
  data?: unknown;

  @ApiProperty({
    required: false,
  })
  error?: boolean;

  @ApiProperty({
    required: false,
  })
  reason?: string;

  @ApiProperty({
    required: false,
  })
  timestamp?: string;
}

export class BaseWsErrorResponse extends BaseWsResponse {
  @ApiProperty({
    required: true,
  })
  error: boolean;

  @ApiProperty({
    required: true,
  })
  reason: string;
}
