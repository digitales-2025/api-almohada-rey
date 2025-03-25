import { ApiProperty } from '@nestjs/swagger';
import { CustomerDocumentType, CustomerMaritalStatus } from '@prisma/client';
import { BaseEntity } from 'src/prisma/src/abstract/base.entity';

// model Customer {
//     id             String                @id @default(uuid())
//     name           String
//     address        String
//     birthPlace     String
//     country        String
//     department     String?
//     province       String?
//     phone          String
//     occupation     String
//     documentType   CustomerDocumentType
//     documentNumber String                @unique
//     email          String                @unique
//     maritalStatus  CustomerMaritalStatus
//     companyName    String?
//     ruc            String?               @unique
//     companyAddress String?
//     isActive       Boolean               @default(true)
//     createdAt      DateTime              @default(now()) @db.Timestamptz(6)
//     updatedAt      DateTime              @updatedAt

//     reservations Reservation[]
//   }
export class Customer extends BaseEntity {
  @ApiProperty({ description: 'Customer name' })
  name: string;

  @ApiProperty({ description: 'Customer address' })
  address: string;

  @ApiProperty({ description: 'Customer birth place' })
  birthPlace: string;

  @ApiProperty({ description: 'Customer country' })
  country: string;

  @ApiProperty({ description: 'Customer department', required: false })
  department?: string;

  @ApiProperty({ description: 'Customer province', required: false })
  province?: string;

  @ApiProperty({ description: 'Customer phone number' })
  phone: string;

  @ApiProperty({ description: 'Customer occupation' })
  occupation: string;

  @ApiProperty({
    description: 'Customer document type',
    enum: ['DNI', 'PASSPORT', 'FOREIGNER_CARD'],
  })
  documentType: CustomerDocumentType;

  @ApiProperty({ description: 'Customer document number' })
  documentNumber: string;

  @ApiProperty({ description: 'Customer email' })
  email: string;

  @ApiProperty({
    description: 'Customer marital status',
    enum: ['SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED'],
  })
  maritalStatus: CustomerMaritalStatus;

  @ApiProperty({ description: 'Customer company name', required: false })
  companyName?: string;

  @ApiProperty({ description: 'Customer RUC number', required: false })
  ruc?: string;

  @ApiProperty({ description: 'Customer company address', required: false })
  companyAddress?: string;

  constructor(partial: Partial<Customer>) {
    super(partial);
    Object.assign(this, partial);
  }
}
