import { IsString } from 'class-validator';
import { supportedLocales, SupportedLocales } from '../i18n/translations';
import { ApiProperty } from '@nestjs/swagger';

export abstract class BaseQueryDto {
  @ApiProperty({
    enum: supportedLocales,
    required: false,
    description: 'The locale for the response data',
    example: 'en',
  })
  @IsString()
  locale: SupportedLocales;
}
