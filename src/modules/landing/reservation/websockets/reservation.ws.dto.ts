import { ApiProperty } from '@nestjs/swagger';
import { DetailedReservation } from 'src/modules/admin/reservation/entities/reservation.entity';
import { BaseI18nWsRequest } from 'src/websockets/dto/base-i18nRequest.dto';
import { BaseWsResponse } from 'src/websockets/dto/base-response.dto';

class StartBookingPaymentDataResponse extends BaseI18nWsRequest {
  @ApiProperty({
    description: 'Time Limit for the reservation in seconds',
    example: 300,
    type: Number,
  })
  timeLimit: number;
}

export class StartBookingReservationResponseDto extends BaseWsResponse {
  @ApiProperty({
    type: StartBookingPaymentDataResponse,
    required: true,
  })
  data?: StartBookingPaymentDataResponse;
}

class OnConnectionResponseData {
  @ApiProperty({
    description: 'Client socket ID',
    example: '1234567890abcdef',
    type: DetailedReservation,
  })
  reservation: DetailedReservation;
}

export class OnConnectionResponse extends BaseWsResponse {
  @ApiProperty({
    type: OnConnectionResponseData,
    required: true,
  })
  data?: OnConnectionResponseData;
}
