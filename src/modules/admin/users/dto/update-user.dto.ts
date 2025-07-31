import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsNotEmpty, IsString } from 'class-validator';
import { UserRolType } from '@prisma/client';

export class UpdateUserDto extends PartialType(
  OmitType(CreateUserDto, ['email', 'password'] as const),
) {
  @ApiProperty({
    required: false,
    description: 'User name',
  })
  name?: string;

  @ApiProperty({
    required: false,
    description: 'User phone',
  })
  phone?: string;

  @ApiProperty({
    name: 'userRol',
    description:
      'Rol that can be set to the user. Can only be ADMIN or RECEPCIONIST',
    example: 'ADMIN',
    required: false,
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(['ADMIN', 'RECEPCIONIST'], {
    message: "type must be either 'ADMIN' or 'RECEPCIONIST'",
  })
  @Transform(({ value }) => value.toUpperCase())
  userRol?: UserRolType;
}
