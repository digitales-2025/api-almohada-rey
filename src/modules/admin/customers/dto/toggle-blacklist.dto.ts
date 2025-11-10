import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsNotEmpty,
  IsString,
  ValidateIf,
} from 'class-validator';

export class ToggleBlacklistDto {
  @ApiProperty({
    name: 'isBlacklist',
    description: 'Indica si el cliente debe estar en blacklist',
    example: true,
  })
  @IsBoolean()
  @IsNotEmpty()
  isBlacklist: boolean;

  @ApiProperty({
    name: 'blacklistReason',
    description: 'Razón del blacklist (requerido si isBlacklist es true)',
    example: 'Cliente con comportamiento inadecuado',
    required: false,
  })
  @ValidateIf((o) => o.isBlacklist === true)
  @IsString()
  @IsNotEmpty({
    message: 'blacklistReason es requerido cuando isBlacklist es true',
  })
  @Transform(({ value }) => value?.trim())
  blacklistReason?: string;

  @ApiProperty({
    name: 'blacklistDate',
    description: 'Fecha del blacklist (requerido si isBlacklist es true)',
    example: '2024-01-15',
    required: false,
  })
  @ValidateIf((o) => o.isBlacklist === true)
  @IsDateString(
    {},
    {
      message: 'blacklistDate debe ser una fecha válida en formato YYYY-MM-DD',
    },
  )
  @IsNotEmpty({
    message: 'blacklistDate es requerido cuando isBlacklist es true',
  })
  blacklistDate?: string;
}
