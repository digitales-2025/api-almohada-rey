import { ApiProperty } from '@nestjs/swagger';
import { BaseEntity } from 'src/prisma/src/abstract/base.entity';

// model User {
//     id                 String      @id @unique @default(uuid())
//     name               String
//     userRol            UserRolType
//     email              String
//     password           String
//     phone              String?
//     isSuperAdmin       Boolean     @default(false)
//     lastLogin          DateTime    @default(now()) @db.Timestamptz(6)
//     isActive           Boolean     @default(true)
//     mustChangePassword Boolean     @default(true)

//     createdAt DateTime @default(now()) @db.Timestamptz(6)
//     updatedAt DateTime @updatedAt

//     // Relación con auditorías (acciones realizadas por este usuario)
//     auditsPerformed Audit[] @relation("AuditPerformedBy")

//     reservations Reservation[]

//     @@unique([email, isActive])
//   }
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
