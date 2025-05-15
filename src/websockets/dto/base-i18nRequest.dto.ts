import { ApiProperty } from '@nestjs/swagger';
import { BaseWsRequest } from './base-request.dto';
import {
  SupportedLocales,
  supportedLocales,
} from 'src/modules/landing/i18n/translations';

export class BaseI18nWsRequest extends BaseWsRequest {
  @ApiProperty({
    enum: supportedLocales,
  })
  locale: SupportedLocales;
}
