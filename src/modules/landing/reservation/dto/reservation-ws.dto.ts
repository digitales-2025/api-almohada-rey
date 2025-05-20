import { ApiProperty } from '@nestjs/swagger';
import { BaseI18nWsRequest } from 'src/websockets/dto/base-i18nRequest.dto';

export class ResponseReservationWsDto {
  @ApiProperty({
    description: 'Client ID',
    example: '12345',
  })
  clientId: string;

  @ApiProperty({
    description: 'Reservation ID',
    example: '67890',
  })
  reservationId: string;

  //   @ApiProperty({
  //     description: 'Payment status',
  //     example: 'completed',
  //   })
  //   paymentStatus: string;

  //   @ApiProperty({
  //     description: 'Payment method',
  //     example: 'credit_card',
  //   })
  //   paymentMethod: string;

  //   @ApiProperty({
  //     description: 'Payment amount',
  //     example: 100.0,
  //   })
  //   paymentAmount: number;
}

export class BaseReservationWsActionsDto extends BaseI18nWsRequest {
  @ApiProperty({
    description: 'Reservation ID',
    example: '67890',
  })
  reservationId: string;
}
