import { ApiProperty } from '@nestjs/swagger';
import { UserRolType } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsIn,
  IsMobilePhone,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateUserDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => value.trim().toLowerCase())
  name: string;

  @ApiProperty()
  @IsEmail()
  @IsNotEmpty()
  @Transform(({ value }) => value.trim())
  email: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  @MaxLength(50)
  @Matches(/(?:(?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
    message:
      'the password is too weak, it must contain at least one uppercase letter, one lowercase letter, one number',
  })
  @Transform(({ value }) => value.trim())
  password: string;

  @ApiProperty({
    required: false,
  })
  @IsString()
  @IsMobilePhone()
  @Transform(({ value }) => value.trim())
  phone?: string;

  @ApiProperty({
    name: 'userRol',
    description:
      'Rol that can be set to the user. Can only be ADMIN or RECEPCIONIST',
    example: 'ADMIN',
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(['ADMIN', 'RECEPCIONIST'], {
    message: "type must be either 'ADMIN' or 'RECEPCIONIST'",
  })
  @Transform(({ value }) => value.toUpperCase())
  userRol: UserRolType;
}
