import { ApiProperty } from '@nestjs/swagger';
import { CustomerDocumentType, CustomerMaritalStatus } from '@prisma/client';
import { BaseEntity } from 'src/prisma/src/abstract/base.entity';
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

  @ApiProperty({
    description: 'Customer created by landing page',
    required: false,
    default: false,
  })
  createdByLandingPage?: boolean;

  constructor(partial: Partial<Customer>) {
    super(partial);
    Object.assign(this, partial);
  }
}
