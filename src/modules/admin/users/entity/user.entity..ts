import { ApiProperty } from '@nestjs/swagger';
import { BaseEntity } from 'src/prisma/src/abstract/base.entity';

export class User extends BaseEntity {
  @ApiProperty({ description: 'User name' })
  name: string;

  @ApiProperty({ description: 'User role' })
  userRol: string;

  @ApiProperty({ description: 'User email' })
  email: string;

  @ApiProperty({ description: 'User password' })
  password: string;

  @ApiProperty({ description: 'User phone number', required: false })
  phone?: string;

  @ApiProperty({
    description: 'Whether the user is a super admin',
    default: false,
  })
  isSuperAdmin: boolean;

  @ApiProperty({ description: 'Last login date', type: Date })
  lastLogin: Date;

  @ApiProperty({ description: 'Whether the user is active', default: true })
  isActive: boolean;

  @ApiProperty({
    description: 'Whether the user must change the password',
    default: true,
  })
  mustChangePassword: boolean;

  constructor(partial: Partial<User>) {
    super(partial);
    Object.assign(this, partial);
  }
}
